/**
 * Mentor availability and 1:1 session booking.
 *
 * Availability is a weekly pattern plus per-date exceptions, so a mentor sets
 * it once rather than refilling a calendar every week. Slots are computed here
 * in the browser from those rules; the database is what actually decides a
 * booking is valid.
 *
 * That split matters. A slot list is a suggestion -- two students can be
 * looking at the same free slot at the same moment. The unique index
 * `bookings_slot_uniq` and the quota trigger in migration 0021 are the real
 * guards, and this file reports what they say rather than pre-judging it.
 *
 * Times: availability is wall-clock minutes from midnight (Monday 18:00 means
 * 6pm wherever the mentor is), bookings are absolute instants. Slots are built
 * in the viewer's local timezone. Everyone here is in one timezone; if that
 * changes, this is the seam.
 */
import { supabase } from "./supabase";

export interface MentorSettings {
  mentor_id: string;
  slot_minutes: number;
  quota_count: number;
  quota_period_days: number;
  lead_time_hours: number;
  horizon_days: number;
  cancel_cutoff_hours: number;
}

export interface AvailabilityRule {
  id: string;
  mentor_id: string;
  weekday: number;      // 0 = Sunday
  start_min: number;
  end_min: number;
}

export interface DayOverride {
  id: string;
  mentor_id: string;
  on_date: string;      // YYYY-MM-DD
  kind: "blocked" | "extra";
  start_min: number | null;
  end_min: number | null;
  note: string | null;
}

export interface Booking {
  id: string;
  mentor_id: string;
  student_id: string;
  student_name: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "cancelled";
  topic: string | null;
}

export interface Result<T> { data?: T; error?: string }

const NO_CLIENT = "Booking is unavailable - Supabase is not configured.";

export const DEFAULT_SETTINGS: Omit<MentorSettings, "mentor_id"> = {
  slot_minutes: 30,
  quota_count: 2,
  quota_period_days: 30,
  lead_time_hours: 12,
  horizon_days: 30,
  cancel_cutoff_hours: 6,
};

/** The periods a mentor can pick, in days. Free-form days are also allowed. */
export const QUOTA_PERIODS: { label: string; days: number }[] = [
  { label: "15 days", days: 15 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ------------------------------------------------------------------ time */

/** "18:30" for 1110. */
export function minToLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** Local YYYY-MM-DD. Deliberately not toISOString, which shifts to UTC. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Window { start: number; end: number }

/** Remove `cut` from `windows`, splitting any window it lands in the middle of. */
function subtract(windows: Window[], cut: Window): Window[] {
  const out: Window[] = [];
  for (const w of windows) {
    if (cut.end <= w.start || cut.start >= w.end) { out.push(w); continue; }
    if (cut.start > w.start) out.push({ start: w.start, end: Math.min(cut.start, w.end) });
    if (cut.end < w.end) out.push({ start: Math.max(cut.end, w.start), end: w.end });
  }
  return out;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  taken: boolean;
}

export interface DaySlots {
  date: Date;
  key: string;
  slots: Slot[];
}

/**
 * Bookable slots for the next `horizon_days`.
 *
 * A slot is emitted even when taken, so the calendar can show a full day as
 * full rather than as empty -- "nothing here" and "all gone" mean very
 * different things to somebody trying to book.
 */
export function buildSlots(args: {
  settings: MentorSettings;
  rules: AvailabilityRule[];
  overrides: DayOverride[];
  bookings: Booking[];
  now?: Date;
}): DaySlots[] {
  const { settings, rules, overrides, bookings } = args;
  const now = args.now ?? new Date();
  const earliest = new Date(now.getTime() + settings.lead_time_hours * 3600_000);

  const takenAt = new Set(
    bookings.filter((b) => b.status === "booked").map((b) => new Date(b.starts_at).getTime()),
  );

  const byDate = new Map<string, DayOverride[]>();
  for (const o of overrides) {
    const list = byDate.get(o.on_date) ?? [];
    list.push(o);
    byDate.set(o.on_date, list);
  }

  const out: DaySlots[] = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < settings.horizon_days; i++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + i);
    const key = dateKey(day);
    const dayOverrides = byDate.get(key) ?? [];

    // A whole-day block short-circuits everything, including 'extra' windows:
    // "I am not available that day" should not be undone by a stale extra.
    if (dayOverrides.some((o) => o.kind === "blocked" && o.start_min === null)) continue;

    let windows: Window[] = rules
      .filter((r) => r.weekday === day.getDay())
      .map((r) => ({ start: r.start_min, end: r.end_min }));

    for (const o of dayOverrides) {
      if (o.kind === "extra" && o.start_min !== null && o.end_min !== null) {
        windows.push({ start: o.start_min, end: o.end_min });
      }
    }
    for (const o of dayOverrides) {
      if (o.kind === "blocked" && o.start_min !== null && o.end_min !== null) {
        windows = subtract(windows, { start: o.start_min, end: o.end_min });
      }
    }
    if (windows.length === 0) continue;

    windows.sort((a, b) => a.start - b.start);
    const slots: Slot[] = [];
    for (const w of windows) {
      for (let m = w.start; m + settings.slot_minutes <= w.end; m += settings.slot_minutes) {
        const startsAt = new Date(day);
        startsAt.setHours(0, m, 0, 0);
        if (startsAt < earliest) continue;
        const endsAt = new Date(startsAt.getTime() + settings.slot_minutes * 60_000);
        slots.push({ startsAt, endsAt, taken: takenAt.has(startsAt.getTime()) });
      }
    }
    if (slots.length > 0) out.push({ date: day, key, slots });
  }
  return out;
}

/* ------------------------------------------------------------------ data */

export async function loadSettings(mentorId: string): Promise<MentorSettings | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("mentor_settings").select("*").eq("mentor_id", mentorId).maybeSingle();
  return (data as MentorSettings) ?? null;
}

export async function saveSettings(s: MentorSettings): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase
    .from("mentor_settings")
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: "mentor_id" });
  return error ? { error: error.message } : { data: true };
}

export async function loadRules(mentorId: string): Promise<AvailabilityRule[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("mentor_availability").select("*").eq("mentor_id", mentorId)
    .order("weekday").order("start_min");
  return (data ?? []) as AvailabilityRule[];
}

export async function addRule(
  mentorId: string, weekday: number, start_min: number, end_min: number,
): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  if (end_min <= start_min) return { error: "The end time has to be after the start time." };
  const { error } = await supabase
    .from("mentor_availability").insert({ mentor_id: mentorId, weekday, start_min, end_min });
  return error ? { error: error.message } : { data: true };
}

export async function removeRule(id: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("mentor_availability").delete().eq("id", id);
  return error ? { error: error.message } : { data: true };
}

export async function loadOverrides(mentorId: string): Promise<DayOverride[]> {
  if (!supabase) return [];
  const today = dateKey(new Date());
  const { data } = await supabase
    .from("mentor_day_overrides").select("*").eq("mentor_id", mentorId)
    .gte("on_date", today).order("on_date");
  return (data ?? []) as DayOverride[];
}

export async function addOverride(o: {
  mentorId: string; onDate: string; kind: "blocked" | "extra";
  startMin?: number | null; endMin?: number | null; note?: string;
}): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("mentor_day_overrides").insert({
    mentor_id: o.mentorId, on_date: o.onDate, kind: o.kind,
    start_min: o.startMin ?? null, end_min: o.endMin ?? null, note: o.note ?? null,
  });
  return error ? { error: error.message } : { data: true };
}

export async function removeOverride(id: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("mentor_day_overrides").delete().eq("id", id);
  return error ? { error: error.message } : { data: true };
}

/** Bookings for a mentor (their calendar) or a student (their sessions). */
export async function loadBookings(
  filter: { mentorId?: string; studentId?: string; fromNow?: boolean },
): Promise<Booking[]> {
  if (!supabase) return [];
  let q = supabase.from("bookings").select("*");
  if (filter.mentorId) q = q.eq("mentor_id", filter.mentorId);
  if (filter.studentId) q = q.eq("student_id", filter.studentId);
  if (filter.fromNow) q = q.gte("starts_at", new Date().toISOString());
  const { data } = await q.order("starts_at");
  return (data ?? []) as Booking[];
}

/**
 * Take a slot.
 *
 * mentor_id / student_id / student_name are all stamped by the trigger, so a
 * tampered payload cannot book on somebody else's behalf or under another
 * name. The quota is checked there too.
 */
export async function book(args: {
  startsAt: Date; endsAt: Date; topic?: string; mentorId?: string; studentId?: string;
}): Promise<Result<Booking>> {
  if (!supabase) return { error: NO_CLIENT };
  const { data, error } = await supabase.from("bookings").insert({
    // Sent for the staff-booking path; ignored for a student, whose row the
    // trigger overwrites from auth.uid().
    mentor_id: args.mentorId ?? null,
    student_id: args.studentId ?? null,
    starts_at: args.startsAt.toISOString(),
    ends_at: args.endsAt.toISOString(),
    topic: args.topic?.trim() || null,
  }).select().single();

  if (error) {
    // 23505 is bookings_slot_uniq: somebody else took it between the page
    // loading and the click. Say that, rather than a constraint name.
    if (error.code === "23505") {
      return { error: "That slot was just taken by someone else. Pick another." };
    }
    // P0001/P0002 are the trigger's own raises, already written for a human.
    if (error.code === "P0001" || error.code === "P0002") return { error: error.message };
    return { error: error.message };
  }
  return { data: data as Booking };
}

export async function cancelBooking(id: string, by: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("bookings")
    .update({ status: "cancelled", cancelled_by: by, cancelled_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { error: error.message } : { data: true };
}

/** How many sessions the student has used in the mentor's rolling window. */
export function quotaUsed(bookings: Booking[], settings: MentorSettings, now = new Date()): number {
  const since = now.getTime() - settings.quota_period_days * 86_400_000;
  return bookings.filter((b) => b.status === "booked" && new Date(b.starts_at).getTime() > since).length;
}
