/**
 * Admin → CurrentAffairs.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { Question, CurrentAffairsTopic } from "@/types";

const CA_18_MONTHS_MS = 18 * 30 * 86400000;
const CA_CATEGORIES: { id: CurrentAffairsTopic["category"]; label: string }[] = [
  { id: "rajasthan_scheme", label: "Rajasthan scheme" },
  { id: "national_policy",  label: "National policy" },
  { id: "science_tech",     label: "Science & tech" },
  { id: "awards",           label: "Awards" },
  { id: "sports",           label: "Sports" },
  { id: "international",    label: "International" },
];


export function CurrentAffairsTab() {
  const { currentAffairs, upsertCurrentAffairs, removeCurrentAffairs } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Active first, by event date desc; then inactive at the bottom.
  const sorted = useMemo(() => {
    const active = currentAffairs.filter((c) => c.isActive).sort((a, b) => b.dateOfEvent - a.dateOfEvent);
    const inactive = currentAffairs.filter((c) => !c.isActive).sort((a, b) => b.dateOfEvent - a.dateOfEvent);
    return [...active, ...inactive];
  }, [currentAffairs]);

  const newDraft = (): CurrentAffairsTopic => {
    const today = Date.now();
    return {
      id: `ca_${today.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      headline: "",
      category: "national_policy",
      dateOfEvent: today,
      expiresAt: today + CA_18_MONTHS_MS,
      isActive: true,
    };
  };

  const startNew = () => {
    const draft = newDraft();
    upsertCurrentAffairs(draft);
    setEditingId(draft.id);
    setExpanded((s) => new Set(s).add(draft.id));
  };

  const toggle = (id: string) => setExpanded((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Current Affairs</h2>
          <p className="text-sm text-slate-600">
            Manage admin-curated CA items. Items auto-deactivate 18 months after their event date.
            Attach mcq_current questions to feed the 15% CA quota in Smart Practice sessions.
          </p>
        </div>
        <Button onClick={startNew}><Plus className="w-4 h-4" /> Add item</Button>
      </div>

      <ul className="space-y-2">
        {sorted.map((item) => {
          const isOpen = expanded.has(item.id);
          const isEditing = editingId === item.id;
          return (
            <li key={item.id} className={`rounded-2xl border ${item.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"} overflow-hidden`}>
              <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <button onClick={() => toggle(item.id)} className="text-slate-400 hover:text-slate-700">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {item.headline || <span className="text-slate-400">(no headline)</span>}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {CA_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category}
                    </span>
                    <span>{new Date(item.dateOfEvent).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                    {!item.isActive && <span className="text-rose-600 font-semibold">inactive</span>}
                    <span>·</span>
                    <span>{(item.questions ?? []).length} question{(item.questions ?? []).length === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => setEditingId(isEditing ? null : item.id)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    if (confirm(`Delete "${item.headline}"?`)) removeCurrentAffairs(item.id);
                  }}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 space-y-3">
                  {isEditing ? (
                    <CurrentAffairsEditor
                      item={item}
                      onSave={(next) => { upsertCurrentAffairs(next); setEditingId(null); }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      {item.note && <p className="text-sm text-slate-700">{item.note}</p>}
                      {item.sourceUrl && (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-xs text-indigo-600 hover:underline break-all">
                          {item.sourceUrl}
                        </a>
                      )}
                      <CurrentAffairsQuestionsEditor
                        item={item}
                        onChange={(qs) => upsertCurrentAffairs({ ...item, questions: qs })}
                      />
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="text-sm text-slate-500 italic p-6 text-center border border-dashed border-slate-200 rounded-2xl">
            No Current Affairs items yet. Add one to start serving CA questions in Smart Practice sessions.
          </li>
        )}
      </ul>
    </div>
  );
}

function CurrentAffairsEditor({ item, onSave, onCancel }: {
  item: CurrentAffairsTopic; onSave: (next: CurrentAffairsTopic) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CurrentAffairsTopic>(item);
  // Keep expiresAt locked to dateOfEvent + 18 months whenever the date moves.
  const setDate = (ms: number) => setDraft((d) => ({ ...d, dateOfEvent: ms, expiresAt: ms + CA_18_MONTHS_MS }));

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold text-slate-600">Headline</label>
        <input
          type="text"
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
          value={draft.headline}
          onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          placeholder="e.g. Union Budget 2026 capex outlay rises 20%"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Category</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as CurrentAffairsTopic["category"] })}
          >
            {CA_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Date of event</label>
          <input
            type="date"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={new Date(draft.dateOfEvent).toISOString().slice(0, 10)}
            onChange={(e) => setDate(Date.parse(e.target.value))}
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Expires {new Date(draft.expiresAt).toLocaleDateString()} (auto-set to date + 18 months)
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Source URL (optional)</label>
        <input
          type="url"
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
          value={draft.sourceUrl ?? ""}
          onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value || undefined })}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Why it matters (optional)</label>
        <textarea
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
          rows={2}
          value={draft.note ?? ""}
          onChange={(e) => setDraft({ ...draft, note: e.target.value || undefined })}
          placeholder="Short note for the student"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={() => onSave(draft)} disabled={!draft.headline.trim()}>Save</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <label className="ml-auto text-xs flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
          />
          Active
        </label>
      </div>
    </div>
  );
}

function CurrentAffairsQuestionsEditor({ item, onChange }: {
  item: CurrentAffairsTopic; onChange: (qs: Question[]) => void;
}) {
  const qs = item.questions ?? [];
  const addBlank = () => {
    const q: Question = {
      type: "conceptual",
      concept: item.id,           // tag by CA id so SR maps cleanly
      questionType: "mcq_current",
      q: "",
      options: ["", "", "", ""],
      correct: 0,
      why: "",
    };
    onChange([...qs, q]);
  };
  const update = (idx: number, q: Question) => {
    const next = [...qs]; next[idx] = q; onChange(next);
  };
  const remove = (idx: number) => onChange(qs.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Questions ({qs.length})
        </div>
        <Button variant="ghost" onClick={addBlank}><Plus className="w-3.5 h-3.5" /> Add question</Button>
      </div>
      {qs.length === 0 && (
        <p className="text-xs text-slate-500 italic">No questions yet. Add one to feed this item into the CA quota.</p>
      )}
      <ul className="space-y-3">
        {qs.map((q, idx) => (
          <li key={idx} className="p-3 rounded-xl border border-slate-200 bg-white">
            <div className="space-y-2">
              <textarea
                rows={2}
                className="w-full px-2 py-1 rounded border border-slate-200 text-sm"
                value={q.q}
                onChange={(e) => update(idx, { ...q, q: e.target.value })}
                placeholder="Question text"
              />
              {q.options.map((opt, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct_${item.id}_${idx}`}
                    checked={q.correct === k}
                    onChange={() => update(idx, { ...q, correct: k })}
                    title="Mark as correct"
                  />
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 rounded border border-slate-200 text-sm"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...q.options]; opts[k] = e.target.value;
                      update(idx, { ...q, options: opts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + k)}`}
                  />
                </div>
              ))}
              <textarea
                rows={1}
                className="w-full px-2 py-1 rounded border border-slate-200 text-sm"
                value={q.why}
                onChange={(e) => update(idx, { ...q, why: e.target.value })}
                placeholder="Explanation (shown after answer)"
              />
              <div className="flex items-center justify-end">
                <Button variant="ghost" onClick={() => remove(idx)}>
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


/* ==================================================================== LIMITS
 *
 * What each plan includes. The only client route into plan_limits: direct
 * writes were revoked in 0028 and 0031 deliberately did not hand them back, so
 * this saves through an admin-checked RPC.
 *
 * Blank means unmetered, and blank is NOT the same as 0. Zero is a real
 * setting -- "this plan gets none" -- so the field keeps them distinct instead
 * of treating an empty box as off.
 */
