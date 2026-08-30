import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { ArrowLeft, Search, Trophy, ChevronDown, ChevronUp, Filter, PlayCircle } from "lucide-react";
import type { PYQ } from "@/types";
import { loadPyqYears, type PyqYear } from "@/lib/pyqStore";

/**
 * Past-paper archive.
 *
 * Leads with whole papers a student can sit, because "attempt it" is what a
 * past paper is for; browsing a question whose answer is already printed next
 * to it teaches recognition, not recall.
 *
 * The curated bank below is the older hand-entered PYQ list. It stays because
 * an admin may have written notes into it, but it is no longer the main event.
 */
export function PYQArchive() {
  const { pyqBank, subjects, setRoute, setPyqTarget } = useAppState();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const [papers, setPapers] = useState<PyqYear[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadPyqYears().then((ys) => { if (!cancelled) setPapers(ys); });
    return () => { cancelled = true; };
  }, []);

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

  const subjectLookup = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const startPaper = (year: string) => {
    setPyqTarget({ kind: "year", year });
    setRoute("pyq_attempt");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => setRoute("home")} className="text-sm text-slate-500 hover:text-slate-800 mb-3 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> back to home
      </button>

      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">PYQ archive</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Previous-year questions</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Sit a full RAS Prelims paper under exam conditions, then review every
          question with the official answer. Marked against the final answer key
          RPSC published, not an in-house key.
        </p>
      </div>

      {/* ------------------------------------------------- attemptable papers */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Attempt a full paper
        </h2>

        {papers === null && (
          <div className="text-sm text-slate-500">Loading papers…</div>
        )}

        {papers !== null && papers.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
            No past papers have been released yet. An admin releases them from
            Admin → Questions.
          </div>
        )}

        {papers !== null && papers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {papers.map((p) => (
              <button
                key={p.year}
                onClick={() => startPaper(p.year)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span className="text-lg font-bold text-slate-900">RAS Prelims {p.year}</span>
                </div>
                <div className="text-sm text-slate-500 mb-3">
                  {p.count} question{p.count === 1 ? "" : "s"} · official answer key
                </div>
                <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4" /> Start the paper
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --------------------------------------------------- curated notes bank */}
      {pyqBank.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Curated notes bank
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search question, answer, or explanation"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
              </div>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm">
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm">
                <option value="">All subjects</option>
                {subjects.filter((s) => !s.archived).map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            {(query || yearFilter || subjectFilter) && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Filter className="w-3 h-3" /> {filtered.length} of {pyqBank.length}
                </div>
                <button onClick={() => { setQuery(""); setYearFilter(""); setSubjectFilter(""); }}
                  className="text-slate-500 hover:text-slate-900">clear filters</button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                No questions match your filters.
              </div>
            )}
            {filtered.map((p, i) => (
              <PYQCard key={p.id || i} pyq={p}
                open={!!openIds[p.id || String(i)]}
                onToggle={() => setOpenIds((prev) => ({ ...prev, [p.id || String(i)]: !prev[p.id || String(i)] }))}
                subjectLookup={subjectLookup}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PYQCard({ pyq, open, onToggle, subjectLookup }: {
  pyq: PYQ;
  open: boolean;
  onToggle: () => void;
  subjectLookup: Map<string, { id: string; icon: string; name: string }>;
}) {
  const subjects = (pyq.subjectIds || []).map((id) => subjectLookup.get(id)).filter(Boolean);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Trophy className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-bold text-amber-700">{pyq.year}</span>
        {pyq.marks && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{pyq.marks} marks</span>}
        {subjects.map((s) => (
          <span key={s!.id} className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 rounded px-2 py-0.5">
            {s!.icon} {s!.name}
          </span>
        ))}
      </div>
      <div className="text-slate-800 mb-3">{pyq.q}</div>
      <button onClick={onToggle} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
        {open ? "Hide answer" : "Reveal answer"}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm"><span className="font-semibold text-emerald-700">Answer:</span> {pyq.a}</div>
          {pyq.explain && <div className="text-sm text-slate-600 mt-1">{pyq.explain}</div>}
        </div>
      )}
    </div>
  );
}
