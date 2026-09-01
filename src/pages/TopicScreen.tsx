import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { topicQuestions, topicNotes, MAINS_PROMPT } from "@/data";
import { loadPool, buildAttempt, describeAttempt } from "@/lib/topicPool";
import { resumableSeed } from "@/lib/attemptDraft";
import { loadPyqs } from "@/lib/pyqStore";
import { DiscussionPanel } from "@/components/DiscussionPanel";
import { passThresholdOf } from "@/lib/passThreshold";
import { Button } from "@/components/ui/button";
import { TopicMediaCard } from "@/components/TopicMediaCard";
import {
  BookOpen,
  Sparkles,
  Trophy,
  MessagesSquare,
  ArrowRight,
} from "lucide-react";

import { GuideNote } from "@/components/GuideNote";
interface TopicScreenProps {
  dayNum: number;
}

export function TopicScreen({ dayNum }: TopicScreenProps) {
  const { currentUser, getStudent, setRoute, setAttemptSeed, addOverride, activeDay, activeTopicId, setActiveTopicId, topicCleared, markTopicStudied, topicHasQuestions, findTopicLive: findTopic, ensureQuestionCoverage } = useAppState();

  // Which topics have questions decides what this screen offers, so ask for it
  // here rather than on every sign-in.
  useEffect(() => { void ensureQuestionCoverage(); }, [ensureQuestionCoverage]);
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
  // The bar this student's mentor set, not a constant baked into the copy.
  const passMark = passThresholdOf(student);
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
    // Resume rather than re-deal when an unfinished attempt at this topic is
    // sitting on disk. The seed decides the question order, so bumping it here
    // would build a different paper and strand the student's saved answers
    // under a key nothing would ever look up again.
    const resume = resumableSeed(user.id, dayNum, resolvedTopicId);
    if (resume !== null) setAttemptSeed(resume);
    else setAttemptSeed((s: number) => s + 7);
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
    { key: "discuss", label: "Discuss", Icon: MessagesSquare },
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

      {/* What finishing a microtheme actually means. Reading it is the easy
          half, and the half students stop at. */}
      <GuideNote className="mb-5">
        Read it once, then attempt the questions before you move on. A microtheme
        you have read but never been tested on is not finished &mdash; the paper
        will not ask whether you read it.
      </GuideNote>

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
                passMark={passMark}
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
          {/* Keyed on the microtheme, not the batch: a doubt about this topic is
              worth the same to every student, and per-cohort copies would split a
              small group into rooms of one. */}
          {tab === "discuss" && <DiscussionPanel scope={{ topicId: resolvedTopicId }} />}
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
  passMark,
}: {
  notes: string | null;
  onStartQuiz: () => void;
  onMarkStudied: () => void;
  hasBank: boolean;
  studied: boolean;
  dayNum: number;
  passMark: number;
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
                Score ≥ {passMark}% on the quiz to unlock Day {dayNum + 1}.
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
          ✓ Mentor override granted — you can proceed without reaching the pass mark.
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
 * Past questions for the microtheme on screen.
 *
 * Twice now this tab has shown the wrong thing. First it rendered PYQS_MEWAR
 * unconditionally, so all 243 microthemes showed the same Maharana Pratap
 * questions. Then it led with the seven hand-entered prose cards -- stem,
 * answer and explanation all visible at once -- which on the 82 microthemes
 * with no real past question was the only thing a student saw, and looked like
 * the attemptable mode had never shipped. Those cards are gone from here.
 *
 * Both counts are offered because the arithmetic is unforgiving: four papers is
 * 546 usable questions across 243 microthemes, so 82 have none and another 86
 * have one or two. A microtheme-only tab would be empty two thirds of the time.
 * When the microtheme has nothing, say so plainly -- that is a real signal
 * about yield -- and offer the subject set instead.
 */
function PYQsTab({ topicId, subjectId, subjectName }: { topicId: string; subjectId: string; subjectName: string }) {
  const { setRoute, setPyqTarget } = useAppState();

  // Two counts, because one microtheme rarely holds enough past questions to be
  // worth sitting on its own. Four papers is 600 questions spread over 243
  // microthemes: 82 have none at all and another 86 have one or two. Offering
  // only the microtheme would leave two thirds of the syllabus showing an empty
  // tab, so the subject is offered alongside it.
  const [counts, setCounts] = useState<{ topic: number; subject: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadPyqs({ label: "", topicId }),
      loadPyqs({ label: "", subjectId }),
    ]).then(([t, sub]) => {
      if (!cancelled) setCounts({ topic: t.length, subject: sub.length });
    });
    return () => { cancelled = true; };
  }, [topicId, subjectId]);

  const attempt = (target: { label: string; topicId?: string; subjectId?: string }) => {
    setPyqTarget(target);
    setRoute("pyq_attempt");
  };

  if (counts === null) {
    return <div className="text-sm text-slate-500 px-1 py-4">Checking the past-paper bank...</div>;
  }

  if (counts.subject === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <div className="text-slate-800 font-medium mb-1">No past questions for {subjectName} yet</div>
        <div className="text-sm text-slate-500 mb-4">
          Nothing in the past-paper bank is tagged to this subject. Showing questions
          from another subject here would only mislead you.
        </div>
        <button
          onClick={() => setRoute("pyq_archive")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Browse the full PYQ archive &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {counts.topic > 0 ? (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-900">
              {counts.topic} past question{counts.topic === 1 ? "" : "s"} on this microtheme
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Exactly what RPSC has asked here. Answers stay hidden until you submit,
            then every question is shown with the official key.
          </p>
          <Button onClick={() => attempt({ label: subjectName, topicId })}>
            Attempt these questions
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-900 mb-1">
            RPSC has not asked this microtheme directly
          </div>
          <p className="text-sm text-slate-600">
            No past question in the bank is tagged to it. That is worth knowing in
            itself -- it is a low-yield microtheme, not a gap in the app.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-900">
            {counts.subject} past question{counts.subject === 1 ? "" : "s"} across {subjectName}
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Every past question from this subject, newest paper first, in the order
          RPSC printed them.
        </p>
        <Button
          variant={counts.topic > 0 ? "outline" : "default"}
          onClick={() => attempt({ label: subjectName, subjectId })}
        >
          Attempt the {subjectName} set
        </Button>
      </div>
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
