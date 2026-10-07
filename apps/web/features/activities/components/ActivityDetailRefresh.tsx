"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  detailSheetReadyMessage,
  detailSheetVisibilityMessage,
} from "@/features/activities/detailSheetRetention";

const freshForMs = 30_000;

export function ActivityDetailRefresh({
  validatedAt,
}: {
  validatedAt: number;
}) {
  const router = useRouter();
  const attemptedAt = useRef(0);
  const visible = useRef<boolean | null>(null);

  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: detailSheetReadyMessage },
        window.location.origin,
      );
    }
    visible.current ??= window.parent === window;
    const refreshIfStale = () => {
      if (!visible.current || document.hidden || !navigator.onLine) return;
      const now = Date.now();
      if (now - Math.max(validatedAt, attemptedAt.current) < freshForMs) return;
      attemptedAt.current = now;
      // Preserve the current document, scroll and controls while fetching fresh data.
      startTransition(() => router.refresh());
    };
    const onMessage = (event: MessageEvent) => {
      if (
        window.parent === window ||
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== detailSheetVisibilityMessage ||
        typeof event.data.visible !== "boolean"
      )
        return;
      visible.current = event.data.visible;
      refreshIfStale();
    };
    refreshIfStale();
    window.addEventListener("message", onMessage);
    window.addEventListener("online", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("online", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [router, validatedAt]);

  return null;
}
