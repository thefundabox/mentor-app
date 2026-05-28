import { useMemo, useState } from "react";
import {
  DndContext, type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, GripVertical, Send, AlertCircle, X,
  Calendar, CalendarDays, CalendarRange, Search, ChevronRight, ChevronDown,
} from "lucide-react";
import type { DaySlot, CommitmentScope, SubjectCatalogEntry } from "@/types";
import { SCOPE_DAYS } from "@/types";

interface OnboardingProps {
  studentId: string;
  byMentor?: boolean;
}

/** Default size for "Overall" plans on first commitment. */
const OVERALL_DEFAULT = 30;
const OVERALL_MIN = 7;
const OVERALL_MAX = 120;

export function Onboarding({ studentId, byMentor = false }: OnboardingProps) {
  const { getStudent, setChart, submitChartForApproval, approveChart, setRoute, setViewingStudentId, subjects, findTopicLive } = useAppState();
  const student = getStudent(studentId);
  const currentChart = student.chart;
  const isResubmit = currentChart.status === "changes_requested";

  // Starting scope: keep what's saved, default to week.
  const [scope, setScope] = useState<CommitmentScope>(currentChart.commitmentScope || "week");
  const [overallDays, setOverallDays] = useState<number>(
    currentChart.commitmentScope === "overall" && currentChart.days.length > 0
      ? currentChart.days.length
      : OVERALL_DEFAULT
  );

  // Effective window the student is planning right now.
  const sliceSize = scope === "overall" ? overallDays : SCOPE_DAYS[scope];
  // We always edit days starting at approvedThrough + 1 (the next slice).
  const startOffset = currentChart.approvedThrough; // 0-based offset into chart.days

  function getSliceDays(): DaySlot[][] {
    const out: DaySlot[][] = [];
    for (let i = 0; i < sliceSize; i++) {
      out.push(currentChart.days[startOffset + i] ? [...currentChart.days[startOffset + i]] : []);
    }
    return out;
  }
  const sliceDays = getSliceDays();

  const [activeDrag, setActiveDrag] = useState<{
    subjectId: string; topicId: string; topicName: string; subjectName: string; icon: string; color: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  /** Write the slice back into chart.days. Always preserves already-approved days. */
  function writeSlice(slice: DaySlot[][]) {
    const approved = currentChart.days.slice(0, startOffset);
    const newDays = [...approved, ...slice];
    setChart(studentId, { ...currentChart, days: newDays, commitmentScope: scope, status: "draft" });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(event.active.data.current as typeof activeDrag);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;
    const dragData = active.data.current as { subjectId: string; topicId: string; _wholeSubject?: boolean };
    const overId = over.id as string;
    if (!overId.startsWith("day-")) return;
    const i = parseInt(overId.replace("day-", ""));
    const next = [...sliceDays];

    if (dragData._wholeSubject) {
      const subject = subjects.find((s) => s.id === dragData.subjectId);
      if (!subject || subject.archived) return;
      let idx = i;
      for (const t of subject.topics) {
        if (idx >= sliceSize) break;
        next[idx] = [{ subjectId: subject.id, topicId: t.id }];
        idx++;
      }
    } else {
      if (!next[i].some((t) => t.topicId === dragData.topicId)) {
        next[i] = [...next[i], { subjectId: dragData.subjectId, topicId: dragData.topicId }];
      }
    }
    writeSlice(next);
  }

  function removeTopic(dayIdx: number, topicId: string) {
    const next = [...sliceDays];
    next[dayIdx] = next[dayIdx].filter((t) => t.topicId !== topicId);
    writeSlice(next);
  }

  function autoFillSubject(subj: SubjectCatalogEntry) {
    const next = [...sliceDays];
    let i = next.findIndex((slot) => slot.length === 0);
    for (const t of subj.topics) {
      if (i < 0 || i >= sliceSize) break;
      next[i] = [{ subjectId: subj.id, topicId: t.id }];
      i = next.findIndex((slot, k) => k > i && slot.length === 0);
    }
    writeSlice(next);
  }

  const filled = sliceDays.filter((d) => d.length > 0).length;
  const startDayNum = startOffset + 1;
  const endDayNum = startOffset + sliceSize;

  const handleSubmit = () => {
    if (byMentor) {
      // Mentor edits the slice and approves it.
      const finalChart = { ...currentChart, commitmentScope: scope, status: "approved" as const, decidedAt: Date.now() };
      // Ensure committedThrough covers what was planned.
      finalChart.committedThrough = Math.max(finalChart.committedThrough, currentChart.days.length);
      setChart(studentId, finalChart);
      approveChart(studentId);
      setViewingStudentId(studentId);
      setRoute("mentor_student");
    } else {
      // Persist the chart at the current scope, then submit slice for approval.
      setChart(studentId, { ...currentChart, commitmentScope: scope, status: "draft" });
      submitChartForApproval(studentId, scope);
      setRoute("approval_gate");
    }
  };

  const isFirstCommitment = currentChart.approvedThrough === 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600 mb-1">
          {byMentor ? "Editing chart for student"
            : isResubmit ? "Update your plan"
            : isFirstCommitment ? "Onboarding"
            : `Plan Day ${startDayNum}–${endDayNum}`}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {byMentor ? "Mentor edit"
            : isResubmit ? "Address mentor feedback"
            : isFirstCommitment ? "Build your prep chart"
            : "Commit your next slice"}
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Choose how big a slice to commit, then drag topics into the days.
          {byMentor ? " You'll approve on save." : " Your mentor will approve before you start."}
        </p>

        {isResubmit && currentChart.feedback && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2 items-start max-w-2xl">
            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800">Mentor feedback</div>
              <div className="text-sm text-amber-900 mt-0.5">{currentChart.feedback}</div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Commitment scope (now at top, drives day count) */}
      {!byMentor && (
        <div className="mb-6 p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30">
          <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">1 · Commitment scope</div>
          <p className="text-sm text-slate-600 mb-3">
            How much do you want to commit at once? You can re-commit the next slice after clearing this one.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ScopeButton active={scope === "week"} onClick={() => setScope("week")}
              icon={<Calendar className="w-4 h-4" />} label="Week" sub="7 days" />
            <ScopeButton active={scope === "month"} onClick={() => setScope("month")}
              icon={<CalendarDays className="w-4 h-4" />} label="Month" sub="30 days" />
            <ScopeButton active={scope === "overall"} onClick={() => setScope("overall")}
              icon={<CalendarRange className="w-4 h-4" />} label="Overall" sub={`${overallDays} days`} />
          </div>
          {scope === "overall" && (
            <div className="mt-3 flex items-center gap-3">
              <div className="text-xs uppercase font-bold text-indigo-700">Days</div>
              <button onClick={() => setOverallDays(Math.max(OVERALL_MIN, overallDays - 5))} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">−</button>
              <input type="range" min={OVERALL_MIN} max={OVERALL_MAX} step={1} value={overallDays}
                onChange={(e) => setOverallDays(parseInt(e.target.value))} className="flex-1" />
              <button onClick={() => setOverallDays(Math.min(OVERALL_MAX, overallDays + 5))} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">+</button>
              <div className="w-12 text-center font-semibold">{overallDays}</div>
            </div>
          )}
          <div className="mt-3 text-xs text-slate-600">
            {currentChart.approvedThrough > 0 && (
              <span className="text-emerald-700 font-semibold">Already approved through Day {currentChart.approvedThrough}. </span>
            )}
            Planning <strong>Day {startDayNum}–{endDayNum}</strong> ({sliceSize} day{sliceSize === 1 ? "" : "s"}).
          </div>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          {/* 2. Subject library */}
          <SubjectLibrary
            subjects={subjects.filter((s) => !s.archived)}
            onAutoFill={autoFillSubject}
            filled={filled}
            total={sliceSize}
          />

          {/* 3. Timeline (size = scope) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                Your {sliceSize}-day plan
              </h2>
              {currentChart.approvedThrough > 0 && !byMentor && (
                <div className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                  ↑ Day 1–{currentChart.approvedThrough} previously approved
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {sliceDays.map((topics, i) => (
                <DroppableDaySlot
                  key={i}
                  index={i}
                  dayLabel={startOffset + i + 1}
                  topics={topics}
                  findTopicLive={findTopicLive}
                  onRemove={(tid) => removeTopic(i, tid)}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="bg-white rounded-xl border-2 border-indigo-300 shadow-lg px-4 py-3 flex items-center gap-3 opacity-90">
              <span className="text-xl">{activeDrag.icon}</span>
              <div>
                <div className="text-xs text-slate-500">{activeDrag.subjectName}</div>
                <div className="font-semibold text-slate-900 text-sm">{activeDrag.topicName}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-8 flex justify-end gap-3">
        <Button disabled={filled === 0} onClick={handleSubmit}>
          {byMentor ? (
            <>Save &amp; approve <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>
              {isResubmit ? "Resubmit" : "Submit"} {scope === "week" ? "week plan" : scope === "month" ? "month plan" : "overall plan"}
              <Send className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* -------------------- Scope button -------------------- */

function ScopeButton({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string;
}) {
  return (
    <button onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
        active ? "border-indigo-500 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300"
      }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </button>
  );
}

/* -------------------- Subject library (collapsible + searchable) -------------------- */

function SubjectLibrary({
  subjects, onAutoFill, filled, total,
}: {
  subjects: SubjectCatalogEntry[];
  onAutoFill: (s: SubjectCatalogEntry) => void;
  filled: number;
  total: number;
}) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return subjects.map((s) => ({ subject: s, matchedTopics: null as null | typeof s.topics }));
    return subjects.flatMap((s) => {
      const subjectMatches = s.name.toLowerCase().includes(q);
      const topicMatches = s.topics.filter((t) => t.name.toLowerCase().includes(q));
      if (!subjectMatches && topicMatches.length === 0) return [];
      return [{ subject: s, matchedTopics: subjectMatches && !topicMatches.length ? null : topicMatches }];
    });
  }, [subjects, q]);

  const isOpen = (id: string) => q ? true : !!openIds[id];
  const toggle = (id: string) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Subject library</h2>
        <div className="text-xs text-slate-500">{filled}/{total} days filled</div>
      </div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects & topics…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
        />
      </div>
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-sm text-slate-500 py-6 text-center">No subjects or topics match "{query}".</div>
        )}
        {filtered.map(({ subject, matchedTopics }) => {
          const open = isOpen(subject.id);
          const visibleTopics = matchedTopics ?? subject.topics;
          return (
            <div key={subject.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className={`flex items-center justify-between gap-2 px-3 py-2.5 bg-${subject.color}-50`}>
                <button onClick={() => toggle(subject.id)} className="flex items-center gap-2 flex-1 text-left">
                  {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <DraggableSubjectHeader subject={subject} />
                </button>
                <button
                  onClick={() => onAutoFill(subject)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition flex-shrink-0"
                >
                  auto-fill
                </button>
              </div>
              {open && (
                <div className="p-1.5 grid grid-cols-1 gap-0.5 bg-white">
                  {visibleTopics.map((t) => (
                    <DraggableTopic key={t.id} subject={subject} topic={t} highlight={q && t.name.toLowerCase().includes(q)} />
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

/* -------------------- Draggables -------------------- */

function DraggableSubjectHeader({ subject }: { subject: SubjectCatalogEntry }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subject-${subject.id}`,
    data: {
      subjectId: subject.id, topicId: subject.topics[0]?.id, topicName: subject.name,
      subjectName: subject.name, icon: subject.icon, color: subject.color, _wholeSubject: true,
    },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center gap-2 select-none cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}>
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="text-xl">{subject.icon}</span>
      <span className={`font-semibold text-${subject.color}-900 text-sm`}>{subject.name}</span>
      <span className="text-xs text-slate-500">({subject.topics.length})</span>
    </div>
  );
}

function DraggableTopic({ subject, topic, highlight }: { subject: SubjectCatalogEntry; topic: { id: string; name: string }; highlight?: boolean | "" }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `topic-${subject.id}-${topic.id}`,
    data: { subjectId: subject.id, topicId: topic.id, topicName: topic.name, subjectName: subject.name, icon: subject.icon, color: subject.color },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`text-sm px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-2 select-none transition ${
        isDragging ? "opacity-50" : highlight ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"
      }`}>
      <GripVertical className="w-3 h-3 text-slate-300" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
      <span className="text-slate-700">{topic.name}</span>
    </div>
  );
}

/* -------------------- Droppable day slot -------------------- */

function DroppableDaySlot({
  index, dayLabel, topics, findTopicLive, onRemove,
}: {
  index: number;
  dayLabel: number;
  topics: DaySlot[];
  findTopicLive: (topicId: string) => { subject: SubjectCatalogEntry; topic: { id: string; name: string } } | null;
  onRemove: (topicId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${index}` });
  const hasMulti = topics.length > 1;
  return (
    <div ref={setNodeRef}
      className={`group rounded-xl border-2 border-dashed transition ${
        topics.length > 0
          ? isOver ? "border-indigo-400 bg-indigo-50/30 shadow-sm" : "border-transparent bg-white shadow-sm"
          : isOver ? "border-indigo-400 bg-indigo-50/50"
                   : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}>
      <div className="flex items-stretch gap-3 p-3">
        <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center text-xs font-semibold text-slate-500">
          Day
          <span className="text-slate-900 text-base">{dayLabel}</span>
          {hasMulti && (
            <span className="mt-1 text-[10px] uppercase font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
              ×{topics.length}
            </span>
          )}
        </div>
        {topics.length > 0 ? (
          <div className="flex-1 space-y-1.5 min-w-0">
            {topics.map((t) => {
              const info = findTopicLive(t.topicId);
              if (!info) return (
                <div key={t.topicId} className="text-xs italic text-slate-400 px-3 py-2">
                  topic removed by admin
                </div>
              );
              return (
                <div key={t.topicId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">{info.subject.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 truncate">{info.subject.name}</div>
                      <div className="text-sm font-semibold text-slate-900 truncate">{info.topic.name}</div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(t.topicId)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition flex-shrink-0" title="remove">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center text-slate-400 text-sm italic">Drop a topic here (or stack several)</div>
        )}
      </div>
    </div>
  );
}
