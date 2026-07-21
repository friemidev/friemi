export type ActivityListEntryContext = {
  expiresAt: number;
  href: string;
  version: 1;
};

const activityListEntryStorageKey = "friemi:activity-list-entry";
const activityListEntryTtlMs = 30 * 60 * 1000;
const fallbackOrigin = "https://friemi.local";

export const activityListEntryUpdatedEvent =
  "friemi:activity-list-entry-updated";

function canUseBrowserStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function getBrowserOrigin() {
  return typeof window === "undefined" ? fallbackOrigin : window.location.origin;
}

function getLocalizedActivityListPath(locale: string) {
  return `/${locale}/activities`;
}

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function parseInternalHref(href: string, origin = getBrowserOrigin()) {
  try {
    const url = new URL(href, origin);
    const currentOrigin =
      typeof window === "undefined" ? origin : window.location.origin;

    if (url.origin !== currentOrigin) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function toPathHref(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getActivityListFallbackHref(locale: string) {
  return `/${locale}/mobile-home`;
}

export function isActivityListRoute(
  href: string,
  locale: string,
  origin = getBrowserOrigin(),
) {
  const url = parseInternalHref(href, origin);

  if (!url) {
    return false;
  }

  return (
    normalizePathname(url.pathname) ===
    normalizePathname(getLocalizedActivityListPath(locale))
  );
}

function isActivitySectionRoute(
  href: string,
  locale: string,
  origin = getBrowserOrigin(),
) {
  const url = parseInternalHref(href, origin);

  if (!url) {
    return false;
  }

  const pathname = normalizePathname(url.pathname);
  const activityListPath = normalizePathname(
    getLocalizedActivityListPath(locale),
  );

  return (
    pathname === activityListPath || pathname.startsWith(`${activityListPath}/`)
  );
}

export function normalizeActivityListEntryHref({
  currentHref,
  href,
  locale,
  origin = getBrowserOrigin(),
}: {
  currentHref?: string;
  href: string;
  locale: string;
  origin?: string;
}) {
  const url = parseInternalHref(href, origin);

  if (!url || isActivitySectionRoute(toPathHref(url), locale, origin)) {
    return null;
  }

  const normalizedHref = toPathHref(url);

  if (currentHref) {
    const currentUrl = parseInternalHref(currentHref, origin);

    if (currentUrl && toPathHref(currentUrl) === normalizedHref) {
      return null;
    }
  }

  return normalizedHref;
}

export function getActivityListEntryHrefFromTransition({
  fromRoute,
  locale,
  origin = getBrowserOrigin(),
  targetRoute,
}: {
  fromRoute: string;
  locale: string;
  origin?: string;
  targetRoute: string;
}) {
  if (!isActivityListRoute(targetRoute, locale, origin)) {
    return null;
  }

  return normalizeActivityListEntryHref({
    currentHref: targetRoute,
    href: fromRoute,
    locale,
    origin,
  });
}

function writeActivityListEntryHref(href: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  const context: ActivityListEntryContext = {
    expiresAt: Date.now() + activityListEntryTtlMs,
    href,
    version: 1,
  };

  try {
    window.sessionStorage.setItem(
      activityListEntryStorageKey,
      JSON.stringify(context),
    );
    window.dispatchEvent(new Event(activityListEntryUpdatedEvent));
  } catch {
    // Storage can be unavailable in private browsing or embedded webviews.
  }
}

export function saveActivityListEntryHref(href: string, locale: string) {
  const normalizedHref = normalizeActivityListEntryHref({
    currentHref:
      typeof window === "undefined"
        ? undefined
        : `${window.location.pathname}${window.location.search}${window.location.hash}`,
    href,
    locale,
  });

  if (normalizedHref) {
    writeActivityListEntryHref(normalizedHref);
  }
}

export function saveActivityListEntryFromTransition({
  fromRoute,
  locale,
  targetRoute,
}: {
  fromRoute: string;
  locale: string;
  targetRoute: string;
}) {
  const href = getActivityListEntryHrefFromTransition({
    fromRoute,
    locale,
    targetRoute,
  });

  if (href) {
    writeActivityListEntryHref(href);
  }
}

export function saveActivityListEntryFromDocumentReferrer(locale: string) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (!document.referrer || !isActivityListRoute(currentHref, locale)) {
    return;
  }

  const normalizedHref = normalizeActivityListEntryHref({
    currentHref,
    href: document.referrer,
    locale,
  });

  if (normalizedHref) {
    writeActivityListEntryHref(normalizedHref);
  }
}

export function readActivityListEntryHref(locale: string) {
  if (!canUseBrowserStorage()) {
    return null;
  }

  let raw: string | null = null;

  try {
    raw = window.sessionStorage.getItem(activityListEntryStorageKey);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActivityListEntryContext;

    if (!parsed || parsed.version !== 1 || parsed.expiresAt < Date.now()) {
      try {
        window.sessionStorage.removeItem(activityListEntryStorageKey);
      } catch {
        // Ignore unavailable storage cleanup.
      }
      return null;
    }

    return normalizeActivityListEntryHref({
      currentHref: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      href: parsed.href,
      locale,
    });
  } catch {
    try {
      window.sessionStorage.removeItem(activityListEntryStorageKey);
    } catch {
      // Ignore unavailable storage cleanup.
    }
    return null;
  }
}
