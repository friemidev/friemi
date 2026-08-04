export type AppRouteHistoryContext = {
  currentHref: string;
  expiresAt: number;
  previousHref: string | null;
  version: 1;
};

const appRouteHistoryStorageKey = "friemi:app-route-history";
const appRouteHistoryTtlMs = 30 * 60 * 1000;
const fallbackOrigin = "https://friemi.local";

function canUseStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function getBrowserOrigin() {
  return typeof window === "undefined" ? fallbackOrigin : window.location.origin;
}

function normalizeInternalHref(href: string, origin = getBrowserOrigin()) {
  try {
    const url = new URL(href, origin);
    const currentOrigin =
      typeof window === "undefined" ? origin : window.location.origin;

    if (url.origin !== currentOrigin) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function readAppRouteHistory() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(appRouteHistoryStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const context = JSON.parse(raw) as AppRouteHistoryContext;

    if (!context || context.version !== 1 || context.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(appRouteHistoryStorageKey);
      return null;
    }

    return context;
  } catch {
    window.sessionStorage.removeItem(appRouteHistoryStorageKey);
    return null;
  }
}

export function saveAppRouteHistory(href: string) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedHref = normalizeInternalHref(href);

  if (!normalizedHref) {
    return;
  }

  const existing = readAppRouteHistory();
  const context: AppRouteHistoryContext =
    existing?.currentHref === normalizedHref
      ? {
          ...existing,
          expiresAt: Date.now() + appRouteHistoryTtlMs,
        }
      : {
          currentHref: normalizedHref,
          expiresAt: Date.now() + appRouteHistoryTtlMs,
          previousHref: existing?.currentHref ?? null,
          version: 1,
        };

  window.sessionStorage.setItem(
    appRouteHistoryStorageKey,
    JSON.stringify(context),
  );
}

export function readPreviousAppRouteHref() {
  return readAppRouteHistory()?.previousHref ?? null;
}
