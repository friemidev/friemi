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
  saveImageToGallery?: (url: string) => void;
  scanQrCode?: () => string;
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

type AndroidSafeAreaPayload = {
  bottom?: number;
  navigationBarHeight?: number;
  statusBarHeight?: number;
  top?: number;
};

type AndroidAppInfoPayload = AndroidPushTokenPayload & {
  safeArea?: AndroidSafeAreaPayload;
};

declare global {
  interface Window {
    FriemiAndroid?: AndroidBridge;
  }
}

type AndroidAppBridgeProps = {
  locale: string;
  viewerProfileId: string | null;
};

const dialogSelectors = [
  '[role="dialog"][aria-modal="true"]',
  "dialog[open]",
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

function isNativeAppHomePath(pathname: string) {
  const pathWithoutLocale = pathname.replace(/^\/(?:zh-CN|en|fr)(?=\/|$)/, "");

  return (
    pathWithoutLocale === "" ||
    pathWithoutLocale === "/" ||
    pathWithoutLocale === "/home" ||
    pathWithoutLocale === "/mobile-home"
  );
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

function parsePushTokenPayload(
  detail: unknown,
): AndroidPushTokenPayload | null {
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

function parseAndroidAppInfoPayload(
  detail: unknown,
): AndroidAppInfoPayload | null {
  if (!detail) {
    return null;
  }

  if (typeof detail === "string") {
    try {
      return JSON.parse(detail) as AndroidAppInfoPayload;
    } catch {
      return null;
    }
  }

  if (typeof detail === "object") {
    return detail as AndroidAppInfoPayload;
  }

  return null;
}

function getSafeAreaNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function applyAndroidSafeArea(payload?: AndroidAppInfoPayload | null) {
  const safeArea = payload?.safeArea ?? {};
  const root = document.documentElement;

  root.dataset.friemiAndroidApp = "true";
  root.style.setProperty(
    "--friemi-android-statusbar-height",
    `${getSafeAreaNumber(safeArea.statusBarHeight)}px`,
  );
  root.style.setProperty(
    "--friemi-android-navigationbar-height",
    `${getSafeAreaNumber(safeArea.navigationBarHeight)}px`,
  );
  root.style.setProperty(
    "--friemi-android-top-inset",
    `${getSafeAreaNumber(safeArea.top)}px`,
  );
  root.style.setProperty(
    "--friemi-android-bottom-inset",
    `${getSafeAreaNumber(safeArea.bottom)}px`,
  );
}

function readAndroidAppInfo() {
  return parseAndroidAppInfoPayload(window.FriemiAndroid?.getAppInfo?.());
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

    if (!response.ok) {
      console.warn("Failed to register Android push token", response.status);
    }

    return response.ok;
  } catch (error) {
    console.error("Failed to register Android push token", error);
    return false;
  }
}

export function AndroidAppBridge({
  locale,
  viewerProfileId,
}: AndroidAppBridgeProps) {
  const pathname = usePathname();
  const lastRegisteredKeyRef = useRef<string | null>(null);
  const registeringKeyRef = useRef<string | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFriemiAndroidApp()) {
      return;
    }

    document.documentElement.dataset.friemiAndroidApp = "true";
    applyAndroidSafeArea(readAndroidAppInfo());
    window.FriemiAndroid?.saveLocale?.(locale);

    const sendBackBehavior = () => {
      const hasModal = getOpenDialogs().length > 0;
      window.FriemiAndroid?.setBackBehavior?.(
        JSON.stringify({
          hasModal,
          hasSheet: hasModal,
          interceptBack: hasModal || !isNativeAppHomePath(pathname),
        }),
      );
    };

    const scheduleBackBehaviorUpdate = () => {
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = window.setTimeout(sendBackBehavior, 80);
    };

    const requestPushToken = () => {
      if (viewerProfileId) {
        window.FriemiAndroid?.registerPushToken?.();
      }
    };

    const handleAndroidReady = (event: Event) => {
      applyAndroidSafeArea(
        parseAndroidAppInfoPayload((event as CustomEvent<unknown>).detail) ??
          readAndroidAppInfo(),
      );
      window.FriemiAndroid?.saveLocale?.(locale);
      requestPushToken();
      sendBackBehavior();
    };
    const handleAndroidSafeArea = (event: Event) => {
      applyAndroidSafeArea({
        safeArea: (event as CustomEvent<AndroidSafeAreaPayload>).detail,
      });
    };
    const handleAndroidBack = () => {
      if (!closeTopDialog()) {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.assign(`/${locale}/mobile-home`);
        }
      }
      scheduleBackBehaviorUpdate();
    };
    const handleAndroidPushToken = (event: Event) => {
      const payload = parsePushTokenPayload(
        (event as CustomEvent<unknown>).detail,
      );

      if (!payload?.ok || !payload.fcmToken || !viewerProfileId) {
        if (payload?.reason) {
          console.warn("Android push token unavailable", payload.reason);
        }
        return;
      }

      const registrationKey = `${viewerProfileId}:${payload.fcmToken}`;
      if (
        registrationKey === lastRegisteredKeyRef.current ||
        registrationKey === registeringKeyRef.current
      ) {
        return;
      }

      registeringKeyRef.current = registrationKey;
      void registerMobileDevice(payload).then((ok) => {
        if (ok) {
          lastRegisteredKeyRef.current = registrationKey;
        }
        if (registeringKeyRef.current === registrationKey) {
          registeringKeyRef.current = null;
        }
      });
    };

    window.addEventListener("friemi:android-ready", handleAndroidReady);
    window.addEventListener("friemi:android-safe-area", handleAndroidSafeArea);
    window.addEventListener("friemi:android-back", handleAndroidBack);
    window.addEventListener(
      "friemi:android-push-token",
      handleAndroidPushToken,
    );
    window.addEventListener("friemi:android-resume", requestPushToken);
    window.addEventListener("online", requestPushToken);
    document.addEventListener("click", scheduleBackBehaviorUpdate, true);
    document.addEventListener("keyup", scheduleBackBehaviorUpdate, true);

    const observer = new MutationObserver(scheduleBackBehaviorUpdate);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    sendBackBehavior();
    requestPushToken();

    return () => {
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }
      window.FriemiAndroid?.setBackBehavior?.(
        JSON.stringify({
          hasModal: false,
          hasSheet: false,
          interceptBack: false,
        }),
      );
      observer.disconnect();
      window.removeEventListener("friemi:android-ready", handleAndroidReady);
      window.removeEventListener(
        "friemi:android-safe-area",
        handleAndroidSafeArea,
      );
      window.removeEventListener("friemi:android-back", handleAndroidBack);
      window.removeEventListener(
        "friemi:android-push-token",
        handleAndroidPushToken,
      );
      window.removeEventListener("friemi:android-resume", requestPushToken);
      window.removeEventListener("online", requestPushToken);
      document.removeEventListener("click", scheduleBackBehaviorUpdate, true);
      document.removeEventListener("keyup", scheduleBackBehaviorUpdate, true);
      delete document.documentElement.dataset.friemiAndroidApp;
    };
  }, [locale, pathname, viewerProfileId]);

  return null;
}
