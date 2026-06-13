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
