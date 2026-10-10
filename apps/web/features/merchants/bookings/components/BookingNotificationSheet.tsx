"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2 } from "lucide-react";
import { MobileBottomSheet } from "@/components/ui/MobileBottomSheet";
import {
  ActivityDetailFrame,
  getDetailFrameCopy,
} from "@/features/activities/components/ActivityDetailFrame";
import { getBookingCopy } from "../copy";

function getSheetCopy(locale: string) {
  if (locale === "fr")
    return {
      fullPage: "Ouvrir la page complète",
      loading: "Chargement de la réservation…",
    };
  if (locale === "en")
    return {
      fullPage: "Open full page",
      loading: "Loading reservation…",
    };
  return { fullPage: "打开完整页面", loading: "正在加载预约…" };
}

export function BookingNotificationSheet({
  href,
  locale,
  onClose,
}: {
  href: string | null;
  locale: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const title = getBookingCopy(locale).details;
  const sheetCopy = getSheetCopy(locale);

  function openFullPage() {
    if (!href) return;
    onClose();
    router.push(href);
  }

  return (
    <MobileBottomSheet
      ariaLabel={title}
      bodyClassName="overflow-hidden"
      className="sm:max-w-2xl sm:rounded-2xl"
      closeLabel={getDetailFrameCopy(locale).close}
      headerAction={
        <button
          aria-label={sheetCopy.fullPage}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-forest ring-1 ring-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          onClick={openFullPage}
          title={sheetCopy.fullPage}
          type="button"
        >
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
        </button>
      }
      heightClassName="h-[85dvh] sm:h-[min(48rem,calc(100dvh-3rem))]"
      onClose={onClose}
      open={Boolean(href)}
      overlayClassName="!bg-ink/40 sm:items-center sm:justify-center"
      zIndexClassName="z-[90]"
    >
      {href ? (
        <ActivityDetailFrame
          copyOverride={{
            ...getDetailFrameCopy(locale),
            loading: sheetCopy.loading,
          }}
          href={`${href}?sheet=1`}
          key={href}
          label={title}
          locale={locale}
          onBookingUpdated={() => startTransition(() => router.refresh())}
          onCloseRequested={onClose}
          onNavigate={openFullPage}
          open
        />
      ) : null}
    </MobileBottomSheet>
  );
}
