import type { Attempt, ConceptStat, StudentData, TestAttempt, Test } from "@/types";

/** Threshold for considering a student "stuck" on a day (red-flagged). */
export const STUCK_ATTEMPTS_THRESHOLD = 3;

/** Days where the student has attempted ≥ threshold times without 80%+ and no approved override. */
export function stuckDays(s: StudentData): { day: number; attempts: number; bestScore: number }[] {
  const byDay: Record<number, Attempt[]> = {};
  for (const a of s.attempts) {
    (byDay[a.day] = byDay[a.day] || []).push(a);
  }
  const out: { day: number; attempts: number; bestScore: number }[] = [];
  for (const [dayStr, list] of Object.entries(byDay)) {
    const day = Number(dayStr);
    const hasApprovedOverride = s.overrides.some((o) => o.day === day && o.status === "approved");
    if (hasApprovedOverride) continue;
    const bestScore = Math.max(...list.map((a) => a.score));
    if (bestScore >= 80) continue;
    if (list.length >= STUCK_ATTEMPTS_THRESHOLD) out.push({ day, attempts: list.length, bestScore });
  }
  return out.sort((a, b) => a.day - b.day);
}

export function hasRedFlag(s: StudentData): boolean {
  return stuckDays(s).length > 0;
}

/** Stats about a student's test attempt within its cohort. */
export interface TestCohortStats {
  /** This attempt's score. */
  myScore: number;
  /** Max possible marks. */
  maxScore: number;
  /** Cohort average score across all finished attempts of this test. */
  cohortAvg: number | null;
  /** Best score among the cohort. */
  cohortBest: number | null;
  /** Number of finished attempts of this test in the cohort. */
  cohortAttemptCount: number;
  /** Rank (1-indexed; ties share rank). */
  rank: number | null;
  /** Percentile (0-100), where higher is better. */
  percentile: number | null;
}

export function cohortStatsForAttempt(
  attempt: TestAttempt,
  allAttemptsForTest: TestAttempt[],
): TestCohortStats {
  const finished = allAttemptsForTest.filter((a) => a.finishedAt !== undefined && a.score !== undefined);
  const myScore = attempt.score ?? 0;
  const maxScore = attempt.maxScore ?? 0;

  if (finished.length === 0) {
    return { myScore, maxScore, cohortAvg: null, cohortBest: null, cohortAttemptCount: 0, rank: null, percentile: null };
  }

  // Use each student's BEST finished attempt for the comparison (fairer than counting all retakes).
  const bestByStudent = new Map<string, number>();
  for (const a of finished) {
    const cur = bestByStudent.get(a.studentId) ?? -Infinity;
    if ((a.score ?? -Infinity) > cur) bestByStudent.set(a.studentId, a.score ?? 0);
  }
  const scores = [...bestByStudent.values()];
  const sum = scores.reduce((a, b) => a + b, 0);
  const cohortAvg = sum / scores.length;
  const cohortBest = Math.max(...scores);
  const rank = 1 + scores.filter((s) => s > myScore).length;
  const below = scores.filter((s) => s < myScore).length;
  const percentile = scores.length > 1 ? Math.round((below / (scores.length - 1)) * 100) : 100;

  return { myScore, maxScore, cohortAvg, cohortBest, cohortAttemptCount: scores.length, rank, percentile };
}

/** Average per-section accuracy across many test attempts. */
export function testSectionAggregate(attempts: TestAttempt[], test: Test): Record<string, { avgMarks: number; n: number; max: number }> {
  const out: Record<string, { avgMarks: number; n: number; max: number }> = {};
  for (const sec of test.sections) {
    const max = sec.questionCount * sec.marksPerQuestion;
    const finished = attempts.filter((a) => a.finishedAt !== undefined && a.sectionScores?.[sec.id]);
    if (finished.length === 0) {
      out[sec.id] = { avgMarks: 0, n: 0, max };
      continue;
    }
    const sum = finished.reduce((acc, a) => acc + (a.sectionScores![sec.id]?.marks || 0), 0);
    out[sec.id] = { avgMarks: sum / finished.length, n: finished.length, max };
  }
  return out;
}

/** Aggregate concept stats across many students (cohort heatmap). */
export function cohortConceptStats(studentDataList: StudentData[]): ConceptScore[] {
  const sum: Record<string, ConceptStat> = {};
  for (const s of studentDataList) {
    for (const a of s.attempts) {
      if (!a.byConcept) continue;
      for (const [c, st] of Object.entries(a.byConcept)) {
        const cur = sum[c] || { right: 0, wrong: 0 };
        cur.right += st.right;
        cur.wrong += st.wrong;
        sum[c] = cur;
      }
    }
  }
  return Object.entries(sum).map(([concept, { right, wrong }]) => ({
    concept,
    right,
    wrong,
    accuracy: right + wrong === 0 ? 0 : right / (right + wrong),
  }));
}

export interface ConceptScore {
  concept: string;
  right: number;
  wrong: number;
  accuracy: number; // 0..1
}

export function aggregateConcepts(attempts: Attempt[]): ConceptScore[] {
  const sum: Record<string, ConceptStat> = {};
  for (const a of attempts) {
    if (!a.byConcept) continue;
    for (const [c, s] of Object.entries(a.byConcept)) {
      const cur = sum[c] || { right: 0, wrong: 0 };
      cur.right += s.right;
      cur.wrong += s.wrong;
      sum[c] = cur;
    }
  }
  return Object.entries(sum).map(([concept, { right, wrong }]) => ({
    concept,
    right,
    wrong,
    accuracy: right + wrong === 0 ? 0 : right / (right + wrong),
  }));
}

export function strengthsAndWeaknesses(attempts: Attempt[], n = 3) {
  const scores = aggregateConcepts(attempts).filter((s) => s.right + s.wrong >= 1);
  const sorted = [...scores].sort((a, b) => b.accuracy - a.accuracy);
  return {
    strengths: sorted.filter((s) => s.accuracy >= 0.7).slice(0, n),
    weaknesses: [...sorted].reverse().filter((s) => s.accuracy < 0.7).slice(0, n),
    all: sorted,
  };
}
