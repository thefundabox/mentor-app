/**
 * Bulk question import.
 *
 * Accepts CSV/TSV with a header row, validates every row against the syllabus
 * and the shape the database enforces, and reports problems per-row rather than
 * failing the whole file. Nothing is written until the caller commits, so an
 * admin sees exactly what will land before it lands.
 *
 * Expected columns (header names are matched case-insensitively; order free):
 *   topic_id      required — microtheme id, e.g. geo-raj-m102
 *   question      required
 *   option_a..d   required (option_e optional)
 *   correct       required — either the letter (A-E) or the 1-based number
 *   explanation   optional
 *   difficulty    optional — 1|2|3, or easy|moderate|hard        (default 2)
 *   type          optional — conceptual|analytical               (default analytical)
 *   question_type optional — mcq_factual|mcq_applied|mcq_reasoning
 *   source_year   optional — set ONLY for genuine past papers
 *   exam_family   optional — ras|other  (default ras)
 *   source_exam   optional — the paper's name, e.g. "Sr. Teacher (Sec. Edu.) 2024"
 *   hindi         optional — Hindi rendering of the question
 */
import { parseCSV } from "./csv";
import { supabase } from "./supabase";
import { DEFAULT_SUBJECTS } from "@/data";
import { resolveTopicId } from "@/data/syllabus";

export interface ImportRow {
  line: number;
  topic_id: string;
  q: string;
  q_hindi: string | null;
  options: string[];
  correct: number;
  why: string | null;
  difficulty_tier: 1 | 2 | 3;
  type: "conceptual" | "analytical";
  question_type: string | null;
  source_year: string | null;
  exam_family: "ras" | "other";
  source_exam: string | null;
  rajasthan_angle: boolean;
}

export interface ImportError {
  line: number;
  problem: string;
}

export interface ParseResult {
  rows: ImportRow[];
  errors: ImportError[];
  /** Distinct topics touched, for the confirmation summary. */
  topics: string[];
}

const DIFF: Record<string, 1 | 2 | 3> = {
  "1": 1, easy: 1,
  "2": 2, moderate: 2, medium: 2,
  "3": 3, hard: 3, difficult: 3,
};

function topicIndex(): Map<string, { subjectId: string; rajasthan: boolean }> {
  const m = new Map<string, { subjectId: string; rajasthan: boolean }>();
  for (const s of DEFAULT_SUBJECTS) {
    for (const t of s.topics) {
      m.set(t.id, { subjectId: s.id, rajasthan: !!(s.rajasthanSpecific || t.rajasthanSpecific) });
    }
  }
  return m;
}

/** Split on tabs when the header line has more tabs than commas. */
function splitRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  if (tabs > commas) {
    return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("\t"));
  }
  return parseCSV(text);
}

export function parseQuestionCSV(text: string): ParseResult {
  const grid = splitRows(text);
  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];
  if (grid.length < 2) {
    return { rows, errors: [{ line: 1, problem: "Need a header row and at least one question." }], topics: [] };
  }

  const header = grid[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const need = ["topic_id", "question", "option_a", "option_b", "correct"];
  const missing = need.filter((n) => col(n) === -1);
  if (missing.length) {
    return { rows, errors: [{ line: 1, problem: `Missing required column(s): ${missing.join(", ")}` }], topics: [] };
  }

  const topics = topicIndex();
  const seen = new Set<string>();

  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    const line = i + 1;
    const get = (n: string) => { const c = col(n); return c === -1 ? "" : (r[c] ?? "").trim(); };

    const rawTopic = get("topic_id");
    const topic_id = resolveTopicId(rawTopic);
    const meta = topics.get(topic_id);
    if (!rawTopic) { errors.push({ line, problem: "topic_id is empty" }); continue; }
    if (!meta) { errors.push({ line, problem: `unknown topic_id "${rawTopic}" — not in the syllabus` }); continue; }

    const q = get("question");
    if (!q) { errors.push({ line, problem: "question is empty" }); continue; }

    const options = ["option_a", "option_b", "option_c", "option_d", "option_e"]
      .map(get).filter((o) => o.length > 0);
    if (options.length < 2) { errors.push({ line, problem: "need at least two options" }); continue; }

    const rawCorrect = get("correct").toUpperCase();
    let correct = -1;
    if (/^[A-E]$/.test(rawCorrect)) correct = rawCorrect.charCodeAt(0) - 65;
    else if (/^\d+$/.test(rawCorrect)) correct = Number(rawCorrect) - 1;
    if (correct < 0 || correct >= options.length) {
      errors.push({ line, problem: `correct "${get("correct")}" does not point at one of the ${options.length} options` });
      continue;
    }

    const dup = `${topic_id}::${q}`;
    if (seen.has(dup)) { errors.push({ line, problem: "duplicate of an earlier row in this file" }); continue; }
    seen.add(dup);

    const diffRaw = get("difficulty").toLowerCase();
    const typeRaw = get("type").toLowerCase();

    rows.push({
      line, topic_id, q,
      q_hindi: get("hindi") || null,
      options, correct,
      why: get("explanation") || null,
      difficulty_tier: DIFF[diffRaw] ?? 2,
      type: typeRaw === "conceptual" ? "conceptual" : "analytical",
      question_type: get("question_type") || null,
      source_year: get("source_year") || null,
      // Anything not explicitly marked "other" is this institute's own exam.
      // Defaulting the other way would quietly file a RAS question under a
      // foreign paper, which is the one direction that corrupts frequency.
      exam_family: get("exam_family").trim().toLowerCase() === "other" ? "other" : "ras",
      source_exam: get("source_exam") || null,
      rajasthan_angle: meta.rajasthan,
    });
  }

  return { rows, errors, topics: [...new Set(rows.map((r) => r.topic_id))] };
}

export interface CommitResult { inserted: number; error?: string; }

/**
 * Write validated rows.
 *
 * `is_model` is true unless the row carries a source_year — an admin importing
 * genuine past questions should get them marked as such, and everything else
 * is treated as authored practice material.
 */
export async function commitQuestions(rows: ImportRow[]): Promise<CommitResult> {
  if (!supabase) return { inserted: 0, error: "Not connected to Supabase." };
  if (!rows.length) return { inserted: 0 };

  const payload = rows.map((r) => ({
    topic_id: r.topic_id, type: r.type, question_type: r.question_type,
    difficulty_tier: r.difficulty_tier, q: r.q, q_hindi: r.q_hindi,
    options: r.options, correct: r.correct, why: r.why,
    source_year: r.source_year, is_model: !r.source_year,
    exam_family: r.exam_family, source_exam: r.source_exam,
    rajasthan_angle: r.rajasthan_angle,
  }));

  // Chunked: a few thousand rows in one statement will time out.
  let inserted = 0;
  for (let i = 0; i < payload.length; i += 250) {
    const { error } = await supabase.from("questions").insert(payload.slice(i, i + 250));
    if (error) return { inserted, error: error.message };
    inserted += Math.min(250, payload.length - i);
  }
  return { inserted };
}

/** A ready-to-fill template, so an admin never has to guess the columns. */
export const QUESTION_CSV_TEMPLATE =
  "topic_id,question,option_a,option_b,option_c,option_d,correct,explanation,difficulty,type,question_type,source_year,exam_family,source_exam\n" +
  "geo-raj-m102,Which sanctuary is located in Pratapgarh district?,Sitamata,Bassi,Jamwa Ramgarh,Todgarh-Raoli,A,Sitamata WLS lies across Pratapgarh and Chittorgarh.,2,analytical,mcq_factual,,ras,\n";
