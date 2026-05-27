import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  emptyStudentData, SEED_USERS, seedStudentData, DEFAULT_MENTOR_ID,
  POINTS, levelFromPoints, xpInLevel, xpToNextLevel,
} from "@/data";
import type {
  AppState, User, Role, Route, QuizResult, ChartState, ChartStatus, DaySlot,
  Override, Attempt, MainsScore, StudentData, PointEvent, PointKind,
} from "@/types";

interface AppContextValue extends AppState {
  // session
  currentUser: User | null;
  loginAs: (role: Role, email: string, name: string) => void;
  logout: () => void;
  setLoginRoleIntent: (role: Role | null) => void;
  setRoute: (route: Route) => void;
  setActiveDay: (day: number | null) => void;
  setAttemptSeed: (seed: number | ((prev: number) => number)) => void;
  setLastResult: (result: QuizResult | null) => void;
  setViewingStudentId: (id: string | null) => void;
  resetAll: () => void;

  // student-data accessors
  getStudent: (studentId: string) => StudentData;
  setChart: (studentId: string, chart: ChartState) => void;
  submitChartForApproval: (studentId: string) => void;
  approveChart: (studentId: string) => void;
  requestChartChanges: (studentId: string, feedback?: string) => void;
  finishQuiz: (studentId: string, attempt: Attempt) => number;
  addOverride: (studentId: string, override: Override) => void;
  updateOverride: (studentId: string, override: Override) => void;
  addMainsScore: (studentId: string, score: MainsScore) => void;
  markPyqReviewed: (studentId: string, label: string) => void;

  students: User[];
  levelInfo: (studentId: string) => { level: number; xpInLevel: number; xpToNextLevel: number; total: number };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useLocalStorage<User[]>("v2_users", SEED_USERS);
  const [studentData, setStudentData] = useLocalStorage<Record<string, StudentData>>("v2_studentData", seedStudentData());
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>("v2_currentUserId", null);
  const [route, setRoute] = useLocalStorage<Route>("v2_route", "auto");
  const [loginRoleIntent, setLoginRoleIntent] = useLocalStorage<Role | null>("v2_loginRoleIntent", null);
  const [activeDay, setActiveDay] = useLocalStorage<number | null>("v2_activeDay", null);
  const [attemptSeed, setAttemptSeed] = useLocalStorage<number>("v2_attemptSeed", 1);
  const [lastResult, setLastResult] = useLocalStorage<QuizResult | null>("v2_lastResult", null);
  const [viewingStudentId, setViewingStudentId] = useLocalStorage<string | null>("v2_viewingStudentId", null);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);

  /* ---------- session ---------- */

  const loginAs = useCallback((role: Role, email: string, name: string) => {
    const lowerEmail = email.trim().toLowerCase();
    let user = users.find((u) => u.email.toLowerCase() === lowerEmail && u.role === role);
    if (!user) {
      user = {
        id: `u_${role}_${Date.now()}`,
        email: lowerEmail,
        name: name.trim() || lowerEmail.split("@")[0],
        role,
        mentorId: role === "student" ? DEFAULT_MENTOR_ID : undefined,
        createdAt: Date.now(),
      };
      setUsers((prev) => [...prev, user!]);
      if (role === "student") {
        setStudentData((prev) => ({ ...prev, [user!.id]: emptyStudentData() }));
      }
    }
    setCurrentUserId(user.id);
    setLoginRoleIntent(null);
    setRoute("auto");
  }, [users, setUsers, setStudentData, setCurrentUserId, setLoginRoleIntent, setRoute]);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setRoute("landing");
    setActiveDay(null);
    setLastResult(null);
    setViewingStudentId(null);
  }, [setCurrentUserId, setRoute, setActiveDay, setLastResult, setViewingStudentId]);

  const resetAll = useCallback(() => {
    if (confirm("Reset all local data and start over?")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  /* ---------- student data helpers ---------- */

  const getStudent = useCallback((id: string): StudentData => {
    return studentData[id] || emptyStudentData();
  }, [studentData]);

  const patchStudent = useCallback((id: string, patch: Partial<StudentData> | ((s: StudentData) => StudentData)) => {
    setStudentData((prev) => {
      const cur = prev[id] || emptyStudentData();
      const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
      return { ...prev, [id]: { ...next, lastActivityAt: Date.now() } };
    });
  }, [setStudentData]);

  const setChart = useCallback((id: string, chart: ChartState) => {
    patchStudent(id, { chart });
  }, [patchStudent]);

  const submitChartForApproval = useCallback((id: string) => {
    patchStudent(id, (s) => ({ ...s, chart: { ...s.chart, status: "pending_approval", submittedAt: Date.now() } }));
  }, [patchStudent]);

  const awardPoints = (s: StudentData, kind: PointKind, amount: number, meta?: PointEvent["meta"]): StudentData => {
    const evt: PointEvent = { id: Date.now() + Math.random(), when: Date.now(), kind, amount, meta };
    return { ...s, points: { total: s.points.total + amount, history: [...s.points.history, evt] } };
  };

  const approveChart = useCallback((id: string) => {
    patchStudent(id, (s) => {
      const updated: StudentData = { ...s, chart: { ...s.chart, status: "approved" as ChartStatus, decidedAt: Date.now() } };
      const already = s.points.history.some((e) => e.kind === "chart_approved");
      return already ? updated : awardPoints(updated, "chart_approved", POINTS.CHART_APPROVED);
    });
  }, [patchStudent]);

  const requestChartChanges = useCallback((id: string, feedback?: string) => {
    patchStudent(id, (s) => ({ ...s, chart: { ...s.chart, status: "changes_requested", decidedAt: Date.now(), feedback } }));
  }, [patchStudent]);

  const finishQuiz = useCallback((id: string, attempt: Attempt) => {
    let pointsAwarded = 0;
    patchStudent(id, (s) => {
      const attemptsForDay = s.attempts.filter((a) => a.day === attempt.day);
      const isFirstTry = attemptsForDay.length === 0;
      const passed = attempt.score >= 80
        || s.overrides.some((o) => o.day === attempt.day && o.status === "approved");

      let next: StudentData = { ...s, attempts: [...s.attempts, attempt] };

      if (passed) {
        next = {
          ...next,
          progress: {
            ...next.progress,
            completed: Array.from(new Set([...next.progress.completed, attempt.day])),
            currentDay: Math.max(next.progress.currentDay, attempt.day + 1),
          },
        };
        next = awardPoints(next, "quiz_pass", POINTS.QUIZ_PASS, { day: attempt.day });
        pointsAwarded += POINTS.QUIZ_PASS;
        if (isFirstTry && attempt.score >= 80) {
          next = awardPoints(next, "first_try_bonus", POINTS.FIRST_TRY_BONUS, { day: attempt.day });
          pointsAwarded += POINTS.FIRST_TRY_BONUS;
        }
      }
      return next;
    });
    return pointsAwarded;
  }, [patchStudent]);

  const addOverride = useCallback((id: string, override: Override) => {
    patchStudent(id, (s) => ({ ...s, overrides: [...s.overrides, override] }));
  }, [patchStudent]);

  const updateOverride = useCallback((id: string, override: Override) => {
    patchStudent(id, (s) => ({ ...s, overrides: s.overrides.map((o) => o.id === override.id ? override : o) }));
  }, [patchStudent]);

  const addMainsScore = useCallback((id: string, score: MainsScore) => {
    patchStudent(id, (s) => awardPoints({ ...s, mainsScores: [...s.mainsScores, score] }, "mains_submit", POINTS.MAINS_SUBMIT, { day: score.day }));
  }, [patchStudent]);

  const markPyqReviewed = useCallback((id: string, label: string) => {
    patchStudent(id, (s) => {
      if (s.pyqsReviewed.includes(label)) return s;
      return awardPoints({ ...s, pyqsReviewed: [...s.pyqsReviewed, label] }, "pyq_review", POINTS.PYQ_REVIEW, { label });
    });
  }, [patchStudent]);

  const levelInfo = useCallback((id: string) => {
    const s = getStudent(id);
    const total = s.points.total;
    return { total, level: levelFromPoints(total), xpInLevel: xpInLevel(total), xpToNextLevel: xpToNextLevel(total) };
  }, [getStudent]);

  const value: AppContextValue = {
    users, currentUserId, studentData,
    loginRoleIntent, route, activeDay, attemptSeed, lastResult, viewingStudentId,
    currentUser, students,
    loginAs, logout, setLoginRoleIntent, setRoute, setActiveDay, setAttemptSeed, setLastResult,
    setViewingStudentId, resetAll,
    getStudent, setChart, submitChartForApproval, approveChart, requestChartChanges,
    finishQuiz, addOverride, updateOverride, addMainsScore, markPyqReviewed,
    levelInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export type { DaySlot };
