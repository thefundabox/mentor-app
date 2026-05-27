import { useAppState } from "@/hooks/useAppState";
import { findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { Check, Lock, Trophy, Flame, Star, Circle } from "lucide-react";

export function StudentHome() {
  const { currentUser, getStudent, setRoute, setActiveDay, setActiveTopicId, levelInfo, topicCleared, dayCleared, completedDays } = useAppState();
  if (!currentUser) return null;

  const s = getStudent(currentUser.id);
  const chart = s.chart.days;
  const progress = s.progress;
  if (!chart || chart.filter((d) => d.length > 0).length === 0) return null;

  const totalDays = chart.length;
  const completed = completedDays(currentUser.id);
  const currentDay = progress.currentDay || 1;
  const info = levelInfo(currentUser.id);

  // Streak: consecutive cleared days starting from day 1.
  const streak = (() => {
    let n = 0;
    for (let i = 1; i <= totalDays; i++) {
      if (completed.includes(i)) n++; else break;
    }
    return n;
  })();

  const pickTopic = (day: number, topicId: string) => {
    setActiveDay(day);
    setActiveTopicId(topicId);
    setRoute("topic");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm font-semibold text-indigo-600">
            Welcome back, {currentUser.name.split(" ")[0]}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Day {currentDay} of {totalDays}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => setRoute("onboarding")}>Edit chart</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatTile label="Level" value={info.level} accent="indigo" icon={<Trophy className="w-4 h-4" />}
          sub={`${info.xpInLevel} / ${info.xpInLevel + info.xpToNextLevel} XP`}
          progress={info.xpInLevel / (info.xpInLevel + info.xpToNextLevel)} />
        <StatTile label="Points" value={info.total.toLocaleString()} accent="amber" icon={<Star className="w-4 h-4" />}
          sub={`${completed.length} days cleared`} />
        <StatTile label="Streak" value={streak} accent="rose" icon={<Flame className="w-4 h-4" />}
          sub={streak >= 3 ? "🔥 keep it up" : "complete day 1 to start"} />
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[3px]"
          style={{ background: "repeating-linear-gradient(to bottom, #e2e8f0 0 6px, transparent 6px 12px)" }} />

        <div className="space-y-6 relative">
          {chart.map((topics, i) => {
            const dayNum = i + 1;
            const isDone = completed.includes(dayNum) || dayCleared(currentUser.id, dayNum);
            const isCurrent = dayNum === currentDay && !isDone;
            const isLocked = dayNum > currentDay;
            const sideRight = i % 2 === 0;
            const hasMulti = topics.length > 1;

            return (
              <div key={i} className={`flex items-center ${sideRight ? "justify-start" : "justify-end"}`}>
                <div className={`flex items-start gap-4 max-w-[80%] p-4 rounded-2xl border-2 transition ${
                  isDone ? "bg-emerald-50 border-emerald-200"
                  : isCurrent ? "bg-white border-indigo-300 pulse-ring"
                  : "bg-white border-slate-200 opacity-60"
                }`}>
                  <div className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                    isDone ? "bg-emerald-500 text-white"
                    : isCurrent ? "bg-indigo-600 text-white"
                    : "bg-slate-200 text-slate-400"
                  }`}>
                    {isDone ? <Check className="w-6 h-6" /> : isLocked ? <Lock className="w-5 h-5" /> : dayNum}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      Day {dayNum}{hasMulti ? ` · ${topics.length} topics` : ""}
                    </div>
                    {topics.length === 0 ? (
                      <div className="text-sm text-slate-400 italic">Unscheduled</div>
                    ) : (
                      <div className="space-y-1.5">
                        {topics.map((t) => {
                          const info = findTopic(t.topicId);
                          if (!info) return null;
                          const cleared = topicCleared(currentUser.id, dayNum, t.topicId);
                          return (
                            <button
                              key={t.topicId}
                              disabled={isLocked}
                              onClick={() => pickTopic(dayNum, t.topicId)}
                              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                                isLocked ? "cursor-not-allowed"
                                : "hover:bg-slate-50 cursor-pointer"
                              } ${cleared ? "bg-emerald-50/60" : "bg-white border border-slate-100"}`}
                            >
                              {cleared
                                ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              }
                              <span className="text-base flex-shrink-0">{info.subject.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] text-slate-500 truncate">{info.subject.name}</div>
                                <div className="font-semibold text-slate-900 text-sm truncate">{info.topic.name}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent, icon, sub, progress }: {
  label: string; value: string | number; accent: "indigo" | "amber" | "rose";
  icon: React.ReactNode; sub: string; progress?: number;
}) {
  const map = {
    indigo: { bg: "from-indigo-50 to-indigo-100/40", text: "text-indigo-700", bar: "bg-indigo-500" },
    amber:  { bg: "from-amber-50 to-amber-100/40",   text: "text-amber-700",  bar: "bg-amber-500"  },
    rose:   { bg: "from-rose-50 to-rose-100/40",     text: "text-rose-700",   bar: "bg-rose-500"   },
  }[accent];
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map.bg} p-4`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${map.text}`}>
        {icon}{label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full ${map.bar}`} style={{ width: `${Math.max(2, progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
