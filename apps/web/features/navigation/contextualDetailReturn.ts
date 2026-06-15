export type DetailSourceKind =
  | "activity_detail"
  | "activity_list"
  | "admin_analytics"
  | "admin_reports"
  | "friends"
  | "home"
  | "lobby"
  | "merchant"
  | "messages"
  | "notifications"
  | "profile"
  | "public_event"
  | "search";

export type DetailTargetKind =
  | "activity"
  | "merchant"
  | "profile"
  | "public_event";

export type DetailSourceInput = {
  sourceKey: DetailSourceKind;
  sourceLabel?: string;
  sourceHref?: string;
  sourceState?: Record<string, boolean | number | string>;
  targetKey: string;
  targetKind: DetailTargetKind;
};

export type DetailSourceContext = Omit<DetailSourceInput, "sourceHref"> & {
  expiresAt: number;
  scrollY: number;
  sourceHref: string;
  targetHref: string;
  version: 1;
};

const detailSourceStorageKey = "nextfunclub:detail-source-context";
const detailSourceTtlMs = 30 * 60 * 1000;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function toPathHref(value: string) {
  if (typeof window === "undefined") {
    return value;
  }

  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

export function getCurrentPathHref() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function saveDetailSourceContext(
  input: DetailSourceInput,
  targetHref: string,
) {
  if (!canUseStorage()) {
    return;
  }

  const context: DetailSourceContext = {
    ...input,
    expiresAt: Date.now() + detailSourceTtlMs,
    scrollY: window.scrollY,
    sourceHref: toPathHref(input.sourceHref ?? getCurrentPathHref()),
    targetHref: toPathHref(targetHref),
    version: 1,
  };

  window.sessionStorage.setItem(
    detailSourceStorageKey,
    JSON.stringify(context),
  );
}

export function readDetailSourceContext() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(detailSourceStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DetailSourceContext;

    if (!parsed || parsed.version !== 1 || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(detailSourceStorageKey);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(detailSourceStorageKey);
    return null;
  }
}

export function getDetailSourceForCurrentTarget() {
  const context = readDetailSourceContext();

  if (!context) {
    return null;
  }

  const current = toPathHref(getCurrentPathHref()).split("#")[0];
  const target = toPathHref(context.targetHref).split("#")[0];

  return current === target ? context : null;
}

export function isDetailSourceReturnPage(
  context: DetailSourceContext,
  sourceKey: DetailSourceKind,
) {
  const current = toPathHref(getCurrentPathHref()).split("#")[0];
  const source = toPathHref(context.sourceHref).split("#")[0];

  return context.sourceKey === sourceKey && current === source;
}

export function getDetailSourceTargetSelector(targetKey: string) {
  return `[data-detail-source-target="${CSS.escape(targetKey)}"]`;
}
