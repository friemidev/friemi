"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AndroidBridge = {
  copyText?: (text: string) => void;
  downloadFile?: (url: string) => void;
  getAppInfo?: () => string;
  getStoredPushToken?: () => string;
  openExternal?: (url: string) => void;
  openMap?: (url: string) => void;
  registerPushToken?: () => string;
  saveLocale?: (locale: string) => void;
  setBackBehavior?: (payloadJson: string) => void;
  share?: (payloadJson: string) => void;
};

type AndroidPushTokenPayload = {
  appVersion?: string;
  deviceId?: string;
  fcmToken?: string;
  locale?: string;
  ok?: boolean;
  platform?: "ANDROID";
  reason?: string;
  supported?: boolean;
  timezone?: string;
};

declare global {
  interface Window {
    FriemiAndroid?: AndroidBridge;
  }
}

type AndroidAppBridgeProps = {
  locale: string;
};

const dialogSelectors = [
  '[role="dialog"][aria-modal="true"]',
  'dialog[open]',
  '[data-android-back-sheet="true"]',
].join(",");

const closeButtonSelectors = [
  'button[aria-label*="关闭"]',
  'button[aria-label*="Close"]',
  'button[aria-label*="Fermer"]',
  'button[title*="关闭"]',
  'button[title*="Close"]',
  'button[title*="Fermer"]',
  '[data-android-back-close="true"]',
].join(",");

function isFriemiAndroidApp() {
  return /FriemiAndroid\//i.test(window.navigator.userAgent);
}

function isElementVisible(element: Element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function getOpenDialogs() {
  return Array.from(document.querySelectorAll(dialogSelectors)).filter(
    isElementVisible,
  ) as HTMLElement[];
}

function closeTopDialog() {
  const openDialogs = getOpenDialogs();
  const topDialog = openDialogs.at(-1);
  const closeButton = topDialog?.querySelector(closeButtonSelectors);

  if (closeButton instanceof HTMLElement) {
    closeButton.click();
    return true;
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    }),
  );

  return openDialogs.length > 0;
}

function parsePushTokenPayload(detail: unknown): AndroidPushTokenPayload | null {
  if (!detail) {
    return null;
  }

  if (typeof detail === "string") {
    try {
      return JSON.parse(detail) as AndroidPushTokenPayload;
    } catch {
      return null;
    }
  }

  if (typeof detail === "object") {
    return detail as AndroidPushTokenPayload;
  }

  return null;
}

async function registerMobileDevice(payload: AndroidPushTokenPayload) {
  if (!payload.ok || !payload.fcmToken) {
    return false;
  }

  try {
    const response = await fetch("/api/mobile/devices/register", {
      body: JSON.stringify({
        appVersion: payload.appVersion,
        deviceId: payload.deviceId,
        fcmToken: payload.fcmToken,
        locale: payload.locale,
        platform: "ANDROID",
        timezone: payload.timezone,
      }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to register Android push token", error);
    return false;
  }
}

export function AndroidAppBridge({ locale }: AndroidAppBridgeProps) {
  const pathname = usePathname();
  const lastRegisteredTokenRef = useRef<string | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFriemiAndroidApp()) {
      return;
    }

    document.documentElement.dataset.friemiAndroidApp = "true";
    window.FriemiAndroid?.saveLocale?.(locale);

    const sendBackBehavior = () => {
      const hasModal = getOpenDialogs().length > 0;
      window.FriemiAndroid?.setBackBehavior?.(
        JSON.stringify({
          hasModal,
          hasSheet: hasModal,
        }),
      );
    };

    const scheduleBackBehaviorUpdate = () => {
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = window.setTimeout(sendBackBehavior, 80);
    };

    const handleAndroidReady = () => {
      window.FriemiAndroid?.saveLocale?.(locale);
      window.FriemiAndroid?.registerPushToken?.();
      sendBackBehavior();
    };
    const handleAndroidBack = () => {
      closeTopDialog();
      scheduleBackBehaviorUpdate();
    };
    const handleAndroidPushToken = (event: Event) => {
      const payload = parsePushTokenPayload(
        (event as CustomEvent<unknown>).detail,
      );

      if (!payload?.fcmToken || payload.fcmToken === lastRegisteredTokenRef.current) {
        return;
      }

      void registerMobileDevice(payload).then((ok) => {
        if (ok) {
          lastRegisteredTokenRef.current = payload.fcmToken ?? null;
        }
      });
    };

    window.addEventListener("friemi:android-ready", handleAndroidReady);
    window.addEventListener("friemi:android-back", handleAndroidBack);
    window.addEventListener("friemi:android-push-token", handleAndroidPushToken);
    document.addEventListener("click", scheduleBackBehaviorUpdate, true);
    document.addEventListener("keyup", scheduleBackBehaviorUpdate, true);

    const observer = new MutationObserver(scheduleBackBehaviorUpdate);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    sendBackBehavior();
    window.FriemiAndroid?.registerPushToken?.();

    return () => {
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }
      window.FriemiAndroid?.setBackBehavior?.(
        JSON.stringify({
          hasModal: false,
          hasSheet: false,
        }),
      );
      observer.disconnect();
      window.removeEventListener("friemi:android-ready", handleAndroidReady);
      window.removeEventListener("friemi:android-back", handleAndroidBack);
      window.removeEventListener(
        "friemi:android-push-token",
        handleAndroidPushToken,
      );
      document.removeEventListener("click", scheduleBackBehaviorUpdate, true);
      document.removeEventListener("keyup", scheduleBackBehaviorUpdate, true);
      delete document.documentElement.dataset.friemiAndroidApp;
    };
  }, [locale, pathname]);

  return null;
}
