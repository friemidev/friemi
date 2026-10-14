"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Link2,
  Ticket,
} from "lucide-react";
import type { AnalyticsEventInput } from "@/features/analytics/events";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import {
  nativeHostExternalBrowser,
  requestParentHostExternalBrowser,
} from "@/features/mobile/hostExternalBrowser";
import {
  getActivityHostLinkCopy,
  type getActivityHostLink,
} from "../utils/activityHostLink";

export function ActivityHostLink({
  link,
  locale,
  event,
}: {
  link: NonNullable<ReturnType<typeof getActivityHostLink>>;
  locale: string;
  event: Omit<AnalyticsEventInput, "locale" | "route">;
}) {
  const copy = getActivityHostLinkCopy(locale);
  const [nativeSupported, setNativeSupported] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const pendingRef = useRef(false);
  const Icon =
    link.kind === "SUPPLEMENTARY_FORM"
      ? ClipboardList
      : link.kind === "VIEW_DETAILS"
        ? FileText
        : link.kind === "RESERVE_SPOT"
          ? Ticket
          : Link2;

  useEffect(() => {
    let active = true;
    setFailed(false);
    setNativeSupported(false);
    const support =
      window.parent !== window
        ? requestParentHostExternalBrowser("support")
        : nativeHostExternalBrowser.isSupported();
    void support.then((supported) => {
      if (active) setNativeSupported(supported);
    });
    return () => {
      active = false;
    };
  }, [link.href]);

  function handleClick(click: MouseEvent<HTMLAnchorElement>) {
    if (
      click.defaultPrevented ||
      click.button !== 0 ||
      click.metaKey ||
      click.ctrlKey ||
      click.shiftKey ||
      click.altKey
    )
      return;
    if (pendingRef.current) {
      click.preventDefault();
      return;
    }
    trackClientAnalyticsEvent(event);
    // Keep a real link for web browsers and older native packages.
    if (!nativeSupported || failed) {
      setFailed(false);
      return;
    }
    click.preventDefault();
    pendingRef.current = true;
    setOpening(true);
    void (
      window.parent !== window
        ? requestParentHostExternalBrowser("open", link.href)
        : nativeHostExternalBrowser.open(link.href)
    )
      .then((opened) => setFailed(!opened))
      .finally(() => {
        pendingRef.current = false;
        setOpening(false);
      });
  }

  return (
    <div className="min-w-0 space-y-1.5" data-activity-host-link={link.kind}>
      <a
        aria-busy={opening || undefined}
        aria-disabled={opening || undefined}
        aria-label={link.label}
        className="friemi-pressable inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-forest/25 bg-white px-3 py-2.5 text-sm font-semibold text-forest transition hover:bg-forest/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow focus-visible:ring-offset-2"
        href={link.href}
        onClick={handleClick}
        rel="noopener noreferrer"
        target="_blank"
        title={link.label}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate whitespace-nowrap">{link.label}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>
      {failed ? (
        <p className="text-xs leading-5 text-danger" role="alert">
          {copy.failed}
        </p>
      ) : null}
      <p
        className="truncate text-center text-[11px] leading-4 text-ink/70"
        title={`${copy.source} · ${link.hostname}`}
      >
        {copy.source} · {link.hostname}
      </p>
    </div>
  );
}
