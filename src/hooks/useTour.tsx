import { useCallback, useRef } from "react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useAppState } from "@/hooks/useAppState";
import type { TourStep, Route } from "@/types";

/**
 * Wraps driver.js. Exposes `startTour()` and `isRunning()`.
 *
 * Steps with a `screen` value cause the app to setRoute() to that screen
 * before the popover renders. Steps with target `"__center__"` render as
 * an unanchored, centered popover (used for intro / outro).
 */
export function useTour() {
  const { tourSteps, currentUser, setRoute, markTourSeen } = useAppState();
  const driverRef = useRef<Driver | null>(null);

  const routeForScreen = (screen?: TourStep["screen"]): Route | null => {
    if (!screen) return null;
    if (screen === "home") return "home";
    if (screen === "topic") return "topic";
    if (screen === "onboarding") return "onboarding";
    if (screen === "approval_gate") return "approval_gate";
    return null;
  };

  const buildDriveSteps = useCallback((): DriveStep[] => {
    const sorted = [...tourSteps].sort((a, b) => a.order - b.order);
    return sorted.map((s) => {
      const popover = {
        title: s.title,
        description: s.body,
        side: s.side,
        align: s.align,
      } as DriveStep["popover"];
      // Re-route before the step appears, if a screen was specified.
      const onHighlightStarted = () => {
        const r = routeForScreen(s.screen);
        if (r) setRoute(r);
      };
      const base: DriveStep = {
        popover: {
          ...popover,
          // driver.js types are loose here; this is supported.
          onPopoverRender: undefined,
        },
        onHighlightStarted,
      };
      if (s.target === "__center__") {
        return base;
      }
      return { ...base, element: s.target };
    });
  }, [tourSteps, setRoute]);

  const startTour = useCallback(() => {
    if (driverRef.current) {
      try { driverRef.current.destroy(); } catch { /* noop */ }
      driverRef.current = null;
    }
    const steps = buildDriveSteps();
    if (steps.length === 0) return;
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      steps,
      onDestroyStarted: () => {
        // mark tour seen once the user closes or finishes the tour
        if (currentUser?.role === "student") markTourSeen(currentUser.id);
        d.destroy();
      },
    });
    driverRef.current = d;
    d.drive();
  }, [buildDriveSteps, currentUser, markTourSeen]);

  const isRunning = useCallback(() => !!driverRef.current?.isActive(), []);

  return { startTour, isRunning };
}
