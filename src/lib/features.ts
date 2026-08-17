/**
 * Feature flags.
 *
 * Compile-time switches for features that are built but not currently exposed
 * to students. Flipping a flag to `true` restores every entry point for that
 * feature — the pages, routes, and underlying logic are left intact so nothing
 * has to be rebuilt.
 */

/**
 * Smart practice (adaptive session picker + runner).
 *
 * Hidden from the student UI. When false:
 *   - the "Smart practice" buttons disappear from Dashboard, StudentHome, Results
 *   - the `smart_practice` / `smart_session` routes fall through to the default
 *
 * The pages (`SmartPractice`, `SmartSessionScreen`), the selector/scheduler libs,
 * and all `SmartSessionRecord` state remain untouched — existing session history
 * still feeds the dashboard metrics.
 */
export const SMART_PRACTICE_ENABLED = false;
