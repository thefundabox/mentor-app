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
export function ExamCountdown({ variant = "hero", tone = "classic", className = "" }: {
  variant?: "hero" | "bar";
  /** `studio` matches the warm-paper homepage; `classic` the white one. */
  tone?: "classic" | "studio";
  className?: string;
}) {
  const t0 = tone === "studio"
    ? { cell: "border-[#dcd9cf] bg-[#fffdf7]", num: "text-[#17252b]", lab: "text-[#8a9599]",
        eyebrow: "text-[#164ed3]", dot: "bg-[#b6ec51]", foot: "text-[#667378]" }
    : { cell: "border-slate-200 bg-white", num: "text-slate-900", lab: "text-slate-400",
        eyebrow: "text-slate-500", dot: "bg-emerald-500", foot: "text-slate-500" };
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
      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ${t0.eyebrow} mb-2.5`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className={`absolute inline-flex h-full w-full rounded-full ${t0.dot} opacity-70 motion-safe:animate-ping`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${t0.dot}`} />
        </span>
        {t.today ? "The paper is today" : "RAS Prelims countdown"}
      </div>

      <div className="flex gap-2 sm:gap-2.5">
        <Cell n={t.days} label={t.days === 1 ? "day" : "days"} wide t0={t0} />
        <Cell n={t.hours} label="hrs" t0={t0} />
        <Cell n={t.minutes} label="min" t0={t0} />
        <Cell n={t.seconds} label="sec" t0={t0} />
      </div>

      <div className={`text-xs ${t0.foot} mt-2.5`}>
        {EXAM_LABEL} · {EXAM_TIME_LABEL}
      </div>
    </div>
  );
}

function Cell({ n, label, wide, t0 }: {
  n: number; label: string; wide?: boolean;
  t0: { cell: string; num: string; lab: string };
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2 text-center ${t0.cell} ${wide ? "min-w-[76px]" : "min-w-[62px]"}`}>
      <div className={`text-2xl sm:text-[1.75rem] font-extrabold ${t0.num} tabular-nums leading-none tracking-[-.03em]`}>
        {wide ? n : pad(n)}
      </div>
      <div className={`text-[10px] uppercase tracking-wider ${t0.lab} mt-1.5`}>{label}</div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
