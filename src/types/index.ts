/** A reference document attached to a topic — typically a PDF, but any external URL works. */
export interface TopicDocument {
  name: string;
  url: string;
}

export interface Topic {
  id: string;
  name: string;
  /** Optional embedded video for the topic. URL or data: URI. */
  videoUrl?: string;
  /** Optional PDFs / external doc links shown on the topic page. */
  documents?: TopicDocument[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: Topic[];
}

export interface DaySlot {
  subjectId: string;
  topicId: string;
}

export interface Question {
  type: "conceptual" | "analytical";
  concept: string;
  q: string;
  options: string[];
  correct: number;
  why: string;
  _idx?: number;
  _foundation?: boolean;
}

export interface PYQ {
  /** Optional stable id for admin CRUD; auto-generated if missing. */
  id?: string;
  q: string;
  a: string;
  year: string;
  explain: string;
  /** Subject ids this PYQ belongs to (for filtering). */
  subjectIds?: string[];
  /** Optional topic ids for finer filtering. */
  topicIds?: string[];
  /** Optional marks for this question. */
  marks?: number;
}

export interface MainsPrompt {
  prompt: string;
  rubric: string[];
}

export interface Override {
  id: number;
  day: number;
  status: "pending" | "approved" | "declined";
  attempts: number;
  bestScore: number;
}

export interface ConceptStat {
  right: number;
  wrong: number;
}

export interface Attempt {
  day: number;
  topicId: string;
  score: number;
  when: number;
  byConcept?: Record<string, ConceptStat>;
}

export interface MainsScore {
  day: number;
  topicId: string;
  score: number;
  when: number;
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
  missedConcepts: string[];
  byConcept?: Record<string, ConceptStat>;
  pointsAwarded?: number;
  firstTry?: boolean;
  topicId: string;
  dayClearedNow?: boolean;
  topicsRemainingInDay?: number;
}

export interface Progress {
  currentDay: number;
}

export type ChartStatus = "draft" | "pending_approval" | "approved" | "changes_requested";

/** How big a slice the student commits at a time. */
export type CommitmentScope = "week" | "month" | "overall";

export const SCOPE_DAYS: Record<CommitmentScope, number> = {
  week: 7,
  month: 30,
  overall: Number.MAX_SAFE_INTEGER,
};

export const SCOPE_LABEL: Record<CommitmentScope, string> = {
  week: "Week",
  month: "Month",
  overall: "Overall",
};

export interface ChartState {
  /** Each day holds 0..N topics. An empty array means an unscheduled day. */
  days: DaySlot[][];
  status: ChartStatus;
  /** Default scope used when the student commits the next slice. */
  commitmentScope: CommitmentScope;
  /** Day index (1-based) that the student is submitting / has submitted for approval. 0 = nothing committed. */
  committedThrough: number;
  /** Day index (1-based) that the mentor has approved. 0 = not yet approved. */
  approvedThrough: number;
  submittedAt?: number;
  decidedAt?: number;
  feedback?: string;
}

export type PointKind =
  | "quiz_pass"
  | "first_try_bonus"
  | "mains_submit"
  | "pyq_review"
  | "chart_approved"
  | "streak_bonus";

export interface PointEvent {
  id: number;
  when: number;
  kind: PointKind;
  amount: number;
  meta?: { day?: number; label?: string };
}

export interface PointsState {
  total: number;
  history: PointEvent[];
}

export type Role = "student" | "mentor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** For students: id of their mentor */
  mentorId?: string;
  /** For students: the cohort/batch they're enrolled in. */
  batchId?: string;
  createdAt: number;
}

/** Subject in the runtime catalog — admins can soft-delete (archived). */
export interface SubjectCatalogEntry extends Subject {
  archived?: boolean;
}

export type SelfRatedLevel = "beginner" | "intermediate" | "advanced";

/** Captured once on signup, before the student picks a plan. */
export interface Assessment {
  /** Daily commitment in minutes. Hard-capped at 480 (8h). */
  timeCommitMins: number;
  selfRatedLevel: SelfRatedLevel;
  /** Free-form id matching one of the admin-managed roadblock options. */
  roadblockId: string;
  /** mcqId -> selected option index. */
  mcqAnswers: Record<string, number>;
  /** % of placement MCQs answered correctly. null if there were no MCQs. */
  placementScore: number | null;
  submittedAt: number;
}

/** A scheduling rule that pins a test to specific batches with a release window. */
export interface TestSchedule {
  id: string;
  testId: string;
  /** Empty array = institute-wide (every batch). */
  batchIds: string[];
  /** ms when the test unlocks. Required. */
  releaseAt: number;
  /** Optional ms when it closes (after which students can't start it). */
  closeAt?: number;
}

/** A single section inside a Test — typically scoped to one or two subjects. */
export interface TestSection {
  id: string;
  /** Display name, e.g. "Polity" or "History — Modern". */
  name: string;
  /** Pull questions only from these subject ids. Empty = any subject. */
  subjectIds: string[];
  /** How many questions in this section. */
  questionCount: number;
  /** Marks awarded per correct answer. */
  marksPerQuestion: number;
  /** Marks deducted per wrong answer (positive number — applied as negative). */
  negativeMarks: number;
}

/** A test definition — admin-built, taken by students, scored on submit. */
export interface Test {
  id: string;
  /** Display title, e.g. "RAS 2026 Mock #1". */
  title: string;
  /** Short blurb shown on the test card. */
  description?: string;
  /** Test category — drives default section structure. */
  type: "sectional" | "full-length" | "custom";
  sections: TestSection[];
  /** Total time the student has, in minutes. */
  durationMins: number;
  archived?: boolean;
  createdAt: number;
}

/** A student's attempt at a test — stores answers and computed scores. */
export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  startedAt: number;
  finishedAt?: number;
  /** questionId → chosen option index. Missing = unattempted. */
  answers: Record<string, number>;
  /** Total marks scored. Undefined until finishedAt is set. */
  score?: number;
  /** Maximum achievable marks. */
  maxScore?: number;
  /** Section-level breakdown (sectionId → stats). */
  sectionScores?: Record<string, { right: number; wrong: number; unattempted: number; marks: number }>;
}

/** A timed message posted by a mentor or admin to a batch (or institute-wide). */
export interface Announcement {
  id: string;
  /** null = institute-wide (every student sees it). Otherwise the batch this targets. */
  batchId: string | null;
  body: string;
  postedAt: number;
  postedBy: string;
  /** Optional expiry; after this the announcement stops showing. */
  expiresAt?: number;
  /** User ids who have dismissed this on their side. */
  dismissedBy: string[];
}

/** A cohort/batch within the institute — groups students under a shared schedule and mentor(s). */
export interface Batch {
  id: string;
  /** Display name, e.g. "RAS 2026 Morning". */
  name: string;
  /** Free-form vertical/exam tag, e.g. "RAS", "UPSC", "Banking". */
  vertical: string;
  /** Optional short description shown to students. */
  description?: string;
  /** Calendar start of the batch (ms). Day 1 of plans is anchored here. */
  startDate: number;
  /** Optional end (ms). */
  endDate?: number;
  /** Mentor ids assigned to this batch. */
  mentorIds: string[];
  /** Optional default plan template that new students in this batch are nudged toward. */
  defaultPlanTemplateId?: string;
  /** Soft-delete flag. */
  archived?: boolean;
  createdAt: number;
}

/** A single step in the Introduction Tour. Steps are admin-editable. */
export interface TourStep {
  id: string;
  /** Where this step appears in the sequence (lower = earlier). */
  order: number;
  /** Headline shown in the tour popover. */
  title: string;
  /** Body copy in the popover. Plain text. */
  body: string;
  /**
   * Either a CSS selector pointing at a `data-tour="..."` attribute on the page,
   * or `"__center__"` for an unanchored centered popover (used for intro/outro).
   */
  target: string;
  /** Popover side relative to the target. driver.js side values. */
  side?: "top" | "right" | "bottom" | "left" | "over";
  /** Optional align value passed to driver.js. */
  align?: "start" | "center" | "end";
  /** Which screen this step belongs on (used to auto-route during the tour). */
  screen?: "home" | "topic" | "onboarding" | "approval_gate";
}

/** Admin-curated starter plan a student can adopt during onboarding. */
export interface PlanTemplate {
  id: string;
  name: string;
  blurb: string;
  scope: CommitmentScope;
  /** Same shape as ChartState.days — pre-filled day slots. */
  days: DaySlot[][];
}

export interface StudentData {
  chart: ChartState;
  progress: Progress;
  overrides: Override[];
  attempts: Attempt[];
  mainsScores: MainsScore[];
  points: PointsState;
  pyqsReviewed: string[];
  lastActivityAt?: number;
  /** Set once the student finishes the signup assessment. Missing on legacy/seed users. */
  assessment?: Assessment;
  /** If the student adopted a plan template, its id. null/undefined = built own. */
  adoptedTemplateId?: string | null;
  /** True once the student has finished the Introduction Tour at least once. */
  hasSeenTour?: boolean;
}

export type Route =
  | "auto"
  | "landing"
  | "login"
  | "assessment"
  | "choose_plan"
  | "onboarding"
  | "approval_gate"
  | "home"
  | "topic"
  | "quiz"
  | "results"
  | "tests"
  | "take_test"
  | "test_result"
  | "pyq_archive"
  | "mentor"
  | "mentor_student"
  | "admin";

export interface AppState {
  users: User[];
  currentUserId: string | null;
  studentData: Record<string, StudentData>;
  /** Runtime-editable subject catalog (admin-maintained). */
  subjects: SubjectCatalogEntry[];
  /** Admin-curated default plan templates students can adopt. */
  planTemplates: PlanTemplate[];
  /** Admin-editable Introduction Tour steps. */
  tourSteps: TourStep[];
  /** Admin-editable main quiz question bank (conceptual + analytical). */
  quizPool: Question[];
  /** Admin-editable foundation questions per concept, used for adaptive remediation. */
  foundationPool: Record<string, Question[]>;
  /** Admin-editable placement check shown during the signup assessment. */
  placementPool: Question[];
  /** Admin-managed cohorts (batches) within the institute. */
  batches: Batch[];
  /** Mentor/admin-posted announcements (batch-targeted or institute-wide). */
  announcements: Announcement[];
  /** Admin-built tests (mock / sectional / custom). */
  tests: Test[];
  /** Student test attempt records. */
  testAttempts: TestAttempt[];
  /** Scheduling rules pinning tests to batches with release/close dates. */
  testSchedules: TestSchedule[];
  /** Admin-managed PYQ archive (year-tagged, searchable). */
  pyqBank: PYQ[];
  loginRoleIntent: Role | null;
  route: Route;
  activeDay: number | null;
  activeTopicId: string | null;
  attemptSeed: number;
  lastResult: QuizResult | null;
  /** When mentor is viewing a specific student */
  viewingStudentId: string | null;
  /** Test the student is currently taking (or just submitted). */
  activeTestId: string | null;
  /** Attempt record id for the test in progress / just submitted. */
  activeAttemptId: string | null;
  /** Active admin sub-tab */
  adminTab: "people" | "catalog" | "plans" | "tour" | "questions" | "batches" | "tests" | "stats";
}
