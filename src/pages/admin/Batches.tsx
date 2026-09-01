/**
 * Admin → Batches.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Archive, RotateCw } from "lucide-react";
import type { PlanTemplate, Batch } from "@/types";

export function BatchesTab() {
  const { batches, upsertBatch, archiveBatch, unarchiveBatch, mentors, batchStudents,
          planTemplates, remotePlanTemplates, assignStudentToBatch, students } = useAppState();
  // Published plans win over the bundled demo seeds, same precedence as
  // ChoosePlan and adoptPlanTemplate. Offering only `planTemplates` here meant
  // the dropdown listed three demo templates and NOT the 80-day plan the
  // institute actually publishes -- so a batch could not be pointed at the one
  // plan anybody wanted, and the seeds it was left holding now win over the
  // institute default since batch plans started being honoured.
  const templateChoices = remotePlanTemplates.length > 0 ? remotePlanTemplates : planTemplates;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const editing = batches.find((b) => b.id === editingId);
  if (editing) {
    return <BatchEditor
      batch={editing}
      onDone={() => setEditingId(null)}
      mentors={mentors}
      planTemplates={templateChoices}
      students={students.filter((s) => !s.batchId || s.batchId === editing.id)}
      enrolled={batchStudents(editing.id)}
      onUpsert={upsertBatch}
      onAssign={assignStudentToBatch}
    />;
  }

  const addNew = () => {
    const id = `batch_${Date.now()}`;
    const b: Batch = {
      id,
      name: "New batch",
      vertical: "RAS",
      startDate: Date.now(),
      mentorIds: [],
      createdAt: Date.now(),
    };
    upsertBatch(b);
    setEditingId(id);
  };

  const visible = batches.filter((b) => showArchived || !b.archived);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-500">
          Cohorts/batches within the institute. Each student is enrolled in one batch; mentors are assigned to one or more.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <Button onClick={addNew}><Plus className="w-4 h-4" /> Add batch</Button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No batches{showArchived ? "" : " (any archived ones are hidden)"}. Add one to start grouping students.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((b) => {
          const enrolled = batchStudents(b.id);
          const batchMentors = mentors.filter((m) => b.mentorIds.includes(m.id));
          return (
            <div key={b.id} className={`bg-white border rounded-2xl p-5 ${b.archived ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 truncate">{b.name}</h4>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{b.vertical}</span>
                    {b.archived && <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 rounded px-2 py-0.5">Archived</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Starts {new Date(b.startDate).toLocaleDateString()}
                    {b.endDate && <> · ends {new Date(b.endDate).toLocaleDateString()}</>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(b.id)}><Pencil className="w-4 h-4" /></Button>
                  {b.archived
                    ? <Button variant="ghost" size="sm" onClick={() => unarchiveBatch(b.id)}><RotateCw className="w-4 h-4" /></Button>
                    : <Button variant="ghost" size="sm" onClick={() => archiveBatch(b.id)}><Archive className="w-4 h-4 text-slate-500" /></Button>}
                </div>
              </div>
              {b.description && <p className="text-sm text-slate-600 mb-3">{b.description}</p>}
              <div className="flex gap-4 text-xs">
                <div><strong className="text-slate-900">{enrolled.length}</strong> <span className="text-slate-500">student{enrolled.length === 1 ? "" : "s"}</span></div>
                <div><strong className="text-slate-900">{batchMentors.length}</strong> <span className="text-slate-500">mentor{batchMentors.length === 1 ? "" : "s"}</span></div>
              </div>
              {batchMentors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {batchMentors.map((m) => (
                    <span key={m.id} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">{m.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatchEditor({
  batch, onDone, mentors, planTemplates, students, enrolled, onUpsert, onAssign,
}: {
  batch: Batch;
  onDone: () => void;
  mentors: { id: string; name: string }[];
  planTemplates: PlanTemplate[];
  students: { id: string; name: string; email: string; batchId?: string }[];
  enrolled: { id: string; name: string; email: string }[];
  onUpsert: (b: Batch) => void;
  onAssign: (studentId: string, batchId: string | null) => void;
}) {
  const [name, setName] = useState(batch.name);
  const [vertical, setVertical] = useState(batch.vertical);
  const [description, setDescription] = useState(batch.description || "");
  const [startDate, setStartDate] = useState(
    new Date(batch.startDate).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    batch.endDate ? new Date(batch.endDate).toISOString().slice(0, 10) : ""
  );
  const [mentorIds, setMentorIds] = useState<string[]>(batch.mentorIds);
  const [defaultPlanTemplateId, setDefaultPlanTemplateId] = useState(batch.defaultPlanTemplateId || "");

  const save = () => {
    onUpsert({
      ...batch,
      name: name.trim() || "Untitled batch",
      vertical: vertical.trim() || "—",
      description: description.trim() || undefined,
      startDate: startDate ? new Date(startDate).getTime() : batch.startDate,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
      mentorIds,
      defaultPlanTemplateId: defaultPlanTemplateId || undefined,
    });
    onDone();
  };

  const toggleMentor = (mentorId: string) => {
    setMentorIds((prev) => prev.includes(mentorId) ? prev.filter((id) => id !== mentorId) : [...prev, mentorId]);
  };

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-800">← back to all batches</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Vertical / exam</label>
            <input value={vertical} onChange={(e) => setVertical(e.target.value)}
              placeholder="RAS / UPSC / Banking…"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="What this batch is about. Shown to students."
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">End date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Suggested plan template</label>
            <select value={defaultPlanTemplateId} onChange={(e) => setDefaultPlanTemplateId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm">
              <option value="">— none —</option>
              {/* Name alone is not enough to choose by: two seeded plans have
                  carried the identical name "RAS Prelims in 80 days" since
                  0012, and an admin picking one had no way to tell which was
                  which. Length and id disambiguate, and an id is the right
                  thing to show on an admin screen. */}
              {planTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.days.length} days · {t.id}
                </option>
              ))}
              {/* A stored id that is no longer on offer -- an archived plan, or
                  one of the old demo seeds -- still gets an option, so the
                  editor shows what the batch actually holds. Without this the
                  select renders blank and merely opening the editor and saving
                  would quietly change the setting. */}
              {defaultPlanTemplateId &&
                !planTemplates.some((t) => t.id === defaultPlanTemplateId) && (
                <option value={defaultPlanTemplateId}>
                  {defaultPlanTemplateId} (no longer available)
                </option>
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Assigned mentors</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {mentors.map((m) => (
              <button key={m.id} onClick={() => toggleMentor(m.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${
                  mentorIds.includes(m.id)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}>
                {m.name}
              </button>
            ))}
            {mentors.length === 0 && <span className="text-xs text-slate-400">No mentors. Add one from the People tab first.</span>}
          </div>
        </div>

        <Button onClick={save}>Save batch</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 mb-2">Enrolled students ({enrolled.length})</h3>
        <p className="text-xs text-slate-500 mb-3">
          Pick from your existing student list. Students can only be in one batch at a time — moving here removes them from any other batch.
        </p>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {students.map((s) => {
            const isIn = s.batchId === batch.id;
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <div className="text-sm">
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  <span className="text-slate-500"> · {s.email}</span>
                </div>
                <button
                  onClick={() => onAssign(s.id, isIn ? null : batch.id)}
                  className={`text-xs font-medium px-2 py-1 rounded transition ${
                    isIn
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}>
                  {isIn ? "✓ Enrolled · remove" : "Enroll"}
                </button>
              </div>
            );
          })}
          {students.length === 0 && (
            <div className="text-sm text-slate-500 py-4 text-center">No students available to enroll.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Tests tab ==================== */
