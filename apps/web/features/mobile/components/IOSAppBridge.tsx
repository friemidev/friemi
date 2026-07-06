"use client";

import { useEffect } from "react";

function isFriemiIOSApp() {
  return /FriemiIOS\//i.test(window.navigator.userAgent);
}

export function IOSAppBridge() {
  useEffect(() => {
    if (!isFriemiIOSApp()) {
      return;
    }

    document.documentElement.dataset.friemiIosApp = "true";

    return () => {
      delete document.documentElement.dataset.friemiIosApp;
    };
  }, []);

  return null;
}
