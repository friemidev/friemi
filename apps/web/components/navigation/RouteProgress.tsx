"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function getNavigableAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a");

  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel")?.includes("external")
  ) {
    return null;
  }

  return anchor;
}

function isInternalNavigation(anchor: HTMLAnchorElement) {
  try {
    const nextUrl = new URL(anchor.href, window.location.href);
    const currentUrl = new URL(window.location.href);

    if (nextUrl.origin !== currentUrl.origin) {
      return false;
    }

    return (
      nextUrl.pathname !== currentUrl.pathname ||
      nextUrl.search !== currentUrl.search
    );
  } catch {
    return false;
  }
}

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (!isActiveRef.current) {
      return;
    }

    setProgress(100);
    setIsFinishing(true);

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    finishTimerRef.current = window.setTimeout(() => {
      setIsActive(false);
      setIsFinishing(false);
      setProgress(0);
    }, 220);

    return () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [routeKey]);

  useEffect(() => {
    function startProgress() {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }

      setIsActive(true);
      setIsFinishing(false);
      setProgress(12);

      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      progressTimerRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 88) {
            return current;
          }

          const next = current + (100 - current) * 0.18;
          return Math.min(88, next);
        });
      }, 120);
    }

    function handleClick(event: MouseEvent) {
      if (!isPlainLeftClick(event)) {
        return;
      }

      const anchor = getNavigableAnchor(event.target);

      if (!anchor || !isInternalNavigation(anchor)) {
        return;
      }

      startProgress();
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);

      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1"
    >
      <div
        className="h-full bg-[#d88d72] shadow-[0_0_18px_rgba(216,141,114,0.55)] transition-[width,opacity] duration-200 ease-out"
        style={{
          opacity: isActive ? (isFinishing ? 0.55 : 1) : 0,
          width: `${progress}%`,
        }}
      />
    </div>
  );
}
