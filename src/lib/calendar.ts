import type { Batch } from "@/types";

const ONE_DAY = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * The day the student's own plan clock starts.
 *
 * Everything used to be measured from `batch.startDate`, which is right only
 * for someone who was there on day one. A student joining a batch 30 days in
 * was told they were 29 days behind the moment they signed in, and stayed
 * flagged behind until they had completed 30 days -- while possibly sprinting
 * three days a day and objectively ahead of their own pace. Their mentor read
 * the same number. Day labels were worse still: Day 1 was dated a month in the
 * past.
 *
 * `planStartedAt` is stamped when the student adopts a plan. The later of the
 * two wins: joining early cannot start your clock before the batch does, and
 * joining late measures you from when you actually started.
 */
export function planStartFor(batch: Batch, planStartedAt?: number): number {
  const batchStart = startOfDay(batch.startDate);
  if (!planStartedAt) return batchStart;
  return Math.max(batchStart, startOfDay(planStartedAt));
}

/**
 * Which Day number does `today` correspond to for this student?
 * Returns:
 *   - 0 if their plan hasn't started yet
 *   - 1 on the start date
 *   - N for N-1 days after start
 */
export function calendarDayForBatch(
  batch: Batch, today: number = Date.now(), planStartedAt?: number,
): number {
  const start = planStartFor(batch, planStartedAt);
  const t = startOfDay(today);
  if (t < start) return 0;
  return Math.floor((t - start) / ONE_DAY) + 1;
}

/** Calendar ms timestamp for this student's "Day N" (1-indexed). */
export function dateForBatchDay(batch: Batch, dayNum: number, planStartedAt?: number): number {
  return planStartFor(batch, planStartedAt) + (dayNum - 1) * ONE_DAY;
}

/** Days until the student's plan starts. Returns 0 if it already has. */
export function daysUntilBatchStart(
  batch: Batch, today: number = Date.now(), planStartedAt?: number,
): number {
  const start = planStartFor(batch, planStartedAt);
  const t = startOfDay(today);
  return Math.max(0, Math.ceil((start - t) / ONE_DAY));
}

/**
 * Track student pacing vs. calendar:
 *  - "on-schedule": progress.currentDay matches calendar day (±1)
 *  - "ahead":       student is ahead of where the calendar would expect
 *  - "behind":      calendar is ahead of student progress
 *  - "not-started": batch hasn't started yet
 */
export function pacingStatus(
  batch: Batch, currentDay: number, today: number = Date.now(), planStartedAt?: number,
): {
  status: "on-schedule" | "ahead" | "behind" | "not-started";
  delta: number;
  calendarDay: number;
} {
  const calendarDay = calendarDayForBatch(batch, today, planStartedAt);
  if (calendarDay === 0) return { status: "not-started", delta: 0, calendarDay };
  const delta = currentDay - calendarDay;
  if (delta >= 1) return { status: "ahead", delta, calendarDay };
  if (delta <= -2) return { status: "behind", delta, calendarDay };
  return { status: "on-schedule", delta, calendarDay };
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
