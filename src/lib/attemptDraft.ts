/**
 * In-progress quiz attempt, kept on disk.
 *
 * Answers used to live only in QuizScreen's component state, so anything that
 * unmounted the screen mid-paper — a dropped session, a crash, a stray reload —
 * took every answer with it and sent the student back to question one. That is
 * what made an intermittent fault expensive rather than merely irritating.
 *
 * `key` pins a draft to one exact paper: user, day, topic and attemptSeed.
 * attemptSeed decides the question order, so a draft must never be poured into
 * a paper built from a different seed — a mismatch is discarded, never
 * repaired. TopicScreen reads the seed back out of a draft so that resuming
 * rebuilds the same paper rather than starting a new one.
 */

const DRAFT_KEY = "v6_attemptDraft";

export interface AttemptDraft {
  key: string;
  selected: (number | null)[];
  flagged: boolean[];
  current: number;
  spent: number[];
  elapsedMs: number;
}

export function draftKeyFor(userId: string, dayNum: number, topicId: string, seed: number) {
  return `${userId}|${dayNum}|${topicId}|${seed}`;
}

/** Raw stored draft, whatever paper it belongs to. Null if absent or unparseable. */
function rawDraft(): AttemptDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as AttemptDraft;
    return d && typeof d.key === "string" && Array.isArray(d.selected) ? d : null;
  } catch {
    return null;
  }
}

/**
 * The seed of an unfinished attempt at this topic, or null. Lets "start quiz"
 * resume the paper the student was already on instead of dealing a new one and
 * stranding their answers under a key nothing will look up again.
 */
export function resumableSeed(userId: string, dayNum: number, topicId: string): number | null {
  const d = rawDraft();
  if (!d) return null;
  const prefix = `${userId}|${dayNum}|${topicId}|`;
  if (!d.key.startsWith(prefix)) return null;
  if (!d.selected.some((v) => v !== null)) return null;
  const seed = Number(d.key.slice(prefix.length));
  return Number.isFinite(seed) ? seed : null;
}

/** Draft for this exact paper, validated against its length. */
export function readDraft(key: string, total: number): AttemptDraft | null {
  const d = rawDraft();
  if (!d || d.key !== key) return null;
  if (d.selected.length !== total) return null;
  if (!Array.isArray(d.flagged) || d.flagged.length !== total) return null;
  // An untouched draft is not worth announcing a restore for.
  if (!d.selected.some((v) => v !== null)) return null;
  return {
    key: d.key,
    selected: d.selected,
    flagged: d.flagged,
    current: Number.isInteger(d.current) && d.current >= 0 ? d.current : 0,
    spent: Array.isArray(d.spent) && d.spent.length === total ? d.spent : Array(total).fill(0),
    elapsedMs: Number.isFinite(d.elapsedMs) && d.elapsedMs >= 0 ? d.elapsedMs : 0,
  };
}

export function writeDraft(d: AttemptDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Quota or a disabled store. Losing the draft is bad but not worth taking
    // the attempt down over — the student can still finish the paper in front
    // of them.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do; a stale draft is rejected on key mismatch anyway.
  }
}
