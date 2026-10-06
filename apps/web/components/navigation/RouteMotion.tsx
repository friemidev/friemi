"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getRouteMotionDirection,
  readRouteMotionIndex,
  routeMotionHistoryKey,
  type RouteMotionDirection,
} from "@/features/navigation/routeMotion";

function supportsRouteMotion() {
  return (
    typeof Element.prototype.animate === "function" &&
    typeof CSS !== "undefined" &&
    CSS.supports("overflow-x", "clip") &&
    CSS.supports("translate", "1px")
  );
}

function getMotionTargets(surface: HTMLElement) {
  const fixed = new Set(
    Array.from(surface.querySelectorAll<HTMLElement>("*")).filter(
      (element) => getComputedStyle(element).position === "fixed",
    ),
  );
  const ancestors = new Set<HTMLElement>();
  for (const element of fixed) {
    let parent = element.parentElement;
    while (parent && surface.contains(parent)) {
      ancestors.add(parent);
      parent = parent.parentElement;
    }
  }
  const targets: HTMLElement[] = [];
  const visit = (element: HTMLElement) => {
    if (fixed.has(element)) return;
    if (ancestors.has(element)) {
      for (const child of element.children) {
        if (child instanceof HTMLElement) visit(child);
      }
    } else if (
      element.getBoundingClientRect().width > 0 &&
      element.getBoundingClientRect().height > 0
    ) {
      targets.push(element);
    }
  };
  // Never transform an ancestor of a fixed control: its containing block would change.
  visit(surface);
  return targets;
}

export function RouteMotion() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRef = useRef<{ pathname: string; routeKey: string } | null>(
    null,
  );
  const historyIndexRef = useRef(0);
  const traversalRef = useRef<{
    index: number | null;
    direction: RouteMotionDirection;
  } | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    if (!supportsRouteMotion()) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      if (reducedMotion.matches) {
        cancelRef.current?.();
        delete document.documentElement.dataset.friemiRouteMotion;
      } else {
        document.documentElement.dataset.friemiRouteMotion = "enabled";
      }
    };
    const onPopState = (event: PopStateEvent) => {
      const targetKey = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;
      if (targetKey === previousRef.current?.routeKey) return;
      const index = readRouteMotionIndex(event.state);
      traversalRef.current = {
        index,
        direction:
          index !== null && index > historyIndexRef.current
            ? "forward"
            : "back",
      };
    };
    const interrupt = () => cancelRef.current?.();
    const onVisibilityChange = () => {
      if (document.hidden) interrupt();
    };
    let pressedCancel: (() => void) | null = null;
    let releaseFrame = 0;
    let pressTimer = 0;
    const onPointerDown = () => {
      window.clearTimeout(pressTimer);
      pressedCancel = cancelRef.current;
      animationsRef.current.forEach((animation) => animation.pause());
      // A pointer released outside the window must not leave the page paused.
      if (pressedCancel) pressTimer = window.setTimeout(pressedCancel, 800);
    };
    const onPointerUp = () => {
      window.clearTimeout(pressTimer);
      const cancel = pressedCancel;
      pressedCancel = null;
      // Keep the pressed target stationary until its click has been dispatched.
      if (cancel) releaseFrame = requestAnimationFrame(cancel);
    };
    updatePreference();
    reducedMotion.addEventListener("change", updatePreference);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("blur", interrupt);
    window.addEventListener("resize", interrupt);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", interrupt, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", interrupt, true);
    document.addEventListener("wheel", interrupt, {
      passive: true,
      capture: true,
    });
    return () => {
      interrupt();
      cancelAnimationFrame(releaseFrame);
      window.clearTimeout(pressTimer);
      delete document.documentElement.dataset.friemiRouteMotion;
      reducedMotion.removeEventListener("change", updatePreference);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("resize", interrupt);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", interrupt, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("keydown", interrupt, true);
      document.removeEventListener("wheel", interrupt, true);
    };
  }, []);

  useLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { pathname, routeKey };
    const traversal = traversalRef.current;
    traversalRef.current = null;
    if (!supportsRouteMotion()) return;

    if (!previous) {
      historyIndexRef.current = readRouteMotionIndex(window.history.state) ?? 0;
    } else if (traversal) {
      historyIndexRef.current = traversal.index ?? historyIndexRef.current - 1;
    } else if (previous.routeKey !== routeKey) {
      historyIndexRef.current += 1;
    }
    try {
      // Preserve Next's router state; the marker also distinguishes browser forward.
      window.history.replaceState(
        {
          ...window.history.state,
          [routeMotionHistoryKey]: historyIndexRef.current,
        },
        "",
      );
    } catch {
      // Motion is optional when history updates are unavailable in a WebView.
    }

    if (
      !previous ||
      document.documentElement.dataset.friemiRouteMotion !== "enabled" ||
      document.hidden
    )
      return;
    const direction = getRouteMotionDirection({
      fromPath: previous.pathname,
      toPath: pathname,
      historyDirection: traversal?.direction,
    });
    if (
      !direction ||
      document.querySelector('[aria-modal="true"], dialog[open]')
    )
      return;

    const surface = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".app-layout-shell main:not(main main)",
      ),
    ).find(
      (element) =>
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0,
    );
    if (!surface) return;

    const targets = getMotionTargets(surface);
    if (!targets.length) return;

    surface.dataset.friemiRouteSurface = "";
    document.documentElement.dataset.friemiRouteDirection = direction;
    const animations: Animation[] = [];
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      delete surface.dataset.friemiRouteSurface;
      delete document.documentElement.dataset.friemiRouteDirection;
      if (cancelRef.current === cancel) cancelRef.current = null;
      if (animationsRef.current === animations) animationsRef.current = [];
    };
    const cancel = () => {
      animations.forEach((animation) => animation.cancel());
      cleanup();
    };
    cancelRef.current = cancel;
    animationsRef.current = animations;
    try {
      const offset =
        Math.min(32, window.innerWidth * 0.08) *
        (direction === "back" ? -1 : 1);
      for (const target of targets) {
        const animation = target.animate(
          [
            { translate: `${offset}px 0` },
            { translate: "0px 0" },
          ],
          { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
        animation.id = "friemi-route-slide-in";
        animations.push(animation);
      }
      void Promise.all(animations.map((animation) => animation.finished)).then(
        cleanup,
        cancel,
      );
    } catch {
      cancel();
    }
    return cancel;
  }, [pathname, routeKey]);

  return null;
}
