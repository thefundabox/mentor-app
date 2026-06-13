export interface Topic {
  id: string;
  name: string;
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
  q: string;
  a: string;
  year: string;
  explain: string;
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
  loginRoleIntent: Role | null;
  route: Route;
  activeDay: number | null;
  activeTopicId: string | null;
  attemptSeed: number;
  lastResult: QuizResult | null;
  /** When mentor is viewing a specific student */
  viewingStudentId: string | null;
  /** Active admin sub-tab */
  adminTab: "people" | "catalog" | "plans" | "stats";
}
