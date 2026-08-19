import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/useAppState";
import { Check, ChevronDown, Loader2, Search, Trash2, X } from "lucide-react";
import {
  loadForReview, setQuestionReviewed, deleteQuestion, releaseTopic, holdTopic,
  type ReviewRow,
} from "@/lib/questionStore";

/**
 * Read and vet the question bank.
 *
 * The Coverage tab answers "how many questions exist"; this answers "are they
 * any good", which is the question that actually matters before releasing
 * anything to students. Every item shows its stem, options with the key marked,
 * the explanation and its source anchor, so an answer can be checked against
 * the Economic Review page it came from without leaving the screen.
 */
export function QuestionReview() {
  const { subjects, questionCoverage, currentUser } = useAppState();
  const isAdmin = currentUser?.role === "admin";

  const topics = useMemo(() => {
    const out: { id: string; name: string; subject: string; icon: string; total: number; reviewed: number }[] = [];
    for (const s of subjects) {
      for (const t of s.topics) {
        const cov = questionCoverage[t.id];
        if (cov && cov.total > 0) {
          out.push({ id: t.id, name: t.name, subject: s.name, icon: s.icon, total: cov.total, reviewed: cov.reviewed });
        }
      }
    }
    return out.sort((a, b) => b.total - a.total);
  }, [subjects, questionCoverage]);

  const [topicId, setTopicId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "held" | "released">("all");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { if (!topicId && topics.length) setTopicId(topics[0].id); }, [topics, topicId]);

  const refresh = async (tid: string, f: typeof filter) => {
    setLoading(true);
    setRows(await loadForReview(tid, f));
    setLoading(false);
  };
  useEffect(() => { if (topicId) void refresh(topicId, filter); }, [topicId, filter]);

  const shown = rows.filter((r) =>
    !search || r.q.toLowerCase().includes(search.toLowerCase()) ||
    (r.why ?? "").toLowerCase().includes(search.toLowerCase()));

  const active = topics.find((t) => t.id === topicId);

  async function toggleOne(r: ReviewRow) {
    setBusy(r.id); setNote(null);
    const res = await setQuestionReviewed(r.id, !r.reviewed);
    setBusy(null);
    if (res.error) { setNote(res.error); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, reviewed: !x.reviewed } : x));
  }

  async function removeOne(r: ReviewRow) {
    if (!confirm("Delete this question permanently?")) return;
    setBusy(r.id);
    const res = await deleteQuestion(r.id);
    setBusy(null);
    if (res.error) { setNote(res.error); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  }

  async function bulk(release: boolean) {
    if (!topicId) return;
    setBusy("bulk"); setNote(null);
    const res = release ? await releaseTopic(topicId) : await holdTopic(topicId);
    setBusy(null);
    if (res.error) { setNote(res.error); return; }
    setNote(release ? "All questions in this microtheme released." : "All questions held back.");
    void refresh(topicId, filter);
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-4xl mb-2">📝</div>
        <h3 className="font-semibold text-slate-900 mb-1">No questions in the bank yet</h3>
        <p className="text-sm text-slate-500">Add some from the Upload tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={topicId ?? ""}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full appearance-none px-3 py-2.5 pr-9 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name} — {t.total} Q ({t.reviewed} released)
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["all", "held", "released"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                  filter === f ? "bg-white shadow text-indigo-700" : "text-slate-600"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search within this microtheme…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {isAdmin && (
            <>
              <Button variant="secondary" disabled={busy === "bulk"} onClick={() => bulk(true)}>
                {busy === "bulk" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Release all
              </Button>
              <Button variant="secondary" disabled={busy === "bulk"} onClick={() => bulk(false)}>
                <X className="w-4 h-4" /> Hold all
              </Button>
            </>
          )}
        </div>

        {active && (
          <div className="text-xs text-slate-500">
            {active.subject} · <span className="font-mono">{active.id}</span> ·
            showing {shown.length} of {rows.length}
          </div>
        )}
        {note && <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2">{note}</div>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading questions…
        </div>
      ) : (
        <ol className="space-y-3">
          {shown.map((r, i) => (
            <li key={r.id} className={`rounded-2xl border p-4 ${r.reviewed ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
                  <span className="text-slate-400">#{i + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    r.difficulty_tier === 3 ? "bg-rose-100 text-rose-800"
                    : r.difficulty_tier === 2 ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"}`}>
                    {r.difficulty_tier === 3 ? "hard" : r.difficulty_tier === 2 ? "moderate" : "easy"}
                  </span>
                  {r.question_type && <span className="text-slate-500">{r.question_type}</span>}
                  {r.source_year
                    ? <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">PYQ {r.source_year}</span>
                    : <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">model</span>}
                  <span className={`px-2 py-0.5 rounded-full ${r.reviewed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {r.reviewed ? "released" : "held"}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" disabled={busy === r.id} onClick={() => toggleOne(r)}>
                      {busy === r.id ? "…" : r.reviewed ? "Hold" : "Release"}
                    </Button>
                    <button onClick={() => removeOne(r)} title="Delete permanently"
                      className="p-2 text-slate-400 hover:text-rose-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-900 whitespace-pre-line leading-relaxed mb-3">{r.q}</p>

              <ul className="space-y-1 mb-3">
                {r.options.map((o, k) => (
                  <li key={k} className={`text-sm px-3 py-1.5 rounded-lg border flex items-start gap-2 ${
                    k === r.correct ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium"
                                    : "border-slate-200 bg-white text-slate-700"}`}>
                    <span className="font-bold w-5 flex-shrink-0">{String.fromCharCode(65 + k)}.</span>
                    <span>{o}</span>
                    {k === r.correct && <Check className="w-4 h-4 ml-auto flex-shrink-0 text-emerald-600" />}
                  </li>
                ))}
              </ul>

              {r.why && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 leading-relaxed">
                  {r.why}
                </p>
              )}
            </li>
          ))}
          {shown.length === 0 && (
            <li className="text-center text-sm text-slate-500 py-10">No questions match this filter.</li>
          )}
        </ol>
      )}
    </div>
  );
}
