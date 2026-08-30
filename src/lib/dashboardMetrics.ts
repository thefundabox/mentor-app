/**
 * Adaptive practice — dashboard metrics (PR 5)
 * =============================================
 *
 * Pure aggregations over a student's persisted state. The Dashboard page
 * reads these directly; no React inside this module so the same computations
 * can later be reused by an export job, a mentor analytics screen, or a
 * Supabase RPC when the migration lands.
 *
 * Anything that aggregates across topics weights by attemptsTotal so a
 * once-touched topic doesn't drown out a heavily-practiced one.
 */

import type {
  StudentData, SubjectCatalogEntry, ConfusionPair,
  StudentTopicRecord, SmartSessionRecord, TestAttempt,
} from "@/types";
import { getTopConfusions } from "./confusion";

export type NegativeMarkingRisk = "low" | "medium" | "high";
export type TopicStatus = "not_started" | "in_progress" | "confident" | "mastered";
export type TrendDirection = "improving" | "declining" | "stable" | "unknown";

export interface SubjectBreakdownRow {
  subjectId: string;
  subjectName: string;
  icon: string;
  rajasthanSpecific: boolean;
  /** Total attempts across all topics in this subject. */
  attempts: number;
  correct: number;
  /** 0–1, undefined if no attempts. */
  accuracy: number | null;
  /** 0–1; sum of topic weightagePercent / 100 within this subject. */
  weight: number;
  /** Trend over the last 14 days vs the prior 14 days. */
  trend: TrendDirection;
}

export interface SyllabusCoverageRow {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  status: TopicStatus;
  attempts: number;
  accuracy: number | null;
  nextReviewAt: number | null;
  isRajasthanSpecific: boolean;
  weightagePercent: number | undefined;
}

export interface MockTestTrendPoint {
  testId: string;
  finishedAt: number;
  score: number;
  maxScore: number;
  /** 0–100 normalized. */
  percent: number;
}

/** How much of a scope has been practised at all. */
export interface CoverageCount {
  /** Microthemes with at least one attempt. */
  practised: number;
  /** Microthemes in scope, practised or not. */
  total: number;
}

export interface DashboardMetrics {
  /**
   * 0–100 across every non-archived microtheme. Coverage counts: a microtheme
   * never attempted contributes 0, it is not excluded. See `readinessOver`.
   */
  prelimsReadiness: number;
  /** 0–100, same calc over Rajasthan-flagged microthemes only. */
  rajasthanReadiness: number;
  /** Denominator behind `prelimsReadiness`, for display. */
  prelimsCoverage: CoverageCount;
  /** Denominator behind `rajasthanReadiness`, for display. */
  rajasthanCoverage: CoverageCount;
  subjects: SubjectBreakdownRow[];
  /** Three weakest subjects by accuracy. Filtered to attempted-only. */
  weakSubjects: SubjectBreakdownRow[];
  /** Three strongest subjects by accuracy. Filtered to attempted-only. */
  strongSubjects: SubjectBreakdownRow[];
  negativeMarkingRisk: NegativeMarkingRisk;
  /** Most recent up to 5 mock test percentages, oldest first. */
  mockTestTrend: MockTestTrendPoint[];
  /** One row per non-archived topic in the catalog. */
  syllabusCoverage: SyllabusCoverageRow[];
  syllabusSummary: {
    total: number;
    notStarted: number;
    inProgress: number;
    confident: number;
    mastered: number;
  };
  topConfusions: ConfusionPair[];
  /** Total Smart Practice sessions ever run by this student. */
  sessionsRun: number;
  /** Sum of `shouldHaveSkipped` across all sessions — a discipline counter. */
  shouldHaveSkippedTotal: number;
}

const MASTERED_CONFIDENCE = 0.85;
const CONFIDENT_CONFIDENCE = 0.6;
const MASTERED_MIN_ATTEMPTS = 5;
const CONFIDENT_MIN_ATTEMPTS = 3;

const TREND_WINDOW_MS = 14 * 86400000;
const TREND_HALF_WINDOW_MS = 7 * 86400000;

const RISK_LOW = 0.05;   // shouldHaveSkipped/attempted below this = low
const RISK_HIGH = 0.15;  // above this = high

/**
 * Compute the full dashboard payload for a student. Pure — pass in
 * everything that contributes to the answer so this remains trivially
 * unit-testable.
 */
export function computeDashboard(
  student: StudentData,
  subjects: SubjectCatalogEntry[],
  testAttempts: TestAttempt[],
  studentId: string,
  now: number = Date.now(),
): DashboardMetrics {
  const records = student.topicRecords ?? [];
  const sessions = student.smartSessions ?? [];

  const subjectRows = buildSubjectRows(records, subjects, sessions, now);
  const attemptedSubjects = subjectRows.filter((s) => s.accuracy !== null);

  const weakSubjects = [...attemptedSubjects].sort((a, b) => (a.accuracy! - b.accuracy!)).slice(0, 3);
  const strongSubjects = [...attemptedSubjects].sort((a, b) => (b.accuracy! - a.accuracy!)).slice(0, 3);

  const syllabusCoverage = buildSyllabusCoverage(records, subjects);
  const syllabusSummary = summarizeCoverage(syllabusCoverage);

  // Readiness is computed per *microtheme*, not per subject, and over the whole
  // scope rather than the attempted part of it. Both choices are corrections.
  //
  // Scoring only what had been attempted meant the number started at its
  // maximum and fell as the student worked: three correct answers in one
  // microtheme read 100/100, and so did mastering all 37 of Rajasthan History.
  // The two were indistinguishable, which is no use next to a countdown.
  //
  // Aggregating per subject then averaging those averages weighted an
  // 11-microtheme subject the same as a 37-microtheme one. Going straight to
  // the microtheme rows makes the syllabus itself the weight.
  const rajRows = syllabusCoverage.filter((r) => r.isRajasthanSpecific);
  const prelimsReadiness = readinessOver(syllabusCoverage);
  const rajasthanReadiness = readinessOver(rajRows);

  return {
    prelimsReadiness,
    rajasthanReadiness,
    prelimsCoverage: coverageOf(syllabusCoverage),
    rajasthanCoverage: coverageOf(rajRows),
    subjects: subjectRows,
    weakSubjects,
    strongSubjects,
    negativeMarkingRisk: computeRisk(sessions),
    mockTestTrend: buildMockTrend(testAttempts, studentId),
    syllabusCoverage,
    syllabusSummary,
    topConfusions: getTopConfusions(student.confusionPairs ?? [], 10),
    sessionsRun: sessions.length,
    shouldHaveSkippedTotal: sessions.reduce((acc, s) => acc + s.shouldHaveSkipped, 0),
  };
}

/* ---------- subject aggregation ------------------------------------------ */

function buildSubjectRows(
  records: StudentTopicRecord[],
  subjects: SubjectCatalogEntry[],
  sessions: SmartSessionRecord[],
  now: number,
): SubjectBreakdownRow[] {
  const recordByTopic = new Map(records.map((r) => [r.topicId, r]));

  return subjects
    .filter((s) => !s.archived)
    .map((s) => {
      let attempts = 0, correct = 0, weight = 0;
      for (const t of s.topics) {
        const r = recordByTopic.get(t.id);
        weight += (t.weightagePercent ?? 0) / 100;
        if (!r) continue;
        attempts += r.attemptsTotal;
        correct += r.attemptsCorrect;
      }
      const accuracy = attempts > 0 ? correct / attempts : null;
      // Trend uses session-level signal (we don't keep per-topic time series).
      // It is a coarse proxy: "is the student doing better lately?" not "is
      // this subject improving specifically." Refined in a later PR.
      const trend = computeTrend(sessions, now);
      return {
        subjectId: s.id,
        subjectName: s.name,
        icon: s.icon,
        // Subject-level on purpose, and deliberately NOT the `t || s` rule used
        // by scheduler.ts / selector.ts / questionImport.ts. This drives a
        // "Rajasthan" badge beside the subject name, so it must describe the
        // subject: Current Affairs holds one Rajasthan statute (m243) among
        // eight national microthemes, and badging the whole subject Rajasthan
        // on that basis would misread it. Rajasthan readiness does not come
        // from here -- it is computed per microtheme off syllabusCoverage,
        // which does apply `t || s` and so does count m243.
        rajasthanSpecific: !!s.rajasthanSpecific,
        attempts,
        correct,
        accuracy,
        weight,
        trend,
      };
    });
}

/**
 * 0-100 over a set of microthemes. An unattempted microtheme scores 0 rather
 * than being dropped, so the number answers "how much of this could you
 * answer today", which is what a readiness bar in front of an exam claims.
 *
 * Weights are all-or-nothing on purpose. `weightagePercent` is optional and is
 * currently set on none of the 243 microthemes; honouring it on a partial set
 * would let a handful of tagged microthemes silently become the entire score,
 * since the untagged ones would fall back to a different unit. Either the whole
 * scope carries weights or every microtheme counts once.
 */
function readinessOver(rows: SyllabusCoverageRow[]): number {
  if (rows.length === 0) return 0;
  const fullyWeighted = rows.every((r) => r.weightagePercent !== undefined);
  let num = 0, den = 0;
  for (const r of rows) {
    const w = fullyWeighted ? r.weightagePercent! : 1;
    den += w;
    num += (r.accuracy ?? 0) * w;
  }
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function coverageOf(rows: SyllabusCoverageRow[]): CoverageCount {
  return { practised: rows.filter((r) => r.attempts > 0).length, total: rows.length };
}

/* ---------- syllabus coverage -------------------------------------------- */

function buildSyllabusCoverage(
  records: StudentTopicRecord[],
  subjects: SubjectCatalogEntry[],
): SyllabusCoverageRow[] {
  const recordByTopic = new Map(records.map((r) => [r.topicId, r]));
  const out: SyllabusCoverageRow[] = [];
  for (const s of subjects) {
    if (s.archived) continue;
    for (const t of s.topics) {
      const r = recordByTopic.get(t.id);
      const accuracy = r && r.attemptsTotal > 0 ? r.attemptsCorrect / r.attemptsTotal : null;
      out.push({
        topicId: t.id,
        topicName: t.name,
        subjectId: s.id,
        subjectName: s.name,
        status: classifyStatus(r),
        attempts: r?.attemptsTotal ?? 0,
        accuracy,
        nextReviewAt: r?.nextReviewAt ?? null,
        isRajasthanSpecific: !!(t.rajasthanSpecific || s.rajasthanSpecific),
        weightagePercent: t.weightagePercent,
      });
    }
  }
  return out;
}

function classifyStatus(r: StudentTopicRecord | undefined): TopicStatus {
  if (!r || r.attemptsTotal === 0) return "not_started";
  if (r.confidence >= MASTERED_CONFIDENCE && r.attemptsTotal >= MASTERED_MIN_ATTEMPTS) return "mastered";
  if (r.confidence >= CONFIDENT_CONFIDENCE && r.attemptsTotal >= CONFIDENT_MIN_ATTEMPTS) return "confident";
  return "in_progress";
}

function summarizeCoverage(rows: SyllabusCoverageRow[]) {
  let notStarted = 0, inProgress = 0, confident = 0, mastered = 0;
  for (const r of rows) {
    switch (r.status) {
      case "not_started": notStarted++; break;
      case "in_progress": inProgress++; break;
      case "confident":   confident++;  break;
      case "mastered":    mastered++;   break;
    }
  }
  return { total: rows.length, notStarted, inProgress, confident, mastered };
}

/* ---------- trends + risk + mock chart ----------------------------------- */

function computeTrend(sessions: SmartSessionRecord[], now: number): TrendDirection {
  const cutoff = now - TREND_WINDOW_MS;
  const recent = sessions.filter((s) => s.finishedAt >= cutoff);
  if (recent.length < 2) return "unknown";
  const mid = now - TREND_HALF_WINDOW_MS;
  const newer = recent.filter((s) => s.finishedAt >= mid);
  const older = recent.filter((s) => s.finishedAt < mid);
  if (newer.length === 0 || older.length === 0) return "unknown";
  const accNewer = avgAccuracy(newer);
  const accOlder = avgAccuracy(older);
  const delta = accNewer - accOlder;
  if (delta > 0.05) return "improving";
  if (delta < -0.05) return "declining";
  return "stable";
}

function avgAccuracy(sessions: SmartSessionRecord[]): number {
  let attempted = 0, correct = 0;
  for (const s of sessions) {
    attempted += s.attempted;
    correct += s.correct;
  }
  return attempted > 0 ? correct / attempted : 0;
}

function computeRisk(sessions: SmartSessionRecord[]): NegativeMarkingRisk {
  // Look at the most recent 5 sessions only — older discipline is stale.
  const recent = [...sessions].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 5);
  if (recent.length === 0) return "low";
  let attempted = 0, shouldHave = 0;
  for (const s of recent) {
    attempted += s.attempted;
    shouldHave += s.shouldHaveSkipped;
  }
  if (attempted === 0) return "low";
  const ratio = shouldHave / attempted;
  if (ratio >= RISK_HIGH) return "high";
  if (ratio >= RISK_LOW) return "medium";
  return "low";
}

function buildMockTrend(testAttempts: TestAttempt[], studentId: string): MockTestTrendPoint[] {
  return testAttempts
    .filter((a) => a.studentId === studentId && a.finishedAt && a.maxScore && a.score !== undefined)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0))
    .slice(-5)
    .map((a) => ({
      testId: a.testId,
      finishedAt: a.finishedAt!,
      score: a.score!,
      maxScore: a.maxScore!,
      percent: Math.round(((a.score! / a.maxScore!) * 100)),
    }));
}
