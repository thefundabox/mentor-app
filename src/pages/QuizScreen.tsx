import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { shuffle } from "@/data";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import type { Question, QuizResult, ConceptStat, QuestionAttempt } from "@/types";

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

function buildAttempt(pool: Question[], seed: number): Question[] {
  const conceptual = shuffle(pool.filter((q) => q.type === "conceptual"), seed).slice(0, 8);
  const analytical = shuffle(pool.filter((q) => q.type === "analytical"), seed + 1).slice(0, 8);
  return [...conceptual, ...analytical].map((q, i) => ({ ...q, _idx: i }));
}

export function QuizScreen({ dayNum }: QuizScreenProps) {
  const { currentUser, getStudent, attemptSeed, activeTopicId, setRoute, setLastResult, finishQuiz, topicCleared, quizPool, foundationPool, recordStudentConfusion } = useAppState();
  if (!currentUser) return null;
  const user = currentUser;
  const student = getStudent(user.id);
  const topicsInDay = student.chart.days[dayNum - 1] || [];

  const resolvedTopicId = activeTopicId && topicsInDay.some((t) => t.topicId === activeTopicId)
    ? activeTopicId
    : (topicsInDay.find((t) => !topicCleared(user.id, dayNum, t.topicId))?.topicId
       || topicsInDay[0]?.topicId
       || null);

  const slot = topicsInDay.find((t) => t.topicId === resolvedTopicId);
  if (!slot || !resolvedTopicId) return null;
  const topicId: string = resolvedTopicId;

  const questions = useMemo(() => buildAttempt(quizPool, attemptSeed), [quizPool, attemptSeed]);

  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [remediation, setRemediation] = useState<RemediationState | null>(null);

  // PR 7: per-question timing + perQuestion log. Real timings let the
  // scheduler escape its legacy 12s default and start producing accurate
  // confidence scores on day-quiz attempts too.
  const [questionStart, setQuestionStart] = useState<number>(() => Date.now());
  const [perQuestion, setPerQuestion] = useState<QuestionAttempt[]>([]);

  // Reset the question timer on every fresh question (main or remediation).
  useEffect(() => {
    setQuestionStart(Date.now());
  }, [i, remediation?.i, remediation == null]);

  const q = remediation ? remediation.qs[remediation.i] : questions[i];
  const total = questions.length;

  function handleSubmit() {
    if (chosen === null) return;
    const isCorrect = chosen === q.correct;
    const responseTimeMs = Date.now() - questionStart;

    // Remediation answers don't go into the perQuestion log: they're a
    // teaching moment, not a graded item. Same reason confusion isn't
    // recorded for foundation Qs.
    if (remediation) {
      const nextI = remediation.i + 1;
      if (nextI < remediation.qs.length) setRemediation({ ...remediation, i: nextI });
      else setRemediation(null);
      setChosen(null);
      return;
    }

    // PR 7: record per-question detail for the scheduler and analytics. Stable
    // question id uses (concept, index) — matches the selector's convention.
    const qa: QuestionAttempt = {
      questionId: `${q.concept}_${i}`,
      selectedOption: chosen,
      wasCorrect: isCorrect,
      skipped: false,
      responseTimeMs,
      concept: q.concept,
    };
    const nextPerQuestion = [...perQuestion, qa];
    setPerQuestion(nextPerQuestion);

    // PR 7: record (concept, chosen-distractor) when the student picked a
    // wrong main-pool answer. Foundation remediation is excluded above.
    if (!isCorrect) {
      const distractor = q.options[chosen] ?? `option_${chosen}`;
      recordStudentConfusion(user.id, q.concept || "unknown", distractor, topicId);
    }

    const newAnswers = [...answers, { correct: isCorrect, concept: q.concept, type: q.type }];
    setAnswers(newAnswers);

    if (!isCorrect) {
      const found = (foundationPool[q.concept] || []).slice(0, 2);
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
      const byConcept: Record<string, ConceptStat> = {};
      newAnswers.forEach((a) => {
        const c = byConcept[a.concept] || { right: 0, wrong: 0 };
        if (a.correct) c.right += 1; else c.wrong += 1;
        byConcept[a.concept] = c;
      });
      const attemptsForTopic = student.attempts.filter((a) => a.day === dayNum && a.topicId === topicId).length;
      const isFirstTry = attemptsForTopic === 0;
      const score = Math.round((correctCount / total) * 100);
      const { pointsAwarded, dayClearedNow, topicsRemainingInDay } = finishQuiz(user.id, {
        day: dayNum, topicId, score, when: Date.now(), byConcept,
        perQuestion: nextPerQuestion,
      });
      const result: QuizResult = {
        score, correct: correctCount, total,
        missedConcepts: [...new Set(newAnswers.filter((a) => !a.correct).map((a) => a.concept))],
        byConcept,
        pointsAwarded,
        firstTry: isFirstTry,
        topicId: topicId,
        dayClearedNow,
        topicsRemainingInDay,
      };
      setLastResult(result);
      setRoute("results");
    }
  }

  if (!q) return null;

  const progressPercent = ((i + 1) / total) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => setRoute("topic")} className="text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
            </div>
          </div>
          <div className="text-xs font-medium text-slate-500 w-16 text-right">{i + 1} / {total}</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {remediation && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Almost — but not quite</div>
            <div className="text-sm text-amber-900">{remediation.wrongAnswerExplain}</div>
            <div className="text-xs text-amber-700 mt-2">
              Quick foundation check ({remediation.i + 1} of {remediation.qs.length}) before we continue.
            </div>
          </motion.div>
        )}

        <div className="text-xs uppercase font-semibold text-indigo-600 mb-2">
          {remediation ? "Foundation refresher" : q.type === "conceptual" ? "Conceptual" : "Analytical · Fact-based"}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-snug">{q.q}</h2>

        <div className="space-y-3">
          {q.options.map((opt, k) => {
            const isPicked = chosen === k;
            return (
              <button key={k} onClick={() => setChosen(k)}
                className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                  isPicked ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
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

        <div className="mt-8 flex justify-end">
          <Button disabled={chosen === null} onClick={handleSubmit}>
            {remediation ? "Continue" : i + 1 === total ? "Finish quiz" : "Next question"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
