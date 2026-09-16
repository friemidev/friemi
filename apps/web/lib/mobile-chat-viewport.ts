"use client";

import { useEffect } from "react";

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
    return;
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

export function useMobileChatViewportGuard() {
  useEffect(() => {
    syncMobileChatViewportHeight();

    const visualViewport = window.visualViewport;
    const handleViewportChange = () => {
      syncMobileChatViewportHeight();
      keepMobileChatPageAnchored();
    };

    window.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("scroll", handleViewportChange);
      document.documentElement.style.removeProperty(visualHeightVariable);
      document.documentElement.style.removeProperty(visualOffsetTopVariable);
      delete document.documentElement.dataset.friemiChatKeyboardOpen;
      expandedMobileViewportHeight = 0;
      previousMobileViewportWidth = 0;
    };
  }, []);
}
