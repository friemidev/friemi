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
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function getWerewolfRoomCodeFromScan(value: string) {
  return (
    getRoomCodeFromPath(value, "werewolf") ?? normalizeScannedRoomCode(value)
  );
}

export function getAvalonRoomCodeFromScan(value: string) {
  return getRoomCodeFromPath(value, "avalon") ?? normalizeScannedRoomCode(value);
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
      href: withLocale(locale, `/friends?friendCode=${directFriendCode}`),
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
      href: withLocale(locale, `/friends?friendCode=${friendCode}`),
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

function getRoomCodeFromPath(value: string, tool: "avalon" | "werewolf") {
  if (!isTrustedInternalScanValue(value)) {
    return null;
  }

  const pathname = getPathnameFromScan(value);
  const match = pathname.match(
    new RegExp(`^(?:/[^/]+)?/game-tools/${tool}/join/([^/?#]+)`),
  );

  return match?.[1]
    ? normalizeScannedRoomCode(decodeURIComponent(match[1]))
    : null;
}

function getFriendCodeFromScan(value: string) {
  const url = getUrlFromScan(value);
  const friendCode = url?.searchParams.get("friendCode")?.trim() ?? "";
  const isFriendPath = url?.pathname
    ? /^(?:\/[^/]+)?\/friends\/?$/.test(url.pathname)
    : false;

  return isTrustedInternalScanValue(value) &&
    isFriendPath &&
    /^(?:\d{6})$/.test(friendCode)
    ? friendCode
    : null;
}

function getInternalHrefFromScan(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  const url = getUrlFromScan(value);

  if (
    typeof window !== "undefined" &&
    url &&
    url.origin === window.location.origin
  ) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return null;
}

function getExternalHrefFromScan(value: string) {
  const url = getUrlFromScan(value);

  return url?.protocol === "https:" ? url.toString() : null;
}

function isTrustedInternalScanValue(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  const url = getUrlFromScan(value);

  return (
    typeof window !== "undefined" &&
    Boolean(url) &&
    url?.origin === window.location.origin
  );
}

function getPathnameFromScan(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return getUrlFromScan(value)?.pathname ?? "";
}

function getUrlFromScan(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
