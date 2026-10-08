const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const shortCodePattern = /^(?:\d{6}|\d{10})$/;
const ticketPathPattern =
  /^\/(?:zh-CN|en|fr)\/tickets\/redeem\/([A-Za-z0-9_-]{43}|\d{6}|\d{10})\/?$/;

/** Accept a QR token, six-digit code, or unexpired legacy ten-digit code. */
export function parseTicketRedemptionToken(value: string) {
  const trimmed = value.trim();
  if (tokenPattern.test(trimmed)) return trimmed;
  const compactCode = trimmed.replace(/[\s-]/g, "");
  if (shortCodePattern.test(compactCode)) return compactCode;
  if (!trimmed.startsWith("/") && !/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("//")) return null;

  try {
    const url = new URL(trimmed, "https://friemi.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.pathname.match(ticketPathPattern)?.[1] ?? null;
  } catch {
    return null;
  }
}
