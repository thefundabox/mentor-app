import { useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, CheckCircle2, Star, AlertTriangle } from "lucide-react";
import { hasRedFlag } from "@/lib/analytics";

export function MentorDashboard() {
  const { currentUser, students, getStudent, setViewingStudentId, setRoute } = useAppState();
  if (!currentUser) return null;

  const pendingApprovals = useMemo(
    () => students.filter((u) => getStudent(u.id).chart.status === "pending_approval"),
    [students, getStudent]
  );

  const stats = useMemo(() => {
    let totalAttempts = 0;
    let avgSum = 0;
    let stuck = 0;
    let activeToday = 0;
    const oneDay = 86400000;
    for (const u of students) {
      const s = getStudent(u.id);
      totalAttempts += s.attempts.length;
      avgSum += s.attempts.reduce((a, b) => a + b.score, 0);
      const byDay: Record<number, number> = {};
      s.attempts.forEach((a) => { byDay[a.day] = (byDay[a.day] || 0) + 1; });
      stuck += Object.values(byDay).filter((c) => c >= 2).length;
      if (s.lastActivityAt && Date.now() - s.lastActivityAt < oneDay) activeToday += 1;
    }
    return {
      students: students.length,
      avgScore: totalAttempts === 0 ? null : Math.round(avgSum / totalAttempts),
      stuck,
      activeToday,
    };
  }, [students, getStudent]);

  const openStudent = (id: string) => {
    setViewingStudentId(id);
    setRoute("mentor_student");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-emerald-700">Mentor dashboard</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Hi {currentUser.name.split(" ")[0]} — {students.length} student{students.length === 1 ? "" : "s"} under your watch
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Students" value={stats.students} />
        <StatCard label="Avg quiz score" value={stats.avgScore === null ? "—" : `${stats.avgScore}%`} />
        <StatCard label="Pending approvals" value={pendingApprovals.length} accent={pendingApprovals.length > 0 ? "amber" : undefined} />
        <StatCard label="Active today" value={stats.activeToday} />
      </div>

      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-700" />
            <div className="text-sm font-semibold text-amber-900">
              {pendingApprovals.length} plan{pendingApprovals.length === 1 ? "" : "s"} awaiting your approval
            </div>
          </div>
          <div className="space-y-1.5">
            {pendingApprovals.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  <span className="text-slate-500"> · {u.email}</span>
                </div>
                <Button size="sm" onClick={() => openStudent(u.id)}>
                  Review <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All students</h2>
          <div className="text-xs text-slate-500">click a row to drill in</div>
        </div>
        <div className="divide-y divide-slate-100">
          {students.map((u) => (
            <StudentRow key={u.id} userId={u.id} name={u.name} email={u.email} onOpen={() => openStudent(u.id)} />
          ))}
          {students.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No students yet. They'll appear here after they sign up.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentRow({ userId, name, email, onOpen }: { userId: string; name: string; email: string; onOpen: () => void }) {
  const { getStudent, levelInfo, completedDays, batchForStudent } = useAppState();
  const batch = batchForStudent(userId);
  const s = getStudent(userId);
  const info = levelInfo(userId);
  const totalDays = s.chart.days.length || 1;
  const cleared = completedDays(userId);
  const completed = cleared.length;
  const pct = Math.round((completed / totalDays) * 100);

  const attemptsByDay: Record<number, number> = {};
  s.attempts.forEach((a) => { attemptsByDay[a.day] = (attemptsByDay[a.day] || 0) + 1; });
  const stuckBorderline = Object.entries(attemptsByDay).some(([d, c]) => c === 2 && !cleared.includes(Number(d)));
  const redFlag = hasRedFlag(s);

  const statusBadge = (() => {
    switch (s.chart.status) {
      case "approved":          return <Badge color="emerald" text="Approved" />;
      case "pending_approval":  return <Badge color="amber"  text="Pending" />;
      case "changes_requested": return <Badge color="rose"   text="Changes requested" />;
      default:                  return <Badge color="slate"  text="Draft" />;
    }
  })();

  return (
    <button onClick={onOpen} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-semibold text-slate-900 truncate">{name}</div>
          {statusBadge}
          {batch && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50">
              {batch.name}
            </span>
          )}
          {redFlag && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-rose-700 px-2 py-0.5 rounded bg-rose-100">
              🚩 needs help
            </span>
          )}
          {!redFlag && stuckBorderline && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-100">
              <AlertTriangle className="w-3 h-3" /> 2 attempts
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{email} · Day {s.progress.currentDay} of {totalDays}</div>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]">
        <div className="flex items-center gap-1 text-sm font-semibold text-amber-700">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />{info.total.toLocaleString()}
          <span className="text-[10px] uppercase text-slate-400 font-medium ml-1">Lv {info.level}</span>
        </div>
        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}></div>
        </div>
        <div className="text-[10px] text-slate-500">{completed}/{totalDays} days · {pct}%</div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
}

function Badge({ color, text }: { color: "emerald" | "amber" | "rose" | "slate"; text: string }) {
  const map = {
    emerald: "text-emerald-700 bg-emerald-100",
    amber:   "text-amber-700 bg-amber-100",
    rose:    "text-rose-700 bg-rose-100",
    slate:   "text-slate-600 bg-slate-100",
  };
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${map[color]}`}>{text}</span>;
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: "amber" }) {
  const cls = accent === "amber" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border ${cls} p-4`}>
      <div className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1">
        {accent === "amber" && <CheckCircle2 className="w-3 h-3 text-amber-600" />}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
