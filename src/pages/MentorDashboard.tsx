import { useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function MentorDashboard() {
  const {
    chart,
    progress,
    overrides,
    setOverrides,
    mainsScores,
    attempts,
    setRoute,
  } = useAppState();

  const filledDays = chart.filter(Boolean).length;
  const completed = (progress.completed || []).length;
  const avg = attempts.length
    ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length)
    : null;

  const stuckTopics = useMemo(() => {
    const byDay: Record<number, number> = {};
    attempts.forEach((a) => {
      byDay[a.day] = (byDay[a.day] || 0) + 1;
    });
    return Object.entries(byDay)
      .filter(([, c]) => c >= 2)
      .map(([d]) => Number(d));
  }, [attempts]);

  function approve(id: number) {
    setOverrides(
      overrides.map((o) => (o.id === id ? { ...o, status: "approved" as const } : o))
    );
  }

  function decline(id: number) {
    setOverrides(
      overrides.map((o) => (o.id === id ? { ...o, status: "declined" as const } : o))
    );
  }

  const pending = overrides.filter((o) => o.status === "pending");
  const history = overrides.filter((o) => o.status !== "pending");

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">Mentor view</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Aamir Parwez · RAS prep
        </h1>
        <p className="text-slate-600 mt-1">
          Track progress, approve overrides, and adjust the prep chart.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Days planned" value={filledDays} />
        <Stat label="Days completed" value={completed} />
        <Stat label="Current day" value={progress.currentDay || 1} />
        <Stat label="Avg quiz score" value={avg === null ? "—" : `${avg}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Prep Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Prep chart</h2>
            <Button variant="secondary" onClick={() => setRoute("onboarding")}>
              Edit chart
            </Button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {chart.map((slot, i) => {
              const day = i + 1;
              const info = slot ? findTopic(slot.topicId) : null;
              const isDone = (progress.completed || []).includes(day);
              const attemptsThisDay = attempts.filter((a) => a.day === day);
              const isStuck = stuckTopics.includes(day);

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50/40"
                      : isStuck
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="w-10 text-center text-xs font-semibold text-slate-500 flex-shrink-0">
                    D{day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {info ? (
                        info.topic.name
                      ) : (
                        <span className="italic text-slate-400">unscheduled</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {info ? info.subject.name : "—"}
                    </div>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    {attemptsThisDay.length > 0 && (
                      <div className="font-medium text-slate-700">
                        {attemptsThisDay.length} attempt
                        {attemptsThisDay.length > 1 ? "s" : ""}
                      </div>
                    )}
                    {attemptsThisDay.length > 0 && (
                      <div className="text-slate-500">
                        best {Math.max(...attemptsThisDay.map((a) => a.score))}%
                      </div>
                    )}
                    {isStuck && (
                      <div className="text-amber-700 font-semibold mt-1">
                        ⚠ stuck
                      </div>
                    )}
                    {isDone && (
                      <div className="text-emerald-700 font-semibold mt-1">
                        ✓ cleared
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Override Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6">
            <h2 className="font-semibold text-slate-900 mb-3">
              Override requests
            </h2>
            {pending.length === 0 ? (
              <div className="text-sm text-slate-500">No pending requests.</div>
            ) : (
              <div className="space-y-3">
                {pending.map((o) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200"
                  >
                    <div className="text-sm font-semibold text-amber-900">
                      Day {o.day} · override
                    </div>
                    <div className="text-xs text-amber-800/80 mt-0.5">
                      Requested after {o.attempts} attempts. Best score:{" "}
                      {o.bestScore}%.
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approve(o.id)}
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => decline(o.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
                  History
                </div>
                <div className="space-y-1.5">
                  {history.map((o) => (
                    <div
                      key={o.id}
                      className="text-xs text-slate-600 flex justify-between"
                    >
                      <span>Day {o.day} override</span>
                      <span
                        className={
                          o.status === "approved"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Quiz Attempts */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6">
            <h2 className="font-semibold text-slate-900 mb-3">
              Recent quiz attempts
            </h2>
            {attempts.length === 0 ? (
              <div className="text-sm text-slate-500">No attempts yet.</div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {[...attempts].reverse().map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-700">Day {a.day}</span>
                    <span
                      className={
                        a.score >= 80
                          ? "text-emerald-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }
                    >
                      {a.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {mainsScores.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
                  Mains coverage
                </div>
                <div className="space-y-1.5">
                  {mainsScores.map((m, i) => (
                    <div key={i} className="text-xs flex justify-between">
                      <span className="text-slate-600">Day {m.day}</span>
                      <span className="font-semibold text-indigo-700">
                        {m.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4">
      <div className="text-xs uppercase font-semibold text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
