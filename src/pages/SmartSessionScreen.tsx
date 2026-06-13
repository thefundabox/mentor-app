/**
 * Smart Session runner (Adaptive PR 3)
 *
 * Walks the student through the SessionItems built by the selector. For each
 * question:
 *   - records start time when shown
 *   - records selected option (or skip) on submit
 *   - computes responseTimeMs from the delta
 *   - calls applyTopicScheduling so the topic's SR state updates immediately
 *
 * When the session ends, we show an inline summary (no separate Results
 * route) and clear the active session from context.
 *
 * The skip button is included here because the negative-marking strategy
 * trainer (PR 4) needs the data, and surfacing skip in the adaptive flow
 * teaches the discipline incidentally. Per-question response time is real,
 * so the scheduler's confidence math now starts producing meaningful values.
 */

import { useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, SkipForward, X, Check, AlertTriangle } from "lucide-react";
import type { SessionItem, SessionReason } from "@/lib/selector";

interface AnswerRecord {
  item: SessionItem;
  selectedOption: number;
  wasCorrect: boolean;
  wasSkipped: boolean;
  responseTimeMs: number;
}

const REASON_LABEL: Record<SessionReason, { label: string; tone: string }> = {
  due_review:         { label: "Due for review",        tone: "bg-indigo-100 text-indigo-800" },
  rajasthan_priority: { label: "Rajasthan priority",    tone: "bg-amber-100 text-amber-800" },
  priority_flagged:   { label: "Flagged for review",    tone: "bg-rose-100 text-rose-800" },
  skip_prone:         { label: "Don't skip again",      tone: "bg-rose-100 text-rose-800" },
  weak_area:          { label: "Weak area",             tone: "bg-rose-100 text-rose-800" },
  new_topic:          { label: "New topic",             tone: "bg-emerald-100 text-emerald-800" },
  filler:             { label: "Practice",              tone: "bg-slate-100 text-slate-700" },
};

export function SmartSessionScreen() {
  const {
    currentUser, activeSession, setActiveSession, setRoute, applyTopicScheduling, subjects,
  } = useAppState();

  const items = activeSession ?? [];
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [questionStart, setQuestionStart] = useState<number>(() => Date.now());
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [done, setDone] = useState(false);

  // Reset the question timer every time the index advances.
  useEffect(() => {
    setQuestionStart(Date.now());
    setChosen(null);
  }, [i]);

  // Bounce to the picker if someone landed here without a planned session
  // (refresh-after-finish, deep link, etc.).
  if (!currentUser || items.length === 0) {
    return (
      <EmptyState onBack={() => setRoute("smart_practice")} />
    );
  }

  const subjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? "Practice";
  const topicName = (subjectId: string, topicId: string) =>
    subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId)?.name ?? "Topic";

  // ---- End-of-session summary -------------------------------------------
  if (done) {
    return (
      <SessionSummary
        answers={answers}
        onAgain={() => {
          setActiveSession(null);
          setRoute("smart_practice");
        }}
        onHome={() => {
          setActiveSession(null);
          setRoute("home");
        }}
        subjectName={subjectName}
        topicName={topicName}
      />
    );
  }

  // ---- Current question --------------------------------------------------
  const item = items[i];
  const q = item.question;
  const total = items.length;

  const finalize = (next: AnswerRecord[]) => {
    setAnswers(next);
    // Push every answer through the scheduler immediately so the next
    // session's due-queue reflects this one. We tag CA later (PR 5).
    applyTopicScheduling(currentUser.id, item.topicId, {
      wasCorrect: next[next.length - 1].wasCorrect,
      wasSkipped: next[next.length - 1].wasSkipped,
      responseTimeMs: next[next.length - 1].responseTimeMs,
      isCurrentAffairs: false,
    });
    if (i + 1 < total) {
      setI(i + 1);
    } else {
      setDone(true);
    }
  };

  const handleSubmit = () => {
    if (chosen === null) return;
    const responseTimeMs = Date.now() - questionStart;
    const wasCorrect = chosen === q.correct;
    const record: AnswerRecord = {
      item,
      selectedOption: chosen,
      wasCorrect,
      wasSkipped: false,
      responseTimeMs,
    };
    finalize([...answers, record]);
  };

  const handleSkip = () => {
    const responseTimeMs = Date.now() - questionStart;
    const record: AnswerRecord = {
      item,
      selectedOption: -1,
      wasCorrect: false,
      wasSkipped: true,
      responseTimeMs,
    };
    finalize([...answers, record]);
  };

  const reasonMeta = REASON_LABEL[item.reason];
  const progressPercent = ((i + 1) / total) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => { setActiveSession(null); setRoute("smart_practice"); }}
            className="text-slate-400 hover:text-slate-700 transition"
            aria-label="Exit session"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500 w-16 text-right">
            {i + 1} / {total}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${reasonMeta.tone}`}>
            {reasonMeta.label}
          </span>
          <span className="text-xs text-slate-500">
            {subjectName(item.subjectId)} · {topicName(item.subjectId, item.topicId)}
          </span>
          {q.rajasthanAngle && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
              <MapPin className="w-3 h-3" /> Rajasthan
            </span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-snug">{q.q}</h2>

        <div className="space-y-3">
          {q.options.map((opt, k) => {
            const isPicked = chosen === k;
            return (
              <button
                key={k}
                onClick={() => setChosen(k)}
                className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                  isPicked ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  isPicked ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {String.fromCharCode(65 + k)}
                </span>
                <span className="text-slate-800">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={handleSkip}>
            <SkipForward className="w-4 h-4" /> Skip (don't attempt)
          </Button>
          <Button disabled={chosen === null} onClick={handleSubmit}>
            {i + 1 === total ? "Finish session" : "Submit & next"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Skipping earns 0 marks. A wrong answer would cost 1/3 mark in the real exam.
        </p>
      </div>
    </div>
  );
}

function SessionSummary({
  answers, onAgain, onHome, subjectName, topicName,
}: {
  answers: AnswerRecord[];
  onAgain: () => void;
  onHome: () => void;
  subjectName: (id: string) => string;
  topicName: (subjectId: string, topicId: string) => string;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.wasCorrect).length;
  const wrong = answers.filter((a) => !a.wasCorrect && !a.wasSkipped).length;
  const skipped = answers.filter((a) => a.wasSkipped).length;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  // Wrong + slow (>20s) = likely should have skipped (negative-marking lens).
  const shouldHaveSkipped = answers.filter((a) => !a.wasCorrect && !a.wasSkipped && a.responseTimeMs > 20000).length;
  const marksHypothetical = correct - wrong / 3;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Session done</h1>
      <p className="text-sm text-slate-600 mb-6">
        {correct} correct, {wrong} wrong, {skipped} skipped — {acc}% accuracy.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Tile label="Accuracy"           value={`${acc}%`}                       accent="indigo" />
        <Tile label="Hypothetical marks" value={marksHypothetical.toFixed(2)}    accent="amber"  sub="with 1/3 neg" />
        <Tile label="Should have skipped" value={shouldHaveSkipped.toString()}   accent="rose"   sub="slow & wrong" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-100 text-xs uppercase font-bold tracking-wide text-slate-500">
          Question breakdown
        </div>
        <ul className="divide-y divide-slate-100">
          {answers.map((a, idx) => (
            <li key={idx} className="px-4 py-3 flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                a.wasSkipped ? "bg-slate-100 text-slate-500"
                : a.wasCorrect ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
              }`}>
                {a.wasSkipped ? <SkipForward className="w-4 h-4" />
                  : a.wasCorrect ? <Check className="w-4 h-4" />
                  : <AlertTriangle className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">{a.item.question.q}</div>
                <div className="text-xs text-slate-500">
                  {subjectName(a.item.subjectId)} · {topicName(a.item.subjectId, a.item.topicId)} · {(a.responseTimeMs / 1000).toFixed(1)}s
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onAgain}>Another session</Button>
        <Button variant="secondary" onClick={onHome}>Back to home</Button>
      </div>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">No session loaded</h1>
      <p className="text-sm text-slate-600 mb-6">
        Pick a mode to start a new Smart Practice session.
      </p>
      <Button onClick={onBack}>Open Smart Practice</Button>
    </div>
  );
}

function Tile({ label, value, accent, sub }: {
  label: string; value: string; accent: "indigo" | "amber" | "rose"; sub?: string;
}) {
  const map = {
    indigo: "from-indigo-50 to-indigo-100/40 text-indigo-700",
    amber:  "from-amber-50  to-amber-100/40  text-amber-700",
    rose:   "from-rose-50   to-rose-100/40   text-rose-700",
  }[accent];
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map} p-4`}>
      <div className="text-[10px] uppercase font-bold tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

