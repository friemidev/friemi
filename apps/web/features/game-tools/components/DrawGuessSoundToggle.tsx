"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { DRAW_GUESS_SOUND_EVENT, isDrawGuessSoundEnabled, playDrawGuessSound, setDrawGuessSoundEnabled } from "@/features/game-tools/drawGuessSound";

export function DrawGuessSoundToggle({ locale }: { locale: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => setEnabled(isDrawGuessSoundEnabled());
    sync();
    window.addEventListener(DRAW_GUESS_SOUND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(DRAW_GUESS_SOUND_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const label = locale === "zh-CN" ? enabled ? "关闭音效" : "开启音效" : locale === "fr" ? enabled ? "Couper le son" : "Activer le son" : enabled ? "Mute sounds" : "Turn on sounds";
  return <button type="button" aria-label={label} title={label} aria-pressed={enabled} onClick={() => {
    const next = !isDrawGuessSoundEnabled();
    setDrawGuessSoundEnabled(next);
    if (next) playDrawGuessSound("ready");
  }} className={`draw-guess-btn grid h-10 min-h-10 w-10 shrink-0 place-items-center p-0 ${enabled ? "draw-guess-btn--butter" : "draw-guess-btn--milk"}`}>
    {enabled ? <Volume2 aria-hidden="true" className="h-4 w-4" /> : <VolumeX aria-hidden="true" className="h-4 w-4" />}
  </button>;
}
