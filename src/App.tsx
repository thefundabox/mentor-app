import { useEffect } from "react";
import { AppProvider, useAppState } from "@/hooks/useAppState";
import { TopBar } from "@/components/TopBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { SetPassword } from "@/pages/SetPassword";
import { Assessment } from "@/pages/Assessment";
import { ChoosePlan } from "@/pages/ChoosePlan";
import { Onboarding } from "@/pages/Onboarding";
import { ApprovalGate } from "@/pages/ApprovalGate";
import { TestsList } from "@/pages/TestsList";
import { TakeTest } from "@/pages/TakeTest";
import { TestResult } from "@/pages/TestResult";
import { PYQArchive } from "@/pages/PYQArchive";
import { PYQAttempt } from "@/pages/PYQAttempt";
import { BookSession } from "@/pages/BookSession";
import { MentorAvailability } from "@/pages/MentorAvailability";
import { Discussion } from "@/pages/Discussion";
import { SmartPractice } from "@/pages/SmartPractice";
import { SmartSessionScreen } from "@/pages/SmartSessionScreen";
import { Dashboard } from "@/pages/Dashboard";
import { StudentHome } from "@/pages/StudentHome";
import { TopicScreen } from "@/pages/TopicScreen";
import { QuizScreen } from "@/pages/QuizScreen";
import { Results } from "@/pages/Results";
import { MentorDashboard } from "@/pages/MentorDashboard";
import { MentorStudentDetail } from "@/pages/MentorStudentDetail";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { motion } from "framer-motion";
import { SMART_PRACTICE_ENABLED } from "@/lib/features";

function AppContent() {
  const { currentUser, route, setRoute, activeDay, lastResult, getStudent, viewingStudentId, setViewingStudentId, recoveryMode, authError, clearAuthError, defaultTemplate, adoptPlanTemplate, authEnabled } = useAppState();

  useEffect(() => {
    if (route !== "auto") return;
    if (!currentUser) { setRoute("landing"); return; }
    if (currentUser.role === "admin") { setRoute("admin"); return; }
    if (currentUser.role === "mentor") { setRoute("mentor"); return; }
    const s = getStudent(currentUser.id);
    const noPlanYet = !s || s.chart.days.filter((d) => d.length > 0).length === 0;
    // Brand-new student: no assessment AND no plan -> intake first.
    if (noPlanYet && !s?.assessment) { setRoute("assessment"); return; }
    // Has assessment but no plan. If the institute publishes a default, apply it
    // and carry on — most students should never meet the chart builder. Anyone
    // who wants to build their own reaches it from the plan screen.
    if (noPlanYet && defaultTemplate) {
      adoptPlanTemplate(currentUser.id, defaultTemplate.id);
      setRoute("onboarding");
      return;
    }
    if (noPlanYet) { setRoute("choose_plan"); return; }
    if (s.chart.status === "draft") { setRoute("onboarding"); return; }
    if (s.chart.status === "pending_approval" || s.chart.status === "changes_requested") {
      setRoute("approval_gate"); return;
    }
    // Fully onboarded student lands on Dashboard (the daily readiness view),
    // not the day path. The journey is one click away via the nav.
    setRoute("dashboard");
  }, [route, currentUser, getStudent, setRoute, defaultTemplate, adoptPlanTemplate]);

  // Deliberately no "if (!currentUser) setRoute('landing')" effect here.
  //
  // The render below already falls to <Landing /> whenever currentUser is
  // falsy, so that effect changed nothing on screen -- all it did was overwrite
  // the persisted route. And because `route` lives in localStorage, a single
  // render with a momentarily-falsy currentUser permanently destroyed where the
  // student was: they came back to the landing page, and reloading did not
  // recover it, because "landing" had been written to disk. One dropped frame
  // mid-quiz was indistinguishable from being signed out for good.
  //
  // Leaving route untouched means a transient blip shows Landing while it
  // lasts and returns the student to exactly where they were afterwards. A
  // genuine sign-out still lands correctly: logout() sets the route itself.

  let content: React.ReactNode = null;

  // Ahead of every other branch: arriving via a reset link signs the user in
  // without a password, so nothing else should render until they set one.
  if (recoveryMode) {
    content = <SetPassword />;
  } else if (currentUser && route === "auto") {
    // "auto" is a sentinel the effect above resolves, not a screen. Falling
    // through to the role branches rendered StudentHome for a student who has
    // no plan yet, which returns null -- so the first paint after signing in was
    // a bare header and footer until the user reloaded.
    content = (
      <div className="max-w-6xl mx-auto px-6 py-24 text-center text-sm text-slate-400">
        Setting up your workspace...
      </div>
    );
  } else if (!currentUser) {
    content = route === "login" ? <Login /> : <Landing />;
  } else if (currentUser.role === "admin") {
    content = <AdminDashboard />;
  } else if (currentUser.role === "mentor") {
    if (route === "discussion") content = <Discussion />;
    else if (route === "mentor_student" && viewingStudentId) content = <MentorStudentDetail studentId={viewingStudentId} />;
    else if (route === "dashboard" && viewingStudentId) content = <Dashboard studentId={viewingStudentId} />;
    else if (route === "onboarding" && viewingStudentId) content = <Onboarding studentId={viewingStudentId} byMentor />;
    else if (route === "mentor_availability") content = <MentorAvailability />;
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
    else if (route === "pyq_attempt") content = <PYQAttempt />;
    else if (route === "book_session") content = <BookSession />;
    else if (route === "discussion") content = <Discussion />;
    else if (route === "smart_practice" && SMART_PRACTICE_ENABLED) content = <SmartPractice />;
    else if (route === "smart_session" && SMART_PRACTICE_ENABLED) content = <SmartSessionScreen />;
    else if (route === "dashboard") content = <Dashboard studentId={currentUser.id} />;
    else content = <StudentHome />;
  }

  const showTopBar = !!currentUser && !recoveryMode
    && route !== "quiz" && route !== "take_test" && route !== "smart_session"
    && route !== "pyq_attempt";

  return (
    <div className="min-h-screen bg-slate-50">
      {showTopBar && <TopBar />}
      {/* Global error banner. Until this existed, authError rendered only on the
          Login screen, so a failed save elsewhere -- a mentor's plan approval
          being refused by RLS, for instance -- was completely silent and the UI
          happily showed the change as if it had been written. */}
      {/* Not gated on currentUser. It used to be, which meant the one message
          that explains why somebody was signed out was hidden by the very fact
          of their being signed out -- so an unexpected logout arrived with no
          stated cause, for the student or for us. */}
      {!!authError && (
        <div className="bg-rose-50 border-b border-rose-200">
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-start gap-3">
            <div className="flex-1 text-sm text-rose-800">{authError}</div>
            <button
              onClick={clearAuthError}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 shrink-0"
            >
              dismiss
            </button>
          </div>
        </div>
      )}
      <motion.div
        key={route + (activeDay || "") + (currentUser?.id || "none")}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Keyed on the route so "Back to start" re-mounts the tree cleanly. */}
        <ErrorBoundary
          key={route + (currentUser?.id || "none")}
          onReset={() => { setViewingStudentId(null); setRoute("auto"); }}
        >
          {content}
        </ErrorBoundary>
      </motion.div>
      {showTopBar && (
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
          {/* Was "all data lives in your browser", which stopped being true once
              progress moved to Postgres -- and told every student their work
              was local when it is synced and visible to their mentor. */}
          RAS Mentorship · {authEnabled
            ? "your progress is saved to your account"
            : "local demo mode — data stays in this browser"}
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
