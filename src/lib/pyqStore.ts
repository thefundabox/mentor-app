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
import type { Question } from "@/types";

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
    qHindi: r.q_hindi ?? undefined,
  };
}

const COLS =
  "id,topic_id,type,question_type,difficulty_tier,q,q_hindi,options,correct,why,source_year,rajasthan_angle";

export interface PyqYear {
  year: string;
  count: number;
}

/**
 * Which papers are available, and how many questions each holds.
 *
 * Counted client-side from a year-only projection rather than a `group by`,
 * because PostgREST has no grouping and a view for this would be one more
 * migration to keep in step. The projection is one short column over a few
 * hundred rows.
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
 * One whole paper, in the order RPSC printed it.
 *
 * Ordered by id rather than left to Postgres, for the same reason the quiz
 * pool is: without an ORDER BY the row order is not promised, and a paper that
 * deals differently on each load breaks anything holding an index into it.
 */
export async function loadPyqPaper(year: string): Promise<Question[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("questions")
    .select(COLS)
    .eq("source_year", year)
    .eq("reviewed", true)
    .order("id", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return (data as PyqRow[]).map(toQuestion);
}

/** Every past-paper question tagged to one microtheme, across all years. */
export async function loadPyqForTopic(topicId: string): Promise<Question[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("questions")
    .select(COLS)
    .eq("topic_id", topicId)
    .not("source_year", "is", null)
    .eq("reviewed", true)
    .order("id", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return (data as PyqRow[]).map(toQuestion);
}

/**
 * How many past questions each microtheme has, for the whole syllabus.
 *
 * Lets the topic screen say "12 past questions" without a round trip per
 * microtheme. Same projection trick as loadPyqYears.
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
