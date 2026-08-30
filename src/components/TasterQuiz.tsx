import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, RefreshCw, CornerDownRight } from "lucide-react";
import { TASTER_QUESTIONS, type TasterQuestion } from "@/data/taster";
import { PYQ_TOTAL } from "@/data/pyqStats";

/**
 * Answer one real past question, then watch it resolve to the one microtheme
 * it was testing.
 *
 * This is the product in ten seconds. A visitor arrives not knowing what a
 * "microtheme" is; telling them is weak, and showing them a diagram is only
 * slightly better. Letting them get a real RPSC question wrong, and then
 * naming the small thing they did not know, does the whole argument.
 *
 * Everything is genuine -- the stem, the options and the key are what sits in
 * the question bank. Nothing is written to flatter the reader, which is the
 * point: if you miss it, you missed the real paper.
 *
 * The taxonomy reveal is staggered on purpose. Subject, then theme, then
 * microtheme, each narrowing -- the animation is the argument, not decoration,
 * so it runs even for people who will not read the copy.
 */
export function TasterQuiz({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();
  const [order] = useState(() => {
    const a = [...TASTER_QUESTIONS.keys()];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });
  const [seat, setSeat] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [right, setRight] = useState(0);

  const q: TasterQuestion = useMemo(
    () => TASTER_QUESTIONS[order[seat % order.length]],
    [order, seat],
  );
  const done = picked !== null;
  const correct = done && picked === q.correct;

  function choose(i: number) {
    if (done) return;
    setPicked(i);
    setAnswered((n) => n + 1);
    if (i === q.correct) setRight((n) => n + 1);
  }

  function next() {
    setPicked(null);
    setSeat((s) => s + 1);
  }

  const step = reduce ? 0 : 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* ------------------------------------------------------------ head */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
          Real question
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          RAS {q.year} · Q{q.qno}
        </span>
        {answered > 0 && (
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            {right}/{answered} right
          </span>
        )}
      </div>

      {/* -------------------------------------------------------- question */}
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={`q-${seat}`}
            initial={{ opacity: 0, y: 6 * step }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 * step }}
            transition={{ duration: 0.2 }}
            className="text-[1.0625rem] font-semibold text-slate-900 leading-snug text-balance"
          >
            {q.q}
          </motion.p>
        </AnimatePresence>

        <div className="grid gap-2 mt-4">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.correct;
            const isPick = i === picked;
            const state = !done ? "idle" : isAnswer ? "right" : isPick ? "wrong" : "dim";
            return (
              <motion.button
                key={`${seat}-${i}`}
                onClick={() => choose(i)}
                disabled={done}
                whileTap={done || reduce ? undefined : { scale: 0.99 }}
                animate={
                  state === "wrong" && !reduce
                    ? { x: [0, -5, 5, -3, 0] }
                    : { x: 0 }
                }
                transition={{ duration: 0.28 }}
                className={`text-left rounded-xl border px-3.5 py-2.5 flex items-center gap-3 text-[0.9375rem] transition ${
                  state === "idle"
                    ? "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
                    : state === "right"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : state === "wrong"
                    ? "border-rose-300 bg-rose-50 text-rose-900"
                    : "border-slate-200 text-slate-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${
                    state === "right"
                      ? "bg-emerald-500 text-white"
                      : state === "wrong"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {state === "right" ? <Check className="w-3.5 h-3.5" />
                   : state === "wrong" ? <X className="w-3.5 h-3.5" />
                   : String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------- reveal */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
            className="overflow-hidden border-t border-slate-200 bg-slate-50"
          >
            <div className="px-5 sm:px-6 py-5">
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="text-sm font-semibold text-slate-900"
              >
                {correct
                  ? "Right — and here is what it was testing."
                  : "Not this time. Here is what it was testing."}
              </motion.p>

              {/* subject -> theme -> microtheme, each narrowing */}
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "Subject", value: `${q.icon}  ${q.subject}`, indent: 0, tone: "slate" },
                  { label: "Theme", value: q.theme, indent: 1, tone: "slate" },
                  { label: "Microtheme", value: q.microtheme, indent: 2, tone: "indigo" },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: reduce ? 0 : -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduce ? 0 : 0.14 + i * 0.13, duration: 0.25 }}
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${row.indent * 18}px` }}
                  >
                    {row.indent > 0 && <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[74px] shrink-0">
                      {row.label}
                    </span>
                    <span
                      className={`text-sm rounded-lg px-2 py-1 ${
                        row.tone === "indigo"
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-white border border-slate-200 text-slate-700"
                      }`}
                    >
                      {row.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.55 }}
                className="text-[13px] text-slate-600 mt-4 leading-relaxed"
              >
                That is one of <strong className="text-slate-900">243</strong> microthemes —
                a single day's reading, not a whole subject. Your plan walks every one of
                them, with the rest of the {PYQ_TOTAL} past questions waiting at the end.
              </motion.p>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" onClick={onStart}>
                  Start preparing <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={next}>
                  <RefreshCw className="w-4 h-4" /> Another one
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!done && (
        <div className="px-5 sm:px-6 pb-4 -mt-1 text-xs text-slate-400">
          Pick an answer — the official RPSC key decides, not us.
        </div>
      )}
    </div>
  );
}
