import type { StudentData, Attempt } from "@/types";

/** Floor a unix-ms timestamp to the start of its calendar day (local time). */
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Build a Set of day-keys (start-of-day ms) that the student touched in some way. */
function activeDayKeys(s: StudentData): Set<number> {
  const keys = new Set<number>();
  for (const a of s.attempts) keys.add(startOfDay(a.when));
  for (const m of s.mainsScores) keys.add(startOfDay(m.when));
  for (const e of s.points.history) keys.add(startOfDay(e.when));
  if (s.lastActivityAt) keys.add(startOfDay(s.lastActivityAt));
  return keys;
}

/** Day-keys where the student made at least one quiz attempt. */
function quizDayKeys(s: StudentData): Set<number> {
  const keys = new Set<number>();
  for (const a of s.attempts) keys.add(startOfDay(a.when));
  return keys;
}

/** Count consecutive days (working backward from today) that appear in the key set. */
function streakFromKeys(keys: Set<number>, today: number = Date.now()): number {
  const ONE_DAY = 86_400_000;
  let cur = startOfDay(today);
  let n = 0;
  while (keys.has(cur)) {
    n++;
    cur -= ONE_DAY;
  }
  return n;
}

export function dailyActivityStreak(s: StudentData, today: number = Date.now()): number {
  return streakFromKeys(activeDayKeys(s), today);
}

export function quizAttemptStreak(s: StudentData, today: number = Date.now()): number {
  return streakFromKeys(quizDayKeys(s), today);
}

export interface ActivityDot {
  date: number; // start-of-day ms
  active: boolean;
  attempts: number;
}

/** Last `days` calendar days (oldest → newest) with activity flags. */
export function activityHistory(s: StudentData, days = 14, today: number = Date.now()): ActivityDot[] {
  const ONE_DAY = 86_400_000;
  const active = activeDayKeys(s);
  const attemptsByDay: Record<number, number> = {};
  for (const a of s.attempts) {
    const k = startOfDay(a.when);
    attemptsByDay[k] = (attemptsByDay[k] || 0) + 1;
  }
  const out: ActivityDot[] = [];
  const start = startOfDay(today) - (days - 1) * ONE_DAY;
  for (let i = 0; i < days; i++) {
    const d = start + i * ONE_DAY;
    out.push({ date: d, active: active.has(d), attempts: attemptsByDay[d] || 0 });
  }
  return out;
}

/** Consecutive cleared days starting from day 1 — the existing "study streak". */
export function clearedStreak(completed: number[]): number {
  if (completed.length === 0) return 0;
  const set = new Set(completed);
  let n = 0;
  for (let i = 1; ; i++) {
    if (set.has(i)) n++;
    else break;
  }
  return n;
}

// silence unused import warning when extending later
export type { Attempt };
