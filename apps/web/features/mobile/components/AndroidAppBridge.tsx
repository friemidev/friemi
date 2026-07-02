"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AndroidBridge = {
  copyText?: (text: string) => void;
  downloadFile?: (url: string) => void;
  getAppInfo?: () => string;
  openExternal?: (url: string) => void;
  openMap?: (url: string) => void;
  registerPushToken?: () => string;
  saveLocale?: (locale: string) => void;
  setBackBehavior?: (payloadJson: string) => void;
  share?: (payloadJson: string) => void;
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

export function AndroidAppBridge({ locale }: AndroidAppBridgeProps) {
  const pathname = usePathname();
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
      sendBackBehavior();
    };
    const handleAndroidBack = () => {
      closeTopDialog();
      scheduleBackBehaviorUpdate();
    };

    window.addEventListener("friemi:android-ready", handleAndroidReady);
    window.addEventListener("friemi:android-back", handleAndroidBack);
    document.addEventListener("click", scheduleBackBehaviorUpdate, true);
    document.addEventListener("keyup", scheduleBackBehaviorUpdate, true);

    const observer = new MutationObserver(scheduleBackBehaviorUpdate);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    sendBackBehavior();

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
      document.removeEventListener("click", scheduleBackBehaviorUpdate, true);
      document.removeEventListener("keyup", scheduleBackBehaviorUpdate, true);
      delete document.documentElement.dataset.friemiAndroidApp;
    };
  }, [locale, pathname]);

  return null;
}
