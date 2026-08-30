import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, Search, Layers, Target, FileText } from "lucide-react";
import { DEFAULT_SUBJECTS } from "@/data";
import { PYQ_PER_MICROTHEME, PYQ_TOTAL, PYQ_YEARS, MICROTHEMES_ASKED } from "@/data/pyqStats";

/**
 * How the 243 microthemes were built, and what the papers actually asked.
 *
 * Everything here is the live taxonomy and the live question counts, not
 * marketing copy with numbers typed in beside it. If a paper is added, the
 * page changes. That is the point: the claim a student is being asked to
 * believe is checkable on the page making it.
 *
 * Runs signed out, so both sources are bundled -- DEFAULT_SUBJECTS and the
 * generated pyqStats. The `questions` table needs a session and cannot be read
 * here.
 */
export function Methodology() {
  const { setRoute, currentUser } = useAppState();
  const [openSubject, setOpenSubject] = useState<string | null>(DEFAULT_SUBJECTS[0]?.id ?? null);
  const [query, setQuery] = useState("");

  const subjects = useMemo(() => DEFAULT_SUBJECTS.filter((s) => !s.archived), []);

  const stats = useMemo(() => {
    const themes = new Set<string>();
    let micro = 0;
    for (const s of subjects) for (const t of s.topics) { micro++; if (t.theme) themes.add(`${s.id}::${t.theme}`); }
    return { subjects: subjects.length, themes: themes.size, micro };
  }, [subjects]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!needle) return null;
    const out: { subject: string; theme: string; name: string; id: string; n: number }[] = [];
    for (const s of subjects) {
      for (const t of s.topics) {
        if (t.name.toLowerCase().includes(needle) || (t.theme ?? "").toLowerCase().includes(needle)) {
          out.push({ subject: s.name, theme: t.theme ?? "", name: t.name, id: t.id, n: PYQ_PER_MICROTHEME[t.id] ?? 0 });
        }
      }
    }
    return out.sort((a, b) => b.n - a.n).slice(0, 60);
  }, [needle, subjects]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ----------------------------------------------------------- header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setRoute(currentUser ? "dashboard" : "landing")}
            className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {!currentUser && (
            <Button className="ml-auto" size="sm" onClick={() => setRoute("login")}>Sign in</Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-3">
            The microtheme method
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.08] text-balance">
            The syllabus says “Rajasthan History”. The paper asks about stepwells.
          </h1>
          <p className="text-lg text-slate-600 mt-5 leading-relaxed">
            RPSC publishes a syllabus of broad headings. It does not tell you what a
            question looks like. So we took the six papers RPSC has actually set and
            worked backwards, until every question landed on something small enough
            to study in one sitting.
          </p>
        </div>

        {/* ------------------------------------------------------- the funnel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <Stage
            n="11"
            label="Subjects"
            body="The official RPSC headings, unchanged. This is the only layer RPSC gives you."
            icon={<FileText className="w-4 h-4" />}
          />
          <Stage
            n={String(stats.themes)}
            label="Themes"
            body="Each heading split into the areas the papers keep returning to. Still too broad to revise in a day."
            icon={<Layers className="w-4 h-4" />}
          />
          <Stage
            n={String(stats.micro)}
            label="Microthemes"
            body="One idea, one sitting, one question's worth of ground. This is the unit the whole app runs on."
            icon={<Target className="w-4 h-4" />}
            highlight
          />
        </div>

        {/* ---------------------------------------------------------- proof */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Then we tested it against the papers</h2>
          <p className="text-slate-600 mt-2 max-w-2xl">
            A taxonomy nobody checked is a guess. Every question from six RPSC papers
            was tagged to exactly one microtheme, and graded against the official RPSC
            answer key — not a coaching-centre key.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-7">
            <Figure n={String(PYQ_TOTAL)} label="Questions tagged" />
            <Figure n={String(PYQ_YEARS.length)} label="Papers decoded" />
            <Figure n={String(MICROTHEMES_ASKED)} label="Microthemes RPSC has asked" />
            <Figure n={`${Math.round((MICROTHEMES_ASKED / stats.micro) * 100)}%`} label="Of the taxonomy, seen in a paper" />
          </div>
          <p className="text-sm text-slate-500 mt-6 leading-relaxed">
            The other {stats.micro - MICROTHEMES_ASKED} microthemes have not appeared in these
            six papers. They are in the syllabus, so they stay in the plan — but now you
            know which is which, and so does your plan.
          </p>
        </div>

        {/* -------------------------------------------------------- explorer */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-slate-900">Open it up</h2>
          <p className="text-slate-600 mt-2 max-w-2xl">
            The whole taxonomy, with the number of past questions RPSC has set on each
            microtheme. Search it, or open a subject.
          </p>

          <div className="relative mt-5 mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “stepwell”, “inflation”, “Bijolia”, “monsoon”…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 text-slate-800"
            />
          </div>

          {matches ? (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {matches.length === 0 && (
                <div className="p-6 text-sm text-slate-500">
                  Nothing in the taxonomy matches “{query}”. That is itself an answer —
                  if RPSC has never framed a question that way, it is not a microtheme.
                </div>
              )}
              {matches.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{m.name}</div>
                    <div className="text-xs text-slate-500 truncate">{m.subject} · {m.theme}</div>
                  </div>
                  <Count n={m.n} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((s) => {
                const open = openSubject === s.id;
                const byTheme = new Map<string, typeof s.topics>();
                for (const t of s.topics) {
                  const k = t.theme ?? "Other";
                  byTheme.set(k, [...(byTheme.get(k) ?? []), t]);
                }
                const total = s.topics.reduce((a, t) => a + (PYQ_PER_MICROTHEME[t.id] ?? 0), 0);
                return (
                  <div key={s.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <button
                      onClick={() => setOpenSubject(open ? null : s.id)}
                      className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 transition"
                    >
                      <span className="text-xl leading-none">{s.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          {byTheme.size} theme{byTheme.size === 1 ? "" : "s"} · {s.topics.length} microthemes · {total} past questions
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          <div className="p-5 space-y-5">
                            {[...byTheme.entries()].map(([theme, topics]) => (
                              <div key={theme}>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                  {theme}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {topics.map((t) => {
                                    const n = PYQ_PER_MICROTHEME[t.id] ?? 0;
                                    return (
                                      <span
                                        key={t.id}
                                        title={n === 0 ? "Not asked in the six papers we decoded" : `${n} past question${n === 1 ? "" : "s"}`}
                                        className={`inline-flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1 border ${
                                          n === 0
                                            ? "border-slate-200 bg-white text-slate-500"
                                            : "border-indigo-200 bg-indigo-50 text-indigo-900"
                                        }`}
                                      >
                                        {t.name}
                                        {n > 0 && (
                                          <span className="text-[10px] font-bold tabular-nums text-indigo-700 bg-white rounded px-1">
                                            {n}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- cta */}
        {!currentUser && (
          <div className="mt-16 rounded-2xl bg-slate-900 text-white p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-balance">
              Every one of those {stats.micro} is a day in your plan.
            </h2>
            <p className="text-slate-300 mt-2 max-w-xl">
              Eighty days, three or four microthemes a day, with the past questions
              for each one waiting at the end of it.
            </p>
            <Button className="mt-6 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setRoute("login")}>
              Start preparing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stage({ n, label, body, icon, highlight }: {
  n: string; label: string; body: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${
      highlight ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white"
    }`}>
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-3 ${
        highlight ? "text-indigo-700" : "text-slate-500"
      }`}>
        {icon} {label}
      </div>
      <div className={`text-3xl font-bold tabular-nums ${highlight ? "text-indigo-700" : "text-slate-900"}`}>{n}</div>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function Figure({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-slate-900 tabular-nums">{n}</div>
      <div className="text-xs text-slate-500 mt-1 leading-snug">{label}</div>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (n === 0) return <span className="text-xs text-slate-400 shrink-0">not yet asked</span>;
  return (
    <span className="text-xs font-bold tabular-nums text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 shrink-0">
      {n} PYQ{n === 1 ? "" : "s"}
    </span>
  );
}
