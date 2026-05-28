import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";

export function Login() {
  const { loginRoleIntent, loginAs, setRoute, users } = useAppState();
  const role = loginRoleIntent || "student";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    loginAs(role, email, name);
  }

  // Seed accounts for quick demo
  const demoAccounts = users.filter((u) => u.role === role);

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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome{role === "student" ? "" : " back"}</h1>
          <p className="text-sm text-slate-500 mb-6">
            {role === "student"
              ? "Sign in to continue your prep journey. New here? We'll set you up automatically."
              : role === "mentor"
              ? "Sign in to review your students' charts and progress."
              : "Sign in to manage the subject catalog, mentors, and platform metrics."}
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
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ${ringClass}`}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional — defaults from email"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ${ringClass}`}
              />
            </div>
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white font-semibold transition ${accentBg} disabled:opacity-50`}
              disabled={!email.includes("@")}
            >
              Sign in as {role}
            </button>
          </form>

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
              <div className="text-[10px] text-slate-400 mt-2">No password — this is a mock for demoing the flow.</div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
