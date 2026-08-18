/**
 * Batch discussion threads.
 *
 * Two standing threads per batch — announcements (staff post only) and doubts
 * (anyone in the batch posts). There is no thread creation: the rows are seeded
 * by supabase/migrations/0002.
 *
 * Unlike the rest of the app, this data lives in Postgres rather than
 * localStorage, so comments are genuinely shared between users. Every query
 * below is additionally constrained by RLS — the filters here are for
 * ergonomics, not security.
 */
import { supabase } from "./supabase";

export type ThreadKind = "announcements" | "doubts";

export interface Thread {
  id: string;
  batch_id: string;
  kind: ThreadKind;
  title: string;
  staff_only_post: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string;
  author_role: "student" | "mentor" | "admin";
  body: string;
  created_at: string;
}

export interface Result<T> {
  data?: T;
  error?: string;
}

const NO_CLIENT = "Discussion is unavailable — Supabase is not configured.";

/** Threads visible to the signed-in user, ordered announcements first. */
export async function listThreads(batchId?: string): Promise<Result<Thread[]>> {
  if (!supabase) return { error: NO_CLIENT };
  let q = supabase.from("threads").select("*");
  if (batchId) q = q.eq("batch_id", batchId);
  const { data, error } = await q.order("kind", { ascending: true });
  if (error) return { error: error.message };
  return { data: (data ?? []) as Thread[] };
}

/** Comments in a thread, oldest first. */
export async function listComments(threadId: string): Promise<Result<Comment[]>> {
  if (!supabase) return { error: NO_CLIENT };
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { data: (data ?? []) as Comment[] };
}

/**
 * Post a comment.
 *
 * author_id / author_name / author_role are all re-checked against the caller's
 * real profile by the insert policy, so a tampered payload is rejected by the
 * database rather than trusted here.
 */
export async function postComment(args: {
  threadId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
}): Promise<Result<Comment>> {
  if (!supabase) return { error: NO_CLIENT };
  const body = args.body.trim();
  if (!body) return { error: "Write something first." };
  if (body.length > 4000) return { error: "Comments are limited to 4000 characters." };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      thread_id: args.threadId,
      author_id: args.authorId,
      author_name: args.authorName,
      author_role: args.authorRole,
      body,
    })
    .select()
    .single();

  if (error) {
    // RLS rejections surface as a policy violation; translate the common case.
    if (error.code === "42501") {
      return { error: "You don't have permission to post in this thread." };
    }
    return { error: error.message };
  }
  return { data: data as Comment };
}

/** Delete a comment. RLS allows own comments, or any comment for staff. */
export async function deleteComment(id: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: true };
}

/**
 * Live updates for a thread. Returns an unsubscribe function.
 *
 * Requires Realtime to be enabled for public.comments in the Supabase
 * dashboard (Database → Replication). If it isn't, this is a no-op and the
 * caller's manual refresh still works.
 */
export function subscribeToComments(threadId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`comments:${threadId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments", filter: `thread_id=eq.${threadId}` },
      () => onChange(),
    )
    .subscribe();
  return () => { void supabase!.removeChannel(channel); };
}
