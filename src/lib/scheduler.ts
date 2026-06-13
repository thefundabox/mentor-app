/**
 * Adaptive practice — spaced repetition scheduler (PR 2)
 * =====================================================
 *
 * Pure functions only. The scheduler decides when a student should next
 * review a topic, what difficulty tier to surface, and an updated confidence
 * score, given one fresh review signal.
 *
 * The scheduler does not touch React state directly — it returns the next
 * StudentTopicRecord, and useAppState.applyTopicScheduling persists it. This
 * separation keeps the math fully testable without a DOM or context.
 *
 * Behavioural spec lives in the Sprint AP brief; the key rules are inlined
 * as constants below so the file is self-documenting.
 *
 * Field shapes map 1:1 to the planned Supabase student_topic_records table —
 * see memory/adaptive-system-supabase-map.md before renaming anything here.
 */

import type { StudentTopicRecord, SubjectCatalogEntry } from "@/types";

/** Starting interval (days) for a never-attempted topic. */
export const MIN_INTERVAL_DAYS = 1;

/**
 * Hard cap on the SR interval. Shorter than typical SRS apps because the
 * RAS syllabus is time-bound (exam date) and current affairs shift fast —
 * letting a topic sleep for 90+ days is unsafe.
 */
export const MAX_INTERVAL_DAYS = 45;

/**
 * Cap for current-affairs items once they age past CA_STALE_AFTER_DAYS.
 * Stale CA must still surface every week even if performance is perfect,
 * because the underlying facts can be displaced by newer events.
 */
export const CA_CAPPED_INTERVAL_DAYS = 7;
export const CA_STALE_AFTER_DAYS = 180;

/** Confidence smoothing factor (EWMA). Higher = current attempt matters more. */
const CONFIDENCE_ALPHA = 0.3;

/** Number of consecutive skips that flips `skipProne` on. */
const SKIP_PRONE_THRESHOLD = 3;

const MS_PER_DAY = 86400000;

/** Bundle of inputs the scheduler needs to make one decision. */
export interface ReviewSignal {
  /** True if the student's response was scored correct. */
  wasCorrect: boolean;
  /** True if the student declined to attempt. Takes precedence over wasCorrect. */
  wasSkipped: boolean;
  /**
   * How long the student took before submitting, in ms. Used to bucket
   * confidence on correct answers and to flag uncertainty for negative-
   * marking analysis. Pass a sensible default (e.g. 12000) when the legacy
   * quiz UI doesn't capture true timing.
   */
  responseTimeMs: number;
  /** True if this topic (or its subject) is Rajasthan-specific. */
  isRajasthanTopic: boolean;
  /** True if the source question is a current-affairs item. */
  isCurrentAffairs: boolean;
  /** ms timestamp of the underlying event for CA items. Ignored otherwise. */
  questionDate?: number;
  /** ms timestamp the scheduler treats as "now". Defaults to Date.now() in the wrapper. */
  now: number;
}

/**
 * Factory for a brand-new topic record. Used the first time a student touches
 * a topic — the scheduler's "previous" state on the first attempt.
 */
export function emptyTopicRecord(topicId: string, now: number = Date.now()): StudentTopicRecord {
  return {
    topicId,
    attemptsTotal: 0,
    attemptsCorrect: 0,
    lastAttemptAt: now,
    nextReviewAt: now,
    intervalDays: MIN_INTERVAL_DAYS,
    difficultyTierUnlocked: 1,
    confidence: 0.5,
    skipRate: 0,
    consecutiveSkips: 0,
  };
}

/**
 * Compute the scheduler's decision for one attempt.
 *
 * Inputs are: the prior record (or undefined for first-touch), and the
 * fresh signal from the attempt. Output is the new record. Pure — does not
 * mutate the prior record.
 */
export function scheduleNextReview(
  prior: StudentTopicRecord | undefined,
  signal: ReviewSignal
): StudentTopicRecord {
  // First-touch case: there's no prior record. Synthesize a fresh skeleton so
  // every read below is safe. The caller overwrites `topicId` on persist, so
  // the placeholder here never escapes the function.
  const base = prior ?? emptyTopicRecord("__placeholder__", signal.now);

  // Skip streak: increment on skip, reset on any non-skip. This drives the
  // skipProne flag and gives the selector a cheap "always include this topic"
  // signal until the student stops dodging it.
  const consecutiveSkips = signal.wasSkipped
    ? (base.consecutiveSkips ?? 0) + 1
    : 0;
  const skipProne = consecutiveSkips >= SKIP_PRONE_THRESHOLD;

  let { intervalDays, difficultyTierUnlocked, confidence } = base;
  let priorityFlag = base.priorityFlag ?? false;

  if (signal.wasSkipped) {
    // Soft-incorrect: student dodged the topic. Shorten interval, ease the
    // next tier, and let the streak counter handle skipProne above.
    intervalDays = Math.max(MIN_INTERVAL_DAYS, Math.round(base.intervalDays * 0.7));
    difficultyTierUnlocked = decTier(difficultyTierUnlocked);
    confidence = ewma(confidence, 0.3);
  } else if (!signal.wasCorrect) {
    // Wrong answer: snap interval back to 1 day, demote tier, and prioritize
    // Rajasthan topics so the mentor & student see them on next session.
    intervalDays = MIN_INTERVAL_DAYS;
    difficultyTierUnlocked = decTier(difficultyTierUnlocked);
    confidence = ewma(confidence, 0.0);
    if (signal.isRajasthanTopic) priorityFlag = true;
  } else {
    // Correct answer — multiplier depends on speed AND on whether this is a
    // Rajasthan topic (those get reviewed more often because they carry
    // disproportionate weight in the actual paper).
    const multiplier = correctMultiplier(signal);
    intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(base.intervalDays * multiplier));
    // Tier escalation lives in the question selector (PR 3), not here —
    // unlocking new tiers depends on rolling accuracy, not a single answer.
    confidence = ewma(confidence, signalConfidenceTarget(signal));
  }

  // Current-affairs cap: once the underlying event is older than the stale
  // window, never let interval grow past one week regardless of performance.
  if (signal.isCurrentAffairs && signal.questionDate !== undefined) {
    const ageMs = signal.now - signal.questionDate;
    if (ageMs > CA_STALE_AFTER_DAYS * MS_PER_DAY) {
      intervalDays = Math.min(intervalDays, CA_CAPPED_INTERVAL_DAYS);
    }
  }

  intervalDays = clamp(intervalDays, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);
  const nextReviewAt = signal.now + intervalDays * MS_PER_DAY;

  const attemptsTotal = base.attemptsTotal + 1;
  const attemptsCorrect = base.attemptsCorrect + (signal.wasCorrect && !signal.wasSkipped ? 1 : 0);
  const skipsRecent = countRecentSkips(base, signal);
  const skipRate = clamp(skipsRecent / Math.max(1, Math.min(attemptsTotal, 10)), 0, 1);

  return {
    ...base,
    attemptsTotal,
    attemptsCorrect,
    lastAttemptAt: signal.now,
    nextReviewAt,
    intervalDays,
    difficultyTierUnlocked,
    confidence: clamp(confidence, 0, 1),
    skipRate,
    consecutiveSkips,
    skipProne,
    priorityFlag,
  };
}

/**
 * Return the subset of topic records that are due (nextReviewAt <= now),
 * sorted by the priority defined in Prompt 3 step 1:
 *   1. Rajasthan-specific topics first
 *   2. Then priorityFlag rows
 *   3. Then by ascending confidence (weakest first)
 *
 * The Rajasthan flag is *per-record* here — the caller passes a resolver so
 * the scheduler stays decoupled from the subject catalog.
 */
export function dueTopics(
  records: StudentTopicRecord[],
  now: number,
  isRajasthan: (topicId: string) => boolean
): StudentTopicRecord[] {
  const due = records.filter((r) => r.nextReviewAt <= now);
  return due.sort((a, b) => {
    const aRaj = isRajasthan(a.topicId) ? 1 : 0;
    const bRaj = isRajasthan(b.topicId) ? 1 : 0;
    if (aRaj !== bRaj) return bRaj - aRaj;
    const aPri = a.priorityFlag ? 1 : 0;
    const bPri = b.priorityFlag ? 1 : 0;
    if (aPri !== bPri) return bPri - aPri;
    return a.confidence - b.confidence;
  });
}

/**
 * True if the given topic — or its containing subject — is flagged
 * Rajasthan-specific. Either flag is sufficient; admins can mark a whole
 * subject "Rajasthan-specific" (e.g., "History of Rajasthan") and the lookup
 * propagates to every topic inside it without per-topic editing.
 */
export function isTopicRajasthanSpecific(
  subjects: SubjectCatalogEntry[],
  topicId: string
): boolean {
  for (const s of subjects) {
    if (s.archived) continue;
    const t = s.topics.find((t) => t.id === topicId);
    if (t) return !!(t.rajasthanSpecific || s.rajasthanSpecific);
  }
  return false;
}

/* ---------- internals ----------------------------------------------------- */

function correctMultiplier(signal: ReviewSignal): number {
  if (signal.responseTimeMs < 8000) {
    return signal.isRajasthanTopic ? 1.8 : 2.5;
  }
  if (signal.responseTimeMs <= 15000) return 1.5;
  // Slow-but-correct = shaky knowledge; small bump only.
  return 1.2;
}

function signalConfidenceTarget(signal: ReviewSignal): number {
  // Correct + fast → 1.0; correct + slow → 0.7. Skipped/wrong handled by caller.
  if (signal.responseTimeMs < 8000) return 1.0;
  if (signal.responseTimeMs <= 15000) return 0.85;
  return 0.7;
}

function ewma(prev: number, target: number): number {
  return prev * (1 - CONFIDENCE_ALPHA) + target * CONFIDENCE_ALPHA;
}

function decTier(tier: 1 | 2 | 3): 1 | 2 | 3 {
  return (Math.max(1, tier - 1) as 1 | 2 | 3);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function countRecentSkips(prior: StudentTopicRecord, signal: ReviewSignal): number {
  // Same simplification: we don't keep a sliding window of attempts on the
  // record, so skipRate is approximated by a smoothed increment. PR 3 will
  // replace this with a true rolling count once perQuestion lands.
  const prev = Math.round(prior.skipRate * 10);
  return signal.wasSkipped ? Math.min(10, prev + 1) : Math.max(0, prev - 1);
}
