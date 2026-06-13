import { useEffect } from "react";
import { AppProvider, useAppState } from "@/hooks/useAppState";
import { TopBar } from "@/components/TopBar";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Assessment } from "@/pages/Assessment";
import { ChoosePlan } from "@/pages/ChoosePlan";
import { Onboarding } from "@/pages/Onboarding";
import { ApprovalGate } from "@/pages/ApprovalGate";
import { TestsList } from "@/pages/TestsList";
import { TakeTest } from "@/pages/TakeTest";
import { TestResult } from "@/pages/TestResult";
import { PYQArchive } from "@/pages/PYQArchive";
import { SmartPractice } from "@/pages/SmartPractice";
import { SmartSessionScreen } from "@/pages/SmartSessionScreen";
import { StudentHome } from "@/pages/StudentHome";
import { TopicScreen } from "@/pages/TopicScreen";
import { QuizScreen } from "@/pages/QuizScreen";
import { Results } from "@/pages/Results";
import { MentorDashboard } from "@/pages/MentorDashboard";
import { MentorStudentDetail } from "@/pages/MentorStudentDetail";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { motion } from "framer-motion";

function AppContent() {
  const { currentUser, route, setRoute, activeDay, lastResult, getStudent, viewingStudentId } = useAppState();

  useEffect(() => {
    if (route !== "auto") return;
    if (!currentUser) { setRoute("landing"); return; }
    if (currentUser.role === "admin") { setRoute("admin"); return; }
    if (currentUser.role === "mentor") { setRoute("mentor"); return; }
    const s = getStudent(currentUser.id);
    const noPlanYet = !s || s.chart.days.filter((d) => d.length > 0).length === 0;
    // Brand-new student: no assessment AND no plan -> intake first.
    if (noPlanYet && !s?.assessment) { setRoute("assessment"); return; }
    // Has assessment but hasn't picked / built a plan yet.
    if (noPlanYet) { setRoute("choose_plan"); return; }
    if (s.chart.status === "draft") { setRoute("onboarding"); return; }
    if (s.chart.status === "pending_approval" || s.chart.status === "changes_requested") {
      setRoute("approval_gate"); return;
    }
    setRoute("home");
  }, [route, currentUser, getStudent, setRoute]);

  useEffect(() => {
    if (route === "landing" || route === "login") return;
    if (!currentUser) setRoute("landing");
  }, [currentUser, route, setRoute]);

  let content: React.ReactNode = null;

  if (!currentUser) {
    content = route === "login" ? <Login /> : <Landing />;
  } else if (currentUser.role === "admin") {
    content = <AdminDashboard />;
  } else if (currentUser.role === "mentor") {
    if (route === "mentor_student" && viewingStudentId) content = <MentorStudentDetail studentId={viewingStudentId} />;
    else if (route === "onboarding" && viewingStudentId) content = <Onboarding studentId={viewingStudentId} byMentor />;
    else content = <MentorDashboard />;
  } else {
    if (route === "assessment") content = <Assessment studentId={currentUser.id} />;
    else if (route === "choose_plan") content = <ChoosePlan studentId={currentUser.id} />;
    else if (route === "onboarding") content = <Onboarding studentId={currentUser.id} />;
    else if (route === "approval_gate") content = <ApprovalGate />;
    else if (route === "topic" && activeDay) content = <TopicScreen dayNum={activeDay} />;
    else if (route === "quiz" && activeDay) content = <QuizScreen dayNum={activeDay} />;
    else if (route === "results" && lastResult && activeDay) content = <Results dayNum={activeDay} />;
    else if (route === "tests") content = <TestsList />;
    else if (route === "take_test") content = <TakeTest />;
    else if (route === "test_result") content = <TestResult />;
    else if (route === "pyq_archive") content = <PYQArchive />;
    else if (route === "smart_practice") content = <SmartPractice />;
    else if (route === "smart_session") content = <SmartSessionScreen />;
    else content = <StudentHome />;
  }

  const showTopBar = !!currentUser && route !== "quiz" && route !== "take_test" && route !== "smart_session";

  return (
    <div className="min-h-screen bg-slate-50">
      {showTopBar && <TopBar />}
      <motion.div
        key={route + (activeDay || "") + (currentUser?.id || "none")}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {content}
      </motion.div>
      {showTopBar && (
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
          RAS Mentorship · all data lives in your browser · sign out from the top right
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
