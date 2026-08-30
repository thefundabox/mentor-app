import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Plus, Trash2, CalendarOff, CalendarPlus, Check } from "lucide-react";
import {
  loadSettings, saveSettings, loadRules, addRule, removeRule,
  loadOverrides, addOverride, removeOverride, loadBookings, cancelBooking,
  DEFAULT_SETTINGS, QUOTA_PERIODS, WEEKDAYS, minToLabel, dateKey,
  type MentorSettings, type AvailabilityRule, type DayOverride, type Booking,
} from "@/lib/booking";

/**
 * Mentor: when I am available, and how often a student may book me.
 *
 * Availability is a weekly pattern plus dated exceptions, so this is set once
 * and adjusted occasionally rather than refilled every week.
 */
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30); // every half hour

export function MentorAvailability() {
  const { currentUser, setRoute } = useAppState();
  const mentorId = currentUser?.id ?? "";

  const [settings, setSettings] = useState<MentorSettings | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState(18 * 60);
  const [newEnd, setNewEnd] = useState(20 * 60);
  const [blockDate, setBlockDate] = useState("");

  const refresh = useCallback(async () => {
    if (!mentorId) return;
    const [s, r, o, b] = await Promise.all([
      loadSettings(mentorId), loadRules(mentorId), loadOverrides(mentorId),
      loadBookings({ mentorId, fromNow: true }),
    ]);
    setSettings(s ?? { mentor_id: mentorId, ...DEFAULT_SETTINGS });
    setRules(r); setOverrides(o); setBookings(b.filter((x) => x.status === "booked"));
    setLoading(false);
  }, [mentorId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function persist(next: MentorSettings) {
    setSettings(next);
    const res = await saveSettings(next);
    if (res.error) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function onAddRule() {
    setError(null);
    const res = await addRule(mentorId, newDay, newStart, newEnd);
    if (res.error) { setError(res.error); return; }
    await refresh();
  }

  async function onBlockDay() {
    if (!blockDate) return;
    setError(null);
    const res = await addOverride({ mentorId, onDate: blockDate, kind: "blocked" });
    if (res.error) { setError(res.error); return; }
    setBlockDate("");
    await refresh();
  }

  if (loading || !settings) {
    return (
      <Shell onBack={() => setRoute("mentor")}>
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your availability…
        </div>
      </Shell>
    );
  }

  const byDay = WEEKDAYS.map((_, d) => rules.filter((r) => r.weekday === d));

  return (
    <Shell onBack={() => setRoute("mentor")}>
      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">Mentor</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Availability &amp; booking</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">
          Set the hours you are open for 1:1 sessions and how often a student may
          book you. Students only ever see slots that are still free.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
      )}
      {saved && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4" /> Saved
        </div>
      )}

      {/* ------------------------------------------------------ session rules */}
      <Card title="Session rules">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Slot length" hint="Each bookable appointment is this long.">
            <select
              value={settings.slot_minutes}
              onChange={(e) => persist({ ...settings, slot_minutes: Number(e.target.value) })}
              className={selectCls}
            >
              {[15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </Field>

          <Field label="How many sessions a student may book" hint="Counted over a rolling window.">
            <div className="flex gap-2">
              <select
                value={settings.quota_count}
                onChange={(e) => persist({ ...settings, quota_count: Number(e.target.value) })}
                className={selectCls}
              >
                {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 20].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "none (paused)" : n}</option>
                ))}
              </select>
              <span className="self-center text-sm text-slate-500">per</span>
              <select
                value={settings.quota_period_days}
                onChange={(e) => persist({ ...settings, quota_period_days: Number(e.target.value) })}
                className={selectCls}
              >
                {QUOTA_PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
              </select>
            </div>
          </Field>

          <Field label="Shortest notice" hint="A student cannot book anything sooner than this.">
            <select
              value={settings.lead_time_hours}
              onChange={(e) => persist({ ...settings, lead_time_hours: Number(e.target.value) })}
              className={selectCls}
            >
              {[0, 2, 6, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>{h === 0 ? "no minimum" : `${h} hours`}</option>
              ))}
            </select>
          </Field>

          <Field label="How far ahead the calendar opens">
            <select
              value={settings.horizon_days}
              onChange={(e) => persist({ ...settings, horizon_days: Number(e.target.value) })}
              className={selectCls}
            >
              {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </Field>

          <Field label="Student can cancel up to" hint="After this, only you can cancel.">
            <select
              value={settings.cancel_cutoff_hours}
              onChange={(e) => persist({ ...settings, cancel_cutoff_hours: Number(e.target.value) })}
              className={selectCls}
            >
              {[0, 2, 6, 12, 24, 48].map((h) => (
                <option key={h} value={h}>{h === 0 ? "any time" : `${h} hours before`}</option>
              ))}
            </select>
          </Field>
        </div>

        {settings.quota_count === 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Bookings are paused. Students will be told you are not taking sessions
            at the moment, and no slots will be offered.
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------ weekly hours */}
      <Card title="Weekly hours" subtitle="Repeats every week until you change it.">
        <div className="space-y-2 mb-4">
          {WEEKDAYS.map((name, d) => (
            <div key={d} className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-0">
              <div className="w-24 text-sm font-medium text-slate-700 pt-1">{name}</div>
              <div className="flex-1 flex flex-wrap gap-2">
                {byDay[d].length === 0 && <span className="text-sm text-slate-400 pt-1">unavailable</span>}
                {byDay[d].map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-2 text-sm bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg px-2.5 py-1">
                    {minToLabel(r.start_min)} – {minToLabel(r.end_min)}
                    <button
                      onClick={async () => { await removeRule(r.id); await refresh(); }}
                      className="text-indigo-400 hover:text-rose-600"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100">
          <select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className={selectCls}>
            {WEEKDAYS.map((n, d) => <option key={d} value={d}>{n}</option>)}
          </select>
          <select value={newStart} onChange={(e) => setNewStart(Number(e.target.value))} className={selectCls}>
            {TIMES.map((m) => <option key={m} value={m}>{minToLabel(m)}</option>)}
          </select>
          <span className="self-center text-sm text-slate-500">to</span>
          <select value={newEnd} onChange={(e) => setNewEnd(Number(e.target.value))} className={selectCls}>
            {TIMES.concat([1440]).map((m) => <option key={m} value={m}>{minToLabel(m === 1440 ? 1439 : m)}</option>)}
          </select>
          <Button onClick={onAddRule}><Plus className="w-4 h-4" /> Add hours</Button>
        </div>
      </Card>

      {/* --------------------------------------------------------- exceptions */}
      <Card title="Days off" subtitle="Block a specific date without touching your weekly pattern.">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <input
            type="date"
            value={blockDate}
            min={dateKey(new Date())}
            onChange={(e) => setBlockDate(e.target.value)}
            className={selectCls}
          />
          <Button variant="outline" onClick={onBlockDay}>
            <CalendarOff className="w-4 h-4" /> Block this day
          </Button>
        </div>
        {overrides.length === 0 ? (
          <div className="text-sm text-slate-500">No days blocked.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {overrides.map((o) => (
              <span key={o.id} className="inline-flex items-center gap-2 text-sm bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
                {o.kind === "blocked" ? <CalendarOff className="w-3.5 h-3.5 text-slate-500" /> : <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />}
                {o.on_date}
                {o.start_min !== null && ` · ${minToLabel(o.start_min)}–${minToLabel(o.end_min ?? 0)}`}
                <button
                  onClick={async () => { await removeOverride(o.id); await refresh(); }}
                  className="text-slate-400 hover:text-rose-600"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* ----------------------------------------------------------- upcoming */}
      <Card title="Upcoming sessions">
        {bookings.length === 0 ? (
          <div className="text-sm text-slate-500">Nothing booked yet.</div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{b.student_name || "Student"}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(b.starts_at).toLocaleString(undefined, {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "numeric", minute: "2-digit",
                    })}
                    {b.topic ? ` · ${b.topic}` : ""}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await cancelBooking(b.id, mentorId);
                    if (res.error) setError(res.error); else await refresh();
                  }}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}

const selectCls = "px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm bg-white focus:border-indigo-400";

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {children}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-700 mb-1">{label}</div>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
