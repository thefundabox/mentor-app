import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { topicQuestions, shuffle, FOUNDATION_QS } from "@/data";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import type { Question, QuizResult } from "@/types";

interface QuizScreenProps {
  dayNum: number;
}

interface Answer {
  correct: boolean;
  concept: string;
  type: string;
}

interface RemediationState {
  qs: Question[];
  i: number;
  wrongAnswerExplain: string;
}

function buildAttempt(topicId: string, seed: number): Question[] {
  const pool = topicQuestions(topicId);
  const conceptual = shuffle(
    pool.filter((q) => q.type === "conceptual"),
    seed
  ).slice(0, 8);
  const analytical = shuffle(
    pool.filter((q) => q.type === "analytical"),
    seed + 1
  ).slice(0, 8);
  return [...conceptual, ...analytical].map((q, i) => ({ ...q, _idx: i }));
}

export function QuizScreen({ dayNum }: QuizScreenProps) {
  const { chart, attemptSeed, setRoute, setLastResult, finishQuiz } =
    useAppState();
  const slot = chart[dayNum - 1];

  if (!slot) return null;

  const questions = useMemo(
    () => buildAttempt(slot.topicId, attemptSeed),
    [slot.topicId, attemptSeed]
  );

  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [remediation, setRemediation] = useState<RemediationState | null>(null);

  const q = remediation ? remediation.qs[remediation.i] : questions[i];
  const total = questions.length;

  function handleSubmit() {
    if (chosen === null) return;
    const isCorrect = chosen === q.correct;

    if (remediation) {
      const nextI = remediation.i + 1;
      if (nextI < remediation.qs.length) {
        setRemediation({ ...remediation, i: nextI });
      } else {
        setRemediation(null);
      }
      setChosen(null);
      return;
    }

    const newAnswers = [...answers, { correct: isCorrect, concept: q.concept, type: q.type }];
    setAnswers(newAnswers);

    if (!isCorrect) {
      const found = (FOUNDATION_QS[q.concept] || []).slice(0, 2);
      if (found.length) {
        setRemediation({
          qs: found.map((f) => ({ ...f, _foundation: true })),
          i: 0,
          wrongAnswerExplain: q.why,
        });
        setChosen(null);
        return;
      }
    }

    setChosen(null);
    if (i + 1 < total) {
      setI(i + 1);
    } else {
      const correctCount = newAnswers.filter((a) => a.correct).length;
      const result: QuizResult = {
        score: Math.round((correctCount / total) * 100),
        correct: correctCount,
        total,
        missedConcepts: [
          ...new Set(newAnswers.filter((a) => !a.correct).map((a) => a.concept)),
        ],
      };
      setLastResult(result);
      finishQuiz({ day: dayNum, score: result.score, when: Date.now() });
      setRoute("results");
    }
  }

  if (!q) return null;

  const progress = i;
  const progressPercent = ((progress + 1) / total) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setRoute("topic")}
            className="text-slate-400 hover:text-slate-700 transition"
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

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Remediation Banner */}
        {remediation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200"
          >
            <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">
              Almost — but not quite
            </div>
            <div className="text-sm text-amber-900">
              {remediation.wrongAnswerExplain}
            </div>
            <div className="text-xs text-amber-700 mt-2">
              Quick foundation check ({remediation.i + 1} of{" "}
              {remediation.qs.length}) before we continue.
            </div>
          </motion.div>
        )}

        {/* Question Type Label */}
        <div className="text-xs uppercase font-semibold text-indigo-600 mb-2">
          {remediation
            ? "Foundation refresher"
            : q.type === "conceptual"
            ? "Conceptual"
            : "Analytical · Fact-based"}
        </div>

        {/* Question */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-snug">
          {q.q}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, k) => {
            const isPicked = chosen === k;
            return (
              <button
                key={k}
                onClick={() => setChosen(k)}
                className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                  isPicked
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    isPicked
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {String.fromCharCode(65 + k)}
                </span>
                <span className="text-slate-800">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            disabled={chosen === null}
            onClick={handleSubmit}
          >
            {remediation
              ? "Continue"
              : i + 1 === total
              ? "Finish quiz"
              : "Next question"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
