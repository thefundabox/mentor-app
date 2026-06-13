import type { Attempt, ConceptStat, StudentData } from "@/types";

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
