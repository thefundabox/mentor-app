import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { findTopic, conceptLabel } from "@/data";
import { strengthsAndWeaknesses } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Star, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function MentorStudentDetail({ studentId }: { studentId: string }) {
  const { users, getStudent, levelInfo, setRoute, setViewingStudentId,
          approveChart, requestChartChanges, updateOverride } = useAppState();
  const user = users.find((u) => u.id === studentId);
  const s = getStudent(studentId);
  const info = levelInfo(studentId);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  if (!user) return null;

  const analytics = useMemo(() => strengthsAndWeaknesses(s.attempts), [s.attempts]);
  const chartData = useMemo(() =>
    analytics.all.map((c) => ({
      name: conceptLabel(c.concept),
      accuracy: Math.round(c.accuracy * 100),
      attempts: c.right + c.wrong,
    })).sort((a, b) => b.accuracy - a.accuracy),
    [analytics]
  );

  const scoreTrend = useMemo(() =>
    s.attempts.map((a, i) => ({
      name: `D${a.day}·${i + 1}`,
      score: a.score,
    })),
    [s.attempts]
  );

  const totalDays = s.chart.days.length;
  const completed = s.progress.completed.length;
  const pendingOverrides = s.overrides.filter((o) => o.status === "pending");

  const back = () => { setViewingStudentId(null); setRoute("mentor"); };

  const onApprovePlan = () => approveChart(studentId);
  const onRequestChanges = () => {
    requestChartChanges(studentId, feedback || "Please review and adjust.");
    setShowFeedback(false); setFeedback("");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={back} className="text-sm text-slate-500 hover:text-slate-800 mb-3 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> back to all students
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
            <div className="text-sm text-slate-500">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="Level" value={info.level} />
          <Stat label="Points" value={info.total.toLocaleString()} icon={<Star className="w-3 h-3 fill-amber-500 text-amber-500" />} />
          <Stat label="Days" value={`${completed}/${totalDays || "—"}`} />
          <Stat label="Attempts" value={s.attempts.length} />
        </div>
      </div>

      {/* Plan approval banner */}
      {s.chart.status === "pending_approval" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">Plan awaiting approval</div>
              <div className="text-sm text-amber-900">{user.name} submitted a {totalDays}-day plan. Review the chart below and decide.</div>
            </div>
            <div className="flex gap-2 items-start">
              <Button onClick={onApprovePlan}><Check className="w-4 h-4" /> Approve</Button>
              <Button variant="secondary" onClick={() => setShowFeedback((v) => !v)}><X className="w-4 h-4" /> Request changes</Button>
              <Button variant="ghost" onClick={() => { setViewingStudentId(studentId); setRoute("onboarding"); }}>
                <Pencil className="w-4 h-4" /> Edit plan
              </Button>
            </div>
          </div>
          {showFeedback && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="What should they change? (optional)"
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm"
              />
              <Button variant="secondary" onClick={onRequestChanges}>Send feedback</Button>
            </div>
          )}
        </div>
      )}

      {pendingOverrides.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
          <div className="text-xs font-bold uppercase tracking-wide text-rose-800 mb-2">Override request{pendingOverrides.length > 1 ? "s" : ""}</div>
          <div className="space-y-2">
            {pendingOverrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-semibold text-slate-900">Day {o.day}</span>
                  <span className="text-slate-500"> · {o.attempts} attempts · best {o.bestScore}%</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateOverride(studentId, { ...o, status: "approved" })}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => updateOverride(studentId, { ...o, status: "declined" })}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Strong areas</h2>
          </div>
          {analytics.strengths.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">Not enough attempts yet to gauge strengths.</div>
          ) : (
            <ul className="space-y-2">
              {analytics.strengths.map((c) => (
                <li key={c.concept} className="flex items-center justify-between">
                  <span className="text-sm text-slate-800">{conceptLabel(c.concept)}</span>
                  <span className="text-xs font-semibold text-emerald-700">{Math.round(c.accuracy * 100)}% · {c.right + c.wrong} qs</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weaknesses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <h2 className="font-semibold text-slate-900">Weak areas</h2>
          </div>
          {analytics.weaknesses.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">No weak areas detected yet — keep an eye on quiz performance.</div>
          ) : (
            <ul className="space-y-2">
              {analytics.weaknesses.map((c) => (
                <li key={c.concept} className="flex items-center justify-between">
                  <span className="text-sm text-slate-800">{conceptLabel(c.concept)}</span>
                  <span className="text-xs font-semibold text-rose-700">{Math.round(c.accuracy * 100)}% · {c.right + c.wrong} qs</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-1">Concept accuracy</h2>
          <p className="text-xs text-slate-500 mb-4">Green ≥ 70%, amber 50–69%, rose &lt; 50%.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.accuracy >= 70 ? "#10b981" : d.accuracy >= 50 ? "#f59e0b" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {scoreTrend.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">Quiz score history</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreTrend} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Prep chart ({totalDays} days)</h2>
        </div>
        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {s.chart.days.map((slot, i) => {
            const day = i + 1;
            const info = slot ? findTopic(slot.topicId) : null;
            const isDone = s.progress.completed.includes(day);
            const attemptsThisDay = s.attempts.filter((a) => a.day === day);
            const isStuck = attemptsThisDay.length >= 2 && !isDone;
            return (
              <div key={i} className={`px-5 py-3 flex items-center gap-3 ${isDone ? "bg-emerald-50/30" : isStuck ? "bg-amber-50/30" : ""}`}>
                <div className="w-10 text-center text-xs font-semibold text-slate-500">D{day}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {info ? info.topic.name : <span className="italic text-slate-400">unscheduled</span>}
                  </div>
                  <div className="text-xs text-slate-500">{info ? info.subject.name : "—"}</div>
                </div>
                <div className="text-right text-xs">
                  {attemptsThisDay.length > 0 && (
                    <>
                      <div className="font-medium text-slate-700">{attemptsThisDay.length} attempt{attemptsThisDay.length > 1 ? "s" : ""}</div>
                      <div className="text-slate-500">best {Math.max(...attemptsThisDay.map((a) => a.score))}%</div>
                    </>
                  )}
                  {isStuck && <div className="text-amber-700 font-semibold mt-1">⚠ stuck</div>}
                  {isDone && <div className="text-emerald-700 font-semibold mt-1">✓ cleared</div>}
                </div>
              </div>
            );
          })}
          {totalDays === 0 && <div className="p-6 text-center text-sm text-slate-500">No chart submitted yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase font-semibold text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 flex items-center justify-end gap-1">{icon}{value}</div>
    </div>
  );
}
