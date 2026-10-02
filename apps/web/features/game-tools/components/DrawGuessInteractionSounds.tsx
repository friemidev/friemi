"use client";

import { useEffect } from "react";
import { playDrawGuessSound, preloadDrawGuessSounds } from "@/features/game-tools/drawGuessSound";

function soundControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const control = target.closest<HTMLElement>("button, a, select, [role='button'], [role='tab'], [role='radio'], [role='checkbox']");
  if (!control || !control.closest(".draw-guess-theme") || control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return null;
  // These controls play a distinct pet or sample cue themselves.
  if (control.matches(".draw-guess-pet, .draw-guess-sound-card")) return null;
  return control;
}

/** Play on press, while keeping a click fallback for assistive and programmatic activation. */
export function DrawGuessInteractionSounds() {
  useEffect(() => {
    preloadDrawGuessSounds();
    let earlyCue: { control: HTMLElement; at: number } | null = null;
    const playEarly = (control: HTMLElement) => {
      earlyCue = { control, at: performance.now() };
      playDrawGuessSound("tap");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const control = soundControl(event.target);
      if (control) playEarly(control);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      const control = soundControl(event.target);
      if (control && (event.key !== " " || control.tagName !== "A")) playEarly(control);
    };
    const onClick = (event: MouseEvent) => {
      const control = soundControl(event.target);
      if (!control) return;
      const alreadyPlayed = earlyCue?.control === control && performance.now() - earlyCue.at < 10_000;
      earlyCue = null;
      if (alreadyPlayed) return;
      playDrawGuessSound("tap");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
