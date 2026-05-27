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
  score: number;
  when: number;
  byConcept?: Record<string, ConceptStat>;
}

export interface MainsScore {
  day: number;
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
}

export interface Progress {
  currentDay: number;
  completed: number[];
}

export type ChartStatus = "draft" | "pending_approval" | "approved" | "changes_requested";

export interface ChartState {
  days: (DaySlot | null)[];
  status: ChartStatus;
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

export type Role = "student" | "mentor";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** For students: id of their mentor */
  mentorId?: string;
  createdAt: number;
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
}

export type Route =
  | "auto"
  | "landing"
  | "login"
  | "onboarding"
  | "approval_gate"
  | "home"
  | "topic"
  | "quiz"
  | "results"
  | "mentor"
  | "mentor_student";

export interface AppState {
  users: User[];
  currentUserId: string | null;
  studentData: Record<string, StudentData>;
  loginRoleIntent: Role | null;
  route: Route;
  activeDay: number | null;
  attemptSeed: number;
  lastResult: QuizResult | null;
  /** When mentor is viewing a specific student */
  viewingStudentId: string | null;
}
