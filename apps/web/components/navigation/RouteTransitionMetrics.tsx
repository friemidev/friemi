"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";

type PendingNavigation = {
  fromRoute: string;
  startedAt: number;
  targetRoute: string;
};

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

function getInternalRoute(href: string) {
  try {
    const nextUrl = new URL(href, window.location.href);
    const currentUrl = new URL(window.location.href);

    if (nextUrl.origin !== currentUrl.origin) {
      return null;
    }

    if (
      nextUrl.pathname === currentUrl.pathname &&
      nextUrl.search === currentUrl.search
    ) {
      return null;
    }

    return `${nextUrl.pathname}${nextUrl.search}`;
  } catch {
    return null;
  }
}

function getRouteKey(pathname: string, searchParams: { toString(): string }) {
  const search = searchParams.toString();

  return search ? `${pathname}?${search}` : pathname;
}

function sanitizeRouteForProperties(route: string) {
  return route.split("?")[0]?.slice(0, 180) || "/";
}

function roundDurationMs(value: number) {
  return Math.max(0, Math.round(value));
}

export function RouteTransitionMetrics({ locale }: { locale: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const routeKey = getRouteKey(pathname, searchParams);

  useEffect(() => {
    const pendingNavigation = pendingNavigationRef.current;

    if (!pendingNavigation) {
      return;
    }

    pendingNavigationRef.current = null;

    const durationMs = roundDurationMs(
      performance.now() - pendingNavigation.startedAt,
    );

    trackClientAnalyticsEvent({
      locale: locale === "en" || locale === "fr" ? locale : "zh-CN",
      name: "page_load_timed",
      properties: {
        duration_ms: durationMs,
        from_route: sanitizeRouteForProperties(pendingNavigation.fromRoute),
        route_key: "client_route_transition",
        slowest_step_label: "client_navigation",
        slowest_step_ms: durationMs,
        step_count: 1,
        target_route: sanitizeRouteForProperties(pendingNavigation.targetRoute),
      },
      route: pathname,
    });
  }, [locale, pathname, routeKey]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!isPlainLeftClick(event)) {
        return;
      }

      const anchor = getNavigableAnchor(event.target);

      if (!anchor) {
        return;
      }

      const targetRoute = getInternalRoute(anchor.href);

      if (!targetRoute) {
        return;
      }

      pendingNavigationRef.current = {
        fromRoute: getRouteKey(
          window.location.pathname,
          new URLSearchParams(window.location.search),
        ),
        startedAt: performance.now(),
        targetRoute,
      };
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
