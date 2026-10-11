"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDrawGuessFullscreenController } from "@/features/game-tools/drawGuessFullscreen";

export function useDrawGuessFullscreen(disabled = false) {
  const [fullscreen, setFullscreen] = useState(false);
  const controllerRef = useRef<ReturnType<typeof createDrawGuessFullscreenController> | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (value: string) => Promise<void> }) | undefined;
    const controller = createDrawGuessFullscreenController({
      key: document,
      target: document.documentElement,
      getElement: () => document.fullscreenElement,
      request: document.documentElement.requestFullscreen
        ? () => document.documentElement.requestFullscreen() : undefined,
      exit: () => document.exitFullscreen(),
      lock: orientation?.lock ? () => orientation.lock!("landscape") : undefined,
      unlock: () => orientation?.unlock?.(),
      subscribe: (listener) => document.addEventListener("fullscreenchange", listener),
    }, setFullscreen);
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  const openFullscreen = useCallback(() => {
    if (!disabledRef.current) controllerRef.current?.open();
  }, []);
  const closeFullscreen = useCallback(() => controllerRef.current?.close(), []);

  useEffect(() => { if (disabled) closeFullscreen(); }, [disabled, closeFullscreen]);
  useEffect(() => {
    if (!fullscreen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeFullscreen(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [fullscreen, closeFullscreen]);

  return { fullscreen, openFullscreen, closeFullscreen };
}
