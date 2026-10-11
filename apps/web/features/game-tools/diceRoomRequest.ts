/** A room write must come from the same browser-facing origin that served the UI. */
export function isDiceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    if (!["http:", "https:"].includes(source.protocol) || source.origin === "null") return false;
    const destination = new URL(request.url);
    const host = request.headers.get("host") ?? destination.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (forwardedProtocol && !["http", "https"].includes(forwardedProtocol)) return false;
    return source.origin === new URL(`${forwardedProtocol ? `${forwardedProtocol}:` : destination.protocol}//${host}`).origin;
  } catch { return false; }
}
