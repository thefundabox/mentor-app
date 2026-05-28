import { useAppState } from "@/hooks/useAppState";
import { findTopic } from "@/data";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, ArrowRight, Pencil } from "lucide-react";
import { SCOPE_LABEL } from "@/types";

export function ApprovalGate() {
  const { currentUser, getStudent, setRoute } = useAppState();
  if (!currentUser) return null;
  const s = getStudent(currentUser.id);
  const isPending = s.chart.status === "pending_approval";
  const isChanges = s.chart.status === "changes_requested";

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className={`rounded-2xl border-2 ${isPending ? "border-amber-200 bg-amber-50/40" : "border-rose-200 bg-rose-50/40"} p-8 text-center`}
      >
        <div className={`inline-flex w-16 h-16 items-center justify-center rounded-full ${isPending ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"} mb-4`}>
          {isPending ? <Clock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isPending ? `Waiting for mentor approval — ${SCOPE_LABEL[s.chart.commitmentScope]} plan` : "Mentor requested changes"}
        </h1>
        <p className="text-slate-600 mt-2 max-w-md mx-auto">
          {isPending
            ? `You've committed Day ${s.chart.approvedThrough + 1}–${s.chart.committedThrough} for approval. You'll be notified here when your mentor approves.`
            : "Your mentor reviewed the plan and asked for changes. Update your chart and resubmit."}
        </p>

        {isChanges && s.chart.feedback && (
          <div className="mt-5 mx-auto max-w-lg p-3 rounded-xl bg-white border border-rose-200 text-left">
            <div className="text-xs font-bold uppercase tracking-wide text-rose-700 mb-1">Feedback</div>
            <div className="text-sm text-rose-900">{s.chart.feedback}</div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          {isChanges ? (
            <Button onClick={() => setRoute("onboarding")}>
              Update plan <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setRoute("onboarding")}>
              View / edit my plan <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Your plan</h2>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {s.chart.days.map((topics, i) => {
            const day = i + 1;
            const inCommitted = day <= s.chart.committedThrough;
            const inApproved = day <= s.chart.approvedThrough;
            return (
            <div key={i} className={`flex items-start gap-3 py-2 px-3 rounded-lg ${inApproved ? "bg-emerald-50/40" : inCommitted ? "bg-amber-50/40" : "odd:bg-slate-50"}`}>
              <div className="text-xs font-semibold text-slate-500 w-12 pt-1">
                Day {day}
                {topics.length > 1 && <div className="text-[10px] uppercase font-bold text-indigo-600">×{topics.length}</div>}
                {inApproved && <div className="text-[10px] font-bold text-emerald-700 mt-0.5">approved</div>}
                {!inApproved && inCommitted && <div className="text-[10px] font-bold text-amber-700 mt-0.5">pending</div>}
              </div>
              {topics.length === 0 ? (
                <span className="text-xs text-slate-400 italic">unscheduled</span>
              ) : (
                <div className="flex-1 space-y-1">
                  {topics.map((t) => {
                    const info = findTopic(t.topicId);
                    if (!info) return null;
                    return (
                      <div key={t.topicId} className="flex items-center gap-2">
                        <span className="text-base">{info.subject.icon}</span>
                        <div className="text-sm">
                          <span className="text-slate-500 text-xs">{info.subject.name} · </span>
                          <span className="font-semibold text-slate-900">{info.topic.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
