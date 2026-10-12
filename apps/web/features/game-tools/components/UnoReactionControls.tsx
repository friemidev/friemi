"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Smile } from "lucide-react";
import { UNO_REACTION_COOLDOWN_MS, UNO_REACTION_KINDS, type UnoReaction, type UnoReactionKind } from "../unoReactions";
import s from "./UnoReactionControls.module.css";

const EMOJI: Record<UnoReactionKind, string> = { laugh: "😂", applause: "👏", surprise: "😮" };
const COPY = {
  "zh-CN": { open: "表情", wait: "表情冷却中", failed: "发送失败，请重试。", laugh: "笑哭", applause: "鼓掌", surprise: "吃惊" },
  en: { open: "Reactions", wait: "Reaction cooldown", failed: "Could not send. Try again.", laugh: "Laugh", applause: "Applause", surprise: "Surprise" },
  fr: { open: "Réactions", wait: "Attendez avant de réagir", failed: "Envoi impossible. Réessayez.", laugh: "Rire", applause: "Bravo", surprise: "Surprise" },
};

function copy(locale: string) { return locale === "zh-CN" ? COPY["zh-CN"] : locale === "fr" ? COPY.fr : COPY.en; }
export function unoReactionLabel(kind: UnoReactionKind, locale: string) { return copy(locale)[kind]; }

export function UnoReactionControls({ locale, busy = false, disabled = false, onReact }: { locale: string; busy?: boolean; disabled?: boolean; onReact: (kind: UnoReactionKind) => Promise<boolean> }) {
  const t = copy(locale);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const sending = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const unavailable = busy || disabled || pending;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (cooldownTimer.current) clearTimeout(cooldownTimer.current); };
  }, []);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>("[data-reaction-choice]")?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); setOpen(false); trigger.current?.focus();
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape); };
  }, [open]);

  function toggle() {
    if (unavailable || coolingDown) return;
    const bounds = root.current?.getBoundingClientRect();
    if (bounds) {
      const width = Math.min(232, window.innerWidth - 24);
      setLeft(Math.min(0, window.innerWidth - 12 - bounds.left - width));
    }
    setError(""); setOpen(previous => !previous);
  }

  async function send(kind: UnoReactionKind) {
    if (unavailable || coolingDown || sending.current) return;
    sending.current = true; setPending(true); setError("");
    try {
      const accepted = await onReact(kind);
      if (!mounted.current) return;
      if (!accepted) { setError(t.failed); return; }
      setOpen(false); setCoolingDown(true);
      cooldownTimer.current = setTimeout(() => { if (mounted.current) setCoolingDown(false); }, UNO_REACTION_COOLDOWN_MS);
      trigger.current?.focus();
    } catch { if (mounted.current) setError(t.failed); }
    finally { sending.current = false; if (mounted.current) setPending(false); }
  }

  return <div ref={root} className={s.control} style={{ "--reaction-left": `${left}px` } as CSSProperties}>
    <button ref={trigger} type="button" className={s.trigger} disabled={busy || disabled} aria-disabled={coolingDown || pending || undefined} aria-label={coolingDown ? t.wait : t.open} title={coolingDown ? t.wait : t.open} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}><Smile size={21} strokeWidth={1.8}/></button>
    {open && <div id={id} className={s.picker} role="menu" aria-label={t.open}>
      <div className={s.choices}>
        {UNO_REACTION_KINDS.map((kind, index) => <button key={kind} type="button" role="menuitem" data-reaction-choice={kind} disabled={unavailable} className={s.choice} onClick={() => void send(kind)} onKeyDown={event => {
          if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? 2 : 1)) % 3;
          root.current?.querySelectorAll<HTMLButtonElement>("[data-reaction-choice]")[next]?.focus();
        }}><span className={s.emoji} aria-hidden="true">{EMOJI[kind]}</span><span>{t[kind]}</span></button>)}
      </div>
      {error && <p className={s.error} role="status">{error}</p>}
    </div>}
  </div>;
}

/** Expiry and priority against an active UNO declaration belong to the parent. */
export function UnoReactionBubble({ reaction, locale }: { reaction: UnoReaction; locale: string }) {
  return <span key={reaction.id} className={s.bubble} data-uno-reaction={reaction.kind} role="img" aria-label={unoReactionLabel(reaction.kind, locale)}><span className={s.bubbleEmoji} aria-hidden="true">{EMOJI[reaction.kind]}</span></span>;
}
