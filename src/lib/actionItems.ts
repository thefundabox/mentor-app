/**
 * Action items -- directions that outlive the conversation they came from.
 *
 * A discussion comment is chat; an override note only exists when a student
 * asked for a day unlock; an announcement is a broadcast that expires. None of
 * them can be marked done or found again. This can.
 *
 * Either side may write one. A mentor setting work is the point, but a student
 * recording what they agreed to is the same object -- `created_by_name` keeps
 * the provenance visible rather than pretending otherwise.
 */
import { supabase } from "./supabase";

export interface ActionItem {
  id: string;
  student_id: string;
  created_by: string | null;
  created_by_name: string;
  body: string;
  topic_id: string | null;
  booking_id: string | null;
  thread_id: string | null;
  due_on: string | null;        // YYYY-MM-DD
  status: "open" | "done" | "dropped";
  done_at: string | null;
  done_by: string | null;
  created_at: string;
}

export interface Result<T> { data?: T; error?: string }

const NO_CLIENT = "Action items are unavailable - Supabase is not configured.";

/** Items for one student. Open first, then most recently finished. */
export async function loadActionItems(studentId: string): Promise<ActionItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("action_items")
    .select("*")
    .eq("student_id", studentId)
    .order("status", { ascending: true })   // 'done' < 'dropped' < 'open' alphabetically
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const rows = data as ActionItem[];
  // Sort in the order a person wants to read: open work first, overdue at the
  // very top, then everything already closed.
  const rank = (i: ActionItem) => (i.status === "open" ? 0 : 1);
  const today = new Date().toISOString().slice(0, 10);
  return rows.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.status === "open" && b.status === "open") {
      const aOver = a.due_on !== null && a.due_on < today;
      const bOver = b.due_on !== null && b.due_on < today;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (a.due_on !== b.due_on) return (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999");
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export async function addActionItem(args: {
  studentId: string;
  body: string;
  dueOn?: string | null;
  topicId?: string | null;
  bookingId?: string | null;
  threadId?: string | null;
}): Promise<Result<ActionItem>> {
  if (!supabase) return { error: NO_CLIENT };
  const body = args.body.trim();
  if (!body) return { error: "Write the direction first." };
  if (body.length > 2000) return { error: "Keep it under 2000 characters." };

  const { data, error } = await supabase.from("action_items").insert({
    student_id: args.studentId,
    body,
    due_on: args.dueOn || null,
    topic_id: args.topicId || null,
    booking_id: args.bookingId || null,
    thread_id: args.threadId || null,
    // created_by / created_by_name are stamped by the trigger in 0023.
  }).select().single();

  if (error) {
    if (error.code === "42501") {
      return { error: "You can only set items for yourself or for a student you mentor." };
    }
    return { error: error.message };
  }
  return { data: data as ActionItem };
}

/** Tick off or reopen. done_at / done_by are stamped by the trigger. */
export async function setActionItemStatus(
  id: string, status: ActionItem["status"],
): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("action_items").update({ status }).eq("id", id);
  return error ? { error: error.message } : { data: true };
}

export async function deleteActionItem(id: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error, count } = await supabase
    .from("action_items").delete({ count: "exact" }).eq("id", id);
  if (error) return { error: error.message };
  if (count === 0) {
    return { error: "Only whoever set this, or your mentor, can remove it. You can mark it done instead." };
  }
  return { data: true };
}

/** Open items, overdue first — what a home screen wants to show. */
export function openItems(items: ActionItem[]): ActionItem[] {
  return items.filter((i) => i.status === "open");
}

export function isOverdue(item: ActionItem, today = new Date()): boolean {
  if (!item.due_on || item.status !== "open") return false;
  return item.due_on < today.toISOString().slice(0, 10);
}
