import { useAppState } from "@/hooks/useAppState";
import { conceptLabel } from "@/data";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, ArrowRight, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface ResultsProps { dayNum: number; }

export function Results({ dayNum }: ResultsProps) {
  const { currentUser, getStudent, lastResult, setRoute, setAttemptSeed, setActiveDay, addOverride } = useAppState();
  if (!currentUser || !lastResult) return null;
  const student = getStudent(currentUser.id);

  const hasOverride = student.overrides.some((o) => o.day === dayNum && o.status === "approved");
  const passed = lastResult.score >= 80 || hasOverride;

  const handleContinue = () => { setActiveDay(null); setRoute("home"); };
  const handleRetry = () => { setAttemptSeed((s: number) => s + 7); setRoute("quiz"); };
  const handleRequestOverride = () => {
    if (student.overrides.some((o) => o.day === dayNum && o.status === "pending")) return;
    const dayAttempts = student.attempts.filter((a) => a.day === dayNum);
    const bestScore = dayAttempts.length ? Math.max(...dayAttempts.map((a) => a.score)) : 0;
    addOverride(currentUser.id, {
      id: Date.now(), day: dayNum, status: "pending",
      attempts: dayAttempts.length, bestScore,
    });
    alert("Override request sent to your mentor.");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 relative">
      {passed && <Confetti />}

      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
          {passed ? <Trophy className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
        </div>

        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Day {dayNum} result</div>
        <div className={`text-6xl font-bold mt-2 ${passed ? "text-emerald-600" : "text-amber-600"}`}>{lastResult.score}%</div>
        <div className="text-slate-500 mt-1">{lastResult.correct} of {lastResult.total} correct</div>

        <h2 className="text-2xl font-bold text-slate-900 mt-6">
          {passed ? `Day ${dayNum + 1} unlocked!` : "Not quite there yet"}
        </h2>

        <p className="text-slate-600 mt-2 max-w-md mx-auto">
          {passed
            ? hasOverride && lastResult.score < 80
              ? "Your mentor granted an override — continue when ready."
              : "You cleared the 80% threshold. The next day is now available on your path."
            : "Retry with a fresh question set, or ask your mentor for an override if you've already tried multiple times."}
        </p>

        {passed && lastResult.pointsAwarded && lastResult.pointsAwarded > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 18 }}
            className="mt-6 inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 shadow-sm"
          >
            <div className="flex items-center gap-2 text-amber-700 font-bold text-2xl">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              +{lastResult.pointsAwarded}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {lastResult.firstTry ? (
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Cleared on first try!</span>
              ) : "Day cleared"}
            </div>
            <div className="text-[10px] text-amber-700">
              {lastResult.firstTry ? "100 pts for the clear + 50 first-try bonus" : "100 pts for the clear"}
            </div>
          </motion.div>
        )}

        {lastResult.missedConcepts && lastResult.missedConcepts.length > 0 && (
          <div className="mt-6 text-left p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Concepts to revisit</div>
            <div className="flex flex-wrap gap-1.5">
              {lastResult.missedConcepts.map((c) => (
                <span key={c} className="text-xs px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
                  {conceptLabel(c)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {passed ? (
            <Button onClick={handleContinue}>Continue to Day {dayNum + 1} <ArrowRight className="w-4 h-4" /></Button>
          ) : (
            <>
              <Button onClick={handleRetry}>Retry — fresh questions</Button>
              <Button variant="secondary" onClick={handleRequestOverride}>Request mentor override</Button>
            </>
          )}
          <Button variant="ghost" onClick={handleContinue}>Back to path</Button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-visible">
      {pieces.map((_, i) => (
        <span key={i} className="absolute w-2 h-3 rounded-sm"
          style={{
            left: `${(i / pieces.length) * 100}%`, top: "0",
            backgroundColor: colors[i % colors.length],
            animation: `confettiFall 1.6s ease-out forwards`,
            animationDelay: `${(i % 6) * 80}ms`,
            transform: `rotate(${i * 30}deg)`, opacity: 0.9,
          }} />
      ))}
    </div>
  );
}
