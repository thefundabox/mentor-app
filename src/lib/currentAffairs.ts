/**
 * Adaptive practice — Current Affairs helpers (PR 6)
 * ====================================================
 *
 * RAS prelims heavily tests current affairs from the last 12–18 months.
 * The CA layer has three jobs:
 *
 *   1. Auto-deactivate stale items (past expiresAt) so they never reach
 *      the question selector or the daily digest.
 *   2. Serve a small set of recent active items to the StudentHome
 *      digest card as a warm-up before each session.
 *   3. Feed an >=15% question quota into prelims_practice sessions when
 *      admins have attached questions to active CA items.
 *
 * All pure — caller persists the result.
 */

import type { CurrentAffairsTopic, Question } from "@/types";

/** Mark any item past its expiresAt as inactive. Pure — returns a new list. */
export function deactivateExpiredTopics(
  topics: CurrentAffairsTopic[],
  now: number = Date.now(),
): CurrentAffairsTopic[] {
  let changed = false;
  const next = topics.map((t) => {
    if (t.isActive && t.expiresAt <= now) {
      changed = true;
      return { ...t, isActive: false };
    }
    return t;
  });
  return changed ? next : topics;
}

/**
 * Currently-active items, newest event first. Drives the digest card and
 * the selector's CA pool.
 */
export function activeTopics(topics: CurrentAffairsTopic[]): CurrentAffairsTopic[] {
  return [...topics]
    .filter((t) => t.isActive)
    .sort((a, b) => b.dateOfEvent - a.dateOfEvent);
}

/**
 * Up to N most recent active items for the daily digest, skipping any whose
 * id appears in `seenIds` (the per-student dismissed set on StudentData
 * later — for PR 6 we pass an empty Set and revisit dismissal in a follow-up
 * if the user reports the card being noisy).
 */
export function dailyDigest(
  topics: CurrentAffairsTopic[],
  limit: number = 3,
  seenIds: Set<string> = new Set(),
): CurrentAffairsTopic[] {
  return activeTopics(topics).filter((t) => !seenIds.has(t.id)).slice(0, limit);
}

/**
 * Flatten all questions attached to active CA items into one pool, tagged
 * with the topic id so the selector can attribute answers correctly when
 * we eventually scope SR to CA topics. For now, the topic id is also the
 * "topicId" passed through SessionItem since CA items don't live in the
 * subject catalog.
 */
export interface CAQuestionEntry {
  caTopicId: string;
  question: Question;
}

export function flattenActiveCAQuestions(topics: CurrentAffairsTopic[]): CAQuestionEntry[] {
  const out: CAQuestionEntry[] = [];
  for (const t of activeTopics(topics)) {
    for (const q of t.questions ?? []) out.push({ caTopicId: t.id, question: q });
  }
  return out;
}
