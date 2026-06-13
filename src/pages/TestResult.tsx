import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, ListChecks } from "lucide-react";

export function TestResult() {
  const { activeTestId, activeAttemptId, tests, testAttempts, setRoute, setActiveTestId, setActiveAttemptId } = useAppState();
  const test = tests.find((t) => t.id === activeTestId);
  const attempt = testAttempts.find((a) => a.id === activeAttemptId);

  if (!test || !attempt || attempt.score === undefined) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="text-sm text-slate-500">No completed attempt to show.</div>
        <Button className="mt-4" onClick={() => setRoute("tests")}>Back to tests</Button>
      </div>
    );
  }

  const pct = attempt.maxScore && attempt.maxScore > 0
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : 0;
  const tone = pct >= 70 ? "emerald" : pct >= 40 ? "amber" : "rose";
  const toneMap = {
    emerald: { ring: "bg-emerald-100 text-emerald-600", num: "text-emerald-600" },
    amber:   { ring: "bg-amber-100 text-amber-600",     num: "text-amber-600" },
    rose:    { ring: "bg-rose-100 text-rose-600",       num: "text-rose-600" },
  }[tone];

  const back = () => {
    setActiveTestId(null);
    setActiveAttemptId(null);
    setRoute("tests");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <button onClick={back} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> back to tests
      </button>

      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${toneMap.ring}`}>
          <Trophy className="w-12 h-12" />
        </div>
        <div className="text-xs uppercase font-bold text-slate-500 tracking-wide">{test.title}</div>
        <div className={`text-5xl font-bold mt-2 ${toneMap.num}`}>{attempt.score.toFixed(2)}</div>
        <div className="text-sm text-slate-500 mt-1">out of {attempt.maxScore} marks · {pct}%</div>
      </div>

      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Section breakdown</h2>
        </div>
        <div className="space-y-2">
          {test.sections.map((sec) => {
            const stats = attempt.sectionScores?.[sec.id];
            if (!stats) return null;
            const sectionMax = sec.questionCount * sec.marksPerQuestion;
            const sectionPct = sectionMax > 0 ? Math.round((stats.marks / sectionMax) * 100) : 0;
            const barTone =
              sectionPct >= 70 ? "bg-emerald-500"
              : sectionPct >= 40 ? "bg-amber-500"
              : "bg-rose-500";
            return (
              <div key={sec.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="font-semibold text-slate-900">{sec.name}</div>
                  <div className="text-xs font-bold text-slate-700 tabular-nums">{stats.marks.toFixed(2)} / {sectionMax}</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barTone}`} style={{ width: `${Math.max(2, sectionPct)}%` }}></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ✓ {stats.right} · ✗ {stats.wrong} · — {stats.unattempted} unattempted
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={back}>Back to tests</Button>
      </div>
    </div>
  );
}
