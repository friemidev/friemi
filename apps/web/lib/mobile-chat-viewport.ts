"use client";

import { useEffect } from "react";

const mobileQuery = "(max-width: 767px)";
const visualHeightVariable = "--friemi-chat-visual-height";

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
    return;
  }

  const visualHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(
    visualHeightVariable,
    `${Math.round(visualHeight)}px`,
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
    };
  }, []);
}
