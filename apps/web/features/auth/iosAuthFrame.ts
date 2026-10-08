import {
  authRedirectParamName,
  normalizeAuthRedirectTarget,
} from "../../lib/auth-redirect";

export function getIOSAuthMainFrameHref(href: string, topOrigin: string) {
  try {
    const url = new URL(href);
    const locale = url.pathname.match(
      /^\/(zh-CN|en|fr)\/(?:sign-in|sign-up)(?:\/|$)/,
    )?.[1];
    if (!locale || url.origin !== topOrigin) return null;

    url.searchParams.delete("sheet");
    if (url.searchParams.has(authRedirectParamName)) {
      const target = new URL(
        normalizeAuthRedirectTarget(
          locale,
          url.searchParams.get(authRedirectParamName),
        ),
        url.origin,
      );
      target.searchParams.delete("sheet");
      url.searchParams.set(
        authRedirectParamName,
        `${target.pathname}${target.search}${target.hash}`,
      );
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function promoteIOSAuthToMainFrame(currentWindow: Window) {
  if (!/\bFriemiIOS\//i.test(currentWindow.navigator.userAgent)) return false;

  try {
    const top = currentWindow.top;
    if (!top || top === currentWindow) return false;

    const href = getIOSAuthMainFrameHref(
      currentWindow.location.href,
      top.location.origin,
    );
    if (!href) return false;

    // Capacitor exports iOS plugin methods only into the main WebView frame.
    top.location.assign(href);
    return true;
  } catch {
    // Do not navigate a cross-origin or sandboxed embedding page.
    return false;
  }
}
