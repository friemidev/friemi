"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __friemiWechatEntryUrl?: string;
  }
}

function isWechatWebView(userAgent: string) {
  return /MicroMessenger/i.test(userAgent);
}

export function WechatEntryUrlCapture() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.__friemiWechatEntryUrl ||
      !isWechatWebView(window.navigator.userAgent)
    ) {
      return;
    }

    window.__friemiWechatEntryUrl = window.location.href.split("#")[0];
  }, []);

  return null;
}
