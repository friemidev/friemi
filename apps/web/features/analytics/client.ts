import type { AnalyticsEventInput } from "./events";

type ClientAnalyticsEventInput = Omit<
  AnalyticsEventInput,
  "route" | "locale"
> & {
  route?: string;
  locale?: "zh-CN" | "en" | "fr";
};

type ClientAnalyticsPayload = AnalyticsEventInput & {
  route: string;
  locale: "zh-CN" | "en" | "fr";
};

const analyticsBatchWindowMs = 1_500;
const maxAnalyticsBatchSize = 20;
let analyticsQueue: ClientAnalyticsPayload[] = [];
let analyticsFlushTimer: ReturnType<typeof setTimeout> | null = null;
let analyticsFlushListenersAttached = false;

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split("/").filter(Boolean)[0];

  if (locale === "zh-CN" || locale === "en" || locale === "fr") {
    return locale;
  }

  return "zh-CN";
}

function getAnonymousId() {
  const key = "friemi_analytics_anonymous_id";

  try {
    const existing = window.localStorage.getItem(key);

    if (existing) {
      return existing;
    }

    const nextValue = crypto.randomUUID();
    window.localStorage.setItem(key, nextValue);

    return nextValue;
  } catch {
    return null;
  }
}

function getSessionId() {
  const key = "friemi_analytics_session_id";

  try {
    const existing = window.sessionStorage.getItem(key);

    if (existing) {
      return existing;
    }

    const nextValue = crypto.randomUUID();
    window.sessionStorage.setItem(key, nextValue);

    return nextValue;
  } catch {
    return null;
  }
}

function sanitizeClientRoute(route: string) {
  const trimmed = route.trim();

  if (!trimmed) {
    return "/";
  }

  try {
    const url = new URL(trimmed, window.location.origin);

    return url.pathname || "/";
  } catch {
    return trimmed.split("?")[0] || "/";
  }
}

function deliverAnalyticsBatch(
  payloads: ClientAnalyticsPayload[],
  preferBeacon: boolean,
) {
  if (payloads.length === 0) {
    return;
  }

  const body = JSON.stringify(payloads);

  if (preferBeacon && navigator.sendBeacon) {
    const accepted = navigator.sendBeacon(
      "/api/analytics/events",
      new Blob([body], { type: "application/json" }),
    );

    if (accepted) {
      return;
    }
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must not affect the user flow.
  });
}

function flushClientAnalyticsQueue(preferBeacon = false) {
  if (analyticsFlushTimer) {
    clearTimeout(analyticsFlushTimer);
    analyticsFlushTimer = null;
  }

  const payloads = analyticsQueue;
  analyticsQueue = [];
  deliverAnalyticsBatch(payloads, preferBeacon);
}

function attachAnalyticsFlushListeners() {
  if (analyticsFlushListenersAttached) {
    return;
  }

  analyticsFlushListenersAttached = true;
  window.addEventListener("pagehide", () => {
    flushClientAnalyticsQueue(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushClientAnalyticsQueue(true);
    }
  });
}

export function trackClientAnalyticsEvent(input: ClientAnalyticsEventInput) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: ClientAnalyticsPayload = {
    ...input,
    anonymousId: input.anonymousId ?? getAnonymousId(),
    sessionId: input.sessionId ?? getSessionId(),
    locale: input.locale ?? getLocaleFromPath(window.location.pathname),
    route: sanitizeClientRoute(input.route ?? window.location.pathname),
  };
  attachAnalyticsFlushListeners();
  analyticsQueue.push(payload);

  if (analyticsQueue.length >= maxAnalyticsBatchSize) {
    flushClientAnalyticsQueue();
    return;
  }

  if (!analyticsFlushTimer) {
    analyticsFlushTimer = setTimeout(
      () => flushClientAnalyticsQueue(),
      analyticsBatchWindowMs,
    );
  }
}
