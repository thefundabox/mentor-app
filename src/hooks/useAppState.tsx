import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { supabase, isSupabaseConfigured, type ProfileRow } from "@/lib/supabase";
import { passThresholdOf, clampPassThreshold } from "@/lib/passThreshold";
import { loadPlanTemplates, type PlanTemplateRow } from "@/lib/planStore";
import { loadSubjects, saveSubjects } from "@/lib/subjectStore";
import { loadBatches, saveBatches } from "@/lib/batchStore";
import { syncUrl, parsePath, type AdminTab } from "@/lib/urlRoute";
import {
  loadSettings, saveSettings, DEFAULT_SETTINGS, type InstituteSettings,
} from "@/lib/settingsStore";
import {
  loadFeatureFlags, setFeatureState, featureVisibleTo, DEFAULT_FLAGS,
  type FeatureFlag, type FeatureState,
} from "@/lib/featureStore";
import {
  loadAnnouncements, createAnnouncement, removeAnnouncement, dismissAnnouncementFor,
} from "@/lib/announcementStore";

import {
  loadStudent, loadStudents, loadAllProfiles, saveChart, updateChart, saveProgress,
  insertOverride, decideOverride, markOverrideSeenRemote,
} from "@/lib/studentStore";
import { loadCoverage, type Coverage } from "@/lib/questionStore";
import {
  emptyStudentData, SEED_USERS, seedStudentData, DEFAULT_MENTOR_ID,
  POINTS, levelFromPoints, xpInLevel, xpToNextLevel, DEFAULT_SUBJECTS,
  DEFAULT_PLAN_TEMPLATES, DEFAULT_TOUR_STEPS,
  QPOOL_MEWAR, FOUNDATION_QS, PLACEMENT_MCQS, DEFAULT_BATCHES, DEFAULT_TESTS, hasRealQuestions,
  DEFAULT_PYQ_BANK, DEFAULT_CURRENT_AFFAIRS,
} from "@/data";
import type {
  AppState, User, Role, Route, QuizResult, ChartState, ChartStatus, DaySlot,
  Override, Attempt, MainsScore, StudentData, PointEvent, PointKind, CommitmentScope,
  SubjectCatalogEntry, Assessment, PlanTemplate, TourStep, Question, Batch, Announcement,
  Test, TestAttempt, TestSchedule, PYQ, PyqTarget, CurrentAffairsTopic, StudentTopicRecord,
  SmartSessionRecord,
} from "@/types";
import { SCOPE_DAYS } from "@/types";
import { scheduleNextReview, isTopicRajasthanSpecific, type ReviewSignal } from "@/lib/scheduler";
import type { SessionItem, SessionMode } from "@/lib/selector";
import { recordConfusion } from "@/lib/confusion";
import { deactivateExpiredTopics } from "@/lib/currentAffairs";

/** Result of a sign-in / sign-up attempt. */
export interface AuthResult {
  error?: string;
  /** True when signup succeeded but Supabase is waiting on email confirmation. */
  needsConfirmation?: boolean;
}

interface AppContextValue extends AppState {
  currentUser: User | null;
  /** Local-only fallback sign-in. Used when Supabase is not configured. */
  loginAs: (role: Role, email: string, name: string) => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  /** Published plans from Postgres. Empty in a local-only install. */
  remotePlanTemplates: PlanTemplateRow[];
  /** The institute-wide default plan, from Postgres. Null when none is set. */
  defaultTemplate: PlanTemplateRow | null;
  /** Resolve the fall-back plan for a specific student: batch, then their
      mentor's default, then the institute-wide one. */
  defaultTemplateFor: (studentId: string | null) => PlanTemplateRow | null;
  /** Every real account from public.profiles. Admin/mentor only, per RLS. */
  listProfiles: () => Promise<ProfileRow[]>;
  /** Change a user's role via the admin-checked RPC. */
  setUserRole: (userId: string, role: Role) => Promise<AuthResult>;
  /** Assign or clear a student's mentor via the admin-checked RPC. */
  setUserMentor: (studentId: string, mentorId: string | null) => Promise<AuthResult>;
  /** Email a reset link. Admin-triggered; the user sets their own password. */
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  /** Set a new password for the signed-in / recovery-linked user. */
  updatePassword: (password: string) => Promise<AuthResult>;
  /** True while following a reset link, before a new password has been set. */
  recoveryMode: boolean;
  /** True while the session/profile is being resolved on first paint. */
  authLoading: boolean;
  authError: string | null;
  /** Dismiss the global error banner. */
  clearAuthError: () => void;
  /** True when the app is running against a real Supabase project. */
  authEnabled: boolean;
  /** True while student data is being pulled from Postgres on sign-in. */
  dataLoading: boolean;
  /** True when student data is being persisted to Postgres rather than only localStorage. */
  dataSynced: boolean;
  logout: () => void;
  setLoginRoleIntent: (role: Role | null) => void;
  setRoute: (route: Route) => void;
  setActiveDay: (day: number | null) => void;
  setActiveTopicId: (topicId: string | null) => void;
  /** What the PYQ attempt screen should deal: a whole paper, or one microtheme. */
  pyqTarget: PyqTarget | null;
  setPyqTarget: (t: PyqTarget | null) => void;
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
  /**
   * Record a finished past-paper attempt. Returns the points earned, which go
   * to the separate PYQ pool and never to the study-plan total.
   */
  recordPyqAttempt: (studentId: string, a: { label: string; correct: number; total: number }) => number;
  /** The separate past-paper points pool. */
  pyqPointsOf: (studentId: string) => number;

  // multi-topic helpers
  topicCleared: (studentId: string, day: number, topicId: string) => boolean;
  /** Clear a topic that has no question bank, by studying it. Awards no points. */
  markTopicStudied: (studentId: string, day: number, topicId: string) => void;
  /** Per-microtheme question counts from Postgres, keyed by topic id. */
  questionCoverage: Record<string, Coverage>;
  /** True when a topic has questions in the bundled banks OR in Postgres. */
  topicHasQuestions: (topicId: string) => boolean;
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
  setAdminTab: (tab: AdminTab) => void;

  // Tests (admin-managed)
  upsertTest: (t: Test) => void;
  archiveTest: (id: string) => void;
  unarchiveTest: (id: string) => void;
  removeTest: (id: string) => void;

  // Test attempts (student-side)
  setActiveTestId: (id: string | null) => void;
  setActiveAttemptId: (id: string | null) => void;
  /** Start a new attempt for the given test and student. Returns the attempt id. */
  startTestAttempt: (testId: string, studentId: string, serverId?: string) => string;
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

  // Current Affairs (admin-managed)
  setCurrentAffairs: (next: CurrentAffairsTopic[]) => void;
  upsertCurrentAffairs: (item: CurrentAffairsTopic) => void;
  removeCurrentAffairs: (id: string) => void;

  /**
   * Adaptive PR 2: apply one review signal to a student's StudentTopicRecord.
   * Creates the record on first touch, otherwise upserts.
   *
   * Pass `signal` with `now` defaulted by the caller (Date.now()) and
   * `isRajasthanTopic` resolved against the live subjects catalog — both
   * are handled inside this method, so callers only supply the per-attempt
   * dimensions (wasCorrect/wasSkipped/responseTimeMs/isCurrentAffairs/questionDate).
   */
  applyTopicScheduling: (
    studentId: string,
    topicId: string,
    signal: Omit<ReviewSignal, "now" | "isRajasthanTopic">
  ) => StudentTopicRecord;

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
  /**
   * Fetch every student's chart and progress, once. Heavy -- only for screens
   * that show the whole cohort (the mentor dashboard, admin stats).
   */
  /** Load which microthemes have questions. For topic/plan/question screens. */
  ensureQuestionCoverage: () => Promise<void>;
  ensureStudentRecords: () => Promise<void>;
  /** Fetch one student's record. What a mentor opening one student needs. */
  ensureStudentRecord: (studentId: string) => Promise<void>;
  /** True while either of the above is in flight. */
  studentRecordsLoading: boolean;

  /** Per-feature visibility, and whether the current viewer should see one. */
  featureFlags: FeatureFlag[];
  isFeatureVisible: (key: string) => boolean;
  updateFeatureState: (key: string, state: FeatureState) => Promise<{ error?: string }>;

  /** Exam identity, product name and landing copy. Editable by an admin. */
  settings: InstituteSettings;
  updateSettings: (next: InstituteSettings) => Promise<{ error?: string }>;

  /** The Batch object for a student, or null. */
  batchForStudent: (studentId: string) => Batch | null;

  // Announcements
  /** Mentor/admin: set the score a student must reach to clear a topic. */
  setPassThreshold: (studentId: string, pct: number) => void;
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

  // Adaptive PR 3: planned session items + setter. Lives across the route hop
  // from SmartPractice (picker) to SmartSessionScreen (runner).
  activeSession: SessionItem[] | null;
  setActiveSession: (next: SessionItem[] | null) => void;
  /** PR 5: mode + start time of the active session, persisted alongside items. */
  activeSessionMeta: { mode: SessionMode; startedAt: number } | null;
  setActiveSessionMeta: (next: { mode: SessionMode; startedAt: number } | null) => void;

  /**
   * Adaptive PR 4: record a wrong-distractor pick into the student's
   * confusionPairs list. Caller passes the concept the question tests, the
   * label of the distractor the student picked (typically the option text),
   * and the topicId for routing remediation.
   */
  recordStudentConfusion: (
    studentId: string,
    correctConcept: string,
    confusedWith: string,
    topicId: string,
  ) => void;

  /** Adaptive PR 5: append a finished Smart Practice session for the dashboard. */
  recordSmartSession: (studentId: string, record: SmartSessionRecord) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Which account the routing re-arm last ran for; survives a reload. */
const LAST_RECONCILED_KEY = "v6_lastReconciledUser";

export function AppProvider({ children }: { children: ReactNode }) {
  // v3 keys — schema changed from single-topic to multi-topic days; ignore old data.
  // v6: the seed student's email was a real address (aamir.parwez@gmail.com).
  // Auth reconciliation matches an incoming profile to a seed row by email and
  // keeps the seed's id, so signing up on that address adopted the demo
  // student's fabricated progress. Bumping the key is what actually delivers
  // the corrected seed -- existing installs have the old row cached under
  // v5_users and would otherwise keep the collision forever. Real accounts are
  // re-added by reconciliation on sign-in and by loadStudentProfiles for staff.
  // v7: the demo cast (Admin Singh, Priya Sharma, two invented students) was
  // seeded even when the app is wired to a real Supabase project, so a live
  // institute's admin panel listed four people who do not exist beside the
  // people who do -- and they could be picked as a student's mentor. Seeded
  // only when there is no database to be the truth. Existing installs have the
  // cast cached under v6_users, so the key had to move for the change to land.
  const [users, setUsers] = useLocalStorage<User[]>(
    "v7_users", isSupabaseConfigured ? [] : SEED_USERS,
  );
  const [studentData, setStudentData] = useLocalStorage<Record<string, StudentData>>("v5_studentData", seedStudentData());
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>("v5_currentUserId", null);
  const [route, setRoute] = useLocalStorage<Route>("v5_route", "auto");
  const [loginRoleIntent, setLoginRoleIntent] = useLocalStorage<Role | null>("v5_loginRoleIntent", null);
  const [activeDay, setActiveDay] = useLocalStorage<number | null>("v5_activeDay", null);
  const [activeTopicId, setActiveTopicId] = useLocalStorage<string | null>("v5_activeTopicId", null);
  // Deliberately not persisted. A stale PYQ target outliving its route is the
  // exact shape of the blank-screen bug that persisted `route` caused: the
  // screen renders before the target is meaningful and returns null.
  const [pyqTarget, setPyqTarget] = useState<PyqTarget | null>(null);
  const [attemptSeed, setAttemptSeed] = useLocalStorage<number>("v5_attemptSeed", 1);
  const [lastResult, setLastResult] = useLocalStorage<QuizResult | null>("v5_lastResult", null);
  const [viewingStudentId, setViewingStudentId] = useLocalStorage<string | null>("v5_viewingStudentId", null);
  const [activeTestId, setActiveTestId] = useLocalStorage<string | null>("v5_activeTestId", null);
  const [activeAttemptId, setActiveAttemptId] = useLocalStorage<string | null>("v5_activeAttemptId", null);
  // v6: the catalog was replaced wholesale with the RPSC syllabus (243
  // microthemes). Bumping the key is what actually delivers it — existing
  // installs have the old 63-topic catalog cached under v5_subjects and would
  // otherwise never see the new one. Charts survive via LEGACY_TOPIC_ALIASES.
  //
  // Since 0033 the catalog lives in Postgres and this key is only a cache: it
  // paints instantly on load and is the whole story in local demo mode, which
  // has no database. Postgres wins the moment it answers.
  const [subjects, setSubjectsLocal] =
    useLocalStorage<SubjectCatalogEntry[]>("v6_subjects", DEFAULT_SUBJECTS);

  // Written by setSubjects, drained by the effect below. The push happens after
  // the state commits rather than inside the updater, so it cannot fire twice
  // under StrictMode's double-invoked reducers.
  const pendingSubjectPush = useRef<SubjectCatalogEntry[] | null>(null);

  const setSubjects = useCallback((
    next: SubjectCatalogEntry[] | ((prev: SubjectCatalogEntry[]) => SubjectCatalogEntry[]),
  ) => {
    setSubjectsLocal((prev) => {
      const value = typeof next === "function"
        ? (next as (p: SubjectCatalogEntry[]) => SubjectCatalogEntry[])(prev)
        : next;
      pendingSubjectPush.current = value;
      return value;
    });
  }, [setSubjectsLocal]);

  useEffect(() => {
    const value = pendingSubjectPush.current;
    if (!value) return;
    pendingSubjectPush.current = null;
    void saveSubjects(value).then((r) => {
      // Admin-only by RLS. A mentor or student reaching this means a caller is
      // wrong, and silently keeping a local-only edit is how the old
      // localStorage behaviour hid itself -- so it is surfaced.
      if (r.error) setAuthError(`Could not save the syllabus: ${r.error}`);
    });
  }, [subjects]);

  const [planTemplates, setPlanTemplates] = useLocalStorage<PlanTemplate[]>("v5_planTemplates", DEFAULT_PLAN_TEMPLATES);
  const [tourSteps, setTourSteps] = useLocalStorage<TourStep[]>("v5_tourSteps", DEFAULT_TOUR_STEPS);
  const [quizPool, setQuizPool] = useLocalStorage<Question[]>("v5_quizPool", QPOOL_MEWAR);
  const [foundationPool, setFoundationPool] = useLocalStorage<Record<string, Question[]>>("v5_foundationPool", FOUNDATION_QS);
  const [placementPool, setPlacementPool] = useLocalStorage<Question[]>("v6_placementPool", PLACEMENT_MCQS);
  // Since 0034 cohorts live in Postgres and this key is only a cache, exactly as
  // v6_subjects is: it paints instantly, it is the whole story in local demo
  // mode, and Postgres wins the moment it answers. Membership was already
  // server-side (profiles.batch_id, set_user_batch) -- it was the batch rows
  // that were stranded in one admin's browser.
  const [batches, setBatchesLocal] = useLocalStorage<Batch[]>("v5_batches", DEFAULT_BATCHES);

  // Written by setBatches, drained by the effect below. Pushing after the state
  // commits rather than inside the updater keeps StrictMode's double-invoked
  // reducers from sending it twice.
  const pendingBatchPush = useRef<Batch[] | null>(null);

  const setBatches = useCallback((
    next: Batch[] | ((prev: Batch[]) => Batch[]),
  ) => {
    setBatchesLocal((prev) => {
      const value = typeof next === "function"
        ? (next as (p: Batch[]) => Batch[])(prev)
        : next;
      pendingBatchPush.current = value;
      return value;
    });
  }, [setBatchesLocal]);

  useEffect(() => {
    const value = pendingBatchPush.current;
    if (!value) return;
    pendingBatchPush.current = null;
    void saveBatches(value).then((r) => {
      // Admin-only by RLS. Surfaced rather than swallowed: a batch edit that
      // only ever reached localStorage is the exact failure 0034 exists to end.
      if (r.error) setAuthError(`Could not save the batch: ${r.error}`);
    });
  }, [batches]);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>("v5_announcements", []);
  const [tests, setTests] = useLocalStorage<Test[]>("v5_tests", DEFAULT_TESTS);
  const [testAttempts, setTestAttempts] = useLocalStorage<TestAttempt[]>("v5_testAttempts", []);
  const [testSchedules, setTestSchedules] = useLocalStorage<TestSchedule[]>("v5_testSchedules", []);
  const [pyqBank, setPyqBank] = useLocalStorage<PYQ[]>("v5_pyqBank", DEFAULT_PYQ_BANK);
  const [currentAffairs, setCurrentAffairs] = useLocalStorage<CurrentAffairsTopic[]>("v5_currentAffairs", DEFAULT_CURRENT_AFFAIRS);
  const [activeSession, setActiveSession] = useLocalStorage<SessionItem[] | null>("v5_activeSession", null);
  const [activeSessionMeta, setActiveSessionMeta] = useLocalStorage<{ mode: SessionMode; startedAt: number } | null>("v5_activeSessionMeta", null);
  const [adminTab, setAdminTab] = useLocalStorage<AdminTab>("v5_adminTab", "people");

  /* ---------- the address bar ----------
   *
   * The route was a string in localStorage and the URL never left "/", so there
   * was no back button, no shareable link, and nothing in the address naming
   * which admin section was wanted -- which is what made loading one section on
   * demand impossible. main.tsx seeds the route from the path before the first
   * render; these two effects keep the two in step afterwards.
   */

  // Set while applying a popstate, so the effect below does not push a new
  // entry for a navigation the user made with the Back button.
  const applyingPop = useRef(false);
  const prevRoute = useRef<Route | null>(null);

  useEffect(() => {
    if (applyingPop.current) { applyingPop.current = false; prevRoute.current = route; return; }
    // Resolving out of "auto" continues the navigation that got here rather
    // than starting a new one, so it replaces instead of pushing. Otherwise
    // Back would land on a URL that resolves forward again.
    const replace = prevRoute.current === null || prevRoute.current === "auto";
    syncUrl(route, adminTab, replace);
    prevRoute.current = route;
  }, [route, adminTab]);

  useEffect(() => {
    const onPop = () => {
      const hit = parsePath(window.location.pathname);
      if (!hit) return;
      applyingPop.current = true;
      setRoute(hit.route);
      if (hit.adminTab) setAdminTab(hit.adminTab);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setRoute, setAdminTab]);

  // PR 6: on every mount and whenever the CA list changes, prune items that
  // have passed their 18-month expiry. Cheap (O(n)) and runs in the browser
  // since there's no cron environment yet. Persists only when something
  // actually flipped — deactivateExpiredTopics returns the same array ref
  // when nothing changed.
  useEffect(() => {
    setCurrentAffairs((prev) => deactivateExpiredTopics(prev));
    // We intentionally don't depend on `currentAffairs` here — the setter
    // is a stable reference and we only need this to run on mount + when a
    // future writer (admin save) touches the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  /* ---------- Supabase auth ------------------------------------------------
   *
   * Identity comes from Supabase; everything else still lives in localStorage.
   * The bridge between them is EMAIL, not id: a signed-in profile is matched
   * to an existing local user by email so the seeded demo data (Aamir's
   * cleared days, Neha's pending plan) survives the move to real UUIDs.
   *
   * `role` is always taken from the profile row, never from local storage —
   * that is the entire point of the migration. A tampered local record is
   * overwritten on every sign-in.
   */

  const [authProfile, setAuthProfile] = useState<ProfileRow | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  // True while the user is following a password-reset link and has not yet set
  // a new password. Deliberately NOT persisted: it must not survive a reload
  // once the reset is done or abandoned.
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Read `users` inside the auth effect without making it a dependency —
  // depending on it would re-run reconciliation on every unrelated user edit.
  const usersRef = useRef(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  // One-time repair for installs that already accumulated duplicate rows before
  // addUser started rejecting clashing emails. A real account is exactly one row
  // in `profiles`, so any extra row for the same address is a local invention;
  // keep the one carrying a Supabase uuid, since that is the id every server
  // row is keyed by.
  const dedupedUsers = useRef(false);
  useEffect(() => {
    if (dedupedUsers.current) return;
    dedupedUsers.current = true;
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
    setUsers((prev) => {
      const byEmail = new Map<string, User>();
      for (const u of prev) {
        const key = u.email.toLowerCase();
        const held = byEmail.get(key);
        if (!held) { byEmail.set(key, u); continue; }
        if (!isUuid(held.id) && isUuid(u.id)) byEmail.set(key, u);
      }
      const next = [...byEmail.values()];
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Last identity reconciliation handed to `setCurrentUserId`, so we can tell a
  // genuine sign-in / user switch apart from a re-run of the effect.
  //
  // Persisted, because an in-memory ref starts null on every page load — which
  // meant the re-arm below fired on every reload, not just on a real sign-in.
  // The auto-router then sent an onboarded student to the dashboard, discarding
  // wherever they actually were: reloading mid-quiz dropped them out of the
  // paper. Keyed by user id, so a different account signing in still re-arms.
  const lastReconciledId = useRef<string | null>(
    (() => { try { return localStorage.getItem(LAST_RECONCILED_KEY); } catch { return null; } })(),
  );

  // Set by logout() so the SIGNED_OUT that follows is recognised as one the
  // user asked for, and does not raise an error banner explaining itself.
  const deliberateSignOut = useRef(false);

  // Whose profile row we are currently holding. Lets us tell "this event is the
  // same user we already loaded" from "a different user signed in", so a token
  // refresh does not trigger a redundant fetch.
  const loadedProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    let cancelled = false;

    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) {
          loadedProfileId.current = null;
          setAuthProfile(null);
          setAuthLoading(false);
        }
        return;
      }
      // Already holding this user's profile. Supabase re-emits the same identity
      // on a token refresh and when the tab regains focus; refetching then buys
      // nothing and only creates another chance to fail.
      if (loadedProfileId.current === userId) {
        if (!cancelled) setAuthLoading(false);
        return;
      }
      const { data, error } = await supabase!
        .from("profiles").select("*").eq("id", userId).single();
      if (cancelled) return;
      if (error) {
        setAuthError(`Could not load your profile: ${error.message}`);
        // Deliberately leave `authProfile` as it was. Nulling it here treated a
        // failed *read* as a signed-out *session*, and the reconcile effect
        // below turned that into setCurrentUserId(null) — so one dropped
        // request mid-quiz dumped the student back to the landing page with
        // their answers gone. A session that is genuinely dead arrives as
        // SIGNED_OUT instead, which is handled explicitly.
      } else {
        loadedProfileId.current = userId;
        setAuthError(null);
        setAuthProfile(data as ProfileRow);
      }
      setAuthLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Arriving from a reset link. `detectSessionInUrl` has already exchanged
      // the token for a session, so the user is technically signed in — but they
      // got here without a password, so send them to set one before anything
      // else renders.
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);

      // A rotated access token is not an identity change. Supabase rotates
      // roughly hourly and re-checks whenever the tab becomes visible again —
      // both of which a student hits in the middle of a long paper.
      if (event === "TOKEN_REFRESHED") return;

      if (event === "SIGNED_OUT") {
        // Say so when nobody asked to be signed out. Supabase emits this when
        // it gives up on a session -- a refresh token it will not accept, a
        // revoked session -- and until now that arrived as a silent bounce to
        // the landing page with no cause recorded anywhere. If a student
        // reports being thrown out mid-quiz, this is the line that says why.
        if (!deliberateSignOut.current) {
          setAuthError(
            "You were signed out because the server ended your session " +
            `(at ${new Date().toLocaleTimeString()}). Signing back in will restore your progress.`,
          );
        }
        deliberateSignOut.current = false;
        loadedProfileId.current = null;
        setAuthProfile(null);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      void loadProfile(session?.user?.id);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Reconcile the authenticated profile with the local user list.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Auth has not resolved yet. Without this guard the first render of every
    // page load fell straight into the branch below and cleared the persisted
    // user before getSession() had a chance to restore it — so a reload during
    // a quiz bounced the student to the landing page.
    if (authLoading) return;

    if (!authProfile) {
      setCurrentUserId(null);
      return;
    }

    const email = authProfile.email.toLowerCase();
    // Prefer a row that already carries this account's real id; only fall back
    // to an email match. Matching on email alone let a locally-invented row --
    // a demo mentor, a seed -- win over the genuine account and hand it a
    // fabricated id, so nothing this session wrote lined up with Postgres.
    const existing =
      usersRef.current.find((u) => u.id === authProfile.id) ??
      usersRef.current.find((u) => u.email.toLowerCase() === email);
    // Keep the seed id when one exists — studentData is keyed by it.
    const localId = existing?.id ?? authProfile.id;

    const merged: User = {
      ...existing,
      id: localId,
      email,
      name: authProfile.name || existing?.name || email.split("@")[0],
      role: authProfile.role,
      mentorId: existing?.mentorId ?? authProfile.mentor_id ?? undefined,
      createdAt: existing?.createdAt ?? (Date.parse(authProfile.created_at) || Date.now()),
    };

    setUsers((prev) => {
      // Drop any other row claiming this address. Duplicates could only ever be
      // local inventions (a real account is one row in profiles), and leaving
      // them produces two cards for one person in the admin view.
      const deduped = prev.filter((u) => u.id === localId || u.email.toLowerCase() !== email);
      const i = deduped.findIndex((u) => u.id === localId);
      if (i === -1) return [...deduped, merged];
      const next = [...deduped];
      next[i] = merged;
      return next;
    });

    if (merged.role === "student") {
      setStudentData((prev) => (prev[localId] ? prev : { ...prev, [localId]: emptyStudentData() }));
    }

    setCurrentUserId(localId);

    // Re-arm routing on a real sign-in / user switch. `route` is persisted in
    // localStorage, and App's auto-routing effect bails unless it reads "auto".
    // Without this, a stale route left by a previous session (or by whoever used
    // this browser last) survives the sign-in, the assessment / choose-plan
    // redirect never runs, and a student with no plan falls through to
    // StudentHome — which renders nothing. That is the blank page.
    if (lastReconciledId.current !== localId) {
      lastReconciledId.current = localId;
      try { localStorage.setItem(LAST_RECONCILED_KEY, localId); } catch { /* non-fatal */ }
      setRoute("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfile, authLoading]);

  /* ---------- student data sync ------------------------------------------
   *
   * Postgres is the source of truth once signed in; localStorage becomes a
   * cache so the UI can paint before the network settles and still work if it
   * never does.
   *
   * Pull on sign-in, then push on change (debounced). The push is split the
   * same way the tables are — chart and progress save independently, so a
   * mentor approving a chart cannot clobber a quiz result written seconds
   * earlier by the student.
   */

  // Which microthemes have questions in Postgres. One small round trip covers
  // all 243, instead of asking per topic.
  const [questionCoverage, setQuestionCoverage] = useState<Record<string, Coverage>>({});
  const coverageLoaded = useRef(false);
  const coverageInFlight = useRef<Promise<void> | null>(null);

  /**
   * Which microthemes have released questions.
   *
   * Fetched on request rather than on sign-in: only the topic screens, the plan
   * builder and Admin -> Questions read it, so an admin editing plan limits or
   * a mentor reading their dashboard no longer pays for all 243 rows. One round
   * trip still covers every topic -- the saving is in not making it at all.
   */
  const ensureQuestionCoverage = useCallback((): Promise<void> => {
    if (!isSupabaseConfigured || !authProfileRef.current) return Promise.resolve();
    if (coverageLoaded.current) return Promise.resolve();
    if (coverageInFlight.current) return coverageInFlight.current;
    const run = loadCoverage()
      .then((c) => { setQuestionCoverage(c); coverageLoaded.current = true; })
      .finally(() => { coverageInFlight.current = null; });
    coverageInFlight.current = run;
    return run;
  }, []);

  const topicHasQuestions = useCallback((topicId: string) => {
    if (hasRealQuestions(topicId)) return true;             // bundled past papers
    // Only RELEASED questions count. Unreviewed rows exist in the bank but are
    // not served, so a topic backed solely by them is still study-only.
    return (questionCoverage[topicId]?.reviewed ?? 0) > 0;
  }, [questionCoverage]);

  // Plans come from Postgres now, not localStorage — a default plan that only
  // exists in the admin's browser is not a default plan.
  const [remoteTemplates, setRemoteTemplates] = useState<PlanTemplateRow[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !authProfile) return;
    let cancelled = false;
    void loadPlanTemplates().then((res) => {
      if (cancelled) return;
      if (res.error) setAuthError(`Could not load study plans: ${res.error}`);
      setRemoteTemplates(res.rows);
    });
    return () => { cancelled = true; };
  }, [authProfile]);
  /**
   * Which plan a student falls into when they have not chosen one.
   *
   * Most specific wins:
   *   1. the plan set on their batch  -- an admin's deliberate choice for that
   *      cohort, so two batches can run different plans
   *   2. their mentor's own default   -- a template with owner_id = that mentor
   *   3. the institute-wide default   -- owner_id null
   *
   * Only (3) used to exist. The resolution filtered on `!t.ownerId`, which
   * discarded a mentor's default outright even though 0009 grants mentors
   * insert/update on their own rows; and Batch.defaultPlanTemplateId was
   * written by the admin form and by the seed but never read by anything, so
   * picking a plan for a batch did nothing at all.
   *
   * Resolved from `users`/`batches` rather than batchForStudent because that
   * helper is defined much further down this file.
   */
  // Postgres is the source of truth; pull once the session resolves. Deliberately
  // does NOT go through setSubjects -- that would push what we just pulled
  // straight back.
  useEffect(() => {
    if (!authProfile) return;
    let cancelled = false;
    void loadSubjects().then((remote) => {
      if (cancelled || !remote || remote.length === 0) return;
      setSubjectsLocal(remote);
    });
    return () => { cancelled = true; };
  }, [authProfile, setSubjectsLocal]);

  /* ---------- institute settings ----------
   *
   * Deliberately NOT gated on authProfile, unlike every other pull here. The
   * landing page shows the countdown and the product name to visitors who have
   * not signed in and may never sign in, so this fetch has to happen without a
   * session -- which is why 0037 grants anon SELECT on that one table.
   */
  const [settings, setSettingsLocal] =
    useLocalStorage<InstituteSettings>("v1_settings", DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((remote) => {
      if (!cancelled && remote) setSettingsLocal(remote);
    });
    return () => { cancelled = true; };
  }, [setSettingsLocal]);

  /* ---------- feature visibility ----------
   *
   * Same shape as settings and read the same way -- ungated, because the flags
   * decide what renders and the landing page has no session.
   */
  const [featureFlags, setFeatureFlags] =
    useLocalStorage<FeatureFlag[]>("v1_featureFlags", DEFAULT_FLAGS);

  useEffect(() => {
    let cancelled = false;
    void loadFeatureFlags().then((remote) => {
      if (!cancelled && remote && remote.length > 0) setFeatureFlags(remote);
    });
    return () => { cancelled = true; };
  }, [setFeatureFlags]);

  /**
   * Is this feature on for whoever is looking?
   *
   * Unknown keys are visible. A flag row that has not been created yet must not
   * make a working feature disappear -- failing open is right here, because the
   * cost of wrongly showing something is far below the cost of a student's
   * screen silently losing a tab.
   */
  const isFeatureVisible = useCallback((key: string): boolean => {
    const f = featureFlags.find((x) => x.key === key);
    if (!f) return true;
    return featureVisibleTo(f.state, currentUser?.role);
  }, [featureFlags, currentUser?.role]);

  /** Admin-only, through the RPC in 0038 so a refusal is an error, not silence. */
  const updateFeatureState = useCallback(async (
    key: string, state: FeatureState,
  ): Promise<{ error?: string }> => {
    const res = await setFeatureState(key, state);
    if (res.error) return res;
    setFeatureFlags((prev) => prev.map((f) => (f.key === key ? { ...f, state } : f)));
    return {};
  }, [setFeatureFlags]);

  /** Admin-only by RLS. Writes through, then keeps the local copy in step. */
  const updateSettings = useCallback(async (next: InstituteSettings): Promise<{ error?: string }> => {
    const res = await saveSettings(next);
    if (res.error) return res;
    setSettingsLocal(next);
    return {};
  }, [setSettingsLocal]);

  // Same shape for cohorts. Deliberately not via setBatches, which would push
  // what we just pulled straight back.
  useEffect(() => {
    if (!authProfile) return;
    let cancelled = false;
    void loadBatches().then((remote) => {
      if (cancelled || !remote || remote.length === 0) return;
      setBatchesLocal(remote);
    });
    return () => { cancelled = true; };
  }, [authProfile, setBatchesLocal]);

  // Announcements too. Unlike subjects and batches this list is not a cache of
  // something the client owns -- it is the only copy -- so an empty result is
  // meaningful and is allowed to replace what is here.
  useEffect(() => {
    if (!authProfile) return;
    let cancelled = false;
    void loadAnnouncements(authProfile.id).then((remote) => {
      if (cancelled || !remote) return;
      setAnnouncements(remote);
    });
    return () => { cancelled = true; };
  }, [authProfile, setAnnouncements]);

  const defaultTemplateFor = useCallback((studentId: string | null): PlanTemplateRow | null => {
    const live = remoteTemplates.filter((t) => !t.archived);
    const u = studentId ? users.find((x) => x.id === studentId) : null;

    const batch = u?.batchId ? batches.find((b) => b.id === u.batchId) : null;
    if (batch?.defaultPlanTemplateId) {
      // Remote first, then the local seeds -- the same order adoptPlanTemplate
      // resolves in. The admin's batch dropdown lists `planTemplates` (local),
      // so looking only at Postgres here would mean picking a plan for a batch
      // silently did nothing: exactly the dead-field bug this change fixes.
      const t = live.find((x) => x.id === batch.defaultPlanTemplateId);
      if (t) return t;
      const local = planTemplates.find((x) => x.id === batch.defaultPlanTemplateId);
      if (local) {
        return { ...local, isDefault: false, version: 0, ownerId: null, archived: false };
      }
    }
    if (u?.mentorId) {
      const t = live.find((x) => x.isDefault && x.ownerId === u.mentorId);
      if (t) return t;
    }
    return live.find((x) => x.isDefault && !x.ownerId) ?? null;
  }, [remoteTemplates, planTemplates, users, batches]);

  /** The plan for whoever is signed in. Staff viewing a student should call
      defaultTemplateFor(studentId) instead -- this one follows the viewer. */
  const defaultTemplate = useMemo(
    () => defaultTemplateFor(currentUserId),
    [defaultTemplateFor, currentUserId],
  );

  const [dataLoading, setDataLoading] = useState(false);
  const [dataSynced, setDataSynced] = useState(false);
  const studentDataRef = useRef(studentData);
  useEffect(() => { studentDataRef.current = studentData; }, [studentData]);
  // Read inside patchChart without making it a dependency of every chart action.
  const authProfileRef = useRef(authProfile);
  useEffect(() => { authProfileRef.current = authProfile; }, [authProfile]);
  // Suppress the push effect for the render right after a pull, otherwise the
  // freshly-loaded data is immediately written back.
  const skipNextPush = useRef(false);
  // Serialized chart as last written to Postgres, so the push effect can tell a
  // real student edit from an unrelated progress change.
  const lastPushedChart = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !authProfile || !currentUserId) { setDataSynced(false); return; }
    let cancelled = false;

    (async () => {
      setDataLoading(true);
      if (authProfile.role === "student") {
        const res = await loadStudent(authProfile.id);
        if (cancelled) return;
        if (res.data) {
          skipNextPush.current = true;
          // Baseline for the push effect: what the server already holds.
          lastPushedChart.current = JSON.stringify(res.data.chart);
          setStudentData((prev) => ({ ...prev, [currentUserId]: res.data! }));
        } else if (res.isNew) {
          // First sign-in on this account: seed the server from whatever is
          // in local storage so existing demo progress is not lost.
          const local = studentDataRef.current[currentUserId];
          if (local) {
            await saveChart(authProfile.id, local);
            await saveProgress(authProfile.id, local);
            lastPushedChart.current = JSON.stringify(local.chart);
          }
        }
      } else {
        // Mentor / admin: profiles only.
        //
        // This used to also call loadStudents() for every student in the
        // institute -- three unbounded reads, one of them the full progress
        // blob per student and every override row -- on sign-in, before anyone
        // had said which screen they wanted. Opening Admin -> Plans & limits
        // fetched the entire cohort's answer history to render two number
        // inputs, and the cost grew with every student enrolled.
        //
        // Profiles stay eager because they are six small columns and nearly
        // every staff screen names people. The heavy records moved behind
        // ensureStudentRecords() below, which the two screens that actually
        // show the whole cohort ask for themselves.
        const profiles = await loadAllProfiles();
        if (cancelled) return;
        if (profiles.length) {
          setUsers((prev) => {
            // Staff hold every profile here, so anything local that is not among
            // them is an invention -- a demo seed, or a ghost from before
            // accounts moved to Supabase. Dropping them is what stops the admin
            // panel showing people who cannot sign in. The signed-in user is
            // kept regardless: reconciliation may not have written them yet.
            const real = new Set(profiles.map((p) => p.id));
            const next = prev.filter((u) => real.has(u.id) || u.id === authProfile?.id);
            for (const pr of profiles) {
              const i = next.findIndex((u) => u.id === pr.id || u.email.toLowerCase() === pr.email.toLowerCase());
              const merged: User = {
                id: pr.id, email: pr.email, name: pr.name, role: pr.role,
                mentorId: pr.mentor_id ?? undefined,
                batchId: pr.batch_id ?? undefined,
                createdAt: i === -1 ? Date.now() : next[i].createdAt,
              };
              if (i === -1) next.push(merged); else next[i] = { ...next[i], ...merged };
            }
            return next;
          });
        }
      }
      if (!cancelled) { setDataLoading(false); setDataSynced(true); }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfile, currentUserId]);

  /* ---------- student records, fetched per screen ----------
   *
   * loadStudents() reads three tables unbounded -- charts, the whole progress
   * blob, and every override row -- for every student in the institute. It used
   * to run on sign-in for all staff, so the cost of opening ANY admin screen
   * scaled with enrolment even when the screen showed no student data at all.
   *
   * These two make that a request rather than a reflex. Both are idempotent and
   * cached: a screen can call on every render without refetching, and two
   * screens mounting together share one in-flight request instead of racing.
   */

  const allRecordsLoaded = useRef(false);
  const allRecordsInFlight = useRef<Promise<void> | null>(null);
  const loadedRecordIds = useRef<Set<string>>(new Set());
  const [studentRecordsLoading, setStudentRecordsLoading] = useState(false);

  /** Every student's record. For the screens that show the whole cohort. */
  const ensureStudentRecords = useCallback((): Promise<void> => {
    const me = authProfileRef.current;
    if (!isSupabaseConfigured || !me || me.role === "student") return Promise.resolve();
    if (allRecordsLoaded.current) return Promise.resolve();
    if (allRecordsInFlight.current) return allRecordsInFlight.current;

    setStudentRecordsLoading(true);
    const run = (async () => {
      const ids = usersRef.current.filter((u) => u.role === "student").map((u) => u.id);
      const remote = await loadStudents(ids);
      if (Object.keys(remote).length) {
        skipNextPush.current = true;
        setStudentData((prev) => ({ ...prev, ...remote }));
      }
      ids.forEach((id) => loadedRecordIds.current.add(id));
      allRecordsLoaded.current = true;
    })().finally(() => {
      allRecordsInFlight.current = null;
      setStudentRecordsLoading(false);
    });

    allRecordsInFlight.current = run;
    return run;
  }, [setStudentData]);

  /**
   * One student's record.
   *
   * A mentor opening a single student needs that student, not the cohort. This
   * is the difference between one indexed lookup and a full-table read on the
   * busiest screen a mentor uses.
   */
  const ensureStudentRecord = useCallback(async (studentId: string): Promise<void> => {
    const me = authProfileRef.current;
    if (!isSupabaseConfigured || !me || me.role === "student") return;
    if (allRecordsLoaded.current || loadedRecordIds.current.has(studentId)) return;
    loadedRecordIds.current.add(studentId);   // claim before awaiting, so a
                                              // re-render mid-flight does not
                                              // fire a second identical read
    setStudentRecordsLoading(true);
    try {
      const res = await loadStudent(studentId);
      if (res.data) {
        skipNextPush.current = true;
        setStudentData((prev) => ({ ...prev, [studentId]: res.data! }));
      }
    } finally {
      setStudentRecordsLoading(false);
    }
  }, [setStudentData]);

  // Push local changes up. Students own their row; staff writes go through the
  // explicit chart/override actions rather than this blanket sync.
  useEffect(() => {
    if (!dataSynced || !authProfile || authProfile.role !== "student" || !currentUserId) return;
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    const mine = studentData[currentUserId];
    if (!mine) return;
    const t = setTimeout(() => {
      // Only write the chart when the student actually changed it. Pushing it
      // on every progress tick would let a stale local copy overwrite a mentor's
      // approval — the student's approvedThrough is 0 until they re-pull, so an
      // idle quiz answer could silently re-lock every day they had just been
      // granted. Progress is student-owned and always safe to write.
      const serialized = JSON.stringify(mine.chart);
      if (serialized !== lastPushedChart.current) {
        lastPushedChart.current = serialized;
        void saveChart(authProfile.id, mine);
      }
      void saveProgress(authProfile.id, mine);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentData, dataSynced, authProfile, currentUserId]);

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

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Sign-in is unavailable — Supabase is not configured." };
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) { setAuthError(error.message); return { error: error.message }; }
    setLoginRoleIntent(null);
    setRoute("auto");
    return {};
  }, [setRoute, setLoginRoleIntent]);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Sign-up is unavailable — Supabase is not configured." };
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim() },
        // Without this Supabase falls back to the project's Site URL, which is
        // http://localhost:3000 by default -- so a real student clicking the
        // confirmation link landed on "localhost refused to connect". Sending
        // the current origin makes the link follow wherever the app is served
        // from, in production and in local dev alike. The origin must also be
        // listed under Authentication -> URL Configuration -> Redirect URLs.
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) { setAuthError(error.message); return { error: error.message }; }
    // With "Confirm email" enabled (the Supabase default) signUp returns no
    // session — the user must click the link before they can sign in.
    if (!data.session) return { needsConfirmation: true };
    setLoginRoleIntent(null);
    setRoute("auto");
    return {};
  }, [setRoute, setLoginRoleIntent]);

  /* ---------- admin: real accounts in Postgres ----------
   *
   * The People tab used to list `users`, which is localStorage. Anyone added
   * there was a ghost: visible in the panel, unknown to Supabase, unable to log
   * in. These read and write public.profiles instead, so the panel shows
   * accounts that actually exist.
   */

  /** Every profile. RLS restricts this to mentors and admins. */
  const listProfiles = useCallback(async (): Promise<ProfileRow[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { setAuthError(`Could not load accounts: ${error.message}`); return []; }
    return (data ?? []) as ProfileRow[];
  }, []);

  /**
   * Change someone's role.
   *
   * Goes through a security-definer RPC, not a table write: `authenticated` has
   * no column privilege on `role`, and granting one would let any student
   * promote themselves. See supabase/migrations/0008.
   */
  const setUserRole = useCallback(async (userId: string, role: Role): Promise<AuthResult> => {
    if (!supabase) return { error: "Not available — Supabase is not configured." };
    const { error } = await supabase.rpc("set_user_role", { target_id: userId, new_role: role });
    if (error) return { error: error.message };
    // Mirror into the local list so the UI reflects it without a refetch.
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    return {};
  }, [setUsers]);

  /** Assign (or clear, with null) a student's mentor. Same RPC reasoning. */
  const setUserMentor = useCallback(async (studentId: string, mentorId: string | null): Promise<AuthResult> => {
    if (!supabase) return { error: "Not available — Supabase is not configured." };
    const { error } = await supabase.rpc("set_user_mentor", { target_id: studentId, mentor: mentorId });
    if (error) return { error: error.message };
    setUsers((prev) => prev.map((u) => (u.id === studentId ? { ...u, mentorId: mentorId ?? undefined } : u)));
    return {};
  }, [setUsers]);

  /**
   * Email a password-reset link.
   *
   * Deliberately uses the anon-key endpoint rather than `auth.admin`. Setting
   * another user's password outright needs the service_role key, which cannot
   * exist in this app: Vite inlines env vars into the bundle, so shipping it
   * would hand every visitor unrestricted, RLS-bypassing access to the database.
   * The user follows the link and sets their own password instead.
   *
   * Note Supabase does not reveal whether an address is registered — a success
   * here means the request was accepted, not that an account exists.
   */
  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Password reset is unavailable — Supabase is not configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  /** Set a new password for the signed-in (or recovery-linked) user. */
  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Password update is unavailable — Supabase is not configured." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    setRecoveryMode(false);
    setRoute("auto");
    return {};
  }, [setRoute]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const logout = useCallback(() => {
    // Fire-and-forget: the auth listener clears currentUserId when the session
    // goes away, but we also clear local view state immediately so the UI does
    // not sit on a stale screen while the network call is in flight.
    deliberateSignOut.current = true;
    setAuthError(null);
    if (supabase) void supabase.auth.signOut();
    setAuthProfile(null);
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

  /**
   * Mutate a student's chart AND persist it.
   *
   * The blanket push effect above returns early unless the signed-in user is a
   * student writing their own row, so a mentor approving a chart only ever
   * changed their own browser: `approvedThrough` never reached Postgres, the
   * student's device never learned of it, and every day stayed locked behind
   * "beyond commitment" forever. Overrides already had explicit remote writes
   * (insertOverride / decideOverride); charts were the omission the comment on
   * that effect promised but nobody wrote.
   *
   * Computed from the ref rather than inside the setState updater, so the
   * updater stays pure — React double-invokes those in development.
   */
  const patchChart = useCallback((id: string, mutate: (s: StudentData) => StudentData) => {
    const cur = studentDataRef.current[id] || emptyStudentData();
    const next: StudentData = { ...mutate(cur), lastActivityAt: Date.now() };
    setStudentData((prev) => ({ ...prev, [id]: next }));
    if (!isSupabaseConfigured) return;
    // Staff must NOT upsert. PostgREST sends an upsert as INSERT .. ON CONFLICT
    // DO UPDATE, and Postgres applies the INSERT policy's WITH CHECK
    // (student_id = auth.uid()) even when it resolves to an update -- so a
    // mentor's approval was rejected and thrown away by a bare `void`. A plain
    // UPDATE is covered by "student or staff updates chart".
    const isSelf = authProfileRef.current?.id === id;
    void (async () => {
      const res = isSelf ? await saveChart(id, next) : await updateChart(id, next);
      // Surfaced, not swallowed: a silent failure here is what made the mentor
      // believe a plan was approved when nothing had been written.
      if (res.error) setAuthError(`Could not save the plan: ${res.error}`);
    })();
  }, [setStudentData]);

  const setChart = useCallback((id: string, chart: ChartState) => {
    patchChart(id, (s) => ({ ...s, chart }));
  }, [patchChart]);

  const submitChartForApproval = useCallback((id: string, scope?: CommitmentScope) => {
    patchChart(id, (s) => {
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
  }, [patchChart]);

  const awardPoints = (s: StudentData, kind: PointKind, amount: number, meta?: PointEvent["meta"]): StudentData => {
    const evt: PointEvent = { id: Date.now() + Math.random(), when: Date.now(), kind, amount, meta };
    return { ...s, points: { total: s.points.total + amount, history: [...s.points.history, evt] } };
  };

  const approveChart = useCallback((id: string) => {
    patchChart(id, (s) => {
      const newApprovedThrough = Math.max(s.chart.approvedThrough, s.chart.committedThrough);
      const updated: StudentData = {
        ...s,
        chart: { ...s.chart, status: "approved" as ChartStatus, approvedThrough: newApprovedThrough, decidedAt: Date.now() },
      };
      const already = s.points.history.some((e) => e.kind === "chart_approved");
      return already ? updated : awardPoints(updated, "chart_approved", POINTS.CHART_APPROVED);
    });
  }, [patchChart]);

  const requestChartChanges = useCallback((id: string, feedback?: string) => {
    patchChart(id, (s) => ({ ...s, chart: { ...s.chart, status: "changes_requested", decidedAt: Date.now(), feedback } }));
  }, [patchChart]);

  /**
   * Mentor sets the bar for one student. Stored on the chart, which the mentor
   * already owns and which syncs to Postgres as jsonb.
   */
  const setPassThreshold = useCallback((studentId: string, pct: number) => {
    patchChart(studentId, (s) => ({
      ...s,
      chart: { ...s.chart, passThreshold: clampPassThreshold(pct) },
    }));
  }, [patchChart]);

  /* ---------- multi-topic completion helpers ---------- */

  const isTopicClearedFor = (s: StudentData, day: number, topicId: string): boolean => {
    const hasOverride = s.overrides.some((o) => o.day === day && o.status === "approved");
    if (hasOverride) return true;
    const pass = passThresholdOf(s);
    if (s.attempts.some((a) => a.day === day && a.topicId === topicId && a.score >= pass)) return true;
    // Topics with no question bank are cleared by studying instead.
    return (s.studiedTopics ?? []).some((t) => t.day === day && t.topicId === topicId);
  };

  const isDayClearedFor = (s: StudentData, day: number): boolean => {
    const topics = s.chart.days[day - 1];
    if (!topics || topics.length === 0) return false;
    return topics.every((t) => isTopicClearedFor(s, day, t.topicId));
  };

  /**
   * Mark a topic studied. Only meaningful for microthemes with no question
   * bank — the UI offers this in place of the quiz for those topics.
   *
   * Deliberately awards no points: the student has not demonstrated mastery,
   * only shown up. It clears the day so the plan keeps moving, nothing more.
   */
  const markTopicStudied = useCallback((id: string, day: number, topicId: string) => {
    patchStudent(id, (s) => {
      const already = (s.studiedTopics ?? []).some((t) => t.day === day && t.topicId === topicId);
      if (already) return s;
      const next: StudentData = {
        ...s,
        studiedTopics: [...(s.studiedTopics ?? []), { day, topicId, at: Date.now() }],
      };
      const nowDayCleared = isDayClearedFor(next, day);
      return nowDayCleared
        ? { ...next, progress: { ...next.progress, currentDay: Math.max(next.progress.currentDay, day + 1) } }
        : next;
    });
  }, [patchStudent]);

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

  /* ---------- Adaptive PR 4: confusion-pair recording ------------------ */

  const recordStudentConfusion = useCallback((
    studentId: string,
    correctConcept: string,
    confusedWith: string,
    topicId: string,
  ) => {
    patchStudent(studentId, (s) => ({
      ...s,
      confusionPairs: recordConfusion(
        s.confusionPairs ?? [],
        correctConcept,
        confusedWith,
        topicId,
      ),
    }));
  }, [patchStudent]);

  const recordSmartSession = useCallback((studentId: string, record: SmartSessionRecord) => {
    patchStudent(studentId, (s) => ({
      ...s,
      smartSessions: [...(s.smartSessions ?? []), record],
    }));
  }, [patchStudent]);

  /* ---------- Adaptive PR 2: scheduler integration --------------------- */

  const applyTopicScheduling = useCallback((
    studentId: string,
    topicId: string,
    partialSignal: Omit<ReviewSignal, "now" | "isRajasthanTopic">
  ): StudentTopicRecord => {
    const now = Date.now();
    const signal: ReviewSignal = {
      ...partialSignal,
      now,
      isRajasthanTopic: isTopicRajasthanSpecific(subjects, topicId),
    };
    let updated: StudentTopicRecord | null = null;
    patchStudent(studentId, (s) => {
      const records = s.topicRecords ?? [];
      const prior = records.find((r) => r.topicId === topicId);
      const computed = scheduleNextReview(prior, signal);
      // scheduleNextReview seeds an empty record from inside; ensure the
      // returned record carries the real topicId, not the placeholder.
      const next: StudentTopicRecord = { ...computed, topicId };
      updated = next;
      const others = records.filter((r) => r.topicId !== topicId);
      return { ...s, topicRecords: [...others, next] };
    });
    return updated!;
  }, [patchStudent, subjects]);

  const finishQuiz = useCallback((id: string, attempt: Attempt) => {
    let pointsAwarded = 0;
    let dayClearedNow = false;
    let topicsRemainingInDay = 0;

    patchStudent(id, (s) => {
      const attemptsForTopic = s.attempts.filter((a) => a.day === attempt.day && a.topicId === attempt.topicId);
      const isFirstTry = attemptsForTopic.length === 0;
      const wasTopicCleared = isTopicClearedFor(s, attempt.day, attempt.topicId);
      const wasDayCleared = isDayClearedFor(s, attempt.day);
      const pass = passThresholdOf(s);
      const passed = attempt.score >= pass
        || s.overrides.some((o) => o.day === attempt.day && o.status === "approved");

      let next: StudentData = { ...s, attempts: [...s.attempts, attempt] };

      if (passed && !wasTopicCleared) {
        next = awardPoints(next, "quiz_pass", POINTS.QUIZ_PASS, { day: attempt.day });
        pointsAwarded += POINTS.QUIZ_PASS;
        if (isFirstTry && attempt.score >= pass) {
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

    // Adaptive PR 2 + PR 7: feed the attempt into the scheduler. When
    // perQuestion is present (day-quiz from PR 7 onwards) we use the actual
    // average response time so confidence math runs on real signal; we also
    // upgrade wasCorrect from the topic-level gate to the per-question
    // truth (correct / total > 0.8 still maps to a "pass" attempt). Legacy
    // attempts without perQuestion fall back to the moderate-confidence
    // 12s default and the score-based gate.
    const perQ = attempt.perQuestion ?? [];
    const avgRespMs = perQ.length > 0
      ? Math.round(perQ.reduce((acc, q) => acc + q.responseTimeMs, 0) / perQ.length)
      : 12000;
    applyTopicScheduling(id, attempt.topicId, {
      wasCorrect: attempt.score >= passThresholdOf(studentDataRef.current[id]),
      wasSkipped: false,
      responseTimeMs: avgRespMs,
      isCurrentAffairs: false,
    });

    return { pointsAwarded, dayClearedNow, topicsRemainingInDay };
  }, [patchStudent, applyTopicScheduling]);

  // Overrides live in their own table, deliberately outside the progress blob:
  // the student raises them and the mentor decides them, so a single
  // last-write-wins document would let one side erase the other's change.
  const addOverride = useCallback((id: string, override: Override) => {
    patchStudent(id, (s) => ({ ...s, overrides: [...s.overrides, override] }));
    if (isSupabaseConfigured) void insertOverride(id, override);
  }, [patchStudent]);

  const updateOverride = useCallback((id: string, override: Override) => {
    // Stamp decidedAt the first time the override gets a non-pending status, so the
    // student banner can show "1h ago" attribution.
    const stamped: Override = override.status !== "pending" && !override.decidedAt
      ? { ...override, decidedAt: Date.now() }
      : override;
    patchStudent(id, (s) => ({ ...s, overrides: s.overrides.map((o) => o.id === stamped.id ? stamped : o) }));
    if (isSupabaseConfigured && stamped.status !== "pending") {
      // Rejected by RLS if the caller is not staff — the policy requires a
      // non-staff update to leave status as 'pending'.
      void decideOverride(stamped.id, stamped.status);
    }
  }, [patchStudent]);

  const markOverrideSeen = useCallback((id: string, overrideId: number) => {
    patchStudent(id, (s) => ({
      ...s,
      overrides: s.overrides.map((o) => o.id === overrideId ? { ...o, seenByStudent: true } : o),
    }));
    if (isSupabaseConfigured) void markOverrideSeenRemote(overrideId);
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

  /**
   * Points for a past-paper attempt, banked separately from plan XP.
   *
   * Proportional to what the student actually got right rather than a flat
   * completion award, because a past paper can be re-sat any number of times
   * and a flat award would pay the same for clicking through it blind.
   */
  const recordPyqAttempt = useCallback((id: string, a: { label: string; correct: number; total: number }) => {
    const amount = a.correct * POINTS.PYQ_CORRECT;
    patchStudent(id, (s) => {
      const pool = s.pyqPoints ?? { total: 0, history: [] };
      const evt: PointEvent = {
        id: Date.now() + Math.random(),
        when: Date.now(),
        kind: "pyq_attempt",
        amount,
        meta: { label: `${a.label} - ${a.correct}/${a.total}` },
      };
      return { ...s, pyqPoints: { total: pool.total + amount, history: [...pool.history, evt] } };
    });
    return amount;
  }, [patchStudent]);

  const pyqPointsOf = useCallback((id: string) => getStudent(id).pyqPoints?.total ?? 0, [getStudent]);

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
    // Never create a second row for an address that already has one. This used
    // to append unconditionally, so adding a local demo mentor for someone who
    // had already signed up produced two cards for one person -- and worse, the
    // reconciliation below resolves identity by scanning for the FIRST email
    // match, so a real sign-in could adopt the fabricated local id instead of
    // its own Supabase uuid and drift away from Postgres entirely.
    const email = created.email.toLowerCase();
    const clash = usersRef.current.find((x) => x.email.toLowerCase() === email);
    if (clash) return clash;
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
    // Postgres plans win over the local seeds: those are demo data, these are
    // what the institute actually publishes.
    const remote = remoteTemplates.find((t) => t.id === templateId);
    const tpl = remote ?? planTemplates.find((t) => t.id === templateId);
    if (!tpl) {
      // Was a bare `return`. Adoption is the app's main onboarding path, so a
      // missing template left the student on an empty chart with no explanation
      // -- the same silent-failure shape as the mentor approval bug.
      setAuthError(`Could not apply the plan: template "${templateId}" was not found.`);
      return;
    }
    // patchChart, not patchStudent: adopting writes the chart, and the blanket
    // push only carries a student's own row.
    patchChart(id, (s) => ({
      ...s,
      // First adoption only. Switching plans later must not reset the clock,
      // or pacing could be made to read "on schedule" by re-adopting.
      planStartedAt: s.planStartedAt ?? Date.now(),
      adoptedTemplateId: templateId,
      adoptedTemplateVersion: remote?.version ?? null,
      chart: {
        ...s.chart,
        days: tpl.days.map((slots) => slots.map((slot) => ({ ...slot }))),
        commitmentScope: tpl.scope,
        status: "draft",
      },
    }));
  }, [patchChart, planTemplates, remoteTemplates]);

  const startBlankPlan = useCallback((id: string) => {
    patchChart(id, (s) => ({
      ...s,
      planStartedAt: s.planStartedAt ?? Date.now(),
      adoptedTemplateId: null,
      adoptedTemplateVersion: null,
      chart: { ...s.chart, days: [], status: "draft" },
    }));
  }, [patchChart]);

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

  /**
   * Put a student in a batch.
   *
   * This used to write only to localStorage, so the admin panel showed the
   * assignment and Postgres never heard about it. Thread visibility is
   * `batch_id = batch_of(auth.uid())` in the database, so every student kept a
   * null batch_id and saw zero discussion threads while the UI insisted they
   * were in a cohort. Same shape as the mentor-approval bug: a write that
   * looked like it worked because nothing checked.
   *
   * Goes through set_user_batch (migration 0017) rather than a table write,
   * for the reason 0008 gives -- `authenticated` has no column privilege on
   * batch_id, and granting one would let a student move themselves between
   * cohorts.
   */
  const assignStudentToBatch = useCallback((studentId: string, batchId: string | null) => {
    setUsers((prev) => prev.map((u) =>
      u.id === studentId && u.role === "student"
        ? { ...u, batchId: batchId || undefined }
        : u
    ));
    if (!supabase) return;
    void (async () => {
      const { error } = await supabase!.rpc("set_user_batch", {
        target_id: studentId, new_batch: batchId,
      });
      if (error) setAuthError(`Could not save the batch assignment: ${error.message}`);
    })();
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
    // The server stamps posted_by from the session; the local id above is only
    // what this browser shows until the next pull replaces it.
    void createAnnouncement(ann).then((r) => {
      if (r.error) setAuthError(`Could not post the announcement: ${r.error}`);
    });
    return ann;
  }, [setAnnouncements, currentUserId]);

  const deleteAnnouncement = useCallback((id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    void removeAnnouncement(id).then((r) => {
      if (r.error) setAuthError(`Could not delete the announcement: ${r.error}`);
    });
  }, [setAnnouncements]);

  const dismissAnnouncement = useCallback((id: string, userId: string) => {
    setAnnouncements((prev) => prev.map((a) =>
      a.id === id && !a.dismissedBy.includes(userId)
        ? { ...a, dismissedBy: [...a.dismissedBy, userId] }
        : a
    ));
    // Deliberately silent on failure. Dismissing is a convenience, and a red
    // banner saying an announcement could not be hidden is worse than the
    // announcement simply reappearing on the next load.
    void dismissAnnouncementFor(id, userId);
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

  const startTestAttempt = useCallback((testId: string, studentId: string, serverId?: string): string => {
    // Prefer the id Postgres minted. The server row is the one the allowance is
    // counted against, so keeping the local mirror on the same id means the two
    // can be reconciled later without guessing which sitting is which.
    const id = serverId ?? `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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

  /* ---------- Adaptive PR 6: Current Affairs CRUD ----------------------- */

  const upsertCurrentAffairs = useCallback((item: CurrentAffairsTopic) => {
    setCurrentAffairs((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i < 0) return [...prev, item];
      const next = [...prev]; next[i] = item; return next;
    });
  }, [setCurrentAffairs]);

  const removeCurrentAffairs = useCallback((id: string) => {
    setCurrentAffairs((prev) => prev.filter((x) => x.id !== id));
  }, [setCurrentAffairs]);

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
    pyqTarget, setPyqTarget,
    currentUser, students, mentors,
    loginAs, signIn, signUp, sendPasswordReset, updatePassword, recoveryMode,
    listProfiles, setUserRole, setUserMentor, defaultTemplate, defaultTemplateFor,
    remotePlanTemplates: remoteTemplates,
    authLoading, authError, clearAuthError, authEnabled: isSupabaseConfigured,
    dataLoading, dataSynced,
    logout, setLoginRoleIntent, setRoute, setActiveDay, setActiveTopicId, setAttemptSeed, setLastResult,
    setViewingStudentId, resetAll, setPassThreshold,
    getStudent, setChart, submitChartForApproval, approveChart, requestChartChanges,
    isDayUnlocked,
    finishQuiz, addOverride, updateOverride, markOverrideSeen, addMainsScore, markPyqReviewed,
    recordPyqAttempt, pyqPointsOf,
    topicCleared, markTopicStudied, questionCoverage, topicHasQuestions, dayCleared, completedDays,
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
    ensureStudentRecords, ensureStudentRecord, studentRecordsLoading,
    ensureQuestionCoverage,
    settings, updateSettings,
    featureFlags, isFeatureVisible, updateFeatureState,
    announcements,
    postAnnouncement, deleteAnnouncement, dismissAnnouncement, announcementsForStudent,
    tests, testAttempts, testSchedules, activeTestId, activeAttemptId,
    upsertTest, archiveTest, unarchiveTest, removeTest,
    setActiveTestId, setActiveAttemptId,
    startTestAttempt, saveTestAnswers, finishTestAttempt,
    upsertTestSchedule, removeTestSchedule, schedulesForTest, activeSchedulesForStudent,
    pyqBank,
    upsertPYQ, removePYQ,
    currentAffairs, setCurrentAffairs,
    upsertCurrentAffairs, removeCurrentAffairs,
    applyTopicScheduling,
    activeSession, setActiveSession,
    activeSessionMeta, setActiveSessionMeta,
    recordStudentConfusion,
    recordSmartSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export type { DaySlot };
