import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, CalendarDays, CalendarRange, Wrench } from "lucide-react";
import { SCOPE_LABEL } from "@/types";
import type { PlanTemplate } from "@/types";

interface ChoosePlanProps {
  studentId: string;
}

export function ChoosePlan({ studentId }: ChoosePlanProps) {
  const { planTemplates, remotePlanTemplates, defaultTemplate, adoptPlanTemplate, startBlankPlan, setRoute } = useAppState();
  // Published plans win over the bundled demo seeds; the seeds are only a
  // fallback for a local-only install with no Supabase project.
  const plans = remotePlanTemplates.length > 0 ? remotePlanTemplates : planTemplates;
  const others = plans.filter((t) => t.id !== defaultTemplate?.id);

  const adopt = (tpl: PlanTemplate) => {
    adoptPlanTemplate(studentId, tpl.id);
    setRoute("onboarding");
  };
  const buildOwn = () => {
    startBlankPlan(studentId);
    setRoute("onboarding");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-sm font-semibold text-indigo-600 mb-1">Pick a starting point</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {defaultTemplate ? "Your institute's plan" : "Adopt a plan, or build your own"}
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          {defaultTemplate
            ? "This is the plan your institute recommends. You can adjust any day before sending it to your mentor for approval."
            : "Plans are curated by your institute admin. Whichever you pick, you can tweak it before sending to your mentor for approval."}
        </p>
      </div>

      {defaultTemplate && (
        <div className="mb-6 p-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40">
          <div className="text-xs uppercase font-bold text-indigo-700 mb-1">Recommended</div>
          <div className="text-xl font-bold text-slate-900 mb-1">{defaultTemplate.name}</div>
          <p className="text-sm text-slate-600 mb-4 max-w-2xl">{defaultTemplate.blurb}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={() => adopt(defaultTemplate)}>
              Start this plan <ArrowRight className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500">
              {defaultTemplate.days.length} days &middot;{" "}
              {defaultTemplate.days.reduce((n, d) => n + d.length, 0)} topics
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {others.map((t) => (
          <TemplateCard key={t.id} template={t} onAdopt={() => adopt(t)} />
        ))}
        <button
          onClick={buildOwn}
          className="text-left p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-300 hover:shadow-lg transition flex flex-col group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700 mb-3">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase font-bold text-slate-500 mb-1">Custom</div>
          <div className="text-lg font-bold text-slate-900 mb-1">Build my own</div>
          <p className="text-sm text-slate-600 flex-1">
            Drag topics into days yourself. Useful if you've already mapped your prep elsewhere.
          </p>
          <div className="mt-4 text-sm font-semibold text-slate-600 flex items-center gap-1">
            Open chart builder <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {plans.length === 0 && (
        <div className="mt-6 text-sm text-slate-500">
          No default plans are set up yet. Use "Build my own" to start from a blank chart.
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onAdopt }: { template: PlanTemplate; onAdopt: () => void }) {
  const filled = template.days.filter((d) => d.length > 0).length;
  const Icon =
    template.scope === "week" ? Calendar :
    template.scope === "month" ? CalendarDays :
    CalendarRange;

  return (
    <div className="p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-indigo-200 transition flex flex-col">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-700 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs uppercase font-bold text-indigo-700 mb-1">{SCOPE_LABEL[template.scope]} plan</div>
      <div className="text-lg font-bold text-slate-900 mb-1">{template.name}</div>
      <p className="text-sm text-slate-600 flex-1">{template.blurb}</p>
      <div className="flex gap-2 mt-3 mb-4 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{template.days.length} days</span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">{filled} topics</span>
      </div>
      <Button onClick={onAdopt}>
        Adopt this plan <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
