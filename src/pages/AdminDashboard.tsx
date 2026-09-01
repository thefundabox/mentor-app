/**
 * Admin shell.
 *
 * This file used to be 2,772 lines holding every section at once: People,
 * Batches, the subject master, the question bank with its PYQ bulk importer,
 * the test editor, current affairs. All of it was parsed and evaluated before
 * the first tab could paint, and all of it shipped in the single application
 * chunk whether an admin opened it or not.
 *
 * Now each section is its own module behind React.lazy, so opening People
 * fetches People. The tab lives in the URL (/admin/batches, /admin/subjects),
 * which is what makes that possible -- a section can only be loaded on demand
 * if something in the address names which section is wanted.
 */
import { lazy, Suspense } from "react";
import { useAppState } from "@/hooks/useAppState";
import {
  Users, BookOpen, BarChart3, SlidersHorizontal, Layout, Compass,
  HelpCircle, GraduationCap, FileText, Newspaper, Loader2, Settings2,
} from "lucide-react";

// One chunk per section. The import() calls are deliberately static string
// literals -- Vite can only split what it can see at build time.
const PeopleTab         = lazy(() => import("./admin/People").then((m) => ({ default: m.PeopleTab })));
const BatchesTab        = lazy(() => import("./admin/Batches").then((m) => ({ default: m.BatchesTab })));
const CatalogTab        = lazy(() => import("./admin/Catalog").then((m) => ({ default: m.CatalogTab })));
const PlansTab          = lazy(() => import("./admin/Plans").then((m) => ({ default: m.PlansTab })));
const TourTab           = lazy(() => import("./admin/Tour").then((m) => ({ default: m.TourTab })));
const QuestionsTab      = lazy(() => import("./admin/Questions").then((m) => ({ default: m.QuestionsTab })));
const CurrentAffairsTab = lazy(() => import("./admin/CurrentAffairs").then((m) => ({ default: m.CurrentAffairsTab })));
const TestsTab          = lazy(() => import("./admin/Tests").then((m) => ({ default: m.TestsTab })));
const StatsTab          = lazy(() => import("./admin/Stats").then((m) => ({ default: m.StatsTab })));
const SettingsTab       = lazy(() => import("./admin/Settings").then((m) => ({ default: m.SettingsTab })));
const LimitsTab         = lazy(() => import("./admin/Limits").then((m) => ({ default: m.LimitsTab })));

const TABS = [
  { id: "people",          label: "People",          icon: Users },
  { id: "batches",         label: "Batches",         icon: GraduationCap },
  { id: "catalog",         label: "Subject master",  icon: BookOpen },
  { id: "plans",           label: "Default plans",   icon: Layout },
  { id: "tour",            label: "Tour steps",      icon: Compass },
  { id: "questions",       label: "Questions",       icon: HelpCircle },
  { id: "current_affairs", label: "Current affairs", icon: Newspaper },
  { id: "tests",           label: "Tests",           icon: FileText },
  { id: "stats",           label: "Stats",           icon: BarChart3 },
  { id: "limits",          label: "Plans & limits",  icon: SlidersHorizontal },
  { id: "settings",        label: "Institute",       icon: Settings2 },
] as const;

export function AdminDashboard() {
  const { adminTab, setAdminTab } = useAppState();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-sm font-semibold text-slate-600">Admin</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform overview</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <TabButton
            key={id}
            active={adminTab === id}
            onClick={() => setAdminTab(id)}
            icon={<Icon className="w-4 h-4" />}
            label={label}
          />
        ))}
      </div>

      {/* Keyed on the tab so switching sections shows the fallback again rather
          than holding the previous section on screen while the next downloads. */}
      <Suspense key={adminTab} fallback={<SectionLoading />}>
        {adminTab === "people"          && <PeopleTab />}
        {adminTab === "batches"         && <BatchesTab />}
        {adminTab === "catalog"         && <CatalogTab />}
        {adminTab === "plans"           && <PlansTab />}
        {adminTab === "tour"            && <TourTab />}
        {adminTab === "questions"       && <QuestionsTab />}
        {adminTab === "current_affairs" && <CurrentAffairsTab />}
        {adminTab === "tests"           && <TestsTab />}
        {adminTab === "stats"           && <StatsTab />}
        {adminTab === "limits"          && <LimitsTab />}
        {adminTab === "settings"        && <SettingsTab />}
      </Suspense>
    </div>
  );
}

function SectionLoading() {
  return (
    <div className="flex items-center gap-3 py-16 justify-center text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-medium">Loading…</span>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition whitespace-nowrap ${
        active ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}>
      {icon}{label}
    </button>
  );
}
