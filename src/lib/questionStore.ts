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
  /** Primary key. Carried through so an attempt can record which question it was. */
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

function toQuestion(r: QuestionRow): Question {
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
  const { limit = 40, tilt = "hard" } = opts;

  // Through unlock_questions since 0026: a student may read only rows already
  // unlocked for them, so a direct select can never hand out anything new. The
  // RPC returns what is already unlocked plus as much new ground as today's
  // allowance covers, and is the only writer of the unlock ledger.
  //
  // includeUnreviewed is not passed on. It exists for admin review screens, and
  // the RPC refuses to unlock unreviewed rows for a student in any case -- an
  // authored key nobody has checked should not cost a day's allowance.
  //
  // Ordering stays deterministic (server-side, by year then printed number then
  // id). buildAttempt shuffles this list from the attempt seed, so an unordered
  // pool would let the same seed deal a different paper after any change that
  // moves rows around -- which silently breaks anything holding an index into
  // the paper, an in-progress attempt most of all.
  const { data, error } = await supabase.rpc("unlock_questions", {
    p_topic_id: topicId,
    p_subject_prefix: null,
    p_source_year: null,
    p_pyq_only: false,
    p_min_tier: tilt === "hard" ? 2 : null,
    p_limit: limit,
  });
  if (error || !data) return [];

  const qs = (data as QuestionRow[]).map(toQuestion);
  // Fall back to the full difficulty range if the hard-tilted filter came back
  // thin. Cheap now: those questions are already unlocked, so widening the tier
  // costs the student nothing against today's cap.
  if (tilt === "hard" && qs.length < Math.min(8, limit)) {
    const { data: rest } = await supabase.rpc("unlock_questions", {
      p_topic_id: topicId,
      p_subject_prefix: null,
      p_source_year: null,
      p_pyq_only: false,
      p_min_tier: null,
      p_limit: limit,
    });
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


/** A question row as the admin reviewer sees it — includes id and review state. */
export interface ReviewRow {
  id: string;
  topic_id: string;
  q: string;
  options: string[];
  correct: number;
  why: string | null;
  difficulty_tier: number;
  question_type: string | null;
  source_year: string | null;
  is_model: boolean;
  reviewed: boolean;
}

/** Load a topic's questions for review, newest first. Includes held-back rows. */
export async function loadForReview(
  topicId: string,
  filter: "all" | "held" | "released" = "all",
): Promise<ReviewRow[]> {
  if (!supabase) return [];
  let query = supabase
    .from("questions")
    .select("id,topic_id,q,options,correct,why,difficulty_tier,question_type,source_year,is_model,reviewed")
    .eq("topic_id", topicId);
  if (filter === "held") query = query.eq("reviewed", false);
  if (filter === "released") query = query.eq("reviewed", true);
  const { data, error } = await query.order("difficulty_tier").limit(500);
  if (error || !data) return [];
  return data as ReviewRow[];
}

/** Release or hold a single question. */
export async function setQuestionReviewed(id: string, reviewed: boolean): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected to Supabase." };
  const { error } = await supabase.from("questions").update({ reviewed }).eq("id", id);
  return error ? { error: error.message } : {};
}

/** Permanently delete a question — for items whose answer key is simply wrong. */
export async function deleteQuestion(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected to Supabase." };
  const { error } = await supabase.from("questions").delete().eq("id", id);
  return error ? { error: error.message } : {};
}
