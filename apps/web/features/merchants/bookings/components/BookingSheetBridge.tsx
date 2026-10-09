"use client";

import { useEffect } from "react";
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
