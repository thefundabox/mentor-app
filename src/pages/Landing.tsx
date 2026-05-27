import { useAppState } from "@/hooks/useAppState";
import { motion } from "framer-motion";

export function Landing() {
  const { setLoginRoleIntent, setRoute } = useAppState();

  const pick = (role: "student" | "mentor") => {
    setLoginRoleIntent(role);
    setRoute("login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/50">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white flex items-center justify-center font-bold text-2xl mb-4 shadow-lg">R</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">RAS Mentorship</h1>
        <p className="text-slate-600 mt-3 max-w-md mx-auto">A focused, mentor-guided way to prepare for RAS. Daily plans, AI-style quizzes, and progress your mentor can actually see.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <RoleCard
          title="I'm a Student"
          desc="Build a daily prep chart with your mentor, earn points as you go, and unlock days by clearing quizzes."
          accent="indigo"
          emoji="🎯"
          onClick={() => pick("student")}
        />
        <RoleCard
          title="I'm a Mentor"
          desc="Approve student plans, track progress across all your students, and spot strong and weak areas at a glance."
          accent="emerald"
          emoji="🧭"
          onClick={() => pick("mentor")}
        />
      </div>

      <p className="text-xs text-slate-400 mt-10">Mockup · No real auth yet · all data lives in your browser</p>
    </div>
  );
}

function RoleCard({
  title, desc, accent, emoji, onClick,
}: {
  title: string;
  desc: string;
  accent: "indigo" | "emerald";
  emoji: string;
  onClick: () => void;
}) {
  const ring = accent === "indigo" ? "hover:border-indigo-300 hover:shadow-indigo-100" : "hover:border-emerald-300 hover:shadow-emerald-100";
  const accentBg = accent === "indigo" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700";
  return (
    <button
      onClick={onClick}
      className={`group text-left p-6 rounded-2xl border-2 border-slate-200 bg-white transition shadow-sm hover:shadow-lg ${ring}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${accentBg}`}>{emoji}</div>
      <div className="font-bold text-lg text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{desc}</div>
      <div className={`mt-4 text-sm font-semibold ${accent === "indigo" ? "text-indigo-600" : "text-emerald-600"} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition`}>
        Continue →
      </div>
    </button>
  );
}
