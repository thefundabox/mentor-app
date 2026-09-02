/**
 * Admin → Questions.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { QuestionImportPanel } from "@/components/QuestionImportPanel";
import { QuestionReview } from "@/components/QuestionReview";
import {
  releaseTopic, holdTopic, setQuestionReviewed, deleteQuestion,
} from "@/lib/questionStore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { conceptLabel } from "@/data";
import {
  loadPyqPage, loadPyqYears, updatePyq,
  type AdminPyqRow, type PyqPage, type PyqYear, type ExamFamily,
} from "@/lib/pyqStore";
import type { Question, SubjectCatalogEntry } from "@/types";

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


/* ==================== PYQ bank ==================== */

/**
 * The past-paper bank, from Postgres.
 *
 * This screen used to edit `v5_pyqBank` in localStorage: twelve seeded prose
 * question/answer pairs, private to one browser, while the 806 real past
 * papers lived in `questions` and were visible only to students through the
 * archive. An admin was administering a bank they could not see, and the CSV
 * importer here wrote to the same dead end.
 *
 * Paged server-side. 806 rows each carrying a stem, four options and an
 * explanation is not a payload to pull down in order to filter it in a browser.
 */
function PYQBankEditor() {
  const { subjects } = useAppState();

  const [family, setFamily] = useState<ExamFamily>("ras");
  const [years, setYears] = useState<PyqYear[]>([]);
  const [year, setYear] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<PyqPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const PAGE = 50;

  useEffect(() => { void loadPyqYears(family).then(setYears); }, [family]);

  // Debounced: a keystroke should not be a round trip against 806 rows.
  useEffect(() => {
    const t = setTimeout(() => setSearch(typed), 350);
    return () => clearTimeout(t);
  }, [typed]);

  // Any filter change starts again at the first page; staying on page 7 of a
  // narrower result set shows an empty screen that looks like no matches.
  useEffect(() => { setPage(0); setYear(""); }, [family]);
  useEffect(() => { setPage(0); }, [year, subjectId, search]);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await loadPyqPage({
      family,
      year: year || undefined,
      subjectId: subjectId || undefined,
      search: search || undefined,
      limit: PAGE, offset: page * PAGE,
    });
    setData(res);
    setLoading(false);
  }, [family, year, subjectId, search, page]);

  useEffect(() => { void reload(); }, [reload]);

  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE) - 1);
  const bankTotal = useMemo(() => years.reduce((a, y) => a + y.count, 0), [years]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Past questions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {bankTotal > 0
              ? `${bankTotal} past questions in the bank, graded against RPSC's own key.`
              : "Loading the bank…"}
            {" "}Edits here are live for every student.
          </p>
        </div>
        <p className="text-xs text-slate-400 max-w-xs text-right">
          To add past papers, use the <span className="font-semibold">Import</span> sub-tab —
          set <code className="text-[11px]">source_year</code> on each row.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 -mt-1">
        {([{ id: "ras" as const, label: "RAS" },
           { id: "other" as const, label: "Other RPSC exams" }]).map((t) => (
          <button key={t.id} onClick={() => setFamily(t.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition ${
              family === t.id ? "border-slate-800 text-slate-900"
                              : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select className={SEL} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => <option key={y.year} value={y.year}>{y.year} ({y.count})</option>)}
        </select>
        <select className={SEL} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          className={`${SEL} flex-1 min-w-[200px]`}
          placeholder="Search the question text…"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>

      {notice && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {notice}
        </div>
      )}

      <div className="text-xs text-slate-500">
        {loading ? "Loading…" : total === 0 ? "No past questions match." :
          `Showing ${page * PAGE + 1}–${Math.min((page + 1) * PAGE, total)} of ${total}`}
      </div>

      <div className="space-y-2">
        {(data?.rows ?? []).map((r) => (
          <PyqRowCard
            key={r.id}
            row={r}
            subjects={subjects}
            open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
            onChanged={(msg) => { setNotice(msg ?? null); void reload(); }}
          />
        ))}
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <span className="text-xs text-slate-500">Page {page + 1} of {lastPage + 1}</span>
          <Button variant="secondary" disabled={page >= lastPage || loading}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>Next</Button>
        </div>
      )}
    </div>
  );
}

const SEL = "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300";

/** One past question: summary, and the editor when opened. */
function PyqRowCard({ row, subjects, open, onToggle, onChanged }: {
  row: AdminPyqRow;
  subjects: SubjectCatalogEntry[];
  open: boolean;
  onToggle: () => void;
  onChanged: (error?: string) => void;
}) {
  const [q, setQ] = useState(row.q);
  const [options, setOptions] = useState<string[]>(row.options);
  const [correct, setCorrect] = useState(row.correct);
  const [why, setWhy] = useState(row.why ?? "");
  const [saving, setSaving] = useState(false);

  // The row can be replaced under us by a reload; adopt the new values rather
  // than editing a stale copy.
  useEffect(() => {
    setQ(row.q); setOptions(row.options); setCorrect(row.correct); setWhy(row.why ?? "");
  }, [row.id, row.q, row.options, row.correct, row.why]);

  const topicName = useMemo(() => {
    for (const s of subjects) {
      const t = s.topics.find((x) => x.id === row.topicId);
      if (t) return `${s.name} · ${t.name}`;
    }
    return row.topicId;
  }, [subjects, row.topicId]);

  const save = async () => {
    setSaving(true);
    const res = await updatePyq(row.id, { q, options, correct, why });
    setSaving(false);
    onChanged(res.error);
  };

  const toggleReleased = async () => {
    setSaving(true);
    const res = await setQuestionReviewed(row.id, !row.reviewed);
    setSaving(false);
    onChanged(res.error);
  };

  const remove = async () => {
    if (!confirm("Delete this past question permanently?")) return;
    setSaving(true);
    const res = await deleteQuestion(row.id);
    setSaving(false);
    onChanged(res.error);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 shrink-0 pt-0.5 w-24">
          {row.sourceYear}{row.paperQno ? ` · Q${row.paperQno}` : ""}
          {row.sourceExam && row.examFamily === "other" && (
            <span className="block font-semibold normal-case text-[9px] text-slate-400 leading-tight mt-0.5">
              {row.sourceExam}
            </span>
          )}
        </span>
        <span className="flex-1 text-sm text-slate-800 line-clamp-2">{row.q}</span>
        {!row.reviewed && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
            held
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <div className="text-[11px] text-slate-500">{topicName}</div>

          <textarea rows={3} className={`${SEL} w-full`} value={q}
            onChange={(e) => setQ(e.target.value)} />

          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={`correct-${row.id}`} checked={correct === i}
                  onChange={() => setCorrect(i)} title="Mark as the correct answer" />
                <input className={`${SEL} flex-1`} value={opt}
                  onChange={(e) => setOptions(options.map((o, j) => j === i ? e.target.value : o))} />
              </div>
            ))}
          </div>

          <textarea rows={2} className={`${SEL} w-full`} placeholder="Why this answer is right"
            value={why} onChange={(e) => setWhy(e.target.value)} />

          <div className="flex justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={remove} disabled={saving}>
                <Trash2 className="w-4 h-4 text-rose-600" /> Delete
              </Button>
              <Button variant="secondary" onClick={toggleReleased} disabled={saving}>
                {row.reviewed ? "Hold back" : "Release"}
              </Button>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
