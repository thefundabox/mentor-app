import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import {
  Loader2, Megaphone, MessagesSquare, Send, Trash2, Plus, Lock, LockOpen, Pin, PinOff,
} from "lucide-react";
import {
  listThreads, listComments, postComment, deleteComment, subscribeToComments,
  createThread, moderateThread, deleteThread,
  type Thread, type Comment,
} from "@/lib/threads";

/**
 * The discussion surface, shared by the batch page and the per-microtheme tab.
 *
 * One component rather than two because the only real difference is what a
 * thread is anchored to. Both need the same room list, composer, moderation
 * controls and realtime refresh, and two copies of that would drift.
 *
 * Permissions shown here are a courtesy. Every one of them is also a policy in
 * migration 0017, so a crafted request is refused by the database rather than
 * by this file.
 */
export function DiscussionPanel({ scope }: {
  /** A microtheme discussion, or the signed-in user's cohort rooms. */
  scope: { topicId: string } | { batchRooms: true };
}) {
  const { currentUser } = useAppState();
  const topicId = "topicId" in scope ? scope.topicId : undefined;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isStaff = currentUser?.role === "mentor" || currentUser?.role === "admin";
  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);
  const canPost = !!active && !active.locked && (!active.staff_only_post || isStaff);

  const loadThreads = useCallback(async (keepId?: string) => {
    const res = await listThreads(topicId ? { topicId } : { batchRooms: true });
    if (res.error) { setError(res.error); setLoading(false); return; }
    const list = res.data ?? [];
    setThreads(list);
    setActiveId((prev) => {
      const wanted = keepId ?? prev;
      return wanted && list.some((t) => t.id === wanted) ? wanted : list[0]?.id ?? null;
    });
    setLoading(false);
  }, [topicId]);

  useEffect(() => { setLoading(true); void loadThreads(); }, [loadThreads]);

  const refresh = useCallback(async (threadId: string) => {
    const res = await listComments(threadId);
    if (res.error) { setError(res.error); return; }
    setComments(res.data ?? []);
  }, []);

  useEffect(() => {
    if (!activeId) { setComments([]); return; }
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
    setPosting(true); setError(null);
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

  async function startThread(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newTitle.trim() || creating) return;
    setCreating(true); setError(null);
    const res = await createThread({
      title: newTitle,
      authorId: currentUser.id,
      authorName: currentUser.name,
      topicId: topicId ?? null,
      // No batch is sent. The trigger in migration 0019 fills it from the
      // caller's own profile, so the client cannot supply one the policy will
      // then reject -- which is precisely how this broke.
    });
    setCreating(false);
    if (res.error) { setError(res.error); return; }
    setNewTitle(""); setShowNew(false);
    await loadThreads(res.data?.id);
  }

  async function moderate(id: string, patch: { locked?: boolean; pinned?: boolean }) {
    const res = await moderateThread(id, patch);
    if (res.error) { setError(res.error); return; }
    await loadThreads(id);
  }

  async function removeThread(id: string) {
    const res = await deleteThread(id);
    if (res.error) { setError(res.error); return; }
    await loadThreads();
  }

  async function removeComment(id: string) {
    const res = await deleteComment(id);
    if (res.error) { setError(res.error); return; }
    if (activeId) void refresh(activeId);
  }

  /**
   * Server truth, not `currentUser.batchId`.
   *
   * The local value can be stale -- batch assignment used to write only to
   * localStorage -- and keying this on it hid the "you are not in a batch"
   * message from exactly the people who needed it, while letting them press a
   * button the database would refuse. Every real batch has two standing rooms,
   * so for a non-staff user "no threads came back" means "no batch".
   */
  const hasBatchRooms = isStaff || threads.length > 0;
  const canStartHere = !!currentUser && (!!topicId || hasBatchRooms);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading discussions…
      </div>
    );
  }

  return (
    <div>
      {/* ---------------------------------------------------------- rooms */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-2 text-sm font-medium rounded-xl border flex items-center gap-1.5 transition ${
              t.id === activeId
                ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {t.kind === "announcements"
              ? <Megaphone className="w-3.5 h-3.5" />
              : <MessagesSquare className="w-3.5 h-3.5" />}
            {t.pinned && <Pin className="w-3 h-3 text-amber-600" />}
            {t.locked && <Lock className="w-3 h-3 text-slate-400" />}
            <span className="truncate max-w-[16rem]">{t.title}</span>
          </button>
        ))}

        {canStartHere && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="px-3 py-2 text-sm font-medium rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New discussion
          </button>
        )}
      </div>

      {showNew && (
        <form onSubmit={startThread} className="mb-4 bg-white border border-slate-200 rounded-2xl p-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={160}
            autoFocus
            placeholder={topicId
              ? "What do you want to discuss about this microtheme?"
              : "What is this room for?"}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">{newTitle.length}/160</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={!newTitle.trim() || creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Start
              </Button>
            </div>
          </div>
        </form>
      )}

      {threads.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-2">💬</div>
          <div className="font-medium text-slate-800 mb-1">No discussions yet</div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {canStartHere
              ? "Start one - a question you got wrong, a fact you cannot place, anything worth a second opinion."
              : "You are not in a batch yet, so there are no rooms to show. Ask your mentor or admin to add you to one."}
          </p>
        </div>
      )}

      {/* ------------------------------------------------- active thread */}
      {active && (
        <>
          <div className="flex items-start gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">{active.title}</div>
              <div className="text-xs text-slate-500">
                {active.created_by_name
                  ? <>started by {active.created_by_name}</>
                  : <>standing room</>}
                {active.locked && " · locked"}
              </div>
            </div>
            {isStaff && (
              <div className="flex items-center gap-1 shrink-0">
                <IconBtn
                  title={active.pinned ? "Unpin" : "Pin to top"}
                  onClick={() => moderate(active.id, { pinned: !active.pinned })}
                >
                  {active.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </IconBtn>
                <IconBtn
                  title={active.locked ? "Unlock" : "Lock (no new replies)"}
                  onClick={() => moderate(active.id, { locked: !active.locked })}
                >
                  {active.locked ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </IconBtn>
                {active.kind === "topic" && (
                  <IconBtn title="Delete discussion" danger onClick={() => removeThread(active.id)}>
                    <Trash2 className="w-4 h-4" />
                  </IconBtn>
                )}
              </div>
            )}
            {!isStaff && active.created_by === currentUser?.id && active.kind === "topic" && (
              <IconBtn title="Delete discussion" danger onClick={() => removeThread(active.id)}>
                <Trash2 className="w-4 h-4" />
              </IconBtn>
            )}
          </div>

          {active.staff_only_post && !isStaff && (
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              Only your mentor can post here.
            </div>
          )}
          {active.locked && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              A mentor locked this discussion. You can read it, but not reply.
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
                onDelete={() => removeComment(c.id)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </>
      )}

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
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition ${
        danger ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
               : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
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
