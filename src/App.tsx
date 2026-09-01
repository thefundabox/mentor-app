import { useEffect, useRef, lazy, Suspense } from "react";
import { AppProvider, useAppState } from "@/hooks/useAppState";
import type { Route } from "@/types";
import { TopBar } from "@/components/TopBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Landing } from "@/pages/Landing";

/* ----------------------------------------------------------------------
 * Every screen below is fetched when it is first shown, not up front.
 *
 * These were all static imports, so one chunk carried every page: a student
 * downloaded the whole admin shell and the mentor dashboard before their own
 * journey could paint, and a mentor downloaded the quiz engine. Landing, Login,
 * Methodology and SetPassword stay eager -- they are the first paint for a
 * signed-out visitor and the password-recovery path, so deferring them would
 * only add a spinner to the fastest screens.
 * -------------------------------------------------------------------- */
const Assessment = lazy(() => import("@/pages/Assessment").then((m) => ({ default: m.Assessment })));
const ChoosePlan = lazy(() => import("@/pages/ChoosePlan").then((m) => ({ default: m.ChoosePlan })));
const Onboarding = lazy(() => import("@/pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const ApprovalGate = lazy(() => import("@/pages/ApprovalGate").then((m) => ({ default: m.ApprovalGate })));
const TestsList = lazy(() => import("@/pages/TestsList").then((m) => ({ default: m.TestsList })));
const TakeTest = lazy(() => import("@/pages/TakeTest").then((m) => ({ default: m.TakeTest })));
const TestResult = lazy(() => import("@/pages/TestResult").then((m) => ({ default: m.TestResult })));
const PYQArchive = lazy(() => import("@/pages/PYQArchive").then((m) => ({ default: m.PYQArchive })));
const PYQAttempt = lazy(() => import("@/pages/PYQAttempt").then((m) => ({ default: m.PYQAttempt })));
const BookSession = lazy(() => import("@/pages/BookSession").then((m) => ({ default: m.BookSession })));
const MentorAvailability = lazy(() => import("@/pages/MentorAvailability").then((m) => ({ default: m.MentorAvailability })));
const Discussion = lazy(() => import("@/pages/Discussion").then((m) => ({ default: m.Discussion })));
const SmartPractice = lazy(() => import("@/pages/SmartPractice").then((m) => ({ default: m.SmartPractice })));
const SmartSessionScreen = lazy(() => import("@/pages/SmartSessionScreen").then((m) => ({ default: m.SmartSessionScreen })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const StudentHome = lazy(() => import("@/pages/StudentHome").then((m) => ({ default: m.StudentHome })));
const TopicScreen = lazy(() => import("@/pages/TopicScreen").then((m) => ({ default: m.TopicScreen })));
const QuizScreen = lazy(() => import("@/pages/QuizScreen").then((m) => ({ default: m.QuizScreen })));
const Results = lazy(() => import("@/pages/Results").then((m) => ({ default: m.Results })));
const MentorDashboard = lazy(() => import("@/pages/MentorDashboard").then((m) => ({ default: m.MentorDashboard })));
const MentorStudentDetail = lazy(() => import("@/pages/MentorStudentDetail").then((m) => ({ default: m.MentorStudentDetail })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
import { Login } from "@/pages/Login";
import { Methodology } from "@/pages/Methodology";
import { SetPassword } from "@/pages/SetPassword";
import { motion } from "framer-motion";
import { SMART_PRACTICE_ENABLED } from "@/lib/features";

function AppContent() {
  const { currentUser, route, setRoute, activeDay, lastResult, getStudent, viewingStudentId, setViewingStudentId, recoveryMode, authLoading, authError, clearAuthError, defaultTemplate, adoptPlanTemplate, authEnabled, settings } = useAppState();

  // A signed-out visitor must never be *restored* onto a public inner screen.
  //
  // `route` is persisted, and that is worth keeping (see the long note below).
  // But "login" is not a place anyone should resume: once a visitor tapped
  // Start preparing, every later visit to the bare domain reopened the sign-in
  // screen and the homepage became unreachable by URL. That -- not the form
  // itself -- is what "it gets stuck on the Sign In page" was.
  //
  // Gated on authLoading so it cannot fire during the window where the session
  // has not been restored yet and currentUser is only momentarily falsy; that
  // window is exactly what made the earlier "reset to landing" effect destroy a
  // signed-in student's place. Runs once, and resets to "auto" rather than
  // "landing" so the signed-in case still resolves to their own dashboard.
  const publicRouteSettled = useRef(false);
  useEffect(() => {
    if (authLoading || publicRouteSettled.current) return;
    publicRouteSettled.current = true;
    if (!currentUser && (route === "login" || route === "methodology")) setRoute("auto");
  }, [authLoading, currentUser, route, setRoute]);

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

  /* ---------- keep the address bar honest about the role ----------
   *
   * The admin branch below renders AdminDashboard whatever the route says, and
   * the mentor branch falls through to MentorDashboard the same way. That was
   * invisible while the URL was always "/", but now the address bar is real: an
   * admin landing on /journey saw the admin screen at a student's URL, and Back
   * or a refresh from there went somewhere else again.
   *
   * Rather than teach every branch to render foreign routes, a route the
   * current role cannot serve is normalised to that role's home. The URL then
   * always names what is actually on screen.
   */
  const ROLE_ROUTES: Record<string, Route[]> = {
    admin: ["admin"],
    mentor: ["mentor", "mentor_student", "mentor_availability", "dashboard", "onboarding", "discussion", "methodology"],
    student: [
      "home", "methodology", "assessment", "choose_plan", "onboarding", "approval_gate",
      "topic", "quiz", "results", "tests", "take_test", "test_result", "pyq_archive",
      "pyq_attempt", "book_session", "discussion", "smart_practice", "smart_session", "dashboard",
    ],
  };
  const ROLE_HOME: Record<string, Route> = { admin: "admin", mentor: "mentor", student: "home" };

  useEffect(() => {
    if (!currentUser || route === "auto" || recoveryMode) return;
    const allowed = ROLE_ROUTES[currentUser.role];
    if (allowed && !allowed.includes(route)) setRoute(ROLE_HOME[currentUser.role]);
    // ROLE_ROUTES / ROLE_HOME are literals rebuilt each render; depending on
    // them would loop. Role and route are what actually decide this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, route, recoveryMode, setRoute]);

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
    content = route === "login" ? <Login />
            : route === "methodology" ? <Methodology />
            : <Landing />;
  } else if (currentUser.role === "admin") {
    content = <AdminDashboard />;
  } else if (currentUser.role === "mentor") {
    if (route === "methodology") content = <Methodology />;
    else if (route === "discussion") content = <Discussion />;
    else if (route === "mentor_student" && viewingStudentId) content = <MentorStudentDetail studentId={viewingStudentId} />;
    else if (route === "dashboard" && viewingStudentId) content = <Dashboard studentId={viewingStudentId} />;
    else if (route === "onboarding" && viewingStudentId) content = <Onboarding studentId={viewingStudentId} byMentor />;
    else if (route === "mentor_availability") content = <MentorAvailability />;
    else content = <MentorDashboard />;
  } else {
    if (route === "methodology") content = <Methodology />;
    else if (route === "assessment") content = <Assessment studentId={currentUser.id} />;
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
          {/* Inside the ErrorBoundary, so a chunk that fails to download is
              caught by the same reset path as any other render failure rather
              than blanking the app. */}
          <Suspense fallback={<ScreenLoading />}>{content}</Suspense>
        </ErrorBoundary>
      </motion.div>
      {showTopBar && (
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
          {/* Was "all data lives in your browser", which stopped being true once
              progress moved to Postgres -- and told every student their work
              was local when it is synced and visible to their mentor. */}
          {settings.productName} · {authEnabled
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

function ScreenLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 text-center text-sm text-slate-400">
      Loading…
    </div>
  );
}
