import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { ArrowRight, Check, Target, MessagesSquare, ClipboardCheck, CalendarDays } from "lucide-react";
import type { Role } from "@/types";
import { PYQ_TOTAL, PYQ_YEARS, MICROTHEMES_ASKED } from "@/data/pyqStats";
import { PLAN_PREVIEW, PLAN_START_LABEL, PLAN_END_LABEL } from "@/data/planPreview";
import { TasterQuiz } from "@/components/TasterQuiz";
import { ExamCountdown } from "@/components/ExamCountdown";

/**
 * The homepage, in the sign-in prototype's visual language.
 *
 * Warm paper ground with two soft radial washes, cream cards on a sand hairline,
 * generous 28px corners, a hard-shadowed blue button, and lime and coral kept
 * for meaning rather than decoration. Content is identical to the classic page
 * -- same generated numbers, same real plan week, same taster -- so the two are
 * a fair comparison of look, not of substance.
 *
 * Live side by side: ?landing=studio and ?landing=classic. DEFAULT_LANDING in
 * src/lib/landingVariant.ts decides what everyone else gets, and reverting is
 * that one line.
 */
export function LandingStudio() {
  const { setLoginRoleIntent, setRoute, authEnabled } = useAppState();
  const [showRoles, setShowRoles] = useState(false);

  const go = (role: Role) => { setLoginRoleIntent(role); setRoute("login"); };

  return (
    <div
      className="min-h-screen bg-[#f6f2e8] text-[#17252b]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 8% 6%, rgba(255,201,71,.20), transparent 28rem)," +
          "radial-gradient(circle at 94% 88%, rgba(39,104,255,.11), transparent 32rem)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-20 border-b border-[#dcd9cf] bg-[#f6f2e8]/85 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-[min(1180px,calc(100%-40px))] items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#17252b] text-sm font-extrabold text-white shadow-[0_5px_0_rgba(23,37,43,.12)]">R</span>
          <span className="font-extrabold tracking-tight">RAS Mentorship</span>

          <nav className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setRoute("methodology")} className={navBtn + " hidden sm:inline-flex"}>The method</button>
            <button onClick={() => setShowRoles(true)} className={navBtn}>Sign in</button>
            <button onClick={() => go("student")} className={primaryBtn + " min-h-[44px] px-4 text-sm"}>Start free</button>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-14 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.8fr)] lg:gap-[clamp(28px,5vw,68px)]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="mb-4 inline-flex items-center gap-2.5 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#164ed3]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#b6ec51] shadow-[0_0_0_5px_rgba(182,236,81,.22)]" />
              RPSC Prelims · {PLAN_START_LABEL} intake
            </p>

            <h1 className="text-[clamp(2.4rem,5.4vw,3.5rem)] font-extrabold leading-[1.03] tracking-[-.035em] text-balance">
              80 days. 243 things to know.
            </h1>
            <p className="mt-5 max-w-lg text-[1.08rem] leading-relaxed text-[#667378]">
              RPSC publishes 11 headings. We decoded 6 real papers into 243 studiable
              ideas — then built the plan that walks every one.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => go("student")} className={primaryBtn + " min-h-[54px] px-6"}>
                Start preparing <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setRoute("methodology")} className={ghostBtn + " min-h-[54px] px-6"}>
                See how it was built
              </button>
            </div>

            <ul className="mt-7 grid gap-2.5 text-sm text-[#667378]">
              {[
                "Free to start — no card, no call",
                "Every past answer checked against RPSC's own key",
                "A mentor who sets your work and sees whether you did it",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#b6ec51]">
                    <Check className="h-2.5 w-2.5 text-[#17252b]" strokeWidth={3.5} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ----------------------------------------- countdown + plan card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-4"
          >
            <div className={card + " p-5"}>
              <ExamCountdown tone="studio" />
            </div>

            <div className={card + " overflow-hidden p-0"}>
              <div className="flex items-center gap-2.5 border-b border-[#dcd9cf] px-5 py-4">
                <CalendarDays className="h-4 w-4 text-[#2768ff]" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold">The 80-day plan</div>
                  <div className="text-xs text-[#667378]">{PLAN_START_LABEL} – {PLAN_END_LABEL}</div>
                </div>
                <span className="ml-auto rounded-md border border-[#c9d8ff] bg-[#eaf0ff] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#164ed3]">
                  Week 1
                </span>
              </div>

              <div className="divide-y divide-[#dcd9cf]">
                {PLAN_PREVIEW.map((d) => (
                  <div key={d.day} className="flex gap-3.5 px-5 py-3">
                    <div className="w-9 shrink-0">
                      <div className="text-sm font-extrabold tabular-nums">{d.day}</div>
                      <div className="text-[10px] text-[#a4aeb1]">{d.dow}</div>
                    </div>
                    <div className="min-w-0">
                      <div className={`mb-1 text-[10px] font-extrabold uppercase tracking-wider ${
                        d.mode === "revise" ? "text-[#7fbe12]" : "text-[#164ed3]"
                      }`}>
                        {d.mode === "revise" ? "Revision" : d.subject}
                      </div>
                      <div className="text-[13px] leading-snug text-[#3d4c52]">{d.topics.join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#dcd9cf] bg-[#f6f2e8]/60 px-5 py-3 text-xs text-[#667378]">
                …and 73 more days, ending with a full paper under time.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- taster */}
      <section className="border-y border-[#dcd9cf] bg-[#fffdf7]/50">
        <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] items-center gap-10 py-16 sm:py-20 lg:grid-cols-[.85fr_1fr] lg:gap-14">
          <div>
            <p className="mb-4 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#164ed3]">
              Try it before you sign up
            </p>
            <h2 className="text-[clamp(1.7rem,3vw,2.15rem)] font-extrabold leading-tight tracking-[-.03em] text-balance">
              Answer one. Then see the one small thing it was testing.
            </h2>
            <p className="mt-4 leading-relaxed text-[#667378]">
              A real question from a real RPSC paper, marked against the official
              answer key. Get it wrong and you'll see exactly which microtheme you
              were missing — which is the whole idea.
            </p>
            <p className="mt-4 text-sm text-[#8a9599]">No account, no email. Just the paper.</p>
          </div>
          <TasterQuiz tone="studio" onStart={() => go("student")} />
        </div>
      </section>

      {/* --------------------------------------------------------- numbers */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[[String(PYQ_TOTAL), "Past questions, official keys"],
            [String(PYQ_YEARS.length), "RPSC papers decoded"],
            ["243", "Microthemes in the plan"],
            [String(MICROTHEMES_ASKED), "RPSC has actually asked"]].map(([n, l]) => (
            <div key={l} className={card + " px-5 py-5"}>
              <div className="text-[2.1rem] font-extrabold leading-none tracking-[-.04em] tabular-nums">{n}</div>
              <div className="mt-2 text-xs leading-snug text-[#667378]">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- value */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-16">
        <h2 className="max-w-2xl text-[clamp(1.8rem,3.4vw,2.4rem)] font-extrabold leading-tight tracking-[-.03em] text-balance">
          Most prep tells you what to read. This tells you whether it worked.
        </h2>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Target className="h-5 w-5" />, bg: "bg-[#eaf0ff] text-[#2768ff]", title: "Study one idea at a time",
              body: "Not “Rajasthan Geography” — “Khadin and traditional water harvesting”. Small enough to finish, specific enough to test." },
            { icon: <ClipboardCheck className="h-5 w-5" />, bg: "bg-[#b6ec51]/30 text-[#5f9a06]", title: "Sit the real papers",
              body: `All ${PYQ_TOTAL} questions from ${PYQ_YEARS.length} RPSC papers, attemptable under time, marked against the answer key RPSC published.` },
            { icon: <CalendarDays className="h-5 w-5" />, bg: "bg-[#ffc947]/30 text-[#a8730a]", title: "Book your mentor",
              body: "Pick a slot from their calendar. They set the follow-up work afterwards, and both of you can see whether it got done." },
            { icon: <MessagesSquare className="h-5 w-5" />, bg: "bg-[#ff5d44]/15 text-[#d13a22]", title: "Ask where it belongs",
              body: "A doubt about Bijolia lives on the Bijolia microtheme, where the next student to get stuck will find the answer." },
          ].map((v) => (
            <div key={v.title} className={card + " p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(23,37,43,.10)]"}>
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-[14px] ${v.bg}`}>{v.icon}</div>
              <div className="font-extrabold">{v.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#667378]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- method cta */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-16">
        <div className="flex flex-col gap-8 rounded-[28px] border border-[#dcd9cf] bg-[#17252b] p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <p className="mb-3 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#b6ec51]">The method</p>
            <h2 className="text-2xl font-extrabold tracking-[-.02em] text-balance">
              Where the 243 came from, and which of them RPSC has ever asked
            </h2>
            <p className="mt-3 text-[#c3ccd0]">
              Eleven official subjects, opened into 77 themes, then into 243 microthemes —
              and every one of {PYQ_TOTAL} past questions tagged to exactly one of them.
            </p>
          </div>
          <button
            onClick={() => setRoute("methodology")}
            className="ml-0 inline-flex min-h-[54px] shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#b6ec51] px-6 font-extrabold text-[#17252b] shadow-[0_6px_0_#8fc42f] transition hover:bg-[#a8e03d] lg:ml-auto"
          >
            Explore the taxonomy <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------------foot */}
      <footer className="border-t border-[#dcd9cf]">
        <div className="mx-auto flex w-[min(1180px,calc(100%-40px))] flex-wrap items-center gap-5 py-9">
          <p className="text-sm text-[#667378]">
            {authEnabled
              ? "Your progress follows your account, on any device."
              : "Local demo mode · no account needed · data stays in this browser"}
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => go("mentor")} className={navBtn}>Mentor sign in</button>
            <button onClick={() => go("admin")} className={navBtn}>Admin</button>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------- role picker sheet */}
      {showRoles && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[#17252b]/45 px-6"
             onClick={() => setShowRoles(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[24px] border border-[#dcd9cf] bg-[#fffdf7] p-6"
          >
            <h2 className="text-lg font-extrabold">Sign in as</h2>
            <p className="mb-5 text-sm text-[#667378]">Most people here are students.</p>
            <div className="grid gap-2">
              {([["student", "Student", "Your plan, quizzes and sessions"],
                 ["mentor", "Mentor", "Your students and your calendar"],
                 ["admin", "Admin", "Accounts, batches and the question bank"]] as const).map(
                ([role, title, desc]) => (
                  <button key={role} onClick={() => go(role)}
                          className="rounded-[16px] border border-[#dcd9cf] p-4 text-left transition hover:border-[#2768ff] hover:bg-[#eaf0ff]">
                    <div className="font-extrabold">{title}</div>
                    <div className="text-sm text-[#667378]">{desc}</div>
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

const card = "rounded-[24px] border border-[#dcd9cf] bg-[#fffdf7] shadow-[0_14px_38px_rgba(23,37,43,.07)]";
const navBtn = "min-h-[44px] rounded-[12px] px-3 py-2 text-sm font-bold text-[#667378] transition hover:bg-[#2768ff]/[.07] hover:text-[#2768ff]";
const primaryBtn = "inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#2768ff] font-extrabold text-white shadow-[0_6px_0_#164ed3] transition hover:bg-[#164ed3] hover:shadow-[0_4px_0_#123fae]";
const ghostBtn = "inline-flex items-center justify-center gap-2 rounded-[16px] border-2 border-[#17252b]/12 bg-[#fffdf7] font-extrabold text-[#17252b] transition hover:border-[#2768ff] hover:text-[#2768ff]";
