"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const MIN_SCROLLABLE_DISTANCE = 24;

function shouldHideMobileScrollProgress(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstRouteSegment = segments[0];
  const localizedRouteSegment = segments[1];

  if (
    firstRouteSegment === "footprints" ||
    firstRouteSegment === "game-tools" ||
    firstRouteSegment === "profile" ||
    localizedRouteSegment === "footprints" ||
    localizedRouteSegment === "game-tools" ||
    localizedRouteSegment === "profile" ||
    (segments.length === 2 && firstRouteSegment === "messages") ||
    (segments.length === 3 && localizedRouteSegment === "messages")
  ) {
    return true;
  }

  return (
    (segments.length === 1 &&
      (firstRouteSegment === "mobile-home" ||
        firstRouteSegment === "activities" ||
        firstRouteSegment === "footprints" ||
        firstRouteSegment === "lobby" ||
        firstRouteSegment === "planets" ||
        firstRouteSegment === "profile")) ||
    (segments.length === 2 &&
      (localizedRouteSegment === "mobile-home" ||
        localizedRouteSegment === "activities" ||
        localizedRouteSegment === "footprints" ||
        localizedRouteSegment === "lobby" ||
        localizedRouteSegment === "planets" ||
        localizedRouteSegment === "profile")) ||
    (segments.length === 2 &&
      firstRouteSegment === "activities" &&
      segments[1] === "new") ||
    (segments.length === 3 &&
      localizedRouteSegment === "activities" &&
      segments[2] === "new")
  );
}

function getScrollProgress() {
  const scrollableDistance =
    document.documentElement.scrollHeight - window.innerHeight;

  if (scrollableDistance <= MIN_SCROLLABLE_DISTANCE) {
    return {
      progress: 0,
      visible: false,
    };
  }

  return {
    progress: Math.min(1, Math.max(0, window.scrollY / scrollableDistance)),
    visible: true,
  };
}

export function MobileScrollProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const hideForRoute = shouldHideMobileScrollProgress(pathname);
  const animationFrameRef = useRef<number | null>(null);
  const [state, setState] = useState({
    isMobile: false,
    progress: 0,
    visible: false,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    function updateProgress() {
      if (!mediaQuery.matches || hideForRoute) {
        setState({
          isMobile: mediaQuery.matches,
          progress: 0,
          visible: false,
        });
        return;
      }

      const next = getScrollProgress();
      setState({
        isMobile: true,
        progress: next.progress,
        visible: next.visible,
      });
    }

    function requestProgressUpdate() {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        updateProgress();
      });
    }

    updateProgress();
    window.addEventListener("scroll", requestProgressUpdate, {
      passive: true,
    });
    window.addEventListener("resize", requestProgressUpdate);
    mediaQuery.addEventListener("change", updateProgress);
    const resizeObserver = new ResizeObserver(requestProgressUpdate);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestProgressUpdate);
      mediaQuery.removeEventListener("change", updateProgress);
      resizeObserver.disconnect();

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [hideForRoute]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      progress: 0,
      visible: false,
    }));

    if (hideForRoute) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const next = getScrollProgress();
      setState((current) => ({
        ...current,
        progress: next.progress,
        visible: current.isMobile && next.visible,
      }));
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hideForRoute, routeKey]);

  if (hideForRoute || !state.isMobile || !state.visible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-mobile-scroll-progress
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-mobile-nav-height)+var(--app-bottom-safe-area))] top-auto z-[45] h-[2px] bg-[#D6D5B2]/80 md:hidden"
    >
      <div
        className="h-full origin-left bg-[#369758] shadow-[0_-1px_8px_rgba(54,151,88,0.24)] transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${state.progress})`,
        }}
      />
    </div>
  );
}
