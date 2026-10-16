import type { DdzEvent, DdzTargetPlay, DdzViewerState } from "./doudizhuTypes";

export type DdzMotionAnchor = "deck" | "hand" | "left" | "right" | "target";
export type DdzMotionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type DdzMotionPoint = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};
export type DdzMotionFlight = {
  slot: number;
  cardId?: string;
  back: boolean;
  delay: number;
  duration: number;
  from: DdzMotionPoint;
  to: DdzMotionPoint;
  arc: number;
  kind: "deal" | "landlord" | "play" | "collect";
};
export type DdzMotionPlan = {
  eventId: number;
  kind: DdzMotionFlight["kind"];
  flights: DdzMotionFlight[];
  slots: number;
  duration: number;
  cardWidth: number;
  revealHand: { cardId: string; at: number }[];
  revealTarget: boolean;
};
export type DdzMotionGeometry = {
  anchors: Partial<Record<DdzMotionAnchor, DdzMotionRect>>;
  /** Current hand DOM order, including the three new landlord cards. */
  hand: { cardId: string; rect: DdzMotionRect }[];
  /** Retains positions from before the accepted snapshot removed played cards. */
  previousHand: ReadonlyMap<string, DdzMotionRect>;
  previousTargetRect?: DdzMotionRect;
  targetCards?: ReadonlyMap<string, DdzMotionRect>;
  previousTargetCards?: ReadonlyMap<string, DdzMotionRect>;
  viewportWidth: number;
};

/** Every delayed visual callback belongs to one cancellable presentation generation. */
export function canRunDdzMotion(
  generation: number,
  activeGeneration: number,
  options: { visible: boolean; hidden: boolean; reduced: boolean },
) {
  return (
    generation === activeGeneration &&
    options.visible &&
    !options.hidden &&
    !options.reduced
  );
}

/** The result screen owns its own presentation; no table flight may outlive it. */
export function stopDdzTableMotion(
  phase: DdzViewerState["phase"],
  tableVisible: boolean,
) {
  return !tableVisible || (phase !== "BIDDING" && phase !== "PLAYING");
}

/** Drop delayed flights instead of bursting through an event-loop backlog. */
export function ddzMotionTick(
  elapsed: number,
  scheduledDelay: number,
  batchDuration: number,
): "run" | "skip" | "cancel" {
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > batchDuration + 80)
    return "cancel";
  return elapsed - scheduledDelay > 70 ? "skip" : "run";
}

/** Seat order is fixed; screen positions rotate for each authorized viewer. */
export function ddzSeatAnchor(seat: number, selfSeat: number): DdzMotionAnchor {
  return seat === selfSeat
    ? "hand"
    : seat === (selfSeat + 1) % 3
      ? "right"
      : "left";
}

/** Never replay a snapshot backlog; only the latest relevant, current-deal event. */
export function freshDdzMotionEvent(
  state: DdzViewerState,
  after: number,
  serverNow: number,
): DdzEvent | null {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const event = state.events[i];
    if (event.id <= after) break;
    if (!["DEAL", "LANDLORD", "PLAY", "TRICK"].includes(event.kind)) continue;
    if (event.gameNo !== state.gameNo || event.dealNo !== state.dealNo)
      continue;
    const age = serverNow - event.at;
    if (age < -500 || age > (event.kind === "DEAL" ? 2_000 : 1_500))
      return null;
    if (event.kind === "DEAL" && state.phase !== "BIDDING") return null;
    if (event.kind === "LANDLORD" && state.phase !== "PLAYING") return null;
    if (event.kind === "PLAY" && !["PLAYING", "RESULT"].includes(state.phase))
      return null;
    if (event.kind === "TRICK" && state.phase !== "PLAYING") return null;
    return event;
  }
  return null;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
function point(
  rect: DdzMotionRect,
  width: number,
  rotate = 0,
  x = 0,
  y = 0,
): DdzMotionPoint {
  return {
    x: rect.x + rect.width / 2 + x,
    y: rect.y + rect.height / 2 + y,
    scale: clamp(rect.width / width, 0.55, 1.8),
    rotate,
  };
}
function representative(ids: string[], limit: number) {
  if (ids.length <= limit) return ids;
  return Array.from(
    { length: limit },
    (_, i) => ids[Math.round((i * (ids.length - 1)) / (limit - 1))],
  );
}

/** Geometry only: no rule changes, timers, identity inference or opponent hands. */
export function planDdzMotion(
  event: DdzEvent,
  state: DdzViewerState,
  geometry: DdzMotionGeometry,
  previousTarget: DdzTargetPlay | null,
): DdzMotionPlan | null {
  const { anchors, hand, previousHand } = geometry;
  const width = clamp(geometry.viewportWidth * 0.13, 44, 68);
  const flights: DdzMotionFlight[] = [];
  const revealHand: DdzMotionPlan["revealHand"] = [];
  const deck = anchors.deck,
    target = anchors.target;
  const center = (
    anchor: DdzMotionAnchor,
    count = 1,
    index = 0,
  ): DdzMotionPoint | null => {
    const rect = anchors[anchor];
    if (!rect) return null;
    // The anchors can be broad surfaces. Flight sizes remain card-sized.
    const spread =
      anchor === "hand"
        ? Math.min(rect.width * 0.8, (count - 1) * 28)
        : anchor === "target"
          ? Math.min(rect.width * 0.8, (count - 1) * 25)
          : 8;
    const offset = count > 1 ? (index / (count - 1) - 0.5) * spread : 0;
    return {
      x: rect.x + rect.width / 2 + offset,
      y: rect.y + rect.height / 2,
      scale:
        anchor === "hand"
          ? 1
          : anchor === "target"
            ? 0.88
            : anchor === "deck"
              ? 0.74
              : 0.65,
      rotate:
        anchor === "left"
          ? -16
          : anchor === "right"
            ? 16
            : anchor === "deck"
              ? -7
              : (index - (count - 1) / 2) * 0.5,
    };
  };
  const fromDeck = center("deck");
  const oldTarget = (count: number, index: number, cardId: string) => {
    const actual = geometry.previousTargetCards?.get(cardId);
    if (actual) return point(actual, width, 0);
    const r = geometry.previousTargetRect ?? target;
    if (!r) return null;
    const spread = Math.min(r.width * 0.8, (count - 1) * 25);
    return {
      x:
        r.x +
        r.width / 2 +
        (count > 1 ? (index / (count - 1) - 0.5) * spread : 0),
      y: r.y + r.height / 2,
      scale: 0.88,
      rotate: (index - (count - 1) / 2) * 0.5,
    };
  };
  let kind: DdzMotionPlan["kind"],
    revealTarget = false;
  if (event.kind === "DEAL") {
    if (!deck || !anchors.hand || !anchors.left || !anchors.right || !fromDeck)
      return null;
    kind = "deal";
    // 51 actual deliveries, interleaved round-robin. Recycle 12 visual objects;
    // 164 ms flight < 12 * 16 ms reuse interval, so slots never overlap.
    for (let i = 0; i < 51; i++) {
      const seat = i % 3,
        index = Math.floor(i / 3),
        anchor = ddzSeatAnchor(seat, state.selfSeat);
      const own = anchor === "hand" ? hand[index] : undefined;
      const to = own
        ? point(own.rect, width, (index - 8) * 0.45)
        : center(anchor, 17, index)!;
      flights.push({
        slot: i % 12,
        back: true,
        delay: i * 16,
        duration: 164,
        from: { ...fromDeck, rotate: -9 + (i % 3) * 3 },
        to,
        arc: anchor === "hand" ? -24 : -35,
        kind,
      });
      if (own) revealHand.push({ cardId: own.cardId, at: i * 16 + 142 });
    }
  } else if (event.kind === "LANDLORD") {
    if (!fromDeck || event.seat === undefined || state.bottomCards.length !== 3)
      return null;
    kind = "landlord";
    const anchor = ddzSeatAnchor(event.seat, state.selfSeat);
    for (let i = 0; i < 3; i++) {
      const card = state.bottomCards[i],
        own =
          anchor === "hand"
            ? hand.find((h) => h.cardId === card.id)
            : undefined;
      const to = own ? point(own.rect, width, 0) : center(anchor, 3, i);
      if (!to) return null;
      flights.push({
        slot: i,
        cardId: card.id,
        back: false,
        delay: i * 42,
        duration: 250,
        from: {
          ...fromDeck,
          x: fromDeck.x + (i - 1) * Math.min(width * 0.7, deck!.width / 3),
          rotate: (i - 1) * 5,
        },
        to,
        arc: -40,
        kind,
      });
      if (own) revealHand.push({ cardId: own.cardId, at: i * 42 + 225 });
    }
  } else if (event.kind === "PLAY" && event.play && event.seat !== undefined) {
    if (!target) return null;
    kind = "play";
    revealTarget = true;
    // The previous public pile slips back toward the deck while the new play
    // crosses the table. Together they use no more than twelve visual cards.
    const outgoing =
      previousTarget &&
      previousTarget.cardIds.join() !== event.play.cardIds.join() &&
      fromDeck
        ? representative(previousTarget.cardIds, 3)
        : [];
    outgoing.forEach((cardId, i) =>
      flights.push({
        slot: i,
        cardId,
        back: false,
        delay: i * 10,
        duration: 210,
        from: oldTarget(outgoing.length, i, cardId)!,
        to: {
          ...fromDeck!,
          x: fromDeck!.x + i * 2,
          scale: 0.5,
          rotate: -14 + i * 5,
        },
        arc: -28,
        kind: "collect",
      }),
    );
    const incoming = representative(event.play.cardIds, 12 - outgoing.length);
    const anchor = ddzSeatAnchor(event.seat, state.selfSeat);
    incoming.forEach((cardId, i) => {
      const old = anchor === "hand" ? previousHand.get(cardId) : undefined;
      const from = old
        ? point(old, width, (i - (incoming.length - 1) / 2) * 0.7)
        : center(anchor, incoming.length, i);
      if (!from) return;
      flights.push({
        slot: i + outgoing.length,
        cardId,
        back: false,
        delay: i * 7,
        duration: 265,
        from,
        to: geometry.targetCards?.has(cardId)
          ? point(geometry.targetCards.get(cardId)!, width, 0)
          : center("target", incoming.length, i)!,
        arc: anchor === "hand" ? -36 : -46,
        kind,
      });
    });
  } else if (event.kind === "TRICK" && previousTarget && target && fromDeck) {
    kind = "collect";
    representative(previousTarget.cardIds, 12).forEach((cardId, i, cards) =>
      flights.push({
        slot: i,
        cardId,
        back: false,
        delay: i * 6,
        duration: 245,
        from: oldTarget(cards.length, i, cardId)!,
        to: {
          ...fromDeck,
          x: fromDeck.x + (i % 3) * 2,
          rotate: -9 + (i % 3) * 5,
          scale: 0.5,
        },
        arc: -32,
        kind,
      }),
    );
  } else return null;
  if (!flights.length) return null;
  return {
    eventId: event.id,
    kind,
    flights,
    slots: Math.min(12, Math.max(...flights.map((f) => f.slot)) + 1),
    duration: Math.max(...flights.map((f) => f.delay + f.duration)),
    cardWidth: width,
    revealHand,
    revealTarget,
  };
}
