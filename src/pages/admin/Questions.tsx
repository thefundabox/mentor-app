/**
 * Admin → Questions.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { QuestionImportPanel } from "@/components/QuestionImportPanel";
import { QuestionReview } from "@/components/QuestionReview";
import { releaseTopic, holdTopic } from "@/lib/questionStore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { conceptLabel } from "@/data";
import { parsePYQCSV } from "@/lib/csv";
import type { Question } from "@/types";

export function QuestionsTab() {
  const [sub, setSub] = useState<"review" | "upload" | "coverage" | "quiz" | "foundation" | "placement" | "pyq">("review");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-100 pb-3 flex-wrap">
        <SubTabButton active={sub === "review"}     label="Review bank" onClick={() => setSub("review")} />
        <SubTabButton active={sub === "upload"}     label="Upload"     onClick={() => setSub("upload")} />
        <SubTabButton active={sub === "coverage"}   label="Coverage"   onClick={() => setSub("coverage")} />
        <SubTabButton active={sub === "quiz"}       label="Quiz pool"   onClick={() => setSub("quiz")} />
        <SubTabButton active={sub === "foundation"} label="Foundation" onClick={() => setSub("foundation")} />
        <SubTabButton active={sub === "placement"}  label="Placement"  onClick={() => setSub("placement")} />
        <SubTabButton active={sub === "pyq"}        label="PYQ bank"   onClick={() => setSub("pyq")} />
      </div>

      {sub === "review"     && <QuestionReview />}
      {sub === "upload"     && <QuestionImportPanel />}
      {sub === "coverage"   && <CoverageTab />}
      {sub === "quiz"       && <QuizPoolEditor />}
      {sub === "foundation" && <FoundationPoolEditor />}
      {sub === "placement"  && <PlacementPoolEditor />}
      {sub === "pyq"        && <PYQBankEditor />}
    </div>
  );
}

/**
 * Which microthemes have questions, how deep, and — critically — how many are
 * RELEASED to students.
 *
 * Questions land unreviewed. An authored answer key is a claim until somebody
 * qualified checks it, so nothing reaches a student until an admin releases
 * the topic here. That is the whole point of this screen.
 */
function CoverageTab() {
  const { subjects, questionCoverage, currentUser, ensureQuestionCoverage } = useAppState();
  useEffect(() => { void ensureQuestionCoverage(); }, [ensureQuestionCoverage]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, number>>({});
  const isAdmin = currentUser?.role === "admin";

  const reviewedOf = (id: string) => local[id] ?? questionCoverage[id]?.reviewed ?? 0;

  const rows = subjects.flatMap((s) =>
    s.topics
      .map((t) => ({ subject: s, topic: t, cov: questionCoverage[t.id] }))
      .filter((r) => r.cov && r.cov.total > 0),
  );
  const totalQ = rows.reduce((n, r) => n + (r.cov?.total ?? 0), 0);
  const releasedQ = rows.reduce((n, r) => n + reviewedOf(r.topic.id), 0);

  async function toggle(topicId: string, release: boolean, total: number) {
    setBusy(topicId); setNote(null);
    const res = release ? await releaseTopic(topicId) : await holdTopic(topicId);
    setBusy(null);
    if (res.error) { setNote(res.error); return; }
    setLocal((p) => ({ ...p, [topicId]: release ? total : 0 }));
    setNote(release ? `Released ${total} question${total === 1 ? "" : "s"} to students.` : "Topic held back from students.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        <strong>{releasedQ}</strong> of <strong>{totalQ}</strong> questions are released to students.
        Questions are held back until you release them — an authored answer key is
        unverified until someone checks it, and a wrong key teaches a student the wrong fact.
      </div>

      {note && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{note}</div>
      )}
      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only admins can release questions.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-xs uppercase font-bold tracking-wide text-slate-500">
          Question coverage by microtheme
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <li className="px-5 py-6 text-sm text-slate-500 text-center">
              No questions in the bank yet. Upload some from the Upload tab.
            </li>
          )}
          {rows.map(({ subject, topic, cov }) => {
            const rev = reviewedOf(topic.id);
            const total = cov?.total ?? 0;
            const released = rev > 0;
            return (
              <li key={topic.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {subject.icon} {topic.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{topic.id}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600">
                    {total} Q · <span className="text-slate-400">
                      {cov?.easy ?? 0}/{cov?.moderate ?? 0}/{cov?.hard ?? 0}
                    </span>
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    released ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {released ? `${rev} released` : "held"}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={!isAdmin || busy === topic.id}
                    onClick={() => toggle(topic.id, !released, total)}
                  >
                    {busy === topic.id ? "…" : released ? "Hold" : "Release"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SubTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}>{label}</button>
  );
}

function QuizPoolEditor() {
  const { quizPool, upsertQuizQuestion, addQuizQuestion, removeQuizQuestion } = useAppState();

  const addNew = () => {
    addQuizQuestion({
      type: "conceptual",
      concept: "",
      q: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Pool of {quizPool.length} questions used to build a quiz attempt. 8 conceptual + 8 analytical are sampled per attempt.
        </p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add question</Button>
      </div>
      {quizPool.map((q, idx) => (
        <QuestionCard
          key={idx}
          q={q}
          onChange={(patch) => upsertQuizQuestion(idx, { ...q, ...patch })}
          onRemove={() => removeQuizQuestion(idx)}
          showType
        />
      ))}
      {quizPool.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No quiz questions. Quizzes will be empty until you add some.
        </div>
      )}
    </div>
  );
}

function FoundationPoolEditor() {
  const { foundationPool, upsertFoundationQuestion, addFoundationQuestion, removeFoundationQuestion } = useAppState();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newConcept, setNewConcept] = useState("");

  const concepts = Object.keys(foundationPool).sort();

  const addConceptBucket = () => {
    const slug = newConcept.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug || foundationPool[slug]) return;
    addFoundationQuestion(slug, {
      type: "conceptual",
      concept: slug,
      q: "New foundation question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
    setExpanded((prev) => ({ ...prev, [slug]: true }));
    setNewConcept("");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Foundation questions are shown as remediation when a student misses a main quiz question. Grouped by concept tag.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="text-xs font-bold uppercase text-slate-500 mb-2">Add concept bucket</div>
        <div className="flex gap-2">
          <input value={newConcept} onChange={(e) => setNewConcept(e.target.value)}
            placeholder="concept-tag (e.g. mughal-expansion)"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          <Button onClick={addConceptBucket} disabled={!newConcept.trim()}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      </div>

      {concepts.map((concept) => {
        const list = foundationPool[concept] || [];
        const isOpen = !!expanded[concept];
        return (
          <div key={concept} className="bg-white border border-slate-200 rounded-2xl">
            <button onClick={() => setExpanded((prev) => ({ ...prev, [concept]: !isOpen }))}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 rounded-2xl transition">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                <span className="font-semibold text-slate-900">{conceptLabel(concept)}</span>
                <span className="text-xs text-slate-500">{list.length} question{list.length === 1 ? "" : "s"}</span>
              </div>
              <code className="text-xs text-slate-400">{concept}</code>
            </button>
            {isOpen && (
              <div className="p-4 pt-0 space-y-3">
                {list.map((q, idx) => (
                  <QuestionCard
                    key={idx}
                    q={q}
                    onChange={(patch) => upsertFoundationQuestion(concept, idx, { ...q, ...patch, concept })}
                    onRemove={() => removeFoundationQuestion(concept, idx)}
                  />
                ))}
                <Button variant="secondary" onClick={() => addFoundationQuestion(concept, {
                  type: "conceptual", concept, q: "New question", options: ["A", "B", "C", "D"], correct: 0, why: "",
                })}>
                  <Plus className="w-4 h-4" /> Add foundation question
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {concepts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No foundation questions. Wrong answers won't trigger remediation.
        </div>
      )}
    </div>
  );
}

function PlacementPoolEditor() {
  const { placementPool, upsertPlacementQuestion, addPlacementQuestion, removePlacementQuestion } = useAppState();

  const addNew = () => {
    addPlacementQuestion({
      type: "conceptual",
      concept: "",
      q: "New placement question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {placementPool.length} placement question{placementPool.length === 1 ? "" : "s"} shown during signup assessment. Keep this short — under 5 is ideal.
        </p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add question</Button>
      </div>
      {placementPool.map((q, idx) => (
        <QuestionCard
          key={idx}
          q={q}
          onChange={(patch) => upsertPlacementQuestion(idx, { ...q, ...patch })}
          onRemove={() => removePlacementQuestion(idx)}
        />
      ))}
      {placementPool.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No placement questions. The signup assessment will skip the placement check.
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q, onChange, onRemove, showType = false,
}: {
  q: Question;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
  showType?: boolean;
}) {
  const updateOption = (k: number, value: string) => {
    const next = [...q.options];
    next[k] = value;
    onChange({ options: next });
  };
  const addOption = () => onChange({ options: [...q.options, "New option"] });
  const removeOption = (k: number) => {
    if (q.options.length <= 2) return;
    const next = q.options.filter((_, i) => i !== k);
    onChange({ options: next, correct: q.correct >= next.length ? 0 : q.correct });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Question</label>
              <textarea value={q.q} onChange={(e) => onChange({ q: e.target.value })} rows={2}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Concept tag</label>
              <input value={q.concept} onChange={(e) => onChange({ concept: e.target.value })}
                placeholder="e.g. mughal-expansion"
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm font-mono" />
            </div>
            {showType && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Type</label>
                <select value={q.type} onChange={(e) => onChange({ type: e.target.value as Question["type"] })}
                  className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm">
                  <option value="conceptual">Conceptual</option>
                  <option value="analytical">Analytical</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Options · pick the correct one</label>
            <div className="mt-0.5 space-y-1.5">
              {q.options.map((opt, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${q.q}-${k}`} checked={q.correct === k}
                    onChange={() => onChange({ correct: k })} className="accent-emerald-600" />
                  <span className="w-5 text-xs font-bold text-slate-500">{String.fromCharCode(65 + k)}.</span>
                  <input value={opt} onChange={(e) => updateOption(k, e.target.value)}
                    className="flex-1 px-3 py-1 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm" />
                  <button onClick={() => removeOption(k)} disabled={q.options.length <= 2}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addOption} className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <Plus className="w-3 h-3" /> add option
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Why (explanation)</label>
            <textarea value={q.why} onChange={(e) => onChange({ why: e.target.value })} rows={2}
              className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
          </div>
        </div>

        <button onClick={onRemove} className="p-1 text-slate-400 hover:text-rose-600 transition self-start">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ==================== Batches tab ==================== */

function PYQBankEditor() {
  const { pyqBank, upsertPYQ, removePYQ, subjects } = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [yearFilter, setYearFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [query, setQuery] = useState("");

  const years = useMemo(() => {
    const all = pyqBank.map((p) => p.year).filter(Boolean);
    return [...new Set(all)].sort((a, b) => b.localeCompare(a));
  }, [pyqBank]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pyqBank.filter((p) => {
      if (yearFilter && p.year !== yearFilter) return false;
      if (subjectFilter && !(p.subjectIds || []).includes(subjectFilter)) return false;
      if (q) {
        const hay = `${p.q} ${p.a} ${p.explain}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pyqBank, query, yearFilter, subjectFilter]);

  const addNew = () => {
    const id = `pyq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    upsertPYQ({
      id,
      year: years[0] || "RAS 2024",
      q: "New question",
      a: "",
      explain: "",
      subjectIds: [],
      topicIds: [],
      marks: 2,
    });
    setOpenId(id);
  };

  const subjectLookup = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-500">
          {pyqBank.length} question{pyqBank.length === 1 ? "" : "s"} in the bank. Students search and filter this from the PYQ archive.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}><Plus className="w-4 h-4" /> Bulk import</Button>
          <Button onClick={addNew}><Plus className="w-4 h-4" /> Add PYQ</Button>
        </div>
      </div>

      {showImport && <PYQBulkImportPanel onClose={() => setShowImport(false)} />}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search question, answer, or explanation"
          className="px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm">
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm">
          <option value="">All subjects</option>
          {subjects.filter((s) => !s.archived).map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          {pyqBank.length === 0 ? "Bank is empty. Add a PYQ or bulk import." : "No questions match your filters."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((p) => {
          const isOpen = openId === p.id;
          const subjectChips = (p.subjectIds || []).map((id) => subjectLookup.get(id)).filter(Boolean);
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl">
              <button onClick={() => setOpenId(isOpen ? null : (p.id || null))}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-700 rounded px-2 py-0.5">{p.year}</span>
                  {p.marks && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{p.marks} marks</span>}
                  {subjectChips.map((s) => (
                    <span key={s!.id} className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 rounded px-2 py-0.5">
                      {s!.icon} {s!.name}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-slate-800 truncate">{p.q}</div>
              </button>

              {isOpen && (
                <PYQEditorBody pyq={p} onSave={(patch) => upsertPYQ({ ...p, ...patch })}
                  onRemove={() => { removePYQ(p.id!); setOpenId(null); }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PYQEditorBody({ pyq, onSave, onRemove }: {
  pyq: import("@/types").PYQ;
  onSave: (patch: Partial<import("@/types").PYQ>) => void;
  onRemove: () => void;
}) {
  const { subjects } = useAppState();
  const [draft, setDraft] = useState(pyq);

  const update = (patch: Partial<import("@/types").PYQ>) => setDraft({ ...draft, ...patch });
  const commit = () => onSave(draft);

  const toggleSubject = (id: string) => {
    const cur = draft.subjectIds || [];
    update({ subjectIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  const allTopics = subjects.flatMap((s) => s.topics.map((t) => ({ subject: s, topic: t })));
  const toggleTopic = (id: string) => {
    const cur = draft.topicIds || [];
    update({ topicIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  return (
    <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50 rounded-b-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Year</label>
          <input value={draft.year} onChange={(e) => update({ year: e.target.value })}
            placeholder="RAS 2024"
            className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Marks</label>
          <input type="number" min={0} step={0.5} value={draft.marks ?? ""}
            onChange={(e) => update({ marks: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500">Question</label>
        <textarea value={draft.q} onChange={(e) => update({ q: e.target.value })} rows={3}
          className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm resize-y" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500">Answer</label>
        <input value={draft.a} onChange={(e) => update({ a: e.target.value })}
          className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500">Explanation</label>
        <textarea value={draft.explain} onChange={(e) => update({ explain: e.target.value })} rows={2}
          className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm resize-y" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500">Subject tags</label>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {subjects.filter((s) => !s.archived).map((s) => {
            const active = (draft.subjectIds || []).includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleSubject(s.id)}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  active ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                {s.icon} {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-500">Topic tags (optional)</label>
        <div className="mt-0.5 max-h-24 overflow-y-auto flex flex-wrap gap-1 border border-slate-200 rounded-lg p-2 bg-white">
          {allTopics
            .filter((p) => !draft.subjectIds || draft.subjectIds.length === 0 || draft.subjectIds.includes(p.subject.id))
            .map(({ topic }) => {
              const active = (draft.topicIds || []).includes(topic.id);
              return (
                <button key={topic.id} onClick={() => toggleTopic(topic.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    active ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {topic.name}
                </button>
              );
            })}
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onRemove}><Trash2 className="w-4 h-4 text-rose-600" /> Delete</Button>
        <Button onClick={commit}>Save</Button>
      </div>
    </div>
  );
}

function PYQBulkImportPanel({ onClose }: { onClose: () => void }) {
  const { subjects, upsertPYQ } = useAppState();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "preview" | "done">("input");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const parsed = useMemo(() => (text.trim() ? parsePYQCSV(text) : null), [text]);

  // Resolve subject/topic text -> ids
  const resolveSubjects = (raw?: string): string[] => {
    if (!raw) return [];
    const tokens = raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    for (const tok of tokens) {
      const lo = tok.toLowerCase();
      const s = subjects.find((s) => s.name.toLowerCase() === lo || s.id.toLowerCase() === lo);
      if (s) out.push(s.id);
    }
    return out;
  };
  const resolveTopics = (raw?: string): string[] => {
    if (!raw) return [];
    const tokens = raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    for (const tok of tokens) {
      const lo = tok.toLowerCase();
      for (const s of subjects) {
        const t = s.topics.find((t) => t.name.toLowerCase() === lo || t.id.toLowerCase() === lo);
        if (t) { out.push(t.id); break; }
      }
    }
    return out;
  };

  const SAMPLE = `year,subject,topic,q,a,explain,marks
RAS 2019,Geography of Rajasthan,Rivers & Drainage,Which river is called the lifeline of Mewar?,Banas,Tributary of the Chambal flowing through Mewar.,2
RAS 2020,Indian Polity,Preamble & Basic Structure,Words 'Socialist' and 'Secular' were added by which amendment?,42nd Amendment 1976,Mini-Constitution amendment under Indira Gandhi.,2`;

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((r) => ({
      ...r,
      resolvedSubjects: resolveSubjects(r.subjects),
      resolvedTopics: resolveTopics(r.topics),
    }));
  }, [parsed, subjects]);

  const confirm = () => {
    let created = 0, skipped = 0;
    for (const r of previewRows) {
      if (!r.q || !r.a) { skipped++; continue; }
      const id = `pyq_imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      upsertPYQ({
        id, year: r.year, q: r.q, a: r.a, explain: r.explain || "",
        marks: r.marks,
        subjectIds: r.resolvedSubjects,
        topicIds: r.resolvedTopics,
      });
      created++;
    }
    setResult({ created, skipped });
    setStage("done");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Bulk import PYQs</h3>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-900">close</button>
      </div>

      {stage === "input" && (
        <>
          <div className="text-xs text-slate-600">
            Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded">year, subject, topic, q, a, explain, marks</code>.
            Subjects/topics can be semicolon-separated (e.g. <code className="bg-slate-100 px-1 rounded">Polity;Indian Polity</code>) and match by name or id. Header row auto-detected.
          </div>
          <div className="flex gap-2 flex-wrap">
            <label className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setText(String(ev.target?.result || ""));
                  reader.readAsText(f);
                }} />
            </label>
            <Button variant="ghost" onClick={() => setText(SAMPLE)}>Paste sample</Button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
            placeholder={SAMPLE}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-mono resize-y" />
          {parsed && parsed.errors.length > 0 && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 space-y-1">
              {parsed.errors.slice(0, 5).map((e, i) => (
                <div key={i}>Line {e.line}: {e.reason}</div>
              ))}
              {parsed.errors.length > 5 && <div>… and {parsed.errors.length - 5} more</div>}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setStage("preview")} disabled={!parsed || parsed.rows.length === 0}>
              Preview {parsed?.rows.length || 0} →
            </Button>
          </div>
        </>
      )}

      {stage === "preview" && (
        <>
          <div className="text-xs text-slate-500">Rows with no resolvable subject will still import with empty tags.</div>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {previewRows.map((r, i) => (
              <div key={i} className="px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-amber-700">{r.year}</span>
                  {r.marks && <span className="text-slate-500">{r.marks} marks</span>}
                  {r.resolvedSubjects.map((id) => {
                    const s = subjects.find((x) => x.id === id);
                    return s ? <span key={id} className="text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{s.name}</span> : null;
                  })}
                  {!r.resolvedSubjects.length && r.subjects && (
                    <span className="text-rose-600 bg-rose-50 rounded px-1.5 py-0.5">unmatched: {r.subjects}</span>
                  )}
                </div>
                <div className="text-slate-800 mt-0.5 truncate">{r.q}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStage("input")}>← back</Button>
            <Button onClick={confirm}>Create {previewRows.length} PYQ{previewRows.length === 1 ? "" : "s"}</Button>
          </div>
        </>
      )}

      {stage === "done" && result && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-900">
            Created {result.created} PYQ{result.created === 1 ? "" : "s"}{result.skipped > 0 && <> · {result.skipped} skipped</>}.
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================================
 * Current Affairs admin tab (Adaptive PR 6)
 * =========================================================================
 *
 * Manages CA topics — headline, category, date, expiry (auto-set to date +
 * 18 months), source URL, note, and an attached array of mcq_current
 * questions. The selector reads active items with non-empty questions to
 * fulfil the 15% CA quota in prelims_practice mode.
 */
