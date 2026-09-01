/**
 * Admin → Limits.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadPlanLimits, setPlanLimits } from "@/lib/entitlement";
import type { PlanLimitRow } from "@/lib/entitlement";

export function LimitsTab() {
  const [rows, setRows] = useState<PlanLimitRow[]>([]);
  const [draft, setDraft] = useState<Record<string, { q: string; t: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const r = await loadPlanLimits();
    setRows(r);
    setDraft(Object.fromEntries(r.map((x) => [x.plan, {
      q: x.dailyUnlocks === null ? "" : String(x.dailyUnlocks),
      t: x.maxTests === null ? "" : String(x.maxTests),
    }])));
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const save = async (plan: "free" | "paid") => {
    const d = draft[plan];
    if (!d) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const q = num(d.q), t = num(d.t);
    if ((q !== null && (!Number.isInteger(q) || q < 0)) || (t !== null && (!Number.isInteger(t) || t < 0))) {
      setNote({ kind: "err", text: "Use a whole number of 0 or more, or leave it blank for unlimited." });
      return;
    }
    setNote(null); setBusy(plan);
    const res = await setPlanLimits(plan, q, t);
    setBusy(null);
    if (res.error) { setNote({ kind: "err", text: res.error }); return; }
    setNote({ kind: "ok", text: `Saved. The ${plan} plan updates for everyone immediately.` });
    void refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Plans &amp; limits</h2>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          What each plan includes. Changes apply to every student on that plan at once, with no
          deploy. Leave a box <strong>blank for unlimited</strong>; <strong>0</strong> means the
          plan gets none.
        </p>
      </div>

      {note && (
        <div className={`rounded-xl border px-4 py-2.5 text-sm ${note.kind === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {note.text}
        </div>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Could not load the plans. This needs a signed-in admin and a configured database.
        </div>
      )}

      {rows.map((r) => (
        <div key={r.plan} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="font-bold capitalize text-slate-900">{r.plan} plan</div>
            <div className="text-xs text-slate-500">
              now: {r.dailyUnlocks === null ? "unlimited" : r.dailyUnlocks} questions/day ·{" "}
              {r.maxTests === null ? "unlimited" : r.maxTests} mock tests
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">New questions per day</span>
              <input
                value={draft[r.plan]?.q ?? ""} inputMode="numeric" placeholder="blank = unlimited"
                onChange={(e) => setDraft((d) => ({ ...d, [r.plan]: { ...d[r.plan], q: e.target.value } }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Mock tests</span>
              <input
                value={draft[r.plan]?.t ?? ""} inputMode="numeric" placeholder="blank = unlimited"
                onChange={(e) => setDraft((d) => ({ ...d, [r.plan]: { ...d[r.plan], t: e.target.value } }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm"
              />
            </label>
            <Button onClick={() => void save(r.plan)} disabled={busy !== null}>
              {busy === r.plan ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500 max-w-2xl">
        Only admins can change these. Mentors cannot: what a plan includes is a commercial
        decision, and a change here applies to every student in the institute rather than to
        one mentor&rsquo;s own.
      </p>
    </div>
  );
}
