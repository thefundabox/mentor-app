/**
 * Admin → Tests.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Archive, RotateCw, Calendar } from "lucide-react";
import type { Batch, Test, TestSection, TestSchedule } from "@/types";

export function TestsTab() {
  const { tests, upsertTest, archiveTest, unarchiveTest, removeTest, schedulesForTest, batches, upsertTestSchedule, removeTestSchedule } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const editing = tests.find((t) => t.id === editingId);
  if (editing) {
    return <TestEditor test={editing} onDone={() => setEditingId(null)} onUpsert={upsertTest} />;
  }

  const addNew = () => {
    const id = `test_${Date.now().toString(36)}`;
    const t: Test = {
      id,
      title: "New test",
      type: "sectional",
      durationMins: 30,
      sections: [
        { id: `sec_${Date.now().toString(36)}`, name: "Section 1", subjectIds: [], questionCount: 10, marksPerQuestion: 1, negativeMarks: 0 },
      ],
      createdAt: Date.now(),
    };
    upsertTest(t);
    setEditingId(id);
  };

  const visible = tests.filter((t) => showArchived || !t.archived);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-500">
          Mock tests, sectional tests, and custom tests. Students take these from their dashboard (wiring lands in next PR).
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <Button onClick={addNew}><Plus className="w-4 h-4" /> Add test</Button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No tests yet. Add one to get started.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((t) => {
          const totalQs = t.sections.reduce((n, s) => n + s.questionCount, 0);
          const totalMarks = t.sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);
          return (
            <div key={t.id} className={`bg-white border rounded-2xl p-5 ${t.archived ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 truncate">{t.title}</h4>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{t.type}</span>
                    {t.archived && <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 rounded px-2 py-0.5">Archived</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {totalQs} q · {totalMarks} marks · {t.durationMins} min · {t.sections.length} section{t.sections.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}><Pencil className="w-4 h-4" /></Button>
                  {t.archived
                    ? <Button variant="ghost" size="sm" onClick={() => unarchiveTest(t.id)}><RotateCw className="w-4 h-4" /></Button>
                    : <Button variant="ghost" size="sm" onClick={() => archiveTest(t.id)}><Archive className="w-4 h-4 text-slate-500" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${t.title}" and all its attempts?`)) removeTest(t.id); }}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>
              {t.description && <p className="text-sm text-slate-600 mb-3">{t.description}</p>}

              {/* Scheduling sub-section */}
              <TestSchedulesPanel
                test={t}
                schedules={schedulesForTest(t.id)}
                batches={batches.filter((b) => !b.archived)}
                onAdd={upsertTestSchedule}
                onRemove={removeTestSchedule}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestSchedulesPanel({ test, schedules, batches, onAdd, onRemove }: {
  test: Test;
  schedules: TestSchedule[];
  batches: Batch[];
  onAdd: (s: TestSchedule) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [closeDate, setCloseDate] = useState("");
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const submit = () => {
    if (!releaseDate) return;
    onAdd({
      id: `sched_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      testId: test.id,
      batchIds,
      releaseAt: new Date(releaseDate).getTime(),
      closeAt: closeDate ? new Date(closeDate).getTime() : undefined,
    });
    setAdding(false);
    setBatchIds([]);
    setCloseDate("");
  };

  const toggleBatch = (id: string) => {
    setBatchIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <div className="text-[10px] uppercase font-bold text-slate-500">Schedules ({schedules.length})</div>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-indigo-600 hover:text-indigo-800 ml-auto">+ schedule</button>}
      </div>

      {schedules.length === 0 && !adding && (
        <div className="text-[11px] text-slate-400">No schedule — students see this test as always available.</div>
      )}

      {schedules.map((s) => {
        const targetBatches = s.batchIds.length === 0
          ? "All batches"
          : s.batchIds.map((id) => batches.find((b) => b.id === id)?.name).filter(Boolean).join(", ") || "—";
        const released = s.releaseAt <= Date.now();
        const closed = !!s.closeAt && s.closeAt < Date.now();
        const tone = closed ? "text-rose-600" : released ? "text-emerald-600" : "text-amber-600";
        return (
          <div key={s.id} className="flex items-center justify-between gap-2 py-1 text-xs">
            <div className="min-w-0">
              <div className={`font-semibold ${tone}`}>
                {closed ? "Closed" : released ? "Live" : "Scheduled"} · {new Date(s.releaseAt).toLocaleDateString()}
                {s.closeAt && <> → {new Date(s.closeAt).toLocaleDateString()}</>}
              </div>
              <div className="text-slate-500 truncate">→ {targetBatches}</div>
            </div>
            <button onClick={() => onRemove(s.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        );
      })}

      {adding && (
        <div className="mt-2 p-2 bg-slate-50 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Release date</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
                className="mt-0.5 w-full px-2 py-1.5 rounded border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Close date (opt)</label>
              <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)}
                className="mt-0.5 w-full px-2 py-1.5 rounded border border-slate-200 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Target batches (empty = all)</label>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {batches.map((b) => (
                <button key={b.id} onClick={() => toggleBatch(b.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    batchIds.includes(b.id)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-xs text-slate-500 px-2">cancel</button>
            <Button size="sm" onClick={submit}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TestEditor({ test, onDone, onUpsert }: {
  test: Test;
  onDone: () => void;
  onUpsert: (t: Test) => void;
}) {
  const { subjects } = useAppState();
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description || "");
  const [type, setType] = useState<Test["type"]>(test.type);
  const [durationMins, setDurationMins] = useState(test.durationMins);
  const [sections, setSections] = useState<TestSection[]>(test.sections);

  const totalQs = sections.reduce((n, s) => n + s.questionCount, 0);
  const totalMarks = sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);

  const save = () => {
    onUpsert({
      ...test,
      title: title.trim() || "Untitled test",
      description: description.trim() || undefined,
      type,
      durationMins: Math.max(1, durationMins || 1),
      sections: sections.map((s) => ({
        ...s,
        name: s.name.trim() || "Section",
        questionCount: Math.max(1, s.questionCount || 1),
        marksPerQuestion: Math.max(0, s.marksPerQuestion || 0),
        negativeMarks: Math.max(0, s.negativeMarks || 0),
      })),
    });
    onDone();
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec_${Date.now().toString(36)}_${prev.length}`,
        name: `Section ${prev.length + 1}`,
        subjectIds: [],
        questionCount: 10,
        marksPerQuestion: 1,
        negativeMarks: 0,
      },
    ]);
  };

  const updateSection = (idx: number, patch: Partial<TestSection>) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-800">← back to tests</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as Test["type"])}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm">
              <option value="sectional">Sectional</option>
              <option value="full-length">Full-length mock</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Duration (min)</label>
            <input type="number" min={1} max={600} value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value) || 1)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Summary</label>
            <div className="mt-1 px-3 py-2 rounded-xl bg-slate-50 text-sm text-slate-700">
              {totalQs} q · {totalMarks} marks
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Sections ({sections.length})</h3>
          <Button onClick={addSection}><Plus className="w-4 h-4" /> Add section</Button>
        </div>
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={sec.id} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
                    <input value={sec.name}
                      onChange={(e) => updateSection(idx, { name: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Questions</label>
                    <input type="number" min={1} max={500} value={sec.questionCount}
                      onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) || 1 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Marks/Q</label>
                    <input type="number" min={0} step={0.25} value={sec.marksPerQuestion}
                      onChange={(e) => updateSection(idx, { marksPerQuestion: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Neg. marks</label>
                    <input type="number" min={0} step={0.05} value={sec.negativeMarks}
                      onChange={(e) => updateSection(idx, { negativeMarks: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                </div>
                <button onClick={() => removeSection(idx)} disabled={sections.length === 1}
                  className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Subjects (empty = any)</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {subjects.filter((s) => !s.archived).map((s) => {
                    const active = sec.subjectIds.includes(s.id);
                    return (
                      <button key={s.id}
                        onClick={() => {
                          const next = active
                            ? sec.subjectIds.filter((id) => id !== s.id)
                            : [...sec.subjectIds, s.id];
                          updateSection(idx, { subjectIds: next });
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                          active
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}>
                        {s.icon} {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save}>Save test</Button>
    </div>
  );
}

/* ==================== PYQ Bank editor ==================== */
