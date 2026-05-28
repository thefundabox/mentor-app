import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import {
  Users, BookOpen, BarChart3, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, Archive, RotateCw,
} from "lucide-react";
import type { SubjectCatalogEntry } from "@/types";

export function AdminDashboard() {
  const { adminTab, setAdminTab } = useAppState();
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-slate-600">Admin</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform overview</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        <TabButton active={adminTab === "people"}  onClick={() => setAdminTab("people")}  icon={<Users className="w-4 h-4" />} label="People" />
        <TabButton active={adminTab === "catalog"} onClick={() => setAdminTab("catalog")} icon={<BookOpen className="w-4 h-4" />} label="Subject master" />
        <TabButton active={adminTab === "stats"}   onClick={() => setAdminTab("stats")}   icon={<BarChart3 className="w-4 h-4" />} label="Stats" />
      </div>

      {adminTab === "people"  && <PeopleTab />}
      {adminTab === "catalog" && <CatalogTab />}
      {adminTab === "stats"   && <StatsTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition ${
        active ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}>
      {icon}{label}
    </button>
  );
}

/* ==================== People tab ==================== */

function PeopleTab() {
  const { mentors, students, addUser, assignStudentToMentor, levelInfo, getStudent, completedDays } = useAppState();
  const [newMentorEmail, setNewMentorEmail] = useState("");
  const [newMentorName, setNewMentorName] = useState("");

  const studentsByMentor = useMemo(() => {
    const out: Record<string, typeof students> = {};
    for (const m of mentors) out[m.id] = [];
    out["__unassigned"] = [];
    for (const s of students) {
      if (s.mentorId && out[s.mentorId]) out[s.mentorId].push(s);
      else out["__unassigned"].push(s);
    }
    return out;
  }, [mentors, students]);

  const addMentor = () => {
    if (!newMentorEmail.includes("@")) return;
    addUser({ role: "mentor", email: newMentorEmail.trim().toLowerCase(), name: newMentorName.trim() || newMentorEmail.split("@")[0] });
    setNewMentorEmail(""); setNewMentorName("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Add a mentor</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input type="email" placeholder="email@example.com" value={newMentorEmail} onChange={(e) => setNewMentorEmail(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <input type="text" placeholder="Display name" value={newMentorName} onChange={(e) => setNewMentorName(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <Button onClick={addMentor} disabled={!newMentorEmail.includes("@")}><Plus className="w-4 h-4" /> Add mentor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mentors.map((m) => {
          const list = studentsByMentor[m.id] || [];
          const totalDays = list.reduce((acc, s) => acc + getStudent(s.id).chart.days.length, 0);
          const totalCleared = list.reduce((acc, s) => acc + completedDays(s.id).length, 0);
          return (
            <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase font-bold text-slate-500">Students</div>
                  <div className="text-lg font-bold text-slate-900">{list.length}</div>
                </div>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-slate-500 py-3 text-center bg-slate-50 rounded-lg">No students assigned.</div>
              ) : (
                <div className="space-y-1.5">
                  {list.map((s) => {
                    const info = levelInfo(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                          <div className="text-[11px] text-slate-500">Lv {info.level} · ⭐ {info.total.toLocaleString()}</div>
                        </div>
                        <ReassignMentor studentId={s.id} currentMentorId={m.id} mentors={mentors} onChange={assignStudentToMentor} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-3">
                <span>{totalCleared} / {totalDays} days cleared overall</span>
              </div>
            </div>
          );
        })}
      </div>

      {studentsByMentor["__unassigned"].length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-semibold text-amber-900 mb-3">Unassigned students ({studentsByMentor["__unassigned"].length})</h2>
          <div className="space-y-1.5">
            {studentsByMentor["__unassigned"].map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white">
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  <span className="text-slate-500"> · {s.email}</span>
                </div>
                <ReassignMentor studentId={s.id} currentMentorId={null} mentors={mentors} onChange={assignStudentToMentor} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReassignMentor({ studentId, currentMentorId, mentors, onChange }: {
  studentId: string; currentMentorId: string | null;
  mentors: { id: string; name: string }[];
  onChange: (studentId: string, mentorId: string) => void;
}) {
  return (
    <select
      value={currentMentorId ?? ""}
      onChange={(e) => onChange(studentId, e.target.value)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none"
    >
      {!currentMentorId && <option value="" disabled>Assign…</option>}
      {mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}

/* ==================== Catalog tab ==================== */

function CatalogTab() {
  const { subjects, upsertSubject, archiveSubject, upsertTopic, removeTopic } = useAppState();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [newSubjectName, setNewSubjectName] = useState("");

  const toggle = (id: string) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    const id = "subj_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) + "_" + Date.now().toString(36).slice(-4);
    upsertSubject({ id, name, icon: "📘", color: "slate", topics: [] });
    setNewSubjectName("");
  };

  const showArchived = subjects.some((s) => s.archived);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-900 mb-2">Add subject</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="e.g. Indian Society" value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSubject(); }}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <Button onClick={addSubject} disabled={!newSubjectName.trim()}><Plus className="w-4 h-4" /> Add</Button>
        </div>
        <div className="text-xs text-slate-500 mt-2">After creating, expand the subject below to add topics.</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Subject master ({subjects.filter((s) => !s.archived).length} active{showArchived ? ` · ${subjects.filter((s) => s.archived).length} archived` : ""})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {subjects.map((s) => (
            <SubjectRow key={s.id} subject={s}
              open={!!openIds[s.id]} onToggle={() => toggle(s.id)}
              onRename={(name) => upsertSubject({ ...s, name })}
              onArchive={() => archiveSubject(s.id)}
              onRestore={() => upsertSubject({ ...s, archived: false })}
              onAddTopic={(name) => {
                const tid = "t_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) + "_" + Date.now().toString(36).slice(-4);
                upsertTopic(s.id, { id: tid, name });
              }}
              onRenameTopic={(tid, name) => upsertTopic(s.id, { id: tid, name })}
              onRemoveTopic={(tid) => removeTopic(s.id, tid)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectRow({ subject, open, onToggle, onRename, onArchive, onRestore, onAddTopic, onRenameTopic, onRemoveTopic }: {
  subject: SubjectCatalogEntry;
  open: boolean; onToggle: () => void;
  onRename: (name: string) => void;
  onArchive: () => void;
  onRestore: () => void;
  onAddTopic: (name: string) => void;
  onRenameTopic: (id: string, name: string) => void;
  onRemoveTopic: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [newTopic, setNewTopic] = useState("");

  return (
    <div className={subject.archived ? "opacity-60" : ""}>
      <div className="px-5 py-3 flex items-center gap-3">
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-700">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="text-xl">{subject.icon}</span>
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => { onRename(name); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name); setEditing(false); } }}
            autoFocus
            className="flex-1 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-slate-400 text-sm" />
        ) : (
          <div className="flex-1 font-semibold text-slate-900">{subject.name}</div>
        )}
        <span className="text-xs text-slate-500">{subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}</span>
        {subject.archived && <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">archived</span>}
        <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-700" title="rename">
          <Pencil className="w-4 h-4" />
        </button>
        {subject.archived ? (
          <button onClick={onRestore} className="text-slate-400 hover:text-emerald-700" title="restore">
            <RotateCw className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={onArchive} className="text-slate-400 hover:text-rose-500" title="archive">
            <Archive className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && !subject.archived && (
        <div className="px-5 pb-3 pl-14 space-y-1">
          {subject.topics.map((t) => (
            <TopicRow key={t.id} topic={t}
              onRename={(name) => onRenameTopic(t.id, name)}
              onRemove={() => onRemoveTopic(t.id)} />
          ))}
          <div className="flex gap-2 pt-2">
            <input type="text" placeholder="new topic name" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTopic.trim()) { onAddTopic(newTopic.trim()); setNewTopic(""); } }}
              className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-slate-400 text-sm" />
            <button onClick={() => { if (newTopic.trim()) { onAddTopic(newTopic.trim()); setNewTopic(""); } }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
              Add topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, onRename, onRemove }: {
  topic: { id: string; name: string };
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-50">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
      {editing ? (
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
          onBlur={() => { onRename(name); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onRename(name); setEditing(false); } }}
          className="flex-1 px-2 py-1 rounded border border-slate-200 outline-none focus:border-slate-400 text-sm" />
      ) : (
        <div className="flex-1 text-sm text-slate-800">{topic.name}</div>
      )}
      <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-slate-700" title="rename">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={onRemove} className="text-slate-300 hover:text-rose-500" title="remove">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ==================== Stats tab ==================== */

function StatsTab() {
  const { mentors, students, getStudent, levelInfo, completedDays, subjects } = useAppState();

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
