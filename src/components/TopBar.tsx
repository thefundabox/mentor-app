import { useAppState } from "@/hooks/useAppState";
import { useTour } from "@/hooks/useTour";
import { HelpCircle } from "lucide-react";

export function TopBar() {
  const { currentUser, resetAll, logout, setRoute, setActiveDay, setViewingStudentId, getStudent, levelInfo } = useAppState();
  const { startTour } = useTour();

  const goHome = () => {
    if (!currentUser) { setRoute("landing"); return; }
    setActiveDay(null);
    if (currentUser.role === "admin") {
      setRoute("admin");
      return;
    }
    if (currentUser.role === "mentor") {
      setViewingStudentId(null);
      setRoute("mentor");
    } else {
      const s = getStudent(currentUser.id);
      if (s.chart.status === "draft" && s.chart.days.filter((d) => d.length > 0).length === 0) setRoute("onboarding");
      else if (s.chart.status === "pending_approval" || s.chart.status === "changes_requested") setRoute("approval_gate");
      else setRoute("home");
    }
  };

  const isStudent = currentUser?.role === "student";
  const info = isStudent ? levelInfo(currentUser!.id) : null;

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
        <button onClick={goHome} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white flex items-center justify-center font-bold">
            R
          </div>
          <div className="font-bold tracking-tight text-slate-900 group-hover:text-indigo-700 transition">
            RAS Mentorship
          </div>
        </button>

        <div className="flex items-center gap-3">
          {isStudent && info && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200">
              <div className="text-xs font-bold text-amber-700">Lv {info.level}</div>
              <div className="w-24 h-1.5 bg-amber-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${(info.xpInLevel / (info.xpInLevel + info.xpToNextLevel)) * 100}%` }}></div>
              </div>
              <div className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                <span>⭐</span>{info.total.toLocaleString()}
              </div>
            </div>
          )}

          {isStudent && (
            <button
              data-tour="restart-tour"
              onClick={startTour}
              title="Take the tour"
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition"
            >
              <HelpCircle className="w-4 h-4" />
              Tour
            </button>
          )}

          {currentUser && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${currentUser.role === "admin" ? "bg-slate-700" : currentUser.role === "mentor" ? "bg-emerald-500" : "bg-indigo-500"}`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{currentUser.role}</div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 ml-1"
              >
                Sign out
              </button>
            </div>
          )}

          <button
            onClick={resetAll}
            title="Reset all local data"
            className="text-xs text-slate-300 hover:text-rose-500 px-2 py-1 transition"
          >
            reset
          </button>
        </div>
      </div>
    </div>
  );
}
