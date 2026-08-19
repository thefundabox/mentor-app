/**
 * Registry of real past-paper question banks.
 *
 * Every subject bank is registered here, so anything that wants "real
 * questions" — the day quiz, the placement check, future mock-test builders —
 * picks up new subjects automatically as they are extracted. Geography, Indian History and
 * Economics are wired today; adding a subject is one import and one spread.
 */
import type { Question } from "@/types";
import { GEOGRAPHY_QUESTIONS } from "./questions.geography";
import { HISTORY_QUESTIONS } from "./questions.history";
import { ECONOMICS_QUESTIONS } from "./questions.economics";
import { ADHYAYAN_QUESTIONS } from "./questions.adhyayan";

/** topicId (microtheme) -> real RAS past questions for that microtheme. */
function merge(...banks: Record<string, Question[]>[]): Record<string, Question[]> {
  const out: Record<string, Question[]> = {};
  for (const bank of banks) {
    for (const [topicId, qs] of Object.entries(bank)) {
      out[topicId] = (out[topicId] ?? []).concat(qs);
    }
  }
  return out;
}

export const QUESTION_BANKS: Record<string, Question[]> = merge(
  GEOGRAPHY_QUESTIONS,
  HISTORY_QUESTIONS,
  ECONOMICS_QUESTIONS,
  ADHYAYAN_QUESTIONS,
);

/** Every real question, flattened. */
export function allRealQuestions(): Question[] {
  return Object.values(QUESTION_BANKS).flat();
}

/** Microthemes that have genuine past-paper coverage. */
export function coveredTopicIds(): string[] {
  return Object.keys(QUESTION_BANKS).filter((id) => QUESTION_BANKS[id].length > 0);
}

/**
 * Placement check for the signup assessment.
 *
 * Picks a spread of real RAS questions rather than the three invented MCQs the
 * assessment used before. Selection is deterministic — no Math.random at module
 * scope, which would give every student a different test and make placement
 * scores incomparable.
 *
 * Bias: newest papers first, one question per microtheme, and an alternating
 * conceptual / analytical rhythm so the check samples both the statement-and-code
 * reasoning RPSC leans on and plain factual recall.
 */
export function buildPlacementSet(n = 5): Question[] {
  const pool = allRealQuestions();
  if (pool.length === 0) return [];

  const byRecency = [...pool].sort((a, b) => {
    const ya = Number(a.sourceYear ?? 0), yb = Number(b.sourceYear ?? 0);
    if (yb !== ya) return yb - ya;
    return (a.concept ?? "").localeCompare(b.concept ?? "");
  });

  const picked: Question[] = [];
  const usedConcepts = new Set<string>();
  let wantConceptual = true;

  // Two passes: first respecting the type rhythm and one-per-microtheme, then
  // relaxing the type constraint to fill any shortfall.
  for (const pass of [0, 1]) {
    for (const q of byRecency) {
      if (picked.length >= n) break;
      if (usedConcepts.has(q.concept)) continue;
      if (pass === 0 && (q.type === "conceptual") !== wantConceptual) continue;
      picked.push(q);
      usedConcepts.add(q.concept);
      wantConceptual = !wantConceptual;
    }
  }
  return picked.slice(0, n);
}
