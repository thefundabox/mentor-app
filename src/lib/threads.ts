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
 * Pass `topicId` for a syllabus discussion; omit it for a cohort room. The
 * batch is never sent -- migration 0019 stamps it from the caller's own
 * profile, so a client cannot file a thread into a cohort it does not belong
 * to, and cannot get its own cohort wrong either.
 */
export async function createThread(args: {
  title: string;
  authorId: string;
  authorName: string;
  topicId?: string | null;
}): Promise<Result<Thread>> {
  if (!supabase) return { error: NO_CLIENT };
  const title = args.title.trim();
  if (!title) return { error: "Give the discussion a title." };
  if (title.length > 160) return { error: "Titles are limited to 160 characters." };
  // No client-side anchor check. It used to require topicId or batchId, and
  // once 0019 moved batch stamping into the trigger the caller stopped sending
  // a batch at all -- so this guard rejected every cohort room before the
  // request was made. Whether the caller has a batch is a fact only the server
  // holds; threads_anchored_check decides, and 23514 is translated below.

  const { data, error } = await supabase
    .from("threads")
    .insert({
      title,
      kind: "topic",
      topic_id: args.topicId ?? null,
      // Deliberately not sent. The trigger in migration 0019 stamps the
      // caller's real batch; a client-supplied one could disagree with
      // profiles.batch_id and be refused by the policy, which is exactly what
      // happened while assignStudentToBatch was writing to localStorage only.
      batch_id: null,
      created_by: args.authorId,
      created_by_name: args.authorName,
      staff_only_post: false,
      pinned: false,
    })
    .select()
    .single();

  if (error) {
    // Do not translate 42501 to a bare "no permission". It said exactly that
    // when the real cause was an identity mismatch the user could do nothing
    // about (see migration 0018), which sent the reader looking for a
    // permissions problem that did not exist. Say what the database said.
    // 23514 is threads_anchored_check: no topic and no batch to file it under,
    // which in practice means the caller is not in a cohort yet.
    if (error.code === "23514") {
      return {
        error: "You are not in a batch yet, so there is no room to put this in. "
             + "Ask a mentor or admin to add you to one - or start the discussion "
             + "from any topic's Discuss tab, which works without a batch.",
      };
    }
    if (error.code === "42501") {
      return { error: `The database refused this: ${error.message}` };
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
      return { error: `The database refused this comment: ${error.message}` };
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
