import { useEffect } from "react";
import { AppProvider, useAppState } from "@/hooks/useAppState";
import { TopBar } from "@/components/TopBar";
import { Onboarding } from "@/pages/Onboarding";
import { StudentHome } from "@/pages/StudentHome";
import { TopicScreen } from "@/pages/TopicScreen";
import { QuizScreen } from "@/pages/QuizScreen";
import { Results } from "@/pages/Results";
import { MentorDashboard } from "@/pages/MentorDashboard";
import { motion } from "framer-motion";

function AppContent() {
  const {
    role,
    chart,
    route,
    setRoute,
    activeDay,
    lastResult,
  } = useAppState();

  // Initial auto-routing
  useEffect(() => {
    if (route === "auto") {
      if (role === "mentor") {
        setRoute("mentor");
      } else if (chart.filter(Boolean).length === 0) {
        setRoute("onboarding");
      } else {
        setRoute("home");
      }
    }
  }, [role, chart, route, setRoute]);

  // Switch view when role changes
  useEffect(() => {
    if (role === "mentor") {
      setRoute("mentor");
    } else {
      if (chart.filter(Boolean).length === 0) {
        setRoute("onboarding");
      } else {
        setRoute("home");
      }
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine what to render
  let content = null;

  if (role === "mentor") {
    if (route === "onboarding") {
      content = <Onboarding />;
    } else {
      content = <MentorDashboard />;
    }
  } else {
    if (route === "onboarding") {
      content = <Onboarding />;
    } else if (route === "home") {
      content = <StudentHome />;
    } else if (route === "topic" && activeDay) {
      content = <TopicScreen dayNum={activeDay} />;
    } else if (route === "quiz" && activeDay) {
      content = <QuizScreen dayNum={activeDay} />;
    } else if (route === "results" && lastResult && activeDay) {
      content = <Results dayNum={activeDay} />;
    } else {
      // Fallback
      if (chart.filter(Boolean).length === 0) {
        content = <Onboarding />;
      } else {
        content = <StudentHome />;
      }
    }
  }

  // Hide top bar during quiz for focus mode
  const showTopBar = route !== "quiz";

  return (
    <div className="min-h-screen bg-slate-50">
      {showTopBar && <TopBar />}
      <motion.div
        key={route + (activeDay || "")}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {content}
      </motion.div>
      {showTopBar && (
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
          RAS Mentorship Demo · All data stored in localStorage · Click{" "}
          <span className="font-mono">reset</span> to start fresh
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
