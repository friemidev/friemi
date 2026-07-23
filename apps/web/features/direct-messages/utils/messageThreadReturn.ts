const messageThreadReturnStorageKey = "friemi:message-thread-return";
const messageThreadReturnTtlMs = 30 * 60 * 1000;

type MessageThreadReturnContext = {
  expiresAt: number;
  href: string;
  version: 1;
};

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function getCurrentHref() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function normalizeInternalHref(href: string) {
  if (typeof window === "undefined") {
    return href;
  }

  try {
    const url = new URL(href, window.location.origin);

    if (url.origin !== window.location.origin) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function saveMessageThreadReturnHref(href = getCurrentHref()) {
  if (!canUseSessionStorage()) {
    return;
  }

  const normalizedHref = normalizeInternalHref(href);

  if (!normalizedHref) {
    return;
  }

  const context: MessageThreadReturnContext = {
    expiresAt: Date.now() + messageThreadReturnTtlMs,
    href: normalizedHref,
    version: 1,
  };

  try {
    window.sessionStorage.setItem(
      messageThreadReturnStorageKey,
      JSON.stringify(context),
    );
  } catch {
    // Storage may be unavailable in embedded or private browsing contexts.
  }
}

export function readMessageThreadReturnHref() {
  if (!canUseSessionStorage()) {
    return null;
  }

  let raw: string | null = null;

  try {
    raw = window.sessionStorage.getItem(messageThreadReturnStorageKey);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const context = JSON.parse(raw) as MessageThreadReturnContext;

    if (!context || context.version !== 1 || context.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(messageThreadReturnStorageKey);
      return null;
    }

    return normalizeInternalHref(context.href);
  } catch {
    window.sessionStorage.removeItem(messageThreadReturnStorageKey);
    return null;
  }
}
