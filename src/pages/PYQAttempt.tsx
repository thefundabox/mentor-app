import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Check, Flag, X, ChevronLeft, ChevronRight, Clock, LayoutGrid } from "lucide-react";
import type { Question } from "@/types";
import { loadPyqs } from "@/lib/pyqStore";
import { findTopic } from "@/data";

/**
 * Attemptable past papers.
 *
 * The PYQ tab used to render prose cards -- a stem, the answer, an explanation,
 * all visible at once. There was nothing to attempt, which is what the request
 * to make it "like the quiz segment" was about.
 *
 * This deliberately does NOT reuse QuizScreen. That screen is bound to the
 * study plan: submitting awards points, marks the day's topic cleared and
 * writes a QuizResult the results page consumes. A student revising the 2024
 * paper should not thereby clear day 37. The exam mechanics are the same and
 * the two screens will drift; that is a smaller cost than PYQ practice
 * silently advancing somebody's plan.
 *
 * What it does share: wrong answers still feed `recordStudentConfusion`, so
 * weak-area tracking sees past-paper mistakes like any other.
 */
type Phase = "attempt" | "review";

function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PYQAttempt() {
  const { currentUser, pyqTarget, setRoute, recordStudentConfusion } = useAppState();

  const [pool, setPool] = useState<Question[] | null>(null);

  // Where "leave" and "done" go back to. A microtheme attempt was reached from
  // the topic screen; anything else from the archive.
  const backTo = pyqTarget?.topicId ? ("topic" as const) : ("pyq_archive" as const);

  useEffect(() => {
    if (!pyqTarget) { setPool([]); return; }
    let cancelled = false;
    void loadPyqs(pyqTarget).then((qs) => { if (!cancelled) setPool(qs); });
    return () => { cancelled = true; };
  }, [pyqTarget]);

  // Papers are served in printed order, not shuffled. A past paper's ordering
  // is part of what it is -- the reasoning block sits where RPSC put it.
  const questions = pool ?? [];
  const total = questions.length;

  const [phase, setPhase] = useState<Phase>("attempt");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const spent = useRef<number[]>([]);
  const landedAt = useRef<number>(0);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (total === 0) return;
    setSelected(Array(total).fill(null));
    setFlagged(Array(total).fill(false));
    setCurrent(0);
    setPhase("attempt");
    spent.current = Array(total).fill(0);
    startedAt.current = Date.now();
    landedAt.current = Date.now();
  }, [total]);

  useEffect(() => {
    if (phase !== "attempt" || total === 0) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(t);
  }, [phase, total]);

  // Every hook above runs unconditionally; only now is it safe to bail.
  if (!currentUser || !pyqTarget) return null;
  const user = currentUser;

  if (pool === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading the paper…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">No past questions here yet</h1>
          <p className="text-sm text-slate-600 mb-6">
            Nothing in the past-paper bank is tagged to {pyqTarget.label}. Showing
            questions from somewhere else would only mislead you.
          </p>
          <Button onClick={() => setRoute(backTo)}>Back</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = selected.filter((s) => s !== null).length;
  const correctCount = questions.filter((question, i) => selected[i] === question.correct).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const goTo = (idx: number) => {
    const now = Date.now();
    spent.current[current] = (spent.current[current] ?? 0) + (now - landedAt.current);
    landedAt.current = now;
    setCurrent(idx);
    setShowPalette(false);
  };

  const submit = () => {
    spent.current[current] = (spent.current[current] ?? 0) + (Date.now() - landedAt.current);
    questions.forEach((question, i) => {
      const pick = selected[i];
      if (pick !== null && pick !== question.correct) {
        const distractor = question.options[pick] ?? `option_${pick}`;
        recordStudentConfusion(user.id, question.concept || "unknown", distractor, question.concept);
      }
    });
    setConfirmSubmit(false);
    setPhase("review");
  };

  /* ---------------------------------------------------------------- review */

  if (phase === "review") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                {pyqTarget.label}
              </div>
              <div className="text-2xl font-bold text-slate-900 leading-none">
                {score}%
                <span className="text-sm font-medium text-slate-500 ml-2">
                  {correctCount} / {total}
                </span>
              </div>
            </div>
            <div className="ml-auto text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {fmtClock(elapsed)}
            </div>
            <Button onClick={() => setRoute(backTo)}>Done</Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">
          {questions.map((question, i) => {
            const pick = selected[i];
            const right = pick !== null && pick === question.correct;
            const found = findTopic(question.concept);
            return (
              <div key={question.id ?? i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold grid place-items-center ${
                    right ? "bg-emerald-100 text-emerald-700"
                      : pick === null ? "bg-slate-100 text-slate-500" : "bg-rose-100 text-rose-700"
                  }`}>{i + 1}</span>
                  {question.sourceYear && (
                    <span className="text-[11px] uppercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      RAS {question.sourceYear}
                    </span>
                  )}
                  {found && (
                    <span className="text-[11px] text-slate-500">{found.topic.name}</span>
                  )}
                  {pick === null && (
                    <span className="text-[11px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      not attempted
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900 mb-3 whitespace-pre-line leading-[1.6] text-[0.9375rem] sm:text-base">
                  {question.q}
                </p>
                <div className="space-y-1.5 mb-3">
                  {question.options.map((opt, oi) => {
                    const isCorrect = oi === question.correct;
                    const isPick = oi === pick;
                    return (
                      <div key={oi} className={`text-sm leading-[1.6] rounded-lg px-3 py-2 border flex items-start gap-2 ${
                        isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : isPick ? "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-slate-200 text-slate-600"
                      }`}>
                        <span className="font-semibold">{String.fromCharCode(65 + oi)}</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <Check className="w-4 h-4 shrink-0" />}
                        {isPick && !isCorrect && <X className="w-4 h-4 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                {question.why ? (
                  <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-slate-700">Why: </span>{question.why}
                  </div>
                ) : (
                  /* Honest about provenance rather than inventing a rationale:
                     the key is RPSC's, the explanation simply does not exist
                     yet for these. */
                  <div className="text-xs text-slate-500">
                    Answer as per the official RPSC final answer key.
                  </div>
                )}
              </div>
            );
          })}
          <div className="pt-2 flex justify-center">
            <Button onClick={() => setRoute(backTo)}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- attempt */

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => setRoute(backTo)}
            className="text-slate-400 hover:text-slate-700"
            title="Leave the attempt"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{fmtClock(elapsed)}</span>
          </div>

          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              animate={{ width: `${(answeredCount / total) * 100}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>

          <div className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {answeredCount} / {total}
          </div>

          <button
            onClick={() => setShowPalette((v) => !v)}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
            title="Question palette"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <Button size="sm" onClick={() => setConfirmSubmit(true)}>Submit</Button>
        </div>

        {showPalette && (
          <div className="max-w-3xl mx-auto px-5 pb-4">
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
              {questions.map((_, i) => {
                const state = flagged[i] ? "flag" : selected[i] !== null ? "done" : "todo";
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-8 rounded-lg text-xs font-semibold transition ${
                      i === current ? "ring-2 ring-indigo-400 " : ""
                    }${
                      state === "flag" ? "bg-amber-100 text-amber-800"
                        : state === "done" ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-100 mr-1" />answered</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-100 mr-1" />flagged</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded bg-slate-100 mr-1" />not attempted</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8 sm:py-10">
        <motion.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-indigo-600">
              {q.sourceYear ? `RAS ${q.sourceYear}${q.paperQno ? ` Q${q.paperQno}` : ""}` : pyqTarget.label}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">Q{current + 1} of {total}</span>
            <button
              onClick={() => setFlagged((prev) => prev.map((v, i) => (i === current ? !v : v)))}
              className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                flagged[current]
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {flagged[current] ? "Flagged" : "Flag for review"}
            </button>
          </div>

          <h1 className="text-[1.0625rem] sm:text-[1.1875rem] font-semibold text-slate-900 leading-[1.65] tracking-[-0.005em] mb-7 whitespace-pre-line [&>*]:mt-2">
            {q.q}
          </h1>

          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const picked = selected[current] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => setSelected((prev) => prev.map((v, i) => (i === current ? oi : v)))}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 flex items-start gap-3 transition text-[0.9375rem] sm:text-base leading-[1.6] ${
                    picked
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                    picked ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className={picked ? "text-indigo-950" : "text-slate-700"}>{opt}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Button variant="outline" onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <button
            onClick={() => setSelected((prev) => prev.map((v, i) => (i === current ? null : v)))}
            className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
            disabled={selected[current] === null}
          >
            Clear
          </button>
          <div className="ml-auto">
            {current === total - 1 ? (
              <Button onClick={() => setConfirmSubmit(true)}>Submit paper</Button>
            ) : (
              <Button onClick={() => goTo(current + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-20 bg-slate-900/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Submit this paper?</h2>
            <p className="text-sm text-slate-600 mb-4">
              {answeredCount === total
                ? "All questions answered. You will see the solutions next."
                : `${total - answeredCount} question${total - answeredCount === 1 ? "" : "s"} still unanswered. Unanswered questions score zero.`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Keep working</Button>
              <Button onClick={submit}>Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
