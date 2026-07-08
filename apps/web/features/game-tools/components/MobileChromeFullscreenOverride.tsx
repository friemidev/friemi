"use client";

import { useEffect } from "react";

type MobileChromeFullscreenOverrideProps = {
  enabled?: boolean;
};

const ROOT_CLASS = "friemi-mobile-chrome-fullscreen";

export function MobileChromeFullscreenOverride({
  enabled = true,
}: MobileChromeFullscreenOverrideProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.documentElement.classList.add(ROOT_CLASS);

    return () => {
      document.documentElement.classList.remove(ROOT_CLASS);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <style>
      {`
        @media (max-width: 767px) {
          html.${ROOT_CLASS},
          html.${ROOT_CLASS} body,
          html.${ROOT_CLASS} .app-layout-shell,
          body:has(.werewolf-seat-mobile-fullscreen),
          body:has(.werewolf-seat-mobile-fullscreen) .app-layout-shell {
            width: 100%;
            min-width: 100%;
            min-height: 100svh;
            background: #17231E !important;
          }

          html.${ROOT_CLASS} body,
          body:has(.werewolf-seat-mobile-fullscreen) {
            overflow: hidden !important;
          }

          html.${ROOT_CLASS} .app-layout-shell,
          body:has(.werewolf-seat-mobile-fullscreen) .app-layout-shell {
            height: 100svh !important;
            padding-bottom: 0 !important;
            overflow: hidden !important;
          }

          html.${ROOT_CLASS} .app-layout-shell > header,
          html.${ROOT_CLASS} .app-layout-shell > nav,
          html.${ROOT_CLASS} [data-mobile-scroll-progress],
          body:has(.werewolf-seat-mobile-fullscreen) .app-layout-shell > header,
          body:has(.werewolf-seat-mobile-fullscreen) .app-layout-shell > nav,
          body:has(.werewolf-seat-mobile-fullscreen) [data-mobile-scroll-progress] {
            display: none !important;
          }

          html.${ROOT_CLASS} .werewolf-seat-mobile-fullscreen,
          body:has(.werewolf-seat-mobile-fullscreen) .werewolf-seat-mobile-fullscreen {
            position: fixed !important;
            inset: 0 !important;
            z-index: 60 !important;
            width: 100vw !important;
            max-width: none !important;
            height: 100svh !important;
            max-height: 100svh !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #17231E !important;
          }

          html.${ROOT_CLASS} .werewolf-in-game-seat-screen,
          body:has(.werewolf-seat-mobile-fullscreen) .werewolf-in-game-seat-screen {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100svh !important;
            min-height: 100svh !important;
            border-radius: 0 !important;
          }
        }
      `}
    </style>
  );
}
