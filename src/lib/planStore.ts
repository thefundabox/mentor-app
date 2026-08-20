import { supabase } from "@/lib/supabase";
import type { PlanTemplate, CommitmentScope, DaySlot } from "@/types";

/**
 * Plan templates, from Postgres.
 *
 * These used to live in localStorage, so "the default plan" only existed in
 * whichever browser last edited it and no student ever saw an admin's changes.
 * See supabase/migrations/0009.
 */

export interface PlanTemplateRow extends PlanTemplate {
  isDefault: boolean;
  version: number;
  /** Null for an institute-wide plan; a mentor's id for one they own. */
  ownerId: string | null;
  archived: boolean;
}

interface Row {
  id: string;
  name: string;
  blurb: string;
  scope: string;
  days: DaySlot[][];
  is_default: boolean;
  version: number;
  owner_id: string | null;
  archived: boolean;
}

function toTemplate(r: Row): PlanTemplateRow {
  return {
    id: r.id,
    name: r.name,
    blurb: r.blurb ?? "",
    scope: (r.scope as CommitmentScope) ?? "week",
    days: Array.isArray(r.days) ? r.days : [],
    isDefault: !!r.is_default,
    version: r.version ?? 1,
    ownerId: r.owner_id,
    archived: !!r.archived,
  };
}

/** Every plan a signed-in user may see. Archived ones are excluded. */
export async function loadPlanTemplates(): Promise<PlanTemplateRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("plan_templates").select("*").eq("archived", false).order("created_at");
  if (error || !data) return [];
  return (data as Row[]).map(toTemplate);
}

/**
 * Create or replace a plan, bumping its version.
 *
 * The version is what a student's chart records at adoption, so an edit is
 * traceable even though it does not yet reach charts already copied.
 */
export async function savePlanTemplate(
  tpl: PlanTemplate & { ownerId?: string | null; isDefault?: boolean },
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase is not configured." };
  const { data: existing } = await supabase
    .from("plan_templates").select("version").eq("id", tpl.id).maybeSingle();
  const { error } = await supabase.from("plan_templates").upsert({
    id: tpl.id,
    name: tpl.name,
    blurb: tpl.blurb ?? "",
    scope: tpl.scope,
    days: tpl.days,
    is_default: tpl.isDefault ?? false,
    owner_id: tpl.ownerId ?? null,
    version: ((existing as { version?: number } | null)?.version ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  return error ? { error: error.message } : {};
}

/** Archive rather than delete, so adopted charts keep something to point at. */
export async function archivePlanTemplate(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase
    .from("plan_templates").update({ archived: true, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? { error: error.message } : {};
}
