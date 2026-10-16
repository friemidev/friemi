import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeDdzPresentation,
  ddzPresentationCursor,
} from "./doudizhuPresentation";
import type { DdzEvent, DdzViewerState } from "./doudizhuTypes";

const event = (id: number, kind: DdzEvent["kind"]): DdzEvent => ({
  id,
  kind,
  at: 1_000,
  gameNo: 1,
  dealNo: 1,
  turnId: id,
  seat: id % 3,
  ...(kind === "PLAY"
    ? {
        play: {
          type: "ROCKET" as const,
          cardIds: ["joker-small", "joker-big"],
          mainRank: 17,
          chainLength: 1,
          cardCount: 2,
        },
      }
    : {}),
});
const state = (
  events: DdzEvent[] = [],
  phase: DdzViewerState["phase"] = "PLAYING",
) => ({
  selfSeat: 0,
  gameNo: 1,
  dealNo: 1,
  eventSeq: events.at(-1)?.id ?? 0,
  phase,
  events,
});
const baseline = ddzPresentationCursor(state(), "r");

test("one accepted event supplies the identical voice and visual origin", () => {
  const result = consumeDdzPresentation(
    baseline,
    state([event(1, "PLAY")]),
    "r",
    1_050,
    200,
    true,
  );
  assert.equal(result.presentation?.event.id, 1);
  assert.equal(result.presentation?.effect?.eventId, 1);
  assert.equal(result.presentation?.startAt, 250);
  assert.equal(result.presentation?.effect?.kind, "rocket");
  assert.equal(
    consumeDdzPresentation(
      result.cursor,
      state([event(1, "PLAY")]),
      "r",
      1_100,
      300,
      true,
    ).presentation,
    null,
  );
});
test("two PASS + TRICK speak the latest pass, while a winning PLAY survives RESULT", () => {
  const passes = consumeDdzPresentation(
    baseline,
    state([event(1, "PASS"), event(2, "PASS"), event(3, "TRICK")]),
    "r",
    1_050,
    200,
    true,
  ).presentation!;
  assert.equal(passes.event.id, 2);
  assert.equal(passes.effect, null);
  const winning = consumeDdzPresentation(
    baseline,
    state([event(1, "PLAY"), event(2, "RESULT")], "RESULT"),
    "r",
    1_050,
    200,
    true,
  ).presentation!;
  assert.equal(winning.event.kind, "PLAY");
  assert.equal(winning.effect?.kind, "rocket");
  assert.equal(winning.result, true);
});
test("first, recovery, hidden, stale and cross-view snapshots never replay", () => {
  const latest = state([event(1, "PLAY")]);
  assert.equal(
    consumeDdzPresentation(null, latest, "r", 1_050, 200, true).presentation,
    null,
  );
  const hidden = consumeDdzPresentation(
    baseline,
    latest,
    "r",
    1_050,
    200,
    false,
  );
  assert.equal(hidden.presentation, null);
  assert.equal(
    consumeDdzPresentation(hidden.cursor, latest, "r", 1_100, 300, true)
      .presentation,
    null,
  );
  assert.equal(
    consumeDdzPresentation(baseline, latest, "r", 3_000, 200, true)
      .presentation,
    null,
  );
  assert.equal(
    consumeDdzPresentation(
      baseline,
      { ...latest, selfSeat: 1 },
      "r",
      1_050,
      200,
      true,
    ).presentation,
    null,
  );
  assert.equal(
    consumeDdzPresentation(baseline, latest, "other", 1_050, 200, true)
      .presentation,
    null,
  );
});
test("new ordinary play or pass supersedes an older special instead of replaying it", () => {
  const ordinary = event(2, "PLAY");
  ordinary.play = {
    type: "SINGLE",
    cardIds: ["c3"],
    mainRank: 3,
    chainLength: 1,
    cardCount: 1,
  };
  const chosen = consumeDdzPresentation(
    baseline,
    state([event(1, "PLAY"), ordinary]),
    "r",
    1_050,
    200,
    true,
  ).presentation!;
  assert.equal(chosen.event.id, 2);
  assert.equal(chosen.effect, null);
  assert.equal(
    consumeDdzPresentation(
      baseline,
      state([event(1, "PLAY"), event(2, "PASS")]),
      "r",
      1_050,
      200,
      true,
    ).presentation?.event.kind,
    "PASS",
  );
});
test("a real new deal retains its cue while changing a live round does not replay a play", () => {
  const next = { ...event(1, "DEAL"), gameNo: 2 };
  assert.equal(
    consumeDdzPresentation(
      baseline,
      { ...state([next], "BIDDING"), gameNo: 2 },
      "r",
      1_050,
      200,
      true,
    ).presentation?.event.kind,
    "DEAL",
  );
  assert.equal(
    consumeDdzPresentation(
      baseline,
      { ...state([{ ...event(1, "PLAY"), gameNo: 2 }]), gameNo: 2 },
      "r",
      1_050,
      200,
      true,
    ).presentation,
    null,
  );
});
