import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Gauge, AlertTriangle } from "lucide-react";
import {
  ASSESSMENT_TIME,
  ROADBLOCK_OPTIONS,
  SELF_RATED_LEVELS,
  PLACEMENT_MCQS,
} from "@/data";
import type { Assessment as AssessmentT, SelfRatedLevel } from "@/types";

interface AssessmentProps {
  studentId: string;
}

export function Assessment({ studentId }: AssessmentProps) {
  const { setAssessment, setRoute } = useAppState();

  const [timeMins, setTimeMins] = useState<number>(ASSESSMENT_TIME.defaultMins);
  const [level, setLevel] = useState<SelfRatedLevel>("intermediate");
  const [roadblockId, setRoadblockId] = useState<string>(ROADBLOCK_OPTIONS[0]?.id ?? "");
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});

  const allMcqsAnswered = useMemo(
    () => PLACEMENT_MCQS.every((_q, idx) => mcqAnswers[String(idx)] !== undefined),
    [mcqAnswers]
  );
  const canSubmit = !!roadblockId && allMcqsAnswered;

  const submit = () => {
    const correctCount = PLACEMENT_MCQS.reduce(
      (n, q, idx) => n + (mcqAnswers[String(idx)] === q.correct ? 1 : 0),
      0
    );
    const placementScore = PLACEMENT_MCQS.length
      ? Math.round((correctCount / PLACEMENT_MCQS.length) * 100)
      : null;

    const a: AssessmentT = {
      timeCommitMins: timeMins,
      selfRatedLevel: level,
      roadblockId,
      mcqAnswers,
      placementScore,
      submittedAt: Date.now(),
    };
    setAssessment(studentId, a);
    setRoute("choose_plan");
  };

  const hrs = Math.floor(timeMins / 60);
  const mins = timeMins % 60;
  const timeLabel = hrs > 0 ? `${hrs}h${mins ? ` ${mins}m` : ""}` : `${mins}m`;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600 mb-1">Welcome — quick assessment</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tell us where you're starting from</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Three questions plus a short placement check. Your mentor uses this to build a plan that actually fits you.
        </p>
      </div>

      <div className="space-y-5">
        {/* 1. Time commitment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-indigo-600" />
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">1 · How much time per day?</div>
          </div>
          <div className="flex items-baseline justify-between mb-3 mt-2">
            <div className="text-3xl font-bold text-slate-900">{timeLabel}</div>
            <div className="text-xs text-slate-500">capped at 8h</div>
          </div>
          <input
            type="range"
            min={ASSESSMENT_TIME.minMins}
            max={ASSESSMENT_TIME.maxMins}
            step={ASSESSMENT_TIME.stepMins}
            value={timeMins}
            onChange={(e) => setTimeMins(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{ASSESSMENT_TIME.minMins}m</span>
            <span>{ASSESSMENT_TIME.maxMins}m</span>
          </div>
        </div>

        {/* 2. Self-rated level */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-indigo-600" />
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">2 · Where would you place yourself?</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SELF_RATED_LEVELS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setLevel(o.id)}
                className={`text-left p-3 rounded-xl border-2 transition ${
                  level === o.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-900">{o.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.helper}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Roadblock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">3 · What's your biggest roadblock?</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROADBLOCK_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setRoadblockId(o.id)}
                className={`text-left p-3 rounded-xl border-2 transition ${
                  roadblockId === o.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-900">{o.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.helper}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Placement check */}
        {PLACEMENT_MCQS.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-3">
              Placement check · {PLACEMENT_MCQS.length} question{PLACEMENT_MCQS.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-5">
              {PLACEMENT_MCQS.map((q, idx) => {
                const key = String(idx);
                const picked = mcqAnswers[key];
                return (
                  <div key={idx}>
                    <div className="text-sm font-semibold text-slate-900 mb-2">{idx + 1}. {q.q}</div>
                    <div className="space-y-1.5">
                      {q.options.map((opt, k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setMcqAnswers((prev) => ({ ...prev, [key]: k }))}
                          className={`w-full text-left text-sm p-2.5 rounded-lg border transition ${
                            picked === k
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span className="inline-block w-5 text-slate-500 font-semibold">
                            {String.fromCharCode(65 + k)}.
                          </span>{" "}
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={submit} disabled={!canSubmit}>
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
