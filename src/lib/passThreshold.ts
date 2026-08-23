import type { StudentData } from "@/types";

/**
 * The score a topic quiz must reach to clear its topic.
 *
 * This was the literal 80 in six places — the clearing rule, the first-try
 * bonus, the scheduler's notion of a correct attempt, the habits card, the
 * stuck-day report and the copy on the topic screen. Six copies of a policy is
 * five too many: they can disagree, and none of them can be changed by the
 * person who should be deciding it. Mentors set it per student now.
 */
export const DEFAULT_PASS_THRESHOLD = 80;

/** Below this a "pass" stops meaning anything; above it nothing is passable. */
export const MIN_PASS_THRESHOLD = 40;
export const MAX_PASS_THRESHOLD = 100;

export function clampPassThreshold(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PASS_THRESHOLD;
  return Math.min(MAX_PASS_THRESHOLD, Math.max(MIN_PASS_THRESHOLD, Math.round(n)));
}

/** The threshold in force for one student. Always use this, never a literal. */
export function passThresholdOf(s: Pick<StudentData, "chart"> | null | undefined): number {
  const raw = s?.chart?.passThreshold;
  return typeof raw === "number" ? clampPassThreshold(raw) : DEFAULT_PASS_THRESHOLD;
}
