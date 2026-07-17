"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { withLocale } from "@/lib/routes";

type IdleRoutePrefetcherProps = {
  enabled?: boolean;
  idleDelayMs?: number;
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

const prefetchedTargets = new Set<string>();
const coreMobilePrefetchTargets = [
  "/mobile-home",
  "/lobby",
  "/activities/new",
  "/footprints",
  "/planets",
] as const;

function getNetworkInformation() {
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

function canRunIdlePrefetch() {
  if (document.visibilityState !== "visible") {
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

function getLocalizedPathWithoutLocale(pathname: string, locale: string) {
  const localePrefix = `/${locale}`;

  if (pathname === localePrefix) {
    return "/";
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length) || "/";
  }

  return pathname || "/";
}

function getRouteAwarePrefetchTargets(routePath: string) {
  if (
    routePath === "/" ||
    routePath === "/home" ||
    routePath === "/mobile-home"
  ) {
    return ["/lobby", "/footprints", "/activities/new"];
  }

  if (routePath === "/lobby") {
    return ["/mobile-home", "/activities/new", "/footprints"];
  }

  if (routePath === "/activities/new") {
    return ["/lobby", "/game-tools"];
  }

  if (routePath === "/footprints") {
    return ["/messages", "/profile", "/lobby"];
  }

  if (routePath === "/messages") {
    return ["/footprints", "/lobby"];
  }

  if (routePath === "/profile") {
    return ["/footprints", "/messages"];
  }

  if (routePath === "/notifications") {
    return ["/footprints", "/messages"];
  }

  return [];
}

function getIdlePrefetchTargets(pathname: string, locale: string) {
  const routePath = getLocalizedPathWithoutLocale(pathname, locale);
  const targetPaths = [
    ...getRouteAwarePrefetchTargets(routePath),
    ...coreMobilePrefetchTargets,
  ];
  const seenTargets = new Set<string>();

  return targetPaths
    .map((targetPath) => withLocale(locale, targetPath))
    .filter((target) => {
      if (
        target === pathname ||
        seenTargets.has(target) ||
        prefetchedTargets.has(target)
      ) {
        return false;
      }

      seenTargets.add(target);
      return true;
    });
}

export function IdleRoutePrefetcher({
  enabled = true,
  idleDelayMs = 1800,
  locale,
}: IdleRoutePrefetcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !pathname) {
      return;
    }

    const targets = getIdlePrefetchTargets(pathname, locale);

    if (targets.length === 0) {
      return;
    }

    const browserWindow = window as BrowserWindowWithIdleCallback;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;
    let timeoutHandle: number | null = window.setTimeout(() => {
      timeoutHandle = null;

      if (!canRunIdlePrefetch()) {
        return;
      }

      const runPrefetch = () => {
        if (!canRunIdlePrefetch()) {
          return;
        }

        for (const target of targets) {
          if (prefetchedTargets.has(target)) {
            continue;
          }

          prefetchedTargets.add(target);
          router.prefetch(target);
        }
      };

      if (typeof browserWindow.requestIdleCallback === "function") {
        idleHandle = browserWindow.requestIdleCallback(runPrefetch, {
          timeout: 4500,
        });
      } else {
        fallbackHandle = window.setTimeout(runPrefetch, 900);
      }
    }, idleDelayMs);

    return () => {
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }

      if (
        idleHandle !== null &&
        typeof browserWindow.cancelIdleCallback === "function"
      ) {
        browserWindow.cancelIdleCallback(idleHandle);
      }

      if (fallbackHandle !== null) {
        window.clearTimeout(fallbackHandle);
      }
    };
  }, [enabled, idleDelayMs, locale, pathname, router]);

  return null;
}
