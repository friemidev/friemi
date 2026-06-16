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

function getIdlePrefetchTarget(pathname: string, locale: string) {
  const routePath = getLocalizedPathWithoutLocale(pathname, locale);
  const targetPath =
    routePath === "/" || routePath === "/home"
      ? "/lobby"
      : routePath === "/lobby"
        ? "/activities"
        : routePath === "/activities"
          ? "/lobby"
          : routePath === "/messages"
            ? "/lobby"
            : routePath === "/profile"
              ? "/messages"
              : routePath === "/notifications"
                ? "/messages"
                : null;

  if (!targetPath) {
    return null;
  }

  const target = withLocale(locale, targetPath);

  return target === pathname ? null : target;
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

    const target = getIdlePrefetchTarget(pathname, locale);

    if (!target || prefetchedTargets.has(target)) {
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
        if (!canRunIdlePrefetch() || prefetchedTargets.has(target)) {
          return;
        }

        prefetchedTargets.add(target);
        router.prefetch(target);
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
