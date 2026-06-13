import { FileText, Video, ExternalLink } from "lucide-react";
import type { Topic } from "@/types";

/** Embeds a YouTube/Vimeo link as an iframe; otherwise falls back to <video>. */
function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt[1]}`}
        title="Video"
        className="w-full aspect-video rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeo[1]}`}
        title="Video"
        className="w-full aspect-video rounded-xl"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video src={url} controls className="w-full rounded-xl bg-slate-900" style={{ maxHeight: 400 }} />
  );
}

export function TopicMediaCard({ topic }: { topic: Topic }) {
  const hasVideo = !!topic.videoUrl;
  const docs = topic.documents || [];
  if (!hasVideo && docs.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
      {hasVideo && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-indigo-600" />
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">Video</div>
          </div>
          <VideoEmbed url={topic.videoUrl!} />
        </div>
      )}

      {docs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">Documents</div>
          </div>
          <div className="space-y-1">
            {docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="flex-1 truncate text-slate-800">{d.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
