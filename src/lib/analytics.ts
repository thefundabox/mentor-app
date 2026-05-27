import type { Attempt, ConceptStat } from "@/types";

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
