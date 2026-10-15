"use client";

import { useEffect } from "react";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { AppHandoff } from "@/features/mobile/components/AppHandoff";

export function WechatWebViewGuide({
  locale,
  target,
}: {
  locale: string;
  target: string;
}) {
  useEffect(() => {
    trackClientAnalyticsEvent({
      name: "wechat_webview_login_guide_viewed",
      sourceSurface: "wechat_webview",
      properties: { context: "sign_in" },
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <AppHandoff locale={locale} target={target} userAgent="MicroMessenger" />
    </div>
  );
}
