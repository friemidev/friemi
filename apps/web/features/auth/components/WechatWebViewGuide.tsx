"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { AppHandoff } from "@/features/mobile/components/AppHandoff";
import { APP_HANDOFF_ENABLED } from "@/features/mobile/appHandoffRollout";
import { APP_WEB_ORIGIN } from "@/features/mobile/appLinks";
import { getAppLinkCopy } from "@/features/mobile/appLinkCopy";
import {
  getSignInHref,
  getSignUpHref,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";

const actionClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow";

export function WechatWebViewGuide({
  locale,
  target,
  mode = "sign-in",
}: {
  locale: string;
  target: string;
  mode?: "sign-in" | "sign-up";
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copy = getAppLinkCopy(locale);
  const browserPath = (mode === "sign-up" ? getSignUpHref : getSignInHref)(
    locale,
    target,
  );
  const browserUrl = `${APP_WEB_ORIGIN}${browserPath}`;

  useEffect(() => {
    trackClientAnalyticsEvent({
      name: "wechat_webview_login_guide_viewed",
      sourceSurface: "wechat_webview",
      properties: { context: "sign_in" },
    });
  }, []);

  async function copyBrowserLink() {
    try {
      await navigator.clipboard.writeText(browserUrl);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {APP_HANDOFF_ENABLED ? (
        <AppHandoff locale={locale} target={target} userAgent="MicroMessenger" />
      ) : (
        <section
          aria-label={copy.wechatTitle}
          className="mx-auto w-full max-w-sm space-y-6 py-8"
        >
          <BrandLockup size="lg" priority />
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink">{copy.wechatTitle}</h1>
            <p className="text-sm leading-6 text-ink/70">{copy.wechatBrowserHint}</p>
          </header>
          <button
            className={`${actionClass} bg-forest text-white`}
            onClick={copyBrowserLink}
            type="button"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
          </button>
          {copyFailed && (
            <div role="status" className="space-y-2 text-sm text-ink/70">
              <p>{copy.copyError}</p>
              <input
                aria-label={copy.copy}
                className="min-h-11 w-full rounded-md border border-forest/25 bg-white px-3 text-base"
                readOnly
                value={browserUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          )}
          <a
            className={`${actionClass} text-forest`}
            href={normalizeAuthRedirectTarget(locale, target)}
            target="_top"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{copy.back}</span>
          </a>
        </section>
      )}
    </div>
  );
}
