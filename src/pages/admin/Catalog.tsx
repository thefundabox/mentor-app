/**
 * Admin → Catalog.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Archive, RotateCw } from "lucide-react";
import type { SubjectCatalogEntry } from "@/types";

export function CatalogTab() {
  const { subjects, upsertSubject, archiveSubject, upsertTopic, removeTopic } = useAppState();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [newSubjectName, setNewSubjectName] = useState("");

  const toggle = (id: string) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    const id = "subj_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) + "_" + Date.now().toString(36).slice(-4);
    upsertSubject({ id, name, icon: "📘", color: "slate", topics: [] });
    setNewSubjectName("");
  };

  const showArchived = subjects.some((s) => s.archived);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-900 mb-2">Add subject</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="e.g. Indian Society" value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSubject(); }}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <Button onClick={addSubject} disabled={!newSubjectName.trim()}><Plus className="w-4 h-4" /> Add</Button>
        </div>
        <div className="text-xs text-slate-500 mt-2">After creating, expand the subject below to add topics.</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Subject master ({subjects.filter((s) => !s.archived).length} active{showArchived ? ` · ${subjects.filter((s) => s.archived).length} archived` : ""})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {subjects.map((s) => (
            <SubjectRow key={s.id} subject={s}
              open={!!openIds[s.id]} onToggle={() => toggle(s.id)}
              onRename={(name) => upsertSubject({ ...s, name })}
              onArchive={() => archiveSubject(s.id)}
              onRestore={() => upsertSubject({ ...s, archived: false })}
              onAddTopic={(name) => {
                const tid = "t_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24) + "_" + Date.now().toString(36).slice(-4);
                upsertTopic(s.id, { id: tid, name });
              }}
              onRenameTopic={(tid, name) => {
                // Spread the existing topic: a bare { id, name } would drop the
                // microtheme's theme grouping, difficultyTier, rajasthanSpecific
                // flag and any attached video / documents.
                const prev = s.topics.find((t) => t.id === tid);
                upsertTopic(s.id, { ...prev, id: tid, name });
              }}
              onRemoveTopic={(tid) => removeTopic(s.id, tid)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectRow({ subject, open, onToggle, onRename, onArchive, onRestore, onAddTopic, onRenameTopic, onRemoveTopic }: {
  subject: SubjectCatalogEntry;
  open: boolean; onToggle: () => void;
  onRename: (name: string) => void;
  onArchive: () => void;
  onRestore: () => void;
  onAddTopic: (name: string) => void;
  onRenameTopic: (id: string, name: string) => void;
  onRemoveTopic: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [newTopic, setNewTopic] = useState("");

  return (
    <div className={subject.archived ? "opacity-60" : ""}>
      <div className="px-5 py-3 flex items-center gap-3">
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-700">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="text-xl">{subject.icon}</span>
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => { onRename(name); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name); setEditing(false); } }}
            autoFocus
            className="flex-1 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-slate-400 text-sm" />
        ) : (
          <div className="flex-1 font-semibold text-slate-900">{subject.name}</div>
        )}
        <span className="text-xs text-slate-500">{subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}</span>
        {subject.archived && <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">archived</span>}
        <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-700" title="rename">
          <Pencil className="w-4 h-4" />
        </button>
        {subject.archived ? (
          <button onClick={onRestore} className="text-slate-400 hover:text-emerald-700" title="restore">
            <RotateCw className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={onArchive} className="text-slate-400 hover:text-rose-500" title="archive">
            <Archive className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && !subject.archived && (
        <div className="px-5 pb-3 pl-14 space-y-1">
          {subject.topics.map((t) => (
            <TopicRow key={t.id} topic={t} subjectId={subject.id}
              onRename={(name) => onRenameTopic(t.id, name)}
              onRemove={() => onRemoveTopic(t.id)} />
          ))}
          <div className="flex gap-2 pt-2">
            <input type="text" placeholder="new topic name" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTopic.trim()) { onAddTopic(newTopic.trim()); setNewTopic(""); } }}
              className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-slate-400 text-sm" />
            <button onClick={() => { if (newTopic.trim()) { onAddTopic(newTopic.trim()); setNewTopic(""); } }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
              Add topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, subjectId, onRename, onRemove }: {
  topic: import("@/types").Topic;
  subjectId: string;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const { upsertTopic } = useAppState();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);
  const [showMedia, setShowMedia] = useState(false);
  const [videoUrl, setVideoUrl] = useState(topic.videoUrl || "");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const docs = topic.documents || [];
  const mediaCount = (topic.videoUrl ? 1 : 0) + docs.length;

  const updateMedia = (patch: Partial<import("@/types").Topic>) => {
    upsertTopic(subjectId, { ...topic, ...patch });
  };

  const addDoc = () => {
    if (!docUrl.trim()) return;
    updateMedia({ documents: [...docs, { name: docName.trim() || docUrl.trim(), url: docUrl.trim() }] });
    setDocName(""); setDocUrl("");
  };

  const removeDoc = (idx: number) => {
    updateMedia({ documents: docs.filter((_, i) => i !== idx) });
  };

  const onDocFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updateMedia({ documents: [...docs, { name: file.name, url: String(e.target?.result || "") }] });
    };
    reader.readAsDataURL(file);
  };

  const onVideoFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateMedia({ videoUrl: String(e.target?.result || "") });
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-md hover:bg-slate-50">
      <div className="flex items-center gap-2 py-1 px-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
            onBlur={() => { onRename(name); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name); setEditing(false); } }}
            className="flex-1 px-2 py-1 rounded border border-slate-200 outline-none focus:border-slate-400 text-sm" />
        ) : (
          <div className="flex-1 text-sm text-slate-800">{topic.name}</div>
        )}
        <button onClick={() => setShowMedia((v) => !v)}
          className={`text-xs px-2 py-0.5 rounded ${mediaCount > 0 ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-400 hover:text-slate-700"}`}
          title="media">
          {mediaCount > 0 ? `📎 ${mediaCount}` : "📎"}
        </button>
        <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-slate-700" title="rename">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-500" title="remove">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showMedia && (
        <div className="ml-6 mb-2 p-2 bg-slate-50 rounded-lg space-y-2">
          {/* Video */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Video URL</label>
            <div className="flex gap-1 mt-0.5">
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                onBlur={() => updateMedia({ videoUrl: videoUrl.trim() || undefined })}
                placeholder="YouTube / Vimeo / direct mp4 URL"
                className="flex-1 px-2 py-1 rounded border border-slate-200 outline-none text-xs" />
              <label className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-white cursor-pointer">
                upload
                <input type="file" accept="video/*" className="hidden"
                  onChange={(e) => onVideoFile(e.target.files?.[0])} />
              </label>
              {topic.videoUrl && (
                <button onClick={() => { setVideoUrl(""); updateMedia({ videoUrl: undefined }); }}
                  className="text-xs text-slate-400 hover:text-rose-500 px-1">×</button>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Documents ({docs.length})</label>
            {docs.length > 0 && (
              <div className="space-y-1 mt-0.5">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <span className="flex-1 truncate text-slate-700">{d.name}</span>
                    <button onClick={() => removeDoc(i)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1 mt-1">
              <input value={docName} onChange={(e) => setDocName(e.target.value)}
                placeholder="label (opt)"
                className="w-24 px-2 py-1 rounded border border-slate-200 outline-none text-xs" />
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)}
                placeholder="PDF URL"
                className="flex-1 px-2 py-1 rounded border border-slate-200 outline-none text-xs" />
              <button onClick={addDoc} disabled={!docUrl.trim()}
                className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40">add</button>
              <label className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-white cursor-pointer">
                upload
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => onDocFile(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Stats tab ==================== */
