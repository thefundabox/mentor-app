import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { ArrowLeft, Search, Trophy, ChevronDown, ChevronUp, Filter } from "lucide-react";
import type { PYQ } from "@/types";

export function PYQArchive() {
  const { pyqBank, subjects, setRoute } = useAppState();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => setRoute("home")} className="text-sm text-slate-500 hover:text-slate-800 mb-3 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> back to home
      </button>

      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">PYQ archive</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Previous-year questions</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Searchable archive of past RAS questions. Filter by year or subject; click a card to reveal the answer.
        </p>
      </div>

      {/* Filters */}
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
