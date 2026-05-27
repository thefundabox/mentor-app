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

export interface Attempt {
  day: number;
  score: number;
  when: number;
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
}

export interface Progress {
  currentDay: number;
  completed: number[];
}

export type Route = "auto" | "onboarding" | "home" | "topic" | "quiz" | "results" | "mentor";

export type Role = "student" | "mentor";

export interface AppState {
  role: Role;
  chart: (DaySlot | null)[];
  progress: Progress;
  overrides: Override[];
  attempts: Attempt[];
  mainsScores: MainsScore[];
  route: Route;
  activeDay: number | null;
  attemptSeed: number;
  lastResult: QuizResult | null;
}

export type AppAction =
  | { type: "SET_ROLE"; payload: Role }
  | { type: "SET_CHART"; payload: (DaySlot | null)[] }
  | { type: "SET_PROGRESS"; payload: Progress }
  | { type: "SET_OVERRIDES"; payload: Override[] }
  | { type: "SET_ATTEMPTS"; payload: Attempt[] }
  | { type: "SET_MAINS_SCORES"; payload: MainsScore[] }
  | { type: "SET_ROUTE"; payload: Route }
  | { type: "SET_ACTIVE_DAY"; payload: number | null }
  | { type: "SET_ATTEMPT_SEED"; payload: number }
  | { type: "SET_LAST_RESULT"; payload: QuizResult | null }
  | { type: "ADD_ATTEMPT"; payload: Attempt }
  | { type: "ADD_OVERRIDE"; payload: Override }
  | { type: "UPDATE_OVERRIDE"; payload: Override }
  | { type: "ADD_MAINS_SCORE"; payload: MainsScore }
  | { type: "COMPLETE_DAY"; payload: { day: number; nextDay: number } }
  | { type: "RESET" };
