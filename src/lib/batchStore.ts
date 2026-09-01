/**
 * Cohorts, in Postgres.
 *
 * Batch MEMBERSHIP was always server-side -- profiles.batch_id (0002), written
 * through set_user_batch (0017). The batches themselves were not: they lived in
 * `v5_batches` in whichever browser the admin happened to use. So a student
 * carried a batch id the server knew, pointing at a batch row the server had
 * never seen, and batchForStudent resolved it to null on every other device.
 *
 * Start dates are stored as timestamptz and used as epoch ms, because that is
 * what Batch.startDate is and what planStartFor anchors day 1 to.
 */
import { supabase } from "./supabase";
import type { Batch } from "@/types";

interface Row {
  id: string;
  name: string;
  vertical: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  mentor_ids: string[] | null;
  default_plan_template_id: string | null;
  archived: boolean;
  created_at: string;
}

function toBatch(r: Row): Batch {
  return {
    id: r.id,
    name: r.name,
    vertical: r.vertical,
    startDate: new Date(r.start_date).getTime(),
    mentorIds: r.mentor_ids ?? [],
    createdAt: new Date(r.created_at).getTime(),
    ...(r.description ? { description: r.description } : {}),
    ...(r.end_date ? { endDate: new Date(r.end_date).getTime() } : {}),
    ...(r.default_plan_template_id
      ? { defaultPlanTemplateId: r.default_plan_template_id }
      : {}),
    ...(r.archived ? { archived: true } : {}),
  };
}

/**
 * Every cohort, archived ones included.
 *
 * Archived batches are kept because students stay assigned to them: dropping
 * them here would strip a past cohort's start date and leave its students with
 * no day 1. The admin screen filters for display; this is the whole set.
 *
 * Returns null rather than [] when it cannot be read, so a caller can tell "no
 * database" (keep the bundled seed) from "a database with no batches".
 */
export async function loadBatches(): Promise<Batch[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("batches")
    .select(
      "id,name,vertical,description,start_date,end_date,mentor_ids,default_plan_template_id,archived,created_at",
    )
    .order("start_date");
  if (error || !data) return null;
  return (data as Row[]).map(toBatch);
}

/**
 * Persist the whole set.
 *
 * Upsert, never delete: archiveBatch sets a flag rather than removing a row,
 * for the reason above -- assigned students outlive the cohort's last day.
 * Admin-only, enforced by RLS in 0034.
 */
export async function saveBatches(list: Batch[]): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const rows = list.map((b) => ({
    id: b.id,
    name: b.name,
    vertical: b.vertical,
    description: b.description ?? null,
    start_date: new Date(b.startDate).toISOString(),
    end_date: b.endDate ? new Date(b.endDate).toISOString() : null,
    mentor_ids: b.mentorIds ?? [],
    default_plan_template_id: b.defaultPlanTemplateId ?? null,
    archived: !!b.archived,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("batches").upsert(rows, { onConflict: "id" });
  return error ? { error: error.message } : {};
}
