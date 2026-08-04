import { withLocale } from "@/lib/routes";

export const referralCookieName = "friemi_referral_code";
export const referralCookieMaxAgeSeconds = 60 * 60 * 24 * 30;

const referralCodePattern = /^\d{6}$/;

function getReferralBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CANONICAL_SITE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export function normalizeReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";

  return referralCodePattern.test(normalized) ? normalized : null;
}

export function getReferralCodeToStore({
  existingCookie,
  incomingRef,
}: {
  existingCookie?: string | null;
  incomingRef?: string | null;
}) {
  const normalizedIncomingRef = normalizeReferralCode(incomingRef);

  if (!normalizedIncomingRef) {
    return null;
  }

  if (normalizeReferralCode(existingCookie)) {
    return null;
  }

  return normalizedIncomingRef;
}

export function buildReferralLink(locale: string, friendCode: string) {
  const normalizedCode = normalizeReferralCode(friendCode);

  if (!normalizedCode) {
    return null;
  }

  const path = `${withLocale(locale, "/home")}?ref=${encodeURIComponent(
    normalizedCode,
  )}`;
  const baseUrl = getReferralBaseUrl();

  return baseUrl ? `${baseUrl}${path}` : path;
}

export function buildReferralSignUpLink(locale: string, friendCode: string) {
  const normalizedCode = normalizeReferralCode(friendCode);

  if (!normalizedCode) {
    return null;
  }

  const path = `${withLocale(locale, "/sign-up")}?ref=${encodeURIComponent(
    normalizedCode,
  )}`;
  const baseUrl = getReferralBaseUrl();

  return baseUrl ? `${baseUrl}${path}` : path;
}

export function captureReferralCodeFromRequest(ref: string | null | undefined) {
  const rawRef = ref?.trim();

  if (!rawRef) {
    return null;
  }

  const directCode = normalizeReferralCode(rawRef);

  if (directCode) {
    return directCode;
  }

  try {
    const parsedUrl = new URL(rawRef, "https://friemi.local");

    return (
      normalizeReferralCode(parsedUrl.searchParams.get("ref")) ??
      normalizeReferralCode(parsedUrl.searchParams.get("friendCode"))
    );
  } catch {
    return normalizeReferralCode(rawRef);
  }
}
