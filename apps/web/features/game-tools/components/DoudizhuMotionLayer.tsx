"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { getDdzCard } from "../doudizhuCards";
import {
  canRunDdzMotion,
  ddzMotionTick,
  stopDdzTableMotion,
  freshDdzMotionEvent,
  planDdzMotion,
  type DdzMotionAnchor,
  type DdzMotionGeometry,
  type DdzMotionPlan,
  type DdzMotionPoint,
  type DdzMotionRect,
} from "../doudizhuMotion";
import type { DdzTargetPlay, DdzViewerState } from "../doudizhuTypes";
import { DoudizhuCardFace } from "./DoudizhuCard";
import s from "./DoudizhuMotionLayer.module.css";

type Props = {
  state: DdzViewerState;
  serverNow: number;
  roomKey: string;
  rootRef?: RefObject<HTMLElement | null>;
  /** Explicit local demo only. Production initial snapshots never replay. */
  demoInitialDeal?: boolean;
};
type Batch = {
  generation: number;
  plan: DdzMotionPlan;
  anchorRoot: HTMLElement;
  createdAt: number;
};
const anchors: DdzMotionAnchor[] = ["deck", "hand", "left", "right", "target"];
const rect = (node: Element): DdzMotionRect => {
  const r = node.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
};
const visible = (r: DdzMotionRect) => r.width > 0 && r.height > 0;

/**
 * Mount beside the lobby/table switch, so a real START is a new event while a
 * refresh is just an initial snapshot. Its portal follows native fullscreen.
 * The rules state and actions never wait for any of these visual animations.
 */
export function DoudizhuMotionLayer({
  state,
  serverNow,
  roomKey,
  rootRef,
  demoInitialDeal = false,
}: Props) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const current = useRef({ state, serverNow, roomKey });
  current.current = { state, serverNow, roomKey };
  const cursor = useRef<{ key: string; seq: number } | null>(null);
  const generation = useRef(0);
  const animations = useRef(new Set<Animation>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const pendingFrames = useRef(new Set<number>());
  const handPositions = useRef(new Map<string, DdzMotionRect>());
  const targetCardPositions = useRef(new Map<string, DdzMotionRect>());
  const anchorPositions = useRef<
    Partial<Record<DdzMotionAnchor, DdzMotionRect>>
  >({});
  const previousTarget = useRef<DdzTargetPlay | null>(null);
  const reduced = useRef(false);
  const mounted = useRef(false);
  const demoPlayed = useRef<string | null>(null);

  function anchorRoot() {
    return rootRef?.current ?? marker.current?.parentElement ?? null;
  }
  function tableVisible(root: HTMLElement) {
    const anchor =
      root.querySelector<HTMLElement>('[data-ddz-motion-anchor="hand"]') ??
      root.querySelector<HTMLElement>('[data-ddz-motion-anchor="deck"]');
    if (!anchor || anchor.closest("[inert], [hidden]")) return false;
    const style = getComputedStyle(anchor);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      visible(rect(anchor))
    );
  }
  function cancel() {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    pendingFrames.current.forEach(cancelAnimationFrame);
    pendingFrames.current.clear();
    animations.current.forEach((animation) => animation.cancel());
    animations.current.clear();
    nodes.current.forEach((node) => {
      if (node) node.style.opacity = "0";
    });
  }
  function targetCards(root: HTMLElement) {
    const cards = new Map<string, DdzMotionRect>();
    root
      .querySelectorAll<HTMLElement>(
        '[data-ddz-motion-anchor="target"] [data-ddz-play-card-id]',
      )
      .forEach((node) => {
        const id = node.dataset.ddzPlayCardId,
          r = rect(node);
        if (id && visible(r)) cards.set(id, r);
      });
    return cards;
  }
  function cacheGeometry(root: HTMLElement) {
    targetCardPositions.current = targetCards(root);
    for (const name of anchors) {
      const node = root.querySelector(`[data-ddz-motion-anchor="${name}"]`);
      if (node) {
        const r = rect(node);
        if (visible(r)) anchorPositions.current[name] = r;
      }
    }
    root
      .querySelectorAll<HTMLElement>(
        '[data-ddz-motion-anchor="hand"] [data-ddz-card-id]',
      )
      .forEach((node) => {
        const id = node.dataset.ddzCardId,
          r = rect(node);
        if (id && visible(r)) handPositions.current.set(id, r);
      });
  }
  function geometry(root: HTMLElement): DdzMotionGeometry {
    const positions = { ...anchorPositions.current };
    for (const name of anchors) {
      const node = root.querySelector(`[data-ddz-motion-anchor="${name}"]`);
      if (node) {
        const r = rect(node);
        if (visible(r)) positions[name] = r;
      }
    }
    const hand = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-ddz-motion-anchor="hand"] [data-ddz-card-id]',
      ),
    )
      .map((node) => ({ cardId: node.dataset.ddzCardId!, rect: rect(node) }))
      .filter((item) => item.cardId && visible(item.rect));
    return {
      anchors: positions,
      hand,
      previousHand: handPositions.current,
      previousTargetRect: anchorPositions.current.target,
      targetCards: targetCards(root),
      previousTargetCards: targetCardPositions.current,
      viewportWidth: window.innerWidth,
    };
  }

  useLayoutEffect(() => {
    const root = anchorRoot(),
      key = `${roomKey}:${state.selfSeat}`;
    const initial = cursor.current?.key !== key;
    let after = cursor.current?.seq ?? state.eventSeq;
    if (initial) {
      cancel();
      handPositions.current.clear();
      targetCardPositions.current.clear();
      anchorPositions.current = {};
      previousTarget.current = null;
      after = state.eventSeq;
    }
    // Consume the cursor even when hidden, reduced, stale or lacking anchors.
    cursor.current = {
      key,
      seq: Math.max(initial ? 0 : after, state.eventSeq),
    };
    if (
      !root ||
      stopDdzTableMotion(state.phase, tableVisible(root)) ||
      document.hidden ||
      reduced.current
    ) {
      cancel();
      setBatch(null);
      previousTarget.current = null;
      return;
    }
    const event = freshDdzMotionEvent(state, after, serverNow);
    if (event?.kind === "DEAL") {
      // A newly mounted fan measures its width in its own layout effect. Wait
      // one frame for that synchronous layout update before freezing landings.
      cancel();
      setBatch(null);
      const ownGeneration = generation.current,
        observedAt = performance.now();
      const frame = requestAnimationFrame(() => {
        pendingFrames.current.delete(frame);
        const latest = current.current,
          currentRoot = anchorRoot();
        if (
          !mounted.current ||
          !currentRoot ||
          !canRunDdzMotion(ownGeneration, generation.current, {
            visible: tableVisible(currentRoot),
            hidden: document.hidden,
            reduced: reduced.current,
          })
        )
          return;
        const fresh = freshDdzMotionEvent(
          latest.state,
          event.id - 1,
          serverNow + performance.now() - observedAt,
        );
        if (fresh?.id !== event.id || latest.state.phase !== "BIDDING") return;
        const plan = planDdzMotion(
          event,
          latest.state,
          geometry(currentRoot),
          null,
        );
        if (plan)
          setBatch({
            generation: ownGeneration,
            plan,
            anchorRoot: currentRoot,
            createdAt: performance.now(),
          });
        cacheGeometry(currentRoot);
      });
      pendingFrames.current.add(frame);
    } else if (event) {
      // PLAY reads the previous hand/target cache before this accepted snapshot
      // replaces it. Only the initial DEAL requires the extra layout frame.
      const plan = planDdzMotion(
        event,
        state,
        geometry(root),
        previousTarget.current,
      );
      if (plan) {
        cancel();
        setBatch({
          generation: generation.current,
          plan,
          anchorRoot: root,
          createdAt: performance.now(),
        });
      }
    }
    previousTarget.current = state.targetPlay;
    cacheGeometry(root);
  }, [state, serverNow, roomKey, demoInitialDeal]);

  useEffect(() => {
    mounted.current = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;
    const updatePortal = () => {
      cancel();
      setBatch(null);
      setPortal(
        (document.fullscreenElement as HTMLElement | null) ?? anchorRoot(),
      );
      const root = anchorRoot();
      if (root) cacheGeometry(root);
    };
    const visibility = () => {
      if (document.hidden) {
        cancel();
        setBatch(null);
        cursor.current = {
          key: `${current.current.roomKey}:${current.current.state.selfSeat}`,
          seq: current.current.state.eventSeq,
        };
      }
    };
    const preference = () => {
      reduced.current = media.matches;
      if (media.matches) {
        cancel();
        setBatch(null);
      }
    };
    const reposition = () => {
      cancel();
      setBatch(null);
      const root = anchorRoot();
      if (root) cacheGeometry(root);
    };
    let captureFrame = 0;
    // Capture after local selection, before the accepted snapshot removes cards.
    const interaction = () => {
      // A local server can acknowledge PLAY before the next animation frame.
      // Save the selected card's real position synchronously, then refresh once
      // local selection/press rendering has had its frame as well.
      const root = anchorRoot();
      if (root) cacheGeometry(root);
      cancelAnimationFrame(captureFrame);
      captureFrame = requestAnimationFrame(() => {
        const currentRoot = anchorRoot();
        if (currentRoot) cacheGeometry(currentRoot);
      });
    };
    const root = anchorRoot();
    const gateObserver = new MutationObserver(() => {
      if (root && !tableVisible(root)) {
        cancel();
        setBatch(null);
      }
    });
    if (root)
      gateObserver.observe(root, {
        subtree: true,
        attributes: true,
        attributeFilter: ["inert", "hidden"],
      });
    setPortal((document.fullscreenElement as HTMLElement | null) ?? root);
    root?.addEventListener("pointerdown", interaction, true);
    root?.addEventListener("keydown", interaction, true);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", updatePortal);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", reposition);
    media.addEventListener("change", preference);
    return () => {
      mounted.current = false;
      cancel();
      cancelAnimationFrame(captureFrame);
      gateObserver.disconnect();
      root?.removeEventListener("pointerdown", interaction, true);
      root?.removeEventListener("keydown", interaction, true);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", updatePortal);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      media.removeEventListener("change", preference);
    };
  }, [roomKey, state.selfSeat]);

  // Defer an explicit preview demo until the portal has mounted. The RAF is
  // cancelled by React Strict Mode's setup/cleanup probe, so it runs only once.
  useEffect(() => {
    const key = `${roomKey}:${state.selfSeat}`;
    if (!demoInitialDeal || !portal || demoPlayed.current === key) return;
    const frame = requestAnimationFrame(() => {
      const root = anchorRoot(),
        latest = current.current;
      if (
        !root ||
        !tableVisible(root) ||
        latest.state.phase !== "BIDDING" ||
        document.hidden ||
        reduced.current
      )
        return;
      const event = freshDdzMotionEvent(
        latest.state,
        latest.state.eventSeq - 1,
        latest.serverNow,
      );
      if (event?.kind !== "DEAL") return;
      const plan = planDdzMotion(event, latest.state, geometry(root), null);
      if (!plan) return;
      demoPlayed.current = key;
      cancel();
      setBatch({
        generation: generation.current,
        plan,
        anchorRoot: root,
        createdAt: performance.now(),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [portal, roomKey, state.selfSeat, demoInitialDeal]);

  useLayoutEffect(() => {
    if (!batch) return;
    const { plan } = batch,
      ownGeneration = batch.generation;
    const finish = () => {
      if (ownGeneration === generation.current) {
        cancel();
        setBatch(null);
      }
    };
    if (
      !portal ||
      !canRunDdzMotion(ownGeneration, generation.current, {
        visible: tableVisible(batch.anchorRoot),
        hidden: document.hidden,
        reduced: reduced.current,
      }) ||
      stopDdzTableMotion(current.current.state.phase, true)
    ) {
      finish();
      return;
    }
    // A suspended render must not start a delayed old animation on recovery.
    if (performance.now() - batch.createdAt > 70) {
      finish();
      return;
    }
    const track = (animation: Animation) => {
      animations.current.add(animation);
      void animation.finished
        .catch(() => {})
        .finally(() => animations.current.delete(animation));
      return animation;
    };
    // Final cleanup must run even if the table vanished or became inert. Only
    // generation ownership can prevent an old batch from cleaning a newer one.
    const schedule = (fn: () => void, delay: number) => {
      const timer = setTimeout(
        () => {
          timers.current.delete(timer);
          if (mounted.current && ownGeneration === generation.current) fn();
        },
        Math.max(0, batch.createdAt + delay - performance.now()),
      );
      timers.current.add(timer);
    };
    const transform = (p: DdzMotionPoint) =>
      `translate3d(${p.x - plan.cardWidth / 2}px, ${p.y - (plan.cardWidth * 104) / 144}px, 0) rotate(${p.rotate}deg) scale(${p.scale})`;
    const slotRun = new Map<number, number>();
    const slotAnimations = new Map<number, Animation>();
    plan.flights.forEach((flight, index) =>
      schedule(() => {
        const timing = ddzMotionTick(
          performance.now() - batch.createdAt,
          flight.delay,
          plan.duration,
        );
        if (
          timing === "cancel" ||
          stopDdzTableMotion(
            current.current.state.phase,
            tableVisible(batch.anchorRoot),
          ) ||
          document.hidden ||
          reduced.current
        ) {
          finish();
          return;
        }
        if (timing === "skip") return;
        const node = nodes.current[flight.slot];
        if (!node?.animate) return;
        // A slightly late prior flight can still occupy this recycled slot.
        // Cancel its compositor animation before assigning the next delivery.
        slotAnimations.get(flight.slot)?.cancel();
        slotRun.set(flight.slot, index);
        node.style.opacity = "1";
        const mid: DdzMotionPoint = {
          x: flight.from.x + (flight.to.x - flight.from.x) * 0.58,
          y: flight.from.y + (flight.to.y - flight.from.y) * 0.5 + flight.arc,
          scale:
            Math.max(flight.from.scale, flight.to.scale) *
            (flight.kind === "deal" ? 1.04 : 1.12),
          rotate:
            (flight.from.rotate + flight.to.rotate) * 0.5 +
            (flight.kind === "collect" ? -7 : 4),
        };
        const landed = {
          ...flight.to,
          scale: flight.to.scale * 1.025,
          y: flight.to.y - 2,
        };
        const animation = track(
          node.animate(
            [
              {
                transform: transform(flight.from),
                opacity: flight.kind === "collect" ? 1 : 0.9,
                offset: 0,
              },
              { transform: transform(mid), opacity: 1, offset: 0.48 },
              { transform: transform(landed), opacity: 1, offset: 0.86 },
              {
                transform: transform(flight.to),
                opacity: flight.kind === "collect" ? 0 : 1,
                offset: 1,
              },
            ],
            {
              duration: flight.duration,
              easing: "cubic-bezier(.18,.64,.28,1)",
              fill: "both",
            },
          ),
        );
        slotAnimations.set(flight.slot, animation);
        void animation.finished
          .then(() => {
            if (
              ownGeneration === generation.current &&
              slotRun.get(flight.slot) === index
            )
              node.style.opacity = "0";
            animation.cancel();
          })
          .catch(() => {});
      }, flight.delay),
    );
    // Reveal authoritative cards as their visual backs arrive. This is purely
    // presentational; keyboard/readers and the server turn keep their own state.
    for (const item of plan.revealHand) {
      const node = Array.from(
        batch.anchorRoot.querySelectorAll<HTMLElement>(
          '[data-ddz-motion-anchor="hand"] [data-ddz-card-id]',
        ),
      ).find((node) => node.dataset.ddzCardId === item.cardId);
      if (node?.animate)
        track(
          node.animate([{ opacity: 0 }, { opacity: 1 }], {
            delay: Math.max(0, item.at - 25),
            duration: 65,
            fill: "backwards",
          }),
        );
    }
    const target = batch.anchorRoot.querySelector<HTMLElement>(
      '[data-ddz-motion-anchor="target"]',
    );
    if (plan.revealTarget && target?.animate)
      track(
        target.animate([{ opacity: 0 }, { opacity: 1 }], {
          delay: Math.max(0, plan.duration - 65),
          duration: 75,
          fill: "backwards",
        }),
      );
    schedule(finish, plan.duration + 100);
  }, [batch, portal]);

  const slotFaces = batch
    ? Array.from({ length: batch.plan.slots }, (_, slot) =>
        batch.plan.flights.find((flight) => flight.slot === slot),
      )
    : [];
  return (
    <>
      <span ref={marker} hidden aria-hidden="true" />
      {portal &&
        batch &&
        createPortal(
          <div
            className={s.layer}
            aria-hidden="true"
            data-ddz-motion-kind={batch.plan.kind}
            data-ddz-motion-event={batch.plan.eventId}
            data-ddz-motion-deliveries={batch.plan.flights.length}
          >
            {slotFaces.map((flight, slot) => (
              <span
                key={slot}
                ref={(node) => {
                  nodes.current[slot] = node;
                }}
                className={s.card}
                data-ddz-motion-card=""
                style={{
                  width: batch.plan.cardWidth,
                  height: (batch.plan.cardWidth * 104) / 72,
                }}
              >
                <DoudizhuCardFace
                  card={
                    flight?.cardId
                      ? (getDdzCard(flight.cardId) ?? undefined)
                      : undefined
                  }
                  back={flight?.back ?? true}
                />
              </span>
            ))}
          </div>,
          portal,
        )}
    </>
  );
}
