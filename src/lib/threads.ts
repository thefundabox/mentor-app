/**
 * Discussion threads.
 *
 * Two shapes, since migration 0017:
 *   batch room  -- batch_id set. The two standing rooms (announcements, doubts)
 *                  plus any number of user-created 'topic' rooms.
 *   microtheme  -- topic_id set. Hangs off a syllabus microtheme and is visible
 *                  to everyone, not scoped to a cohort.
 *
 * Anyone signed in may start a topic; mentors and admins moderate. All of that
 * is enforced by RLS -- the checks here are for ergonomics, not security.
 *
 * Unlike the rest of the app, this data lives in Postgres rather than
 * localStorage, so comments are genuinely shared between users. Every query
 * below is additionally constrained by RLS — the filters here are for
 * ergonomics, not security.
 */
import { supabase } from "./supabase";

export type ThreadKind = "announcements" | "doubts" | "topic";

export interface Thread {
  id: string;
  batch_id: string | null;
  topic_id: string | null;
  kind: ThreadKind;
  title: string;
  staff_only_post: boolean;
  locked: boolean;
  pinned: boolean;
  created_by: string | null;
  created_by_name: string;
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

/**
 * Threads visible to the signed-in user.
 *
 * `topicId` narrows to one microtheme's discussions; `batchRooms` narrows to
 * cohort rooms. With neither, everything RLS allows comes back.
 *
 * Pinned first, then newest. Ordering is explicit because Postgres promises
 * nothing without it, and a room list that reshuffles between loads is
 * disorienting in a way a query result is not.
 */
export async function listThreads(
  opts: { topicId?: string; batchRooms?: boolean } = {},
): Promise<Result<Thread[]>> {
  if (!supabase) return { error: NO_CLIENT };
  let q = supabase.from("threads").select("*");
  if (opts.topicId) q = q.eq("topic_id", opts.topicId);
  else if (opts.batchRooms) q = q.is("topic_id", null);
  const { data, error } = await q
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { data: (data ?? []) as Thread[] };
}

/**
 * Start a discussion.
 *
 * A thread must be anchored: `topicId` for a syllabus discussion, `batchId` for
 * a cohort room. The database enforces that too (threads_anchored_check), and
 * rejects a student who tries to file one into a cohort they are not in.
 */
export async function createThread(args: {
  title: string;
  authorId: string;
  authorName: string;
  topicId?: string | null;
  batchId?: string | null;
}): Promise<Result<Thread>> {
  if (!supabase) return { error: NO_CLIENT };
  const title = args.title.trim();
  if (!title) return { error: "Give the discussion a title." };
  if (title.length > 160) return { error: "Titles are limited to 160 characters." };
  if (!args.topicId && !args.batchId) {
    return { error: "A discussion needs a microtheme or a batch to belong to." };
  }

  const { data, error } = await supabase
    .from("threads")
    .insert({
      title,
      kind: "topic",
      topic_id: args.topicId ?? null,
      batch_id: args.batchId ?? null,
      created_by: args.authorId,
      created_by_name: args.authorName,
      staff_only_post: false,
      pinned: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42501") {
      return { error: "You don't have permission to start a discussion here." };
    }
    return { error: error.message };
  }
  return { data: data as Thread };
}

/** Lock, unlock, pin or rename a thread. Mentors and admins only, per RLS. */
export async function moderateThread(
  id: string,
  patch: { locked?: boolean; pinned?: boolean; title?: string },
): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error } = await supabase.from("threads").update(patch).eq("id", id);
  if (error) {
    if (error.code === "42501") return { error: "Only a mentor can moderate discussions." };
    return { error: error.message };
  }
  return { data: true };
}

/**
 * Delete a thread. Staff can remove any; an author can remove their own only
 * while nobody else has replied, since comments cascade with it.
 */
export async function deleteThread(id: string): Promise<Result<true>> {
  if (!supabase) return { error: NO_CLIENT };
  const { error, count } = await supabase
    .from("threads").delete({ count: "exact" }).eq("id", id);
  if (error) return { error: error.message };
  if (count === 0) {
    return { error: "Could not delete - once somebody else has replied, only a mentor can remove a discussion." };
  }
  return { data: true };
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
