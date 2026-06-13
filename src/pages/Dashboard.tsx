/**
 * Adaptive practice — student dashboard (PR 5)
 *
 * Reads a single computeDashboard() payload and renders sections for:
 *   - Readiness scores (prelims + Rajasthan)
 *   - Subject breakdown with accuracy bars + trend chips
 *   - Weak / strong subjects (top 3 each)
 *   - Negative-marking risk
 *   - Mock test trend (last 5)
 *   - Syllabus coverage map (collapsible per subject)
 *   - Top confusion pairs
 *
 * Same component serves student self-view AND mentor view; the `studentId`
 * prop drives the lookup. A header banner indicates when a mentor is
 * viewing.
 */

import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Sparkles, MapPin,
  AlertTriangle, ChevronDown, ChevronRight, Check, Circle, Hourglass, Trophy,
} from "lucide-react";
import {
  computeDashboard, type DashboardMetrics, type SubjectBreakdownRow,
  type NegativeMarkingRisk, type TopicStatus, type TrendDirection,
} from "@/lib/dashboardMetrics";

export function Dashboard({ studentId }: { studentId: string }) {
  const {
    currentUser, getStudent, subjects, testAttempts, users, setRoute, setViewingStudentId,
  } = useAppState();
  const student = getStudent(studentId);
  const studentUser = users.find((u) => u.id === studentId);
  const isMentorView = currentUser?.role !== "student" || currentUser.id !== studentId;

  const metrics: DashboardMetrics = useMemo(
    () => computeDashboard(student, subjects, testAttempts, studentId, Date.now()),
    [student, subjects, testAttempts, studentId],
  );

  const backLabel = isMentorView ? "Back to student" : "Back to home";
  const back = () => {
    if (isMentorView) {
      setRoute("mentor_student");
    } else {
      setRoute("home");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <button onClick={back} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {isMentorView && studentUser && (
        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-900">
          Viewing dashboard for <strong>{studentUser.name}</strong>.
        </div>
      )}

      <header>
        <div className="text-sm font-semibold text-indigo-600">Dashboard</div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isMentorView ? `${studentUser?.name ?? "Student"}'s readiness` : "Your readiness"}
        </h1>
      </header>

      {/* Readiness scores */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReadinessTile
          label="Prelims readiness"
          score={metrics.prelimsReadiness}
          icon={<Sparkles className="w-5 h-5" />}
          accent="indigo"
          sub="Weighted across attempted subjects"
        />
        <ReadinessTile
          label="Rajasthan readiness"
          score={metrics.rajasthanReadiness}
          icon={<MapPin className="w-5 h-5" />}
          accent="amber"
          sub="Rajasthan-flagged content only"
        />
      </section>

      {/* Negative marking risk */}
      <NegMarkingCard
        risk={metrics.negativeMarkingRisk}
        sessions={metrics.sessionsRun}
        shouldHaveSkipped={metrics.shouldHaveSkippedTotal}
        onPractice={() => { setViewingStudentId(null); setRoute("smart_practice"); }}
        isMentorView={isMentorView}
      />

      {/* Weak / strong subjects */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubjectListCard
          title="Weakest subjects"
          tone="rose"
          empty="Not enough data yet."
          rows={metrics.weakSubjects}
        />
        <SubjectListCard
          title="Strongest subjects"
          tone="emerald"
          empty="Not enough data yet."
          rows={metrics.strongSubjects}
        />
      </section>

      {/* Mock test trend */}
      {metrics.mockTestTrend.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs uppercase font-bold tracking-wide text-slate-500 mb-3">
            Last {metrics.mockTestTrend.length} mock test{metrics.mockTestTrend.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-end gap-3 h-32">
            {metrics.mockTestTrend.map((p, idx) => (
              <div key={`${p.testId}_${idx}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="flex-1 w-full bg-slate-100 rounded-md relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-indigo-500"
                    style={{ height: `${Math.max(2, p.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-700">{p.percent}%</div>
                <div className="text-[9px] text-slate-500">{new Date(p.finishedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Syllabus coverage summary + collapsible details */}
      <SyllabusCoverageSection metrics={metrics} />

      {/* Subject breakdown table */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-xs uppercase font-bold tracking-wide text-slate-500">
          All subjects
        </div>
        <ul className="divide-y divide-slate-100">
          {metrics.subjects.map((s) => (
            <SubjectRow key={s.subjectId} row={s} />
          ))}
        </ul>
      </section>

      {/* Confusion pairs */}
      {metrics.topConfusions.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-xs uppercase font-bold tracking-wide text-slate-500">
            Concepts being muddled
          </div>
          <ul className="divide-y divide-slate-100">
            {metrics.topConfusions.map((cp) => (
              <li key={cp.id} className="px-5 py-3">
                <div className="text-sm text-slate-900">
                  <span className="font-semibold">{cp.correctConcept}</span>
                  <span className="text-slate-400"> ↔ </span>
                  <span className="text-slate-700">"{truncate(cp.confusedWith, 70)}"</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{cp.count}×</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- pieces ------------------------------------------------------- */

function ReadinessTile({ label, score, icon, accent, sub }: {
  label: string; score: number; icon: React.ReactNode;
  accent: "indigo" | "amber"; sub: string;
}) {
  const map = {
    indigo: { gradient: "from-indigo-50 to-indigo-100/40", text: "text-indigo-700", bar: "bg-indigo-500" },
    amber:  { gradient: "from-amber-50 to-amber-100/40",   text: "text-amber-700",  bar: "bg-amber-500"  },
  }[accent];
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map.gradient} p-5`}>
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${map.text}`}>
        {icon}{label}
      </div>
      <div className="text-4xl font-bold text-slate-900 mt-2">{score}<span className="text-xl text-slate-500">/100</span></div>
      <div className="mt-3 h-2 bg-white/70 rounded-full overflow-hidden">
        <div className={`h-full ${map.bar}`} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <div className="text-xs text-slate-600 mt-2">{sub}</div>
    </div>
  );
}

function NegMarkingCard({
  risk, sessions, shouldHaveSkipped, onPractice, isMentorView,
}: {
  risk: NegativeMarkingRisk; sessions: number; shouldHaveSkipped: number;
  onPractice: () => void; isMentorView: boolean;
}) {
  const map = {
    low: { tone: "emerald", label: "Low risk", body: "You're skipping when you should. Keep that discipline going." },
    medium: { tone: "amber", label: "Medium risk", body: "Some slow-and-wrong answers are leaking marks. Practice catching uncertainty." },
    high: { tone: "rose", label: "High risk", body: "You're losing marks to guesses. In the real exam, skipping protects your score." },
  }[risk];
  const colors = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-800" },
    amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   chip: "bg-amber-100 text-amber-800" },
    rose:    { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    chip: "bg-rose-100 text-rose-800" },
  }[map.tone as "emerald" | "amber" | "rose"];

  return (
    <section className={`rounded-2xl border ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${colors.text} mt-1 flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs uppercase font-bold tracking-wide text-slate-500">Negative-marking discipline</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.chip}`}>{map.label}</span>
          </div>
          <p className="text-sm text-slate-900">{map.body}</p>
          <p className="text-xs text-slate-600 mt-1">
            Based on {sessions} session{sessions === 1 ? "" : "s"} so far · {shouldHaveSkipped} slow-and-wrong answers across them
          </p>
          {!isMentorView && sessions > 0 && (
            <Button className="mt-3" variant="secondary" onClick={onPractice}>
              <Sparkles className="w-4 h-4" /> Run a practice session
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function SubjectListCard({ title, tone, rows, empty }: {
  title: string; tone: "rose" | "emerald"; rows: SubjectBreakdownRow[]; empty: string;
}) {
  const titleColor = tone === "rose" ? "text-rose-700" : "text-emerald-700";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`text-xs uppercase font-bold tracking-wide ${titleColor} mb-3`}>{title}</div>
      {rows.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.subjectId} className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900 truncate">
              {r.icon} {r.subjectName}
            </span>
            <span className="text-sm font-bold text-slate-800">
              {r.accuracy === null ? "—" : `${Math.round(r.accuracy * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubjectRow({ row }: { row: SubjectBreakdownRow }) {
  const accPct = row.accuracy === null ? 0 : Math.round(row.accuracy * 100);
  return (
    <li className="px-5 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{row.icon}</span>
          <span className="text-sm font-semibold text-slate-900 truncate">{row.subjectName}</span>
          {row.rajasthanSpecific && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
              <MapPin className="w-2.5 h-2.5" /> Rajasthan
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{row.attempts} attempt{row.attempts === 1 ? "" : "s"}</span>
          <TrendIcon trend={row.trend} />
          <span className="text-sm font-bold text-slate-800 w-12 text-right">
            {row.accuracy === null ? "—" : `${accPct}%`}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${accColor(accPct)}`} style={{ width: `${Math.max(2, accPct)}%` }} />
      </div>
    </li>
  );
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "improving") return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="w-4 h-4 text-rose-600" />;
  if (trend === "stable") return <Minus className="w-4 h-4 text-slate-400" />;
  return <span className="w-4 h-4" />;
}

function SyllabusCoverageSection({ metrics }: { metrics: DashboardMetrics }) {
  const { syllabusSummary, syllabusCoverage } = metrics;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const bySubject = new Map<string, { name: string; rows: typeof syllabusCoverage }>();
  for (const r of syllabusCoverage) {
    const entry = bySubject.get(r.subjectId) ?? { name: r.subjectName, rows: [] };
    entry.rows.push(r);
    bySubject.set(r.subjectId, entry);
  }
  const toggle = (id: string) => setExpanded((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="text-xs uppercase font-bold tracking-wide text-slate-500 mb-2">Syllabus coverage</div>
        <CoverageSummary s={syllabusSummary} />
      </div>
      <ul className="divide-y divide-slate-100">
        {Array.from(bySubject.entries()).map(([id, { name, rows }]) => {
          const isOpen = expanded.has(id);
          const covered = rows.filter((r) => r.status !== "not_started").length;
          return (
            <li key={id}>
              <button
                onClick={() => toggle(id)}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {name}
                </span>
                <span className="text-xs text-slate-500">{covered} / {rows.length} touched</span>
              </button>
              {isOpen && (
                <ul className="bg-slate-50/60 divide-y divide-slate-100">
                  {rows.map((t) => (
                    <li key={t.topicId} className="px-10 py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 min-w-0 text-slate-800">
                        <StatusDot status={t.status} />
                        <span className="truncate">{t.topicName}</span>
                        {t.isRajasthanSpecific && <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      </span>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {t.attempts > 0 ? `${Math.round((t.accuracy ?? 0) * 100)}% · ${t.attempts}×` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CoverageSummary({ s }: { s: DashboardMetrics["syllabusSummary"] }) {
  const total = Math.max(1, s.total);
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-[11px] font-semibold flex-wrap">
        <span className="text-emerald-700">{s.mastered} mastered</span>
        <span className="text-indigo-700">{s.confident} confident</span>
        <span className="text-amber-700">{s.inProgress} in progress</span>
        <span className="text-slate-500">{s.notStarted} not started</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500" style={{ width: `${(s.mastered / total) * 100}%` }} />
        <div className="bg-indigo-500"  style={{ width: `${(s.confident / total) * 100}%` }} />
        <div className="bg-amber-400"   style={{ width: `${(s.inProgress / total) * 100}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: TopicStatus }) {
  if (status === "mastered") return <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
  if (status === "confident") return <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />;
  if (status === "in_progress") return <Hourglass className="w-4 h-4 text-amber-600 flex-shrink-0" />;
  return <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />;
}

/* ---------- utils -------------------------------------------------------- */

function accColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-indigo-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-rose-500";
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
