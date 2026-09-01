/**
 * The address bar, as the app's route.
 *
 * Routing was a string in localStorage and the URL never changed from "/". So
 * there was no back button, no refresh-to-where-you-were across devices, no
 * link you could send anyone, and -- the reason this was raised -- no way to
 * load one admin section without loading all of them, because nothing in the
 * address named a section.
 *
 * This maps the existing Route union to paths rather than replacing it. The
 * route state machine encodes real product decisions (the auto resolver, the
 * approval gate, what a brand-new student sees first); the URL is a projection
 * of that state, not a second source of truth competing with it.
 *
 * `auto` deliberately has no path. It is a request to resolve, not a place, and
 * writing it to the address bar would put "/auto" in someone's history.
 */
import type { Route } from "@/types";

export type AdminTab =
  | "people" | "catalog" | "plans" | "tour" | "questions"
  | "batches" | "tests" | "stats" | "current_affairs" | "limits";

/** Path segment per admin section. Hyphens read better in a URL than snake_case. */
const ADMIN_TAB_PATH: Record<AdminTab, string> = {
  people: "people",
  batches: "batches",
  catalog: "subjects",
  plans: "plans",
  tour: "tour",
  questions: "questions",
  current_affairs: "current-affairs",
  tests: "tests",
  stats: "stats",
  limits: "limits",
};

const ADMIN_PATH_TAB: Record<string, AdminTab> = Object.fromEntries(
  Object.entries(ADMIN_TAB_PATH).map(([tab, path]) => [path, tab as AdminTab]),
) as Record<string, AdminTab>;

/**
 * Route to path. Chosen for readability over a mechanical slugging of the union
 * -- a student sends "/journey", not "/home", and "/signin" is not "/login" by
 * accident: the sign-in screen serves sign-up too.
 */
const ROUTE_PATH: Partial<Record<Route, string>> = {
  landing: "/",
  methodology: "/method",
  login: "/signin",
  assessment: "/assessment",
  choose_plan: "/choose-plan",
  onboarding: "/plan",
  approval_gate: "/approval",
  home: "/journey",
  topic: "/topic",
  quiz: "/quiz",
  results: "/results",
  tests: "/tests",
  take_test: "/tests/take",
  test_result: "/tests/result",
  pyq_archive: "/pyq",
  pyq_attempt: "/pyq/attempt",
  book_session: "/book",
  mentor_availability: "/availability",
  discussion: "/discussion",
  smart_practice: "/practice",
  smart_session: "/practice/session",
  dashboard: "/dashboard",
  mentor: "/mentor",
  mentor_student: "/mentor/student",
  admin: "/admin",
};

const PATH_ROUTE: Record<string, Route> = Object.fromEntries(
  Object.entries(ROUTE_PATH).map(([route, path]) => [path, route as Route]),
) as Record<string, Route>;

/**
 * The path for a route. Returns null for `auto`, which has no address -- the
 * caller should leave the URL alone until the resolver picks a real route.
 */
export function pathFor(route: Route, adminTab?: AdminTab): string | null {
  if (route === "auto") return null;
  if (route === "admin") return `/admin/${ADMIN_TAB_PATH[adminTab ?? "people"]}`;
  return ROUTE_PATH[route] ?? null;
}

/**
 * The route a path names, or null when it names nothing we serve.
 *
 * Returning null rather than falling back to `landing` matters: an unknown path
 * should leave the persisted route untouched so a typo in the address bar does
 * not throw a signed-in student back to the marketing page.
 */
export function parsePath(pathname: string): { route: Route; adminTab?: AdminTab } | null {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === "/admin") return { route: "admin", adminTab: "people" };
  if (clean.startsWith("/admin/")) {
    const tab = ADMIN_PATH_TAB[clean.slice("/admin/".length)];
    return tab ? { route: "admin", adminTab: tab } : { route: "admin", adminTab: "people" };
  }

  const route = PATH_ROUTE[clean];
  return route ? { route } : null;
}

/* ==================== bootstrap and sync ==================== */

const ROUTE_KEY = "v5_route";
const ADMIN_TAB_KEY = "v5_adminTab";

/**
 * Seed the persisted route from the address bar, before React renders.
 *
 * useLocalStorage reads its key in a lazy initializer, so writing here -- ahead
 * of createRoot -- means the very first render already knows where it is going.
 * Doing the same work in an effect would let the auto resolver run first on the
 * persisted route and paint the wrong screen for a frame before the URL won.
 *
 * A path we do not serve is left alone rather than treated as the landing page:
 * a typo in the address bar should not sign a student out of their place.
 */
export function adoptUrlRoute(): void {
  try {
    const hit = parsePath(window.location.pathname);
    if (!hit) return;
    localStorage.setItem(ROUTE_KEY, JSON.stringify(hit.route));
    if (hit.adminTab) localStorage.setItem(ADMIN_TAB_KEY, JSON.stringify(hit.adminTab));
  } catch {
    // A browser with storage disabled still routes; it just will not persist.
  }
}

/**
 * Write the current route to the address bar.
 *
 * `replace` is for corrections that should not earn a history entry -- chiefly
 * the auto resolver landing on a real screen, which is the continuation of the
 * navigation that got here rather than a new one. Without that, Back from the
 * dashboard would return to a URL that immediately resolves forward again, and
 * the button would appear broken.
 */
export function syncUrl(route: Route, adminTab?: AdminTab, replace = false): void {
  const path = pathFor(route, adminTab);
  if (path === null) return;
  const current = window.location.pathname.replace(/\/+$/, "") || "/";
  if (current === path) return;
  const url = path + window.location.search;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
