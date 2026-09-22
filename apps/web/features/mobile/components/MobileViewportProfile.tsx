"use client";

import { useEffect } from "react";
import { getMobileViewportProfile } from "@/lib/mobile-viewport-profile";

export function MobileViewportProfile() {
  useEffect(() => {
    const root = document.documentElement;
    let frameId: number | null = null;
    let previousWidth = 0;
    let stableHeight = 0;

    const update = () => {
      frameId = null;
      const viewport = window.visualViewport;
      const width = Math.round(viewport?.width ?? window.innerWidth);
      const visualHeight = Math.round(viewport?.height ?? window.innerHeight);

      if (previousWidth && Math.abs(previousWidth - width) > 80) {
        stableHeight = 0;
      }

      previousWidth = width;
      stableHeight = Math.max(
        stableHeight,
        window.innerHeight,
        visualHeight,
      );

      const profile = getMobileViewportProfile({
        height: stableHeight,
        width,
      });

      root.dataset.friemiViewportHeight = profile.heightClass;
      root.dataset.friemiViewportWidth = profile.widthClass;
      root.style.setProperty(
        "--friemi-stable-viewport-height",
        `${stableHeight}px`,
      );
      root.style.setProperty(
        "--friemi-visual-viewport-height",
        `${visualHeight}px`,
      );
      root.style.setProperty("--friemi-visual-viewport-width", `${width}px`);
    };

    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("orientationchange", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleUpdate);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("orientationchange", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
      delete root.dataset.friemiViewportHeight;
      delete root.dataset.friemiViewportWidth;
      root.style.removeProperty("--friemi-stable-viewport-height");
      root.style.removeProperty("--friemi-visual-viewport-height");
      root.style.removeProperty("--friemi-visual-viewport-width");
    };
  }, []);

  return null;
}
