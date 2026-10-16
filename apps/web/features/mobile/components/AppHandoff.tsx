"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Smartphone,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import {
  getAppHandoffPath,
  getAppLinkPlatform,
  getAppLinks,
} from "../appLinks";
import { getAppLinkCopy } from "../appLinkCopy";
import { APP_HANDOFF_ENABLED } from "../appHandoffRollout";

const actionClass =
  "inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold touch-manipulation transition active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow focus-visible:ring-offset-2";

function usePlatform(initialUserAgent = "") {
  const [userAgent, setUserAgent] = useState(initialUserAgent);
  useEffect(() => setUserAgent(navigator.userAgent), []);
  return {
    platform: getAppLinkPlatform(userAgent),
    wechat: /MicroMessenger/i.test(userAgent),
  };
}

export function AppOpenEntry({
  locale,
  target,
  userAgent = "",
}: {
  locale: string;
  target: string;
  userAgent?: string;
}) {
  const { platform } = usePlatform(userAgent);
  if (!APP_HANDOFF_ENABLED || platform === "native" || platform === "desktop")
    return null;
  return (
    <a
      className={`${actionClass} border border-forest/20 bg-white text-forest`}
      href={getAppHandoffPath(locale, target)}
      target="_top"
    >
      <Smartphone aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="truncate">{getAppLinkCopy(locale).open}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
    </a>
  );
}

export function AppHandoff({
  locale,
  target,
  userAgent = "",
  compact = false,
  retry = false,
}: {
  locale: string;
  target: string;
  userAgent?: string;
  compact?: boolean;
  retry?: boolean;
}) {
  const { platform, wechat } = usePlatform(userAgent);
  const [attempted, setAttempted] = useState(retry);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const links = getAppLinks(locale, target);
  const copy = getAppLinkCopy(locale);

  if (!APP_HANDOFF_ENABLED) return null;

  // Existing native login must never be replaced with another app launch.
  if (compact && (platform === "native" || platform === "desktop")) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(links.fallback);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  const launchHref =
    platform === "native"
      ? links.target
      : platform === "android"
        ? links.androidIntent
        : retry
          ? links.scheme
          : links.universal;

  return (
    <section
      aria-label={copy.title}
      className={
        compact
          ? "mb-5 space-y-3 border-b border-forest/10 pb-5"
          : "mx-auto w-full max-w-sm space-y-6 py-8"
      }
    >
      {!compact && <BrandLockup size="lg" priority />}
      <header className="space-y-2">
        <h1
          className={
            compact
              ? "text-base font-semibold text-ink"
              : "text-2xl font-semibold text-ink"
          }
        >
          {wechat ? copy.wechatTitle : copy.title}
        </h1>
        {wechat && (
          <p className="text-sm leading-6 text-ink/70">{copy.wechatHint}</p>
        )}
      </header>
      {wechat ? (
        <div className="space-y-3">
          <button
            className={`${actionClass} bg-forest text-white`}
            onClick={copyLink}
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
                value={links.fallback}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <a
            className={`${actionClass} bg-forest text-white`}
            href={launchHref}
            target="_top"
            onClick={() => setAttempted(true)}
          >
            <Smartphone aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {attempted ? copy.retry : copy.open}
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </a>
          {platform !== "native" && (
            <>
              {platform !== "ios" && (
                <a
                  className={`${actionClass} border border-forest/25 text-forest`}
                  href={links.androidStore}
                  target="_top"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Google Play</span>
                </a>
              )}
              {platform !== "android" && (
                <a
                  className={`${actionClass} border border-forest/25 text-forest`}
                  href={links.iosStore}
                  target="_top"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">App Store</span>
                </a>
              )}
              {attempted && (
                <p role="status" className="text-sm leading-6 text-ink/70">
                  {copy.notOpened}
                </p>
              )}
              {!compact && (
                <p className="text-xs leading-5 text-ink/70">
                  {copy.installHint}
                </p>
              )}
            </>
          )}
        </div>
      )}
      {!compact && (
        <a
          className={`${actionClass} text-forest`}
          href={links.target}
          target="_top"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{wechat ? copy.back : copy.browser}</span>
        </a>
      )}
    </section>
  );
}
