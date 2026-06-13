import { Flame, Calendar, Target } from "lucide-react";
import type { StudentData } from "@/types";
import { dailyActivityStreak, quizAttemptStreak, clearedStreak, activityHistory } from "@/lib/streaks";

interface HabitsCardProps {
  student: StudentData;
  completedDays: number[];
}

export function HabitsCard({ student, completedDays }: HabitsCardProps) {
  const studyStreak = clearedStreak(completedDays);
  const activeStreak = dailyActivityStreak(student);
  const quizStreak = quizAttemptStreak(student);
  const history = activityHistory(student, 14);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8" data-tour="habits">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Daily habits</div>
          <div className="text-sm text-slate-600">Auto-tracked. No checkboxes — just show up.</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StreakChip icon={<Flame className="w-3.5 h-3.5" />} accent="rose"    label="Active" count={activeStreak} />
          <StreakChip icon={<Target className="w-3.5 h-3.5" />} accent="indigo" label="Quizzed" count={quizStreak} />
          <StreakChip icon={<Calendar className="w-3.5 h-3.5" />} accent="emerald" label="Studied" count={studyStreak} />
        </div>
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

function StreakChip({ icon, accent, label, count }: {
  icon: React.ReactNode;
  accent: "rose" | "indigo" | "emerald";
  label: string;
  count: number;
}) {
  const map = {
    rose:    "bg-rose-50 text-rose-700 border-rose-200",
    indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[accent];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${map}`}>
      {icon}
      <span>{label}</span>
      <span className="font-bold">{count}</span>
      <span className="text-[10px] opacity-70">d</span>
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
