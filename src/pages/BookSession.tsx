import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CalendarCheck, Clock } from "lucide-react";
import {
  loadSettings, loadRules, loadOverrides, loadBookings, book, cancelBooking,
  buildSlots, quotaUsed, minToLabel,
  type MentorSettings, type AvailabilityRule, type DayOverride, type Booking, type DaySlots,
} from "@/lib/booking";

/**
 * Student: book a 1:1 with your mentor.
 *
 * Slots shown here are computed from the mentor's rules, but the database is
 * what decides. Two students can be looking at the same free slot; whoever
 * commits first gets it and the other is told plainly rather than silently
 * double-booked.
 */
export function BookSession() {
  const { currentUser, setRoute, users } = useAppState();
  const me = currentUser;
  const mentorId = me?.mentorId;
  const mentor = useMemo(() => users.find((u) => u.id === mentorId) ?? null, [users, mentorId]);

  const [settings, setSettings] = useState<MentorSettings | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [mentorBookings, setMentorBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  const refresh = useCallback(async () => {
    if (!mentorId || !me) { setLoading(false); return; }
    const [s, r, o, mb, my] = await Promise.all([
      loadSettings(mentorId), loadRules(mentorId), loadOverrides(mentorId),
      loadBookings({ mentorId, fromNow: true }),
      loadBookings({ studentId: me.id }),
    ]);
    setSettings(s); setRules(r); setOverrides(o);
    setMentorBookings(mb); setMyBookings(my);
    setLoading(false);
  }, [mentorId, me]);

  useEffect(() => { void refresh(); }, [refresh]);

  const days: DaySlots[] = useMemo(() => {
    if (!settings) return [];
    return buildSlots({ settings, rules, overrides, bookings: mentorBookings });
  }, [settings, rules, overrides, mentorBookings]);

  const used = settings ? quotaUsed(myBookings.filter((b) => b.mentor_id === mentorId), settings) : 0;
  const remaining = settings ? Math.max(0, settings.quota_count - used) : 0;
  const upcoming = myBookings.filter((b) => b.status === "booked" && new Date(b.starts_at) > new Date());

  async function take(startsAt: Date, endsAt: Date) {
    setBusy(startsAt.toISOString()); setError(null);
    const res = await book({ startsAt, endsAt, topic });
    setBusy(null);
    if (res.error) { setError(res.error); await refresh(); return; }
    setTopic("");
    await refresh();
  }

  if (loading) {
    return (
      <Shell onBack={() => setRoute("dashboard")}>
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your mentor's calendar…
        </div>
      </Shell>
    );
  }

  if (!mentorId) {
    return (
      <Shell onBack={() => setRoute("dashboard")}>
        <Empty
          title="No mentor assigned yet"
          body="Sessions are booked with your own mentor. Ask an admin to assign one and this page will fill in."
        />
      </Shell>
    );
  }

  if (!settings) {
    return (
      <Shell onBack={() => setRoute("dashboard")}>
        <Empty
          title={`${mentor?.name ?? "Your mentor"} has not opened bookings yet`}
          body="They need to set their availability first. Nothing for you to do — it will appear here once they do."
        />
      </Shell>
    );
  }

  return (
    <Shell onBack={() => setRoute("dashboard")}>
      <div className="mb-5">
        <div className="text-sm font-semibold text-indigo-600">1:1 session</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Book time with {mentor?.name ?? "your mentor"}
        </h1>
        <p className="text-slate-600 mt-1">
          {settings.slot_minutes}-minute sessions.{" "}
          {settings.quota_count === 0
            ? "Your mentor has paused bookings for now."
            : <>You have <strong>{remaining}</strong> of {settings.quota_count} left for
               this {settings.quota_period_days}-day period.</>}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
      )}

      {/* ------------------------------------------------------ my bookings */}
      {upcoming.length > 0 && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 mb-5">
          <h2 className="font-semibold text-slate-900 mb-3">Your upcoming sessions</h2>
          <div className="space-y-2">
            {upcoming.map((b) => {
              const startsAt = new Date(b.starts_at);
              const hoursAway = (startsAt.getTime() - Date.now()) / 3600_000;
              const canCancel = hoursAway >= settings.cancel_cutoff_hours;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CalendarCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-emerald-900">
                      {startsAt.toLocaleString(undefined, {
                        weekday: "long", day: "numeric", month: "short",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                    {b.topic && <div className="text-sm text-emerald-800/80">{b.topic}</div>}
                  </div>
                  {canCancel ? (
                    <Button
                      variant="outline" size="sm"
                      onClick={async () => {
                        const res = await cancelBooking(b.id, me!.id);
                        if (res.error) setError(res.error); else await refresh();
                      }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-800/70 shrink-0">
                      too close to cancel — message your mentor
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ picker */}
      {settings.quota_count === 0 ? (
        <Empty title="Bookings are paused" body="Your mentor is not taking sessions at the moment." />
      ) : remaining === 0 ? (
        <Empty
          title="You have used all your sessions for this period"
          body={`Your mentor allows ${settings.quota_count} session(s) every ${settings.quota_period_days} days. Cancelling an upcoming one frees it up again.`}
        />
      ) : days.length === 0 ? (
        <Empty
          title="No free slots in the next few weeks"
          body="Your mentor has not opened any hours yet, or everything is taken. Worth checking back."
        />
      ) : (
        <>
          <div className="mb-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              placeholder="What do you want to cover? (optional, helps your mentor prepare)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm"
            />
          </div>

          <div className="space-y-2">
            {days.map((d) => {
              const free = d.slots.filter((s) => !s.taken).length;
              const isOpen = openDay === d.key;
              return (
                <div key={d.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenDay(isOpen ? null : d.key)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {d.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {free > 0 ? `${free} slot${free === 1 ? "" : "s"} free` : "fully booked"}
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {d.slots.map((s) => {
                        const key = s.startsAt.toISOString();
                        return (
                          <button
                            key={key}
                            disabled={s.taken || busy === key}
                            onClick={() => take(s.startsAt, s.endsAt)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
                              s.taken
                                ? "border-slate-200 bg-slate-50 text-slate-400 line-through cursor-not-allowed"
                                : "border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50"
                            }`}
                          >
                            {busy === key
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : minToLabel(s.startsAt.getHours() * 60 + s.startsAt.getMinutes())}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>
      {children}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">🗓️</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 max-w-md mx-auto">{body}</p>
    </div>
  );
}
