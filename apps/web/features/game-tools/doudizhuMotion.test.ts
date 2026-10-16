import assert from "node:assert/strict";
import test from "node:test";
import {
  createDdzDeck,
  createDdzState,
  getDdzViewerState,
  startDdzGame,
} from "./doudizhuEngine";
import {
  canRunDdzMotion,
  ddzMotionTick,
  stopDdzTableMotion,
  ddzSeatAnchor,
  freshDdzMotionEvent,
  planDdzMotion,
  type DdzMotionGeometry,
} from "./doudizhuMotion";
import type { DdzEvent, DdzTargetPlay } from "./doudizhuTypes";
const deck = createDdzDeck();
const state = startDdzGame(
  createDdzState([0, 1, 2].map((seat) => ({ seat, name: String(seat) }))),
  1_000,
  { deck: deck.map((c) => c.id), firstBidSeat: 0 },
).state;
const viewer = getDdzViewerState(state, 1);
const geometry: DdzMotionGeometry = {
  anchors: {
    deck: { x: 160, y: 80, width: 100, height: 70 },
    hand: { x: 10, y: 650, width: 370, height: 100 },
    left: { x: 15, y: 150, width: 70, height: 85 },
    right: { x: 305, y: 150, width: 70, height: 85 },
    target: { x: 75, y: 330, width: 240, height: 95 },
  },
  hand: viewer.hand.map((card, i) => ({
    cardId: card.id,
    rect: { x: 15 + i * 18, y: 650, width: 60, height: 88 },
  })),
  previousHand: new Map(
    viewer.hand.map((card, i) => [
      card.id,
      { x: 15 + i * 18, y: 628, width: 60, height: 88 },
    ]),
  ),
  viewportWidth: 390,
};
test("motion consumes current-deal fresh events without replaying snapshots or stale history", () => {
  assert.equal(freshDdzMotionEvent(viewer, viewer.eventSeq, 1_100), null);
  assert.equal(freshDdzMotionEvent(viewer, 0, 1_100)?.kind, "DEAL");
  assert.equal(freshDdzMotionEvent(viewer, 0, 3_001), null);
  assert.equal(freshDdzMotionEvent({ ...viewer, gameNo: 2 }, 0, 1_100), null);
  assert.equal(freshDdzMotionEvent(viewer, 0, 100), null);
});
test("deal delivers 17 backs to each seat in under 1100ms using 12 nonoverlapping slots", () => {
  const plan = planDdzMotion(viewer.events[0], viewer, geometry, null)!;
  assert.equal(plan.kind, "deal");
  assert.equal(plan.flights.length, 51);
  assert.equal(plan.slots, 12);
  assert.ok(plan.duration >= 700 && plan.duration <= 1100);
  assert.equal(plan.revealHand.length, 17);
  assert.ok(
    plan.flights.every((flight) => flight.back && flight.cardId === undefined),
  );
  for (let slot = 0; slot < 12; slot++) {
    const uses = plan.flights.filter((flight) => flight.slot === slot);
    for (let i = 1; i < uses.length; i++)
      assert.ok(uses[i - 1].delay + uses[i - 1].duration <= uses[i].delay);
  }
  assert.equal(plan.flights.filter((f) => f.to.y > 600).length, 17);
  assert.equal(
    plan.flights.filter((f) => f.to.x < 100 && f.to.y < 300).length,
    17,
  );
  assert.equal(
    plan.flights.filter((f) => f.to.x > 300 && f.to.y < 300).length,
    17,
  );
});
test("seat positions rotate consistently and landlord pickup uses only the 3 public bottom cards", () => {
  assert.deepEqual(
    [0, 1, 2].map((seat) => ddzSeatAnchor(seat, 1)),
    ["left", "hand", "right"],
  );
  const event: DdzEvent = {
    id: 3,
    gameNo: 1,
    dealNo: 1,
    turnId: 2,
    at: 1_200,
    kind: "LANDLORD",
    seat: 2,
  };
  const plan = planDdzMotion(
    event,
    {
      ...viewer,
      phase: "PLAYING",
      bottomCards: deck.slice(-3),
      landlordSeat: 2,
    },
    geometry,
    null,
  )!;
  assert.equal(plan.flights.length, 3);
  assert.deepEqual(
    plan.flights.map((f) => f.cardId),
    deck.slice(-3).map((c) => c.id),
  );
  assert.ok(plan.flights.every((f) => !f.back && f.to.x > 300));
  assert.ok(plan.duration <= 360);
});
test("accepted play starts from saved hand positions and large combinations share the 12-card budget with old pile", () => {
  const ids = viewer.hand.slice(0, 15).map((c) => c.id);
  const play = {
    type: "STRAIGHT" as const,
    cardIds: ids,
    mainRank: 14,
    chainLength: 15,
    cardCount: 15,
  };
  const old: DdzTargetPlay = {
    type: "SINGLE",
    cardIds: [deck[0].id, deck[1].id, deck[2].id],
    mainRank: 3,
    chainLength: 1,
    cardCount: 3,
    seat: 0,
  };
  const event: DdzEvent = {
    id: 5,
    gameNo: 1,
    dealNo: 1,
    turnId: 4,
    at: 1_300,
    kind: "PLAY",
    seat: 1,
    play,
  };
  const plan = planDdzMotion(
    event,
    { ...viewer, phase: "PLAYING" },
    geometry,
    old,
  )!;
  assert.equal(plan.slots, 12);
  assert.equal(plan.flights.length, 12);
  assert.equal(plan.revealTarget, true);
  assert.equal(plan.flights.filter((f) => f.kind === "collect").length, 3);
  const incoming = plan.flights.filter((f) => f.kind === "play");
  assert.equal(incoming[0].from.y, 672);
  assert.equal(incoming[0].cardId, ids[0]);
  assert.equal(incoming.at(-1)?.cardId, ids.at(-1));
  assert.ok(plan.duration <= 360);
});
test("two passes collect the previous public pile toward deck and missing layouts safely skip", () => {
  const target: DdzTargetPlay = {
    type: "PAIR",
    cardIds: [deck[0].id, deck[1].id],
    mainRank: 3,
    chainLength: 1,
    cardCount: 2,
    seat: 0,
  };
  const event: DdzEvent = {
    id: 9,
    gameNo: 1,
    dealNo: 1,
    turnId: 8,
    at: 1_500,
    kind: "TRICK",
    seat: 0,
  };
  const plan = planDdzMotion(
    event,
    { ...viewer, phase: "PLAYING" },
    geometry,
    target,
  )!;
  assert.equal(plan.kind, "collect");
  assert.equal(plan.flights.length, 2);
  assert.ok(
    plan.flights.every((f) => f.to.y < f.from.y && f.to.scale < f.from.scale),
  );
  assert.equal(
    planDdzMotion(event, viewer, { ...geometry, anchors: {} }, target),
    null,
  );
});

test("cancelled generations, portrait/inert tables, background and reduced motion cannot run queued flights", () => {
  assert.equal(
    canRunDdzMotion(4, 4, { visible: true, hidden: false, reduced: false }),
    true,
  );
  assert.equal(
    canRunDdzMotion(4, 5, { visible: true, hidden: false, reduced: false }),
    false,
  );
  assert.equal(
    canRunDdzMotion(4, 4, { visible: false, hidden: false, reduced: false }),
    false,
  );
  assert.equal(
    canRunDdzMotion(4, 4, { visible: true, hidden: true, reduced: false }),
    false,
  );
  assert.equal(
    canRunDdzMotion(4, 4, { visible: true, hidden: false, reduced: true }),
    false,
  );
});
test("old public pile collects from its previous seat-relative position, not the incoming target position", () => {
  const old: DdzTargetPlay = {
    type: "SINGLE",
    cardIds: [deck[0].id],
    mainRank: 3,
    chainLength: 1,
    cardCount: 1,
    seat: 0,
  };
  const event: DdzEvent = {
    id: 5,
    gameNo: 1,
    dealNo: 1,
    turnId: 4,
    at: 1_300,
    kind: "PLAY",
    seat: 1,
    play: { ...old, cardIds: [viewer.hand[0].id] },
  };
  const plan = planDdzMotion(
    event,
    { ...viewer, phase: "PLAYING" },
    {
      ...geometry,
      previousTargetRect: { x: 10, y: 220, width: 100, height: 90 },
    },
    old,
  )!;
  assert.equal(plan.flights[0].kind, "collect");
  assert.equal(plan.flights[0].from.x, 60);
  assert.equal(plan.flights[0].from.y, 265);
  assert.equal(plan.flights[1].to.x, 195);
  assert.equal(plan.flights[1].to.y, 377.5);
});

test("a result or missing/inert table immediately ends an active presentation", () => {
  assert.equal(stopDdzTableMotion("PLAYING", true), false);
  assert.equal(stopDdzTableMotion("BIDDING", true), false);
  assert.equal(stopDdzTableMotion("RESULT", true), true);
  assert.equal(stopDdzTableMotion("RESULT", false), true);
  assert.equal(stopDdzTableMotion("PLAYING", false), true);
  assert.equal(stopDdzTableMotion("LOBBY", true), true);
});
test("event-loop stalls discard queued deliveries instead of replaying an entire batch", () => {
  const plan = planDdzMotion(viewer.events[0], viewer, geometry, null)!;
  assert.ok(
    plan.flights.every(
      (flight) =>
        ddzMotionTick(plan.duration + 200, flight.delay, plan.duration) ===
        "cancel",
    ),
  );
  // Resume mid-deal: only recent deliveries may run, with unique slot owners.
  const runnable = plan.flights.filter(
    (f) =>
      f.delay <= 600 && ddzMotionTick(600, f.delay, plan.duration) === "run",
  );
  assert.ok(runnable.length > 0 && runnable.length <= 5);
  assert.equal(new Set(runnable.map((f) => f.slot)).size, runnable.length);
  assert.equal(ddzMotionTick(400, 100, plan.duration), "skip");
  assert.equal(ddzMotionTick(116, 100, plan.duration), "run");
});

test("play lands at exact public-card bounds and collects from cached individual bounds", () => {
  const cardId = viewer.hand[0].id,
    oldId = deck[0].id;
  const old: DdzTargetPlay = {
    type: "SINGLE",
    cardIds: [oldId],
    mainRank: 3,
    chainLength: 1,
    cardCount: 1,
    seat: 0,
  };
  const event: DdzEvent = {
    id: 5,
    gameNo: 1,
    dealNo: 1,
    turnId: 4,
    at: 1_300,
    kind: "PLAY",
    seat: 1,
    play: { ...old, cardIds: [cardId] },
  };
  for (const targetWidth of [44, 64]) {
    const plan = planDdzMotion(
      event,
      { ...viewer, phase: "PLAYING" },
      {
        ...geometry,
        viewportWidth: 1280,
        targetCards: new Map([
          [
            cardId,
            {
              x: 410,
              y: 250,
              width: targetWidth,
              height: (targetWidth * 104) / 72,
            },
          ],
        ]),
        previousTargetCards: new Map([
          [oldId, { x: 20, y: 140, width: 44, height: 64 }],
        ]),
      },
      old,
    )!;
    const incoming = plan.flights.find((f) => f.kind === "play")!,
      outgoing = plan.flights.find((f) => f.kind === "collect")!;
    assert.equal(incoming.to.x, 410 + targetWidth / 2);
    assert.equal(incoming.to.y, 250 + (targetWidth * 104) / 144);
    assert.equal(incoming.to.scale * plan.cardWidth, targetWidth);
    assert.equal(incoming.to.rotate, 0);
    assert.equal(outgoing.from.x, 42);
    assert.equal(outgoing.from.y, 172);
    assert.equal(outgoing.from.scale * plan.cardWidth, 44);
    assert.equal(outgoing.from.rotate, 0);
  }
});
