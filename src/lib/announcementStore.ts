/**
 * Announcements, in Postgres.
 *
 * They used to live in `v5_announcements` in the poster's browser, seeded to an
 * empty array -- so a mentor's announcement reached their own laptop and
 * nothing else. No student has ever seen one.
 *
 * Dismissals are a separate table rather than an array on the announcement: a
 * student who could append themselves to a column on the row could also rewrite
 * the announcement's body. See 0036.
 */
import { supabase } from "./supabase";
import type { Announcement } from "@/types";

interface Row {
  id: string;
  batch_id: string | null;
  body: string;
  posted_by: string | null;
  posted_at: string;
  expires_at: string | null;
}

/**
 * Every announcement the caller is allowed to see, newest first, each carrying
 * the caller's own dismissal state.
 *
 * `dismissedBy` holds at most the current user, because RLS shows a student
 * only their own dismissals. That is all the UI asks of it -- it tests
 * `dismissedBy.includes(myId)` -- and it means one student's reading habits are
 * not published to the rest of the cohort.
 */
export async function loadAnnouncements(userId: string): Promise<Announcement[] | null> {
  if (!supabase) return null;
  const [{ data, error }, dismissed] = await Promise.all([
    supabase
      .from("announcements")
      .select("id,batch_id,body,posted_by,posted_at,expires_at")
      .order("posted_at", { ascending: false }),
    supabase.from("announcement_dismissals").select("announcement_id"),
  ]);
  if (error || !data) return null;
  const mine = new Set(
    (dismissed.data ?? []).map((d: { announcement_id: string }) => d.announcement_id),
  );
  return (data as Row[]).map((r) => ({
    id: r.id,
    batchId: r.batch_id,
    body: r.body,
    postedAt: new Date(r.posted_at).getTime(),
    postedBy: r.posted_by ?? "system",
    dismissedBy: mine.has(r.id) ? [userId] : [],
    ...(r.expires_at ? { expiresAt: new Date(r.expires_at).getTime() } : {}),
  }));
}

/**
 * Post one. posted_by is ignored if sent -- a trigger stamps auth.uid() -- so
 * an announcement always carries the identity of whoever actually sent it.
 */
export async function createAnnouncement(a: Announcement): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const { error } = await supabase.from("announcements").insert({
    id: a.id,
    batch_id: a.batchId,
    body: a.body,
    posted_at: new Date(a.postedAt).toISOString(),
    expires_at: a.expiresAt ? new Date(a.expiresAt).toISOString() : null,
  });
  return error ? { error: error.message } : {};
}

/**
 * Delete one.
 *
 * `.select()` for the same reason saveSettings needs it: PostgREST answers a
 * DELETE that matched no rows with 204 and no error, so a delete RLS filtered
 * out is indistinguishable from one that worked -- and the row vanishes from
 * the screen while surviving in the database, reappearing on the next load.
 *
 * Zero rows can also mean it was already gone, which is harmless, so the
 * message covers both rather than asserting a cause it cannot know.
 */
export async function removeAnnouncement(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const { data, error } = await supabase
    .from("announcements").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "That announcement was not deleted — it may already be gone, or this account may not be allowed to delete it." };
  }
  return {};
}

/**
 * Dismiss for the calling user only. The row names the caller and RLS checks
 * it, so this cannot be used to dismiss on somebody else's behalf.
 *
 * ignoreDuplicates because dismissing twice is not an error -- two tabs, or a
 * double click, should both end with "dismissed" rather than a red banner.
 */
export async function dismissAnnouncementFor(
  announcementId: string, userId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const { error } = await supabase
    .from("announcement_dismissals")
    .upsert({ announcement_id: announcementId, user_id: userId }, { ignoreDuplicates: true });
  return error ? { error: error.message } : {};
}
