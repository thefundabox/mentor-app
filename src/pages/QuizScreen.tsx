import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Check, Flag, X, ChevronLeft, ChevronRight, Clock, LayoutGrid } from "lucide-react";
import type { Question, QuizResult, ConceptStat, QuestionAttempt } from "@/types";
import { buildAttempt, loadPool, questionKey } from "@/lib/topicPool";
import { draftKeyFor, paperFingerprint, readDraft, writeDraft } from "@/lib/attemptDraft";

import { GuideNote } from "@/components/GuideNote";
interface QuizScreenProps {
  dayNum: number;
}

type Phase = "attempt" | "review";

function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function QuizScreen({ dayNum }: QuizScreenProps) {
  const {
    currentUser, getStudent, attemptSeed, activeTopicId, setRoute, setLastResult,
    finishQuiz, topicCleared, recordStudentConfusion,
  } = useAppState();

  // Resolved before any early return so every hook below stays unconditional.
  const student = currentUser ? getStudent(currentUser.id) : null;
  const topicsInDay = student?.chart.days[dayNum - 1] ?? [];
  const topicId =
    activeTopicId && topicsInDay.some((t) => t.topicId === activeTopicId)
      ? activeTopicId
      : (topicsInDay.find((t) => currentUser && !topicCleared(currentUser.id, dayNum, t.topicId))?.topicId
         || topicsInDay[0]?.topicId
         || null);

  const [pool, setPool] = useState<Question[] | null>(null);
  useEffect(() => {
    if (!topicId) { setPool([]); return; }
    let cancelled = false;
    void loadPool(topicId).then((qs) => { if (!cancelled) setPool(qs); });
    return () => { cancelled = true; };
  }, [topicId]);

  const questions = useMemo(
    () => (pool ? buildAttempt(pool, attemptSeed) : []),
    [pool, attemptSeed],
  );
  const total = questions.length;

  const [phase, setPhase] = useState<Phase>("attempt");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Per-question dwell time, accumulated as the student moves around. Held in a
  // ref so re-renders never reset it.
  const spent = useRef<number[]>([]);
  const landedAt = useRef<number>(0);
  const startedAt = useRef<number>(0);
  const pendingResult = useRef<QuizResult | null>(null);

  // Identifies this exact paper for the on-disk draft. Null until the topic and
  // user are known, in which case nothing is saved or restored.
  const draftKey = currentUser && topicId
    ? draftKeyFor(currentUser.id, dayNum, topicId, attemptSeed)
    : null;

  // Identity of the paper as dealt. Guards the restore against the pool coming
  // back in a different order and silently re-pointing saved answers at
  // different questions.
  const fingerprint = useMemo(
    () => paperFingerprint(questions.map((q) => q.q)),
    [questions],
  );

  const [restoredCount, setRestoredCount] = useState(0);

  // Size the answer arrays once the paper is known — or refill them from a
  // draft left behind by an interrupted attempt on this same paper.
  useEffect(() => {
    if (total === 0) return;

    const draft = draftKey ? readDraft(draftKey, total, fingerprint) : null;
    if (draft?.submitted) {
      // Finished paper: put the review screen back rather than dealing a blank
      // one over the top of a result the student has already earned.
      setSelected(draft.selected);
      setFlagged(draft.flagged);
      pendingResult.current = (draft.result as QuizResult) ?? null;
      startedAt.current = Date.now() - draft.elapsedMs;
      setElapsed(draft.elapsedMs);
      setPhase("review");
      setRestoredCount(0);
      return;
    }
    if (draft) {
      setSelected(draft.selected);
      setFlagged(draft.flagged);
      setCurrent(Math.min(draft.current, total - 1));
      spent.current = draft.spent;
      // Carry the clock across the interruption instead of restarting it, so
      // the recorded time still reflects how long the paper actually took.
      startedAt.current = Date.now() - draft.elapsedMs;
      landedAt.current = Date.now();
      setRestoredCount(draft.selected.filter((v) => v !== null).length);
      return;
    }

    setSelected(Array(total).fill(null));
    setFlagged(Array(total).fill(false));
    setCurrent(0);
    spent.current = Array(total).fill(0);
    startedAt.current = Date.now();
    landedAt.current = Date.now();
    setRestoredCount(0);
  }, [total, draftKey, fingerprint]);

  // Persist as the student works. Deliberately not keyed on the ticking clock:
  // this writes when an answer, a flag or the position changes, not once a
  // second. The stored elapsed time is therefore a little behind on restore,
  // which errs in the student's favour.
  useEffect(() => {
    if (!draftKey || total === 0 || phase !== "attempt") return;
    if (selected.length !== total) return;
    writeDraft({
      key: draftKey,
      fingerprint,
      selected,
      flagged,
      current,
      spent: spent.current,
      elapsedMs: Date.now() - startedAt.current,
    });
  }, [draftKey, total, phase, fingerprint, selected, flagged, current]);

  useEffect(() => {
    if (phase !== "attempt" || total === 0) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(t);
  }, [phase, total]);

  if (!currentUser || !student || !topicId) return null;
  const user = currentUser;

  if (pool === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading questions…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-3">📖</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">No quiz for this topic yet</h1>
          <p className="text-sm text-slate-600 mb-6">
            This microtheme has no released question bank. Work through the notes and
            mark the topic as studied to keep your plan moving.
          </p>
          <Button onClick={() => setRoute("topic")}>Back to the topic</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = selected.filter((s) => s !== null).length;

  const goTo = (idx: number) => {
    const now = Date.now();
    spent.current[current] = (spent.current[current] ?? 0) + (now - landedAt.current);
    landedAt.current = now;
    setCurrent(idx);
    setShowPalette(false);
  };

  const choose = (optionIdx: number) => {
    setSelected((prev) => prev.map((v, i) => (i === current ? optionIdx : v)));
  };

  const toggleFlag = () => {
    setFlagged((prev) => prev.map((v, i) => (i === current ? !v : v)));
  };

  const submit = () => {
    // Bank the time spent on the question being left.
    spent.current[current] = (spent.current[current] ?? 0) + (Date.now() - landedAt.current);


    const perQuestion: QuestionAttempt[] = questions.map((question, i) => {
      const pick = selected[i];
      const wasCorrect = pick !== null && pick === question.correct;
      if (pick !== null && !wasCorrect) {
        const distractor = question.options[pick] ?? `option_${pick}`;
        recordStudentConfusion(user.id, question.concept || "unknown", distractor, topicId);
      }
      return {
        questionId: questionKey(question),
        skipped: pick === null,
        selectedOption: pick ?? -1,
        wasCorrect,
        responseTimeMs: spent.current[i] ?? 0,
        concept: question.concept,
      };
    });

    const correctCount = perQuestion.filter((p) => p.wasCorrect).length;
    const byConcept: Record<string, ConceptStat> = {};
    questions.forEach((question, i) => {
      const c = byConcept[question.concept] || { right: 0, wrong: 0 };
      if (perQuestion[i].wasCorrect) c.right += 1; else c.wrong += 1;
      byConcept[question.concept] = c;
    });

    const attemptsForTopic = student.attempts.filter((a) => a.day === dayNum && a.topicId === topicId).length;
    const score = Math.round((correctCount / total) * 100);
    const { pointsAwarded, dayClearedNow, topicsRemainingInDay } = finishQuiz(user.id, {
      day: dayNum, topicId, score, when: Date.now(), byConcept, perQuestion,
    });

    pendingResult.current = {
      score, correct: correctCount, total,
      missedConcepts: [...new Set(questions.filter((_, i) => !perQuestion[i].wasCorrect).map((x) => x.concept))],
      byConcept,
      pointsAwarded,
      firstTry: attemptsForTopic === 0,
      topicId,
      dayClearedNow,
      topicsRemainingInDay,
    };
    // Keep the paper on disk, flagged as submitted, so a reload before
    // "Continue" returns to this review rather than a blank attempt. Not
    // cleared here: resumableSeed skips submitted papers, so "start quiz"
    // still deals a fresh one.
    if (draftKey) {
      writeDraft({
        key: draftKey,
        fingerprint,
        submitted: true,
        result: pendingResult.current,
        selected,
        flagged,
        current,
        spent: spent.current,
        elapsedMs: Date.now() - startedAt.current,
      });
    }

    setConfirmSubmit(false);
    setPhase("review");
  };

  const finish = () => {
    if (pendingResult.current) setLastResult(pendingResult.current);
    setRoute("results");
  };

  /* ---------------------------------------------------------------- review */

  if (phase === "review") {
    const result = pendingResult.current;
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Your score</div>
              <div className="text-2xl font-bold text-slate-900 leading-none">
                {result?.score ?? 0}%
                <span className="text-sm font-medium text-slate-500 ml-2">
                  {result?.correct ?? 0} / {total}
                </span>
              </div>
            </div>
            <div className="ml-auto text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {fmtClock(elapsed)}
            </div>
            <Button onClick={finish}>Continue</Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">
          {questions.map((question, i) => {
            const pick = selected[i];
            const right = pick !== null && pick === question.correct;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold grid place-items-center ${
                    right ? "bg-emerald-100 text-emerald-700"
                      : pick === null ? "bg-slate-100 text-slate-500" : "bg-rose-100 text-rose-700"
                  }`}>{i + 1}</span>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                    {question.type}
                  </span>
                  {pick === null && (
                    <span className="text-[11px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      not attempted
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900 mb-3 whitespace-pre-line leading-[1.6] text-[0.9375rem] sm:text-base">{question.q}</p>
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
                {question.why && (
                  <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-slate-700">Why: </span>{question.why}
                  </div>
                )}
              </div>
            );
          })}
          <div className="pt-2 flex justify-center">
            <Button onClick={finish}>Continue to results</Button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- attempt */

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {restoredCount > 0 && phase === "attempt" && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-3xl mx-auto px-5 py-2.5 flex items-start gap-3">
            <div className="flex-1 text-sm text-emerald-900">
              Picking up where you left off — {restoredCount} answer
              {restoredCount === 1 ? "" : "s"} restored.
            </div>
            <button
              onClick={() => setRestoredCount(0)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 shrink-0"
            >
              dismiss
            </button>
          </div>
        </div>
      )}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => setRoute("topic")}
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
        {/* First question only. A guide who speaks on every question is nagging,
            not guiding -- and this is the one moment the advice is actionable,
            before any answers have been committed. */}
        {current === 0 && (
          <GuideNote className="mb-6">
            Skipping is a move, not a failure. RAS deducts for a wrong answer and
            nothing for a blank, so an honest &ldquo;I don&rsquo;t know&rdquo; costs you less
            than a confident guess. Flag it and come back.
          </GuideNote>
        )}
        <motion.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-indigo-600">
              {q.type}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">Q{current + 1} of {total}</span>
            <button
              onClick={toggleFlag}
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

          {/* RPSC stems are often a lead-in plus four numbered statements. Bold
              2xl at tight leading turned that into a wall; this is set for
              reading a paragraph, not for a headline. */}
          <h1 className="text-[1.0625rem] sm:text-[1.1875rem] font-semibold text-slate-900 leading-[1.65] tracking-[-0.005em] mb-7 whitespace-pre-line [&>*]:mt-2">
            {q.q}
          </h1>

          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const picked = selected[current] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => choose(oi)}
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
          <Button
            variant="outline"
            onClick={() => goTo(Math.max(0, current - 1))}
            disabled={current === 0}
          >
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
