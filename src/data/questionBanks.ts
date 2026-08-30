/**
 * Registry of bundled question banks.
 *
 * This used to carry three files of extracted RAS past papers -- geography (88),
 * history (61) and economics (85). They are gone. Their answer keys were
 * authored by hand, and when the official RPSC final answer keys were decoded
 * and compared position-by-position, roughly a fifth of them disagreed: the
 * bundle had Kota as Rajasthan's largest thermal plant (it is Suratgarh),
 * Saraswati as the answer to "not a Rajasthan oil field" (Saraswati is one;
 * Ganga is not), and Vijaya Raghavachari presiding at Calcutta in 1920 (it was
 * Lala Lajpat Rai).
 *
 * Genuine past papers now live in Postgres -- 546 questions across 2018, 2021,
 * 2023 and 2024, each graded against the official key RPSC published, loaded by
 * migrations 0014 and 0015. Keeping the bundled copies would have served both:
 * `loadPool` dedupes on the exact stem, and the bundled stems use en dashes and
 * curly quotes where the Postgres ones are ASCII, so the same question would
 * have appeared twice with two different correct answers.
 *
 * What remains here is ADHYAYAN_QUESTIONS -- authored practice questions that
 * never claimed to be past papers (they carry no `sourceYear` on purpose).
 */
import type { Question } from "@/types";
import { ADHYAYAN_QUESTIONS } from "./questions.adhyayan";

/** topicId (microtheme) -> bundled questions for that microtheme. */
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
  ADHYAYAN_QUESTIONS,
);

/** Every bundled question, flattened. */
export function allRealQuestions(): Question[] {
  return Object.values(QUESTION_BANKS).flat();
}

/** Microthemes with bundled question coverage. */
export function coveredTopicIds(): string[] {
  return Object.keys(QUESTION_BANKS).filter((id) => QUESTION_BANKS[id].length > 0);
}

/**
 * Placement check for the signup assessment.
 *
 * Draws from the bundled authored questions. It used to draw from the extracted
 * past papers, biased newest-first -- but those carried the hand-authored keys
 * described above, and a placement score computed from wrong answers is worse
 * than one computed from authored questions that are at least internally
 * correct. The official past papers cannot be substituted here yet: this is a
 * module-level constant evaluated before any network call, and the real bank is
 * in Postgres.
 *
 * Selection stays deterministic -- no Math.random at module scope, which would
 * give every student a different test and make placement scores incomparable.
 * One question per microtheme, alternating conceptual / analytical so the check
 * samples both statement-and-code reasoning and plain recall.
 */
export function buildPlacementSet(n = 5): Question[] {
  const pool = allRealQuestions();
  if (pool.length === 0) return [];

  const ordered = [...pool].sort((a, b) => (a.concept ?? "").localeCompare(b.concept ?? ""));

  const picked: Question[] = [];
  const usedConcepts = new Set<string>();
  let wantConceptual = true;

  // Two passes: first respecting the type rhythm and one-per-microtheme, then
  // relaxing the type constraint to fill any shortfall.
  for (const pass of [0, 1]) {
    for (const q of ordered) {
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
