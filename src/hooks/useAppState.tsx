import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  emptyStudentData, SEED_USERS, seedStudentData, DEFAULT_MENTOR_ID,
  POINTS, levelFromPoints, xpInLevel, xpToNextLevel, DEFAULT_SUBJECTS,
  DEFAULT_PLAN_TEMPLATES, DEFAULT_TOUR_STEPS,
  QPOOL_MEWAR, FOUNDATION_QS, PLACEMENT_MCQS, DEFAULT_BATCHES, DEFAULT_TESTS,
  DEFAULT_PYQ_BANK,
} from "@/data";
import type {
  AppState, User, Role, Route, QuizResult, ChartState, ChartStatus, DaySlot,
  Override, Attempt, MainsScore, StudentData, PointEvent, PointKind, CommitmentScope,
  SubjectCatalogEntry, Assessment, PlanTemplate, TourStep, Question, Batch, Announcement,
  Test, TestAttempt, TestSchedule, PYQ,
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
  markOverrideSeen: (studentId: string, overrideId: number) => void;
  addMainsScore: (studentId: string, score: MainsScore) => void;
  markPyqReviewed: (studentId: string, label: string) => void;

  // multi-topic helpers
  topicCleared: (studentId: string, day: number, topicId: string) => boolean;
  dayCleared: (studentId: string, day: number) => boolean;
  completedDays: (studentId: string) => number[];

  students: User[];
  mentors: User[];
  levelInfo: (studentId: string) => { level: number; xpInLevel: number; xpToNextLevel: number; total: number };

  // subject catalog (admin-managed)
  /** Resolve a topic against the runtime catalog (admin edits are reflected). */
  findTopicLive: (topicId: string) => { subject: SubjectCatalogEntry; topic: { id: string; name: string } } | null;
  setSubjects: (next: SubjectCatalogEntry[]) => void;
  upsertSubject: (s: SubjectCatalogEntry) => void;
  archiveSubject: (subjectId: string) => void;
  upsertTopic: (subjectId: string, topic: import("@/types").Topic) => void;
  removeTopic: (subjectId: string, topicId: string) => void;

  // user/admin ops
  addUser: (u: Omit<User, "id" | "createdAt"> & { id?: string }) => User;
  assignStudentToMentor: (studentId: string, mentorId: string) => void;
  setAdminTab: (tab: "people" | "catalog" | "plans" | "tour" | "questions" | "batches" | "tests" | "stats") => void;

  // Tests (admin-managed)
  upsertTest: (t: Test) => void;
  archiveTest: (id: string) => void;
  unarchiveTest: (id: string) => void;
  removeTest: (id: string) => void;

  // Test attempts (student-side)
  setActiveTestId: (id: string | null) => void;
  setActiveAttemptId: (id: string | null) => void;
  /** Start a new attempt for the given test and student. Returns the attempt id. */
  startTestAttempt: (testId: string, studentId: string) => string;
  /** Persist an in-progress attempt's answer map. */
  saveTestAnswers: (attemptId: string, answers: Record<string, number>) => void;
  /** Finish the attempt — accepts the final answer map and section scores. */
  finishTestAttempt: (attemptId: string, payload: {
    answers: Record<string, number>;
    score: number;
    maxScore: number;
    sectionScores: Record<string, { right: number; wrong: number; unattempted: number; marks: number }>;
  }) => void;

  // PYQ bank (admin-managed)
  upsertPYQ: (p: PYQ) => void;
  removePYQ: (id: string) => void;

  // Test scheduling (admin-managed)
  upsertTestSchedule: (s: TestSchedule) => void;
  removeTestSchedule: (id: string) => void;
  /** Schedules targeting the given test, optionally filtered to active windows. */
  schedulesForTest: (testId: string) => TestSchedule[];
  /** Schedules visible to a given student (matching their batch + currently in window). */
  activeSchedulesForStudent: (studentId: string) => TestSchedule[];

  // Batches / cohorts (admin-managed)
  upsertBatch: (b: Batch) => void;
  archiveBatch: (id: string) => void;
  unarchiveBatch: (id: string) => void;
  assignStudentToBatch: (studentId: string, batchId: string | null) => void;
  /** All students whose batchId matches the given batch id. */
  batchStudents: (batchId: string) => User[];
  /** The Batch object for a student, or null. */
  batchForStudent: (studentId: string) => Batch | null;

  // Announcements
  postAnnouncement: (batchId: string | null, body: string, expiresAt?: number) => Announcement;
  deleteAnnouncement: (id: string) => void;
  dismissAnnouncement: (id: string, userId: string) => void;
  /** Active (non-expired) announcements visible to a given student. Oldest first. */
  announcementsForStudent: (studentId: string) => Announcement[];

  // assessment (per-student, captured once on signup)
  setAssessment: (studentId: string, assessment: Assessment) => void;

  // plan templates (admin-managed)
  setPlanTemplates: (next: PlanTemplate[]) => void;
  upsertPlanTemplate: (tpl: PlanTemplate) => void;
  removePlanTemplate: (id: string) => void;
  /** Copy a template's days into the student's chart and record the choice. */
  adoptPlanTemplate: (studentId: string, templateId: string) => void;
  /** Wipe student's chart so they start from a blank slate, recording the "built own" choice. */
  startBlankPlan: (studentId: string) => void;

  // Introduction Tour (admin-managed steps + per-student progress)
  setTourSteps: (next: TourStep[]) => void;
  upsertTourStep: (step: TourStep) => void;
  removeTourStep: (id: string) => void;
  reorderTourSteps: (orderedIds: string[]) => void;
  markTourSeen: (studentId: string) => void;

  // Question pools (admin-managed)
  setQuizPool: (next: Question[]) => void;
  upsertQuizQuestion: (idx: number, q: Question) => void;
  addQuizQuestion: (q: Question) => void;
  removeQuizQuestion: (idx: number) => void;
  setFoundationPool: (next: Record<string, Question[]>) => void;
  upsertFoundationQuestion: (concept: string, idx: number, q: Question) => void;
  addFoundationQuestion: (concept: string, q: Question) => void;
  removeFoundationQuestion: (concept: string, idx: number) => void;
  setPlacementPool: (next: Question[]) => void;
  upsertPlacementQuestion: (idx: number, q: Question) => void;
  addPlacementQuestion: (q: Question) => void;
  removePlacementQuestion: (idx: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // v3 keys — schema changed from single-topic to multi-topic days; ignore old data.
  const [users, setUsers] = useLocalStorage<User[]>("v5_users", SEED_USERS);
  const [studentData, setStudentData] = useLocalStorage<Record<string, StudentData>>("v5_studentData", seedStudentData());
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>("v5_currentUserId", null);
  const [route, setRoute] = useLocalStorage<Route>("v5_route", "auto");
  const [loginRoleIntent, setLoginRoleIntent] = useLocalStorage<Role | null>("v5_loginRoleIntent", null);
  const [activeDay, setActiveDay] = useLocalStorage<number | null>("v5_activeDay", null);
  const [activeTopicId, setActiveTopicId] = useLocalStorage<string | null>("v5_activeTopicId", null);
  const [attemptSeed, setAttemptSeed] = useLocalStorage<number>("v5_attemptSeed", 1);
  const [lastResult, setLastResult] = useLocalStorage<QuizResult | null>("v5_lastResult", null);
  const [viewingStudentId, setViewingStudentId] = useLocalStorage<string | null>("v5_viewingStudentId", null);
  const [activeTestId, setActiveTestId] = useLocalStorage<string | null>("v5_activeTestId", null);
  const [activeAttemptId, setActiveAttemptId] = useLocalStorage<string | null>("v5_activeAttemptId", null);
  const [subjects, setSubjects] = useLocalStorage<SubjectCatalogEntry[]>("v5_subjects", DEFAULT_SUBJECTS);
  const [planTemplates, setPlanTemplates] = useLocalStorage<PlanTemplate[]>("v5_planTemplates", DEFAULT_PLAN_TEMPLATES);
  const [tourSteps, setTourSteps] = useLocalStorage<TourStep[]>("v5_tourSteps", DEFAULT_TOUR_STEPS);
  const [quizPool, setQuizPool] = useLocalStorage<Question[]>("v5_quizPool", QPOOL_MEWAR);
  const [foundationPool, setFoundationPool] = useLocalStorage<Record<string, Question[]>>("v5_foundationPool", FOUNDATION_QS);
  const [placementPool, setPlacementPool] = useLocalStorage<Question[]>("v5_placementPool", PLACEMENT_MCQS);
  const [batches, setBatches] = useLocalStorage<Batch[]>("v5_batches", DEFAULT_BATCHES);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>("v5_announcements", []);
  const [tests, setTests] = useLocalStorage<Test[]>("v5_tests", DEFAULT_TESTS);
  const [testAttempts, setTestAttempts] = useLocalStorage<TestAttempt[]>("v5_testAttempts", []);
  const [testSchedules, setTestSchedules] = useLocalStorage<TestSchedule[]>("v5_testSchedules", []);
  const [pyqBank, setPyqBank] = useLocalStorage<PYQ[]>("v5_pyqBank", DEFAULT_PYQ_BANK);
  const [adminTab, setAdminTab] = useLocalStorage<"people" | "catalog" | "plans" | "tour" | "questions" | "batches" | "tests" | "stats">("v5_adminTab", "people");

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const mentors = useMemo(() => users.filter((u) => u.role === "mentor"), [users]);

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
    // Stamp decidedAt the first time the override gets a non-pending status, so the
    // student banner can show "1h ago" attribution.
    const stamped: Override = override.status !== "pending" && !override.decidedAt
      ? { ...override, decidedAt: Date.now() }
      : override;
    patchStudent(id, (s) => ({ ...s, overrides: s.overrides.map((o) => o.id === stamped.id ? stamped : o) }));
  }, [patchStudent]);

  const markOverrideSeen = useCallback((id: string, overrideId: number) => {
    patchStudent(id, (s) => ({
      ...s,
      overrides: s.overrides.map((o) => o.id === overrideId ? { ...o, seenByStudent: true } : o),
    }));
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

  /* ---------- subject catalog (admin) ---------- */

  const findTopicLive = useCallback((topicId: string) => {
    for (const s of subjects) {
      const t = s.topics.find((t) => t.id === topicId);
      if (t) return { subject: s, topic: t };
    }
    return null;
  }, [subjects]);

  const upsertSubject = useCallback((s: SubjectCatalogEntry) => {
    setSubjects((prev) => {
      const i = prev.findIndex((x) => x.id === s.id);
      if (i < 0) return [...prev, s];
      const next = [...prev]; next[i] = s; return next;
    });
  }, [setSubjects]);

  const archiveSubject = useCallback((subjectId: string) => {
    setSubjects((prev) => prev.map((s) => s.id === subjectId ? { ...s, archived: true } : s));
  }, [setSubjects]);

  const upsertTopic = useCallback((subjectId: string, topic: import("@/types").Topic) => {
    setSubjects((prev) => prev.map((s) => {
      if (s.id !== subjectId) return s;
      const i = s.topics.findIndex((t) => t.id === topic.id);
      if (i < 0) return { ...s, topics: [...s.topics, topic] };
      const topics = [...s.topics]; topics[i] = topic;
      return { ...s, topics };
    }));
  }, [setSubjects]);

  const removeTopic = useCallback((subjectId: string, topicId: string) => {
    setSubjects((prev) => prev.map((s) => s.id !== subjectId ? s : { ...s, topics: s.topics.filter((t) => t.id !== topicId) }));
  }, [setSubjects]);

  /* ---------- user ops (admin) ---------- */

  const addUser = useCallback((u: Omit<User, "id" | "createdAt"> & { id?: string }) => {
    // Append a small random suffix so rapid-fire calls (bulk import) don't collide on Date.now().
    const fallbackId = `u_${u.role}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const created: User = { id: u.id || fallbackId, createdAt: Date.now(), ...u } as User;
    setUsers((prev) => [...prev, created]);
    if (created.role === "student") {
      setStudentData((prev) => prev[created.id] ? prev : { ...prev, [created.id]: emptyStudentData() });
    }
    return created;
  }, [setUsers, setStudentData]);

  const assignStudentToMentor = useCallback((studentId: string, mentorId: string) => {
    setUsers((prev) => prev.map((u) => u.id === studentId && u.role === "student" ? { ...u, mentorId } : u));
  }, [setUsers]);

  /* ---------- assessment (per-student) ---------- */

  const setAssessment = useCallback((id: string, assessment: Assessment) => {
    patchStudent(id, { assessment });
  }, [patchStudent]);

  /* ---------- plan templates (admin-managed) ---------- */

  const upsertPlanTemplate = useCallback((tpl: PlanTemplate) => {
    setPlanTemplates((prev) => {
      const i = prev.findIndex((t) => t.id === tpl.id);
      if (i < 0) return [...prev, tpl];
      const next = [...prev]; next[i] = tpl; return next;
    });
  }, [setPlanTemplates]);

  const removePlanTemplate = useCallback((tplId: string) => {
    setPlanTemplates((prev) => prev.filter((t) => t.id !== tplId));
  }, [setPlanTemplates]);

  const adoptPlanTemplate = useCallback((id: string, templateId: string) => {
    const tpl = planTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    patchStudent(id, (s) => ({
      ...s,
      adoptedTemplateId: templateId,
      chart: {
        ...s.chart,
        days: tpl.days.map((slots) => slots.map((slot) => ({ ...slot }))),
        commitmentScope: tpl.scope,
        status: "draft",
      },
    }));
  }, [patchStudent, planTemplates]);

  const startBlankPlan = useCallback((id: string) => {
    patchStudent(id, (s) => ({
      ...s,
      adoptedTemplateId: null,
      chart: { ...s.chart, days: [], status: "draft" },
    }));
  }, [patchStudent]);

  /* ---------- Introduction Tour ---------- */

  const upsertTourStep = useCallback((step: TourStep) => {
    setTourSteps((prev) => {
      const i = prev.findIndex((s) => s.id === step.id);
      if (i < 0) return [...prev, step];
      const next = [...prev]; next[i] = step; return next;
    });
  }, [setTourSteps]);

  const removeTourStep = useCallback((id: string) => {
    setTourSteps((prev) => prev.filter((s) => s.id !== id));
  }, [setTourSteps]);

  const reorderTourSteps = useCallback((orderedIds: string[]) => {
    setTourSteps((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      const next = orderedIds.map((id, i) => {
        const s = map.get(id);
        return s ? { ...s, order: (i + 1) * 10 } : null;
      }).filter(Boolean) as TourStep[];
      // Append any not in orderedIds (defensive, shouldn't happen).
      for (const s of prev) {
        if (!next.find((n) => n.id === s.id)) next.push(s);
      }
      return next;
    });
  }, [setTourSteps]);

  const markTourSeen = useCallback((id: string) => {
    patchStudent(id, { hasSeenTour: true });
  }, [patchStudent]);

  /* ---------- Question pools (admin-managed) ---------- */

  const upsertQuizQuestion = useCallback((idx: number, q: Question) => {
    setQuizPool((prev) => {
      const next = [...prev];
      if (idx >= 0 && idx < next.length) next[idx] = q;
      return next;
    });
  }, [setQuizPool]);
  const addQuizQuestion = useCallback((q: Question) => {
    setQuizPool((prev) => [...prev, q]);
  }, [setQuizPool]);
  const removeQuizQuestion = useCallback((idx: number) => {
    setQuizPool((prev) => prev.filter((_, i) => i !== idx));
  }, [setQuizPool]);

  const upsertFoundationQuestion = useCallback((concept: string, idx: number, q: Question) => {
    setFoundationPool((prev) => {
      const list = prev[concept] ? [...prev[concept]] : [];
      if (idx >= 0 && idx < list.length) list[idx] = q;
      return { ...prev, [concept]: list };
    });
  }, [setFoundationPool]);
  const addFoundationQuestion = useCallback((concept: string, q: Question) => {
    setFoundationPool((prev) => ({ ...prev, [concept]: [...(prev[concept] || []), q] }));
  }, [setFoundationPool]);
  const removeFoundationQuestion = useCallback((concept: string, idx: number) => {
    setFoundationPool((prev) => {
      const list = (prev[concept] || []).filter((_, i) => i !== idx);
      const next = { ...prev };
      if (list.length === 0) delete next[concept];
      else next[concept] = list;
      return next;
    });
  }, [setFoundationPool]);

  const upsertPlacementQuestion = useCallback((idx: number, q: Question) => {
    setPlacementPool((prev) => {
      const next = [...prev];
      if (idx >= 0 && idx < next.length) next[idx] = q;
      return next;
    });
  }, [setPlacementPool]);
  const addPlacementQuestion = useCallback((q: Question) => {
    setPlacementPool((prev) => [...prev, q]);
  }, [setPlacementPool]);
  const removePlacementQuestion = useCallback((idx: number) => {
    setPlacementPool((prev) => prev.filter((_, i) => i !== idx));
  }, [setPlacementPool]);

  /* ---------- Batches / cohorts ---------- */

  const upsertBatch = useCallback((b: Batch) => {
    setBatches((prev) => {
      const i = prev.findIndex((x) => x.id === b.id);
      if (i < 0) return [...prev, b];
      const next = [...prev]; next[i] = b; return next;
    });
  }, [setBatches]);

  const archiveBatch = useCallback((id: string) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, archived: true } : b));
  }, [setBatches]);

  const unarchiveBatch = useCallback((id: string) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, archived: false } : b));
  }, [setBatches]);

  const assignStudentToBatch = useCallback((studentId: string, batchId: string | null) => {
    setUsers((prev) => prev.map((u) =>
      u.id === studentId && u.role === "student"
        ? { ...u, batchId: batchId || undefined }
        : u
    ));
  }, [setUsers]);

  const batchStudents = useCallback((batchId: string): User[] => {
    return users.filter((u) => u.role === "student" && u.batchId === batchId);
  }, [users]);

  const batchForStudent = useCallback((studentId: string): Batch | null => {
    const u = users.find((x) => x.id === studentId);
    if (!u || !u.batchId) return null;
    return batches.find((b) => b.id === u.batchId) || null;
  }, [users, batches]);

  /* ---------- Announcements ---------- */

  const postAnnouncement = useCallback((batchId: string | null, body: string, expiresAt?: number): Announcement => {
    const ann: Announcement = {
      id: `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      batchId,
      body: body.trim(),
      postedAt: Date.now(),
      postedBy: currentUserId || "system",
      expiresAt,
      dismissedBy: [],
    };
    setAnnouncements((prev) => [...prev, ann]);
    return ann;
  }, [setAnnouncements, currentUserId]);

  const deleteAnnouncement = useCallback((id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, [setAnnouncements]);

  const dismissAnnouncement = useCallback((id: string, userId: string) => {
    setAnnouncements((prev) => prev.map((a) =>
      a.id === id && !a.dismissedBy.includes(userId)
        ? { ...a, dismissedBy: [...a.dismissedBy, userId] }
        : a
    ));
  }, [setAnnouncements]);

  const announcementsForStudent = useCallback((studentId: string): Announcement[] => {
    const u = users.find((x) => x.id === studentId);
    if (!u) return [];
    const now = Date.now();
    return announcements
      .filter((a) => !a.expiresAt || a.expiresAt > now)
      .filter((a) => a.batchId === null || a.batchId === u.batchId)
      .filter((a) => !a.dismissedBy.includes(studentId))
      .sort((a, b) => a.postedAt - b.postedAt);
  }, [users, announcements]);

  /* ---------- Tests (admin-managed) ---------- */

  const upsertTest = useCallback((t: Test) => {
    setTests((prev) => {
      const i = prev.findIndex((x) => x.id === t.id);
      if (i < 0) return [...prev, t];
      const next = [...prev]; next[i] = t; return next;
    });
  }, [setTests]);

  const archiveTest = useCallback((id: string) => {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, archived: true } : t));
  }, [setTests]);

  const unarchiveTest = useCallback((id: string) => {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, archived: false } : t));
  }, [setTests]);

  const removeTest = useCallback((id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    setTestAttempts((prev) => prev.filter((a) => a.testId !== id));
  }, [setTests, setTestAttempts]);

  /* ---------- Test attempts ---------- */

  const startTestAttempt = useCallback((testId: string, studentId: string): string => {
    const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const attempt: TestAttempt = {
      id, testId, studentId,
      startedAt: Date.now(),
      answers: {},
    };
    setTestAttempts((prev) => [...prev, attempt]);
    return id;
  }, [setTestAttempts]);

  const saveTestAnswers = useCallback((attemptId: string, answers: Record<string, number>) => {
    setTestAttempts((prev) => prev.map((a) => a.id === attemptId ? { ...a, answers } : a));
  }, [setTestAttempts]);

  const finishTestAttempt = useCallback((attemptId: string, payload: {
    answers: Record<string, number>;
    score: number;
    maxScore: number;
    sectionScores: Record<string, { right: number; wrong: number; unattempted: number; marks: number }>;
  }) => {
    setTestAttempts((prev) => prev.map((a) => a.id === attemptId ? {
      ...a,
      finishedAt: Date.now(),
      answers: payload.answers,
      score: payload.score,
      maxScore: payload.maxScore,
      sectionScores: payload.sectionScores,
    } : a));
  }, [setTestAttempts]);

  /* ---------- Test scheduling ---------- */

  const upsertTestSchedule = useCallback((s: TestSchedule) => {
    setTestSchedules((prev) => {
      const i = prev.findIndex((x) => x.id === s.id);
      if (i < 0) return [...prev, s];
      const next = [...prev]; next[i] = s; return next;
    });
  }, [setTestSchedules]);

  const removeTestSchedule = useCallback((id: string) => {
    setTestSchedules((prev) => prev.filter((s) => s.id !== id));
  }, [setTestSchedules]);

  const schedulesForTest = useCallback((testId: string): TestSchedule[] => {
    return testSchedules.filter((s) => s.testId === testId);
  }, [testSchedules]);

  const upsertPYQ = useCallback((p: PYQ) => {
    setPyqBank((prev) => {
      const id = p.id || `pyq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const withId = { ...p, id };
      const i = prev.findIndex((x) => x.id === id);
      if (i < 0) return [...prev, withId];
      const next = [...prev]; next[i] = withId; return next;
    });
  }, [setPyqBank]);

  const removePYQ = useCallback((id: string) => {
    setPyqBank((prev) => prev.filter((p) => p.id !== id));
  }, [setPyqBank]);

  const activeSchedulesForStudent = useCallback((studentId: string): TestSchedule[] => {
    const u = users.find((x) => x.id === studentId);
    if (!u) return [];
    const now = Date.now();
    return testSchedules.filter((s) => {
      const batchOk = s.batchIds.length === 0 || (u.batchId && s.batchIds.includes(u.batchId));
      const released = s.releaseAt <= now;
      const open = !s.closeAt || s.closeAt > now;
      return batchOk && released && open;
    });
  }, [testSchedules, users]);

  const value: AppContextValue = {
    users, currentUserId, studentData, subjects, planTemplates, tourSteps,
    quizPool, foundationPool, placementPool, adminTab,
    loginRoleIntent, route, activeDay, activeTopicId, attemptSeed, lastResult, viewingStudentId,
    currentUser, students, mentors,
    loginAs, logout, setLoginRoleIntent, setRoute, setActiveDay, setActiveTopicId, setAttemptSeed, setLastResult,
    setViewingStudentId, resetAll,
    getStudent, setChart, submitChartForApproval, approveChart, requestChartChanges,
    isDayUnlocked,
    finishQuiz, addOverride, updateOverride, markOverrideSeen, addMainsScore, markPyqReviewed,
    topicCleared, dayCleared, completedDays,
    levelInfo,
    findTopicLive,
    setSubjects, upsertSubject, archiveSubject, upsertTopic, removeTopic,
    addUser, assignStudentToMentor, setAdminTab,
    setAssessment,
    setPlanTemplates, upsertPlanTemplate, removePlanTemplate, adoptPlanTemplate, startBlankPlan,
    setTourSteps, upsertTourStep, removeTourStep, reorderTourSteps, markTourSeen,
    setQuizPool, upsertQuizQuestion, addQuizQuestion, removeQuizQuestion,
    setFoundationPool, upsertFoundationQuestion, addFoundationQuestion, removeFoundationQuestion,
    setPlacementPool, upsertPlacementQuestion, addPlacementQuestion, removePlacementQuestion,
    batches,
    upsertBatch, archiveBatch, unarchiveBatch, assignStudentToBatch, batchStudents, batchForStudent,
    announcements,
    postAnnouncement, deleteAnnouncement, dismissAnnouncement, announcementsForStudent,
    tests, testAttempts, testSchedules, activeTestId, activeAttemptId,
    upsertTest, archiveTest, unarchiveTest, removeTest,
    setActiveTestId, setActiveAttemptId,
    startTestAttempt, saveTestAnswers, finishTestAttempt,
    upsertTestSchedule, removeTestSchedule, schedulesForTest, activeSchedulesForStudent,
    pyqBank,
    upsertPYQ, removePYQ,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export type { DaySlot };
