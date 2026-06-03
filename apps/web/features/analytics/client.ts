import type { AnalyticsEventInput } from "./events";

type ClientAnalyticsEventInput = Omit<
  AnalyticsEventInput,
  "route" | "locale"
> & {
  route?: string;
  locale?: "zh-CN" | "en" | "fr";
};

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split("/").filter(Boolean)[0];

  if (locale === "zh-CN" || locale === "en" || locale === "fr") {
    return locale;
  }

  return "zh-CN";
}

function getAnonymousId() {
  const key = "nextfun_analytics_anonymous_id";

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
  const key = "nextfun_analytics_session_id";

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

export function trackClientAnalyticsEvent(input: ClientAnalyticsEventInput) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    ...input,
    anonymousId: input.anonymousId ?? getAnonymousId(),
    sessionId: input.sessionId ?? getSessionId(),
    locale: input.locale ?? getLocaleFromPath(window.location.pathname),
    route: sanitizeClientRoute(input.route ?? window.location.pathname),
  };
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
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
