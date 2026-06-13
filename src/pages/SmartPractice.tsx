/**
 * Smart Practice — mode picker (Adaptive PR 3)
 *
 * Entry point for the adaptive session flow. The student picks a mode and a
 * duration, we run the pure selector, stash the planned session on the
 * context, and route to SmartSessionScreen.
 *
 * Modes shipped in PR 3:
 *   - Prelims practice  (general adaptive session: due + new)
 *   - Rajasthan focus   (Rajasthan-flagged topics only)
 *   - Weak area drill   (sorted by ascending confidence)
 *
 * Deferred: subject_drill (needs subject picker), pyq_mode, full mock, mains.
 */

import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { buildSession, type SessionMode } from "@/lib/selector";
import { ArrowRight, Brain, MapPin, Sparkles, X } from "lucide-react";

type ModeCard = {
  id: SessionMode;
  title: string;
  tagline: string;
  icon: React.ReactNode;
  // Static class strings (Tailwind JIT can't see template-string classes).
  activeBorder: string;
  activeBg: string;
  iconActive: string;
};

const MODES: ModeCard[] = [
  {
    id: "prelims_practice",
    title: "Prelims practice",
    tagline: "Due reviews first, then new ground. The default mix.",
    icon: <Sparkles className="w-5 h-5" />,
    activeBorder: "border-indigo-500",
    activeBg: "bg-indigo-50",
    iconActive: "bg-indigo-600 text-white",
  },
  {
    id: "rajasthan_focus",
    title: "Rajasthan focus",
    tagline: "Drill only the Rajasthan-flagged topics. High exam weight.",
    icon: <MapPin className="w-5 h-5" />,
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50",
    iconActive: "bg-amber-600 text-white",
  },
  {
    id: "weak_area_drill",
    title: "Weak area drill",
    tagline: "Lowest confidence first — close your gaps fastest.",
    icon: <Brain className="w-5 h-5" />,
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-50",
    iconActive: "bg-rose-600 text-white",
  },
];

const DURATIONS = [10, 20, 30, 45];

export function SmartPractice() {
  const {
    currentUser, getStudent, subjects, quizPool, setRoute,
    setActiveSession, setActiveSessionMeta,
  } = useAppState();
  const [mode, setMode] = useState<SessionMode>("prelims_practice");
  const [minutes, setMinutes] = useState<number>(20);

  if (!currentUser) return null;
  const student = getStudent(currentUser.id);

  const start = () => {
    const items = buildSession({
      studentData: student,
      subjects,
      questionPool: quizPool,
      mode,
      durationMinutes: minutes,
      now: Date.now(),
    });
    if (items.length === 0) {
      // No-op: leave the picker open. The empty state is rare (only if
      // every topic was archived and no records exist). Future improvement:
      // toast or inline warning. For now the disabled button signals it.
      return;
    }
    setActiveSession(items);
    setActiveSessionMeta({ mode, startedAt: Date.now() });
    setRoute("smart_session");
  };

  const session = buildSession({
    studentData: student,
    subjects,
    questionPool: quizPool,
    mode,
    durationMinutes: minutes,
    now: Date.now(),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setRoute("home")}
            className="text-slate-400 hover:text-slate-700 transition"
            aria-label="Back to home"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Smart Practice</div>
            <div className="text-xs text-slate-500">Adaptive session — picks questions for you</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <section>
          <h2 className="text-xs uppercase font-bold tracking-wide text-slate-500 mb-3">Pick a mode</h2>
          <div className="space-y-2">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-start gap-3 ${
                    active
                      ? `${m.activeBorder} ${m.activeBg}`
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    active ? m.iconActive : "bg-slate-100 text-slate-500"
                  }`}>
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{m.title}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{m.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase font-bold tracking-wide text-slate-500 mb-3">Duration</h2>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((d) => {
              const active = minutes === d;
              return (
                <button
                  key={d}
                  onClick={() => setMinutes(d)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {d} min
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            ≈ {session.length} question{session.length === 1 ? "" : "s"} at this duration.
          </div>
        </section>

        <div className="pt-2">
          <Button onClick={start} disabled={session.length === 0} className="w-full justify-center">
            Start session <ArrowRight className="w-4 h-4" />
          </Button>
          {session.length === 0 && (
            <p className="text-xs text-amber-700 mt-2 text-center">
              No topics available for this mode yet. Try Prelims practice, or finish a day quiz first to build up topic history.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
