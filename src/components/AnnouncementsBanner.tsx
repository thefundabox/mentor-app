import { Megaphone, X } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";

export function AnnouncementsBanner({ studentId }: { studentId: string }) {
  const { announcementsForStudent, dismissAnnouncement, users } = useAppState();
  const list = announcementsForStudent(studentId);
  if (list.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {list.map((a) => {
        const poster = users.find((u) => u.id === a.postedBy);
        const ago = Math.max(1, Math.floor((Date.now() - a.postedAt) / 3600000));
        const agoLabel = ago < 24 ? `${ago}h ago` : `${Math.floor(ago / 24)}d ago`;
        return (
          <div key={a.id} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex gap-3 items-start">
            <Megaphone className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-800 whitespace-pre-wrap">{a.body}</div>
              <div className="text-[10px] uppercase font-semibold text-indigo-700 mt-1">
                {poster?.name || "Mentor"} · {agoLabel}
                {a.batchId === null && <span className="ml-2 text-slate-500">institute-wide</span>}
              </div>
            </div>
            <button onClick={() => dismissAnnouncement(a.id, studentId)}
              className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
