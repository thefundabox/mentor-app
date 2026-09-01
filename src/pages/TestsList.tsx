import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Play, ClipboardCheck, Lock, Clock } from "lucide-react";
import { claimTestAttempt } from "@/lib/entitlement";
import { GuideNote } from "@/components/GuideNote";

export function TestsList() {
  const { currentUser, tests, testAttempts, testSchedules, setRoute, setActiveTestId, setActiveAttemptId, startTestAttempt, schedulesForTest, batchForStudent, authEnabled } = useAppState();
  // Above the early return on purpose: hooks must run in the same order every
  // render, and `currentUser` can flip to null for a frame while the session
  // rehydrates. Declaring these after the guard would change the hook order
  // between those two renders.
  const [claiming, setClaiming] = useState<string | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  if (!currentUser) return null;

  const myBatch = batchForStudent(currentUser.id);
  const now = Date.now();

  /** A test is visible if it's not archived AND (no schedule exists OR at least one schedule matches the student's batch). */
  const visibleTests = useMemo(() => {
    return tests
      .filter((t) => !t.archived)
      .map((t) => {
        const allSchedules = schedulesForTest(t.id);
        if (allSchedules.length === 0) {
          // No schedule → always available.
          return { test: t, gate: "open" as const, releaseAt: null as number | null, closeAt: null as number | null };
        }
        const myBatchSchedules = allSchedules.filter((s) => s.batchIds.length === 0 || (myBatch && s.batchIds.includes(myBatch.id)));
        if (myBatchSchedules.length === 0) return null; // not scheduled for this student
        // Use earliest release / latest close among visible schedules.
        const releaseAt = Math.min(...myBatchSchedules.map((s) => s.releaseAt));
        const closeCandidates = myBatchSchedules.map((s) => s.closeAt).filter((x): x is number => x !== undefined);
        const closeAt = closeCandidates.length > 0 ? Math.max(...closeCandidates) : null;
        if (releaseAt > now) return { test: t, gate: "upcoming" as const, releaseAt, closeAt };
        if (closeAt !== null && closeAt < now) return { test: t, gate: "closed" as const, releaseAt, closeAt };
        return { test: t, gate: "open" as const, releaseAt, closeAt };
      })
      .filter(<T,>(x: T | null): x is T => x !== null);
  }, [tests, testSchedules, myBatch, now, schedulesForTest]);

  const myAttempts = testAttempts.filter((a) => a.studentId === currentUser.id);

  /**
   * Claim the slot before opening the paper.
   *
   * The allowance is counted in Postgres, so the claim has to succeed first --
   * starting the sitting and asking permission afterwards would let a student
   * sit a test the server was never going to record.
   *
   * The database's own message is shown rather than a generic refusal. It names
   * the actual allowance ("Your free plan includes 3 mock test(s)"), which is
   * what a person needs in order to know what to do next.
   */
  const start = async (testId: string) => {
    setDenied(null);
    let serverId: string | undefined;

    // Local demo mode has no server to claim against, and no plan either.
    if (authEnabled) {
      setClaiming(testId);
      const res = await claimTestAttempt(testId);
      setClaiming(null);
      if ("error" in res) { setDenied(res.error); return; }
      serverId = res.id;
    }

    setActiveTestId(testId);
    setActiveAttemptId(startTestAttempt(testId, currentUser.id, serverId));
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

      {/* Says what the paragraph above does not: how the allowance behaves.
          True on either plan, so it needs no live numbers. */}
      <GuideNote className="mb-4">
        A mock is only worth what it costs you &mdash; one sitting, timer running, nothing
        open beside it. Re-opening a paper you have already sat is free, so the honest
        run is the one that counts.
      </GuideNote>

      {/* The database's own words. It names the actual allowance, which is what
          someone needs in order to know what to do about it -- a generic "not
          allowed" would send them to support instead of to the upgrade. */}
      {denied && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mr-1.5 inline h-4 w-4 -translate-y-px" />
          {denied}
        </div>
      )}

      <div className="space-y-3">
        {visibleTests.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No tests available right now. Your mentor will schedule some.
          </div>
        )}
        {visibleTests.map(({ test: t, gate, releaseAt, closeAt }) => {
          const attempts = myAttempts.filter((a) => a.testId === t.id);
          const bestAttempt = attempts.filter((a) => a.finishedAt !== undefined)
            .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
          const totalQs = t.sections.reduce((n, s) => n + s.questionCount, 0);
          const totalMarks = t.sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);
          const isLocked = gate === "upcoming" || gate === "closed";
          return (
            <div key={t.id} className={`bg-white border rounded-2xl p-5 ${isLocked ? "border-slate-200 opacity-80" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <h3 className="font-semibold text-slate-900">{t.title}</h3>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{t.type}</span>
                    {gate === "upcoming" && releaseAt && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-amber-100 text-amber-700 rounded px-2 py-0.5">
                        <Clock className="w-3 h-3" /> unlocks {new Date(releaseAt).toLocaleDateString()}
                      </span>
                    )}
                    {gate === "closed" && closeAt && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-rose-100 text-rose-700 rounded px-2 py-0.5">
                        <Lock className="w-3 h-3" /> closed {new Date(closeAt).toLocaleDateString()}
                      </span>
                    )}
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
                {isLocked
                  ? <Button disabled><Lock className="w-4 h-4" /> Locked</Button>
                  : <Button onClick={() => void start(t.id)} disabled={claiming !== null}>
                      <Play className="w-4 h-4" />
                      {claiming === t.id ? "Opening..." : attempts.length === 0 ? "Start test" : "Retake"}
                    </Button>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
