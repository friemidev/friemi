const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const ticketPathPattern =
  /^\/(?:zh-CN|en|fr)\/tickets\/redeem\/([A-Za-z0-9_-]{43})\/?$/;

/** Accept a ticket's temporary token or its Friemi check-in link. */
export function parseTicketRedemptionToken(value: string) {
  const trimmed = value.trim();
  if (tokenPattern.test(trimmed)) return trimmed;
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
