export const hostExternalBrowserRequestType =
  "friemi:host-external-browser-request";
export const hostExternalBrowserResponseType =
  "friemi:host-external-browser-response";

export function normalizeHostExternalUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export type HostExternalBrowserRequest = {
  type: typeof hostExternalBrowserRequestType;
  requestId: string;
} & ({ action: "support" } | { action: "open"; url: string });

export type HostExternalBrowserController = {
  isSupported: () => Promise<boolean>;
  open: (url: string) => Promise<boolean>;
};

export function parseHostExternalBrowserRequest(
  value: unknown,
): HostExternalBrowserRequest | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    data.type !== hostExternalBrowserRequestType ||
    typeof data.requestId !== "string" ||
    !data.requestId.trim() ||
    data.requestId.length > 80
  )
    return null;
  if (data.action === "support")
    return {
      type: hostExternalBrowserRequestType,
      requestId: data.requestId,
      action: "support",
    };
  if (data.action !== "open" || typeof data.url !== "string") return null;
  const url = normalizeHostExternalUrl(data.url);
  return url
    ? {
        type: hostExternalBrowserRequestType,
        requestId: data.requestId,
        action: "open",
        url,
      }
    : null;
}

export async function handleHostExternalBrowserRequest(
  value: unknown,
  controller: HostExternalBrowserController,
  allowOpen: boolean | (() => boolean),
) {
  const request = parseHostExternalBrowserRequest(value);
  if (!request) return null;
  let result = false;
  const canOpen = () =>
    typeof allowOpen === "function" ? allowOpen() : allowOpen;
  try {
    if (request.action === "support") {
      result = await controller.isSupported();
    } else if (canOpen() && (await controller.isSupported()) && canOpen()) {
      result = await controller.open(request.url);
    }
  } catch {
    // Older app builds and unavailable browsers fall back to the normal link.
  }
  return {
    type: hostExternalBrowserResponseType,
    requestId: request.requestId,
    result,
  };
}
