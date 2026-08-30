import { useEffect, useState } from "react";
import { EXAM_LABEL, EXAM_TIME_LABEL, timeToExam } from "@/data/exam";

/**
 * How long is left until the paper.
 *
 * Ticks once a second. Nothing here animates: a countdown to an exam is not a
 * place for motion for its own sake, and digits that slide are harder to read
 * than digits that change. Tabular figures so the row does not jitter as the
 * numbers shrink.
 *
 * Two shapes. `hero` is the four-block display for the homepage; `bar` is one
 * line for screens where it is context rather than the point.
 */
export function ExamCountdown({ variant = "hero", className = "" }: {
  variant?: "hero" | "bar";
  className?: string;
}) {
  const [t, setT] = useState(() => timeToExam());

  useEffect(() => {
    const id = setInterval(() => setT(timeToExam()), 1000);
    return () => clearInterval(id);
  }, []);

  if (t.past) {
    return (
      <div className={`text-sm font-medium text-slate-600 ${className}`}>
        The paper was on {EXAM_LABEL}. Best of luck with the result.
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className={`inline-flex items-baseline gap-1.5 text-sm ${className}`}>
        <span className="font-bold text-slate-900 tabular-nums">{t.days}</span>
        <span className="text-slate-500">days</span>
        <span className="font-bold text-slate-900 tabular-nums">{pad(t.hours)}</span>
        <span className="text-slate-500">h</span>
        <span className="font-bold text-slate-900 tabular-nums">{pad(t.minutes)}</span>
        <span className="text-slate-500">m</span>
        <span className="font-bold text-slate-900 tabular-nums">{pad(t.seconds)}</span>
        <span className="text-slate-500">s</span>
        <span className="text-slate-400 ml-1">to the paper</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        {t.today ? "The paper is today" : "RAS Prelims countdown"}
      </div>

      <div className="flex gap-2 sm:gap-2.5">
        <Cell n={t.days} label={t.days === 1 ? "day" : "days"} wide />
        <Cell n={t.hours} label="hrs" />
        <Cell n={t.minutes} label="min" />
        <Cell n={t.seconds} label="sec" />
      </div>

      <div className="text-xs text-slate-500 mt-2.5">
        {EXAM_LABEL} · {EXAM_TIME_LABEL}
      </div>
    </div>
  );
}

function Cell({ n, label, wide }: { n: number; label: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-center ${wide ? "min-w-[72px]" : "min-w-[60px]"}`}>
      <div className="text-2xl sm:text-[1.75rem] font-bold text-slate-900 tabular-nums leading-none tracking-tight">
        {wide ? n : pad(n)}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1.5">{label}</div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
