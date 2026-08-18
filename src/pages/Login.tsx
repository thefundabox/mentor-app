import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";

type Mode = "signin" | "signup";

export function Login() {
  const {
    loginRoleIntent, loginAs, setRoute, users,
    signIn, signUp, authError, authEnabled,
  } = useAppState();

  const role = loginRoleIntent || "student";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const accent: "indigo" | "emerald" | "slate" =
    role === "student" ? "indigo" : role === "mentor" ? "emerald" : "slate";
  const accentBg = {
    indigo:  "bg-indigo-600 hover:bg-indigo-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    slate:   "bg-slate-700 hover:bg-slate-800",
  }[accent];
  const ringClass = {
    indigo:  "focus:ring-indigo-100 focus:border-indigo-400",
    emerald: "focus:ring-emerald-100 focus:border-emerald-400",
    slate:   "focus:ring-slate-200 focus:border-slate-400",
  }[accent];
  const dotColor = { indigo: "bg-indigo-500", emerald: "bg-emerald-500", slate: "bg-slate-500" }[accent];
  const labelColor = { indigo: "text-indigo-700", emerald: "text-emerald-700", slate: "text-slate-700" }[accent];

  const canSubmit = email.includes("@") && (!authEnabled || password.length >= 6);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setLocalError(null);

    // No Supabase project configured — fall back to the original local-only
    // sign-in so the app still runs (dev machines without .env.local, CI).
    if (!authEnabled) {
      loginAs(role, email, name);
      return;
    }

    setBusy(true);
    const result = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setBusy(false);

    if (result.error) { setLocalError(result.error); return; }
    if (result.needsConfirmation) { setConfirmSent(true); return; }
  }

  // Demo accounts are only meaningful in local-only mode. With real auth they
  // would be misleading: the row exists in localStorage but the account does
  // not exist in Supabase until someone actually registers it.
  const demoAccounts = authEnabled ? [] : users.filter((u) => u.role === role);
  const shownError = localError || authError;

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/50">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <MailCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-sm text-slate-600 mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back
            and sign in.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setMode("signin"); setPassword(""); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← back to sign in
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/50">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <button onClick={() => setRoute("landing")} className="text-sm text-slate-500 hover:text-slate-800 mb-4">← back</button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${labelColor} mb-2`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
            {role === "student" ? "Student sign-in" : role === "mentor" ? "Mentor sign-in" : "Admin sign-in"}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === "signup"
              ? "Everyone starts as a student. Mentor and admin access is granted by your institute."
              : "Sign in to continue where you left off."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ${ringClass}`}
                autoFocus
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional — defaults from email"
                  autoComplete="name"
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ${ringClass}`}
                />
              </div>
            )}

            {authEnabled && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ${ringClass}`}
                />
              </div>
            )}

            {shownError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
                {shownError}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 ${accentBg} disabled:opacity-50`}
              disabled={!canSubmit || busy}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signup" ? "Create account" : `Sign in as ${role}`}
            </button>
          </form>

          {authEnabled && (
            <div className="mt-5 text-center text-sm text-slate-500">
              {mode === "signin" ? (
                <>New here?{" "}
                  <button onClick={() => { setMode("signup"); setLocalError(null); }}
                    className="font-medium text-indigo-600 hover:text-indigo-800">Create an account</button>
                </>
              ) : (
                <>Already registered?{" "}
                  <button onClick={() => { setMode("signin"); setLocalError(null); }}
                    className="font-medium text-indigo-600 hover:text-indigo-800">Sign in</button>
                </>
              )}
            </div>
          )}

          {demoAccounts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Demo accounts</div>
              <div className="space-y-1.5">
                {demoAccounts.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => loginAs(role, u.email, u.name)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                    <span className="text-xs text-indigo-600 font-medium">use →</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                Local-only mode — no Supabase project configured, so there is no password.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
