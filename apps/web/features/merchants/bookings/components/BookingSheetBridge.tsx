"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  detailSheetCloseMessage,
  detailSheetReadyMessage,
} from "@/features/activities/detailSheetRetention";

export function BookingSheetBridge() {
  useEffect(() => {
    if (window.parent === window) return;

    window.parent.postMessage(
      { type: detailSheetReadyMessage },
      window.location.origin,
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.parent.postMessage(
          { type: detailSheetCloseMessage },
          window.location.origin,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

export function BookingSheetCloseButton({
  label,
  fallbackHref,
}: {
  label: string;
  fallbackHref: string;
}) {
  const router = useRouter();
  return (
    <button
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      onClick={() => {
        if (window.parent !== window) {
          window.parent.postMessage(
            { type: detailSheetCloseMessage },
            window.location.origin,
          );
        } else {
          router.push(fallbackHref);
        }
      }}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
