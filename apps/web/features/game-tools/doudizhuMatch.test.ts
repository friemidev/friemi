import assert from "node:assert/strict";
import test from "node:test";
import { advanceDdzDeadline, applyDdzAction, canChangeDdzRoomSettings, createDdzDeck, createDdzLobbyState, createDdzState, getDdzMatchView, getDdzRoomSettings, getDdzViewerState, startDdzGame, updateDdzRoomSettings, type DdzPlayer, type DdzRoomSettings, type DdzState } from "./doudizhuEngine";
import { recordDdzMatchResult } from "./doudizhuMatch";

const players: DdzPlayer[] = [0, 1, 2].map((seat) => ({ seat, name: `Player ${seat}`, profileId: `private-${seat}`, catId: "scholar" }));
const deck = () => createDdzDeck().map((card) => card.id);
function begin(state: DdzState, seat = 0) {
  const result = startDdzGame(state, (state.result?.finishedAt ?? 0) + 1_000, { deck: deck(), firstBidSeat: seat });
  assert.equal(result.error, undefined);
  return result.state;
}
function finish(state: DdzState) {
  assert.equal(state.phase, "BIDDING");
  const bid = applyDdzAction(state, state.currentSeat!, { type: "BID", score: 3 }, state.deadlineAt! - 1);
  assert.equal(bid.error, undefined);
  state = bid.state;
  for (let actions = 0; state.phase !== "RESULT" && actions < 60; actions++) state = advanceDdzDeadline(state, state.deadlineAt!, deck);
  assert.equal(state.phase, "RESULT");
  return state;
}

test("settings default to six rounds and 60 seconds, validate choices, and remain immutable during a match", () => {
  const initial = createDdzState(players);
  assert.deepEqual(getDdzRoomSettings(initial), { roundCount: 6, playSeconds: 60 });
  assert.equal(canChangeDdzRoomSettings(initial), true);
  assert.equal(updateDdzRoomSettings(initial, { roundCount: 6, playSeconds: 60 }).state, initial);
  assert.deepEqual(getDdzMatchView(initial).players.map((player) => [player.seat, player.name, player.totalScore, player.rank]), players.map((player) => [player.seat, player.name, 0, 1]));
  assert.equal(JSON.stringify(getDdzMatchView(initial)).includes("private-"), false);
  for (const roundCount of [1, 3, 6, 12] as const) for (const playSeconds of [30, 60, 90] as const) {
    const changed = updateDdzRoomSettings(initial, { roundCount, playSeconds });
    assert.equal(changed.error, undefined);
    const state = begin(changed.state);
    assert.equal(state.rules.playSeconds, playSeconds);
    assert.equal(getDdzMatchView(state).roundCount, roundCount);
    const playing = applyDdzAction(state, 0, { type: "BID", score: 3 }, 2_000).state;
    assert.equal(playing.deadlineAt, 2_000 + playSeconds * 1_000);
    assert.equal(updateDdzRoomSettings(playing, { roundCount: 1, playSeconds: 60 }).error, "SETTINGS_LOCKED");
  }
  for (const settings of [{ roundCount: 2, playSeconds: 60 }, { roundCount: 6, playSeconds: 20 }, null, []]) {
    assert.equal(updateDdzRoomSettings(initial, settings as DdzRoomSettings).error, "INVALID_SETTINGS");
    assert.throws(() => createDdzState(players, settings as DdzRoomSettings), /INVALID_SETTINGS/);
  }
  assert.deepEqual(getDdzRoomSettings(initial), { roundCount: 6, playSeconds: 60 });
});

test("each allowed match length accumulates exact scores once, then a new match resets while room counters continue", () => {
  for (const roundCount of [1, 3, 6, 12] as const) {
    let state = createDdzState(players, { roundCount, playSeconds: 30 });
    const totals = [0, 0, 0];
    for (let index = 1; index <= roundCount; index++) {
      state = begin(state, (index - 1) % 3);
      assert.equal(state.gameNo, index);
      assert.equal(getDdzMatchView(state).roundIndex, index);
      state = finish(state);
      for (const score of state.result!.scores) totals[score.seat] += score.delta;
      const match = getDdzMatchView(state);
      assert.equal(match.matchNo, 1); assert.equal(match.rounds.length, index);
      assert.deepEqual(match.rounds.map((round) => round.roundIndex), Array.from({ length: index }, (_, n) => n + 1));
      assert.deepEqual(match.players.map((player) => player.totalScore), totals);
      assert.equal(totals.reduce((sum, score) => sum + score, 0), 0);
      assert.equal(match.status, index === roundCount ? "COMPLETE" : "ACTIVE");
      const resultBefore = structuredClone(state);
      assert.deepEqual(recordDdzMatchResult(state), state.match);
      assert.deepEqual(state, resultBefore);
      state = createDdzLobbyState(state, players);
      assert.deepEqual(getDdzMatchView(state), match);
      assert.equal(canChangeDdzRoomSettings(state), index === roundCount);
      if (index !== roundCount) assert.equal(updateDdzRoomSettings(state, { roundCount: 1, playSeconds: 90 }).error, "SETTINGS_LOCKED");
    }
    if (roundCount % 3 === 0) assert.deepEqual(getDdzMatchView(state).players.map((row) => [row.totalScore, row.rank]), [[0, 1], [0, 1], [0, 1]]);
    const previousTurn = state.turnId, previousSeq = state.eventSeq;
    state = begin(state);
    const match = getDdzMatchView(state);
    assert.equal(state.gameNo, roundCount + 1);
    assert.ok(state.turnId > previousTurn); assert.ok(state.eventSeq > previousSeq);
    assert.equal(match.matchNo, 2); assert.equal(match.roundIndex, 1);
    assert.deepEqual(match.rounds, []); assert.deepEqual(match.players.map((row) => row.totalScore), [0, 0, 0]);
  }
});

test("final settings edits apply to the next match without rewriting its completed scoreboard", () => {
  const completed = finish(begin(createDdzState(players, { roundCount: 1, playSeconds: 30 })));
  const final = getDdzMatchView(completed);
  assert.equal(updateDdzRoomSettings(completed, { roundCount: 12, playSeconds: 90 }).error, "SETTINGS_LOCKED");
  const lobby = createDdzLobbyState(completed, players);
  assert.equal(updateDdzRoomSettings(lobby, { roundCount: 1, playSeconds: 30 }).state, lobby);
  const changed = updateDdzRoomSettings(lobby, { roundCount: 12, playSeconds: 90 }).state;
  assert.deepEqual(getDdzMatchView(changed), final);
  const next = begin(changed);
  assert.equal(next.rules.playSeconds, 90); assert.equal(getDdzMatchView(next).roundCount, 12);
});

test("a pending hand cannot be started twice, while result deadline preserves the match for the next round", () => {
  const active = begin(createDdzState(players));
  const incompleteLobby = createDdzLobbyState(active, players);
  assert.equal(startDdzGame(incompleteLobby, 5_000, { deck: deck(), firstBidSeat: 0 }).error, "MATCH_ROUND_PENDING");
  const completed = finish(active);
  const lobby = advanceDdzDeadline(completed, completed.deadlineAt!);
  assert.equal(lobby.phase, "LOBBY");
  assert.deepEqual(getDdzMatchView(lobby), getDdzMatchView(completed));
  const next = begin(lobby);
  assert.equal(getDdzMatchView(next).roundIndex, 2);
  assert.equal(getDdzMatchView(next).matchNo, 1);
  assert.equal(advanceDdzDeadline(lobby, completed.deadlineAt!), lobby);
});

test("cosmetic and roster order changes preserve points; changed accounts or vacant seats reset the entire match", () => {
  const completed = finish(begin(createDdzState(players, { roundCount: 3, playSeconds: 90 })));
  const cosmetics = players.map((player) => ({ ...player, name: `New name ${player.seat}`, catId: "orange" })).reverse();
  const lobby = createDdzLobbyState(completed, cosmetics);
  assert.equal(getDdzMatchView(lobby).roundIndex, 1); assert.equal(getDdzMatchView(lobby).rounds.length, 1);
  assert.equal(getDdzMatchView(lobby).players.find((p) => p.seat === 0)?.totalScore, 12);
  assert.ok(getDdzMatchView(lobby).players.every((player) => player.catId === "orange"));
  for (const roster of [
    players.map((player) => player.seat === 1 ? { ...player, profileId: "new-account" } : player),
    players.slice(0, 2),
    players.map((player) => ({ ...player, seat: (player.seat + 1) % 3 })),
  ]) {
    const reset = createDdzLobbyState(lobby, roster);
    const match = getDdzMatchView(reset);
    assert.equal(match.status, "READY"); assert.equal(match.roundIndex, 0);
    assert.deepEqual(match.players.map((player) => [player.seat, player.name, player.totalScore, player.rank]), roster.map((player) => [player.seat, player.name, 0, 1]));
    assert.deepEqual(match.rounds, []);
    assert.equal(JSON.stringify(match).includes("private-"), false);
    assert.equal(reset.result, null); assert.deepEqual(reset.events, []);
    assert.equal(reset.gameNo, lobby.gameNo); assert.equal(reset.eventSeq, lobby.eventSeq); assert.equal(reset.turnId, lobby.turnId);
    assert.deepEqual(getDdzRoomSettings(reset), { roundCount: 3, playSeconds: 90 });
    assert.equal(canChangeDdzRoomSettings(reset), true);
    const ready = createDdzLobbyState(reset, roster.length === 3 ? roster : players);
    const next = begin(ready);
    assert.equal(getDdzMatchView(next).matchNo, 2); assert.equal(getDdzMatchView(next).roundIndex, 1);
    assert.ok(getDdzMatchView(next).players.every((player) => player.totalScore === 0));
  }
});

test("public match projections and round history contain no private identities or mutable state references", () => {
  const completed = finish(begin(createDdzState(players, { roundCount: 1, playSeconds: 60 })));
  const original = structuredClone(completed);
  const view = getDdzViewerState(completed, 0);
  assert.equal(JSON.stringify(view).includes("private-"), false);
  assert.equal(JSON.stringify(view.match).includes("profileId"), false);
  assert.equal(JSON.stringify(view.match).includes("roster"), false);
  assert.deepEqual(getDdzMatchView(view), view.match);
  assert.deepEqual(view.match.players.map((row) => row.rank), [1, 2, 2]);
  view.settings.roundCount = 12;
  view.match.rounds[0].result.scores[0].delta = 999;
  view.match.players[0].name = "Changed";
  assert.deepEqual(completed, original);
});

test("legacy rooms keep their current clock, finish as one round, and adopt default settings on the next match", () => {
  const legacyLobby = createDdzState(players);
  delete legacyLobby.settings; delete legacyLobby.match;
  legacyLobby.gameNo = 27;
  assert.deepEqual(getDdzRoomSettings(legacyLobby), { roundCount: 6, playSeconds: 60 });
  assert.equal(updateDdzRoomSettings(legacyLobby, { roundCount: 6, playSeconds: 60 }).state, legacyLobby);
  assert.equal(getDdzMatchView(legacyLobby).roundIndex, 0);
  assert.equal(getDdzMatchView(begin(legacyLobby)).roundIndex, 1);

  let active = begin(createDdzState(players));
  delete active.settings; delete active.match;
  active.rules.playSeconds = 30;
  active.gameNo = 27;
  const nextBid = applyDdzAction(active, active.currentSeat!, { type: "BID", score: 3 }, 2_000).state;
  assert.equal(nextBid.deadlineAt, 32_000);
  assert.equal(getDdzMatchView(nextBid).roundCount, 1);
  assert.equal(nextBid.phase, "PLAYING");
  let completed = active;
  completed = finish(completed);
  assert.equal(getDdzMatchView(completed).status, "COMPLETE");
  assert.equal(getDdzMatchView(completed).rounds[0].gameNo, 27);
  delete completed.settings; delete completed.match;
  const legacyResult = getDdzMatchView(completed);
  assert.equal(legacyResult.status, "COMPLETE"); assert.equal(legacyResult.rounds.length, 1);
  const restarted = begin(createDdzLobbyState(completed, players));
  assert.equal(restarted.gameNo, 28); assert.equal(restarted.rules.playSeconds, 60);
  assert.equal(getDdzMatchView(restarted).matchNo, 2); assert.equal(getDdzMatchView(restarted).roundIndex, 1);
  assert.equal(getDdzMatchView(restarted).roundCount, 6);
  assert.deepEqual(getDdzMatchView(restarted).rounds, []);
});
