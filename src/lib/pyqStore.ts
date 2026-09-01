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
  // Through unlock_questions, not a direct select. Since 0026 a student can
  // only read rows already unlocked for them, so a plain select returns the
  // ones they have seen before and nothing new -- the archive would simply stop
  // growing. The RPC returns both: everything already unlocked for this target
  // plus as much new ground as today's allowance covers, and it is the only
  // thing permitted to write the unlock ledger.
  //
  // Ordering is done server-side by the same year-then-printed-number rule, so
  // the 2024 paper still opens at Q1.
  const { data, error } = await supabase.rpc("unlock_questions", {
    p_topic_id: target.topicId ?? null,
    // topicId is the narrower of the two and wins when both are set.
    p_subject_prefix:
      !target.topicId && target.subjectId ? subjectPattern(target.subjectId) : null,
    p_source_year: target.year ?? null,
    p_pyq_only: true,
    p_min_tier: null,
    p_limit: limit,
  });
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
  // Counted server-side. What EXISTS is not the content, and a locked bank must
  // still be able to say how big it is -- otherwise a free student is told the
  // 2024 paper has however many questions they happen to have unlocked, which
  // under-reports the product rather than protecting it.
  const { data, error } = await supabase.rpc("pyq_counts_by_year");
  if (error || !data) return [];
  return (data as { source_year: string; n: number }[])
    .map((r) => ({ year: r.source_year, count: r.n }))
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
  // Counts again, server-side and unaffected by what this student has unlocked.
  const { data, error } = await supabase.rpc("pyq_counts_by_topic");
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as { topic_id: string; n: number }[]) out[row.topic_id] = row.n;
  return out;
}

/* ==================== admin: managing the bank ==================== */

/**
 * One past question, as the admin bank shows it.
 *
 * Deliberately the Postgres shape rather than the legacy `PYQ` type. The old
 * admin editor managed `v5_pyqBank` in localStorage -- prose question/answer
 * pairs, twelve demo rows, invisible to every other device -- while the 806
 * real past papers sat in `questions` where that screen never looked. An admin
 * was administering a bank they could not see.
 */
export interface AdminPyqRow {
  id: string;
  topicId: string;
  q: string;
  options: string[];
  correct: number;
  why: string | null;
  sourceYear: string | null;
  paperQno: number | null;
  difficultyTier: number;
  reviewed: boolean;
}

export interface PyqPage {
  rows: AdminPyqRow[];
  /** Total matching the filters, not the page -- for "showing 50 of 806". */
  total: number;
}

const ADMIN_COLS =
  "id,topic_id,q,options,correct,why,source_year,paper_qno,difficulty_tier,reviewed";

/**
 * A filtered page of past questions, counted server-side.
 *
 * Paginated on purpose. There are 806 rows and each carries a stem, four
 * options and an explanation; pulling the lot to filter in the browser is the
 * pattern we have just spent this work removing everywhere else.
 *
 * Admin-only in practice: the "staff read all questions" policy is what lets
 * this see held-back rows, which students must not.
 */
export async function loadPyqPage(opts: {
  year?: string;
  subjectId?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<PyqPage> {
  if (!supabase) return { rows: [], total: 0 };
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  let query = supabase
    .from("questions")
    .select(ADMIN_COLS, { count: "exact" })
    .not("source_year", "is", null);

  if (opts.year) query = query.eq("source_year", opts.year);
  if (opts.subjectId) query = query.like("topic_id", `${opts.subjectId}-m%`);
  // Stem only. Searching inside the options array needs a different operator
  // and would quietly match the distractors, which is rarely what is meant.
  if (opts.search?.trim()) query = query.ilike("q", `%${opts.search.trim()}%`);

  const { data, error, count } = await query
    .order("source_year", { ascending: false })
    .order("paper_qno", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { rows: [], total: 0 };
  return {
    rows: (data as unknown as {
      id: string; topic_id: string; q: string; options: string[]; correct: number;
      why: string | null; source_year: string | null; paper_qno: number | null;
      difficulty_tier: number; reviewed: boolean;
    }[]).map((r) => ({
      id: r.id,
      topicId: r.topic_id,
      q: r.q,
      options: r.options ?? [],
      correct: r.correct,
      why: r.why,
      sourceYear: r.source_year,
      paperQno: r.paper_qno,
      difficultyTier: r.difficulty_tier,
      reviewed: r.reviewed,
    })),
    total: count ?? 0,
  };
}

/**
 * Edit one past question.
 *
 * `.select()` so a write RLS refused is reported rather than silently reported
 * as success -- PostgREST answers an UPDATE matching no rows with 204 and no
 * error, which is how a change can appear on screen and never reach the table.
 */
export async function updatePyq(
  id: string,
  patch: Partial<Pick<AdminPyqRow, "q" | "options" | "correct" | "why" | "sourceYear" | "paperQno" | "difficultyTier" | "topicId">>,
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const row: Record<string, unknown> = {};
  if (patch.q !== undefined) row.q = patch.q;
  if (patch.options !== undefined) row.options = patch.options;
  if (patch.correct !== undefined) row.correct = patch.correct;
  if (patch.why !== undefined) row.why = patch.why;
  if (patch.sourceYear !== undefined) row.source_year = patch.sourceYear;
  if (patch.paperQno !== undefined) row.paper_qno = patch.paperQno;
  if (patch.difficultyTier !== undefined) row.difficulty_tier = patch.difficultyTier;
  if (patch.topicId !== undefined) row.topic_id = patch.topicId;

  const { data, error } = await supabase
    .from("questions").update(row).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Not saved — the database refused the write. This account may not have the admin role." };
  }
  return {};
}
