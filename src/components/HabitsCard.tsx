import { Flame, Calendar, Target } from "lucide-react";
import type { StudentData } from "@/types";
import { dailyActivityStreak, quizAttemptStreak, clearedStreak, activityHistory } from "@/lib/streaks";

interface HabitsCardProps {
  student: StudentData;
  completedDays: number[];
  /**
   * Optional right-side slot rendered alongside the habits on lg+ screens.
   * Used by StudentHome to inline the "Active commitment" badge next to the
   * habits strip without forcing a separate row.
   */
  rightSlot?: React.ReactNode;
  /** Removes the bottom margin so the card can sit inside a parent that owns spacing. */
  flush?: boolean;
}

export function HabitsCard({ student, completedDays, rightSlot, flush }: HabitsCardProps) {
  const studyStreak = clearedStreak(completedDays);
  const activeStreak = dailyActivityStreak(student);
  const quizStreak = quizAttemptStreak(student);
  const history = activityHistory(student, 14);

  // Today-highlight signals: which of the three habits did the student actually
  // log in the last calendar day. We pull these off the same activity history
  // the strip uses so the highlights and the dots can't disagree.
  const today = history[history.length - 1];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const activeToday  = !!today?.active;
  const quizzedToday = (today?.attempts ?? 0) > 0;
  // "Studied today" = at least one attempt today that crossed the day-pass
  // threshold (matches the topic-clearing rule used everywhere else).
  const studiedToday = student.attempts.some((a) => a.when >= t0 && a.score >= 80);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${flush ? "" : "mb-8"}`} data-tour="habits">
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Daily habits</div>
          <div className="text-sm text-slate-600">Auto-tracked. No checkboxes — just show up.</div>
          <div className="flex gap-2 flex-wrap mt-3">
            <StreakChip icon={<Flame className="w-3.5 h-3.5" />}    accent="rose"    label="Active"  count={activeStreak} activeToday={activeToday}  />
            <StreakChip icon={<Target className="w-3.5 h-3.5" />}   accent="indigo"  label="Quizzed" count={quizStreak}   activeToday={quizzedToday} />
            <StreakChip icon={<Calendar className="w-3.5 h-3.5" />} accent="emerald" label="Studied" count={studyStreak}  activeToday={studiedToday} />
          </div>
        </div>
        {rightSlot && (
          <div className="flex-shrink-0 lg:max-w-xs">{rightSlot}</div>
        )}
      </div>

      <div className="flex gap-1 items-end" aria-label="Last 14 days activity">
        {history.map((d) => (
          <ActivityDot key={d.date} active={d.active} attempts={d.attempts} date={d.date} />
        ))}
      </div>
      <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
        <span>14 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

function StreakChip({ icon, accent, label, count, activeToday }: {
  icon: React.ReactNode;
  accent: "rose" | "indigo" | "emerald";
  label: string;
  count: number;
  /** True if the student logged this habit today. Adds a ring + "today" pip. */
  activeToday?: boolean;
}) {
  const map = {
    rose:    { base: "bg-rose-50 text-rose-700 border-rose-200",       ring: "ring-rose-400"    },
    indigo:  { base: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-400"  },
    emerald: { base: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "ring-emerald-400" },
  }[accent];
  const highlight = activeToday ? `ring-2 ring-offset-1 ${map.ring}` : "";
  return (
    <div className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${map.base} ${highlight}`}>
      {icon}
      <span>{label}</span>
      <span className="font-bold">{count}</span>
      <span className="text-[10px] opacity-70">d</span>
      {activeToday && (
        <span className="ml-1 inline-flex items-center text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/70">
          today
        </span>
      )}
    </div>
  );
}

function ActivityDot({ active, attempts, date }: { active: boolean; attempts: number; date: number }) {
  const tone =
    !active ? "bg-slate-100"
    : attempts >= 2 ? "bg-emerald-500"
    : attempts === 1 ? "bg-emerald-300"
    : "bg-indigo-200";
  const dateLabel = new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const title = active
    ? `${dateLabel} · ${attempts > 0 ? `${attempts} quiz attempt${attempts === 1 ? "" : "s"}` : "logged in"}`
    : `${dateLabel} · no activity`;
  return (
    <div
      title={title}
      className={`flex-1 h-7 rounded ${tone} transition`}
    />
  );
}
