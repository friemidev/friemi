"use client";

import {
  CirclePlus,
  CopyPlus,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import type { DetailSourceInput } from "@/features/navigation/contextualDetailReturn";
import { cn } from "@/lib/utils";

type ActivityCardActionTone =
  | "activity"
  | "joined"
  | "muted"
  | "neutral"
  | "pending"
  | "team";

type AnalyticsLinkEvent = ComponentProps<typeof AnalyticsLink>["event"];
type MobileActionIconName = "circlePlus" | "copyPlus" | "settings";

function getMobileActionMenuCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      eyebrow: "Choisir",
      open: "Actions",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      eyebrow: "Choose",
      open: "Actions",
    };
  }

  return {
    close: "关闭",
    eyebrow: "选择操作",
    open: "操作",
  };
}

function getPrimaryActionClassName(tone: ActivityCardActionTone) {
  if (tone === "muted") {
    return "border-outline/35 bg-fog text-ink/60 shadow-[0_12px_24px_rgba(29,29,27,0.08)]";
  }

  if (tone === "pending") {
    return "border-sand bg-cream text-danger shadow-[0_14px_26px_rgba(181,48,31,0.12)]";
  }

  if (tone === "joined" || tone === "neutral") {
    return "border-sage bg-paper text-forest shadow-[0_14px_26px_rgba(21,98,64,0.14)]";
  }

  if (tone === "activity") {
    return "border-sage bg-ice text-forest shadow-[0_14px_26px_rgba(21,98,64,0.12)]";
  }

  return "border-coral bg-coral text-white shadow-[0_16px_30px_rgba(240,145,130,0.25)]";
}

function getActionIcon(name: MobileActionIconName): LucideIcon {
  if (name === "settings") {
    return Settings2;
  }

  if (name === "copyPlus") {
    return CopyPlus;
  }

  return CirclePlus;
}

export function MobileLobbyActionSheet({
  activityTitle,
  locale,
  primaryDetailSource,
  primaryEvent,
  primaryHref,
  primaryIconName,
  primaryLabel,
  primaryTone,
  secondaryHref,
  secondaryLabel,
}: {
  activityTitle: string;
  locale: string;
  primaryDetailSource?: DetailSourceInput;
  primaryEvent: AnalyticsLinkEvent;
  primaryHref: string;
  primaryIconName: MobileActionIconName;
  primaryLabel: string;
  primaryTone: ActivityCardActionTone;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sheetRendered, setSheetRendered] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const copy = getMobileActionMenuCopy(locale);
  const PrimaryIcon = getActionIcon(primaryIconName);
  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);
  const overlay = (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] sm:hidden"
      role="dialog"
    >
      <button
        aria-label={copy.close}
        className={cn(
          "absolute inset-0 h-full w-full cursor-default bg-ink/32 backdrop-blur-[2px] transition-opacity duration-200 ease-out motion-reduce:transition-none",
          sheetVisible ? "opacity-100" : "opacity-0",
        )}
        type="button"
        onClick={closeSheet}
      />
      <div
        className={cn(
          "absolute inset-x-3 bottom-0 rounded-t-[1.65rem] border border-sand bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3.5 text-left shadow-[0_-20px_50px_rgba(29,29,27,0.22)] ring-1 ring-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          sheetVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-5 opacity-0",
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-forest">
              {copy.eyebrow}
            </p>
            <p className="mt-2 line-clamp-2 text-sm font-extrabold leading-snug text-ink">
              {activityTitle}
            </p>
          </div>
          <button
            aria-label={copy.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand bg-paper text-forest shadow-[0_8px_18px_rgba(21,98,64,0.08)]"
            type="button"
            onClick={closeSheet}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <AnalyticsLink
            ariaLabel={primaryLabel}
            detailSource={primaryDetailSource}
            event={primaryEvent}
            href={primaryHref}
            className="group/action rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35"
          >
            <span
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-bold leading-tight transition group-active/action:translate-y-px",
                getPrimaryActionClassName(primaryTone),
              )}
            >
              <PrimaryIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 text-center">{primaryLabel}</span>
            </span>
          </AnalyticsLink>
          <Link
            href={secondaryHref}
            aria-label={secondaryLabel}
            className="group/action rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35"
          >
            <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-sage bg-paper px-3 text-[13px] font-bold leading-tight text-forest shadow-[0_8px_16px_rgba(21,98,64,0.08)] transition group-active/action:translate-y-px">
              <CopyPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 text-center">{secondaryLabel}</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let frameId: number | undefined;
    let timeoutId: number | undefined;

    if (open) {
      setSheetRendered(true);
      frameId = window.requestAnimationFrame(() => {
        setSheetVisible(true);
      });
    } else {
      setSheetVisible(false);
      timeoutId = window.setTimeout(() => {
        setSheetRendered(false);
      }, 180);
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [open, closeSheet]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative z-30 w-full sm:hidden">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.open}
        className="relative mx-auto flex h-9 min-h-9 w-full cursor-pointer list-none items-center justify-center gap-2 overflow-hidden rounded-[1.15rem] border border-coral/45 bg-[linear-gradient(135deg,#FFF5E6_0%,#FEFFF9_56%,#F1F2E3_100%)] px-2.5 text-forest shadow-[0_10px_20px_rgba(240,145,130,0.1),inset_0_1px_0_rgba(255,255,255,0.94)] transition duration-150 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -left-4 top-0 h-9 w-9 rounded-full bg-coral/18 blur-[0.5px]"
        />
        <span
          aria-hidden="true"
          className="absolute -right-5 bottom-0 h-10 w-10 rounded-full bg-sage/14 blur-[1px]"
        />
        <span className="relative flex h-6 w-[2.85rem] shrink-0 items-center justify-center">
          <span className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-white shadow-[0_8px_16px_rgba(240,145,130,0.24)]">
            <PrimaryIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="absolute right-0 flex h-6 w-6 items-center justify-center rounded-full border border-sage/70 bg-cream text-forest shadow-[0_8px_16px_rgba(21,98,64,0.07)]">
            <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
        <span className="relative min-w-0 translate-y-px truncate text-[12px] font-bold leading-[1.25]">
          {copy.open}
        </span>
        <span className="relative h-1.5 w-1.5 shrink-0 rounded-full bg-coral/65" />
      </button>

      {sheetRendered && mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
