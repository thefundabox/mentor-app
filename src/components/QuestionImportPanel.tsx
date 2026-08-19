import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/useAppState";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import {
  parseQuestionCSV, commitQuestions, QUESTION_CSV_TEMPLATE,
  type ParseResult,
} from "@/lib/questionImport";

/**
 * Bulk-upload questions against microthemes.
 *
 * Deliberately two-step: parse and show exactly what will be written, with
 * per-row problems, before anything is committed. A bad answer key in an
 * exam-prep app is worse than a missing question, so the admin sees the damage
 * before it happens rather than after.
 */
export function QuestionImportPanel() {
  const { authEnabled, currentUser } = useAppState();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const parsed = useMemo(() => result, [result]);

  function handleParse(next?: string) {
    const body = (next ?? text).trim();
    setDone(null); setError(null);
    if (!body) { setResult(null); return; }
    setResult(parseQuestionCSV(body));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const body = String(reader.result ?? "");
      setText(body);
      handleParse(body);
    };
    reader.readAsText(f);
  }

  async function onCommit() {
    if (!parsed?.rows.length) return;
    setBusy(true); setError(null);
    const res = await commitQuestions(parsed.rows);
    setBusy(false);
    if (res.error) { setError(`${res.error} (${res.inserted} rows written before the failure)`); return; }
    setDone(`${res.inserted} question${res.inserted === 1 ? "" : "s"} uploaded across ${parsed.topics.length} microtheme${parsed.topics.length === 1 ? "" : "s"}.`);
    setText(""); setResult(null);
  }

  function downloadTemplate() {
    const blob = new Blob([QUESTION_CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "question-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!authEnabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Question upload needs a configured Supabase project — questions are stored in
        Postgres, not in the app bundle.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900">Upload questions</h3>
          <p className="text-sm text-slate-600 mt-0.5 max-w-xl">
            Paste CSV/TSV or choose a file. Every row is checked against the syllabus
            before anything is written — you will see exactly what lands.
          </p>
        </div>
        <Button variant="secondary" onClick={downloadTemplate}>
          <Download className="w-4 h-4" /> Template
        </Button>
      </div>

      {!isAdmin && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          Only admins can write questions. You can validate a file here, but the upload
          will be rejected by the database.
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => handleParse()}
        rows={8}
        placeholder="topic_id,question,option_a,option_b,option_c,option_d,correct,explanation,difficulty&#10;geo-raj-m102,Which sanctuary...,Sitamata,Bassi,...,A,...,2"
        className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-y font-mono text-xs text-slate-800"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" /> Choose file
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={onFile} className="hidden" />
        <Button variant="secondary" onClick={() => handleParse()}>Validate</Button>
        {parsed && parsed.rows.length > 0 && (
          <Button onClick={onCommit} disabled={busy || !isAdmin}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Upload {parsed.rows.length}
          </Button>
        )}
      </div>

      {done && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          ✓ {done}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {parsed && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap text-xs font-semibold">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
              {parsed.rows.length} valid
            </span>
            <span className={`px-2 py-1 rounded-full ${parsed.errors.length ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
              {parsed.errors.length} rejected
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              {parsed.topics.length} microtheme{parsed.topics.length === 1 ? "" : "s"}
            </span>
          </div>

          {parsed.errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-rose-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Rows that will NOT be uploaded
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {parsed.errors.slice(0, 50).map((e, i) => (
                  <li key={i} className="text-xs text-rose-900">
                    <span className="font-mono font-semibold">line {e.line}</span> — {e.problem}
                  </li>
                ))}
                {parsed.errors.length > 50 && (
                  <li className="text-xs text-rose-700 italic">…and {parsed.errors.length - 50} more</li>
                )}
              </ul>
            </div>
          )}

          {parsed.rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                Preview — first 5 of {parsed.rows.length}
              </div>
              <ul className="divide-y divide-slate-100">
                {parsed.rows.slice(0, 5).map((r) => (
                  <li key={r.line} className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-indigo-700">{r.topic_id}</span>
                      <span className="text-slate-400">tier {r.difficulty_tier}</span>
                      {r.source_year && <span className="text-amber-700">PYQ {r.source_year}</span>}
                    </div>
                    <div className="text-slate-800 line-clamp-2">{r.q}</div>
                    <div className="text-emerald-700 mt-0.5">
                      ✓ {r.options[r.correct]}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
