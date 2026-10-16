import assert from "node:assert/strict";
import test from "node:test";
import {
  canShowDdzPlayEffect,
  consumeDdzPlayEffect,
  ddzPlayEffectKind,
  ddzPlayEffectRemaining,
  resumeDdzPlayEffectCursor,
} from "./doudizhuPlayEffects";
import type { DdzEvent, DdzPatternType, DdzViewerState } from "./doudizhuTypes";

const visible = { visible: true, hidden: false, reduced: false };
function play(id: number, type: DdzPatternType = "ROCKET"): DdzEvent {
  return {
    id,
    gameNo: 1,
    dealNo: 1,
    turnId: id,
    at: 1_000,
    kind: "PLAY",
    seat: 0,
    play: { type, cardIds: [], cardCount: 2, mainRank: 17, chainLength: 1 },
  };
}
function snapshot(
  events: DdzEvent[] = [],
  phase: DdzViewerState["phase"] = "PLAYING",
) {
  return {
    selfSeat: 0,
    gameNo: 1,
    dealNo: 1,
    eventSeq: events.at(-1)?.id ?? 0,
    phase,
    events,
  };
}
const baseline = consumeDdzPlayEffect(
  null,
  snapshot(),
  "room",
  900,
  100,
  visible,
).cursor;

test("only requested accepted play patterns receive distinct effects", () => {
  for (const [pattern, kind] of [
    ["STRAIGHT", "straight"],
    ["PAIR_STRAIGHT", "pairs"],
    ["AIRPLANE", "airplane"],
    ["AIRPLANE_SINGLE", "airplane"],
    ["AIRPLANE_PAIR", "airplane"],
    ["BOMB", "bomb"],
    ["ROCKET", "rocket"],
  ] as const) {
    assert.equal(ddzPlayEffectKind(pattern), kind);
    const result = consumeDdzPlayEffect(
      baseline,
      snapshot([play(1, pattern)]),
      "room",
      1_100,
      200,
      visible,
    );
    assert.equal(result.effect?.kind, kind);
    assert.equal(result.effect?.pattern, pattern);
    assert.ok(
      result.effect!.duration >= 800 && result.effect!.duration <= 1_400,
    );
  }
  assert.equal(ddzPlayEffectKind("FOUR_TWO_PAIR"), null);
  assert.equal(ddzPlayEffectKind("TRIPLE"), null);
});
test("initial snapshot, repeated snapshot and locale-only rerender cannot replay", () => {
  const state = snapshot([play(1)]);
  const initial = consumeDdzPlayEffect(
    null,
    state,
    "room",
    1_100,
    100,
    visible,
  );
  assert.equal(initial.effect, null);
  const first = consumeDdzPlayEffect(
    baseline,
    state,
    "room",
    1_100,
    200,
    visible,
  );
  assert.equal(first.effect?.eventId, 1);
  assert.equal(
    consumeDdzPlayEffect(first.cursor, state, "room", 1_101, 201, visible)
      .effect,
    null,
  );
  assert.equal(
    consumeDdzPlayEffect(initial.cursor, state, "room", 1_100, 200, visible)
      .effect,
    null,
  );
});
test("latest ordinary PLAY supersedes older special PLAY instead of replaying backlog", () => {
  const result = consumeDdzPlayEffect(
    baseline,
    snapshot([play(1), play(2, "SINGLE")]),
    "room",
    1_100,
    200,
    visible,
  );
  assert.equal(result.effect, null);
  assert.equal(result.clear, true);
  assert.equal(result.cursor.seq, 2);
  const latest = consumeDdzPlayEffect(
    baseline,
    snapshot([play(1, "BOMB"), play(2, "STRAIGHT")]),
    "room",
    1_100,
    200,
    visible,
  );
  assert.equal(latest.effect?.kind, "straight");
});
test("winning last PLAY survives a RESULT event in the same snapshot", () => {
  const events = [
    play(1),
    { ...play(2), kind: "RESULT" as const, play: undefined },
  ];
  const result = consumeDdzPlayEffect(
    baseline,
    snapshot(events, "RESULT"),
    "room",
    1_100,
    200,
    visible,
  );
  assert.equal(result.effect?.eventId, 1);
  assert.equal(result.cursor.seq, 2);
  assert.equal(
    consumeDdzPlayEffect(
      null,
      snapshot(events, "RESULT"),
      "room",
      1_100,
      200,
      visible,
    ).effect,
    null,
  );
});
test("hidden, portrait/inert or reduced motion snapshots are consumed and never replayed", () => {
  for (const environment of [
    { ...visible, hidden: true },
    { ...visible, visible: false },
    { ...visible, reduced: true },
  ]) {
    const result = consumeDdzPlayEffect(
      baseline,
      snapshot([play(1)]),
      "room",
      1_100,
      200,
      environment,
    );
    assert.equal(result.effect, null);
    assert.equal(result.clear, true);
    assert.equal(
      consumeDdzPlayEffect(
        result.cursor,
        snapshot([play(1)]),
        "room",
        1_200,
        300,
        visible,
      ).effect,
      null,
    );
  }
});
test("resuming a suspended surface resets its cursor before a still-fresh missed PLAY arrives", () => {
  const beforePause = consumeDdzPlayEffect(
    baseline,
    snapshot(),
    "room",
    900,
    200,
    visible,
  );
  assert.equal(beforePause.cursor.seq, 0);
  // Visibility/online/gate/reduced-motion listeners discard this baseline.
  const resumed = consumeDdzPlayEffect(
    null,
    snapshot([play(1)]),
    "room",
    1_100,
    300,
    visible,
  );
  assert.equal(resumed.effect, null);
  assert.equal(
    consumeDdzPlayEffect(
      resumed.cursor,
      snapshot([play(1), play(2)]),
      "room",
      1_200,
      400,
      visible,
    ).effect?.eventId,
    2,
  );
});
test("room, viewer, round and redeal changes reset the baseline", () => {
  const state = snapshot([play(1)]);
  for (const next of [
    { ...state, selfSeat: 1 },
    { ...state, gameNo: 2 },
    { ...state, dealNo: 2 },
  ])
    assert.equal(
      consumeDdzPlayEffect(baseline, next, "room", 1_100, 200, visible).effect,
      null,
    );
  assert.equal(
    consumeDdzPlayEffect(baseline, state, "another-room", 1_100, 200, visible)
      .effect,
    null,
  );
});
test("frozen preview resume preserves current seq so its first genuine action still animates", () => {
  const state = snapshot([play(1)]);
  const resumed = resumeDdzPlayEffectCursor(state, "preview", 200, true);
  assert.equal(resumed?.seq, 1);
  assert.equal(
    consumeDdzPlayEffect(resumed, state, "preview", 1_100, 300, visible).effect,
    null,
  );
  assert.equal(
    consumeDdzPlayEffect(
      resumed,
      snapshot([play(1), play(2)]),
      "preview",
      1_200,
      400,
      visible,
    ).effect?.eventId,
    2,
  );
  assert.equal(resumeDdzPlayEffectCursor(state, "live", 200, false), null);
});
test("long player thinking time still presents fresh PLAY, while stale/future events skip", () => {
  const state = snapshot([play(1)]);
  assert.equal(
    consumeDdzPlayEffect(baseline, state, "room", 1_100, 20_100, visible).effect
      ?.eventId,
    1,
  );
  for (const now of [749, 2_501, NaN])
    assert.equal(
      consumeDdzPlayEffect(baseline, state, "room", now, 200, visible).effect,
      null,
    );
  assert.equal(
    consumeDdzPlayEffect(
      baseline,
      { ...state, eventSeq: 0 },
      "room",
      1_100,
      200,
      visible,
    ).effect,
    null,
  );
  assert.equal(
    consumeDdzPlayEffect(
      baseline,
      { ...state, events: [{ ...play(1), dealNo: 2 }] },
      "room",
      1_100,
      200,
      visible,
    ).effect,
    null,
  );
});
test("inactive phases cannot display, and stalled presentation is not extended", () => {
  assert.equal(canShowDdzPlayEffect("RESULT", visible), true);
  for (const phase of ["LOBBY", "BIDDING", "CLOSED"] as const)
    assert.equal(canShowDdzPlayEffect(phase, visible), false);
  assert.equal(ddzPlayEffectRemaining(1_200, 100, 200), 1_100);
  assert.equal(ddzPlayEffectRemaining(1_200, 100, 1_301), 0);
  assert.equal(ddzPlayEffectRemaining(1_200, 100, 99), 0);
});
