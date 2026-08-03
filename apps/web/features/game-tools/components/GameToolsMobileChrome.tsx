"use client";

import { useEffect } from "react";

const ROOT_CLASS = "friemi-game-tools-route";

export function GameToolsMobileChrome() {
  useEffect(() => {
    document.documentElement.classList.add(ROOT_CLASS);

    return () => {
      document.documentElement.classList.remove(ROOT_CLASS);
    };
  }, []);

  return (
    <style>
      {`
        @media (max-width: 767px) {
          html.${ROOT_CLASS} .app-layout-shell {
            padding-bottom: 0 !important;
          }

          html.${ROOT_CLASS} .app-layout-shell > .app-mobile-nav,
          html.${ROOT_CLASS} [data-mobile-scroll-progress] {
            display: none !important;
          }
        }
      `}
    </style>
  );
}
