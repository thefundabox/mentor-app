/**
 * Admin → Tour.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { TourStep } from "@/types";

export function TourTab() {
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
