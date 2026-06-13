/** Tiny CSV parser — handles quoted fields with commas, escaped quotes, CRLF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuote = true; i++; continue; }
    if (c === ",") { cur.push(field); field = ""; i++; continue; }
    if (c === "\n" || c === "\r") {
      cur.push(field); field = "";
      if (cur.length > 1 || cur[0]?.length) rows.push(cur);
      cur = [];
      if (c === "\r" && text[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += c; i++;
  }
  if (field.length || cur.length) {
    cur.push(field);
    if (cur.length > 1 || cur[0]?.length) rows.push(cur);
  }
  return rows;
}

export interface StudentImportRow {
  name: string;
  email: string;
  batchName?: string;
}

export interface ParsedImport {
  rows: StudentImportRow[];
  errors: { line: number; reason: string }[];
  hasHeader: boolean;
}

const KNOWN_HEADERS = new Set(["name", "email", "batch", "batch name", "batch_name", "cohort"]);
const PYQ_HEADERS = new Set(["year", "subject", "topic", "q", "question", "a", "answer", "explain", "explanation", "marks"]);

/** Parse a 2- or 3-column CSV into StudentImportRow[]. Detects an optional header row. */
export function parseStudentCSV(text: string): ParsedImport {
  const grid = parseCSV(text);
  if (grid.length === 0) return { rows: [], errors: [], hasHeader: false };

  const first = grid[0].map((s) => s.trim().toLowerCase());
  const hasHeader = first.some((cell) => KNOWN_HEADERS.has(cell));

  const dataStart = hasHeader ? 1 : 0;
  const rows: StudentImportRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  for (let i = dataStart; i < grid.length; i++) {
    const r = grid[i].map((s) => s.trim());
    if (r.length === 0 || r.every((s) => s === "")) continue;
    if (r.length < 2) {
      errors.push({ line: i + 1, reason: "Expected at least name and email" });
      continue;
    }
    const [name, email, batchName] = r;
    if (!email.includes("@") || !email.includes(".")) {
      errors.push({ line: i + 1, reason: `Bad email: ${email}` });
      continue;
    }
    if (!name) {
      errors.push({ line: i + 1, reason: "Missing name" });
      continue;
    }
    rows.push({ name, email: email.toLowerCase(), batchName: batchName || undefined });
  }

  return { rows, errors, hasHeader };
}

export interface PYQImportRow {
  year: string;
  q: string;
  a: string;
  explain: string;
  marks?: number;
  subjects?: string;   // raw text — caller resolves to subject ids
  topics?: string;     // raw text — caller resolves to topic ids
}

export interface ParsedPYQImport {
  rows: PYQImportRow[];
  errors: { line: number; reason: string }[];
  hasHeader: boolean;
}

/**
 * Parse a PYQ CSV. Expected columns (auto-detected from header row):
 *   year, subject, topic, q, a, explain, marks
 * Order is fixed when header is missing. Subjects/topics are
 * semicolon-separated lists.
 */
export function parsePYQCSV(text: string): ParsedPYQImport {
  const grid = parseCSV(text);
  if (grid.length === 0) return { rows: [], errors: [], hasHeader: false };

  const first = grid[0].map((s) => s.trim().toLowerCase());
  const hasHeader = first.some((cell) => PYQ_HEADERS.has(cell));

  // Column index map. Falls back to fixed positions when no header.
  const idx: Record<string, number> = {};
  const headers = ["year", "subject", "topic", "q", "a", "explain", "marks"];
  if (hasHeader) {
    first.forEach((cell, i) => { idx[cell] = i; });
    // Normalize aliases
    if (idx.question !== undefined && idx.q === undefined) idx.q = idx.question;
    if (idx.answer !== undefined && idx.a === undefined) idx.a = idx.answer;
    if (idx.explanation !== undefined && idx.explain === undefined) idx.explain = idx.explanation;
  } else {
    headers.forEach((h, i) => { idx[h] = i; });
  }

  const dataStart = hasHeader ? 1 : 0;
  const rows: PYQImportRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  for (let i = dataStart; i < grid.length; i++) {
    const r = grid[i].map((s) => s.trim());
    if (r.length === 0 || r.every((s) => s === "")) continue;
    const get = (k: string) => r[idx[k]] ?? "";
    const year = get("year");
    const q = get("q");
    const a = get("a");
    if (!q) { errors.push({ line: i + 1, reason: "Missing question text" }); continue; }
    if (!a) { errors.push({ line: i + 1, reason: "Missing answer" }); continue; }
    const marksRaw = get("marks");
    const marks = marksRaw ? Number(marksRaw) : undefined;
    rows.push({
      year: year || "—",
      q, a,
      explain: get("explain"),
      marks: Number.isFinite(marks!) ? marks : undefined,
      subjects: get("subject") || undefined,
      topics: get("topic") || undefined,
    });
  }
  return { rows, errors, hasHeader };
}
