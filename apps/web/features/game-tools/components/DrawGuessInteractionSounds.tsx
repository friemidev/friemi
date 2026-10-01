"use client";

import { useEffect } from "react";
import { playDrawGuessSound, preloadDrawGuessClicks } from "@/features/game-tools/drawGuessSound";

/** One quiet click cue for controls across the game, including dialog portals. */
export function DrawGuessInteractionSounds() {
  useEffect(() => {
    preloadDrawGuessClicks();
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>("button, a, select, [role='button'], [role='tab'], [role='radio'], [role='checkbox']");
      if (!control || !control.closest(".draw-guess-theme") || control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return;
      playDrawGuessSound("tap");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
