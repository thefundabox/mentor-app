import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import type { PYQ } from "@/types";
import { topicQuestions, topicNotes, MAINS_PROMPT } from "@/data";
import { loadPool, buildAttempt, describeAttempt } from "@/lib/topicPool";
import { Button } from "@/components/ui/button";
import { TopicMediaCard } from "@/components/TopicMediaCard";
import {
  BookOpen,
  Sparkles,
  Trophy,
  ArrowRight,
} from "lucide-react";

interface TopicScreenProps {
  dayNum: number;
}

export function TopicScreen({ dayNum }: TopicScreenProps) {
  const { currentUser, getStudent, setRoute, setAttemptSeed, addOverride, activeDay, activeTopicId, setActiveTopicId, topicCleared, markTopicStudied, topicHasQuestions, findTopicLive: findTopic } = useAppState();
  if (!currentUser) return null;
  const user = currentUser;
  const student = getStudent(user.id);
  const topicsInDay = student.chart.days[dayNum - 1] || [];

  // Resolve which topic the user is on. Fall back to the first un-cleared one,
  // or the first topic if all are cleared.
  const resolvedTopicId = activeTopicId && topicsInDay.some((t) => t.topicId === activeTopicId)
    ? activeTopicId
    : (topicsInDay.find((t) => !topicCleared(user.id, dayNum, t.topicId))?.topicId
       || topicsInDay[0]?.topicId
       || null);

  const slot = topicsInDay.find((t) => t.topicId === resolvedTopicId);
  const [tab, setTab] = useState("notes");

  // Describe the actual paper rather than a hardcoded "16 questions". Loads the
  // same pool the attempt will use, so the count on this screen is the count
  // the student gets.
  const [attemptSummary, setAttemptSummary] = useState("Loading the question bank\u2026");
  useEffect(() => {
    if (!resolvedTopicId) return;
    let cancelled = false;
    void loadPool(resolvedTopicId).then((qs) => {
      if (cancelled) return;
      setAttemptSummary(describeAttempt(buildAttempt(qs, 0)));
    });
    return () => { cancelled = true; };
  }, [resolvedTopicId]);

  if (!slot || !resolvedTopicId) return null;

  const info = findTopic(slot.topicId);
  const notes = topicNotes(slot.topicId);
  // 68 of 243 microthemes have a real question bank. The rest are cleared by
  // studying rather than by a quiz on unrelated content.
  const hasBank = topicQuestions(resolvedTopicId).length > 0 || topicHasQuestions(resolvedTopicId);
  const studied = topicCleared(user.id, dayNum, resolvedTopicId);
  if (!info) return null;

  // Most recent override on this day — drives the QuizTab status messages.
  const dayOverride = [...student.overrides]
    .filter((o) => o.day === dayNum)
    .sort((a, b) => b.id - a.id)[0] || null;

  const pickTopic = (tid: string) => {
    if (tid === resolvedTopicId) return;
    setActiveTopicId(tid);
    setTab("notes");
  };

  const handleStartQuiz = () => {
    setAttemptSeed((s: number) => s + 7);
    setActiveTopicId(resolvedTopicId);
    setRoute("quiz");
  };

  const handleBack = () => { setRoute("home"); };

  const handleMarkStudied = () => {
    if (!resolvedTopicId) return;
    markTopicStudied(user.id, dayNum, resolvedTopicId);
  };

  const handleRequestOverride = () => {
    if (!activeDay) return;
    if (student.overrides.some((o) => o.day === activeDay && o.status === "pending")) return;
    const dayAttempts = student.attempts.filter((a) => a.day === activeDay);
    const bestScore = dayAttempts.length ? Math.max(...dayAttempts.map((a) => a.score)) : 0;
    addOverride(user.id, {
      id: Date.now(), day: activeDay, status: "pending",
      attempts: dayAttempts.length, bestScore,
    });
    alert("Override request sent to your mentor.");
  };

  const tabs = [
    { key: "notes", label: "Notes", Icon: BookOpen },
    { key: "quiz", label: "Quiz", Icon: Sparkles },
    { key: "pyqs", label: "PYQs", Icon: Trophy },
    { key: "mains", label: "Mains", Icon: BookOpen },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button
        onClick={handleBack}
        className="text-sm text-slate-500 hover:text-slate-800 mb-3 transition"
      >
        ← back to path
      </button>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-sm font-semibold text-indigo-600">
            Day {dayNum} · {info.subject.name}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {info.topic.name}
          </h1>
        </div>
      </div>

      {topicsInDay.length > 1 && (
        <div className="mb-5 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <div className="text-[10px] uppercase font-bold text-indigo-700 mb-2 tracking-wide">
            Day {dayNum} has {topicsInDay.length} topics · clear each to unlock day {dayNum + 1}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topicsInDay.map((t) => {
              const ti = findTopic(t.topicId);
              if (!ti) return null;
              const cleared = topicCleared(user.id, dayNum, t.topicId);
              const active = t.topicId === resolvedTopicId;
              return (
                <button key={t.topicId} onClick={() => pickTopic(t.topicId)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                    active ? "bg-white border-indigo-400 text-indigo-700 font-semibold shadow-sm"
                    : cleared ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                  }`}>
                  {cleared ? "✓" : "○"} {ti.topic.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition ${
              tab === key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "notes" && (
            <>
              <TopicMediaCard topic={info.topic} />
              <NotesTab
                notes={notes}
                onStartQuiz={handleStartQuiz}
                onMarkStudied={handleMarkStudied}
                hasBank={hasBank}
                studied={studied}
                dayNum={dayNum}
              />
            </>
          )}
          {tab === "quiz" && (
            <QuizTab
              attemptSummary={attemptSummary}
              onStartQuiz={handleStartQuiz}
              onMarkStudied={handleMarkStudied}
              hasBank={hasBank}
              studied={studied}
              dayOverride={dayOverride}
              onRequestOverride={handleRequestOverride}
            />
          )}
          {tab === "pyqs" && (
            <PYQsTab
              topicId={resolvedTopicId}
              subjectId={info.subject.id}
              subjectName={info.subject.name}
            />
          )}
          {tab === "mains" && <MainsTab dayNum={dayNum} topicId={resolvedTopicId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Notes Tab ---
function NotesTab({
  notes,
  onStartQuiz,
  onMarkStudied,
  hasBank,
  studied,
  dayNum,
}: {
  notes: string | null;
  onStartQuiz: () => void;
  onMarkStudied: () => void;
  hasBank: boolean;
  studied: boolean;
  dayNum: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-8">
        {notes ? (
          <article className="prose prose-slate max-w-none">
            {notes.split("\n").map((line, i) => {
              if (line.startsWith("# "))
                return (
                  <h1 key={i} className="text-2xl font-bold mt-0 mb-4 text-slate-900">
                    {line.slice(2)}
                  </h1>
                );
              if (line.startsWith("## "))
                return (
                  <h2 key={i} className="text-xl font-bold mt-6 mb-2 text-slate-900">
                    {line.slice(3)}
                  </h2>
                );
              if (line.startsWith("- "))
                return (
                  <li key={i} className="ml-6 list-disc text-slate-700">
                    {renderInline(line.slice(2))}
                  </li>
                );
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return (
                <p key={i} className="text-slate-700 leading-relaxed">
                  {renderInline(line)}
                </p>
              );
            })}
          </article>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📄</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              No notes for this topic yet
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Study from your own material for now. Your institute adds notes as
              each microtheme is written up.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
            When you&apos;re ready
          </div>
          {hasBank ? (
            <>
              <p className="text-sm text-slate-600 mb-3">
                Score ≥ 80% on the quiz to unlock Day {dayNum + 1}.
              </p>
              <Button className="w-full" onClick={onStartQuiz}>
                Start quiz <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">
                No question bank for this microtheme yet. Work through the notes,
                then mark it studied to move on.
              </p>
              <Button className="w-full" variant="secondary" disabled={studied} onClick={onMarkStudied}>
                {studied ? "✓ Marked as studied" : "Mark as studied"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Quiz Tab ---
function QuizTab({
  attemptSummary,
  onStartQuiz,
  onMarkStudied,
  hasBank,
  studied,
  dayOverride,
  onRequestOverride,
}: {
  attemptSummary: string;
  onStartQuiz: () => void;
  onMarkStudied: () => void;
  hasBank: boolean;
  studied: boolean;
  dayOverride: import("@/types").Override | null;
  onRequestOverride: () => void;
}) {
  const status = dayOverride?.status;

  // No bank for this microtheme — offer the honest path rather than a quiz on
  // someone else's topic.
  if (!hasBank) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">📚</div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">No quiz for this topic yet</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          We only quiz on microthemes where we have real RAS past questions. This
          one is still being built out — study the notes and mark it done to keep
          your plan moving.
        </p>
        <Button variant="secondary" disabled={studied} onClick={onMarkStudied}>
          {studied ? "✓ Marked as studied" : "Mark as studied"}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <div className="text-5xl mb-3">✨</div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">
        Ready to attempt?
      </h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        {attemptSummary} Answer them in any order, flag anything you want to revisit,
        then submit once — solutions come after, not during.
      </p>
      <Button onClick={onStartQuiz}>
        Start quiz
      </Button>

      {status === "approved" && (
        <div className="mt-4 inline-block text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-medium">
          ✓ Mentor override granted — you can proceed without 80%.
        </div>
      )}

      {status === "pending" && (
        <div className="mt-4 inline-block text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
          ⏳ Override request sent — waiting for your mentor.
        </div>
      )}

      {status === "declined" && (
        <div className="mt-4 inline-block text-left text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <div className="font-semibold">✗ Override declined</div>
          <div className="text-xs mt-0.5">Your mentor wants you to keep trying. Try the quiz again with a fresh question set.</div>
          {dayOverride?.mentorNote && (
            <div className="text-xs mt-1 italic">"{dayOverride.mentorNote}"</div>
          )}
          <button onClick={onRequestOverride}
            className="text-xs underline mt-2 text-rose-600 hover:text-rose-800">
            Send a new request
          </button>
        </div>
      )}

      {!status && (
        <div className="mt-6">
          <button
            onClick={onRequestOverride}
            className="text-sm text-slate-500 hover:text-slate-800 underline transition"
          >
            Stuck? Request mentor override
          </button>
        </div>
      )}
    </div>
  );
}

// --- PYQs Tab ---
/**
 * Past questions for the microtheme actually on screen.
 *
 * This used to render PYQS_MEWAR unconditionally, so every one of the 243
 * microthemes showed the same handful of Maharana Pratap questions — the same
 * shape of bug the quiz had, where the topic was ignored and one demo pool was
 * served to everybody.
 *
 * Two tiers, because the bank is tagged unevenly: entries carrying this
 * topic id are the real match, and the rest of the subject is offered
 * separately rather than passed off as microtheme-specific. Note that no
 * seeded PYQ currently carries a topic id that exists in the syllabus, so in
 * practice today every match arrives through the subject tier.
 */
function PYQsTab({ topicId, subjectId, subjectName }: { topicId: string; subjectId: string; subjectName: string }) {
  const { pyqBank, setRoute } = useAppState();

  const { onTopic, onSubject } = useMemo(() => {
    const onTopic: PYQ[] = [];
    const onSubject: PYQ[] = [];
    for (const p of pyqBank) {
      if ((p.topicIds || []).includes(topicId)) onTopic.push(p);
      else if ((p.subjectIds || []).includes(subjectId)) onSubject.push(p);
    }
    return { onTopic, onSubject };
  }, [pyqBank, topicId, subjectId]);

  if (onTopic.length === 0 && onSubject.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="text-slate-800 font-medium mb-1">No past questions tagged to this microtheme yet</div>
        <div className="text-sm text-slate-500 mb-4">
          Nothing in the PYQ bank is tagged to {subjectName}. Showing questions from
          another subject here would only mislead you.
        </div>
        <button
          onClick={() => setRoute("pyq_archive")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Browse the full PYQ archive →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onTopic.map((pyq, i) => (
        <PYQCard key={pyq.id ?? `topic-${i}`} pyq={pyq} />
      ))}
      {onSubject.length > 0 && (
        <>
          <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {onTopic.length > 0 ? `Also from ${subjectName}` : `From ${subjectName}`}
          </div>
          {onSubject.map((pyq, i) => (
            <PYQCard key={pyq.id ?? `subject-${i}`} pyq={pyq} />
          ))}
        </>
      )}
    </div>
  );
}

function PYQCard({ pyq }: { pyq: PYQ }) {
  const [open, setOpen] = useState(false);
  const { currentUser, markPyqReviewed } = useAppState();

  const reveal = () => {
    setOpen(true);
    if (currentUser) markPyqReviewed(currentUser.id, pyq.year);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
      <div className="text-xs font-semibold text-indigo-600 mb-1">{pyq.year}</div>
      <div className="text-slate-800 mb-3">{pyq.q}</div>
      {!open ? (
        <button
          onClick={reveal}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Reveal answer (+10 XP)
        </button>
      ) : (
        <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-sm">
            <span className="font-semibold text-emerald-700">Answer:</span>{" "}
            {pyq.a}
          </div>
          <div className="text-sm text-slate-600 mt-1">{pyq.explain}</div>
        </div>
      )}
    </div>
  );
}

// --- Mains Tab ---
function MainsTab({ dayNum, topicId }: { dayNum: number; topicId: string }) {
  const [mainsAnswer, setMainsAnswer] = useState("");
  const [mainsResult, setMainsResult] = useState<{
    score: number;
    hits: string[];
    missed: string[];
    words: number;
  } | null>(null);
  const { currentUser, addMainsScore } = useAppState();

  const evaluateMains = () => {
    const text = mainsAnswer.toLowerCase();
    const hits = MAINS_PROMPT.rubric.filter((k) => text.includes(k.toLowerCase()));
    const missed = MAINS_PROMPT.rubric.filter((k) => !text.includes(k.toLowerCase()));
    const score = Math.round((hits.length / MAINS_PROMPT.rubric.length) * 100);
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    setMainsResult({ score, hits, missed, words: wordCount });
    if (currentUser) addMainsScore(currentUser.id, { day: dayNum, topicId, score, when: Date.now() });
  };

  const wordCount = mainsAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6">
      <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
        Mains practice · 250 words
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {MAINS_PROMPT.prompt}
      </h3>
      <textarea
        value={mainsAnswer}
        onChange={(e) => setMainsAnswer(e.target.value)}
        rows={10}
        placeholder="Write your answer here. Cover strategy (terrain, guerrilla), allies (Bhils, Bhama Shah), key events (Haldighati, Dewair), and symbolic legitimacy (Eklingji)."
        className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-y text-slate-800"
      />
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-slate-500">Words: {wordCount}</div>
        <Button
          disabled={mainsAnswer.trim().length < 30}
          onClick={evaluateMains}
        >
          Evaluate answer
        </Button>
      </div>

      {mainsResult && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`text-3xl font-bold ${
                mainsResult.score >= 70
                  ? "text-emerald-600"
                  : mainsResult.score >= 40
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {mainsResult.score}%
            </div>
            <div className="text-sm text-slate-500">
              Coverage of rubric points · {mainsResult.words} words
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-semibold uppercase text-emerald-700 mb-2">
                Covered
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mainsResult.hits.length === 0 ? (
                  <span className="text-sm text-emerald-700/70">None yet</span>
                ) : (
                  mainsResult.hits.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-1 rounded-md bg-white text-emerald-700 border border-emerald-200"
                    >
                      {h}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <div className="text-xs font-semibold uppercase text-rose-700 mb-2">
                Strengthen these
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mainsResult.missed.length === 0 ? (
                  <span className="text-sm text-rose-700/70">
                    Excellent — all rubric points covered.
                  </span>
                ) : (
                  mainsResult.missed.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-1 rounded-md bg-white text-rose-700 border border-rose-200"
                    >
                      {h}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 italic">
            Production: this would call the Claude API with the answer + rubric
            for structured, paragraph-by-paragraph feedback.
          </div>
        </div>
      )}
    </div>
  );
}

// --- Inline text renderer for bold markdown ---
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
