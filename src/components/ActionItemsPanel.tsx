import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Check, RotateCcw, CalendarClock, AlertTriangle } from "lucide-react";
import {
  loadActionItems, addActionItem, setActionItemStatus, deleteActionItem, isOverdue,
  type ActionItem,
} from "@/lib/actionItems";
import { findTopic } from "@/data";

/**
 * The shared action-items surface: the student's own list, and the mentor's
 * view of one student's list.
 *
 * One component because the difference is only who may add and remove, and
 * both are enforced by RLS anyway (migration 0023). The student can always
 * tick an item off -- being told to do something you cannot mark as done is
 * worse than not being told.
 */
export function ActionItemsPanel({ studentId, compact = false }: {
  studentId: string;
  /** Student home: open items only, no composer clutter until asked for. */
  compact?: boolean;
}) {
  const { currentUser } = useAppState();
  const [items, setItems] = useState<ActionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(!compact);

  const refresh = useCallback(async () => {
    setItems(await loadActionItems(studentId));
  }, [studentId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true); setError(null);
    const res = await addActionItem({ studentId, body, dueOn: dueOn || null });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setBody(""); setDueOn("");
    if (compact) setShowAdd(false);
    await refresh();
  }

  async function toggle(item: ActionItem) {
    setError(null);
    const res = await setActionItemStatus(item.id, item.status === "open" ? "done" : "open");
    if (res.error) { setError(res.error); return; }
    await refresh();
  }

  async function remove(item: ActionItem) {
    setError(null);
    const res = await deleteActionItem(item.id);
    if (res.error) { setError(res.error); return; }
    await refresh();
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const open = items.filter((i) => i.status === "open");
  const closed = items.filter((i) => i.status !== "open");
  const shown = compact ? open : items;

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
      )}

      {shown.length === 0 && (
        <div className="text-sm text-slate-500 py-2">
          {compact
            ? "Nothing outstanding. Anything your mentor asks you to do will show up here."
            : "No action items yet."}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((item) => {
          const overdue = isOverdue(item);
          const done = item.status !== "open";
          const topic = item.topic_id ? findTopic(item.topic_id) : null;
          return (
            <div
              key={item.id}
              className={`group flex items-start gap-3 p-3 rounded-xl border ${
                done ? "bg-slate-50 border-slate-200"
                : overdue ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200"
              }`}
            >
              <button
                onClick={() => toggle(item)}
                title={done ? "Reopen" : "Mark done"}
                className={`mt-0.5 w-5 h-5 rounded-md border grid place-items-center shrink-0 transition ${
                  done ? "bg-emerald-500 border-emerald-500 text-white"
                       : "border-slate-300 hover:border-emerald-500"
                }`}
              >
                {done && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`text-sm whitespace-pre-wrap leading-relaxed ${done ? "text-slate-500 line-through" : "text-slate-800"}`}>
                  {item.body}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-slate-500">
                  <span>
                    {item.created_by === currentUser?.id ? "you" : item.created_by_name || "mentor"}
                    {" · "}
                    {new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                  {item.due_on && (
                    <span className={`inline-flex items-center gap-1 ${overdue ? "text-amber-800 font-semibold" : ""}`}>
                      {overdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                      due {item.due_on}
                    </span>
                  )}
                  {topic && (
                    <span className="bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 font-medium">
                      {topic.topic.name}
                    </span>
                  )}
                  {item.booking_id && <span className="text-slate-400">from a session</span>}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {done && (
                  <button onClick={() => toggle(item)} title="Reopen"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => remove(item)} title="Remove"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {compact && closed.length > 0 && (
        <div className="mt-2 text-[11px] text-slate-400">
          {closed.length} already done
        </div>
      )}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add one
        </button>
      ) : (
        <form onSubmit={add} className="mt-3 bg-white border border-slate-200 rounded-xl p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="What should happen next? e.g. redo the Bijolia questions before Friday"
            className="w-full p-2 rounded-lg border border-slate-200 focus:border-indigo-400 outline-none text-sm resize-y"
          />
          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
            <label className="text-xs text-slate-500 flex items-center gap-2">
              due
              <input
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs outline-none"
              />
            </label>
            <div className="flex gap-2">
              {compact && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              )}
              <Button type="submit" size="sm" disabled={!body.trim() || busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
