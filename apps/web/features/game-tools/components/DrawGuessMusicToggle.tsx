"use client";

import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { DRAW_GUESS_MUSIC_EVENT, isDrawGuessMusicEnabled, setDrawGuessMusicEnabled } from "@/features/game-tools/drawGuessSound";

export function DrawGuessMusicToggle({ locale }: { locale: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => setEnabled(isDrawGuessMusicEnabled());
    sync();
    window.addEventListener(DRAW_GUESS_MUSIC_EVENT, sync);
    return () => window.removeEventListener(DRAW_GUESS_MUSIC_EVENT, sync);
  }, []);
  const label = locale === "zh-CN" ? enabled ? "关闭背景音乐" : "开启背景音乐" : locale === "fr" ? enabled ? "Couper la musique" : "Activer la musique" : enabled ? "Turn off music" : "Turn on music";
  return <button type="button" aria-label={label} title={label} aria-pressed={enabled} onClick={() => setDrawGuessMusicEnabled(!isDrawGuessMusicEnabled())} className={`draw-guess-btn relative grid h-10 min-h-10 w-10 shrink-0 place-items-center p-0 ${enabled ? "draw-guess-btn--butter" : "draw-guess-btn--milk"}`}>
    <Music2 aria-hidden="true" className="h-4 w-4" />
    {!enabled ? <span aria-hidden="true" className="absolute h-0.5 w-5 -rotate-45 rounded-full bg-current" /> : null}
  </button>;
}
