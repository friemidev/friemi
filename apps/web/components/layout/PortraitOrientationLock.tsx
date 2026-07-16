"use client";

import { useEffect } from "react";

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait") => Promise<void>;
};

function requestPortraitLock() {
  const orientation = window.screen?.orientation as
    | LockableScreenOrientation
    | undefined;

  void orientation?.lock?.("portrait").catch(() => undefined);
}

export function PortraitOrientationLock() {
  useEffect(() => {
    requestPortraitLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestPortraitLock();
      }
    };

    window.addEventListener("focus", requestPortraitLock);
    window.addEventListener("orientationchange", requestPortraitLock);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", requestPortraitLock);
      window.removeEventListener("orientationchange", requestPortraitLock);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
