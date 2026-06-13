import type { Test, Question } from "@/types";
import { shuffle } from "@/data";

export interface TestQuestion {
  /** Stable per-attempt id: `${sectionId}_q${i}`. Used as the answer-map key. */
  qid: string;
  sectionId: string;
  sectionName: string;
  position: number;
  marksPerQuestion: number;
  negativeMarks: number;
  question: Question;
}

/**
 * Materialize a test attempt's question sequence by drawing from the quiz pool.
 * Cycles the pool if a section needs more than the pool's size.
 * Note: subjectIds filtering is deferred until questions carry subject tags
 * (the seed pool only covers one subject today, so filtering would empty it).
 */
export function buildTestSequence(test: Test, pool: Question[], seed?: number): TestQuestion[] {
  const out: TestQuestion[] = [];
  const baseSeed = seed ?? Math.floor(Math.random() * 1e9);
  for (const sec of test.sections) {
    const shuffled = shuffle(pool, baseSeed + sec.id.length);
    if (shuffled.length === 0) continue;
    for (let i = 0; i < sec.questionCount; i++) {
      const q = shuffled[i % shuffled.length];
      out.push({
        qid: `${sec.id}_q${i}`,
        sectionId: sec.id,
        sectionName: sec.name,
        position: i,
        marksPerQuestion: sec.marksPerQuestion,
        negativeMarks: sec.negativeMarks,
        question: q,
      });
    }
  }
  return out;
}

/** Compute the per-section and total score given an answer map. */
export function scoreAttempt(sequence: TestQuestion[], answers: Record<string, number>): {
  score: number;
  maxScore: number;
  sectionScores: Record<string, { right: number; wrong: number; unattempted: number; marks: number }>;
} {
  const sectionScores: Record<string, { right: number; wrong: number; unattempted: number; marks: number }> = {};
  let maxScore = 0;
  let score = 0;
  for (const tq of sequence) {
    if (!sectionScores[tq.sectionId]) {
      sectionScores[tq.sectionId] = { right: 0, wrong: 0, unattempted: 0, marks: 0 };
    }
    const sec = sectionScores[tq.sectionId];
    maxScore += tq.marksPerQuestion;
    const picked = answers[tq.qid];
    if (picked === undefined) {
      sec.unattempted++;
    } else if (picked === tq.question.correct) {
      sec.right++;
      sec.marks += tq.marksPerQuestion;
      score += tq.marksPerQuestion;
    } else {
      sec.wrong++;
      sec.marks -= tq.negativeMarks;
      score -= tq.negativeMarks;
    }
  }
  return { score, maxScore, sectionScores };
}
