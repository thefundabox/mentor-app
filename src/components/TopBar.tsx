import { useAppState } from "@/hooks/useAppState";
import type { Role } from "@/types";

export function TopBar() {
  const { role, setRole, resetAll, chart, setRoute } = useAppState();

  const goHome = () => {
    if (role === "mentor") {
      setRoute("mentor");
    } else {
      if (chart.filter(Boolean).length === 0) {
        setRoute("onboarding");
      } else {
        setRoute("home");
      }
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={goHome} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white flex items-center justify-center font-bold">
            R
          </div>
          <div className="font-bold tracking-tight text-slate-900 group-hover:text-indigo-700 transition">
            RAS Mentorship
          </div>
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-1">
            demo
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 rounded-xl p-1 flex text-sm font-medium">
            <button
              onClick={() => setRole("student" as Role)}
              className={`px-3 py-1.5 rounded-lg transition ${
                role === "student"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setRole("mentor" as Role)}
              className={`px-3 py-1.5 rounded-lg transition ${
                role === "mentor"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Mentor
            </button>
          </div>
          <button
            onClick={resetAll}
            title="Reset all local data"
            className="text-xs text-slate-400 hover:text-rose-500 px-2 py-1 transition"
          >
            reset
          </button>
        </div>
      </div>
    </div>
  );
}
