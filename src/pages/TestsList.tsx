import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Play, ClipboardCheck } from "lucide-react";

export function TestsList() {
  const { currentUser, tests, testAttempts, setRoute, setActiveTestId, setActiveAttemptId, startTestAttempt } = useAppState();
  if (!currentUser) return null;

  const activeTests = tests.filter((t) => !t.archived);
  const myAttempts = testAttempts.filter((a) => a.studentId === currentUser.id);

  const start = (testId: string) => {
    setActiveTestId(testId);
    const attemptId = startTestAttempt(testId, currentUser.id);
    setActiveAttemptId(attemptId);
    setRoute("take_test");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={() => setRoute("home")} className="text-sm text-slate-500 hover:text-slate-800 mb-3 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> back to home
      </button>

      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">Mock tests</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Available tests</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Mock tests and sectionals to sharpen for exam day. Timer enforced; negative marking applied per the test's config.
        </p>
      </div>

      <div className="space-y-3">
        {activeTests.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No tests available right now. Your mentor will add some.
          </div>
        )}
        {activeTests.map((t) => {
          const attempts = myAttempts.filter((a) => a.testId === t.id);
          const bestAttempt = attempts.filter((a) => a.finishedAt !== undefined)
            .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
          const totalQs = t.sections.reduce((n, s) => n + s.questionCount, 0);
          const totalMarks = t.sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);
          return (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <h3 className="font-semibold text-slate-900">{t.title}</h3>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{t.type}</span>
                  </div>
                  {t.description && <p className="text-sm text-slate-600 mt-1">{t.description}</p>}
                  <div className="text-xs text-slate-500 mt-2">
                    {totalQs} questions · {totalMarks} marks · {t.durationMins} min · {t.sections.length} section{t.sections.length === 1 ? "" : "s"}
                  </div>
                  {bestAttempt && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                      <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                      <span className="font-semibold text-emerald-700">Best: {bestAttempt.score?.toFixed(2)} / {bestAttempt.maxScore}</span>
                      <span className="text-slate-500">· {attempts.length} attempt{attempts.length === 1 ? "" : "s"}</span>
                    </div>
                  )}
                </div>
                <Button onClick={() => start(t.id)}>
                  <Play className="w-4 h-4" /> {attempts.length === 0 ? "Start test" : "Retake"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
