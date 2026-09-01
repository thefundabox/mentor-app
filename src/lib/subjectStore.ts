/**
 * The syllabus catalog, in Postgres.
 *
 * It used to live only in `v6_subjects` in localStorage, which meant Admin ->
 * Subject master edited the admin's own browser and nothing else: students
 * never saw a change, mentors never saw it, and it vanished on another device.
 *
 * The bundled `DEFAULT_SUBJECTS` stays as the fallback. Local demo mode has no
 * database, and a first paint should show the catalog rather than an empty
 * screen while the fetch is in flight.
 */
import { supabase } from "./supabase";
import type { SubjectCatalogEntry, Topic } from "@/types";

interface Row {
  id: string;
  name: string;
  icon: string;
  color: string;
  stage: "prelims" | "mains";
  rajasthan_specific: boolean;
  archived: boolean;
  sort_order: number;
  topics: Topic[];
}

function toEntry(r: Row): SubjectCatalogEntry {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    stage: r.stage,
    topics: r.topics ?? [],
    ...(r.rajasthan_specific ? { rajasthanSpecific: true } : {}),
    ...(r.archived ? { archived: true } : {}),
  };
}

/**
 * The catalog, in display order.
 *
 * Returns null rather than [] when it cannot be read, so the caller can tell
 * "no database" apart from "a database with an empty catalog" -- the first
 * should keep the bundled fallback, the second should not.
 */
export async function loadSubjects(): Promise<SubjectCatalogEntry[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,icon,color,stage,rajasthan_specific,archived,sort_order,topics")
    .order("sort_order");
  if (error || !data) return null;
  return (data as Row[]).map(toEntry);
}

/**
 * Persist the whole catalog.
 *
 * Upserts every subject with its array index as sort_order, because the
 * catalog's order is meaningful -- it drives display and the sequence the plan
 * teaches in -- and Postgres makes no promise about row order without it.
 *
 * Nothing is deleted. The app archives subjects rather than removing them
 * (archiveSubject sets a flag), so a row disappearing from this list would mean
 * a caller built the array wrongly, and dropping data on that assumption is not
 * a trade worth making. Admin-only, enforced by RLS in 0033.
 */
export async function saveSubjects(
  list: SubjectCatalogEntry[],
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const rows = list.map((s, i) => ({
    id: s.id,
    name: s.name,
    icon: s.icon ?? "",
    color: s.color ?? "slate",
    stage: s.stage ?? "prelims",
    rajasthan_specific: !!s.rajasthanSpecific,
    archived: !!s.archived,
    sort_order: i,
    topics: s.topics ?? [],
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("subjects").upsert(rows, { onConflict: "id" });
  return error ? { error: error.message } : {};
}
