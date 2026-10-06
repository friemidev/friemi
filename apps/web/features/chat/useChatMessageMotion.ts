"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import type { ChatCursorMessage } from "./chatCursorSync";
import { getEnteringChatMessageIds } from "./utils/chatMessageMotion";

export function useChatMessageMotion(
  messages: ChatCursorMessage[],
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const previousRef = useRef(messages);
  useLayoutEffect(() => {
    const enteringIds = new Set(
      getEnteringChatMessageIds(previousRef.current, messages),
    );
    previousRef.current = messages;
    if (
      !enteringIds.size ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    containerRef.current
      ?.querySelectorAll<HTMLElement>("[data-chat-motion-id]")
      .forEach((element) => {
        if (enteringIds.has(element.dataset.chatMotionId ?? "")) {
          element.animate?.(
            [
              { opacity: 0.45, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
        }
      });
  }, [containerRef, messages]);
}
