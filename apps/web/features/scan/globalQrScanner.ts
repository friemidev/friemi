import { withLocale } from "@/lib/routes";

export type AndroidQrScanPayload = {
  ok?: boolean;
  rawValue?: string;
  reason?: string;
  status?: string;
  supported?: boolean;
};

export type GlobalQrScanDestination =
  | {
      href: string;
      kind: "internal";
      source:
        | "avalon-room"
        | "friend-code"
        | "internal-link"
        | "werewolf-room";
    }
  | {
      href: string;
      kind: "external";
      source: "external-link";
    };

export function isFriemiAndroidApp() {
  return (
    typeof window !== "undefined" &&
    /FriemiAndroid\//i.test(window.navigator.userAgent)
  );
}

export function parseAndroidQrScanPayload(detail: unknown) {
  if (!detail) {
    return null;
  }

  if (typeof detail === "string") {
    try {
      return JSON.parse(detail) as AndroidQrScanPayload;
    } catch {
      return null;
    }
  }

  if (typeof detail === "object") {
    return detail as AndroidQrScanPayload;
  }

  return null;
}

export function canUseNativeAndroidQrScanner() {
  return (
    isFriemiAndroidApp() &&
    typeof window.FriemiAndroid?.scanQrCode === "function"
  );
}

export function normalizeScannedRoomCode(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function getWerewolfRoomCodeFromScan(value: string) {
  return getRoomCodeFromScanValue(value, "werewolf");
}

export function getAvalonRoomCodeFromScan(value: string) {
  return getRoomCodeFromScanValue(value, "avalon");
}

export function resolveGlobalQrScanDestination({
  locale,
  rawValue,
}: {
  locale: string;
  rawValue: string;
}): GlobalQrScanDestination | null {
  const value = rawValue.trim();

  if (!value) {
    return null;
  }

  const directFriendCode = value.replace(/[\s-]/g, "");

  if (/^\d{6}$/.test(directFriendCode)) {
    return {
      href: withLocale(
        locale,
        `/search?${new URLSearchParams({ q: directFriendCode }).toString()}`,
      ),
      kind: "internal",
      source: "friend-code",
    };
  }

  const werewolfRoomCode = getRoomCodeFromPath(value, "werewolf");

  if (werewolfRoomCode) {
    return {
      href: withLocale(
        locale,
        `/game-tools/werewolf/join/${encodeURIComponent(werewolfRoomCode)}`,
      ),
      kind: "internal",
      source: "werewolf-room",
    };
  }

  const avalonRoomCode = getRoomCodeFromPath(value, "avalon");

  if (avalonRoomCode) {
    return {
      href: withLocale(
        locale,
        `/game-tools/avalon/join/${encodeURIComponent(avalonRoomCode)}`,
      ),
      kind: "internal",
      source: "avalon-room",
    };
  }

  const friendCode = getFriendCodeFromScan(value);

  if (friendCode) {
    return {
      href: withLocale(
        locale,
        `/search?${new URLSearchParams({ q: friendCode }).toString()}`,
      ),
      kind: "internal",
      source: "friend-code",
    };
  }

  const internalHref = getInternalHrefFromScan(value);

  if (internalHref) {
    return {
      href: internalHref,
      kind: "internal",
      source: "internal-link",
    };
  }

  const externalHref = getExternalHrefFromScan(value);

  if (externalHref) {
    return {
      href: externalHref,
      kind: "external",
      source: "external-link",
    };
  }

  return null;
}

function getRoomCodeFromScanValue(value: string, tool: "avalon" | "werewolf") {
  const scanValue = value.trim();

  if (!scanValue) {
    return "";
  }

  const roomCode = getRoomCodeFromPath(scanValue, tool);

  if (roomCode) {
    return roomCode;
  }

  return isLikelyLinkValue(scanValue) ? "" : normalizeScannedRoomCode(scanValue);
}

function getRoomCodeFromPath(value: string, tool: "avalon" | "werewolf") {
  const scanValue = value.trim();

  if (!isTrustedInternalScanValue(scanValue)) {
    return null;
  }

  const pathname = getPathnameFromScan(scanValue);
  const match = pathname.match(
    new RegExp(`^(?:/[^/]+)?/game-tools/${tool}/join/([^/?#]+)`),
  );

  return match?.[1]
    ? normalizeScannedRoomCode(decodeURIComponent(match[1]))
    : null;
}

function getFriendCodeFromScan(value: string) {
  const scanValue = value.trim();
  const url = getUrlFromScan(scanValue);
  const friendCode = url?.searchParams.get("friendCode")?.trim() ?? "";
  const isFriendPath = url?.pathname
    ? /^(?:\/[^/]+)?\/friends\/?$/.test(url.pathname)
    : false;

  return isTrustedInternalScanValue(scanValue) &&
    isFriendPath &&
    /^(?:\d{6})$/.test(friendCode)
    ? friendCode
    : null;
}

function getInternalHrefFromScan(value: string) {
  const scanValue = value.trim();

  if (scanValue.startsWith("/") && !scanValue.startsWith("//")) {
    return scanValue;
  }

  const url = getUrlFromScan(scanValue);

  if (url && isTrustedInternalScanValue(scanValue)) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return null;
}

function getExternalHrefFromScan(value: string) {
  const url = getUrlFromScan(value);

  return url?.protocol === "https:" ? url.toString() : null;
}

function isTrustedInternalScanValue(value: string) {
  const scanValue = value.trim();

  if (scanValue.startsWith("/") && !scanValue.startsWith("//")) {
    return true;
  }

  const url = getUrlFromScan(scanValue);

  if (!url) {
    return false;
  }

  return isCurrentBrowserOrigin(url) || isTrustedFriemiHost(url.hostname);
}

function getPathnameFromScan(value: string) {
  const scanValue = value.trim();

  if (scanValue.startsWith("/") && !scanValue.startsWith("//")) {
    return scanValue;
  }

  return getUrlFromScan(scanValue)?.pathname ?? "";
}

function isLikelyLinkValue(value: string) {
  return (
    value.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:\/\//i.test(value) ||
    isSchemeLessTrustedHostValue(value)
  );
}

function getUrlFromScan(value: string) {
  const scanValue = value.trim();

  try {
    return new URL(scanValue);
  } catch {
    if (!isSchemeLessTrustedHostValue(scanValue)) {
      return null;
    }

    try {
      return new URL(`https://${scanValue}`);
    } catch {
      return null;
    }
  }
}

function isCurrentBrowserOrigin(url: URL) {
  return (
    typeof window !== "undefined" && url.origin === window.location.origin
  );
}

function isSchemeLessTrustedHostValue(value: string) {
  const host = value.split(/[/?#]/, 1)[0]?.split(":", 1)[0] ?? "";

  return isTrustedFriemiHost(host);
}

function isTrustedFriemiHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "friemi.com" ||
    normalizedHostname === "www.friemi.com" ||
    normalizedHostname === "friemi.vercel.app" ||
    normalizedHostname.endsWith(".friemi.com")
  );
}
