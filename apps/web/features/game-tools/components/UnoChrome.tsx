"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, HelpCircle, Volume2, VolumeX, X } from "lucide-react";
import { getUnoCopy } from "../unoCopy";
import { getUnoExperienceCopy } from "../unoExperienceCopy";
import type { UnoReactionKind } from "../unoReactions";
import type { UnoEvent, UnoRuleSettings, UnoRulesetVersion } from "../unoTypes";
import { fallbackDrawGuessCatId, type DrawGuessCatId } from "../drawGuessCats";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { GameToolBrand } from "./GameToolBrand";
import s from "./UnoGame.module.css";

export function UnoDialog({ title, children, onClose, className = "", fallbackFocus }: { title: string; children: ReactNode; onClose?: () => void; className?: string; fallbackFocus?: () => HTMLElement | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = ref.current, trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    // Long rules and results must open at the heading, not scroll down to the
    // browser's first focusable control near the bottom of the content.
    titleRef.current?.focus({ preventScroll: true });
    if (node) node.scrollTop = 0;
    return () => {
      node?.close();
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        const target = trigger?.isConnected && trigger !== document.body && !trigger.matches(":disabled, [aria-disabled='true']") ? trigger : fallbackFocus?.();
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  return <dialog ref={ref} className={`${s.dialog} ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose?.(); }} onKeyDown={e => {
    if (e.key !== "Tab" || e.defaultPrevented) return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, summary, [tabindex]"))
      .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1), active = document.activeElement;
    if (!first) { e.preventDefault(); titleRef.current?.focus(); }
    else if (e.shiftKey && (active === first || !controls.includes(active as HTMLElement))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }} onClick={e => {
    if (e.target !== e.currentTarget || !onClose) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
  }}><div className={s.dialogBody}><h2 ref={titleRef} tabIndex={-1}>{title}</h2>{children}</div></dialog>;
}

export function UnoRules({ locale, onClose, rulesetVersion = 3, settings }: { locale: string; onClose: () => void; rulesetVersion?: UnoRulesetVersion; settings?: Partial<UnoRuleSettings> }) {
  const t = getUnoCopy(locale, rulesetVersion, settings), ux = getUnoExperienceCopy(locale, rulesetVersion, settings);
  return <UnoDialog title={t.rulesTitle} onClose={onClose}>
    <ol className={s.rulesList}>{[t.rule1, t.rule2, t.rule3, t.rule4, t.rule5, ux.modesRule].map((rule, i) => <li key={rule}><span>{i + 1}</span><p>{rule}</p></li>)}</ol>
    <details className={s.ruleDetails}><summary>{ux.examples}</summary><p>{ux.example1}</p><p>{ux.example2}</p></details>
    <details className={s.ruleDetails}><summary>{ux.ruling}</summary><p>{ux.order}</p><ul>{ux.timeouts.map(line => <li key={line}>{line}</li>)}</ul></details>
    <button type="button" className={`${s.button} ${s.primary}`} onClick={onClose}><X size={18} />{t.close}</button>
  </UnoDialog>;
}

export function UnoAvatar({ seat, catId, pose = "idle", animated = true, reaction }: { seat: number; catId?: DrawGuessCatId; pose?: "idle" | "ready" | "playing" | "uno" | "winner"; animated?: boolean; reaction?: UnoReactionKind }) {
  // Reactions use public actions only; hand size and report eligibility never affect the character.
  return <span className={s.characterSprite} data-uno-character={catId ?? fallbackDrawGuessCatId(`uno:${seat}`)}>
    <DrawGuessCatSprite catId={catId ?? fallbackDrawGuessCatId(`uno:${seat}`)} animated={animated}
      mood={reaction || pose === "ready" || pose === "uno" || pose === "winner" ? "happy" : "idle"}
      activity={!reaction && pose === "playing" ? "thinking" : "none"}
      performance={pose === "winner" ? "champion" : pose === "uno" ? "wave" : reaction === "applause" || pose === "ready" ? "clap" : "default"}
      size={pose === "winner" ? 120 : 80}/>
  </span>;
}

function useUnoSound(events: UnoEvent[]) {
  const [enabled, setEnabled] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const latest = useRef(events.at(-1)?.id ?? 0);
  const enabledRef = useRef(false);
  useEffect(() => () => { void ctx.current?.close(); }, []);
  useEffect(() => {
    const event = events.at(-1);
    if (!event || event.id === latest.current) return;
    latest.current = event.id;
    if (!enabledRef.current || !ctx.current || ctx.current.state !== "running") return;
    const audio = ctx.current;
    const notes = event.kind === "ROUND_WIN" ? [523, 659, 784] : event.kind === "UNO" ? [659, 880] : [event.kind === "DRAW" ? 280 : 420];
    notes.forEach((frequency, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + i * .09;
      osc.type = "sine"; osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.045, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + .14);
      osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at + .16);
    });
  }, [events]);
  async function toggle() {
    try {
      if (!enabled && typeof window.AudioContext !== "undefined") { ctx.current ??= new AudioContext(); await ctx.current.resume(); }
      enabledRef.current = !enabled; setEnabled(!enabled);
    } catch { enabledRef.current = false; setEnabled(false); }
  }
  return { enabled, toggle };
}

export function UnoHeader({ locale, code, round, events = [], onBack, rulesetVersion = 3, settings }: { locale: string; code?: string; round?: number; events?: UnoEvent[]; onBack?: () => void; rulesetVersion?: UnoRulesetVersion; settings?: Partial<UnoRuleSettings> }) {
  const t = getUnoCopy(locale), [rules, setRules] = useState(false), sound = useUnoSound(events);
  return <><header className={s.header}>
    {onBack ? <button type="button" className={s.iconButton} aria-label={t.leave} onClick={onBack}><ArrowLeft size={20}/></button> : <a className={s.iconButton} href={`/${locale}/game-tools`} aria-label={t.back}><ArrowLeft size={20}/></a>}
    <GameToolBrand game="UNO" href={`/${locale}/game-tools/uno`} />
    {code && <span className={s.roomCode}><span>{t.room} {code}</span>{round ? <b>{t.round} {round}{locale === "zh-CN" ? " 轮" : ""}</b> : null}</span>}
    <div className={s.headerTools}><button type="button" className={s.iconButton} aria-label={sound.enabled ? t.soundOn : t.soundOff} aria-pressed={sound.enabled} onClick={() => void sound.toggle()}>{sound.enabled ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button><button type="button" className={s.iconButton} aria-label={t.rules} onClick={() => setRules(true)}><HelpCircle size={20}/></button></div>
  </header>{rules && <UnoRules locale={locale} rulesetVersion={rulesetVersion} settings={settings} onClose={() => setRules(false)}/>}</>;
}
