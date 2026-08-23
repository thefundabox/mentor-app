/**
 * In-progress quiz attempts, kept on disk.
 *
 * Answers used to live only in QuizScreen's component state, so anything that
 * unmounted the screen mid-paper — a dropped session, a crash, a stray reload —
 * took every answer with it and sent the student back to question one.
 *
 * Two things guard a restore, because a draft is just an array of option
 * indices and means nothing without the paper it was written against:
 *
 *  - `key` pins it to one user, day, topic and attemptSeed.
 *  - `fingerprint` pins it to the exact questions, in the exact order, that
 *    were on screen when it was written.
 *
 * The fingerprint matters more than it looks. buildAttempt shuffles the pool
 * deterministically from the seed, but the pool itself arrives from Postgres,
 * and a query's row order is only guaranteed by an ORDER BY. Change the row
 * order — edit a question, let the planner pick a different scan — and the same
 * seed deals a different paper with the same question count. A length check
 * alone would happily restore answer 1 onto whatever question now sits first
 * and score the student against it. A mismatched fingerprint drops the draft
 * instead, which loses answers but never invents them.
 */

const STORE_KEY = "v6_attemptDrafts";

/** Keep one day's worth of topics; drop the least recently saved beyond that. */
const MAX_DRAFTS = 6;

export interface AttemptDraft {
  key: string;
  fingerprint: string;
  selected: (number | null)[];
  flagged: boolean[];
  current: number;
  spent: number[];
  elapsedMs: number;
}

type StoredDraft = AttemptDraft & { savedAt: number };
type DraftStore = Record<string, StoredDraft>;

export function draftKeyFor(userId: string, dayNum: number, topicId: string, seed: number) {
  return `${userId}|${dayNum}|${topicId}|${seed}`;
}

/**
 * Identity of a paper: its question stems, in order. Order-sensitive on
 * purpose — a reordered paper is a different paper as far as saved answers are
 * concerned.
 */
export function paperFingerprint(stems: string[]): string {
  let h = 5381;
  for (const s of stems) {
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    h = ((h * 33) ^ 124) >>> 0; // separator, so ["ab"] and ["a","b"] differ
  }
  return `${stems.length}:${h.toString(36)}`;
}

function readStore(): DraftStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: DraftStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Quota or a disabled store. Losing the draft is bad but not worth taking
    // the attempt down over — the student can still finish the paper in front
    // of them.
  }
}

function isUsable(d: StoredDraft | undefined): d is StoredDraft {
  return Boolean(
    d && typeof d.key === "string" && Array.isArray(d.selected) && d.selected.some((v) => v !== null),
  );
}

/**
 * The seed of an unfinished attempt at this topic, or null. Lets "start quiz"
 * resume the paper the student was already on instead of dealing a new one and
 * stranding their answers under a key nothing will look up again.
 */
export function resumableSeed(userId: string, dayNum: number, topicId: string): number | null {
  const prefix = `${userId}|${dayNum}|${topicId}|`;
  const candidates = Object.values(readStore())
    .filter((d) => isUsable(d) && d.key.startsWith(prefix))
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  if (candidates.length === 0) return null;
  const seed = Number(candidates[0].key.slice(prefix.length));
  return Number.isFinite(seed) ? seed : null;
}

/** Draft for this exact paper, validated against its length and fingerprint. */
export function readDraft(key: string, total: number, fingerprint: string): AttemptDraft | null {
  const d = readStore()[key];
  if (!isUsable(d)) return null;
  if (d.fingerprint !== fingerprint) return null;
  if (d.selected.length !== total) return null;
  if (!Array.isArray(d.flagged) || d.flagged.length !== total) return null;
  return {
    key: d.key,
    fingerprint: d.fingerprint,
    selected: d.selected,
    flagged: d.flagged,
    current: Number.isInteger(d.current) && d.current >= 0 ? d.current : 0,
    spent: Array.isArray(d.spent) && d.spent.length === total ? d.spent : Array(total).fill(0),
    elapsedMs: Number.isFinite(d.elapsedMs) && d.elapsedMs >= 0 ? d.elapsedMs : 0,
  };
}

export function writeDraft(d: AttemptDraft) {
  const store = readStore();
  store[d.key] = { ...d, savedAt: Date.now() };
  const entries = Object.entries(store).sort((a, b) => (b[1].savedAt ?? 0) - (a[1].savedAt ?? 0));
  writeStore(Object.fromEntries(entries.slice(0, MAX_DRAFTS)));
}

/** Drop one paper's draft, leaving other topics' attempts alone. */
export function clearDraft(key: string) {
  const store = readStore();
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}
