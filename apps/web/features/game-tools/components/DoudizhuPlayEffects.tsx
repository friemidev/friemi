"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { doudizhuPatternName } from "../doudizhuCopy";
import {
  canShowDdzPlayEffect,
  consumeDdzPlayEffect,
  ddzPlayEffectRemaining,
  resumeDdzPlayEffectCursor,
  type DdzPlayEffect,
  type DdzPlayEffectCursor,
  type DdzPlayEffectKind,
} from "../doudizhuPlayEffects";
import type { DdzViewerState } from "../doudizhuTypes";
import s from "./DoudizhuPlayEffects.module.css";

type Props = {
  state: DdzViewerState;
  serverNow: number;
  roomKey: string;
  locale: string;
  /** Local preview has synchronous actions and no background polling. */
  freezeClock?: boolean;
};
type Presentation = {
  effect: DdzPlayEffect;
  startedAt: number;
  root: HTMLElement;
  anchor: HTMLElement;
  x: number;
  y: number;
  safeHeight: number;
  result: boolean;
};

function Paw({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size})`}
      fill="currentColor"
      stroke="none"
    >
      <ellipse cy="3" rx="4.5" ry="3.5" />
      <ellipse cx="-5" cy="-2" rx="2" ry="2.8" transform="rotate(-25 -5 -2)" />
      <ellipse cx="0" cy="-5" rx="2" ry="2.8" />
      <ellipse cx="5" cy="-2" rx="2" ry="2.8" transform="rotate(25 5 -2)" />
    </g>
  );
}
function Spark({
  x,
  y,
  index,
  large = false,
}: {
  x: number;
  y: number;
  index: number;
  large?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className={s.spark}
        style={{ "--i": index } as CSSProperties}
        d={
          large
            ? "M0-9 2-2 9 0 2 2 0 9-2 2-9 0-2-2Z"
            : "M0-5 1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4Z"
        }
      />
    </g>
  );
}
function PaperCard({
  x,
  y,
  index,
  paired = false,
}: {
  x: number;
  y: number;
  index: number;
  paired?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={s.flowCard} style={{ "--i": index } as CSSProperties}>
        <rect
          className={s.cardShadow}
          x="-14"
          y="-17"
          width="28"
          height="38"
          rx="5"
        />
        <rect
          className={s.paperCard}
          x="-14"
          y="-20"
          width="28"
          height="38"
          rx="5"
        />
        <Paw x={0} y={-1} size={paired ? 0.7 : 0.85} />
        <path className={s.cardShine} d="M-9-13h5M8 10h-5" />
      </g>
    </g>
  );
}
function Rocket({ x, y, index }: { x: number; y: number; index: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={s.rocket} style={{ "--i": index } as CSSProperties}>
        <path className={s.flame} d="M-8 26Q-10 40 0 51Q10 40 8 26Z" />
        <path className={s.rocketFin} d="M-11 9-21 25-11 22M11 9 21 25 11 22" />
        <path
          className={index === 0 ? s.rocketBody : s.rocketGold}
          d="M-11 24V-10L-9-24-3-17 0-22 3-17 9-24 11-10V24Q0 29-11 24Z"
        />
        <path className={s.crown} d="M-9-29-10-36-3-32 0-39 3-32 10-36 9-29Z" />
        <circle className={s.catEye} cx="-4" cy="-6" r="1.3" />
        <circle className={s.catEye} cx="4" cy="-6" r="1.3" />
        <path className={s.catFace} d="M-2-1 0 1 2-1M0 1v3M-7 2h-5M7 2h5" />
        <Paw x={0} y={15} size={0.65} />
      </g>
    </g>
  );
}

/** All artwork is decorative, rank-free and derived only from public play type. */
function Artwork({ kind }: { kind: DdzPlayEffectKind }) {
  return (
    <svg className={s.art} viewBox="0 0 320 136" fill="none" aria-hidden="true">
      {kind === "straight" && (
        <>
          <path className={s.rail} d="M34 81Q157 119 286 48" pathLength="1" />
          <path
            className={s.railLight}
            d="M34 81Q157 119 286 48"
            pathLength="1"
          />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <PaperCard key={i} x={53 + i * 35} y={78 - i * 4} index={i} />
          ))}
          <Spark x={38} y={48} index={0} />
          <Spark x={285} y={29} index={3} large />
          <Spark x={234} y={98} index={5} />
        </>
      )}
      {kind === "pairs" && (
        <>
          <path className={s.rail} d="M63 42H257M63 94H257" pathLength="1" />
          <path
            className={s.railLight}
            d="M63 42H257M63 94H257"
            pathLength="1"
          />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path
                className={s.pairLink}
                style={{ "--i": i } as CSSProperties}
                d={`M${70 + i * 60} 54v27`}
              />
              <PaperCard x={70 + i * 60} y={41} index={i} paired />
              <PaperCard x={70 + i * 60} y={94} index={i} paired />
            </g>
          ))}
          <Spark x={40} y={69} index={0} large />
          <Spark x={278} y={68} index={3} large />
        </>
      )}
      {kind === "airplane" && (
        <>
          <g className={s.airflow}>
            <path d="M20 89C65 90 82 54 124 59S181 76 205 56" pathLength="1" />
            <path
              d="M35 105C81 106 94 72 134 77S185 92 219 75"
              pathLength="1"
            />
            <path
              d="M58 117C93 119 106 92 143 97S184 104 205 93"
              pathLength="1"
            />
          </g>
          <g className={s.plane}>
            <path
              className={s.planeShadow}
              d="m113 72 147-36-56 79-21-36-34 13Z"
            />
            <path
              className={s.planePaper}
              d="m106 65 147-36-56 79-21-36-34 13Z"
            />
            <path
              className={s.planeFold}
              d="m106 65 70 7 77-43-56 79-21-36-34 13 8-16"
            />
            <path
              className={s.planeEar}
              d="m172 48 1-16 15 11M197 40l5-14 10 10"
            />
            <Paw x={205} y={59} size={1.1} />
          </g>
          <Spark x={55} y={59} index={0} />
          <Spark x={273} y={67} index={3} large />
        </>
      )}
      {kind === "bomb" && (
        <>
          <g className={s.burstRing}>
            <ellipse cx="160" cy="78" rx="66" ry="38" />
            <ellipse cx="160" cy="78" rx="84" ry="49" />
          </g>
          <g className={s.bomb}>
            <path className={s.fuse} d="M166 46q-1-26 18-24q13 2 5 13" />
            <path className={s.bombNeck} d="m150 43 20-1 2 13-23 1Z" />
            <circle className={s.bombBody} cx="160" cy="80" r="33" />
            <path className={s.bombHighlight} d="M139 75q3-15 17-17" />
            <Paw x={163} y={84} size={2} />
          </g>
          <Spark x={189} y={34} index={0} large />
          <Spark x={78} y={60} index={2} large />
          <Spark x={243} y={80} index={3} large />
          <Spark x={119} y={120} index={4} />
        </>
      )}
      {kind === "rocket" && (
        <>
          <path
            className={s.rocketTrail}
            d="M101 130q-17-39 20-63M219 130q17-39-20-63"
            pathLength="1"
          />
          <g className={s.royalBurst}>
            <path d="m160 20 9 20 22-5-8 21 16 16-23 3-6 23-14-18-23 4 8-22-16-17 24-2Z" />
            <circle cx="160" cy="60" r="48" />
          </g>
          <Rocket x={128} y={66} index={0} />
          <Rocket x={192} y={66} index={1} />
          <Spark x={81} y={49} index={2} large />
          <Spark x={241} y={43} index={3} large />
          <Spark x={83} y={103} index={4} />
          <Spark x={238} y={111} index={5} />
        </>
      )}
    </svg>
  );
}

/** Keep mounted beside the Table phase switch, including PLAY → RESULT. */
export function DoudizhuPlayEffects({
  state,
  serverNow,
  roomKey,
  locale,
  freezeClock = false,
}: Props) {
  const marker = useRef<HTMLSpanElement>(null);
  const cursor = useRef<DdzPlayEffectCursor | null>(null);
  const reduced = useRef(false);
  const active = useRef<Presentation | null>(null);
  const current = useRef({ state, serverNow, roomKey, freezeClock });
  current.current = { state, serverNow, roomKey, freezeClock };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    active.current?.anchor.removeAttribute("data-ddz-effect-active");
    active.current = null;
    setPresentation(null);
  }
  function area() {
    return (
      marker.current?.parentElement?.querySelector<HTMLElement>(
        "[data-ddz-effects-area]",
      ) ?? null
    );
  }
  function isVisible(anchor: HTMLElement | null): anchor is HTMLElement {
    if (!anchor || anchor.closest("[hidden], [inert]")) return false;
    const rect = anchor.getBoundingClientRect(),
      style = getComputedStyle(anchor);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }
  function locate(
    effect: DdzPlayEffect,
    startedAt: number,
    anchor: HTMLElement,
  ): Presentation {
    const rect = anchor.getBoundingClientRect(),
      result = anchor.dataset.ddzEffectsArea === "result";
    const compact =
      window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
    const meta = anchor
      .querySelector('[data-ddz-motion-anchor="deck"]')
      ?.parentElement?.getBoundingClientRect();
    const safeTop =
      !result && compact
        ? Math.max(rect.y, meta ? meta.bottom + 3 : rect.y + 32)
        : rect.y;
    const safeBottom = !result && compact ? rect.bottom - 3 : rect.bottom;
    return {
      effect,
      startedAt,
      root: marker.current!.parentElement!,
      anchor,
      x: rect.x + rect.width / 2,
      y:
        !result && compact
          ? (safeTop + safeBottom) / 2
          : rect.y + rect.height * (result ? 0.5 : 0.48),
      safeHeight: Math.max(1, safeBottom - safeTop),
      result,
    };
  }

  useLayoutEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;
    const cancel = () => clear();
    const reconnect = () => {
      const latest = current.current;
      cursor.current = resumeDdzPlayEffectCursor(
        latest.state,
        latest.roomKey,
        performance.now(),
        latest.freezeClock,
      );
      clear();
    };
    let surfaceVisible = isVisible(area());
    const check = () => {
      const nextVisible = isVisible(area());
      if (
        document.hidden ||
        reduced.current ||
        !nextVisible ||
        nextVisible !== surfaceVisible
      )
        reconnect();
      surfaceVisible = nextVisible;
    };
    const preference = () => {
      reduced.current = media.matches;
      reconnect();
    };
    document.addEventListener("visibilitychange", reconnect);
    document.addEventListener("fullscreenchange", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("orientationchange", reconnect);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    window.addEventListener("scroll", cancel, true);
    media.addEventListener("change", preference);
    const observer = new MutationObserver(check);
    const root = marker.current?.parentElement;
    if (root)
      observer.observe(root, {
        attributes: true,
        subtree: true,
        attributeFilter: ["inert", "hidden", "style", "class"],
      });
    // The landscape gate sets inert on the ancestor containing this marker.
    for (let node = root?.parentElement; node; node = node.parentElement)
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["inert", "hidden", "style", "class"],
      });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      active.current?.anchor.removeAttribute("data-ddz-effect-active");
      active.current = null;
      observer.disconnect();
      document.removeEventListener("visibilitychange", reconnect);
      document.removeEventListener("fullscreenchange", cancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("orientationchange", reconnect);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
      window.removeEventListener("scroll", cancel, true);
      media.removeEventListener("change", preference);
    };
  }, []);

  useLayoutEffect(() => {
    const anchor = area(),
      visible = isVisible(anchor),
      observedAt = performance.now();
    const projection = consumeDdzPlayEffect(
      cursor.current,
      state,
      roomKey,
      serverNow,
      observedAt,
      { visible, hidden: document.hidden, reduced: reduced.current },
    );
    cursor.current = projection.cursor;
    if (projection.clear) clear();
    if (projection.effect && visible) {
      const next = locate(projection.effect, observedAt, anchor);
      if (next.result) anchor.setAttribute("data-ddz-effect-active", "true");
      active.current = next;
      setPresentation(next);
    } else if (
      active.current &&
      visible &&
      active.current.result !== (state.phase === "RESULT")
    ) {
      active.current.anchor.removeAttribute("data-ddz-effect-active");
      const next = locate(
        active.current.effect,
        active.current.startedAt,
        anchor,
      );
      if (next.result) anchor.setAttribute("data-ddz-effect-active", "true");
      active.current = next;
      setPresentation(next);
    }
  }, [state, serverNow, roomKey]);

  useLayoutEffect(() => {
    if (!presentation) return;
    const remaining = ddzPlayEffectRemaining(
      presentation.effect.duration,
      presentation.startedAt,
      performance.now(),
    );
    if (
      remaining <= 0 ||
      !canShowDdzPlayEffect(current.current.state.phase, {
        visible: isVisible(presentation.anchor),
        hidden: document.hidden,
        reduced: reduced.current,
      })
    ) {
      clear();
      return;
    }
    timer.current = setTimeout(clear, remaining);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [presentation]);

  const name =
    presentation &&
    (presentation.effect.kind === "rocket" && locale === "zh-CN"
      ? "王炸"
      : doudizhuPatternName(presentation.effect.pattern, locale));
  return (
    <>
      <span hidden ref={marker} />
      {presentation &&
        createPortal(
          <div
            key={`${roomKey}:${presentation.effect.gameNo}:${presentation.effect.eventId}`}
            className={`${s.stage} ${presentation.result ? s.result : ""}`}
            aria-hidden="true"
            data-ddz-play-effect={presentation.effect.kind}
            data-ddz-effect-event={presentation.effect.eventId}
            style={
              {
                left: presentation.x,
                top: presentation.y,
                "--effect-duration": `${presentation.effect.duration}ms`,
                "--effect-safe-height": `${presentation.safeHeight}px`,
              } as CSSProperties
            }
          >
            <div className={s.frame}>
              <Artwork kind={presentation.effect.kind} />
              <span className={s.label}>{name}</span>
            </div>
          </div>,
          presentation.root,
        )}
    </>
  );
}
