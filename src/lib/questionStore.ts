/**
 * Question bank loader.
 *
 * Past-paper questions (334) ship in the bundle — small enough, and they are
 * the highest-value content so they should work offline. Model questions live
 * in Postgres because at the target scale (~24,000) they would add roughly
 * 19 MB to the bundle, which every student would download on first load.
 *
 * Coverage is fetched once as a summary so the UI can answer "does this topic
 * have questions?" for all 243 microthemes without 243 round trips.
 */
import { supabase } from "./supabase";
import type { Question } from "@/types";

export interface Coverage {
  topic_id: string;
  total: number;
  easy: number;
  moderate: number;
  hard: number;
  past_paper: number;
  reviewed: number;
}

interface QuestionRow {
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

function toQuestion(r: QuestionRow): Question {
  return {
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

/** Per-topic counts for every microtheme that has at least one question. */
export async function loadCoverage(): Promise<Record<string, Coverage>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("question_coverage").select("*");
  if (error || !data) return {};
  const out: Record<string, Coverage> = {};
  for (const row of data as Coverage[]) out[row.topic_id] = row;
  return out;
}

/**
 * Questions for one topic.
 *
 * `tilt` biases selection toward harder items — the bank is generated with a
 * spread across all three tiers, but a RAS aspirant practising for the real
 * paper should mostly meet tier 2 and 3. Ordering is left to the caller.
 *
 * Only REVIEWED questions are served. An authored answer key is a claim until
 * somebody qualified has checked it, and a wrong key in an exam-prep app is
 * worse than a missing question — the student learns the wrong fact and never
 * finds out. Admins release a topic from Admin -> Questions -> Coverage.
 * Pass `includeUnreviewed` only for admin preview surfaces.
 */
export async function loadTopicQuestions(
  topicId: string,
  opts: { limit?: number; tilt?: "hard" | "even"; includeUnreviewed?: boolean } = {},
): Promise<Question[]> {
  if (!supabase) return [];
  const { limit = 40, tilt = "hard", includeUnreviewed = false } = opts;

  let query = supabase.from("questions").select("*").eq("topic_id", topicId);
  if (!includeUnreviewed) query = query.eq("reviewed", true);
  if (tilt === "hard") query = query.gte("difficulty_tier", 2);

  const { data, error } = await query.limit(limit);
  if (error || !data) return [];

  const qs = (data as QuestionRow[]).map(toQuestion);
  // Fall back to the full difficulty range if the hard-tilted filter came back
  // thin — but never fall back past the reviewed gate.
  if (tilt === "hard" && qs.length < Math.min(8, limit)) {
    let all = supabase.from("questions").select("*").eq("topic_id", topicId);
    if (!includeUnreviewed) all = all.eq("reviewed", true);
    const { data: rest } = await all.limit(limit);
    return ((rest ?? []) as QuestionRow[]).map(toQuestion);
  }
  return qs;
}

/**
 * Release every question for a topic to students (sets reviewed = true).
 * Admin-only: the RLS policy rejects this for anyone else.
 */
export async function releaseTopic(topicId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected to Supabase." };
  const { error } = await supabase
    .from("questions").update({ reviewed: true }).eq("topic_id", topicId);
  return error ? { error: error.message } : {};
}

/** Pull a topic back from students (sets reviewed = false). */
export async function holdTopic(topicId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected to Supabase." };
  const { error } = await supabase
    .from("questions").update({ reviewed: false }).eq("topic_id", topicId);
  return error ? { error: error.message } : {};
}

/** How many questions exist for a topic, without fetching them. */
export async function countForTopic(topicId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("questions").select("id", { count: "exact", head: true }).eq("topic_id", topicId);
  return error ? 0 : (count ?? 0);
}
