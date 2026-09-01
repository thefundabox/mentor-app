/**
 * When the paper is.
 *
 * RPSC RAS Prelims: 6 December, 10:00 IST.
 *
 * Stored as an absolute instant rather than a local date. IST is UTC+5:30, so
 * 10:00 IST is 04:30 UTC — writing `new Date(2026, 11, 6, 10, 0)` would mean
 * 10am in whatever timezone the browser happens to be in, and a student
 * checking from outside India would be counting down to the wrong moment.
 */
export const EXAM_AT = Date.UTC(2026, 11, 6, 4, 30, 0);

export const EXAM_LABEL = "6 December 2026";
export const EXAM_TIME_LABEL = "10:00 am IST";

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the paper has started. */
  past: boolean;
  /** True on exam day itself, before it starts. */
  today: boolean;
}

/**
 * Time left until the paper.
 *
 * `examAt` is a parameter now rather than the module constant, because the date
 * moved into institute_settings (0037) and is editable without a deploy. The
 * constant remains the default so demo mode and the first paint, before the
 * settings fetch lands, still count down to something real.
 */
export function timeToExam(now: number = Date.now(), examAt: number = EXAM_AT): Remaining {
  const ms = examAt - now;
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true, today: false };
  }
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  return {
    days,
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    past: false,
    today: days === 0,
  };
}
