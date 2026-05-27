import { useState } from "react";
import {
  DndContext, type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useAppState } from "@/hooks/useAppState";
import { SUBJECTS, findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { ArrowRight, GripVertical, Send, AlertCircle } from "lucide-react";
import type { DaySlot, ChartState } from "@/types";

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
    Math.max(currentChart.days.filter(Boolean).length || 15, 15)
  );
  const [activeDrag, setActiveDrag] = useState<{
    subjectId: string; topicId: string; topicName: string; subjectName: string; icon: string; color: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function ensureDays(n: number): (DaySlot | null)[] {
    const next = [...currentChart.days];
    while (next.length < n) next.push(null);
    return next.slice(0, n);
  }

  function writeChart(days: (DaySlot | null)[], status?: ChartState["status"]) {
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
        while (idx < days && next[idx] !== null) idx++;
        if (idx >= days) break;
        next[idx] = { subjectId: subject.id, topicId: t.id };
        idx++;
      }
      writeChart(next);
    } else {
      const dayIdx = parseInt(overId.replace("day-", ""));
      const next = ensureDays(days);
      next[dayIdx] = { subjectId: dragData.subjectId, topicId: dragData.topicId };
      writeChart(next);
    }
  }

  function clearDay(i: number) {
    const next = ensureDays(days);
    next[i] = null;
    writeChart(next);
  }

  function autoFillSubject(subj: (typeof SUBJECTS)[0]) {
    const next = ensureDays(days);
    let i = next.findIndex((x) => x === null);
    for (const t of subj.topics) {
      if (i < 0 || i >= days) break;
      next[i] = { subjectId: subj.id, topicId: t.id };
      i = next.findIndex((x, k) => k > i && x === null);
    }
    writeChart(next);
  }

  function adjustDays(delta: number) {
    const newDays = Math.max(5, days + delta);
    setDays(newDays);
    writeChart(ensureDays(newDays));
  }

  const filled = ensureDays(days).filter(Boolean).length;

  const handleSubmit = () => {
    if (byMentor) {
      // Mentor editing — finalize directly (and approve)
      setChart(studentId, { ...currentChart, days: ensureDays(days), status: "approved", decidedAt: Date.now() });
      approveChart(studentId);
      setViewingStudentId(studentId);
      setRoute("mentor_student");
    } else {
      submitChartForApproval(studentId);
      setRoute("approval_gate");
    }
  };

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
          Drag any subject or topic into a day. Drag an entire subject to seed a sequence,
          or pick individual topics in your preferred order. {byMentor ? "You'll approve on save." : "Your mentor will approve before you start."}
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
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {ensureDays(days).map((slot, i) => {
                const info = slot ? findTopic(slot.topicId) : null;
                return <DroppableDaySlot key={i} index={i} info={info} onClear={() => clearDay(i)} />;
              })}
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
            <>{isResubmit ? "Resubmit for approval" : "Submit for mentor approval"} <Send className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
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

function DroppableDaySlot({ index, info, onClear }: {
  index: number;
  info: { subject: (typeof SUBJECTS)[0]; topic: { id: string; name: string } } | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${index}` });
  return (
    <div ref={setNodeRef}
      className={`group flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition ${
        info ? "bg-white border-transparent shadow-sm"
          : isOver ? "border-indigo-400 bg-indigo-50/50"
          : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}>
      <div className="w-12 text-center text-xs font-semibold text-slate-500 flex-shrink-0">
        Day<br /><span className="text-slate-900 text-base">{index + 1}</span>
      </div>
      {info ? (
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{info.subject.icon}</span>
            <div className="min-w-0">
              <div className="text-sm text-slate-500 truncate">{info.subject.name}</div>
              <div className="font-semibold text-slate-900 truncate">{info.topic.name}</div>
            </div>
          </div>
          <button onClick={onClear} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 px-2 py-1 text-xs transition flex-shrink-0">remove</button>
        </div>
      ) : (
        <div className="text-slate-400 text-sm italic">Drop a topic here</div>
      )}
    </div>
  );
}
