"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const MIN_SCROLLABLE_DISTANCE = 24;

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
  const animationFrameRef = useRef<number | null>(null);
  const [state, setState] = useState({
    isMobile: false,
    progress: 0,
    visible: false,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    function updateProgress() {
      if (!mediaQuery.matches) {
        setState({
          isMobile: false,
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
  }, []);

  useEffect(() => {
    setState((current) => ({
      ...current,
      progress: 0,
      visible: false,
    }));

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
  }, [routeKey]);

  if (!state.isMobile || !state.visible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-16 z-[45] h-[3px] bg-[#eadfce] md:hidden"
    >
      <div
        className="h-full origin-left bg-[#d88d72] shadow-[0_1px_4px_rgba(216,141,114,0.36)] transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${state.progress})`,
        }}
      />
    </div>
  );
}
