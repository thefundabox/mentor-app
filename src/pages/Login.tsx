import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { Loader2, MailCheck, ArrowRight } from "lucide-react";
import { timeToExam, EXAM_LABEL } from "@/data/exam";
import { TASTER_QUESTIONS } from "@/data/taster";
import type { Role } from "@/types";

/**
 * Student sign-in.
 *
 * Built from the prototype at outputs/ras-student-login-prototype.html: a
 * story panel that says what is behind the door, beside the form itself. The
 * palette is the prototype's -- warm paper, hard blue, lime and gold -- and is
 * deliberately scoped to this screen rather than pushed through the app.
 *
 * Two things differ from the prototype on purpose.
 *
 * Its warm-up question hardcoded "Kasumal refers to saffron". That is RAS 2024
 * Q132 and RPSC's official key says Red -- Kasumal is a deep crimson. A login
 * screen that teaches a wrong fact is worse than one with no question at all,
 * so the question is drawn from the real bank and marked by the real key.
 *
 * The countdown and the day split are computed, not typed. "80 study days +
 * N buffer" stays true as the exam approaches instead of going stale.
 */
type Mode = "signin" | "signup";

const ROLE_COPY: Record<Role, { label: string; title: string; intro: string; button: string; rajsa: string }> = {
  student: {
    label: "Student sign-in",
    title: "Welcome back",
    intro: "Sign in and we'll open today's next task.",
    button: "Continue to today's plan",
    rajsa: "Sign in and I'll take you straight to the next unfinished task.",
  },
  mentor: {
    label: "Mentor sign-in",
    title: "Welcome, mentor",
    intro: "Open your students, your calendar and the follow-up work.",
    button: "Open mentor workspace",
    rajsa: "Your student follow-ups and today's sessions are waiting.",
  },
  admin: {
    label: "Admin sign-in",
    title: "Administration",
    intro: "Manage accounts, batches and the question bank.",
    button: "Open administration",
    rajsa: "Use your institute-issued admin access to continue.",
  },
};

export function Login() {
  const {
    loginRoleIntent, loginAs, setRoute, users,
    signIn, signUp, sendPasswordReset, authError, authEnabled,
  } = useAppState();

  const role: Role = loginRoleIntent || "student";
  const copy = ROLE_COPY[role];

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const [left, setLeft] = useState(() => timeToExam());
  useEffect(() => {
    const id = setInterval(() => setLeft(timeToExam()), 60_000);
    return () => clearInterval(id);
  }, []);
  const buffer = Math.max(0, left.days - 80);

  const warmup = useMemo(
    () => TASTER_QUESTIONS[Math.floor(Math.random() * TASTER_QUESTIONS.length)],
    [],
  );
  const [picked, setPicked] = useState<number | null>(null);

  const canSubmit = email.includes("@") && (!authEnabled || password.length >= (mode === "signup" ? 8 : 1));
  const shownError = localError || authError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setLocalError(null); setNotice(null);

    if (!email.trim()) { setLocalError("Enter the email connected to your account."); emailRef.current?.focus(); return; }
    if (!email.includes("@")) { setLocalError("Enter a complete email address, such as name@example.com."); emailRef.current?.focus(); return; }
    if (authEnabled && mode === "signup" && password.length < 8) {
      setLocalError("Use at least 8 characters for your password."); return;
    }
    if (authEnabled && !password) { setLocalError("Enter your password to continue."); return; }

    if (!authEnabled) { loginAs(role, email, name); return; }

    setBusy(true);
    const result = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setBusy(false);
    if (result.error) { setLocalError(result.error); return; }
    if (result.needsConfirmation) { setConfirmSent(true); return; }
  }

  async function requestReset() {
    if (!email.includes("@")) {
      setResetOpen(false);
      setLocalError("Enter your account email first, then request the reset link.");
      emailRef.current?.focus();
      return;
    }
    setResetOpen(false); setBusy(true); setLocalError(null);
    const res = await sendPasswordReset(email);
    setBusy(false);
    if (res.error) setLocalError(res.error);
    else setNotice(`If an account exists for ${email}, a reset link is on its way.`);
  }

  const demoAccounts = authEnabled ? [] : users.filter((u) => u.role === role);

  if (confirmSent) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-[28px] border border-[#e7e4dc] bg-white p-8 text-center shadow-[0_18px_50px_rgba(23,37,43,.10)]">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#b6ec51]/30 text-[#17252b]">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-[#17252b]">Check your email</h1>
          <p className="mb-6 text-sm text-[#667378]">
            We sent a confirmation link to <strong className="text-[#17252b]">{email}</strong>. Open it, then come back and sign in.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setMode("signin"); setPassword(""); }}
            className="text-sm font-bold text-[#2768ff] hover:text-[#164ed3]"
          >
            ← back to sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ---------------------------------------------------------- topbar */}
      <header className="mb-7 flex min-h-[52px] items-center justify-between gap-5">
        <button onClick={() => setRoute("landing")} className="inline-flex items-center gap-3 font-extrabold tracking-tight text-[#17252b]">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#17252b] text-white shadow-[0_4px_0_rgba(23,37,43,.15)]">R</span>
          RAS Mentorship
        </button>
        {/* An explicit way out. The brand mark navigates too, but nobody reads a
            logo as "back", and a sign-in page with no exit feels like a trap. */}
        <button
          onClick={() => setRoute("landing")}
          className="inline-flex h-11 items-center rounded-[12px] px-3 text-sm font-bold text-[#667378] transition hover:bg-[#2768ff]/[.07] hover:text-[#2768ff]"
        >
          ← Back to home
        </button>
      </header>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(390px,.78fr)] lg:gap-[clamp(28px,5vw,72px)]">
        {/* ------------------------------------------------------ story ---- */}
        <section className="py-3.5">
          <p className="mb-3.5 inline-flex items-center gap-2.5 text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#164ed3]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#b6ec51] shadow-[0_0_0_5px_rgba(182,236,81,.22)]" />
            Your preparation is waiting
          </p>
          <h1 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold leading-[1.06] tracking-[-.03em] text-[#17252b] text-balance">
            Continue from the next unfinished task.
          </h1>
          <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-[#667378]">
            Your daily plan, revision queue and mentor follow-ups stay together — so you
            always know what to do next.
          </p>

          {/* countdown */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[20px] border border-[#e7e4dc] bg-white p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[2.75rem] font-extrabold leading-none tracking-[-.04em] tabular-nums text-[#17252b]">{left.days}</span>
              <span className="text-sm font-bold text-[#667378]">days to Prelims</span>
            </div>
            <div className="text-sm">
              <strong className="block text-[#17252b]">80 study days{buffer > 0 ? ` + ${buffer} buffer` : ""}</strong>
              <span className="text-[#667378]">RAS Prelims · {EXAM_LABEL}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eaf0ff]" role="img"
                 aria-label={`80 of ${left.days} remaining days are planned`}>
              <span className="block h-full rounded-full bg-[#2768ff]"
                    style={{ width: `${Math.min(100, Math.round((80 / Math.max(left.days, 80)) * 100))}%` }} />
            </div>
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {[["Today's work", "Finishable microthemes"],
              ["Revision queue", "What memory needs next"],
              ["Mentor follow-up", "Your agreed next action"]].map(([b, s]) => (
              <li key={b} className="rounded-[14px] border border-[#e7e4dc] bg-white px-3.5 py-3">
                <b className="block text-sm text-[#17252b]">{b}</b>
                <span className="text-xs text-[#667378]">{s}</span>
              </li>
            ))}
          </ul>

          {/* warm-up: real question, real key */}
          <details className="group mt-5 rounded-[20px] border border-[#e7e4dc] bg-white px-5 py-4">
            <summary className="cursor-pointer list-none font-bold text-[#17252b] marker:hidden">
              While you're here: one quick recall question
            </summary>
            <div className="mt-4">
              <p className="font-semibold text-[#17252b]">{warmup.q}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {warmup.options.map((opt, i) => {
                  const done = picked !== null;
                  const isAnswer = i === warmup.correct;
                  const tone = !done ? "idle" : isAnswer ? "right" : i === picked ? "wrong" : "dim";
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => picked === null && setPicked(i)}
                      aria-pressed={picked === i}
                      className={`rounded-[14px] border px-3 py-2 text-left text-sm font-semibold transition ${
                        tone === "idle" ? "border-[#e7e4dc] hover:border-[#2768ff] hover:bg-[#eaf0ff]"
                        : tone === "right" ? "border-[#b6ec51] bg-[#b6ec51]/25 text-[#17252b]"
                        : tone === "wrong" ? "border-[#ff5d44] bg-[#ff5d44]/12 text-[#17252b]"
                        : "border-[#e7e4dc] text-[#667378]"
                      }`}
                    >
                      {String.fromCharCode(65 + i)} · {opt}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-[#667378]" aria-live="polite">
                {picked === null
                  ? "Choose before the answer is revealed."
                  : picked === warmup.correct
                    ? `Correct. This was RAS ${warmup.year}, Q${warmup.qno} — ${warmup.microtheme}.`
                    : `Not quite — the official key says ${warmup.options[warmup.correct]}. RAS ${warmup.year}, Q${warmup.qno} — ${warmup.microtheme}.`}
              </p>
            </div>
          </details>
        </section>

        {/* -------------------------------------------------------- form ---- */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-[28px] border border-[#e7e4dc] bg-white p-6 shadow-[0_18px_50px_rgba(23,37,43,.10)] sm:p-8"
        >
          <p className="text-[.78rem] font-extrabold uppercase tracking-[.13em] text-[#164ed3]">
            {mode === "signup" ? "Student account" : copy.label}
          </p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#17252b]">
            {mode === "signup" ? "Create your account" : copy.title}
          </h2>
          <p className="mt-1 text-sm text-[#667378]">
            {mode === "signup"
              ? "Save your plan, quiz attempts and mentor follow-ups across devices."
              : copy.intro}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="Email">
              <input
                ref={emailRef}
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" autoFocus
                className={inputCls}
              />
            </Field>

            {mode === "signup" && (
              <Field label="Name · optional">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="How should Rajsa address you?" autoComplete="name" className={inputCls}
                />
              </Field>
            )}

            {authEnabled && (
              <Field
                label="Password"
                aside={mode === "signin" ? (
                  <button type="button" onClick={() => setResetOpen(true)}
                          className="text-xs font-bold text-[#2768ff] hover:text-[#164ed3]">
                    Forgot password?
                  </button>
                ) : null}
              >
                <div className="relative">
                  <input
                    type={reveal ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className={`${inputCls} pr-16`}
                  />
                  <button
                    type="button" onClick={() => setReveal((v) => !v)} aria-pressed={reveal}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-[#667378] hover:bg-[#eaf0ff] hover:text-[#2768ff]"
                  >
                    {reveal ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className="mt-1.5 text-xs text-[#667378]">
                    Use at least 8 characters. A memorable passphrase works well.
                  </p>
                )}
                {caps && <p className="mt-1.5 text-xs font-bold text-[#ff5d44]">Caps Lock appears to be on.</p>}
              </Field>
            )}

            {shownError && (
              <div role="alert" className="rounded-[14px] border border-[#ff5d44] bg-[#ff5d44]/10 px-3.5 py-3 text-sm font-medium text-[#17252b]">
                {shownError}
              </div>
            )}
            {notice && (
              <div aria-live="polite" className="rounded-[14px] border border-[#b6ec51] bg-[#b6ec51]/20 px-3.5 py-3 text-sm text-[#17252b]">
                {notice}
              </div>
            )}

            <button
              type="submit" disabled={!canSubmit || busy}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2768ff] px-5 font-extrabold text-white shadow-[0_6px_0_#164ed3] transition hover:bg-[#164ed3] hover:shadow-[0_4px_0_#123fae] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy
                ? (mode === "signup" ? "Creating your account…" : "Opening today's plan…")
                : (mode === "signup" ? "Create account" : copy.button)}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {authEnabled && (
            <p className="mt-5 text-center text-sm text-[#667378]">
              {mode === "signin" ? "New here? " : "Already registered? "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setLocalError(null); setNotice(null); }}
                className="font-bold text-[#2768ff] hover:text-[#164ed3]"
              >
                {mode === "signin" ? "Create your free account" : "Sign in"}
              </button>
            </p>
          )}

          <aside className="mt-6 flex items-center gap-3.5 rounded-[20px] border border-[#e7e4dc] bg-[#eaf0ff]/60 p-3.5">
            {/* Tall transparent portrait: object-top frames the turban and face
                rather than cropping to his waistcoat. */}
            <img src="/rajsa-guide.png" alt="" aria-hidden="true"
                 className="h-16 w-16 shrink-0 rounded-[14px] bg-white object-cover object-top" />
            <p className="text-sm text-[#17252b]">
              <strong className="block">Rajsa</strong>
              <span className="text-[#667378]">
                {mode === "signup"
                  ? "Create your account, then I'll turn the syllabus into one finishable task at a time."
                  : copy.rajsa}
              </span>
            </p>
          </aside>

          {demoAccounts.length > 0 && (
            <div className="mt-6 border-t border-[#e7e4dc] pt-5">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#667378]">Demo accounts</div>
              <div className="space-y-1.5">
                {demoAccounts.map((u) => (
                  <button key={u.id} type="button" onClick={() => loginAs(role, u.email, u.name)}
                          className="flex w-full items-center justify-between rounded-[14px] border border-[#e7e4dc] px-3 py-2 text-left hover:bg-[#eaf0ff]">
                    <span>
                      <span className="block text-sm font-semibold text-[#17252b]">{u.name}</span>
                      <span className="text-xs text-[#667378]">{u.email}</span>
                    </span>
                    <span className="text-xs font-bold text-[#2768ff]">use →</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[#667378]">
                Local-only mode — no Supabase project configured, so there is no password.
              </p>
            </div>
          )}
        </motion.section>
      </div>

      {/* ------------------------------------------------------ reset modal */}
      {resetOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-[#17252b]/45 px-6"
          onClick={(e) => { if (e.target === e.currentTarget) setResetOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setResetOpen(false); }}
          role="presentation"
        >
          <section role="dialog" aria-modal="true" aria-labelledby="reset-title"
                   className="w-full max-w-md rounded-[24px] border border-[#e7e4dc] bg-white p-6">
            <h2 id="reset-title" className="text-xl font-extrabold text-[#17252b]">Reset your password</h2>
            <p className="mt-2 text-sm text-[#667378]">
              We'll email a secure link to <strong className="text-[#17252b]">{email || "your account address"}</strong>.
              Open it and you can set a new password.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setResetOpen(false)}
                      className="min-h-[44px] rounded-[14px] border border-[#e7e4dc] px-4 font-bold text-[#667378] hover:bg-[#eaf0ff]">
                Cancel
              </button>
              <button autoFocus onClick={requestReset}
                      className="min-h-[44px] rounded-[14px] bg-[#2768ff] px-4 font-extrabold text-white hover:bg-[#164ed3]">
                Send reset link
              </button>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}

const inputCls =
  "w-full rounded-[14px] border border-[#e7e4dc] bg-white px-4 py-3 text-[#17252b] outline-none transition placeholder:text-[#a4aeb1] focus:border-[#2768ff] focus:ring-4 focus:ring-[#2768ff]/12";

function Field({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-xs font-extrabold uppercase tracking-wide text-[#667378]">{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-6 pb-11">{children}</div>
    </div>
  );
}
