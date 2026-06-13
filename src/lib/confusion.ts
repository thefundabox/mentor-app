/**
 * Adaptive practice — confusion-pair tracking (PR 4 · Layer A)
 * =============================================================
 *
 * When a student picks a wrong MCQ option, we record which distractor they
 * chose. Across many attempts, frequent (correctConcept, confusedWith) pairs
 * reveal the actual mental confusions — useful for both the student
 * ("you usually muddle X with Y") and the mentor (where to target a
 * remedial session). PR 5's dashboard reads this; a later PR can teach
 * the question selector to surface comparative MCQs for the top pairs.
 *
 * Pure helpers — no React, no storage. The caller persists via
 * patchStudent / setStudentData.
 */

import type { ConfusionPair } from "@/types";

/**
 * Upsert a confusion pair into the student's list. If the (correctConcept,
 * confusedWith, topicId) tuple already exists, increment its count and
 * refresh lastOccurredAt; otherwise append a new pair.
 *
 * Pure — returns the new list. Caller persists it.
 */
export function recordConfusion(
  pairs: ConfusionPair[],
  correctConcept: string,
  confusedWith: string,
  topicId: string,
  now: number = Date.now(),
): ConfusionPair[] {
  const existingIdx = pairs.findIndex(
    (p) => p.correctConcept === correctConcept
      && p.confusedWith === confusedWith
      && p.topicId === topicId,
  );
  if (existingIdx >= 0) {
    const next = [...pairs];
    next[existingIdx] = {
      ...next[existingIdx],
      count: next[existingIdx].count + 1,
      lastOccurredAt: now,
    };
    return next;
  }
  const fresh: ConfusionPair = {
    id: `cp_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    correctConcept,
    confusedWith,
    topicId,
    count: 1,
    lastOccurredAt: now,
  };
  return [...pairs, fresh];
}

/**
 * Top N confusion pairs for a student, sorted by count desc and then
 * by recency desc. Returns at most `limit` rows.
 */
export function getTopConfusions(
  pairs: ConfusionPair[],
  limit: number = 10,
): ConfusionPair[] {
  return [...pairs]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastOccurredAt - a.lastOccurredAt;
    })
    .slice(0, limit);
}
