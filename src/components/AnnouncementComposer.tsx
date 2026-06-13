import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Megaphone, Send, Trash2 } from "lucide-react";

interface Props {
  /** "all" = institute-wide. Otherwise a specific batch id. */
  scopedBatchId: string | "all";
}

export function AnnouncementComposer({ scopedBatchId }: Props) {
  const { announcements, batches, currentUser, postAnnouncement, deleteAnnouncement } = useAppState();
  const [body, setBody] = useState("");
  const [expiresIn, setExpiresIn] = useState<"none" | "1d" | "3d" | "7d">("none");

  const targetBatch = scopedBatchId === "all" ? null : batches.find((b) => b.id === scopedBatchId) || null;

  const scopeLabel = scopedBatchId === "all"
    ? "institute-wide (every student)"
    : `${targetBatch?.name || "batch"}`;

  // Recent announcements posted by this mentor that match the current scope.
  const recent = useMemo(() => {
    if (!currentUser) return [];
    return announcements
      .filter((a) => a.postedBy === currentUser.id)
      .filter((a) => scopedBatchId === "all" ? a.batchId === null : a.batchId === scopedBatchId)
      .sort((a, b) => b.postedAt - a.postedAt)
      .slice(0, 5);
  }, [announcements, currentUser, scopedBatchId]);

  const expiresAt = useMemo(() => {
    if (expiresIn === "none") return undefined;
    const days = expiresIn === "1d" ? 1 : expiresIn === "3d" ? 3 : 7;
    return Date.now() + days * 86400000;
  }, [expiresIn]);

  const post = () => {
    if (!body.trim()) return;
    postAnnouncement(scopedBatchId === "all" ? null : scopedBatchId, body, expiresAt);
    setBody("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-slate-900">Post announcement</h2>
        <span className="text-xs text-slate-500">to {scopeLabel}</span>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2}
        placeholder="e.g. Today's mock test moved to 5 PM. Please come prepared."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-sm resize-y" />
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Auto-expire:</span>
          <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
            className="px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <option value="none">never</option>
            <option value="1d">in 1 day</option>
            <option value="3d">in 3 days</option>
            <option value="7d">in 7 days</option>
          </select>
        </div>
        <Button onClick={post} disabled={!body.trim()}>
          <Send className="w-4 h-4" /> Post
        </Button>
      </div>

      {recent.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Recent posts</div>
          <div className="space-y-2">
            {recent.map((a) => {
              const ago = Math.max(1, Math.floor((Date.now() - a.postedAt) / 3600000));
              const agoLabel = ago < 24 ? `${ago}h ago` : `${Math.floor(ago / 24)}d ago`;
              const seenCount = a.dismissedBy.length;
              return (
                <div key={a.id} className="flex items-start gap-2 text-xs bg-slate-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-700 line-clamp-2">{a.body}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {agoLabel} · {seenCount} dismissed
                      {a.expiresAt && a.expiresAt < Date.now() && <span className="ml-2 text-rose-500">expired</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteAnnouncement(a.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
