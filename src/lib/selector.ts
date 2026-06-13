/**
 * Adaptive practice — session selector (PR 3)
 * ============================================
 *
 * Turns the student's persisted SR state into a curated session: ordered
 * topics (weakest / Rajasthan first), a Question pulled from the shared pool
 * for each slot, and an "estimated seconds" budget so the runner knows when
 * the duration has been consumed.
 *
 * What this PR ships (the simple modes):
 *   - prelims_practice  — due topics first (per dueTopics ordering),
 *                         then fill with new topics by Rajasthan + weightage.
 *   - rajasthan_focus   — Rajasthan-flagged topics only.
 *   - weak_area_drill   — sorted by ascending confidence; never-attempted
 *                         topics are treated as confidence 0.5 (between known
 *                         strong & known weak).
 *
 * Deferred to later PRs (need additional UI / admin data):
 *   - subject_drill     — needs a subject picker UI
 *   - pyq_mode          — needs to read from pyqBank, different question shape
 *   - full_mock_prelims — fixed 150-Q distribution + mock timer
 *   - mains_*           — descriptive question UI (PR 6)
 *
 * Honest limitation: the demo question pool (QPOOL_MEWAR) is concept-tagged
 * but not topic-tagged. The selector therefore pulls questions from the
 * pool round-robin and tags each session item with the *topic the session
 * planner chose*, so the scheduler updates the right StudentTopicRecord. As
 * admins add a topic-id field to questions in a later PR, this same selector
 * will start producing on-topic content automatically.
 */

import type {
  StudentData, SubjectCatalogEntry, Question, StudentTopicRecord,
} from "@/types";
import { dueTopics, isTopicRajasthanSpecific } from "./scheduler";

export type SessionMode =
  | "prelims_practice"
  | "rajasthan_focus"
  | "weak_area_drill";

export type SessionReason =
  | "due_review"
  | "rajasthan_priority"
  | "priority_flagged"
  | "skip_prone"
  | "weak_area"
  | "new_topic"
  | "filler";

/** One slot in a session. The runner walks these in order. */
export interface SessionItem {
  /** Stable id derived from the question's place in the pool. */
  questionId: string;
  /** The actual question to render. */
  question: Question;
  /** The topic this slot is meant to exercise; SR updates target this id. */
  topicId: string;
  /** Subject the topic belongs to (for tag display in the UI). */
  subjectId: string;
  /** Why the selector chose this slot — surfaced to the student as a small chip. */
  reason: SessionReason;
  /** Time budget for this question, in seconds. MCQs default to 72s (3h / 150Q). */
  estimatedTimeSeconds: number;
}

/** Inputs are passed in explicitly so the function stays pure & testable. */
export interface BuildSessionInput {
  studentData: StudentData;
  subjects: SubjectCatalogEntry[];
  questionPool: Question[];
  mode: SessionMode;
  durationMinutes: number;
  now: number;
}

const MCQ_ESTIMATE_SECONDS = 72;

/**
 * Construct a session. Pure — does not touch storage or React.
 *
 * The returned list is ordered: the first item is the highest-priority slot,
 * the last is filler. The runner can stop early if the student exits.
 */
export function buildSession(input: BuildSessionInput): SessionItem[] {
  const { studentData, subjects, questionPool, mode, durationMinutes, now } = input;
  const capacity = Math.max(1, Math.floor((durationMinutes * 60) / MCQ_ESTIMATE_SECONDS));
  const records = studentData.topicRecords ?? [];

  // Topics indexed by id for fast subject lookup.
  const topicIndex = new Map<string, { subjectId: string; topicName: string }>();
  for (const s of subjects) {
    if (s.archived) continue;
    for (const t of s.topics) topicIndex.set(t.id, { subjectId: s.id, topicName: t.name });
  }

  const isRaj = (topicId: string) => isTopicRajasthanSpecific(subjects, topicId);

  // Plan the topic order based on the mode. Each entry pairs a topicId with
  // the reason the selector picked it. Later we hand them questions from the
  // pool.
  type Plan = { topicId: string; reason: SessionReason };
  let plan: Plan[];

  switch (mode) {
    case "weak_area_drill":
      plan = planWeakAreaDrill(records, capacity);
      break;
    case "rajasthan_focus":
      plan = planRajasthanFocus(records, subjects, capacity);
      break;
    case "prelims_practice":
    default:
      plan = planPrelimsPractice(records, subjects, isRaj, now, capacity);
      break;
  }

  // Drop topics the catalog no longer has (admin deleted them between sessions).
  plan = plan.filter((p) => topicIndex.has(p.topicId));

  // Round-robin questions from the pool, skipping ones already used in this
  // session. If we run out of unique questions, we let the same one repeat —
  // better to fill the session than to truncate it.
  const used = new Set<string>();
  const items: SessionItem[] = [];
  for (const slot of plan) {
    const meta = topicIndex.get(slot.topicId)!;
    const pick = pickQuestion(questionPool, used);
    if (!pick) break; // pool exhausted (shouldn't happen with the seed pool)
    used.add(pick.id);
    items.push({
      questionId: pick.id,
      question: pick.question,
      topicId: slot.topicId,
      subjectId: meta.subjectId,
      reason: slot.reason,
      estimatedTimeSeconds: MCQ_ESTIMATE_SECONDS,
    });
  }
  return items;
}

/* ---------- mode planners ------------------------------------------------- */

function planPrelimsPractice(
  records: StudentTopicRecord[],
  subjects: SubjectCatalogEntry[],
  isRaj: (id: string) => boolean,
  now: number,
  capacity: number,
): { topicId: string; reason: SessionReason }[] {
  // Step 1 — due topics (already ordered Rajasthan → priority → confidence).
  const due = dueTopics(records, now, isRaj);
  const plan: { topicId: string; reason: SessionReason }[] = due.map((r) => ({
    topicId: r.topicId,
    reason: pickDueReason(r, isRaj),
  }));

  // Step 2 — fill with new topics (never-attempted), prioritizing Rajasthan
  // then by weightagePercent descending. This is where coverage breadth comes
  // from on early sessions before the SR queue is populated.
  if (plan.length < capacity) {
    const attempted = new Set(records.map((r) => r.topicId));
    const newTopics = collectUnattemptedTopics(subjects, attempted);
    newTopics.sort((a, b) => {
      const aRaj = isRaj(a.topicId) ? 1 : 0;
      const bRaj = isRaj(b.topicId) ? 1 : 0;
      if (aRaj !== bRaj) return bRaj - aRaj;
      return (b.weightage ?? 0) - (a.weightage ?? 0);
    });
    for (const t of newTopics) {
      if (plan.length >= capacity) break;
      plan.push({ topicId: t.topicId, reason: "new_topic" });
    }
  }
  return plan.slice(0, capacity);
}

function planRajasthanFocus(
  records: StudentTopicRecord[],
  subjects: SubjectCatalogEntry[],
  capacity: number,
): { topicId: string; reason: SessionReason }[] {
  // All Rajasthan-flagged topics in the catalog, ordered: due first (by
  // ascending confidence), then never-attempted (by weightage).
  const rajTopics = collectTopicsMatching(subjects, (s, t) => !!(t.rajasthanSpecific || s.rajasthanSpecific));
  const recordByTopic = new Map(records.map((r) => [r.topicId, r]));

  type Cand = { topicId: string; reason: SessionReason; sortKey: number };
  const due: Cand[] = [];
  const fresh: Cand[] = [];
  for (const rt of rajTopics) {
    const rec = recordByTopic.get(rt.topicId);
    if (rec) {
      due.push({
        topicId: rt.topicId,
        reason: rec.priorityFlag ? "priority_flagged" : "rajasthan_priority",
        sortKey: rec.confidence,
      });
    } else {
      fresh.push({
        topicId: rt.topicId,
        reason: "new_topic",
        sortKey: -(rt.weightage ?? 0), // higher weightage first
      });
    }
  }
  due.sort((a, b) => a.sortKey - b.sortKey);
  fresh.sort((a, b) => a.sortKey - b.sortKey);
  return [...due, ...fresh].slice(0, capacity).map(({ topicId, reason }) => ({ topicId, reason }));
  // ^ We intentionally ignore `sortKey` past this point.
}

function planWeakAreaDrill(
  records: StudentTopicRecord[],
  capacity: number,
): { topicId: string; reason: SessionReason }[] {
  // Sort by ascending confidence — the weakest first. skip-prone gets a
  // small priority bump so the student can't keep dodging it.
  const sorted = [...records].sort((a, b) => {
    const aBump = a.skipProne ? -0.1 : 0;
    const bBump = b.skipProne ? -0.1 : 0;
    return (a.confidence + aBump) - (b.confidence + bBump);
  });
  return sorted.slice(0, capacity).map((r) => ({
    topicId: r.topicId,
    reason: r.skipProne ? "skip_prone" : "weak_area",
  }));
}

/* ---------- helpers ------------------------------------------------------- */

function pickDueReason(rec: StudentTopicRecord, isRaj: (id: string) => boolean): SessionReason {
  if (rec.skipProne) return "skip_prone";
  if (rec.priorityFlag) return "priority_flagged";
  if (isRaj(rec.topicId)) return "rajasthan_priority";
  return "due_review";
}

function collectUnattemptedTopics(
  subjects: SubjectCatalogEntry[],
  attempted: Set<string>,
): { topicId: string; weightage?: number }[] {
  const out: { topicId: string; weightage?: number }[] = [];
  for (const s of subjects) {
    if (s.archived) continue;
    for (const t of s.topics) {
      if (attempted.has(t.id)) continue;
      out.push({ topicId: t.id, weightage: t.weightagePercent });
    }
  }
  return out;
}

function collectTopicsMatching(
  subjects: SubjectCatalogEntry[],
  predicate: (s: SubjectCatalogEntry, t: SubjectCatalogEntry["topics"][number]) => boolean,
): { topicId: string; weightage?: number }[] {
  const out: { topicId: string; weightage?: number }[] = [];
  for (const s of subjects) {
    if (s.archived) continue;
    for (const t of s.topics) {
      if (predicate(s, t)) out.push({ topicId: t.id, weightage: t.weightagePercent });
    }
  }
  return out;
}

/**
 * Take the next unused question from the pool. Returns null only if the pool
 * itself is empty — once we exhaust the unused subset we recycle, because
 * truncating the session loses more than the repetition costs.
 */
function pickQuestion(
  pool: Question[],
  used: Set<string>,
): { id: string; question: Question } | null {
  if (pool.length === 0) return null;
  for (let i = 0; i < pool.length; i++) {
    const id = stableQuestionId(pool[i], i);
    if (!used.has(id)) return { id, question: pool[i] };
  }
  // Recycle from the start. Mark id with a suffix so duplicates have unique
  // session ids and the runner's keyed state doesn't collide.
  const id = stableQuestionId(pool[0], 0) + "_dup_" + used.size;
  return { id, question: pool[0] };
}

/**
 * Until questions have proper stable ids in the admin tab, derive one from
 * the (concept, index) pair. Stable across renders within a session.
 */
function stableQuestionId(q: Question, idx: number): string {
  return `${q.concept || "q"}_${idx}`;
}
