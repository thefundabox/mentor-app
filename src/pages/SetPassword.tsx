import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";

/**
 * Shown when a user arrives via a password-reset link.
 *
 * `detectSessionInUrl` has already turned the link's token into a session, so
 * they are signed in — but without ever proving a password. This screen renders
 * ahead of everything else until they set one.
 */
export function SetPassword() {
  const { updatePassword, logout } = useAppState();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 6 && password === confirm && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/50">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Set a new password</h1>
        <p className="text-sm text-slate-500 mb-6">
          Choose a password for your account. You will stay signed in afterwards.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              New password
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            />
            {tooShort && <div className="text-xs text-rose-600 mt-1">Must be at least 6 characters.</div>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            />
            {mismatch && <div className="text-xs text-rose-600 mt-1">Passwords do not match.</div>}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save password
          </button>
        </form>

        <button
          onClick={logout}
          className="mt-5 w-full text-center text-sm text-slate-500 hover:text-slate-800"
        >
          Cancel and sign out
        </button>
      </motion.div>
    </div>
  );
}
