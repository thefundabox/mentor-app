/**
 * Admin → Stats.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useEffect, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";

export function StatsTab() {
  const { mentors, students, getStudent, levelInfo, completedDays, subjects,
          ensureStudentRecords, studentRecordsLoading } = useAppState();

  // Aggregates over everyone, so it needs everyone. The fetch happens when this
  // tab is opened, not when the admin signs in.
  useEffect(() => { void ensureStudentRecords(); }, [ensureStudentRecords]);

  const totals = useMemo(() => {
    let attempts = 0, scoreSum = 0, days = 0, cleared = 0, xp = 0;
    for (const s of students) {
      const sd = getStudent(s.id);
      attempts += sd.attempts.length;
      scoreSum += sd.attempts.reduce((a, b) => a + b.score, 0);
      days += sd.chart.days.length;
      cleared += completedDays(s.id).length;
      xp += sd.points.total;
    }
    return {
      students: students.length,
      mentors: mentors.length,
      activeTopics: subjects.filter((s) => !s.archived).reduce((a, s) => a + s.topics.length, 0),
      activeSubjects: subjects.filter((s) => !s.archived).length,
      avgScore: attempts === 0 ? null : Math.round(scoreSum / attempts),
      days, cleared, xp,
    };
  }, [students, mentors, subjects, getStudent, completedDays]);

  const leaderboard = useMemo(() => {
    return mentors.map((m) => {
      const list = students.filter((s) => s.mentorId === m.id);
      const totalCleared = list.reduce((a, s) => a + completedDays(s.id).length, 0);
      const totalAttempts = list.reduce((a, s) => a + getStudent(s.id).attempts.length, 0);
      const avgLevel = list.length === 0 ? 0 :
        list.reduce((a, s) => a + levelInfo(s.id).level, 0) / list.length;
      return { mentor: m, students: list.length, cleared: totalCleared, attempts: totalAttempts, avgLevel };
    }).sort((a, b) => b.cleared - a.cleared);
  }, [mentors, students, completedDays, getStudent, levelInfo]);

  return (
    <div className="space-y-6">
      {/* Totals count answers and cleared days, so they read low until the
          records land. Better to say it is still counting. */}
      {studentRecordsLoading && (
        <div className="text-xs font-medium text-slate-500">Loading student records…</div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Students" value={totals.students} />
        <StatCard label="Mentors" value={totals.mentors} />
        <StatCard label="Subjects · topics" value={`${totals.activeSubjects} · ${totals.activeTopics}`} />
        <StatCard label="Platform avg score" value={totals.avgScore === null ? "—" : `${totals.avgScore}%`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Days planned" value={totals.days} />
        <StatCard label="Days cleared" value={totals.cleared} />
        <StatCard label="Total XP earned" value={totals.xp.toLocaleString()} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Mentor leaderboard</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No mentors yet.</div>}
          {leaderboard.map((row, i) => (
            <div key={row.mentor.id} className="px-5 py-3 flex items-center gap-4">
              <div className="w-6 text-center text-sm font-bold text-slate-400">#{i + 1}</div>
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                {row.mentor.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{row.mentor.name}</div>
                <div className="text-xs text-slate-500">{row.students} student{row.students === 1 ? "" : "s"} · {row.attempts} attempts</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-700">{row.cleared} days cleared</div>
                <div className="text-xs text-slate-500">avg Lv {row.avgLevel.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-xs uppercase font-semibold text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}


/* ==================== Plans tab ==================== */
