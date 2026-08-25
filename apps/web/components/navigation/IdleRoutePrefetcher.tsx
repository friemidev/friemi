"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getSequentialMobilePrefetchTargets } from "@/lib/mobile-route-prefetch";
import {
  MOBILE_VIEWPORT_MEDIA_QUERY,
  useMediaQuery,
} from "@/lib/useMediaQuery";

type IdleRoutePrefetcherProps = {
  enabled?: boolean;
  idleDelayMs?: number;
  intervalMs?: number;
  locale: string;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type BrowserWindowWithIdleCallback = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
  };

const recentlyPrefetchedTargets = new Map<string, number>();
const PREFETCH_DEDUPE_WINDOW_MS = 30_000;

function getNetworkInformation() {
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

function canRunIdlePrefetch() {
  if (document.visibilityState !== "visible" || !navigator.onLine) {
    return false;
  }

  const connection = getNetworkInformation();

  if (connection?.saveData) {
    return false;
  }

  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) {
    return false;
  }

  return true;
}

export function IdleRoutePrefetcher({
  enabled = true,
  idleDelayMs = 1800,
  intervalMs = 1100,
  locale,
}: IdleRoutePrefetcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_MEDIA_QUERY);
  const search = searchParams.toString();

  useEffect(() => {
    if (!enabled || !pathname || !isMobileViewport) {
      return;
    }

    const targets = getSequentialMobilePrefetchTargets({
      locale,
      pathname,
      search,
    });

    if (targets.length === 0) {
      return;
    }

    const browserWindow = window as BrowserWindowWithIdleCallback;
    let targetIndex = 0;
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;
    let hasStarted = false;

    const scheduleNext = (delayMs: number) => {
      if (
        cancelled ||
        targetIndex >= targets.length ||
        timeoutHandle !== null ||
        idleHandle !== null ||
        !canRunIdlePrefetch()
      ) {
        return;
      }

      timeoutHandle = window.setTimeout(() => {
        timeoutHandle = null;

        const runPrefetch = () => {
          idleHandle = null;

          if (cancelled || !canRunIdlePrefetch()) {
            return;
          }

          const target = targets[targetIndex];

          if (!target) {
            return;
          }

          targetIndex += 1;
          const lastPrefetchedAt = recentlyPrefetchedTargets.get(target) ?? 0;

          if (Date.now() - lastPrefetchedAt >= PREFETCH_DEDUPE_WINDOW_MS) {
            try {
              router.prefetch(target);
              recentlyPrefetchedTargets.set(target, Date.now());
            } catch (error) {
              console.warn("Failed to prefetch route", { error, target });
            }
          }

          scheduleNext(intervalMs);
        };

        if (typeof browserWindow.requestIdleCallback === "function") {
          idleHandle = browserWindow.requestIdleCallback(runPrefetch, {
            timeout: 3000,
          });
          return;
        }

        runPrefetch();
      }, delayMs);
    };

    const start = () => {
      if (hasStarted) {
        scheduleNext(250);
        return;
      }

      hasStarted = true;
      scheduleNext(idleDelayMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        start();
      }
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    window.addEventListener("online", start);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      window.removeEventListener("online", start);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }

      if (
        idleHandle !== null &&
        typeof browserWindow.cancelIdleCallback === "function"
      ) {
        browserWindow.cancelIdleCallback(idleHandle);
      }
    };
  }, [
    enabled,
    idleDelayMs,
    intervalMs,
    isMobileViewport,
    locale,
    pathname,
    router,
    search,
  ]);

  return null;
}
