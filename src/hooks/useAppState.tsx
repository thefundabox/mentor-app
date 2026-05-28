import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  emptyStudentData, SEED_USERS, seedStudentData, DEFAULT_MENTOR_ID,
  POINTS, levelFromPoints, xpInLevel, xpToNextLevel,
} from "@/data";
import type {
  AppState, User, Role, Route, QuizResult, ChartState, ChartStatus, DaySlot,
  Override, Attempt, MainsScore, StudentData, PointEvent, PointKind, CommitmentScope,
} from "@/types";
import { SCOPE_DAYS } from "@/types";

interface AppContextValue extends AppState {
  currentUser: User | null;
  loginAs: (role: Role, email: string, name: string) => void;
  logout: () => void;
  setLoginRoleIntent: (role: Role | null) => void;
  setRoute: (route: Route) => void;
  setActiveDay: (day: number | null) => void;
  setActiveTopicId: (topicId: string | null) => void;
  setAttemptSeed: (seed: number | ((prev: number) => number)) => void;
  setLastResult: (result: QuizResult | null) => void;
  setViewingStudentId: (id: string | null) => void;
  resetAll: () => void;

  getStudent: (studentId: string) => StudentData;
  setChart: (studentId: string, chart: ChartState) => void;
  submitChartForApproval: (studentId: string, scope?: CommitmentScope) => void;
  approveChart: (studentId: string) => void;
  requestChartChanges: (studentId: string, feedback?: string) => void;
  /** Returns true if `day` is within the mentor-approved window AND the chart is approved. */
  isDayUnlocked: (studentId: string, day: number) => boolean;
  finishQuiz: (studentId: string, attempt: Attempt) => { pointsAwarded: number; dayClearedNow: boolean; topicsRemainingInDay: number };
  addOverride: (studentId: string, override: Override) => void;
  updateOverride: (studentId: string, override: Override) => void;
  addMainsScore: (studentId: string, score: MainsScore) => void;
  markPyqReviewed: (studentId: string, label: string) => void;

  // multi-topic helpers
  topicCleared: (studentId: string, day: number, topicId: string) => boolean;
  dayCleared: (studentId: string, day: number) => boolean;
  completedDays: (studentId: string) => number[];

  students: User[];
  levelInfo: (studentId: string) => { level: number; xpInLevel: number; xpToNextLevel: number; total: number };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // v3 keys — schema changed from single-topic to multi-topic days; ignore old data.
  const [users, setUsers] = useLocalStorage<User[]>("v4_users", SEED_USERS);
  const [studentData, setStudentData] = useLocalStorage<Record<string, StudentData>>("v4_studentData", seedStudentData());
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>("v4_currentUserId", null);
  const [route, setRoute] = useLocalStorage<Route>("v4_route", "auto");
  const [loginRoleIntent, setLoginRoleIntent] = useLocalStorage<Role | null>("v4_loginRoleIntent", null);
  const [activeDay, setActiveDay] = useLocalStorage<number | null>("v4_activeDay", null);
  const [activeTopicId, setActiveTopicId] = useLocalStorage<string | null>("v4_activeTopicId", null);
  const [attemptSeed, setAttemptSeed] = useLocalStorage<number>("v4_attemptSeed", 1);
  const [lastResult, setLastResult] = useLocalStorage<QuizResult | null>("v4_lastResult", null);
  const [viewingStudentId, setViewingStudentId] = useLocalStorage<string | null>("v4_viewingStudentId", null);

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
    setActiveTopicId(null);
    setLastResult(null);
    setViewingStudentId(null);
  }, [setCurrentUserId, setRoute, setActiveDay, setActiveTopicId, setLastResult, setViewingStudentId]);

  const resetAll = useCallback(() => {
    if (confirm("Reset all local data and start over?")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  /* ---------- student data ---------- */

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

  const submitChartForApproval = useCallback((id: string, scope?: CommitmentScope) => {
    patchStudent(id, (s) => {
      const newScope: CommitmentScope = scope ?? s.chart.commitmentScope ?? "week";
      const sliceSize = SCOPE_DAYS[newScope];
      // Commit from where the mentor last approved up to scope days further (clamped to chart length).
      const from = s.chart.approvedThrough;
      const requested = Math.min(s.chart.days.length, from + sliceSize);
      return {
        ...s,
        chart: {
          ...s.chart,
          status: "pending_approval",
          commitmentScope: newScope,
          committedThrough: Math.max(requested, s.chart.approvedThrough),
          submittedAt: Date.now(),
        },
      };
    });
  }, [patchStudent]);

  const awardPoints = (s: StudentData, kind: PointKind, amount: number, meta?: PointEvent["meta"]): StudentData => {
    const evt: PointEvent = { id: Date.now() + Math.random(), when: Date.now(), kind, amount, meta };
    return { ...s, points: { total: s.points.total + amount, history: [...s.points.history, evt] } };
  };

  const approveChart = useCallback((id: string) => {
    patchStudent(id, (s) => {
      const newApprovedThrough = Math.max(s.chart.approvedThrough, s.chart.committedThrough);
      const updated: StudentData = {
        ...s,
        chart: { ...s.chart, status: "approved" as ChartStatus, approvedThrough: newApprovedThrough, decidedAt: Date.now() },
      };
      const already = s.points.history.some((e) => e.kind === "chart_approved");
      return already ? updated : awardPoints(updated, "chart_approved", POINTS.CHART_APPROVED);
    });
  }, [patchStudent]);

  const requestChartChanges = useCallback((id: string, feedback?: string) => {
    patchStudent(id, (s) => ({ ...s, chart: { ...s.chart, status: "changes_requested", decidedAt: Date.now(), feedback } }));
  }, [patchStudent]);

  /* ---------- multi-topic completion helpers ---------- */

  const isTopicClearedFor = (s: StudentData, day: number, topicId: string): boolean => {
    const hasOverride = s.overrides.some((o) => o.day === day && o.status === "approved");
    if (hasOverride) return true;
    return s.attempts.some((a) => a.day === day && a.topicId === topicId && a.score >= 80);
  };

  const isDayClearedFor = (s: StudentData, day: number): boolean => {
    const topics = s.chart.days[day - 1];
    if (!topics || topics.length === 0) return false;
    return topics.every((t) => isTopicClearedFor(s, day, t.topicId));
  };

  const topicCleared = useCallback((id: string, day: number, topicId: string) => {
    return isTopicClearedFor(getStudent(id), day, topicId);
  }, [getStudent]);

  const dayCleared = useCallback((id: string, day: number) => {
    return isDayClearedFor(getStudent(id), day);
  }, [getStudent]);

  const completedDays = useCallback((id: string) => {
    const s = getStudent(id);
    const out: number[] = [];
    for (let d = 1; d <= s.chart.days.length; d++) {
      if (isDayClearedFor(s, d)) out.push(d);
    }
    return out;
  }, [getStudent]);

  const isDayUnlocked = useCallback((id: string, day: number) => {
    const s = getStudent(id);
    return s.chart.status === "approved" && day <= s.chart.approvedThrough;
  }, [getStudent]);

  const finishQuiz = useCallback((id: string, attempt: Attempt) => {
    let pointsAwarded = 0;
    let dayClearedNow = false;
    let topicsRemainingInDay = 0;

    patchStudent(id, (s) => {
      const attemptsForTopic = s.attempts.filter((a) => a.day === attempt.day && a.topicId === attempt.topicId);
      const isFirstTry = attemptsForTopic.length === 0;
      const wasTopicCleared = isTopicClearedFor(s, attempt.day, attempt.topicId);
      const wasDayCleared = isDayClearedFor(s, attempt.day);
      const passed = attempt.score >= 80
        || s.overrides.some((o) => o.day === attempt.day && o.status === "approved");

      let next: StudentData = { ...s, attempts: [...s.attempts, attempt] };

      if (passed && !wasTopicCleared) {
        next = awardPoints(next, "quiz_pass", POINTS.QUIZ_PASS, { day: attempt.day });
        pointsAwarded += POINTS.QUIZ_PASS;
        if (isFirstTry && attempt.score >= 80) {
          next = awardPoints(next, "first_try_bonus", POINTS.FIRST_TRY_BONUS, { day: attempt.day });
          pointsAwarded += POINTS.FIRST_TRY_BONUS;
        }
      }

      const nowDayCleared = isDayClearedFor(next, attempt.day);
      dayClearedNow = !wasDayCleared && nowDayCleared;
      const topicsInDay = next.chart.days[attempt.day - 1] || [];
      topicsRemainingInDay = topicsInDay.filter((t) => !isTopicClearedFor(next, attempt.day, t.topicId)).length;

      if (nowDayCleared) {
        next = { ...next, progress: { ...next.progress, currentDay: Math.max(next.progress.currentDay, attempt.day + 1) } };
      }
      return next;
    });
    return { pointsAwarded, dayClearedNow, topicsRemainingInDay };
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
    loginRoleIntent, route, activeDay, activeTopicId, attemptSeed, lastResult, viewingStudentId,
    currentUser, students,
    loginAs, logout, setLoginRoleIntent, setRoute, setActiveDay, setActiveTopicId, setAttemptSeed, setLastResult,
    setViewingStudentId, resetAll,
    getStudent, setChart, submitChartForApproval, approveChart, requestChartChanges,
    isDayUnlocked,
    finishQuiz, addOverride, updateOverride, addMainsScore, markPyqReviewed,
    topicCleared, dayCleared, completedDays,
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
