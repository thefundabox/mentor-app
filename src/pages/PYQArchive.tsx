import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { ArrowLeft, Search, Trophy, ChevronDown, ChevronUp, Filter, PlayCircle } from "lucide-react";
import type { Question } from "@/types";
import { loadAllPyqs, loadPyqYears, type PyqYear } from "@/lib/pyqStore";
import { findTopic } from "@/data";
import { GuideNote } from "@/components/GuideNote";

/**
 * Past-paper archive.
 *
 * Two ways in, because they answer different questions. Whole papers are for
 * "can I clear the cut-off under time"; the browse below is for "what has RPSC
 * actually asked about irrigation", and any filtered slice of it can be
 * attempted as a paper of its own.
 *
 * The hand-entered `pyqBank` used to render here as prose cards with the answer
 * one click away. It is gone: seven demo questions sitting next to 546 real
 * ones made the tab look like it had never been converted. The bank itself has
 * since been deleted -- the admin editor that fed it now edits the Postgres
 * `questions` rows these papers come from.
 */
export function PYQArchive() {
  const { subjects, setRoute, setPyqTarget, currentUser, pyqPointsOf } = useAppState();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const [papers, setPapers] = useState<PyqYear[] | null>(null);
  const [all, setAll] = useState<Question[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPyqYears().then((ys) => { if (!cancelled) setPapers(ys); });
    void loadAllPyqs().then((qs) => { if (!cancelled) setAll(qs); });
    return () => { cancelled = true; };
  }, []);

  const subjectLookup = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  /** Subject id for a question, by the `<subjectId>-mNN` convention. */
  const subjectOf = (q: Question) => q.concept.replace(/-m\d+$/, "");

  const filtered = useMemo(() => {
    if (!all) return [];
    const needle = query.trim().toLowerCase();
    return all.filter((q) => {
      if (yearFilter && q.sourceYear !== yearFilter) return false;
      if (subjectFilter && subjectOf(q) !== subjectFilter) return false;
      if (needle) {
        const hay = `${q.q} ${q.options.join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, query, yearFilter, subjectFilter]);

  const hasFilter = !!(query || yearFilter || subjectFilter);

  const startPaper = (year: string) => {
    setPyqTarget({ label: `RAS Prelims ${year}`, year });
    setRoute("pyq_attempt");
  };

  /**
   * Attempt whatever the filters currently describe. Only offered when the
   * filters are expressible as a target -- a free-text search is not, so it is
   * excluded rather than silently attempting something wider than what is on
   * screen.
   */
  const startFiltered = () => {
    const subjectName = subjectFilter ? subjectLookup.get(subjectFilter)?.name : null;
    const label = [subjectName, yearFilter ? `RAS ${yearFilter}` : null]
      .filter(Boolean).join(" - ") || "Past questions";
    setPyqTarget({ label, year: yearFilter || undefined, subjectId: subjectFilter || undefined });
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
          Sit a full RAS Prelims paper under exam conditions, or filter down to a
          subject and attempt just those. Marked against the final answer key
          RPSC published, not an in-house key.
        </p>
        {currentUser && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-900">{pyqPointsOf(currentUser.id)} PYQ points</span>
            <span className="text-amber-800/70 text-xs">tracked separately from your plan XP</span>
          </div>
        )}
      </div>

      {/* The rule students most often get wrong: revisiting is free, and only
          opening new ground draws on the daily allowance. */}
      <GuideNote className="mb-5">
        Anything you have opened before stays open &mdash; going back over a question
        never counts against your questions for the day. It is only new ground that does,
        so re-reading what caught you out yesterday costs nothing.
      </GuideNote>

      {/* ------------------------------------------------- attemptable papers */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Attempt a full paper
        </h2>

        {papers === null && <div className="text-sm text-slate-500">Loading papers…</div>}

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

      {/* --------------------------------------------------------- browse all */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Browse every past question
      </h2>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the question or its options"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm">
            <option value="">All years</option>
            {(papers ?? []).map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm">
            <option value="">All subjects</option>
            {subjects.filter((s) => !s.archived).map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
        </div>

        {all !== null && (
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3 h-3" /> {filtered.length} of {all.length} questions
              {hasFilter && (
                <button onClick={() => { setQuery(""); setYearFilter(""); setSubjectFilter(""); }}
                  className="ml-2 text-slate-500 hover:text-slate-900 underline">clear</button>
              )}
            </div>
            {(yearFilter || subjectFilter) && !query && filtered.length > 0 && (
              <button
                onClick={startFiltered}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" /> Attempt these {filtered.length}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {all === null && <div className="text-sm text-slate-500 px-1">Loading questions…</div>}
        {all !== null && filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No past questions match your filters.
          </div>
        )}
        {filtered.map((q) => {
          const key = q.id ?? q.q;
          const found = findTopic(q.concept);
          return (
            <div key={key} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">
                  RAS {q.sourceYear}{q.paperQno ? ` · Q${q.paperQno}` : ""}
                </span>
                {found && (
                  <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 rounded px-2 py-0.5">
                    {found.topic.name}
                  </span>
                )}
              </div>
              <div className="text-slate-800 mb-3 whitespace-pre-line leading-[1.6]">{q.q}</div>
              <button
                onClick={() => setOpenIds((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {openIds[key] ? "Hide answer" : "Reveal answer"}
                {openIds[key] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openIds[key] && (
                <div className="mt-3 space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-sm rounded-lg px-3 py-2 border flex items-start gap-2 ${
                      oi === q.correct
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 text-slate-600"
                    }`}>
                      <span className="font-semibold">{String.fromCharCode(65 + oi)}</span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  ))}
                  <div className="text-xs text-slate-500 pt-1">
                    {q.why || "Answer as per the official RPSC final answer key."}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
