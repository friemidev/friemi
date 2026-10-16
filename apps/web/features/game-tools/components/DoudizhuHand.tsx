"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Check } from "lucide-react";
import type { DdzCard } from "../doudizhuTypes";
import { DoudizhuCardFace, doudizhuCardLabel } from "./DoudizhuCard";
import s from "./DoudizhuHand.module.css";

type Gesture = {
  pointerId: number;
  startIndex: number;
  startX: number;
  startY: number;
  base: string[];
  select: boolean;
  dragging: boolean;
  lastIndex: number;
};
type Props = {
  cards: DdzCard[];
  selected: string[];
  locale: string;
  label: string;
  disabled?: boolean;
  layout?: "fan" | "grid";
  onSelectionChange: (ids: string[]) => void;
};

/** Full-hand presentation. A drag selects a contiguous range; it never submits a play. */
export function DoudizhuHand({
  cards,
  selected,
  locale,
  label,
  disabled = false,
  layout = "fan",
  onSelectionChange,
}: Props) {
  const root = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null);
  const [width, setWidth] = useState(600),
    [cardWidth, setCardWidth] = useState(72);
  const cardsKey = cards.map((card) => card.id).join(",");
  const latest = useRef({ cards, selected, onSelectionChange });
  latest.current = { cards, selected, onSelectionChange };
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || layout === "grid") return;
    const measure = () => {
      setWidth(node.clientWidth);
      setCardWidth(
        window.matchMedia("(max-height: 500px) and (orientation: landscape)")
          .matches
          ? 72
          : Math.max(96, Math.min(128, window.innerHeight * 0.14)),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [layout]);
  useEffect(() => {
    gesture.current = null;
  }, [cardsKey, disabled, layout]);
  const pitch =
    cards.length > 1
      ? Math.max(
          1,
          Math.min(cardWidth * 0.55, (width - cardWidth) / (cards.length - 1)),
        )
      : 0;
  const spreadWidth = cards.length ? cardWidth + (cards.length - 1) * pitch : 0;
  const origin = Math.max(0, (width - spreadWidth) / 2);
  function cue() {
    window.dispatchEvent(new Event("friemi:doudizhu:select"));
  }
  function toggle(id: string) {
    if (disabled) return;
    onSelectionChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
    cue();
  }
  function indexAt(clientX: number) {
    const node = root.current;
    if (!node || !cards.length) return 0;
    return Math.min(
      cards.length - 1,
      Math.max(
        0,
        Math.floor(
          (clientX - node.getBoundingClientRect().left - origin) /
            Math.max(1, pitch),
        ),
      ),
    );
  }
  function range(current: Gesture, end: number) {
    const values = new Set(current.base);
    for (
      let index = Math.min(current.startIndex, end);
      index <= Math.max(current.startIndex, end);
      index++
    ) {
      const id = cards[index]?.id;
      if (id) {
        if (current.select) values.add(id);
        else values.delete(id);
      }
    }
    onSelectionChange([...values]);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (layout !== "fan" || disabled || !event.isPrimary || event.button !== 0)
      return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-ddz-card-id]",
    );
    if (!button || !root.current?.contains(button)) return;
    const startIndex = Number(button.dataset.ddzHandIndex);
    gesture.current = {
      pointerId: event.pointerId,
      startIndex,
      startX: event.clientX,
      startY: event.clientY,
      base: [...selected],
      select: !selected.includes(cards[startIndex].id),
      dragging: false,
      lastIndex: startIndex,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "mouse") button.focus({ preventScroll: true });
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = Math.abs(event.clientX - current.startX),
      dy = Math.abs(event.clientY - current.startY);
    if (!current.dragging && dy > 14 && dy > dx) {
      gesture.current = null;
      return;
    }
    if (!current.dragging && (dx < 7 || dx < dy)) return;
    current.dragging = true;
    const index = indexAt(event.clientX);
    if (index !== current.lastIndex) {
      current.lastIndex = index;
      range(current, index);
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.dragging) {
      range(current, indexAt(event.clientX));
      cue();
    } else toggle(cards[current.startIndex].id);
  }
  function pointerCancel(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (current.dragging) {
      const owned = new Set(latest.current.cards.map((card) => card.id));
      latest.current.onSelectionChange(
        current.base.filter((id) => owned.has(id)),
      );
    }
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? cards.length - 1
          : Math.max(
              0,
              Math.min(
                cards.length - 1,
                index + (event.key === "ArrowRight" ? 1 : -1),
              ),
            );
    root.current
      ?.querySelector<HTMLButtonElement>(
        `button[data-ddz-hand-index="${next}"]`,
      )
      ?.focus({ preventScroll: true });
  }
  return (
    <div
      ref={root}
      className={layout === "grid" ? s.grid : s.hand}
      aria-label={label}
      data-ddz-motion-anchor={layout === "fan" ? "hand" : undefined}
      data-ddz-hand-layout={layout}
      style={
        {
          "--ddz-hand-card-width": `${cardWidth}px`,
          "--ddz-hand-card-height": `${(cardWidth * 104) / 72}px`,
        } as CSSProperties
      }
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
    >
      {cards.map((card, index) => (
        <button
          key={card.id}
          type="button"
          className={s.card}
          data-ddz-card-id={card.id}
          data-ddz-hand-index={index}
          style={
            layout === "fan"
              ? { left: origin + index * pitch, zIndex: index + 1 }
              : undefined
          }
          aria-label={doudizhuCardLabel(card, locale)}
          aria-pressed={selected.includes(card.id)}
          disabled={disabled}
          onClick={(event) => {
            if (layout === "grid" || event.detail === 0) toggle(card.id);
          }}
          onKeyDown={(event) => keyDown(event, index)}
        >
          <DoudizhuCardFace card={card} />
          {selected.includes(card.id) && (
            <span className={s.selectedMark} aria-hidden="true">
              <Check size={12} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
