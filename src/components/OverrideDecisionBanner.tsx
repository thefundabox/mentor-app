import { useAppState } from "@/hooks/useAppState";
import { Check, X, ShieldCheck } from "lucide-react";

/**
 * Shows the student a banner for any mentor decision on their override
 * requests they haven't seen yet. Covers three cases:
 *  - approved (student-requested override)
 *  - declined (student-requested override)
 *  - mercy pass (mentor-initiated override, no prior request)
 *
 * One banner per undecided override. Dismiss marks seenByStudent=true.
 */
export function OverrideDecisionBanner({ studentId }: { studentId: string }) {
  const { getStudent, markOverrideSeen } = useAppState();
  const s = getStudent(studentId);
  const pending = s.overrides
    .filter((o) => o.status !== "pending" && !o.seenByStudent)
    .sort((a, b) => (a.decidedAt || 0) - (b.decidedAt || 0));

  if (pending.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {pending.map((o) => {
        const wasRequested = o.attempts > 0 || o.bestScore > 0;
        const approved = o.status === "approved";
        const isMercy = approved && !wasRequested;

        const tone = approved
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-rose-50 border-rose-200 text-rose-900";
        const titleTone = approved ? "text-emerald-700" : "text-rose-700";
        const Icon = approved ? (isMercy ? ShieldCheck : Check) : X;

        const title = isMercy
          ? `Mercy pass granted for Day ${o.day}`
          : approved
            ? `Override approved for Day ${o.day}`
            : `Override declined for Day ${o.day}`;

        const sub = isMercy
          ? "Your mentor unlocked the next day for you — you can advance without re-attempting."
          : approved
            ? "You can now proceed without scoring 80% on this day's quiz."
            : "Your mentor wants you to keep trying. Try the quiz again with a fresh question set.";

        const ago = o.decidedAt ? timeAgo(o.decidedAt) : "";

        return (
          <div key={o.id} className={`border rounded-2xl p-4 flex gap-3 items-start ${tone}`}>
            <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${titleTone}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold uppercase tracking-wide ${titleTone}`}>{title}</div>
              <div className="text-sm mt-0.5">{sub}</div>
              {o.mentorNote && (
                <div className="text-xs mt-2 italic opacity-80">"{o.mentorNote}"</div>
              )}
              {ago && <div className="text-[10px] uppercase font-medium opacity-60 mt-1">{ago}</div>}
            </div>
            <button onClick={() => markOverrideSeen(studentId, o.id)}
              className="text-xs font-medium opacity-70 hover:opacity-100 px-2 py-1">
              Got it
            </button>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
