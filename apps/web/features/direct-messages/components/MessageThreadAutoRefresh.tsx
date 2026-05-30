"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type MessageThreadAutoRefreshProps = {
  conversationId: string;
  intervalMs?: number;
};

export function MessageThreadAutoRefresh({
  conversationId,
  intervalMs = 6000,
}: MessageThreadAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activeElement = document.activeElement;
      const draftTextarea = document.querySelector<HTMLTextAreaElement>(
        "[data-message-composer] textarea",
      );
      const isComposing =
        activeElement instanceof HTMLElement &&
        Boolean(activeElement.closest("[data-message-composer]"));
      const hasDraft = Boolean(draftTextarea?.value.trim());

      if (document.visibilityState === "visible" && !isComposing && !hasDraft) {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [conversationId, intervalMs, router]);

  return null;
}
