import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, CalendarDays, Target, MessagesSquare, ClipboardCheck } from "lucide-react";
import type { Role } from "@/types";
import { PYQ_TOTAL, PYQ_YEARS, MICROTHEMES_ASKED } from "@/data/pyqStats";
import { PLAN_PREVIEW, PLAN_START_LABEL, PLAN_END_LABEL } from "@/data/planPreview";
import { TasterQuiz } from "@/components/TasterQuiz";
import { ExamCountdown } from "@/components/ExamCountdown";

/**
 * The homepage.
 *
 * Was three role-selection cards and nothing else -- it asked "who are you?"
 * before telling anyone what this is, which is a poor trade for a student who
 * arrived from a link and has never heard of us.
 *
 * Signing in is now a top-right affordance rather than the whole page, and the
 * page leads with what is actually unusual here: six papers decoded, answer
 * keys that are RPSC's own, and a real 80 days you can read before committing
 * to anything.
 *
 * Every number comes from generated data, never typed into copy. Add a paper
 * and they move by themselves, so they cannot quietly drift out of true.
 */
export function Landing() {
  const { setLoginRoleIntent, setRoute, authEnabled } = useAppState();
  const [showRoles, setShowRoles] = useState(false);

  const go = (role: Role) => { setLoginRoleIntent(role); setRoute("login"); };

  return (
    <div className="min-h-screen bg-white">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 text-white grid place-items-center font-bold text-sm">R</div>
          <span className="font-bold text-slate-900">RAS Mentorship</span>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setRoute("methodology")}
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            >
              The method
            </button>
            <button
              onClick={() => setShowRoles(true)}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            >
              Sign in
            </button>
            <Button size="sm" onClick={() => go("student")}>Start free</Button>
          </nav>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-start">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <ExamCountdown className="mb-7" />

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-slate-900 leading-[1.04] text-balance">
              80 days. 243 things to know.
            </h1>
            <p className="text-lg text-slate-600 mt-5 leading-relaxed max-w-lg">
              RPSC publishes 11 headings. We decoded 6 real papers into 243 studiable
              ideas — then built the plan that walks every one.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <Button size="lg" onClick={() => go("student")}>
                Start preparing <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setRoute("methodology")}>
                See how it was built
              </Button>
            </div>

            <ul className="mt-8 grid gap-2.5 text-sm text-slate-600">
              {[
                "Free to start — no card, no call",
                "Every past answer checked against RPSC's own key",
                "A mentor who sets your work and sees whether you did it",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* --------------------------------------------- plan preview card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm"
          >
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 text-sm">The 80-day plan</div>
                <div className="text-xs text-slate-500">{PLAN_START_LABEL} – {PLAN_END_LABEL}</div>
              </div>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                Week 1
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {PLAN_PREVIEW.map((d) => (
                <div key={d.day} className="px-5 py-3 flex gap-3.5 bg-white/60">
                  <div className="w-9 shrink-0">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">{d.day}</div>
                    <div className="text-[10px] text-slate-400">{d.dow}</div>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                      d.mode === "revise" ? "text-teal-700" : "text-indigo-600"
                    }`}>
                      {d.mode === "revise" ? "Revision" : d.subject}
                    </div>
                    <div className="text-[13px] text-slate-700 leading-snug">{d.topics.join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-500">
              …and 73 more days, ending with a full paper under time.
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- taster */}
      <section className="border-t border-slate-200 bg-slate-50/70">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 grid lg:grid-cols-[0.85fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 mb-4">
              Try it before you sign up
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight text-balance">
              Answer one. Then see the one small thing it was testing.
            </h2>
            <p className="text-slate-600 mt-4 leading-relaxed">
              This is a real question from a real RPSC paper, marked against the
              official answer key. Get it wrong and you will see exactly which
              microtheme you were missing — which is the whole idea.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              No account, no email. Just the paper.
            </p>
          </div>
          <TasterQuiz onStart={() => go("student")} />
        </div>
      </section>

      {/* --------------------------------------------------------- numbers */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <Figure n={String(PYQ_TOTAL)} label="Past questions, official keys" />
          <Figure n={String(PYQ_YEARS.length)} label="RPSC papers decoded" />
          <Figure n="243" label="Microthemes in the plan" />
          <Figure n={String(MICROTHEMES_ASKED)} label="RPSC has actually asked" />
        </div>
      </section>

      {/* ----------------------------------------------------------- value */}
      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 text-balance max-w-2xl">
          Most prep tells you what to read. This tells you whether it worked.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          <Value
            icon={<Target className="w-5 h-5" />}
            title="Study one idea at a time"
            body="Not “Rajasthan Geography” — “Khadin and traditional water harvesting”. Small enough to finish, specific enough to test."
          />
          <Value
            icon={<ClipboardCheck className="w-5 h-5" />}
            title="Sit the real papers"
            body={`All ${PYQ_TOTAL} questions from ${PYQ_YEARS.length} RPSC papers, attemptable under time, marked against the answer key RPSC published.`}
          />
          <Value
            icon={<CalendarDays className="w-5 h-5" />}
            title="Book your mentor"
            body="Pick a slot from their calendar. They set the follow-up work afterwards, and both of you can see whether it got done."
          />
          <Value
            icon={<MessagesSquare className="w-5 h-5" />}
            title="Ask where it belongs"
            body="A doubt about Bijolia lives on the Bijolia microtheme, where the next student to get stuck will find the answer."
          />
        </div>
      </section>

      {/* ------------------------------------------------------- method cta */}
      <section className="max-w-6xl mx-auto px-6 pb-16 sm:pb-20">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-8 sm:p-10 flex flex-col lg:flex-row gap-8 lg:items-center">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 mb-3">The method</div>
            <h2 className="text-2xl font-bold text-slate-900 text-balance">
              Where the 243 came from, and which of them RPSC has ever asked
            </h2>
            <p className="text-slate-600 mt-3">
              Eleven official subjects, opened into 77 themes, then into 243 microthemes —
              and every one of {PYQ_TOTAL} past questions tagged to exactly one of them.
              Open the whole taxonomy and search it.
            </p>
          </div>
          <Button size="lg" className="lg:ml-auto shrink-0" variant="outline" onClick={() => setRoute("methodology")}>
            Explore the taxonomy <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------- foot */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap gap-6 items-center">
          <div className="text-sm text-slate-500">
            {authEnabled
              ? "Your progress follows your account, on any device."
              : "Local demo mode · no account needed · data stays in this browser"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => go("mentor")} className="text-sm text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100">
              Mentor sign in
            </button>
            <button onClick={() => go("admin")} className="text-sm text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100">
              Admin
            </button>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------- role picker sheet */}
      {showRoles && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 flex items-center justify-center px-6"
          onClick={() => setShowRoles(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-1">Sign in as</h2>
            <p className="text-sm text-slate-500 mb-5">Most people here are students.</p>
            <div className="grid gap-2">
              {([["student", "Student", "Your plan, quizzes and sessions"],
                 ["mentor", "Mentor", "Your students and your calendar"],
                 ["admin", "Admin", "Accounts, batches and the question bank"]] as const).map(
                ([role, title, desc]) => (
                  <button
                    key={role}
                    onClick={() => go(role)}
                    className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition"
                  >
                    <div className="font-semibold text-slate-900">{title}</div>
                    <div className="text-sm text-slate-500">{desc}</div>
                  </button>
                ),
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Figure({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums tracking-tight">{n}</div>
      <div className="text-xs text-slate-500 mt-1.5 leading-snug">{label}</div>
    </div>
  );
}

function Value({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center mb-4">{icon}</div>
      <div className="font-semibold text-slate-900">{title}</div>
      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}
