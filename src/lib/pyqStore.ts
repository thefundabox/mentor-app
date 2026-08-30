/**
 * Past-paper (PYQ) loader.
 *
 * Genuine RAS Prelims questions live in Postgres, tagged with `source_year` and
 * graded against the official RPSC final answer key. Model questions carry a
 * null `source_year`, so `source_year is not null` is exactly the past-paper
 * filter and there is no way for the two to be confused.
 *
 * Everything here goes through the same `reviewed = true` gate the quiz uses.
 * These rows are loaded reviewed because the key is RPSC's own, but the gate
 * still applies -- an admin who pulls a question back must have that take
 * effect everywhere, not everywhere except the PYQ tab.
 */
import { supabase } from "./supabase";
import type { Question, PyqTarget } from "@/types";

interface PyqRow {
  id: string;
  topic_id: string;
  type: "conceptual" | "analytical";
  question_type: string | null;
  difficulty_tier: number;
  q: string;
  q_hindi: string | null;
  options: string[];
  correct: number;
  why: string | null;
  source_year: string | null;
  paper_qno: number | null;
  rajasthan_angle: boolean;
}

function toQuestion(r: PyqRow): Question {
  return {
    id: r.id,
    type: r.type,
    concept: r.topic_id,
    q: r.q,
    options: r.options,
    correct: r.correct,
    why: r.why ?? "",
    questionType: (r.question_type ?? undefined) as Question["questionType"],
    difficultyTier: (r.difficulty_tier as 1 | 2 | 3) ?? 2,
    rajasthanAngle: r.rajasthan_angle || undefined,
    sourceYear: r.source_year ?? undefined,
    paperQno: r.paper_qno ?? undefined,
    qHindi: r.q_hindi ?? undefined,
  };
}

const COLS =
  "id,topic_id,type,question_type,difficulty_tier,q,q_hindi,options,correct,why,source_year,paper_qno,rajasthan_angle";

/** Every microtheme id belonging to a subject, by convention: `<subjectId>-mNN`. */
const subjectPattern = (subjectId: string) => `${subjectId}-m%`;

/**
 * Questions matching a target.
 *
 * Ordered by year then printed question number. `order by id` was wrong: `id`
 * is a random uuid, so the 2024 paper opened with Q130. paper_qno comes from
 * migration 0016.
 */
export async function loadPyqs(target: PyqTarget, limit = 600): Promise<Question[]> {
  if (!supabase) return [];
  let query = supabase
    .from("questions")
    .select(COLS)
    .not("source_year", "is", null)
    .eq("reviewed", true);

  if (target.year) query = query.eq("source_year", target.year);
  // topicId is the narrower of the two and wins when both are set.
  if (target.topicId) query = query.eq("topic_id", target.topicId);
  else if (target.subjectId) query = query.like("topic_id", subjectPattern(target.subjectId));

  const { data, error } = await query
    .order("source_year", { ascending: false })
    .order("paper_qno", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as PyqRow[]).map(toQuestion);
}

/** Every released past question, for the archive's browse and filter. */
export async function loadAllPyqs(): Promise<Question[]> {
  return loadPyqs({ label: "All past questions" }, 1000);
}

export interface PyqYear {
  year: string;
  count: number;
}

/**
 * Which papers are available, and how many questions each holds.
 *
 * Counted client-side from a year-only projection rather than a `group by`,
 * because PostgREST has no grouping and a view for this would be one more
 * migration to keep in step. The projection is one short column.
 */
export async function loadPyqYears(): Promise<PyqYear[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("questions")
    .select("source_year")
    .not("source_year", "is", null)
    .eq("reviewed", true)
    .limit(5000);
  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data as { source_year: string }[]) {
    counts.set(row.source_year, (counts.get(row.source_year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

/**
 * How many past questions each microtheme has.
 *
 * One request for the whole syllabus, so a screen can say "12 past questions"
 * without a round trip per microtheme.
 */
export async function loadPyqCoverage(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("questions")
    .select("topic_id")
    .not("source_year", "is", null)
    .eq("reviewed", true)
    .limit(5000);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as { topic_id: string }[]) {
    out[row.topic_id] = (out[row.topic_id] ?? 0) + 1;
  }
  return out;
}
