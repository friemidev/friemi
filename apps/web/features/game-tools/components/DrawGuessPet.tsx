"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { DrawGuessCatSprite, type DrawGuessCatPerformance } from "@/features/game-tools/components/DrawGuessCatSprite";
import { getDrawGuessCatName, type DrawGuessCatDirection, type DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";
import { playDrawGuessSound } from "@/features/game-tools/drawGuessSound";

type Trick = "boop" | "wave" | "secret" | "peek" | "stretch" | "party" | "purr" | "cheer" | "oops" | "snooze";
const PARTY_EVENT = "friemi:draw-guess-cat-party";
const TAP_TRICKS: Trick[] = ["boop", "wave", "secret", "peek", "stretch", "party"];

const CHARMS: Record<string, string> = {
  scholar: "✎", baker: "✿", explorer: "✦", cocoa: "♥", cloud: "☁",
  artist: "✶", captain: "★", dreamer: "☾", disco: "♫", sunny: "☀",
  calico: "♡", mocha: "♨", mango: "❀", peach: "♥", inventor: "⚙",
};

export function DrawGuessPet({ ambientSeed = 0, autoCelebrate = false, catId, className = "", direction = "S", idleSurprise = false, locale, mood = "idle", performance = "default", reactionKey, reactionKind, size, socialKey, bubbleSide = "top" }: {
  ambientSeed?: number;
  autoCelebrate?: boolean;
  catId?: string | null;
  className?: string;
  direction?: DrawGuessCatDirection;
  idleSurprise?: boolean;
  locale: string;
  mood?: DrawGuessCatMood;
  performance?: DrawGuessCatPerformance;
  reactionKey?: string | number;
  reactionKind?: "cheer" | "oops";
  size: number;
  socialKey?: string;
  bubbleSide?: "top" | "right" | "inside" | "compact";
}) {
  const [active, setActive] = useState<{ kind: Trick; id: number } | null>(null);
  const sequence = useRef(0);
  const taps = useRef(0);
  const lastTap = useRef(0);
  const lastLongPress = useRef(0);
  const clearTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const previousReaction = useRef(reactionKey);
  const figureRef = useRef<HTMLSpanElement>(null);
  const previousTrick = useRef<Trick | null>(null);

  const play = useCallback((kind: Trick) => {
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    setActive({ kind, id: ++sequence.current });
    clearTimer.current = window.setTimeout(() => setActive(null), kind === "cheer" || kind === "party" ? 1_650 : 1_350);
  }, []);

  useEffect(() => {
    const repeated = active !== null && previousTrick.current === active.kind;
    previousTrick.current = active?.kind ?? null;
    if (!repeated || !figureRef.current) return;
    // Replay the same trick without remounting the sprite or resetting its idle frame.
    figureRef.current.style.animation = "none";
    void figureRef.current.offsetWidth;
    figureRef.current.style.removeProperty("animation");
  }, [active]);

  useEffect(() => {
    if (reactionKey === undefined || previousReaction.current === reactionKey) return;
    previousReaction.current = reactionKey;
    if (reactionKind) play(reactionKind);
  }, [play, reactionKey, reactionKind]);

  useEffect(() => {
    if (autoCelebrate) play("cheer");
  }, [autoCelebrate, play]);

  useEffect(() => {
    if (!idleSurprise) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number;
    let cycle = 0;
    const schedule = () => {
      const delay = cycle === 0 ? 5_500 + ambientSeed * 1_900 : 16_000 + ((ambientSeed * 7 + cycle * 3) % 7) * 1_500;
      timer = window.setTimeout(() => {
        if (!document.hidden && !reducedMotion.matches && Date.now() - lastTap.current > 6_000) {
          play((["peek", "stretch", "snooze"] as const)[(ambientSeed + cycle) % 3]);
        }
        cycle++;
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [ambientSeed, idleSurprise, play]);

  useEffect(() => {
    if (!socialKey) return;
    let responseTimer: number | null = null;
    const respond = (event: Event) => {
      const source = (event as CustomEvent<{ source: string }>).detail?.source;
      if (source === socialKey || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (responseTimer !== null) window.clearTimeout(responseTimer);
      responseTimer = window.setTimeout(() => play("wave"), 170 + ambientSeed * 135);
    };
    window.addEventListener(PARTY_EVENT, respond);
    return () => { window.removeEventListener(PARTY_EVENT, respond); if (responseTimer !== null) window.clearTimeout(responseTimer); };
  }, [ambientSeed, play, socialKey]);

  useEffect(() => () => { if (clearTimer.current !== null) window.clearTimeout(clearTimer.current); if (pressTimer.current !== null) window.clearTimeout(pressTimer.current); }, []);

  const cancelLongPress = () => { if (pressTimer.current !== null) window.clearTimeout(pressTimer.current); pressTimer.current = null; };

  const label = locale === "zh-CN" ? "点一下" : locale === "fr" ? "Touchez le chat" : "Tap the cat";
  const bubble = bubbleSide === "compact" ? active?.kind === "secret" ? CHARMS[catId ?? ""] ?? "✦" : active?.kind === "oops" ? "…" : active?.kind === "snooze" ? "zZ" : active?.kind === "purr" ? "♡" : "✦"
    : active?.kind === "boop" ? locale === "zh-CN" ? "喵！" : locale === "fr" ? "Miaou !" : "Meow!"
    : active?.kind === "secret" ? CHARMS[catId ?? ""] ?? "✦"
      : active?.kind === "wave" ? "♡" : active?.kind === "peek" ? "?" : active?.kind === "stretch" ? "～" : active?.kind === "party" ? "✦ ✦" : active?.kind === "purr" ? locale === "zh-CN" ? "呼噜～" : "Prrr…" : active?.kind === "cheer" ? "✦ ✦" : active?.kind === "oops" ? "…" : "zZ";
  const visibleMood = active?.kind === "oops" ? "sad" : mood !== "idle" ? mood : active?.kind === "cheer" || active?.kind === "secret" || active?.kind === "boop" || active?.kind === "party" ? "happy" : mood;
  const visiblePerformance = active?.kind === "wave" ? "wave" : active?.kind === "party" ? "champion" : performance;

  return <button type="button" aria-label={`${getDrawGuessCatName(catId, locale)} · ${label}`} title={label} onPointerDown={(event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    cancelLongPress();
    pressTimer.current = window.setTimeout(() => { lastLongPress.current = Date.now(); lastTap.current = Date.now(); taps.current = 0; play("purr"); playDrawGuessSound("purr"); }, 650);
  }} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onContextMenu={(event) => event.preventDefault()} onClick={() => {
    if (Date.now() - lastLongPress.current < 850) return;
    const now = Date.now();
    taps.current = now - lastTap.current <= 4_000 ? taps.current + 1 : 1;
    lastTap.current = now;
    const trick = TAP_TRICKS[(taps.current - 1) % TAP_TRICKS.length];
    play(trick);
    playDrawGuessSound(trick === "secret" || trick === "party" ? "secret" : "cat");
    if (trick === "party" && socialKey) window.dispatchEvent(new CustomEvent(PARTY_EVENT, { detail: { source: socialKey } }));
  }} className={`draw-guess-pet relative inline-grid shrink-0 place-items-center rounded-full align-middle outline-none focus-visible:ring-2 focus-visible:ring-[#3E70AA] ${className}`} style={{ width: size, height: size, "--pet-idle-duration": `${3.4 + ambientSeed * .31}s`, "--pet-idle-delay": `${-ambientSeed * .62}s` } as CSSProperties} data-pet-trick={active?.kind ?? "idle"}>
    <span ref={figureRef} className={`draw-guess-pet-figure ${active ? `draw-guess-pet-figure--${active.kind}` : idleSurprise ? "draw-guess-pet-figure--ambient" : ""}`}><DrawGuessCatSprite animated catId={catId} direction={direction} mood={visibleMood} performance={visiblePerformance} size={size} /></span>
    {active ? <span key={`bubble-${active.id}`} aria-hidden="true" className={`draw-guess-pet-bubble draw-guess-pet-bubble--${bubbleSide} ${active.kind === "secret" || active.kind === "party" ? "draw-guess-pet-bubble--secret" : ""}`}>{bubble}</span> : null}
    {active && (active.kind === "cheer" || active.kind === "secret" || active.kind === "party") ? <span key={`sparks-${active.id}`} aria-hidden="true" className="draw-guess-pet-sparks"><i>✦</i><i>✧</i><i>✦</i></span> : null}
  </button>;
}
