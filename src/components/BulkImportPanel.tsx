import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertTriangle, Check } from "lucide-react";
import { parseStudentCSV } from "@/lib/csv";
import { useAppState } from "@/hooks/useAppState";

const SAMPLE_CSV = `name,email,batch
Asha Verma,asha.v@example.com,RAS 2026 — Morning
Rohit Kumar,rohit.k@example.com,RAS 2026 — Evening
Priya Mehta,priya.m@example.com,`;

export function BulkImportPanel() {
  const { addUser, students, batches, assignStudentToBatch, mentors } = useAppState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "preview" | "done">("input");
  const [result, setResult] = useState<{ created: number; skipped: number; assigned: number } | null>(null);

  const existingEmails = useMemo(
    () => new Set(students.map((s) => s.email.toLowerCase())),
    [students]
  );

  const parsed = useMemo(() => (text.trim() ? parseStudentCSV(text) : null), [text]);

  const resolveBatch = (name?: string) => {
    if (!name) return null;
    const lower = name.trim().toLowerCase();
    return batches.find((b) => b.name.toLowerCase() === lower) || null;
  };

  const previewAnnotated = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((r) => {
      const dup = existingEmails.has(r.email);
      const batch = resolveBatch(r.batchName);
      const batchMissing = r.batchName && !batch;
      return { ...r, dup, batch, batchMissing };
    });
  }, [parsed, existingEmails, batches]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setText(String(e.target?.result || ""));
    reader.readAsText(file);
  };

  const goPreview = () => {
    if (!parsed || parsed.rows.length === 0) return;
    setStage("preview");
  };

  const confirm = () => {
    let created = 0, skipped = 0, assigned = 0;
    const defaultMentorId = mentors[0]?.id;
    for (const row of previewAnnotated) {
      if (row.dup) { skipped++; continue; }
      const user = addUser({
        role: "student",
        email: row.email,
        name: row.name,
        mentorId: defaultMentorId,
      });
      created++;
      if (row.batch) {
        assignStudentToBatch(user.id, row.batch.id);
        assigned++;
      }
    }
    setResult({ created, skipped, assigned });
    setStage("done");
  };

  const reset = () => {
    setText("");
    setStage("input");
    setResult(null);
  };

  if (!open) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-900">Bulk import students</h2>
          <p className="text-xs text-slate-500 mt-0.5">Paste a CSV or upload a file. Batches can be assigned by name.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Upload className="w-4 h-4" /> Open importer</Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" /> Bulk import students
        </h2>
        <button onClick={() => { setOpen(false); reset(); }} className="text-xs text-slate-500 hover:text-slate-900">close</button>
      </div>

      {stage === "input" && (
        <>
          <div className="text-xs text-slate-600 leading-relaxed">
            Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded">name, email, batch</code> (one student per row). Batch column is optional. Header row is auto-detected.
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <Button variant="ghost" onClick={() => setText(SAMPLE_CSV)}>
              Paste sample
            </Button>
          </div>

          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
            placeholder={SAMPLE_CSV}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm font-mono resize-y" />

          {parsed && parsed.errors.length > 0 && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 space-y-1">
              <div className="flex items-center gap-1 font-semibold"><AlertTriangle className="w-3 h-3" /> {parsed.errors.length} row{parsed.errors.length === 1 ? "" : "s"} skipped during parse</div>
              {parsed.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="ml-4">Line {e.line}: {e.reason}</div>
              ))}
              {parsed.errors.length > 5 && <div className="ml-4">… and {parsed.errors.length - 5} more</div>}
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500">
              {parsed
                ? `${parsed.rows.length} student${parsed.rows.length === 1 ? "" : "s"} ready to preview`
                : "Paste rows or upload a file to begin"}
            </div>
            <Button onClick={goPreview} disabled={!parsed || parsed.rows.length === 0}>
              Preview →
            </Button>
          </div>
        </>
      )}

      {stage === "preview" && (
        <>
          <div className="text-xs text-slate-500">
            Review and confirm. Duplicates (same email as an existing student) will be skipped; rows with an unknown batch name will be created without batch assignment.
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {previewAnnotated.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 text-sm ${r.dup ? "bg-amber-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{r.name}</div>
                  <div className="text-xs text-slate-500 truncate">{r.email}</div>
                </div>
                <div className="text-right">
                  {r.dup ? (
                    <span className="text-[10px] font-bold uppercase text-amber-700">duplicate · skip</span>
                  ) : (
                    <>
                      {r.batch && <span className="inline-block text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">→ {r.batch.name}</span>}
                      {r.batchMissing && <span className="ml-1 inline-block text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">no batch ({r.batchName})</span>}
                      {!r.batchName && <span className="text-[10px] text-slate-400">no batch</span>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStage("input")}>← back to edit</Button>
            <Button onClick={confirm}><Check className="w-4 h-4" /> Create {previewAnnotated.filter((r) => !r.dup).length} student{previewAnnotated.filter((r) => !r.dup).length === 1 ? "" : "s"}</Button>
          </div>
        </>
      )}

      {stage === "done" && result && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-emerald-900 flex items-center gap-2 mb-1">
              <Check className="w-4 h-4" /> Import complete
            </div>
            <div className="text-xs text-emerald-800">
              Created {result.created} student{result.created === 1 ? "" : "s"}
              {result.assigned > 0 && <> · {result.assigned} assigned to batches</>}
              {result.skipped > 0 && <> · {result.skipped} duplicate{result.skipped === 1 ? "" : "s"} skipped</>}.
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset}>Import another</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Done</Button>
          </div>
        </>
      )}
    </div>
  );
}
