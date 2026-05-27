import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { AppState, Role, Route, QuizResult, DaySlot, Override, Attempt, MainsScore, Progress } from "@/types";

interface AppContextValue extends AppState {
  setRole: (role: Role) => void;
  setChart: (chart: (DaySlot | null)[]) => void;
  setProgress: (progress: Progress) => void;
  setOverrides: (overrides: Override[]) => void;
  setAttempts: (attempts: Attempt[]) => void;
  setMainsScores: (scores: MainsScore[]) => void;
  setRoute: (route: Route) => void;
  setActiveDay: (day: number | null) => void;
  setAttemptSeed: (seed: number | ((prev: number) => number)) => void;
  setLastResult: (result: QuizResult | null) => void;
  addAttempt: (attempt: Attempt) => void;
  addOverride: (override: Override) => void;
  updateOverride: (override: Override) => void;
  addMainsScore: (score: MainsScore) => void;
  completeDay: (day: number, nextDay: number) => void;
  finishQuiz: (attempt: Attempt) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useLocalStorage<Role>("role", "student");
  const [chart, setChart] = useLocalStorage<(DaySlot | null)[]>("chart", []);
  const [progress, setProgress] = useLocalStorage<Progress>("progress", { currentDay: 1, completed: [] });
  const [overrides, setOverrides] = useLocalStorage<Override[]>("overrides", []);
  const [attempts, setAttempts] = useLocalStorage<Attempt[]>("attempts", []);
  const [mainsScores, setMainsScores] = useLocalStorage<MainsScore[]>("mainsScores", []);
  const [route, setRoute] = useLocalStorage<Route>("route", "auto");
  const [activeDay, setActiveDay] = useLocalStorage<number | null>("activeDay", null);
  const [attemptSeed, setAttemptSeed] = useLocalStorage<number>("attemptSeed", 1);
  const [lastResult, setLastResult] = useLocalStorage<QuizResult | null>("lastResult", null);

  const addAttempt = useCallback(
    (attempt: Attempt) => {
      setAttempts((prev) => [...prev, attempt]);
    },
    [setAttempts]
  );

  const addOverride = useCallback(
    (override: Override) => {
      setOverrides((prev) => [...prev, override]);
    },
    [setOverrides]
  );

  const updateOverride = useCallback(
    (override: Override) => {
      setOverrides((prev) => prev.map((o) => (o.id === override.id ? override : o)));
    },
    [setOverrides]
  );

  const addMainsScore = useCallback(
    (score: MainsScore) => {
      setMainsScores((prev) => [...prev, score]);
    },
    [setMainsScores]
  );

  const completeDay = useCallback(
    (day: number, nextDay: number) => {
      setProgress((prev) => ({
        ...prev,
        completed: Array.from(new Set([...prev.completed, day])),
        currentDay: Math.max(prev.currentDay, nextDay),
      }));
    },
    [setProgress]
  );

  const finishQuiz = useCallback(
    (attempt: Attempt) => {
      setAttempts((prev) => [...prev, attempt]);
      const hasOverride = overrides.some(
        (o) => o.day === attempt.day && o.status === "approved"
      );
      if (attempt.score >= 80 || hasOverride) {
        setProgress((prev) => ({
          ...prev,
          completed: Array.from(new Set([...prev.completed, attempt.day])),
          currentDay: Math.max(prev.currentDay, attempt.day + 1),
        }));
      }
    },
    [setAttempts, setProgress, overrides]
  );

  const resetAll = useCallback(() => {
    if (confirm("Reset all local data and start over?")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  const value: AppContextValue = {
    role,
    chart,
    progress,
    overrides,
    attempts,
    mainsScores,
    route,
    activeDay,
    attemptSeed,
    lastResult,
    setRole,
    setChart,
    setProgress,
    setOverrides,
    setAttempts,
    setMainsScores,
    setRoute,
    setActiveDay,
    setAttemptSeed,
    setLastResult,
    addAttempt,
    addOverride,
    updateOverride,
    addMainsScore,
    completeDay,
    finishQuiz,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
