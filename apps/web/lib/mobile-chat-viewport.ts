"use client";

import { useEffect, type RefObject } from "react";

const mobileQuery = "(max-width: 767px)";
const visualHeightVariable = "--friemi-chat-visual-height";
const visualOffsetTopVariable = "--friemi-chat-visual-offset-top";
let expandedMobileViewportHeight = 0;
let previousMobileViewportWidth = 0;

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(mobileQuery).matches
  );
}

function syncMobileChatViewportHeight() {
  if (!isMobileViewport()) {
    document.documentElement.style.removeProperty(visualHeightVariable);
    document.documentElement.style.removeProperty(visualOffsetTopVariable);
    delete document.documentElement.dataset.friemiChatKeyboardOpen;
    return false;
  }

  const visualViewport = window.visualViewport;
  const visualHeight = visualViewport?.height ?? window.innerHeight;
  const visualOffsetTop = visualViewport?.offsetTop ?? 0;
  if (
    previousMobileViewportWidth > 0 &&
    Math.abs(previousMobileViewportWidth - window.innerWidth) > 80
  ) {
    expandedMobileViewportHeight = 0;
  }
  previousMobileViewportWidth = window.innerWidth;
  expandedMobileViewportHeight = Math.max(
    expandedMobileViewportHeight,
    window.innerHeight,
    visualHeight + visualOffsetTop,
  );
  const keyboardOpen =
    expandedMobileViewportHeight - visualHeight - visualOffsetTop > 120;
  document.documentElement.style.setProperty(
    visualHeightVariable,
    `${Math.round(visualHeight)}px`,
  );
  document.documentElement.style.setProperty(
    visualOffsetTopVariable,
    `${Math.max(0, Math.round(visualOffsetTop))}px`,
  );
  document.documentElement.dataset.friemiChatKeyboardOpen = keyboardOpen
    ? "true"
    : "false";

  return keyboardOpen;
}

function isChatComposerTextInput(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const isTextInput =
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement &&
      !["button", "checkbox", "file", "hidden", "radio", "submit"].includes(
        target.type,
      ));

  return (
    isTextInput &&
    Boolean(
      target.closest(
        "[data-message-composer], [data-activity-room-composer], [data-planet-chat-composer]",
      ),
    )
  );
}

export function keepMobileChatPageAnchored() {
  if (!isMobileViewport()) {
    return;
  }

  const resetScroll = () => {
    window.scrollTo(0, 0);
    document.scrollingElement?.scrollTo(0, 0);
  };

  resetScroll();
  window.requestAnimationFrame(resetScroll);
  window.setTimeout(resetScroll, 180);
}

export function useMobileChatViewportGuard(
  scrollContainerRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    syncMobileChatViewportHeight();

    const visualViewport = window.visualViewport;
    let revealFrame = 0;
    let settleTimer = 0;
    let viewportSettleTimer = 0;
    const revealLatestMessage = () => {
      const scrollToLatest = () => {
        const container = scrollContainerRef?.current;

        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      };

      window.cancelAnimationFrame(revealFrame);
      window.clearTimeout(settleTimer);
      revealFrame = window.requestAnimationFrame(() => {
        scrollToLatest();
        revealFrame = window.requestAnimationFrame(scrollToLatest);
      });
      settleTimer = window.setTimeout(scrollToLatest, 280);
    };
    const handleViewportChange = () => {
      const keyboardOpen = syncMobileChatViewportHeight();

      if (!isMobileViewport()) {
        return;
      }

      keepMobileChatPageAnchored();

      if (keyboardOpen || isChatComposerTextInput(document.activeElement)) {
        revealLatestMessage();
      }
    };
    const handleComposerFocus = (event: FocusEvent) => {
      if (!isMobileViewport() || !isChatComposerTextInput(event.target)) {
        return;
      }

      syncMobileChatViewportHeight();
      keepMobileChatPageAnchored();
      revealLatestMessage();
    };
    const handleComposerBlur = (event: FocusEvent) => {
      if (!isChatComposerTextInput(event.target)) {
        return;
      }

      window.clearTimeout(viewportSettleTimer);
      viewportSettleTimer = window.setTimeout(
        syncMobileChatViewportHeight,
        240,
      );
    };

    window.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("scroll", handleViewportChange);
    document.addEventListener("focusin", handleComposerFocus);
    document.addEventListener("focusout", handleComposerBlur);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("scroll", handleViewportChange);
      document.removeEventListener("focusin", handleComposerFocus);
      document.removeEventListener("focusout", handleComposerBlur);
      window.cancelAnimationFrame(revealFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(viewportSettleTimer);
      document.documentElement.style.removeProperty(visualHeightVariable);
      document.documentElement.style.removeProperty(visualOffsetTopVariable);
      delete document.documentElement.dataset.friemiChatKeyboardOpen;
      expandedMobileViewportHeight = 0;
      previousMobileViewportWidth = 0;
    };
  }, [scrollContainerRef]);
}
