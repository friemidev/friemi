"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPerformanceRolloutMode } from "@/lib/performanceRollouts";

type MessageThreadAutoRefreshProps = {
  conversationId: string;
  intervalMs?: number;
};

export function MessageThreadAutoRefresh({
  conversationId,
  intervalMs = 6000,
}: MessageThreadAutoRefreshProps) {
  const router = useRouter();
  const mode = getPerformanceRolloutMode("chatCursor", conversationId);

  useEffect(() => {
    if (mode === "canary") {
      return;
    }

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
  }, [conversationId, intervalMs, mode, router]);

  return null;
}
