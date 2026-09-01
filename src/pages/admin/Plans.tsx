/**
 * Admin → Plans.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SCOPE_LABEL } from "@/types";
import type { PlanTemplate, CommitmentScope } from "@/types";

export function PlansTab() {
  const { planTemplates, upsertPlanTemplate, removePlanTemplate,
          remotePlanTemplates, authEnabled } = useAppState();
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
      {/* Published plans live in Postgres. This tab used to list only the
          localStorage seeds, so an admin looking for the institute's real plan
          found stale demo data and no sign the published one existed. */}
      {authEnabled && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Published plans</h2>
          <p className="text-xs text-slate-500 mb-4">
            Shared with every student, from the database. The one marked default is applied
            automatically after the signup assessment.
          </p>
          {remotePlanTemplates.length === 0 ? (
            <div className="text-sm text-slate-500">
              None published yet — students fall back to the local starting points below.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {remotePlanTemplates.map((t) => {
                const slots = t.days.reduce((n, d) => n + d.length, 0);
                const filled = t.days.filter((d) => d.length > 0).length;
                return (
                  <div key={t.id} className={`rounded-2xl p-5 border ${t.isDefault ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs uppercase font-bold text-indigo-700">{SCOPE_LABEL[t.scope]} plan</span>
                      {t.isDefault && (
                        <span className="text-[10px] uppercase font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded">default</span>
                      )}
                      {t.ownerId && (
                        <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">mentor plan</span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    {t.blurb && <p className="text-xs text-slate-600 mt-1">{t.blurb}</p>}
                    <div className="text-xs text-slate-500 mt-2 font-medium">
                      {t.days.length} days · {slots} topics · {filled} days scheduled · v{t.version}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-xs text-slate-500">
            Published plans are read-only here. To change one, edit its seed migration and re-run
            it — that bumps the version so adopted charts stay traceable.
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {authEnabled
            ? "Local starting points, stored in this browser only. Students see the published plans above."
            : "Students see these as adoptable starting points after the signup assessment."}
        </p>
        <Button onClick={addNew}><Plus className="w-4 h-4" /> Add plan</Button>
      </div>
      {planTemplates.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No default plans yet. Students will only see "Build my own".
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {planTemplates.map((t) => {
          const slots = t.days.reduce((n, d) => n + d.length, 0);
          return (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase font-bold text-indigo-700">{SCOPE_LABEL[t.scope]} plan</div>
                  <div className="font-semibold text-slate-900 truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.days.length} days · {slots} topics</div>
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
