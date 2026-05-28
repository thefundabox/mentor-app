import { useState } from "react";
import {
  DndContext, type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useAppState } from "@/hooks/useAppState";
import { SUBJECTS, findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { ArrowRight, GripVertical, Send, AlertCircle, X, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import type { DaySlot, ChartState, CommitmentScope } from "@/types";
import { SCOPE_DAYS } from "@/types";

interface OnboardingProps {
  studentId: string;
  byMentor?: boolean;
}

export function Onboarding({ studentId, byMentor = false }: OnboardingProps) {
  const { getStudent, setChart, submitChartForApproval, approveChart, setRoute, setViewingStudentId } = useAppState();
  const student = getStudent(studentId);
  const currentChart = student.chart;
  const isResubmit = currentChart.status === "changes_requested";

  const [days, setDays] = useState(
    Math.max(currentChart.days.length || 15, 15)
  );
  const [scope, setScope] = useState<CommitmentScope>(currentChart.commitmentScope || "week");
  const [activeDrag, setActiveDrag] = useState<{
    subjectId: string; topicId: string; topicName: string; subjectName: string; icon: string; color: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function ensureDays(n: number): DaySlot[][] {
    const next = currentChart.days.map((arr) => [...arr]);
    while (next.length < n) next.push([]);
    return next.slice(0, n);
  }

  function writeChart(days: DaySlot[][], status?: ChartState["status"]) {
    setChart(studentId, { ...currentChart, days, status: status ?? "draft" });
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

    if (dragData._wholeSubject) {
      const startIdx = parseInt(overId.replace("day-", ""));
      const subject = SUBJECTS.find((s) => s.id === dragData.subjectId);
      if (!subject) return;
      const next = ensureDays(days);
      let idx = startIdx;
      for (const t of subject.topics) {
        if (idx >= days) break;
        // each day in auto-fill mode lands one topic per slot
        next[idx] = [{ subjectId: subject.id, topicId: t.id }];
        idx++;
      }
      writeChart(next);
    } else {
      const dayIdx = parseInt(overId.replace("day-", ""));
      const next = ensureDays(days);
      // avoid duplicate of same topic in same day
      if (!next[dayIdx].some((t) => t.topicId === dragData.topicId)) {
        next[dayIdx] = [...next[dayIdx], { subjectId: dragData.subjectId, topicId: dragData.topicId }];
      }
      writeChart(next);
    }
  }

  function removeTopic(dayIdx: number, topicId: string) {
    const next = ensureDays(days);
    next[dayIdx] = next[dayIdx].filter((t) => t.topicId !== topicId);
    writeChart(next);
  }

  function autoFillSubject(subj: (typeof SUBJECTS)[0]) {
    const next = ensureDays(days);
    // place each topic in the first empty day
    let i = next.findIndex((slot) => slot.length === 0);
    for (const t of subj.topics) {
      if (i < 0 || i >= days) break;
      next[i] = [{ subjectId: subj.id, topicId: t.id }];
      i = next.findIndex((slot, k) => k > i && slot.length === 0);
    }
    writeChart(next);
  }

  function adjustDays(delta: number) {
    const newDays = Math.max(5, days + delta);
    setDays(newDays);
    writeChart(ensureDays(newDays));
  }

  const filled = ensureDays(days).filter((d) => d.length > 0).length;

  const handleSubmit = () => {
    if (byMentor) {
      const finalDays = ensureDays(days);
      setChart(studentId, {
        ...currentChart, days: finalDays, status: "approved",
        commitmentScope: scope, committedThrough: finalDays.length, approvedThrough: finalDays.length,
        decidedAt: Date.now(),
      });
      approveChart(studentId);
      setViewingStudentId(studentId);
      setRoute("mentor_student");
    } else {
      // Persist current scope choice on the chart, then submit.
      setChart(studentId, { ...currentChart, days: ensureDays(days), commitmentScope: scope, status: "draft" });
      submitChartForApproval(studentId, scope);
      setRoute("approval_gate");
    }
  };

  // Preview what slice will be submitted.
  const submitFrom = currentChart.approvedThrough + 1;
  const submitTo = Math.min(filledOrDays(), currentChart.approvedThrough + SCOPE_DAYS[scope]);

  function filledOrDays() {
    return Math.min(ensureDays(days).length, days);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600 mb-1">
          {byMentor ? `Editing chart for student` : isResubmit ? "Update your plan" : "Step 1 of 1 · Onboarding"}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {byMentor ? "Mentor edit" : isResubmit ? "Address mentor feedback" : "Build your prep chart"}
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Drag any subject or topic into a day. <strong>You can stack multiple topics into the same day</strong> —
          you'll need to clear each topic's quiz to unlock the next day.
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Subject library</h2>
              <div className="text-xs text-slate-500">{filled}/{days} days filled</div>
            </div>
            <div className="space-y-4">
              {SUBJECTS.map((s) => (
                <div key={s.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between gap-2 px-4 py-3 bg-${s.color}-50`}>
                    <DraggableSubjectHeader subject={s} />
                    <button
                      onClick={() => autoFillSubject(s)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition"
                    >
                      auto-fill
                    </button>
                  </div>
                  <div className="p-2 grid grid-cols-1 gap-1">
                    {s.topics.map((t) => <DraggableTopic key={t.id} subject={s} topic={t} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Your {days}-day plan</h2>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => adjustDays(-5)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition">−</button>
                <div className="w-12 text-center font-medium">{days}</div>
                <button onClick={() => adjustDays(5)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition">+</button>
              </div>
            </div>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {ensureDays(days).map((topics, i) => (
                <DroppableDaySlot key={i} index={i} topics={topics} onRemove={(tid) => removeTopic(i, tid)} />
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

      {!byMentor && (
        <div className="mt-8 p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30">
          <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Commitment scope</div>
          <p className="text-sm text-slate-600 mb-3">
            How much do you want to commit at once? The mentor will approve this slice; you can re-commit the next one when you clear it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ScopeButton
              active={scope === "week"} onClick={() => setScope("week")}
              icon={<Calendar className="w-4 h-4" />} label="Week" sub="7 days"
            />
            <ScopeButton
              active={scope === "month"} onClick={() => setScope("month")}
              icon={<CalendarDays className="w-4 h-4" />} label="Month" sub="30 days"
            />
            <ScopeButton
              active={scope === "overall"} onClick={() => setScope("overall")}
              icon={<CalendarRange className="w-4 h-4" />} label="Overall" sub="whole chart"
            />
          </div>
          {filled > 0 && (
            <div className="mt-3 text-xs text-slate-600">
              {currentChart.approvedThrough > 0 && (
                <span className="text-emerald-700 font-semibold">Already approved through Day {currentChart.approvedThrough}. </span>
              )}
              Submitting <strong>Day {submitFrom}–{submitTo}</strong> ({submitTo - submitFrom + 1} day{submitTo - submitFrom === 0 ? "" : "s"}) for mentor approval.
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
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

function DraggableSubjectHeader({ subject }: { subject: (typeof SUBJECTS)[0] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subject-${subject.id}`,
    data: {
      subjectId: subject.id, topicId: subject.topics[0].id, topicName: subject.name,
      subjectName: subject.name, icon: subject.icon, color: subject.color, _wholeSubject: true,
    },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center gap-2 select-none cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}>
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="text-xl">{subject.icon}</span>
      <span className={`font-semibold text-${subject.color}-900 text-sm`}>{subject.name}</span>
      <span className="text-xs text-slate-500">({subject.topics.length} topics)</span>
    </div>
  );
}

function DraggableTopic({ subject, topic }: { subject: (typeof SUBJECTS)[0]; topic: { id: string; name: string } }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `topic-${subject.id}-${topic.id}`,
    data: { subjectId: subject.id, topicId: topic.id, topicName: topic.name, subjectName: subject.name, icon: subject.icon, color: subject.color },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`text-sm px-3 py-2 rounded-lg hover:bg-slate-50 cursor-grab active:cursor-grabbing flex items-center gap-2 select-none transition ${isDragging ? "opacity-50" : ""}`}>
      <GripVertical className="w-3 h-3 text-slate-300" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
      <span className="text-slate-700">{topic.name}</span>
    </div>
  );
}

function DroppableDaySlot({ index, topics, onRemove }: {
  index: number;
  topics: DaySlot[];
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
          <span className="text-slate-900 text-base">{index + 1}</span>
          {hasMulti && (
            <span className="mt-1 text-[10px] uppercase font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
              ×{topics.length}
            </span>
          )}
        </div>
        {topics.length > 0 ? (
          <div className="flex-1 space-y-1.5 min-w-0">
            {topics.map((t) => {
              const info = findTopic(t.topicId);
              if (!info) return null;
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
