import { useAppState } from "@/hooks/useAppState";
import { findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";

export function StudentHome() {
  const { chart, progress, setRoute, setActiveDay } = useAppState();

  if (!chart || chart.filter(Boolean).length === 0) return null;

  const days = chart.length;
  const completed = progress.completed || [];
  const currentDay = progress.currentDay || 1;

  const handlePickDay = (dayNum: number) => {
    setActiveDay(dayNum);
    setRoute("topic");
  };

  const handleEditChart = () => {
    setRoute("onboarding");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm font-semibold text-indigo-600">
            Your prep journey
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Day {currentDay} of {days}
          </h1>
        </div>
        <Button variant="secondary" onClick={handleEditChart}>
          Edit chart
        </Button>
      </div>

      <div className="relative">
        {/* Center dotted line */}
        <div
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[3px]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, #e2e8f0 0 6px, transparent 6px 12px)",
          }}
        />

        <div className="space-y-6 relative">
          {chart.map((slot, i) => {
            const dayNum = i + 1;
            const isDone = completed.includes(dayNum);
            const isCurrent = dayNum === currentDay && !isDone;
            const isLocked = dayNum > currentDay;
            const info = slot ? findTopic(slot.topicId) : null;
            const sideRight = i % 2 === 0;

            return (
              <div
                key={i}
                className={`flex items-center ${
                  sideRight ? "justify-start" : "justify-end"
                }`}
              >
                <button
                  disabled={isLocked || !info}
                  onClick={() => handlePickDay(dayNum)}
                  className={`flex items-center gap-4 max-w-[80%] text-left p-4 rounded-2xl border-2 transition ${
                    isDone
                      ? "bg-emerald-50 border-emerald-200"
                      : isCurrent
                      ? "bg-white border-indigo-300 pulse-ring"
                      : "bg-white border-slate-200 opacity-60"
                  } ${
                    !isLocked && info
                      ? "hover:shadow-md cursor-pointer"
                      : "cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-6 h-6" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      dayNum
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Day {dayNum} · {info ? info.subject.name : "Unscheduled"}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {info ? info.topic.name : "—"}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
