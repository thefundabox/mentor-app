/**
 * Student data sync — Postgres as the source of truth, localStorage as cache.
 *
 * Before this, StudentData lived only in localStorage, so progress was tied to
 * one browser and a mentor signing in on their own machine saw no students at
 * all. The mentor dashboard only ever "worked" because every demo user shared
 * one browser's storage.
 *
 * Shape on the server is split by writer (see migrations/0004):
 *   student_charts    chart + adopted template   (student edits, mentor approves)
 *   student_progress  everything student-only    (attempts, points, SR state)
 *   student_overrides one row per request        (student raises, mentor decides)
 *
 * Writes are debounced and last-write-wins per table. That is safe here because
 * the two writers never touch the same table in the common path — the one place
 * they do (chart) is turn-based: it locks on submit until the mentor decides.
 */
import { supabase } from "./supabase";
import type { StudentData, Override } from "@/types";

const NO_CLIENT = "Not connected to Supabase.";

/** The half of StudentData that only the student writes. */
type ProgressBlob = Omit<StudentData, "chart" | "overrides" | "adoptedTemplateId">;

export interface LoadResult {
  data?: StudentData;
  error?: string;
  /** True when the student has no server rows yet — caller should push local state up. */
  isNew?: boolean;
}

function toOverride(row: Record<string, unknown>): Override {
  return {
    id: Number(row.id),
    day: Number(row.day),
    status: row.status as Override["status"],
    attempts: Number(row.attempts ?? 0),
    bestScore: Number(row.best_score ?? 0),
    seenByStudent: Boolean(row.seen),
    decidedAt: row.decided_at ? Date.parse(row.decided_at as string) : undefined,
  };
}

/** Load one student's full record from Postgres. */
export async function loadStudent(studentId: string): Promise<LoadResult> {
  if (!supabase) return { error: NO_CLIENT };

  const [charts, progress, overrides] = await Promise.all([
    supabase.from("student_charts").select("*").eq("student_id", studentId).maybeSingle(),
    supabase.from("student_progress").select("*").eq("student_id", studentId).maybeSingle(),
    supabase.from("student_overrides").select("*").eq("student_id", studentId).order("created_at"),
  ]);

  const err = charts.error?.message || progress.error?.message || overrides.error?.message;
  if (err) return { error: err };

  if (!charts.data && !progress.data) return { isNew: true };

  const blob = (progress.data?.data ?? {}) as Partial<ProgressBlob>;
  return {
    data: {
      ...(blob as ProgressBlob),
      chart: (charts.data?.chart ?? {}) as StudentData["chart"],
      adoptedTemplateId: (charts.data?.adopted_template_id ?? null) as string | null,
      overrides: (overrides.data ?? []).map(toOverride),
    } as StudentData,
  };
}

/** Load many students at once — the mentor dashboard's list view. */
export async function loadStudents(ids: string[]): Promise<Record<string, StudentData>> {
  if (!supabase || ids.length === 0) return {};
  const [charts, progress, overrides] = await Promise.all([
    supabase.from("student_charts").select("*").in("student_id", ids),
    supabase.from("student_progress").select("*").in("student_id", ids),
    supabase.from("student_overrides").select("*").in("student_id", ids).order("created_at"),
  ]);

  const out: Record<string, StudentData> = {};
  const chartBy = new Map((charts.data ?? []).map((r) => [r.student_id as string, r]));
  const progBy = new Map((progress.data ?? []).map((r) => [r.student_id as string, r]));
  const ovBy = new Map<string, Override[]>();
  for (const r of overrides.data ?? []) {
    const sid = r.student_id as string;
    ovBy.set(sid, [...(ovBy.get(sid) ?? []), toOverride(r)]);
  }

  for (const id of ids) {
    const c = chartBy.get(id), p = progBy.get(id);
    if (!c && !p) continue;
    out[id] = {
      ...((p?.data ?? {}) as ProgressBlob),
      chart: (c?.chart ?? {}) as StudentData["chart"],
      adoptedTemplateId: (c?.adopted_template_id ?? null) as string | null,
      overrides: ovBy.get(id) ?? [],
    } as StudentData;
  }
  return out;
}

/** Upsert the chart half. Safe for both the student and the approving mentor. */
export async function saveChart(studentId: string, data: StudentData): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("student_charts").upsert({
    student_id: studentId,
    chart: data.chart,
    adopted_template_id: data.adoptedTemplateId ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id" });
  return error ? { error: error.message } : {};
}

/** Upsert the student-only half. Overrides and chart are excluded on purpose. */
export async function saveProgress(studentId: string, data: StudentData): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_CLIENT };
  const { chart: _chart, overrides: _ov, adoptedTemplateId: _t, ...blob } = data;
  const { error } = await supabase.from("student_progress").upsert({
    student_id: studentId,
    data: blob,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id" });
  return error ? { error: error.message } : {};
}

/** Student raises an override request. Always lands as pending — RLS enforces it. */
export async function insertOverride(studentId: string, o: Override): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("student_overrides").insert({
    id: o.id, student_id: studentId, day: o.day, status: "pending",
    attempts: o.attempts ?? 0, best_score: o.bestScore ?? 0,
  });
  return error ? { error: error.message } : {};
}

/**
 * Mentor decides an override.
 *
 * A student calling this is rejected by the row policy, not by this function —
 * the WITH CHECK requires status to stay 'pending' for non-staff.
 */
export async function decideOverride(id: number, status: "approved" | "declined"): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("student_overrides")
    .update({ status, decided_at: new Date().toISOString() }).eq("id", id);
  return error ? { error: error.message } : {};
}

/** Student marks a decided override as seen. */
export async function markOverrideSeenRemote(id: number): Promise<{ error?: string }> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("student_overrides").update({ seen: true }).eq("id", id);
  return error ? { error: error.message } : {};
}

/** Every student profile, for the mentor/admin lists. RLS already limits this to staff. */
export async function loadStudentProfiles(): Promise<{ id: string; email: string; name: string; mentor_id: string | null; batch_id: string | null }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles").select("id,email,name,mentor_id,batch_id").eq("role", "student");
  if (error) return [];
  return data ?? [];
}
