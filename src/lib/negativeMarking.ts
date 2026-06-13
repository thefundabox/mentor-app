/**
 * Adaptive practice — negative marking analysis (PR 4 · Layer B)
 * ===============================================================
 *
 * The RAS Prelims paper deducts 1/3 mark for every wrong MCQ answer, but
 * skipping costs nothing. A student who attempts everything they're unsure
 * about loses marks twice — once by getting it wrong, again by passing up
 * the safer skip. The analyzer below quantifies that gap so the student
 * can see the cost of poor skip discipline in actual marks.
 *
 * Three scores per session:
 *   - actualScore           — what they got with their real choices.
 *   - safeScore             — what they'd have got if every wrong answer
 *                             had instead been skipped.
 *   - skipRecommendedScore  — what they'd have got if they'd followed the
 *                             "skip when response time > 20s and you're not
 *                             confident" rule (the trainable heuristic).
 *
 * The 20-second threshold matches the per-question time budget of a
 * 3-hour / 150-question prelims paper (72 seconds/Q) — taking 20+ seconds
 * is a fair signal that the student isn't sure.
 *
 * Pure functions only — no React, no storage.
 */

/** One row in the analyzer's input. Caller derives from session answers. */
export interface AttemptOutcome {
  /** True if the student didn't attempt. Earns 0 marks regardless. */
  skipped: boolean;
  /** True if the answer matched the correct option. Ignored when skipped. */
  wasCorrect: boolean;
  /** Milliseconds spent before submitting. */
  responseTimeMs: number;
  /** Marks awarded for a correct answer (defaults to 1). */
  marksIfCorrect?: number;
  /** Penalty for a wrong answer, as a positive number (default 1/3). */
  negativeMarks?: number;
}

export interface NegativeMarkingReport {
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Sum of negative marks deducted (positive number — represents loss). */
  marksLostToNegative: number;
  /** Marks the student actually scored. */
  actualScore: number;
  /** Marks they would have scored if every wrong answer had been skipped. */
  safeScore: number;
  /**
   * Marks if the student had followed the optimal-skip heuristic
   * (skip when responseTime > SKIP_RECOMMEND_THRESHOLD_MS).
   */
  skipRecommendedScore: number;
  /** Count of answers where slow + wrong indicated a missed skip opportunity. */
  shouldHaveSkipped: number;
}

/** Threshold above which a wrong answer is classified as "should have skipped". */
export const SKIP_RECOMMEND_THRESHOLD_MS = 20_000;
const DEFAULT_MARKS = 1;
const DEFAULT_NEG = 1 / 3;

/**
 * Compute the negative-marking report for a single session or mock.
 *
 * Pure — does not look at storage. Pass the raw attempt outcomes and
 * receive the aggregated numbers.
 */
export function computeNegativeMarkingReport(outcomes: AttemptOutcome[]): NegativeMarkingReport {
  let attempted = 0, correct = 0, wrong = 0, skipped = 0;
  let actualScore = 0, marksLostToNegative = 0;
  let shouldHaveSkipped = 0;
  let recommendedScore = 0;

  for (const o of outcomes) {
    const marks = o.marksIfCorrect ?? DEFAULT_MARKS;
    const neg = o.negativeMarks ?? DEFAULT_NEG;

    if (o.skipped) {
      skipped += 1;
      continue;
    }
    attempted += 1;

    if (o.wasCorrect) {
      correct += 1;
      actualScore += marks;
      recommendedScore += marks;
      continue;
    }

    // Wrong & attempted.
    wrong += 1;
    actualScore -= neg;
    marksLostToNegative += neg;

    // Optimal-skip simulation: had they followed the rule, slow wrongs would
    // have been skipped (0 marks instead of -neg). Fast wrongs are still
    // counted as wrong — the heuristic doesn't claim to catch every miss.
    if (o.responseTimeMs > SKIP_RECOMMEND_THRESHOLD_MS) {
      shouldHaveSkipped += 1;
      // contributes 0 to recommendedScore (skipped under the rule)
    } else {
      recommendedScore -= neg;
    }
  }

  // Safe score = if every wrong had been skipped (just the correct count).
  const safeScore = correct * (outcomes[0]?.marksIfCorrect ?? DEFAULT_MARKS);

  return {
    attempted,
    correct,
    wrong,
    skipped,
    marksLostToNegative,
    actualScore,
    safeScore,
    skipRecommendedScore: recommendedScore,
    shouldHaveSkipped,
  };
}

/**
 * Per-topic recommendation: does the student's history say they should
 * attempt or skip this topic? Default: attempt if historical accuracy on
 * this topic >= 60%, OR if there's no history (so beginners aren't told
 * to skip everything). Used as a real-time hint in the session runner.
 */
export interface AttemptStats {
  /** Total attempts the student has against this topic. */
  attemptsTotal: number;
  /** Correct attempts. */
  attemptsCorrect: number;
}

export function shouldAttemptRecommendation(
  stats: AttemptStats | undefined,
  threshold: number = 0.6,
): "attempt" | "skip" {
  if (!stats || stats.attemptsTotal === 0) return "attempt";
  const accuracy = stats.attemptsCorrect / stats.attemptsTotal;
  return accuracy >= threshold ? "attempt" : "skip";
}
