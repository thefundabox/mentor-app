import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Megaphone, MessagesSquare, Send, Trash2 } from "lucide-react";
import {
  listThreads, listComments, postComment, deleteComment, subscribeToComments,
  type Thread, type Comment,
} from "@/lib/threads";

/**
 * Batch discussion — two standing threads per batch.
 *
 * Announcements is staff-post-only; Doubts is open to everyone in the batch.
 * Both are enforced by RLS, not by this component: hiding the composer is a
 * courtesy, and a crafted request still gets rejected by the database.
 */
export function Discussion() {
  const { currentUser, setRoute, authEnabled } = useAppState();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isStaff = currentUser?.role === "mentor" || currentUser?.role === "admin";
  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);
  const canPost = !!active && (!active.staff_only_post || isStaff);

  /* ---- load threads ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listThreads();
      if (cancelled) return;
      if (res.error) { setError(res.error); setLoading(false); return; }
      const list = res.data ?? [];
      setThreads(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---- load comments for the active thread ---- */
  const refresh = useCallback(async (threadId: string) => {
    const res = await listComments(threadId);
    if (res.error) { setError(res.error); return; }
    setComments(res.data ?? []);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setError(null);
    void refresh(activeId);
    const unsub = subscribeToComments(activeId, () => { void refresh(activeId); });
    return unsub;
  }, [activeId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !activeId || !draft.trim() || posting) return;
    setPosting(true);
    setError(null);
    const res = await postComment({
      threadId: activeId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      body: draft,
    });
    setPosting(false);
    if (res.error) { setError(res.error); return; }
    setDraft("");
    void refresh(activeId);
  }

  async function remove(id: string) {
    const res = await deleteComment(id);
    if (res.error) { setError(res.error); return; }
    if (activeId) void refresh(activeId);
  }

  if (!authEnabled) {
    return (
      <Shell onBack={() => setRoute("dashboard")}>
        <EmptyNote
          title="Discussion needs Supabase"
          body="Comments are shared between real users, so this screen needs a configured Supabase project. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and reload."
        />
      </Shell>
    );
  }

  return (
    <Shell onBack={() => setRoute("dashboard")}>
      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">Your batch</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discussion</h1>
        <p className="text-slate-600 mt-1">
          Announcements from your mentor, and a space to ask questions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : threads.length === 0 ? (
        <EmptyNote
          title="No threads yet"
          body="You're not assigned to a batch, so there's nothing to show. Ask your mentor or admin to add you to one."
        />
      ) : (
        <>
          <div className="flex gap-1 border-b border-slate-200 mb-6">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition ${
                  t.id === activeId
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.kind === "announcements"
                  ? <Megaphone className="w-4 h-4" />
                  : <MessagesSquare className="w-4 h-4" />}
                {t.title}
              </button>
            ))}
          </div>

          {active?.staff_only_post && !isStaff && (
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              Only your mentor can post here. Use <strong>Doubts &amp; discussion</strong> to ask a question.
            </div>
          )}

          <div className="space-y-3 mb-6">
            {comments.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                Nothing here yet. {canPost ? "Start the conversation." : ""}
              </div>
            )}
            {comments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                canDelete={c.author_id === currentUser?.id || isStaff}
                onDelete={() => remove(c.id)}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          {canPost && (
            <form onSubmit={submit} className="sticky bottom-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder={
                    active?.kind === "announcements"
                      ? "Post an announcement to the batch…"
                      : "Ask a question, or answer someone else's…"
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-y text-slate-800"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-400">{draft.length}/4000</div>
                  <Button type="submit" disabled={!draft.trim() || posting}>
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post
                  </Button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </Shell>
  );
}

/* ---------- pieces ---------- */

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>
      {children}
    </div>
  );
}

function CommentCard({ comment, canDelete, onDelete }: {
  comment: Comment; canDelete: boolean; onDelete: () => void;
}) {
  const isStaff = comment.author_role === "mentor" || comment.author_role === "admin";
  return (
    <div className={`group p-4 rounded-2xl border ${isStaff ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
            comment.author_role === "admin" ? "bg-slate-700"
            : comment.author_role === "mentor" ? "bg-emerald-500"
            : "bg-indigo-500"}`}>
            {comment.author_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {comment.author_name}
              {isStaff && (
                <span className="ml-2 text-[10px] uppercase tracking-wide font-bold text-emerald-700">
                  {comment.author_role}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {new Date(comment.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            title="Delete comment"
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-slate-800 mt-3 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
    </div>
  );
}

function EmptyNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">💬</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 max-w-md mx-auto">{body}</p>
    </div>
  );
}
