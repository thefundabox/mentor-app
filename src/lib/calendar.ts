import type { Batch } from "@/types";

const ONE_DAY = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Which Day number does `today` correspond to in the given batch?
 * Returns:
 *   - 0 if the batch hasn't started yet
 *   - 1 on the start date
 *   - N for N-1 days after start
 */
export function calendarDayForBatch(batch: Batch, today: number = Date.now()): number {
  const start = startOfDay(batch.startDate);
  const t = startOfDay(today);
  if (t < start) return 0;
  return Math.floor((t - start) / ONE_DAY) + 1;
}

/** Calendar ms timestamp for "Day N" of the batch (1-indexed). */
export function dateForBatchDay(batch: Batch, dayNum: number): number {
  return startOfDay(batch.startDate) + (dayNum - 1) * ONE_DAY;
}

/** Days until batch starts. Returns 0 if it has already started. */
export function daysUntilBatchStart(batch: Batch, today: number = Date.now()): number {
  const start = startOfDay(batch.startDate);
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
export function pacingStatus(batch: Batch, currentDay: number, today: number = Date.now()): {
  status: "on-schedule" | "ahead" | "behind" | "not-started";
  delta: number;
  calendarDay: number;
} {
  const calendarDay = calendarDayForBatch(batch, today);
  if (calendarDay === 0) return { status: "not-started", delta: 0, calendarDay };
  const delta = currentDay - calendarDay;
  if (delta >= 1) return { status: "ahead", delta, calendarDay };
  if (delta <= -2) return { status: "behind", delta, calendarDay };
  return { status: "on-schedule", delta, calendarDay };
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
