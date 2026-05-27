import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useAppState } from "@/hooks/useAppState";
import { SUBJECTS, findTopic } from "@/data";
import { Button } from "@/components/ui/button";
import { ArrowRight, GripVertical } from "lucide-react";
import type { DaySlot } from "@/types";

export function Onboarding() {
  const { chart, setChart, setRoute, role } = useAppState();
  const [days, setDays] = useState(Math.max(chart.filter(Boolean).length || 15, 15));
  const [activeDrag, setActiveDrag] = useState<{
    subjectId: string;
    topicId: string;
    topicName: string;
    subjectName: string;
    icon: string;
    color: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function ensureChart(n: number): (DaySlot | null)[] {
    const next = [...chart];
    while (next.length < n) next.push(null);
    return next.slice(0, n);
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as {
      subjectId: string;
      topicId: string;
      topicName: string;
      subjectName: string;
      icon: string;
      color: string;
    };
    setActiveDrag(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over) return;

    const dragData = active.data.current as {
      subjectId: string;
      topicId: string;
      _wholeSubject?: boolean;
    };

    if (dragData._wholeSubject) {
      const overId = over.id as string;
      if (!overId.startsWith("day-")) return;
      const startIdx = parseInt(overId.replace("day-", ""));
      const subject = SUBJECTS.find((s) => s.id === dragData.subjectId);
      if (!subject) return;

      const next = ensureChart(days);
      let idx = startIdx;
      for (const t of subject.topics) {
        if (idx >= days) break;
        while (idx < days && next[idx] !== null) idx++;
        if (idx >= days) break;
        next[idx] = { subjectId: subject.id, topicId: t.id };
        idx++;
      }
      setChart(next);
    } else {
      const overId = over.id as string;
      if (!overId.startsWith("day-")) return;
      const dayIdx = parseInt(overId.replace("day-", ""));
      const next = ensureChart(days);
      next[dayIdx] = { subjectId: dragData.subjectId, topicId: dragData.topicId };
      setChart(next);
    }
  }

  function clearDay(i: number) {
    const next = ensureChart(days);
    next[i] = null;
    setChart(next);
  }

  function autoFillSubject(subj: (typeof SUBJECTS)[0]) {
    const next = ensureChart(days);
    let i = next.findIndex((x) => x === null);
    for (const t of subj.topics) {
      if (i < 0 || i >= days) break;
      next[i] = { subjectId: subj.id, topicId: t.id };
      i = next.findIndex((x, k) => k > i && x === null);
    }
    setChart(next);
  }

  function adjustDays(delta: number) {
    const newDays = Math.max(5, days + delta);
    setDays(newDays);
    setChart(ensureChart(newDays));
  }

  const filled = ensureChart(days).filter(Boolean).length;

  const handleDone = () => {
    if (role === "mentor") {
      setRoute("mentor");
    } else {
      setRoute("home");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600 mb-1">
          Step 1 of 1 · Onboarding
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Build your prep chart with your mentor
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Drag any subject or topic into a day. Tip: drag an entire subject to
          seed a sequence (e.g., 5 days of Rajasthan History), or pick
          individual topics in your preferred order. You can change this later.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          {/* Library */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Subject library</h2>
              <div className="text-xs text-slate-500">
                {filled}/{days} days filled
              </div>
            </div>
            <div className="space-y-4">
              {SUBJECTS.map((s) => (
                <div
                  key={s.id}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div
                    className={`flex items-center justify-between gap-2 px-4 py-3 bg-${s.color}-50`}
                  >
                    <DraggableSubjectHeader subject={s} />
                    <button
                      onClick={() => autoFillSubject(s)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition"
                    >
                      auto-fill
                    </button>
                  </div>
                  <div className="p-2 grid grid-cols-1 gap-1">
                    {s.topics.map((t) => (
                      <DraggableTopic key={t.id} subject={s} topic={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                Your {days}-day plan
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => adjustDays(-5)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition"
                >
                  −
                </button>
                <div className="w-12 text-center font-medium">{days}</div>
                <button
                  onClick={() => adjustDays(5)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {ensureChart(days).map((slot, i) => {
                const info = slot ? findTopic(slot.topicId) : null;
                return (
                  <DroppableDaySlot
                    key={i}
                    index={i}
                    info={info}
                    onClear={() => clearDay(i)}
                  />
                );
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
        <Button disabled={filled === 0} onClick={handleDone}>
          Save chart and start <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Draggable Subject Header ---
function DraggableSubjectHeader({
  subject,
}: {
  subject: (typeof SUBJECTS)[0];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subject-${subject.id}`,
    data: {
      subjectId: subject.id,
      topicId: subject.topics[0].id,
      topicName: subject.name,
      subjectName: subject.name,
      icon: subject.icon,
      color: subject.color,
      _wholeSubject: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 select-none cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="text-xl">{subject.icon}</span>
      <span className={`font-semibold text-${subject.color}-900 text-sm`}>
        {subject.name}
      </span>
      <span className="text-xs text-slate-500">
        ({subject.topics.length} topics)
      </span>
    </div>
  );
}

// --- Draggable Topic ---
function DraggableTopic({
  subject,
  topic,
}: {
  subject: (typeof SUBJECTS)[0];
  topic: { id: string; name: string };
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `topic-${subject.id}-${topic.id}`,
    data: {
      subjectId: subject.id,
      topicId: topic.id,
      topicName: topic.name,
      subjectName: subject.name,
      icon: subject.icon,
      color: subject.color,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`text-sm px-3 py-2 rounded-lg hover:bg-slate-50 cursor-grab active:cursor-grabbing flex items-center gap-2 select-none transition ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="w-3 h-3 text-slate-300" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
      <span className="text-slate-700">{topic.name}</span>
    </div>
  );
}

// --- Droppable Day Slot ---
function DroppableDaySlot({
  index,
  info,
  onClear,
}: {
  index: number;
  info: { subject: (typeof SUBJECTS)[0]; topic: { id: string; name: string } } | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${index}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition ${
        info
          ? "bg-white border-transparent shadow-sm"
          : isOver
          ? "border-indigo-400 bg-indigo-50/50"
          : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}
    >
      <div className="w-12 text-center text-xs font-semibold text-slate-500 flex-shrink-0">
        Day
        <br />
        <span className="text-slate-900 text-base">{index + 1}</span>
      </div>
      {info ? (
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{info.subject.icon}</span>
            <div className="min-w-0">
              <div className="text-sm text-slate-500 truncate">
                {info.subject.name}
              </div>
              <div className="font-semibold text-slate-900 truncate">
                {info.topic.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 px-2 py-1 text-xs transition flex-shrink-0"
          >
            remove
          </button>
        </div>
      ) : (
        <div className="text-slate-400 text-sm italic">Drop a topic here</div>
      )}
    </div>
  );
}
