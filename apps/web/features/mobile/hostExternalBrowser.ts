"use client";

import { Capacitor } from "@capacitor/core";
import { FriemiNavigation } from "./nativeNavigation";
import {
  hostExternalBrowserRequestType,
  hostExternalBrowserResponseType,
  normalizeHostExternalUrl,
  type HostExternalBrowserController,
} from "./hostExternalBrowserProtocol";

let iosSupport: Promise<boolean> | undefined;
let requestSequence = 0;

export const nativeHostExternalBrowser: HostExternalBrowserController = {
  async isSupported() {
    if (typeof window === "undefined") return false;
    if (typeof window.FriemiAndroid?.openHostLink === "function") return true;
    if (!Capacitor.isPluginAvailable("FriemiNavigation")) return false;
    iosSupport ??= FriemiNavigation.getExternalBrowserSupport()
      .then((result) => result.supported === true)
      .catch(() => false);
    return iosSupport;
  },
  async open(value) {
    const url = normalizeHostExternalUrl(value);
    if (!url || !(await this.isSupported())) return false;
    try {
      if (window.FriemiAndroid?.openHostLink) {
        return window.FriemiAndroid.openHostLink(url) === true;
      }
      await FriemiNavigation.openHostLink({ url });
      return true;
    } catch {
      return false;
    }
  },
};

export function requestParentHostExternalBrowser(
  action: "support" | "open",
  url?: string,
): Promise<boolean> {
  if (typeof window === "undefined" || window.parent === window)
    return Promise.resolve(false);
  if (action === "open" && !normalizeHostExternalUrl(url))
    return Promise.resolve(false);
  const requestId = `host-link-${Date.now()}-${++requestSequence}`;
  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      )
        return;
      if (
        event.data?.type !== hostExternalBrowserResponseType ||
        event.data.requestId !== requestId ||
        typeof event.data.result !== "boolean"
      )
        return;
      finish(event.data.result);
    };
    const timer = window.setTimeout(
      () => finish(false),
      action === "support" ? 1500 : 5000,
    );
    window.addEventListener("message", onMessage);
    try {
      window.parent.postMessage(
        {
          type: hostExternalBrowserRequestType,
          requestId,
          action,
          ...(action === "open" ? { url } : {}),
        },
        window.location.origin,
      );
    } catch {
      finish(false);
    }
  });
}
