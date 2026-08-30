import { useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { ArrowRight, Check, Target, MessagesSquare, ClipboardCheck, CalendarDays } from "lucide-react";
import type { Role } from "@/types";
import { PYQ_TOTAL, PYQ_YEARS, MICROTHEMES_ASKED, PYQ_PER_MICROTHEME } from "@/data/pyqStats";
import { RPSC_SUBJECTS } from "@/data/syllabus";
import { PRIORITY_AXES, SUBJECT_SHARE, MODEL_PAPERS, MODEL_QUESTIONS, MODEL_MICROTHEMES } from "@/data/priorityModel";
import { PLAN_PREVIEW, PLAN_START_LABEL, PLAN_END_LABEL } from "@/data/planPreview";
import { TasterQuiz } from "@/components/TasterQuiz";
import { ExamCountdown } from "@/components/ExamCountdown";

/**
 * The homepage.
 *
 * White ground, keeping the structural gains from the sign-in prototype: heavy
 * tracking-tight type, 24px corners, the blue button with a hard 6px shadow,
 * and lime / coral / gold used for meaning rather than decoration. The warm
 * paper is gone on purpose -- the whole app behind the door is white, and the
 * paper created a seam at the exact moment somebody commits.
 *
 * Every route out of here is the student sign-in. Mentor and admin live in the
 * footer, because two people need them and several hundred students do not.
 */
/**
 * The taxonomy, derived live from the catalog the app actually ships.
 *
 * Counted rather than written down: if a microtheme is added to syllabus.ts the
 * numbers on the homepage follow it, and the worked example below cannot end up
 * describing a chain that no longer exists.
 */
function useTaxonomyShape() {
  return useMemo(() => {
    const themes = new Set<string>();
    let microthemes = 0;
    for (const s of RPSC_SUBJECTS) {
      for (const t of s.topics) { themes.add(`${s.id}|${t.theme}`); microthemes++; }
    }
    // One real chain to show the drill-down with. Medieval Dynasties is a good
    // witness: seven microthemes out of a single syllabus phrase, and a spread
    // of past-question counts including one RPSC has never touched.
    const subject = RPSC_SUBJECTS[0];
    const theme = "Medieval Dynasties of Rajasthan";
    const leaves: { name: string; asked: number }[] = subject.topics
      .filter((t) => t.theme === theme)
      .map((t) => ({ name: t.name, asked: PYQ_PER_MICROTHEME[t.id] ?? 0 }));
    const subjectThemes = new Set(subject.topics.map((t) => t.theme)).size;
    return {
      subjects: RPSC_SUBJECTS.length,
      themes: themes.size,
      microthemes,
      example: { subject: subject.name, subjectThemes, theme, leaves },
    };
  }, []);
}

export function LandingStudio() {
  const tax = useTaxonomyShape();
  const { setLoginRoleIntent, setRoute, authEnabled } = useAppState();
  const go = (role: Role) => { setLoginRoleIntent(role); setRoute("login"); };

  return (
    <div className="min-h-screen bg-white text-[#17252b]">
      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-20 border-b border-[#e7e4dc] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-[min(1180px,calc(100%-40px))] items-center">
          <button onClick={() => setRoute("landing")} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#17252b] text-sm font-extrabold text-white shadow-[0_4px_0_rgba(23,37,43,.15)]">R</span>
            <span className="font-extrabold tracking-tight">RAS Mentorship</span>
          </button>

          {/* One row, one baseline, one height. Every item is h-11 and centred,
              so the text sits on the same line whatever its weight.

              "Sign in" and "Start free" used to sit here together, calling the
              same function and opening the same screen -- two controls, one
              destination. The hero CTA already invites new readers in, so the
              nav keeps only the returning one, styled as the primary since it
              is now the sole control here. */}
          <nav className="ml-auto flex items-center gap-2">
            <button onClick={() => setRoute("methodology")} className={`${navBtn} hidden sm:inline-flex`}>
              The method
            </button>
            <button onClick={() => go("student")} className={`${primaryBtn} h-11 px-4 text-sm`}>
              Sign in
            </button>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-14 pt-12 sm:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.8fr)] lg:gap-[clamp(28px,5vw,68px)]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Countdown first: the deadline is the reason anyone is reading. */}
            <ExamCountdown className="mb-7" />

            <h1 className="text-[clamp(2.3rem,5.2vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-.035em] text-balance">
              80 days. 243 microthemes to know.
            </h1>
            <p className="mt-5 max-w-lg text-[1.08rem] leading-relaxed text-[#667378]">
              RPSC publishes 11 headings. We decoded 6 real papers into 243 studiable
              ideas — then built the plan that walks every one.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {/* One door to the method page, not three. It used to sit here as
                  well as in the nav and on the dark panel below -- all three
                  going to the same screen, with this one competing directly
                  with the primary CTA. The nav carries wayfinding; the panel
                  below carries the invitation in context. */}
              <button onClick={() => go("student")} className={`${primaryBtn} h-[54px] px-6`}>
                Start preparing <ArrowRight className="h-4 w-4" />
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

          {/* ------------------------------------------------- plan preview */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className={`${card} overflow-hidden`}
          >
            <div className="flex items-center gap-2.5 border-b border-[#e7e4dc] px-5 py-4">
              <CalendarDays className="h-4 w-4 text-[#2768ff]" />
              <div className="min-w-0">
                <div className="text-sm font-extrabold">The 80-day plan</div>
                <div className="text-xs text-[#667378]">{PLAN_START_LABEL} – {PLAN_END_LABEL}</div>
              </div>
              <span className="ml-auto rounded-md border border-[#c9d8ff] bg-[#eaf0ff] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#164ed3]">
                Week 1
              </span>
            </div>

            <div className="divide-y divide-[#f0ede6]">
              {PLAN_PREVIEW.map((d) => (
                <div key={d.day} className="flex gap-3.5 px-5 py-3">
                  <div className="w-9 shrink-0">
                    <div className="text-sm font-extrabold tabular-nums">{d.day}</div>
                    <div className="text-[10px] text-[#a4aeb1]">{d.dow}</div>
                  </div>
                  <div className="min-w-0">
                    <div className={`mb-1 text-[10px] font-extrabold uppercase tracking-wider ${
                      d.mode === "revise" ? "text-[#5f9a06]" : "text-[#164ed3]"
                    }`}>
                      {d.mode === "revise" ? "Revision" : d.subject}
                    </div>
                    <div className="text-[13px] leading-snug text-[#3d4c52]">{d.topics.join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#e7e4dc] bg-[#fbfaf7] px-5 py-3 text-xs text-[#667378]">
              …and 73 more days, ending with a full paper under time.
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- taster */}
      <section className="border-y border-[#e7e4dc] bg-[#fbfaf7]">
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
          <TasterQuiz onStart={() => go("student")} />
        </div>
      </section>

      {/* --------------------------------------------------------- numbers */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[[String(PYQ_TOTAL), "Past questions, official keys"],
            [String(PYQ_YEARS.length), "RPSC papers decoded"],
            ["243", "Microthemes in the plan"],
            [String(MICROTHEMES_ASKED), "RPSC has actually asked"]].map(([n, l]) => (
            <div key={l} className={`${card} px-5 py-5`}>
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
            { icon: <CalendarDays className="h-5 w-5" />, bg: "bg-[#ffc947]/25 text-[#a8730a]", title: "Book your mentor",
              body: "Pick a slot from their calendar. They set the follow-up work afterwards, and both of you can see whether it got done." },
            { icon: <MessagesSquare className="h-5 w-5" />, bg: "bg-[#ff5d44]/12 text-[#d13a22]", title: "Ask where it belongs",
              body: "A doubt about Bijolia lives on the Bijolia microtheme, where the next student to get stuck will find the answer." },
          ].map((v) => (
            <div key={v.title} className={`${card} p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(23,37,43,.09)]`}>
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-[14px] ${v.bg}`}>{v.icon}</div>
              <div className="font-extrabold">{v.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#667378]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- priority model

          This panel used to restate the taxonomy and carry a third button to
          the method page. It now carries what that button was promising: the
          seven axes every microtheme is scored on, and the measured subject
          split of six full papers.

          Deliberately absent: any claim that P1 microthemes dominate the paper.
          P1 is 17% of the scored taxonomy and 21% of the questions -- a ratio
          of 1.11, which is no concentration worth advertising. The honest
          argument is the one made here: priority is not a frequency ranking,
          and the subject split is measured rather than asserted. */}
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-16">
        <div className="rounded-[24px] bg-[#17252b] p-8 text-white sm:p-10">
          <p className="mb-3 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#b6ec51]">
            How the taxonomy was built
          </p>
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-.02em] text-balance">
            One RPSC heading, opened until it is small enough to finish
          </h2>
          <p className="mt-3 max-w-2xl text-[#c3ccd0]">
            RPSC publishes {tax.subjects} headings. A heading is not a study session, so each
            one is opened into themes, and each theme into microthemes &mdash; a microtheme
            being one sitting's reading, narrow enough that you can tell whether you know it.
          </p>

          {/* ---------------------------------------------- the derivation */}
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[.86rem]">
            {[
              [tax.subjects, "official headings"],
              [tax.themes, "themes"],
              [tax.microthemes, "microthemes"],
            ].map(([n, label], i) => (
              <span key={label as string} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="text-[#5d6b71]">&rarr;</span>}
                <span className="rounded-[12px] bg-white/[.06] px-3 py-1.5">
                  <b className="tabular-nums">{n}</b>{" "}
                  <span className="text-[#a9b4b9]">{label}</span>
                </span>
              </span>
            ))}
          </div>

          {/* ------------------------------------------------ worked example */}
          <div className="mt-6 rounded-[18px] border border-white/10 bg-white/[.04] p-5 sm:p-6">
            <p className="text-[.72rem] font-extrabold uppercase tracking-[.13em] text-[#8c9aa0]">
              Worked example
            </p>
            <p className="mt-2.5 text-[.86rem] text-[#c3ccd0]">
              The heading{" "}
              <span className="font-semibold text-white">&ldquo;{tax.example.subject}&rdquo;</span>{" "}
              opens into {tax.example.subjectThemes} themes. One of them:
            </p>
            <p className="mt-3 text-[.95rem] font-extrabold text-[#b6ec51]">
              {tax.example.theme}
            </p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {tax.example.leaves.map((l) => (
                <li key={l.name} className="flex items-baseline justify-between gap-3 rounded-[10px] bg-white/[.05] px-3 py-1.5">
                  <span className="text-[.83rem] text-[#c3ccd0]">{l.name}</span>
                  {/* Counts are the check on the split: a microtheme nobody has
                      been asked about is kept, and shown as such, rather than
                      quietly dropped to make the taxonomy look efficient. */}
                  <span className={`shrink-0 text-[.72rem] font-bold tabular-nums ${l.asked ? "text-white" : "text-[#6f7c82]"}`}>
                    {l.asked ? `${l.asked}q` : "not yet"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[.78rem] leading-relaxed text-[#8c9aa0]">
              Seven studiable ideas out of one syllabus phrase, each with its own record of
              what RPSC has actually asked. Every past question is tagged to exactly one of
              them, which is what makes the counts &mdash; and the gaps &mdash; checkable.
            </p>
          </div>

          <hr className="mt-9 border-white/10" />

          <p className="mt-8 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#b6ec51]">
            Then each one is scored
          </p>
          <p className="mt-2 max-w-2xl text-[#c3ccd0]">
            Each of the {MODEL_MICROTHEMES} scored microthemes is rated 1&ndash;5 on seven axes
            that combine into one composite, and that composite sets study order &mdash; which
            is why what you study first is not simply what is asked most often.
          </p>

          <div className="mt-8 grid gap-x-10 gap-y-9 lg:grid-cols-[1.05fr_1fr]">
            <ul className="grid gap-2.5">
              {PRIORITY_AXES.map((a) => (
                <li key={a.letter} className="flex items-start gap-3">
                  <span className="mt-px grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[#b6ec51] text-[.82rem] font-extrabold text-[#17252b]">
                    {a.letter}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[.94rem] font-bold">{a.name}</span>
                      {/* The gap between a top-tier and a typical microtheme on
                          this axis. Volatility is the one that inverts. */}
                      <span className="text-[.72rem] font-semibold tabular-nums text-[#8c9aa0]">
                        P1 {a.p1.toFixed(1)} &middot; typical {a.p3.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[.82rem] leading-snug text-[#a9b4b9]">{a.blurb}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <p className="text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#8c9aa0]">
                Where the marks fall
              </p>
              <p className="mt-1.5 text-[.82rem] text-[#a9b4b9]">
                Counted across {MODEL_PAPERS} full papers &mdash; {MODEL_QUESTIONS} questions,
                each mapped to one microtheme.
              </p>
              <ul className="mt-4 grid gap-2">
                {SUBJECT_SHARE.map((r) => (
                  <li key={r.code} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                    <span className="truncate text-[.84rem] text-[#c3ccd0]">{r.name}</span>
                    <span className="text-[.78rem] font-bold tabular-nums text-white">
                      {r.share.toFixed(1)}%
                    </span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      {/* Scaled against the largest share rather than 100, so the
                          smallest subjects stay visible instead of vanishing. */}
                      <span
                        className="block h-full rounded-full bg-[#b6ec51]"
                        style={{ width: `${(r.share / SUBJECT_SHARE[0].share) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[.78rem] leading-relaxed text-[#8c9aa0]">
                Reasoning and Science &amp; Technology alone are a third of the paper &mdash;
                about {Math.round(SUBJECT_SHARE[0].perPaper)} and {Math.round(SUBJECT_SHARE[1].perPaper)} questions
                in a {MODEL_QUESTIONS / MODEL_PAPERS}-mark sitting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- foot */}
      <footer className="border-t border-[#e7e4dc]">
        <div className="mx-auto flex w-[min(1180px,calc(100%-40px))] flex-wrap items-center gap-5 py-9">
          <p className="text-sm text-[#667378]">
            {authEnabled
              ? "Your progress follows your account, on any device."
              : "Local demo mode · no account needed · data stays in this browser"}
          </p>
          {/* The only place mentor and admin appear. Two people need them. */}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => go("mentor")} className={navBtn}>Mentor sign in</button>
            <button onClick={() => go("admin")} className={navBtn}>Admin sign in</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const card = "rounded-[24px] border border-[#e7e4dc] bg-white shadow-[0_10px_30px_rgba(23,37,43,.05)]";
const navBtn = "inline-flex h-11 items-center rounded-[12px] px-3 text-sm font-bold text-[#667378] transition hover:bg-[#2768ff]/[.07] hover:text-[#2768ff]";
const primaryBtn = "inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#2768ff] font-extrabold text-white shadow-[0_5px_0_#164ed3] transition hover:bg-[#164ed3] hover:shadow-[0_3px_0_#123fae]";
