import { useEffect, useState } from "react";
import { Lock, Infinity as InfinityIcon } from "lucide-react";
import { loadQuestionMeter, type QuestionMeter } from "@/lib/entitlement";

/**
 * How much of today's question allowance is left.
 *
 * Shown to free accounts only. On the paid plan there is nothing to count, and
 * a meter reading "unlimited" is just furniture -- it takes up the same room as
 * a real number while telling the reader nothing they can act on.
 *
 * The figure comes from questions_used_today(), which counts the same ledger
 * the server meters against. Nothing is derived here, so the bar cannot drift
 * out of step with what will actually happen on the next unlock.
 */
export function QuotaMeter({ className = "", onUpgrade }: {
  className?: string;
  onUpgrade?: () => void;
}) {
  const [m, setM] = useState<QuestionMeter | null>(null);

  useEffect(() => {
    let alive = true;
    void loadQuestionMeter().then((r) => { if (alive) setM(r); });
    // Re-read when the tab comes back: the allowance rolls over at IST
    // midnight, and someone who left the app open overnight should not be shown
    // yesterday's exhausted bar.
    const onVis = () => {
      if (document.visibilityState === "visible") void loadQuestionMeter().then((r) => { if (alive) setM(r); });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Signed out, offline, or unmetered: render nothing at all.
  if (!m || m.cap === null) return null;

  const left = Math.max(0, m.cap - m.used);
  const pct = m.cap > 0 ? Math.min(100, (m.used / m.cap) * 100) : 0;
  const spent = left === 0;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${spent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"} ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Today's questions
        </span>
        <span className="text-xs font-bold tabular-nums text-slate-900">
          {m.used} / {m.cap}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${spent ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        {spent ? (
          <>
            <Lock className="mr-1 inline h-3 w-3 -translate-y-px" />
            That is today's {m.cap}. Everything you have already opened stays
            open &mdash; revisiting it is always free. New questions unlock again
            after midnight.
          </>
        ) : (
          <>
            {left} new question{left === 1 ? "" : "s"} left today. Anything you
            have already opened does not count again.
          </>
        )}
      </p>

      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
        >
          <InfinityIcon className="h-3.5 w-3.5" />
          Go unlimited
        </button>
      )}
    </div>
  );
}
