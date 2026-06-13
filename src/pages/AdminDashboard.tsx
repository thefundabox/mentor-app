import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { BulkImportPanel } from "@/components/BulkImportPanel";
import {
  Users, BookOpen, BarChart3, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, Archive, RotateCw, Layout, Compass, ArrowUp, ArrowDown, HelpCircle, GraduationCap, FileText,
} from "lucide-react";
import type { SubjectCatalogEntry, PlanTemplate, CommitmentScope, TourStep, Question, Batch, Test, TestSection } from "@/types";
import { SCOPE_LABEL } from "@/types";
import { conceptLabel } from "@/data";

export function AdminDashboard() {
  const { adminTab, setAdminTab } = useAppState();
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-slate-600">Admin</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform overview</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        <TabButton active={adminTab === "people"}    onClick={() => setAdminTab("people")}    icon={<Users className="w-4 h-4" />} label="People" />
        <TabButton active={adminTab === "batches"}   onClick={() => setAdminTab("batches")}   icon={<GraduationCap className="w-4 h-4" />} label="Batches" />
        <TabButton active={adminTab === "catalog"}   onClick={() => setAdminTab("catalog")}   icon={<BookOpen className="w-4 h-4" />} label="Subject master" />
        <TabButton active={adminTab === "plans"}     onClick={() => setAdminTab("plans")}     icon={<Layout className="w-4 h-4" />} label="Default plans" />
        <TabButton active={adminTab === "tour"}      onClick={() => setAdminTab("tour")}      icon={<Compass className="w-4 h-4" />} label="Tour steps" />
        <TabButton active={adminTab === "questions"} onClick={() => setAdminTab("questions")} icon={<HelpCircle className="w-4 h-4" />} label="Questions" />
        <TabButton active={adminTab === "tests"}     onClick={() => setAdminTab("tests")}     icon={<FileText className="w-4 h-4" />} label="Tests" />
        <TabButton active={adminTab === "stats"}     onClick={() => setAdminTab("stats")}     icon={<BarChart3 className="w-4 h-4" />} label="Stats" />
      </div>

      {adminTab === "people"    && <PeopleTab />}
      {adminTab === "batches"   && <BatchesTab />}
      {adminTab === "catalog"   && <CatalogTab />}
      {adminTab === "plans"     && <PlansTab />}
      {adminTab === "tour"      && <TourTab />}
      {adminTab === "questions" && <QuestionsTab />}
      {adminTab === "tests"     && <TestsTab />}
      {adminTab === "stats"     && <StatsTab />}
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
  const { mentors, students, addUser, assignStudentToMentor, levelInfo, getStudent, completedDays, batchForStudent } = useAppState();
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
      <BulkImportPanel />

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
                    const batch = batchForStudent(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                            {batch && (
                              <span className="text-[10px] uppercase font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-indigo-50">{batch.name}</span>
                            )}
                          </div>
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


/* ==================== Plans tab ==================== */

function PlansTab() {
  const { planTemplates, upsertPlanTemplate, removePlanTemplate } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = planTemplates.find((t) => t.id === editingId);
  if (editing) {
    return <PlanTemplateEditor template={editing} onDone={() => setEditingId(null)} />;
  }

  const addNew = () => {
    const t: PlanTemplate = {
      id: `tpl_${Date.now()}`,
      name: "New plan",
      blurb: "",
      scope: "week",
      days: [[], [], [], [], [], [], []],
    };
    upsertPlanTemplate(t);
    setEditingId(t.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Students see these as adoptable starting points after the signup assessment.</p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add plan</Button>
      </div>
      {planTemplates.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No default plans yet. Students will only see "Build my own".
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {planTemplates.map((t) => {
          const filled = t.days.filter((d) => d.length > 0).length;
          return (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase font-bold text-indigo-700">{SCOPE_LABEL[t.scope]} plan</div>
                  <div className="font-semibold text-slate-900 truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.days.length} days · {filled} topics</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => removePlanTemplate(t.id)}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t.blurb || <span className="italic text-slate-400">no blurb</span>}</p>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-400 mt-2">
        Tip: building a custom plan chart with drag-and-drop is coming next iteration. For now, edit the metadata here and clone an existing structure as a starting point — students can tweak after adopting.
      </div>
    </div>
  );
}

function PlanTemplateEditor({ template, onDone }: { template: PlanTemplate; onDone: () => void }) {
  const { upsertPlanTemplate, findTopicLive, subjects } = useAppState();
  const [name, setName] = useState(template.name);
  const [blurb, setBlurb] = useState(template.blurb);
  const [scope, setScope] = useState<CommitmentScope>(template.scope);
  const [days, setDays] = useState(template.days);

  const save = () => {
    upsertPlanTemplate({ ...template, name: name.trim() || "Untitled plan", blurb: blurb.trim(), scope, days });
    onDone();
  };

  const setDayCount = (n: number) => {
    const clamped = Math.max(1, Math.min(120, n));
    const next = [...days];
    while (next.length < clamped) next.push([]);
    next.length = clamped;
    setDays(next);
  };

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-800">← back to plans</button>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Blurb</label>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as CommitmentScope)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm">
              <option value="week">Week (7 days)</option>
              <option value="month">Month (30 days)</option>
              <option value="overall">Overall (variable)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Days</label>
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => setDayCount(days.length - 1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">−</button>
              <input type="number" min={1} max={120} value={days.length}
                onChange={(e) => setDayCount(Number(e.target.value) || 1)}
                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-center text-sm" />
              <button onClick={() => setDayCount(days.length + 1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">+</button>
            </div>
          </div>
        </div>
        <Button onClick={save}>Save plan</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Day-by-day topics</h3>
        <p className="text-xs text-slate-500 mb-3">Pick a topic for each day. Topics resolve against the live Subject master, so renames stay in sync.</p>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {days.map((slot, i) => {
            const slotTopic = slot[0];
            const info = slotTopic ? findTopicLive(slotTopic.topicId) : null;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200">
                <div className="w-10 text-center text-xs font-semibold text-slate-500">Day {i + 1}</div>
                <select
                  value={slotTopic?.topicId || ""}
                  onChange={(e) => {
                    const topicId = e.target.value;
                    const next = [...days];
                    if (!topicId) { next[i] = []; setDays(next); return; }
                    const live = findTopicLive(topicId);
                    if (!live) return;
                    next[i] = [{ subjectId: live.subject.id, topicId }];
                    setDays(next);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="">— empty —</option>
                  {subjects.filter((s) => !s.archived).map((s) => (
                    <optgroup key={s.id} label={`${s.icon} ${s.name}`}>
                      {s.topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {info && (
                  <span className="text-xs text-slate-500 hidden sm:inline">{info.subject.name}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ==================== Tour steps tab ==================== */

function TourTab() {
  const { tourSteps, upsertTourStep, removeTourStep, reorderTourSteps } = useAppState();

  const sorted = [...tourSteps].sort((a, b) => a.order - b.order);

  const addStep = () => {
    const t: TourStep = {
      id: `tour_${Date.now()}`,
      order: (sorted[sorted.length - 1]?.order ?? 0) + 10,
      title: "New step",
      body: "Describe what this step shows the student.",
      target: "__center__",
    };
    upsertTourStep(t);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sorted];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    reorderTourSteps(next.map((s) => s.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Steps shown in the Introduction Tour, in order. Target a CSS selector (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">[data-tour="day-path"]</code>) or use <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">__center__</code> for an unanchored centered popover.
        </p>
        <Button onClick={addStep}><Plus className="w-4 h-4" /> Add step</Button>
      </div>

      {sorted.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No tour steps. Students won't see a tour until you add some.
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((step, i) => (
          <TourStepEditor
            key={step.id}
            step={step}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            onChange={(patch) => upsertTourStep({ ...step, ...patch })}
            onRemove={() => removeTourStep(step.id)}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          />
        ))}
      </div>
    </div>
  );
}

function TourStepEditor({
  step, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  step: TourStep;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<TourStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          <button onClick={onMoveUp} disabled={isFirst} className="w-7 h-7 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button onClick={onMoveDown} disabled={isLast} className="w-7 h-7 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Title</label>
              <input value={step.title} onChange={(e) => onChange({ title: e.target.value })}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Screen (auto-route to)</label>
              <select value={step.screen ?? ""} onChange={(e) => onChange({ screen: (e.target.value || undefined) as TourStep["screen"] })}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm">
                <option value="">— current screen —</option>
                <option value="home">Student home</option>
                <option value="topic">Topic screen</option>
                <option value="onboarding">Onboarding</option>
                <option value="approval_gate">Approval gate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Body</label>
            <textarea value={step.body} onChange={(e) => onChange({ body: e.target.value })} rows={2}
              className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Target selector</label>
              <input value={step.target} onChange={(e) => onChange({ target: e.target.value })}
                placeholder='[data-tour="..."] or __center__'
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Side</label>
              <select value={step.side ?? ""} onChange={(e) => onChange({ side: (e.target.value || undefined) as TourStep["side"] })}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm">
                <option value="">— auto —</option>
                <option value="top">top</option>
                <option value="right">right</option>
                <option value="bottom">bottom</option>
                <option value="left">left</option>
                <option value="over">over</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Align</label>
              <select value={step.align ?? ""} onChange={(e) => onChange({ align: (e.target.value || undefined) as TourStep["align"] })}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm">
                <option value="">— auto —</option>
                <option value="start">start</option>
                <option value="center">center</option>
                <option value="end">end</option>
              </select>
            </div>
          </div>
        </div>

        <button onClick={onRemove} className="p-1 text-slate-400 hover:text-rose-600 transition"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ==================== Questions tab ==================== */

function QuestionsTab() {
  const [sub, setSub] = useState<"quiz" | "foundation" | "placement">("quiz");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-100 pb-3">
        <SubTabButton active={sub === "quiz"}       label="Quiz pool"   onClick={() => setSub("quiz")} />
        <SubTabButton active={sub === "foundation"} label="Foundation" onClick={() => setSub("foundation")} />
        <SubTabButton active={sub === "placement"}  label="Placement"  onClick={() => setSub("placement")} />
      </div>

      {sub === "quiz"       && <QuizPoolEditor />}
      {sub === "foundation" && <FoundationPoolEditor />}
      {sub === "placement"  && <PlacementPoolEditor />}
    </div>
  );
}

function SubTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}>{label}</button>
  );
}

function QuizPoolEditor() {
  const { quizPool, upsertQuizQuestion, addQuizQuestion, removeQuizQuestion } = useAppState();

  const addNew = () => {
    addQuizQuestion({
      type: "conceptual",
      concept: "",
      q: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Pool of {quizPool.length} questions used to build a quiz attempt. 8 conceptual + 8 analytical are sampled per attempt.
        </p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add question</Button>
      </div>
      {quizPool.map((q, idx) => (
        <QuestionCard
          key={idx}
          q={q}
          onChange={(patch) => upsertQuizQuestion(idx, { ...q, ...patch })}
          onRemove={() => removeQuizQuestion(idx)}
          showType
        />
      ))}
      {quizPool.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No quiz questions. Quizzes will be empty until you add some.
        </div>
      )}
    </div>
  );
}

function FoundationPoolEditor() {
  const { foundationPool, upsertFoundationQuestion, addFoundationQuestion, removeFoundationQuestion } = useAppState();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newConcept, setNewConcept] = useState("");

  const concepts = Object.keys(foundationPool).sort();

  const addConceptBucket = () => {
    const slug = newConcept.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug || foundationPool[slug]) return;
    addFoundationQuestion(slug, {
      type: "conceptual",
      concept: slug,
      q: "New foundation question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
    setExpanded((prev) => ({ ...prev, [slug]: true }));
    setNewConcept("");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Foundation questions are shown as remediation when a student misses a main quiz question. Grouped by concept tag.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="text-xs font-bold uppercase text-slate-500 mb-2">Add concept bucket</div>
        <div className="flex gap-2">
          <input value={newConcept} onChange={(e) => setNewConcept(e.target.value)}
            placeholder="concept-tag (e.g. mughal-expansion)"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          <Button onClick={addConceptBucket} disabled={!newConcept.trim()}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      </div>

      {concepts.map((concept) => {
        const list = foundationPool[concept] || [];
        const isOpen = !!expanded[concept];
        return (
          <div key={concept} className="bg-white border border-slate-200 rounded-2xl">
            <button onClick={() => setExpanded((prev) => ({ ...prev, [concept]: !isOpen }))}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 rounded-2xl transition">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                <span className="font-semibold text-slate-900">{conceptLabel(concept)}</span>
                <span className="text-xs text-slate-500">{list.length} question{list.length === 1 ? "" : "s"}</span>
              </div>
              <code className="text-xs text-slate-400">{concept}</code>
            </button>
            {isOpen && (
              <div className="p-4 pt-0 space-y-3">
                {list.map((q, idx) => (
                  <QuestionCard
                    key={idx}
                    q={q}
                    onChange={(patch) => upsertFoundationQuestion(concept, idx, { ...q, ...patch, concept })}
                    onRemove={() => removeFoundationQuestion(concept, idx)}
                  />
                ))}
                <Button variant="secondary" onClick={() => addFoundationQuestion(concept, {
                  type: "conceptual", concept, q: "New question", options: ["A", "B", "C", "D"], correct: 0, why: "",
                })}>
                  <Plus className="w-4 h-4" /> Add foundation question
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {concepts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No foundation questions. Wrong answers won't trigger remediation.
        </div>
      )}
    </div>
  );
}

function PlacementPoolEditor() {
  const { placementPool, upsertPlacementQuestion, addPlacementQuestion, removePlacementQuestion } = useAppState();

  const addNew = () => {
    addPlacementQuestion({
      type: "conceptual",
      concept: "",
      q: "New placement question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
      why: "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {placementPool.length} placement question{placementPool.length === 1 ? "" : "s"} shown during signup assessment. Keep this short — under 5 is ideal.
        </p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add question</Button>
      </div>
      {placementPool.map((q, idx) => (
        <QuestionCard
          key={idx}
          q={q}
          onChange={(patch) => upsertPlacementQuestion(idx, { ...q, ...patch })}
          onRemove={() => removePlacementQuestion(idx)}
        />
      ))}
      {placementPool.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No placement questions. The signup assessment will skip the placement check.
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q, onChange, onRemove, showType = false,
}: {
  q: Question;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
  showType?: boolean;
}) {
  const updateOption = (k: number, value: string) => {
    const next = [...q.options];
    next[k] = value;
    onChange({ options: next });
  };
  const addOption = () => onChange({ options: [...q.options, "New option"] });
  const removeOption = (k: number) => {
    if (q.options.length <= 2) return;
    const next = q.options.filter((_, i) => i !== k);
    onChange({ options: next, correct: q.correct >= next.length ? 0 : q.correct });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Question</label>
              <textarea value={q.q} onChange={(e) => onChange({ q: e.target.value })} rows={2}
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Concept tag</label>
              <input value={q.concept} onChange={(e) => onChange({ concept: e.target.value })}
                placeholder="e.g. mughal-expansion"
                className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm font-mono" />
            </div>
            {showType && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Type</label>
                <select value={q.type} onChange={(e) => onChange({ type: e.target.value as Question["type"] })}
                  className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm">
                  <option value="conceptual">Conceptual</option>
                  <option value="analytical">Analytical</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Options · pick the correct one</label>
            <div className="mt-0.5 space-y-1.5">
              {q.options.map((opt, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${q.q}-${k}`} checked={q.correct === k}
                    onChange={() => onChange({ correct: k })} className="accent-emerald-600" />
                  <span className="w-5 text-xs font-bold text-slate-500">{String.fromCharCode(65 + k)}.</span>
                  <input value={opt} onChange={(e) => updateOption(k, e.target.value)}
                    className="flex-1 px-3 py-1 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm" />
                  <button onClick={() => removeOption(k)} disabled={q.options.length <= 2}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addOption} className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <Plus className="w-3 h-3" /> add option
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Why (explanation)</label>
            <textarea value={q.why} onChange={(e) => onChange({ why: e.target.value })} rows={2}
              className="mt-0.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
          </div>
        </div>

        <button onClick={onRemove} className="p-1 text-slate-400 hover:text-rose-600 transition self-start">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ==================== Batches tab ==================== */

function BatchesTab() {
  const { batches, upsertBatch, archiveBatch, unarchiveBatch, mentors, batchStudents, planTemplates, assignStudentToBatch, students } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const editing = batches.find((b) => b.id === editingId);
  if (editing) {
    return <BatchEditor
      batch={editing}
      onDone={() => setEditingId(null)}
      mentors={mentors}
      planTemplates={planTemplates}
      students={students.filter((s) => !s.batchId || s.batchId === editing.id)}
      enrolled={batchStudents(editing.id)}
      onUpsert={upsertBatch}
      onAssign={assignStudentToBatch}
    />;
  }

  const addNew = () => {
    const id = `batch_${Date.now()}`;
    const b: Batch = {
      id,
      name: "New batch",
      vertical: "RAS",
      startDate: Date.now(),
      mentorIds: [],
      createdAt: Date.now(),
    };
    upsertBatch(b);
    setEditingId(id);
  };

  const visible = batches.filter((b) => showArchived || !b.archived);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-500">
          Cohorts/batches within the institute. Each student is enrolled in one batch; mentors are assigned to one or more.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <Button onClick={addNew}><Plus className="w-4 h-4" /> Add batch</Button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No batches{showArchived ? "" : " (any archived ones are hidden)"}. Add one to start grouping students.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((b) => {
          const enrolled = batchStudents(b.id);
          const batchMentors = mentors.filter((m) => b.mentorIds.includes(m.id));
          return (
            <div key={b.id} className={`bg-white border rounded-2xl p-5 ${b.archived ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 truncate">{b.name}</h4>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{b.vertical}</span>
                    {b.archived && <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 rounded px-2 py-0.5">Archived</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Starts {new Date(b.startDate).toLocaleDateString()}
                    {b.endDate && <> · ends {new Date(b.endDate).toLocaleDateString()}</>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(b.id)}><Pencil className="w-4 h-4" /></Button>
                  {b.archived
                    ? <Button variant="ghost" size="sm" onClick={() => unarchiveBatch(b.id)}><RotateCw className="w-4 h-4" /></Button>
                    : <Button variant="ghost" size="sm" onClick={() => archiveBatch(b.id)}><Archive className="w-4 h-4 text-slate-500" /></Button>}
                </div>
              </div>
              {b.description && <p className="text-sm text-slate-600 mb-3">{b.description}</p>}
              <div className="flex gap-4 text-xs">
                <div><strong className="text-slate-900">{enrolled.length}</strong> <span className="text-slate-500">student{enrolled.length === 1 ? "" : "s"}</span></div>
                <div><strong className="text-slate-900">{batchMentors.length}</strong> <span className="text-slate-500">mentor{batchMentors.length === 1 ? "" : "s"}</span></div>
              </div>
              {batchMentors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {batchMentors.map((m) => (
                    <span key={m.id} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">{m.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatchEditor({
  batch, onDone, mentors, planTemplates, students, enrolled, onUpsert, onAssign,
}: {
  batch: Batch;
  onDone: () => void;
  mentors: { id: string; name: string }[];
  planTemplates: PlanTemplate[];
  students: { id: string; name: string; email: string; batchId?: string }[];
  enrolled: { id: string; name: string; email: string }[];
  onUpsert: (b: Batch) => void;
  onAssign: (studentId: string, batchId: string | null) => void;
}) {
  const [name, setName] = useState(batch.name);
  const [vertical, setVertical] = useState(batch.vertical);
  const [description, setDescription] = useState(batch.description || "");
  const [startDate, setStartDate] = useState(
    new Date(batch.startDate).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    batch.endDate ? new Date(batch.endDate).toISOString().slice(0, 10) : ""
  );
  const [mentorIds, setMentorIds] = useState<string[]>(batch.mentorIds);
  const [defaultPlanTemplateId, setDefaultPlanTemplateId] = useState(batch.defaultPlanTemplateId || "");

  const save = () => {
    onUpsert({
      ...batch,
      name: name.trim() || "Untitled batch",
      vertical: vertical.trim() || "—",
      description: description.trim() || undefined,
      startDate: startDate ? new Date(startDate).getTime() : batch.startDate,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
      mentorIds,
      defaultPlanTemplateId: defaultPlanTemplateId || undefined,
    });
    onDone();
  };

  const toggleMentor = (mentorId: string) => {
    setMentorIds((prev) => prev.includes(mentorId) ? prev.filter((id) => id !== mentorId) : [...prev, mentorId]);
  };

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-800">← back to all batches</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Vertical / exam</label>
            <input value={vertical} onChange={(e) => setVertical(e.target.value)}
              placeholder="RAS / UPSC / Banking…"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="What this batch is about. Shown to students."
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">End date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Suggested plan template</label>
            <select value={defaultPlanTemplateId} onChange={(e) => setDefaultPlanTemplateId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm">
              <option value="">— none —</option>
              {planTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Assigned mentors</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {mentors.map((m) => (
              <button key={m.id} onClick={() => toggleMentor(m.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${
                  mentorIds.includes(m.id)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}>
                {m.name}
              </button>
            ))}
            {mentors.length === 0 && <span className="text-xs text-slate-400">No mentors. Add one from the People tab first.</span>}
          </div>
        </div>

        <Button onClick={save}>Save batch</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 mb-2">Enrolled students ({enrolled.length})</h3>
        <p className="text-xs text-slate-500 mb-3">
          Pick from your existing student list. Students can only be in one batch at a time — moving here removes them from any other batch.
        </p>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {students.map((s) => {
            const isIn = s.batchId === batch.id;
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <div className="text-sm">
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  <span className="text-slate-500"> · {s.email}</span>
                </div>
                <button
                  onClick={() => onAssign(s.id, isIn ? null : batch.id)}
                  className={`text-xs font-medium px-2 py-1 rounded transition ${
                    isIn
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}>
                  {isIn ? "✓ Enrolled · remove" : "Enroll"}
                </button>
              </div>
            );
          })}
          {students.length === 0 && (
            <div className="text-sm text-slate-500 py-4 text-center">No students available to enroll.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Tests tab ==================== */

function TestsTab() {
  const { tests, upsertTest, archiveTest, unarchiveTest, removeTest } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const editing = tests.find((t) => t.id === editingId);
  if (editing) {
    return <TestEditor test={editing} onDone={() => setEditingId(null)} onUpsert={upsertTest} />;
  }

  const addNew = () => {
    const id = `test_${Date.now().toString(36)}`;
    const t: Test = {
      id,
      title: "New test",
      type: "sectional",
      durationMins: 30,
      sections: [
        { id: `sec_${Date.now().toString(36)}`, name: "Section 1", subjectIds: [], questionCount: 10, marksPerQuestion: 1, negativeMarks: 0 },
      ],
      createdAt: Date.now(),
    };
    upsertTest(t);
    setEditingId(id);
  };

  const visible = tests.filter((t) => showArchived || !t.archived);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-slate-500">
          Mock tests, sectional tests, and custom tests. Students take these from their dashboard (wiring lands in next PR).
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived((v) => !v)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <Button onClick={addNew}><Plus className="w-4 h-4" /> Add test</Button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No tests yet. Add one to get started.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((t) => {
          const totalQs = t.sections.reduce((n, s) => n + s.questionCount, 0);
          const totalMarks = t.sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);
          return (
            <div key={t.id} className={`bg-white border rounded-2xl p-5 ${t.archived ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 truncate">{t.title}</h4>
                    <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5">{t.type}</span>
                    {t.archived && <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-600 rounded px-2 py-0.5">Archived</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {totalQs} q · {totalMarks} marks · {t.durationMins} min · {t.sections.length} section{t.sections.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}><Pencil className="w-4 h-4" /></Button>
                  {t.archived
                    ? <Button variant="ghost" size="sm" onClick={() => unarchiveTest(t.id)}><RotateCw className="w-4 h-4" /></Button>
                    : <Button variant="ghost" size="sm" onClick={() => archiveTest(t.id)}><Archive className="w-4 h-4 text-slate-500" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${t.title}" and all its attempts?`)) removeTest(t.id); }}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>
              {t.description && <p className="text-sm text-slate-600">{t.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestEditor({ test, onDone, onUpsert }: {
  test: Test;
  onDone: () => void;
  onUpsert: (t: Test) => void;
}) {
  const { subjects } = useAppState();
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description || "");
  const [type, setType] = useState<Test["type"]>(test.type);
  const [durationMins, setDurationMins] = useState(test.durationMins);
  const [sections, setSections] = useState<TestSection[]>(test.sections);

  const totalQs = sections.reduce((n, s) => n + s.questionCount, 0);
  const totalMarks = sections.reduce((n, s) => n + s.questionCount * s.marksPerQuestion, 0);

  const save = () => {
    onUpsert({
      ...test,
      title: title.trim() || "Untitled test",
      description: description.trim() || undefined,
      type,
      durationMins: Math.max(1, durationMins || 1),
      sections: sections.map((s) => ({
        ...s,
        name: s.name.trim() || "Section",
        questionCount: Math.max(1, s.questionCount || 1),
        marksPerQuestion: Math.max(0, s.marksPerQuestion || 0),
        negativeMarks: Math.max(0, s.negativeMarks || 0),
      })),
    });
    onDone();
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec_${Date.now().toString(36)}_${prev.length}`,
        name: `Section ${prev.length + 1}`,
        subjectIds: [],
        questionCount: 10,
        marksPerQuestion: 1,
        negativeMarks: 0,
      },
    ]);
  };

  const updateSection = (idx: number, patch: Partial<TestSection>) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-800">← back to tests</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as Test["type"])}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm">
              <option value="sectional">Sectional</option>
              <option value="full-length">Full-length mock</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Duration (min)</label>
            <input type="number" min={1} max={600} value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value) || 1)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Summary</label>
            <div className="mt-1 px-3 py-2 rounded-xl bg-slate-50 text-sm text-slate-700">
              {totalQs} q · {totalMarks} marks
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Sections ({sections.length})</h3>
          <Button onClick={addSection}><Plus className="w-4 h-4" /> Add section</Button>
        </div>
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={sec.id} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
                    <input value={sec.name}
                      onChange={(e) => updateSection(idx, { name: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Questions</label>
                    <input type="number" min={1} max={500} value={sec.questionCount}
                      onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) || 1 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Marks/Q</label>
                    <input type="number" min={0} step={0.25} value={sec.marksPerQuestion}
                      onChange={(e) => updateSection(idx, { marksPerQuestion: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Neg. marks</label>
                    <input type="number" min={0} step={0.05} value={sec.negativeMarks}
                      onChange={(e) => updateSection(idx, { negativeMarks: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
                  </div>
                </div>
                <button onClick={() => removeSection(idx)} disabled={sections.length === 1}
                  className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Subjects (empty = any)</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {subjects.filter((s) => !s.archived).map((s) => {
                    const active = sec.subjectIds.includes(s.id);
                    return (
                      <button key={s.id}
                        onClick={() => {
                          const next = active
                            ? sec.subjectIds.filter((id) => id !== s.id)
                            : [...sec.subjectIds, s.id];
                          updateSection(idx, { subjectIds: next });
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                          active
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}>
                        {s.icon} {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save}>Save test</Button>
    </div>
  );
}
