import { useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useTour } from "@/hooks/useTour";
import { Button } from "@/components/ui/button";
import { AnnouncementsBanner } from "@/components/AnnouncementsBanner";
import { OverrideDecisionBanner } from "@/components/OverrideDecisionBanner";
import { CurrentAffairsDigest } from "@/components/CurrentAffairsDigest";
import { dateForBatchDay, pacingStatus, formatDate, daysUntilBatchStart } from "@/lib/calendar";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Lock, Trophy, Circle, Send, FileText, Library, Sparkles } from "lucide-react";
import { SCOPE_DAYS, type CommitmentScope } from "@/types";

export function StudentHome() {
  const { currentUser, getStudent, setRoute, setActiveDay, setActiveTopicId, topicCleared, dayCleared, completedDays, submitChartForApproval, findTopicLive, batchForStudent } = useAppState();
  const { startTour } = useTour();
  const findTopic = findTopicLive;

  // Auto-fire the Introduction Tour the first time a student lands on home.
  // Wait one frame so the DOM (and data-tour anchors) are present.
  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") return;
    const s = getStudent(currentUser.id);
    if (s.hasSeenTour) return;
    if (s.chart.days.filter((d) => d.length > 0).length === 0) return;
    const t = window.setTimeout(() => startTour(), 200);
    return () => window.clearTimeout(t);
    // Run only when user changes; we don't want to re-fire on every patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const user = currentUser;
  const s = getStudent(user.id);
  const chart = s.chart.days;
  const progress = s.progress;
  if (!chart || chart.filter((d) => d.length > 0).length === 0) return null;

  const totalDays = chart.length;
  const completed = completedDays(user.id);
  const currentDay = progress.currentDay || 1;
  const approvedThrough = s.chart.approvedThrough;
  const batch = batchForStudent(user.id);
  const pacing = batch ? pacingStatus(batch, currentDay) : null;
  const daysToStart = batch ? daysUntilBatchStart(batch) : 0;
  // Whether the student has cleared everything in the currently-approved slice
  // and there are still days beyond it that need a new commitment.
  const sliceCleared = approvedThrough > 0 && completed.length >= approvedThrough;
  const hasMoreToCommit = approvedThrough < totalDays;
  const showRecommit = sliceCleared && hasMoreToCommit && s.chart.status !== "pending_approval";

  const commitNext = (next: CommitmentScope) => {
    submitChartForApproval(user.id, next);
    setRoute("approval_gate");
  };

  const pickTopic = (day: number, topicId: string) => {
    setActiveDay(day);
    setActiveTopicId(topicId);
    setRoute("topic");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <button
        onClick={() => setRoute("dashboard")}
        className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-sm font-semibold text-indigo-600">Your journey</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Day {currentDay} of {totalDays}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setRoute("smart_practice")}>
            <Sparkles className="w-4 h-4" /> Smart practice
          </Button>
          <Button variant="secondary" onClick={() => setRoute("tests")}>
            <FileText className="w-4 h-4" /> Mock tests
          </Button>
          <Button variant="secondary" onClick={() => setRoute("pyq_archive")}>
            <Library className="w-4 h-4" /> PYQ bank
          </Button>
          <Button variant="secondary" data-tour="edit-chart" onClick={() => setRoute("onboarding")}>Edit chart</Button>
        </div>
      </div>

      {/*
        Two-column layout:
        - lg+ grid is [320px | 1fr]: a narrow journey column on the left
          (compact week-grouped path) and a wider content column on the
          right (override / announcements / current affairs). Inverts the
          previous proportions so the high-signal content gets the room
          and the path stops dominating the screen.
        - Mobile: stacks via source order (sidebar/content first, then
          path) — same scroll order students are used to.
      */}
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-6 lg:items-start">
        {/* Content column — notification + discovery. */}
        <aside className="lg:order-2 space-y-5">
          <OverrideDecisionBanner studentId={user.id} />
          <AnnouncementsBanner studentId={user.id} />
          <CurrentAffairsDigest limit={6} />
        </aside>

        {/* Journey column — batch context, recommit, compact week-grouped path. */}
        <section className="lg:order-1 min-w-0 mt-6 lg:mt-0">

      {batch && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-500">{batch.vertical}</div>
          <div className="text-sm font-semibold text-slate-900">{batch.name}</div>
          {pacing && pacing.status !== "not-started" && (
            <div className="text-xs mt-1">
              {pacing.status === "on-schedule" && <span className="text-emerald-700 font-semibold">✓ on schedule (Day {pacing.calendarDay} today)</span>}
              {pacing.status === "ahead" && <span className="text-indigo-700 font-semibold">⏩ {pacing.delta} day{pacing.delta === 1 ? "" : "s"} ahead</span>}
              {pacing.status === "behind" && <span className="text-amber-700 font-semibold">⏰ {-pacing.delta} day{-pacing.delta === 1 ? "" : "s"} behind</span>}
            </div>
          )}
          {pacing && pacing.status === "not-started" && (
            <div className="text-xs text-slate-600 font-semibold mt-1">
              Starts in {daysToStart} day{daysToStart === 1 ? "" : "s"} · {formatDate(batch.startDate)}
            </div>
          )}
        </div>
      )}

      {showRecommit && (
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1 text-sm">
            <Trophy className="w-4 h-4" /> Slice cleared — commit next
          </div>
          <p className="text-xs text-slate-700 mb-2">
            You've cleared Day 1–{approvedThrough}. Pick a slice to submit.
          </p>
          <div className="flex flex-col gap-1.5">
            <Button onClick={() => commitNext("week")}><Send className="w-4 h-4" /> Next week (+{Math.min(SCOPE_DAYS.week, totalDays - approvedThrough)}d)</Button>
            <Button variant="secondary" onClick={() => commitNext("month")}>Next month (+{Math.min(SCOPE_DAYS.month, totalDays - approvedThrough)}d)</Button>
            <Button variant="ghost" onClick={() => commitNext("overall")}>The rest ({totalDays - approvedThrough}d)</Button>
          </div>
        </div>
      )}

      <DayPathByWeek
        chart={chart}
        currentDay={currentDay}
        approvedThrough={approvedThrough}
        completed={completed}
        batch={batch}
        topicCleared={(day, topicId) => topicCleared(user.id, day, topicId)}
        dayCleared={(day) => dayCleared(user.id, day)}
        findTopic={findTopic}
        onPickTopic={pickTopic}
      />
        </section>
      </div>
    </div>
  );
}

/* ---------- Compact week-grouped day path ----------------------------------
 *
 * Replaces the old alternating-sides timeline. Chunks the chart into 7-day
 * weeks; each week is a collapsible section. Current week starts expanded;
 * past weeks collapse to a "X / 7 cleared" summary; future weeks show their
 * locked/beyond-commitment state. Day cards inside an expanded week are
 * single-column and smaller (`w-10 h-10` circle, `p-3` card) so the path
 * stops eating vertical space.
 *
 * Expansion state lives in component-local useState — session-only on
 * purpose; persists nothing across reloads so the change is low-stakes.
 */
function DayPathByWeek({
  chart, currentDay, approvedThrough, completed, batch,
  topicCleared, dayCleared, findTopic, onPickTopic,
}: {
  chart: { topicId: string; subjectId: string }[][];
  currentDay: number;
  approvedThrough: number;
  completed: number[];
  batch: import("@/types").Batch | null;
  topicCleared: (day: number, topicId: string) => boolean;
  dayCleared: (day: number) => boolean;
  findTopic: (id: string) => { subject: { name: string; icon: string }; topic: { id: string; name: string } } | null;
  onPickTopic: (day: number, topicId: string) => void;
}) {
  // Group days into weeks of 7. weeks[w] = array of (dayNum, topics) for week w.
  const weeks: { dayNum: number; topics: { topicId: string; subjectId: string }[] }[][] = [];
  for (let i = 0; i < chart.length; i++) {
    const w = Math.floor(i / 7);
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push({ dayNum: i + 1, topics: chart[i] });
  }
  const currentWeekIdx = Math.floor((currentDay - 1) / 7);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([currentWeekIdx]));
  const toggle = (idx: number) => setExpanded((s) => {
    const n = new Set(s);
    n.has(idx) ? n.delete(idx) : n.add(idx);
    return n;
  });

  return (
    <div data-tour="day-path" className="space-y-2">
      {weeks.map((days, wi) => {
        const startDay = days[0].dayNum;
        const endDay = days[days.length - 1].dayNum;
        const totalInWeek = days.length;
        const clearedInWeek = days.filter((d) => completed.includes(d.dayNum) || dayCleared(d.dayNum)).length;
        const allBeyondCommitment = days.every((d) => d.dayNum > approvedThrough);
        const isOpen = expanded.has(wi);
        const isCurrentWeek = wi === currentWeekIdx;

        return (
          <div key={wi} className={`rounded-2xl border ${isCurrentWeek ? "border-indigo-200 bg-white" : "border-slate-200 bg-white"} overflow-hidden`}>
            <button
              onClick={() => toggle(wi)}
              className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition ${isOpen ? "border-b border-slate-100" : ""} hover:bg-slate-50`}
            >
              {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  Week {wi + 1}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">· Days {startDay}{startDay !== endDay ? `–${endDay}` : ""}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className={clearedInWeek === totalInWeek ? "text-emerald-700 font-semibold" : ""}>
                    {clearedInWeek} / {totalInWeek} cleared
                  </span>
                  {isCurrentWeek && <span className="text-indigo-700 font-semibold">· current week</span>}
                  {allBeyondCommitment && <span className="text-slate-400 font-semibold">· beyond commitment</span>}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-3 py-3 space-y-2">
                {days.map(({ dayNum, topics }) => {
                  const isDone = completed.includes(dayNum) || dayCleared(dayNum);
                  const beyondCommitment = dayNum > approvedThrough;
                  const isCurrent = dayNum === currentDay && !isDone && !beyondCommitment;
                  const isLocked = dayNum > currentDay || beyondCommitment;
                  return (
                    <div
                      key={dayNum}
                      data-tour={isCurrent ? "current-day" : undefined}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                        isDone ? "bg-emerald-50 border-emerald-200"
                        : isCurrent ? "bg-white border-indigo-300 pulse-ring"
                        : "bg-white border-slate-200 opacity-70"
                      }`}
                    >
                      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isDone ? "bg-emerald-500 text-white"
                        : isCurrent ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-400"
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-4 h-4" /> : dayNum}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2 flex-wrap">
                          <span>Day {dayNum}{topics.length > 1 ? ` · ${topics.length} topics` : ""}</span>
                          {batch && (
                            <span className="text-[10px] normal-case font-medium text-slate-500">
                              {formatDate(dateForBatchDay(batch, dayNum))}
                            </span>
                          )}
                          {beyondCommitment && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              beyond
                            </span>
                          )}
                        </div>
                        {topics.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">Unscheduled</div>
                        ) : (
                          <div className="space-y-1">
                            {topics.map((t) => {
                              const info = findTopic(t.topicId);
                              if (!info) return null;
                              const cleared = topicCleared(dayNum, t.topicId);
                              return (
                                <button
                                  key={t.topicId}
                                  disabled={isLocked}
                                  onClick={() => onPickTopic(dayNum, t.topicId)}
                                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${
                                    isLocked ? "cursor-not-allowed"
                                    : "hover:bg-slate-50 cursor-pointer"
                                  } ${cleared ? "bg-emerald-50/60" : "bg-white border border-slate-100"}`}
                                >
                                  {cleared
                                    ? <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    : <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                  }
                                  <span className="text-sm flex-shrink-0">{info.subject.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-slate-500 truncate">{info.subject.name}</div>
                                    <div className="font-semibold text-slate-900 text-xs truncate">{info.topic.name}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
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
  );
}
