import { shuffle, topicQuestions } from "@/data";
import { loadTopicQuestions } from "@/lib/questionStore";
import type { Question } from "@/types";

/**
 * How many questions one attempt may contain.
 *
 * The quiz used to hard-slice 8 conceptual + 8 analytical, so a microtheme with
 * a 101-question bank still served sixteen. The cap now exists only to keep a
 * single sitting reasonable; everything released for the topic is eligible.
 */
export const ATTEMPT_CAP = 30;

/**
 * Every released question for one microtheme: bundled past papers first, then
 * the Postgres bank, deduped by stem.
 */
export async function loadPool(topicId: string): Promise<Question[]> {
  const bundled = topicQuestions(topicId);
  const seen = new Set(bundled.map((q) => q.q));
  const remote = await loadTopicQuestions(topicId, { limit: 200, tilt: "even" });
  return [...bundled, ...remote.filter((q) => !seen.has(q.q))];
}

/**
 * Choose the questions for one attempt.
 *
 * Keeps the conceptual/analytical split as even as the bank allows rather than
 * imposing a fixed 8-and-8: a topic with 25 conceptual and 3 analytical should
 * yield 27, not 11. Interleaved so a run of one type does not cluster.
 */
export function buildAttempt(pool: Question[], seed: number, cap = ATTEMPT_CAP): Question[] {
  const conceptual = shuffle(pool.filter((q) => q.type === "conceptual"), seed);
  const analytical = shuffle(pool.filter((q) => q.type === "analytical"), seed + 1);

  const half = Math.floor(cap / 2);
  // Whatever one side cannot fill, the other may take.
  const takeC = Math.min(conceptual.length, Math.max(half, cap - analytical.length));
  const takeA = Math.min(analytical.length, cap - takeC);

  const picked: Question[] = [];
  const c = conceptual.slice(0, takeC);
  const a = analytical.slice(0, takeA);
  for (let i = 0; i < Math.max(c.length, a.length); i++) {
    if (i < c.length) picked.push(c[i]);
    if (i < a.length) picked.push(a[i]);
  }
  return picked.map((q, i) => ({ ...q, _idx: i }));
}

/** Human summary of what an attempt will contain, for the pre-attempt screen. */
export function describeAttempt(questions: Question[]): string {
  if (questions.length === 0) return "No questions released for this topic yet.";
  const c = questions.filter((q) => q.type === "conceptual").length;
  const a = questions.length - c;
  const parts = [c > 0 ? `${c} conceptual` : null, a > 0 ? `${a} analytical` : null].filter(Boolean);
  return `${questions.length} question${questions.length === 1 ? "" : "s"}: ${parts.join(" + ")}.`;
}
