import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag, X } from "lucide-react";
import { buildTestSequence, scoreAttempt } from "@/lib/testBuilder";

export function TakeTest() {
  const { activeTestId, activeAttemptId, tests, quizPool, testAttempts, saveTestAnswers, finishTestAttempt, setRoute } = useAppState();
  const test = tests.find((t) => t.id === activeTestId);
  const attempt = testAttempts.find((a) => a.id === activeAttemptId);

  const sequence = useMemo(() => {
    if (!test) return [];
    return buildTestSequence(test, quizPool, attempt?.startedAt);
  }, [test, quizPool, attempt?.startedAt]);

  const [answers, setAnswers] = useState<Record<string, number>>(attempt?.answers || {});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    if (!test || !attempt) return 0;
    const total = test.durationMins * 60_000;
    const elapsed = Date.now() - attempt.startedAt;
    return Math.max(0, total - elapsed);
  });

  // Persist answers incrementally so a refresh doesn't lose work.
  useEffect(() => {
    if (!activeAttemptId) return;
    saveTestAnswers(activeAttemptId, answers);
  }, [answers, activeAttemptId, saveTestAnswers]);

  // Timer tick.
  useEffect(() => {
    if (!test || !attempt) return;
    if (timeLeftMs <= 0) return;
    const interval = setInterval(() => {
      const total = test.durationMins * 60_000;
      const elapsed = Date.now() - attempt.startedAt;
      const remaining = Math.max(0, total - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        autoSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, attempt, timeLeftMs > 0]);

  if (!test || !attempt) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="text-sm text-slate-500">No active test. Go back to the test list.</div>
        <Button className="mt-4" onClick={() => setRoute("tests")}>Back to tests</Button>
      </div>
    );
  }

  const sectionGroups = useMemo(() => {
    const groups: { sectionId: string; sectionName: string; start: number; count: number }[] = [];
    let cursor = 0;
    for (const sec of test.sections) {
      groups.push({ sectionId: sec.id, sectionName: sec.name, start: cursor, count: sec.questionCount });
      cursor += sec.questionCount;
    }
    return groups;
  }, [test]);

  const activeSection = sectionGroups[activeSectionIdx];
  const absoluteIdx = activeSection ? activeSection.start + activeIdx : 0;
  const tq = sequence[absoluteIdx];

  const submit = () => {
    if (!confirm("Submit the test? You won't be able to change answers after this.")) return;
    finalize();
  };

  const autoSubmit = () => {
    finalize();
  };

  const finalize = () => {
    const { score, maxScore, sectionScores } = scoreAttempt(sequence, answers);
    finishTestAttempt(attempt.id, { answers, score, maxScore, sectionScores });
    setRoute("test_result");
  };

  const abort = () => {
    if (!confirm("Quit this test? Your answers will be saved as a partial attempt.")) return;
    setRoute("tests");
  };

  const pick = (optionIdx: number) => {
    if (!tq) return;
    setAnswers((prev) => ({ ...prev, [tq.qid]: optionIdx }));
  };

  const clearAnswer = () => {
    if (!tq) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[tq.qid];
      return next;
    });
  };

  const toggleMark = () => {
    if (!tq) return;
    setMarked((prev) => ({ ...prev, [tq.qid]: !prev[tq.qid] }));
  };

  const goToAbsolute = (sectionIdx: number, idx: number) => {
    setActiveSectionIdx(sectionIdx);
    setActiveIdx(idx);
  };

  const next = () => {
    if (!activeSection) return;
    if (activeIdx + 1 < activeSection.count) {
      setActiveIdx(activeIdx + 1);
    } else if (activeSectionIdx + 1 < sectionGroups.length) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setActiveIdx(0);
    }
  };
  const prev = () => {
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
    } else if (activeSectionIdx > 0) {
      const prevSec = sectionGroups[activeSectionIdx - 1];
      setActiveSectionIdx(activeSectionIdx - 1);
      setActiveIdx(prevSec.count - 1);
    }
  };

  const mins = Math.floor(timeLeftMs / 60_000);
  const secs = Math.floor((timeLeftMs % 60_000) / 1000);
  const lowTime = timeLeftMs < 5 * 60_000;

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const total = sequence.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header: timer + section tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <button onClick={abort} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{test.title}</div>
            <div className="text-[11px] text-slate-500">{answeredCount} / {total} answered · {markedCount} marked for review</div>
          </div>
          <div className={`flex items-center gap-1.5 font-bold ${lowTime ? "text-rose-600" : "text-slate-900"}`}>
            <Clock className="w-4 h-4" />
            <span className="tabular-nums">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
          </div>
          <Button onClick={submit}>Submit</Button>
        </div>
        <div className="border-t border-slate-100 px-4 overflow-x-auto">
          <div className="max-w-6xl mx-auto flex gap-1 py-2">
            {sectionGroups.map((g, i) => {
              const sectionAnswered = sequence
                .filter((q) => q.sectionId === g.sectionId)
                .filter((q) => answers[q.qid] !== undefined).length;
              return (
                <button key={g.sectionId}
                  onClick={() => { setActiveSectionIdx(i); setActiveIdx(0); }}
                  className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeSectionIdx === i
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}>
                  {g.sectionName} <span className="text-[10px] opacity-80">({sectionAnswered}/{g.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main: question */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
        <div>
          {tq && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="text-xs uppercase font-bold text-indigo-700 mb-2">
                {activeSection.sectionName} · Q{activeIdx + 1} of {activeSection.count}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-5 leading-snug">{tq.question.q}</h2>
              <div className="space-y-2">
                {tq.question.options.map((opt, k) => {
                  const isPicked = answers[tq.qid] === k;
                  return (
                    <button key={k}
                      onClick={() => pick(k)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${
                        isPicked ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isPicked ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>{String.fromCharCode(65 + k)}</span>
                      <span className="text-slate-800 text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between gap-2 flex-wrap">
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={prev}><ChevronLeft className="w-4 h-4" /> Previous</Button>
                  <Button variant="ghost" onClick={next}>Next <ChevronRight className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={clearAnswer} disabled={answers[tq.qid] === undefined}>Clear</Button>
                  <Button variant="secondary" onClick={toggleMark}>
                    <Flag className={`w-4 h-4 ${marked[tq.qid] ? "fill-amber-500 text-amber-600" : ""}`} />
                    {marked[tq.qid] ? "Marked" : "Mark for review"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                +{tq.marksPerQuestion} for correct · −{tq.negativeMarks} for wrong · 0 for unattempted
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: question grid for current section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-32 self-start">
          <div className="text-xs font-bold uppercase text-slate-500 mb-2">{activeSection?.sectionName}</div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {Array.from({ length: activeSection?.count || 0 }).map((_, i) => {
              const q = sequence[activeSection.start + i];
              const isAnswered = q && answers[q.qid] !== undefined;
              const isMarked = q && marked[q.qid];
              const isActive = i === activeIdx;
              const tone = isActive
                ? "bg-indigo-600 text-white"
                : isMarked
                  ? "bg-amber-100 text-amber-700"
                  : isAnswered
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600";
              return (
                <button key={i} onClick={() => goToAbsolute(activeSectionIdx, i)}
                  className={`text-xs h-8 rounded font-semibold transition ${tone}`}>{i + 1}</button>
              );
            })}
          </div>
          <div className="space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></span> answered</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> marked</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></span> not visited</div>
          </div>
        </div>
      </div>
    </div>
  );
}
