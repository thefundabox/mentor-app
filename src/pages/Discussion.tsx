import { useAppState } from "@/hooks/useAppState";
import { ArrowLeft } from "lucide-react";
import { DiscussionPanel } from "@/components/DiscussionPanel";

/**
 * Batch discussion.
 *
 * The rooms, composer and moderation all live in DiscussionPanel, which the
 * per-microtheme tab on the topic screen renders too. This page is the batch
 * scope plus a heading.
 */
export function Discussion() {
  const { setRoute, authEnabled } = useAppState();

  if (!authEnabled) {
    return (
      <Shell onBack={() => setRoute("dashboard")}>
        <div className="text-center py-12">
          <div className="text-5xl mb-3">💬</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Discussion needs Supabase</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Comments are shared between real users, so this screen needs a configured
            Supabase project. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and reload.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => setRoute("dashboard")}>
      <div className="mb-6">
        <div className="text-sm font-semibold text-indigo-600">Your batch</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discussion</h1>
        <p className="text-slate-600 mt-1">
          Announcements from your mentor, and rooms anyone can start. For a question
          about a specific microtheme, use the Discuss tab on that topic instead —
          it keeps the answer where the next person will look for it.
        </p>
      </div>

      {/* The "not in a batch" message lives in DiscussionPanel now, where the
          loaded thread list makes it answerable from server state rather than
          from a localStorage value that could be months out of date. */}
      <DiscussionPanel scope={{ batchRooms: true }} />
    </Shell>
  );
}

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
