import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState } from "@/hooks/useAppState";
import { topicNotes, PYQS_MEWAR, MAINS_PROMPT } from "@/data";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  Trophy,
  ArrowRight,
  Upload,
} from "lucide-react";

interface TopicScreenProps {
  dayNum: number;
}

export function TopicScreen({ dayNum }: TopicScreenProps) {
  const { currentUser, getStudent, setRoute, setAttemptSeed, addOverride, activeDay, activeTopicId, setActiveTopicId, topicCleared, findTopicLive: findTopic } = useAppState();
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
  const [uploaded, setUploaded] = useState<string | null>(null);

  if (!slot || !resolvedTopicId) return null;

  const info = findTopic(slot.topicId);
  const notes = topicNotes(slot.topicId);
  if (!info) return null;

  const hasOverride = student.overrides.some(
    (o) => o.day === dayNum && o.status === "approved"
  );

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
            <NotesTab
              notes={notes}
              uploaded={uploaded}
              setUploaded={setUploaded}
              onStartQuiz={handleStartQuiz}
              dayNum={dayNum}
            />
          )}
          {tab === "quiz" && (
            <QuizTab
              onStartQuiz={handleStartQuiz}
              hasOverride={hasOverride}
              onRequestOverride={handleRequestOverride}
            />
          )}
          {tab === "pyqs" && <PYQsTab />}
          {tab === "mains" && <MainsTab dayNum={dayNum} topicId={resolvedTopicId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Notes Tab ---
function NotesTab({
  notes,
  uploaded,
  setUploaded,
  onStartQuiz,
  dayNum,
}: {
  notes: string | null;
  uploaded: string | null;
  setUploaded: (name: string | null) => void;
  onStartQuiz: () => void;
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
              Notes coming soon
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              For this topic, notes will be AI-generated based on the syllabus,
              or your institute can upload a PDF.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
            Source
          </div>
          <label className="block w-full cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setUploaded(e.target.files?.[0]?.name || null)
              }
              className="hidden"
            />
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl p-4 text-center transition">
              <div className="text-sm font-medium text-slate-700 flex items-center justify-center gap-2">
                {uploaded ? (
                  <>
                    <Upload className="w-4 h-4" /> {uploaded}
                  </>
                ) : (
                  "Upload PDF notes"
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {uploaded ? "stub — not parsed" : "or use AI-generated above"}
              </div>
            </div>
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5">
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
            When you&apos;re ready
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Score ≥ 80% on the quiz to unlock Day {dayNum + 1}.
          </p>
          <Button className="w-full" onClick={onStartQuiz}>
            Start quiz <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Quiz Tab ---
function QuizTab({
  onStartQuiz,
  hasOverride,
  onRequestOverride,
}: {
  onStartQuiz: () => void;
  hasOverride: boolean;
  onRequestOverride: () => void;
}) {
  return (
    <div className="text-center py-10">
      <div className="text-5xl mb-3">✨</div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">
        Ready to attempt?
      </h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        16 questions: 8 conceptual + 8 analytical. Wrong answers will route you
        to a quick foundation refresher before resuming.
      </p>
      <Button onClick={onStartQuiz}>
        Start quiz
      </Button>

      {hasOverride && (
        <div className="mt-4 text-sm text-emerald-600 font-medium">
          Mentor override granted — you can proceed without 80%.
        </div>
      )}

      {!hasOverride && (
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
function PYQsTab() {
  return (
    <div className="space-y-3">
      {PYQS_MEWAR.map((pyq, i) => (
        <PYQCard key={i} pyq={pyq} />
      ))}
    </div>
  );
}

function PYQCard({ pyq }: { pyq: (typeof PYQS_MEWAR)[0] }) {
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
