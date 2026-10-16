import assert from "node:assert/strict";
import test from "node:test";
import { advanceDdzDeadline, applyDdzAction, beatsDdzPlay, classifyDdzPlay, createDdzDeck, createDdzState, getDdzViewerState, listDdzHints, settleDdzGame, startDdzGame, type DdzAction, type DdzPlay, type DdzState } from "./doudizhuEngine";

const deck = createDdzDeck();
const ids = (...ranks: number[]) => {
  const used = new Map<number, number>();
  return ranks.map((rank) => {
    const index = used.get(rank) ?? 0;
    used.set(rank, index + 1);
    return deck.filter((card) => card.rank === rank)[index]?.id ?? `invalid-${rank}-${index}`;
  });
};
const allIds = () => deck.map((card) => card.id);
function start(firstBidSeat = 0) {
  const lobby = createDdzState([0, 1, 2].map((seat) => ({ seat, name: `Player ${seat}`, profileId: `private-profile-${seat}`, catId: "scholar" })));
  return startDdzGame(lobby, 100, { deck: allIds(), firstBidSeat }).state;
}
function act(state: DdzState, action: DdzAction, seat = state.currentSeat!, now = 200) {
  const result = applyDdzAction(state, seat, action, now, allIds);
  assert.equal(result.error, undefined);
  return result.state;
}
function playState(hand: number[], otherHands = [[5, 6], [7, 8]]) {
  let state = act(start(), { type: "BID", score: 3 });
  state.hands = { 0: ids(...hand), 1: ids(...otherHands[0]), 2: ids(...otherHands[1]) };
  return state;
}
function assertConservation(state: DdzState) {
  const cards = [...Object.values(state.hands).flat(), ...state.playedCards, ...(state.phase === "BIDDING" ? state.bottomCards : [])];
  assert.equal(cards.length, 54);
  assert.equal(new Set(cards).size, 54);
  assert.deepEqual([...cards].sort(), allIds().sort());
}

test("54-card deck is unique with four of each ordinary rank and two distinct jokers", () => {
  assert.equal(deck.length, 54);
  assert.equal(new Set(allIds()).size, 54);
  for (let rank = 3; rank <= 15; rank++) assert.equal(deck.filter((card) => card.rank === rank).length, 4);
  assert.equal(deck.filter((card) => card.suit === null).length, 2);
  const a = createDdzDeck(); a[0].rank = 99;
  assert.equal(createDdzDeck()[0].rank, 3);
});

test("all fourteen canonical patterns classify with deterministic card order", () => {
  const examples: [DdzPlay["type"], number[]][] = [
    ["SINGLE", [17]], ["PAIR", [15, 15]], ["TRIPLE", [8, 8, 8]], ["TRIPLE_SINGLE", [8, 8, 8, 17]],
    ["TRIPLE_PAIR", [8, 8, 8, 15, 15]], ["STRAIGHT", [10, 11, 12, 13, 14]], ["PAIR_STRAIGHT", [3, 3, 4, 4, 5, 5]],
    ["AIRPLANE", [3, 3, 3, 4, 4, 4]], ["AIRPLANE_SINGLE", [3, 3, 3, 4, 4, 4, 15, 16]],
    ["AIRPLANE_PAIR", [3, 3, 3, 4, 4, 4, 5, 5, 15, 15]], ["FOUR_TWO_SINGLE", [4, 4, 4, 4, 5, 5]],
    ["FOUR_TWO_PAIR", [4, 4, 4, 4, 5, 5, 6, 6]], ["BOMB", [15, 15, 15, 15]], ["ROCKET", [16, 17]],
  ];
  for (const [type, ranks] of examples) {
    assert.equal(classifyDdzPlay(ids(...ranks))?.type, type);
    assert.deepEqual(classifyDdzPlay(ids(...ranks)), classifyDdzPlay(ids(...ranks).reverse()));
  }
});

test("wing restrictions, chain limits, duplicate IDs and fabricated cards are rejected", () => {
  const invalid = [
    [3, 4, 5, 6], [11, 12, 13, 14, 15], [3, 3, 4, 4], [13, 13, 14, 14, 15, 15],
    [3, 3, 3, 4, 4, 4, 5, 5], // single wings must have different ranks
    [3, 3, 3, 4, 4, 4, 16, 17],
    [3, 3, 3, 3, 4, 4, 4, 5], // fourth core card cannot be a wing
    [3, 3, 3, 4, 4, 4, 5, 5, 5, 5], // a quad cannot supply two pair wings
    [4, 4, 4, 4, 16, 17], [4, 4, 4, 4, 5, 5, 5, 5],
  ];
  for (const ranks of invalid) assert.equal(classifyDdzPlay(ids(...ranks)), null, ranks.join());
  assert.equal(classifyDdzPlay(["c3", "c3"]), null);
  assert.equal(classifyDdzPlay(["unissued-card"]), null);
  assert.equal(classifyDdzPlay([]), null);
});

test("ordinary comparisons require equal shape and length; bombs and rocket override", () => {
  const p = (...ranks: number[]) => classifyDdzPlay(ids(...ranks))!;
  assert.equal(beatsDdzPlay(p(4), p(3)), true);
  assert.equal(beatsDdzPlay(p(4, 4), p(3)), false);
  assert.equal(beatsDdzPlay(p(4, 5, 6, 7, 8, 9), p(3, 4, 5, 6, 7)), false);
  assert.equal(beatsDdzPlay(p(4, 4, 4, 5), p(3, 3, 3, 17)), true);
  assert.equal(beatsDdzPlay(p(3, 3, 3, 3), p(17)), true);
  assert.equal(beatsDdzPlay(p(3, 3, 3, 3, 4, 5), p(17)), false);
  assert.equal(beatsDdzPlay(p(16, 17), p(15, 15, 15, 15)), true);
  assert.equal(beatsDdzPlay(p(16, 17), p(16, 17)), false);
});

test("start enforces exactly three fixed seats and an authentic complete deck", () => {
  const lobby = createDdzState([{ seat: 0, name: "A" }]);
  assert.equal(startDdzGame(lobby, 0, { deck: allIds(), firstBidSeat: 0 }).error, "INVALID_PLAYERS");
  const ready = createDdzState([0, 1, 2].map((seat) => ({ seat, name: "A" })));
  assert.equal(startDdzGame(ready, 0, { deck: [...allIds().slice(1), "c4"], firstBidSeat: 0 }).error, "INVALID_DECK");
  assert.equal(startDdzGame(ready, 0, { deck: allIds(), firstBidSeat: 3 }).error, "INVALID_DECK");
  const state = start(2);
  assert.equal(state.phase, "BIDDING"); assert.equal(state.currentSeat, 2);
  assert.equal(state.deadlineAt, 20_100); assert.equal(state.gameNo, 1);
  assert.deepEqual(Object.values(state.hands).map((hand) => hand.length), [17, 17, 17]);
  assertConservation(state);
  assert.equal(ready.phase, "LOBBY");
});

test("bids rise, each seat acts once and 3 immediately awards the bottom cards", () => {
  let state = start();
  state = act(state, { type: "BID", score: 1 });
  assert.equal(applyDdzAction(state, 1, { type: "BID", score: 1 }, 200).error, "INVALID_BID");
  assert.equal(applyDdzAction(state, 0, { type: "BID", score: 2 }, 200).error, "NOT_YOUR_TURN");
  state = act(state, { type: "BID", score: 3 });
  assert.equal(state.landlordSeat, 1); assert.equal(state.currentSeat, 1); assert.equal(state.phase, "PLAYING");
  assert.equal(state.hands[1].length, 20); assert.equal(state.bid.bids.length, 2);
  assertConservation(state);
});

test("new games use a 60-second play clock while active saved 30-second games keep their rules", () => {
  const lobby = createDdzState([0, 1, 2].map((seat) => ({ seat, name: `P${seat}` })));
  assert.deepEqual(lobby.rules, { bidSeconds: 20, playSeconds: 60, managedSeconds: 4, resultSeconds: 60, multiplierCap: 64 });
  lobby.rules.playSeconds = 30;
  const started = startDdzGame(lobby, 100, { deck: allIds(), firstBidSeat: 0 }).state;
  assert.equal(started.rules.playSeconds, 60);
  assert.equal(lobby.rules.playSeconds, 30);
  assert.equal(started.deadlineAt, 20_100);
  let playing = act(started, { type: "BID", score: 3 }, 0, 200);
  assert.equal(playing.deadlineAt, 60_200);
  playing = act(playing, { type: "PLAY", cardIds: [playing.hands[0][0]] }, 0, 300);
  assert.equal(playing.deadlineAt, 60_300);

  const saved = structuredClone(playing);
  saved.rules.playSeconds = 30;
  saved.deadlineAt = 30_300;
  const continued = act(saved, { type: "PASS" }, 1, 400);
  assert.equal(continued.rules.playSeconds, 30);
  assert.equal(continued.deadlineAt, 30_400);
  assert.equal(saved.deadlineAt, 30_300);
});

test("highest bid wins after three and all-pass redeals twice then uses third starter", () => {
  let scored = act(start(), { type: "BID", score: 2 });
  scored = act(act(scored, { type: "BID", score: 0 }), { type: "BID", score: 0 });
  assert.equal(scored.landlordSeat, 0); assert.equal(scored.bid.highestScore, 2);
  let state = start();
  for (let i = 0; i < 9; i++) {
    state = act(state, { type: "BID", score: 0 });
    assertConservation(state);
    if (i === 2) { assert.equal(state.dealNo, 2); assert.equal(state.currentSeat, 1); }
    if (i === 5) { assert.equal(state.dealNo, 3); assert.equal(state.currentSeat, 2); }
  }
  assert.equal(state.phase, "PLAYING"); assert.equal(state.landlordSeat, 2); assert.equal(state.bid.highestScore, 1);
  assert.equal(state.gameNo, 1);
});

test("redeal needs injected randomness and rejected bids cannot mutate the old state", () => {
  const state = act(act(start(), { type: "BID", score: 0 }), { type: "BID", score: 0 });
  const before = structuredClone(state);
  assert.equal(applyDdzAction(state, 2, { type: "BID", score: 0 }, 200).error, "RANDOMNESS_REQUIRED");
  assert.equal(applyDdzAction(state, 2, { type: "BID", score: 0 }, 200, () => ["c3"]).error, "INVALID_DECK");
  assert.deepEqual(state, before);
});

test("first lead cannot pass, two passes return free lead to last successful player", () => {
  let state = playState([3, 4]);
  assert.equal(applyDdzAction(state, 0, { type: "PASS" }, 200).error, "MUST_LEAD");
  state = act(state, { type: "PLAY", cardIds: ids(3), handVersion: state.handVersions[0] });
  const trick = state.trickId;
  state = act(state, { type: "PASS" });
  state = act(state, { type: "PASS" });
  assert.equal(state.currentSeat, 0); assert.equal(state.targetPlay, null); assert.equal(state.trickId, trick + 1);
  assert.equal(applyDdzAction(state, 0, { type: "PASS" }, 200).error, "MUST_LEAD");
});

test("stale hand, unowned card, duplicate card and illegal shape reject without consuming cards", () => {
  const state = playState([3, 4]);
  const original = structuredClone(state);
  assert.equal(applyDdzAction(state, 0, { type: "PLAY", cardIds: ids(3), handVersion: 999 }, 200).error, "STALE_HAND");
  assert.equal(applyDdzAction(state, 0, { type: "PLAY", cardIds: ids(5) }, 200).error, "CARD_NOT_FOUND");
  assert.equal(applyDdzAction(state, 0, { type: "PLAY", cardIds: ["c3", "c3"] }, 200).error, "INVALID_COMBINATION");
  assert.equal(applyDdzAction(state, 0, { type: "PLAY", cardIds: ids(3, 4) }, 200).error, "INVALID_COMBINATION");
  assert.deepEqual(state, original);
});

test("a final bomb counts before spring settlement; farmers share zero-sum victory", () => {
  let state = playState([3, 3, 3, 3]);
  state = act(state, { type: "PLAY", cardIds: ids(3, 3, 3, 3) });
  assert.equal(state.phase, "RESULT"); assert.equal(state.result?.spring, "spring"); assert.equal(state.result?.multiplier, 4);
  assert.deepEqual(state.result?.scores.map((score) => score.delta), [24, -12, -12]);
  assert.equal(applyDdzAction(state, 1, { type: "PASS" }, 200).error, "WRONG_PHASE");
  assert.deepEqual(settleDdzGame(state, 2, 999), state.result);
  let farmers = playState([3, 4], [[5], [7, 8]]);
  farmers = act(farmers, { type: "PLAY", cardIds: ids(3) });
  farmers = act(farmers, { type: "PLAY", cardIds: ids(5) });
  assert.equal(farmers.result?.winnerSide, "farmers"); assert.equal(farmers.result?.spring, "antiSpring");
  assert.deepEqual(farmers.result?.scores.map((score) => score.delta), [-12, 6, 6]);
  assert.equal(farmers.result?.scores.reduce((sum, score) => sum + score.delta, 0), 0);
});

test("four-with-two never multiplies and the total multiplier is capped at 64", () => {
  let state = playState([3, 3, 3, 3, 4, 4, 9]);
  state = act(state, { type: "PLAY", cardIds: ids(3, 3, 3, 3, 4, 4) });
  assert.equal(state.bombCount, 0); assert.equal(state.multiplier, 1);
  state.bombCount = 6;
  state.playCounts = { 0: 2, 1: 0, 2: 0 };
  const result = settleDdzGame(state, 0, 500);
  assert.equal(result.multiplier, 64); assert.equal(result.capped, true);
  assert.deepEqual(result.scores.map((score) => score.delta), [384, -192, -192]);
});

test("deadline boundary wins over an action and managed control never extends a clock", () => {
  let state = start();
  const deadline = state.deadlineAt!;
  assert.equal(applyDdzAction(state, 0, { type: "BID", score: 3 }, deadline).error, "DEADLINE_EXPIRED");
  assert.equal(advanceDdzDeadline(state, deadline - 1, allIds), state);
  state = advanceDdzDeadline(state, deadline, allIds);
  assert.equal(state.bid.bids[0].score, 0); assert.ok(state.managedSeats.includes(0));
  const currentDeadline = state.deadlineAt;
  state = act(state, { type: "SET_MANAGED", managed: false }, 0, deadline + 1);
  assert.equal(state.deadlineAt, currentDeadline);
  const before = state.turnId;
  state = advanceDdzDeadline(state, 1_000_000, allIds);
  assert.equal(state.turnId, before + 1); assert.equal(state.deadlineAt, 1_020_000);
});

test("a responding timeout always passes, even with a legal whole-hand finish or bomb", () => {
  for (const managed of [false, true]) for (const hand of [[5], [5, 5, 5, 5], [16, 17], [5, 6]]) {
    let state = playState([3, 4], [hand, [7, 8]]);
    if (managed) state = act(state, { type: "SET_MANAGED", managed: true }, 1);
    state = act(state, { type: "PLAY", cardIds: ids(3) });
    const before = structuredClone(state);
    const deadline = state.deadlineAt!;
    assert.equal(deadline, managed ? 4_200 : 60_200);
    assert.equal(advanceDdzDeadline(state, deadline - 1, allIds), state);
    const next = advanceDdzDeadline(state, deadline, allIds);
    assert.equal(next.phase, "PLAYING"); assert.equal(next.result, null);
    assert.equal(next.currentSeat, 2); assert.equal(next.consecutivePasses, 1);
    assert.deepEqual(next.hands, state.hands); assert.deepEqual(next.handVersions, state.handVersions);
    assert.deepEqual(next.playedCards, state.playedCards); assert.deepEqual(next.playCounts, state.playCounts);
    assert.deepEqual(next.targetPlay, state.targetPlay);
    assert.equal(next.bombCount, 0); assert.equal(next.multiplier, 1);
    assert.deepEqual(next.events.slice(-2).map((event) => [event.kind, event.seat]), [["TIMEOUT", 1], ["PASS", 1]]);
    assert.ok(next.managedSeats.includes(1));
    assert.equal(advanceDdzDeadline(next, deadline, allIds), next);
    assert.deepEqual(state, before);
  }
});

test("two timeout passes clear the trick and the next timeout leads only the lowest single", () => {
  let state = playState([4, 3, 3], [[5], [7, 8]]);
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  assert.deepEqual(state.targetPlay?.cardIds, ids(3)); assert.ok(state.managedSeats.includes(0));
  const firstTrick = state.trickId;
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  assert.equal(state.phase, "PLAYING"); assert.equal(state.currentSeat, 0);
  assert.equal(state.targetPlay, null); assert.equal(state.trickId, firstTrick + 1);
  assert.equal(state.consecutivePasses, 0);
  assert.deepEqual(state.hands[1], ids(5));
  assert.deepEqual(state.events.slice(-3).map((event) => event.kind), ["TIMEOUT", "PASS", "TRICK"]);
  const leadAt = state.deadlineAt!;
  assert.equal(applyDdzAction(state, 0, { type: "PASS" }, leadAt - 1).error, "MUST_LEAD");
  state = advanceDdzDeadline(state, leadAt, allIds);
  assert.equal(state.targetPlay?.type, "SINGLE"); assert.equal(state.targetPlay?.mainRank, 3);
  assert.deepEqual(state.hands[0], ids(4));
  assert.equal(state.deadlineAt, leadAt + 4_000);
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  state = advanceDdzDeadline(state, state.deadlineAt!, allIds);
  assert.equal(state.phase, "RESULT"); assert.equal(state.result?.winnerSeat, 0);
});

test("private views never contain opponents' hands, bottom cards, or account IDs before reveal", () => {
  const state = start();
  for (const seat of [0, 1, 2]) {
    const view = getDdzViewerState(state, seat);
    assert.equal(view.hand.length, 17); assert.deepEqual(view.bottomCards, []); assert.equal(view.remainingHands, null);
    const json = JSON.stringify(view);
    assert.equal(json.includes("private-profile"), false);
    for (const opponent of [0, 1, 2].filter((other) => other !== seat)) for (const card of state.hands[opponent]) assert.equal(json.includes(`"${card}"`), false);
    for (const card of state.bottomCards) assert.equal(json.includes(`"${card}"`), false);
    view.hand.pop(); assert.equal(state.hands[seat].length, 17);
  }
  assert.throws(() => getDdzViewerState(state, 9), /NOT_A_PLAYER/);
  const revealed = act(state, { type: "BID", score: 3 });
  assert.deepEqual(getDdzViewerState(revealed, 1).bottomCards.map((card) => card.id), state.bottomCards);
});

test("legal hints use own cards, are deterministic and respect every wing boundary", () => {
  const hand = ids(3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 7, 15, 16, 17);
  const targets = [null, classifyDdzPlay(ids(3))!, classifyDdzPlay(ids(3, 3, 3, 4, 4, 4, 5, 6))!, classifyDdzPlay(ids(16, 17))!];
  for (const target of targets) {
    const hints = listDdzHints(hand, target);
    assert.deepEqual(hints, listDdzHints([...hand].reverse(), target));
    for (const hint of hints) {
      assert.deepEqual(classifyDdzPlay(hint.cardIds), hint);
      assert.ok(hint.cardIds.every((id) => hand.includes(id)));
      assert.ok(beatsDdzPlay(hint, target));
    }
  }
  const hints = listDdzHints(hand, classifyDdzPlay(ids(3, 3, 3, 4, 4, 4, 5, 6))!);
  assert.ok(hints.some((hint) => hint.type === "BOMB"));
  assert.equal(hints.at(-1)?.type, "ROCKET");
  assert.deepEqual(listDdzHints(hand, classifyDdzPlay(ids(16, 17))!), []);
});

test("all-offline games finish with conserved cards, monotonic clocks and exactly one zero-sum result", () => {
  for (let seed = 1; seed <= 24; seed++) {
    let rng = seed;
    const shuffled = () => {
      const cards = allIds();
      for (let i = cards.length - 1; i > 0; i--) {
        rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
        const j = rng % (i + 1); [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      return cards;
    };
    let state = startDdzGame(createDdzState([0, 1, 2].map((seat) => ({ seat, name: `P${seat}` }))), 0, { deck: shuffled(), firstBidSeat: seed % 3 }).state;
    let actions = 0;
    while (state.phase !== "RESULT" && actions++ < 300) {
      assertConservation(state);
      const previousTurn = state.turnId;
      const now = state.deadlineAt!;
      const responding = state.phase === "PLAYING" && state.targetPlay !== null;
      const previousHands = structuredClone(state.hands);
      const previousEvent = state.eventSeq;
      state = advanceDdzDeadline(state, now, shuffled);
      assert.ok(state.turnId > previousTurn);
      assert.ok(state.deadlineAt! > now);
      if (responding) {
        assert.deepEqual(state.hands, previousHands);
        assert.ok(state.events.some((event) => event.id > previousEvent && event.kind === "PASS"));
        assert.equal(state.events.some((event) => event.id > previousEvent && event.kind === "PLAY"), false);
      }
    }
    assert.equal(state.phase, "RESULT"); assertConservation(state);
    assert.equal(actions, 67); // Nine bids, twenty single-card leads, and nineteen pairs of passes.
    assert.equal(state.result!.winnerSeat, state.landlordSeat);
    assert.equal(state.result!.spring, "spring");
    assert.equal(state.result!.bombCount, 0);
    assert.ok(state.players.filter((player) => player.seat !== state.landlordSeat).every((player) => state.hands[player.seat].length === 17));
    assert.equal(state.result!.scores.reduce((sum, row) => sum + row.delta, 0), 0);
    assert.equal(state.events.filter((event) => event.kind === "RESULT").length, 1);
    assert.equal(getDdzViewerState(state, 0).remainingHands!.length, 3);
    const priorTurn = state.turnId;
    state = advanceDdzDeadline(state, state.deadlineAt!, shuffled);
    assert.equal(state.phase, "LOBBY"); assert.equal(state.deadlineAt, null);
    assert.deepEqual(Object.values(state.hands).flat(), []);
    const next = startDdzGame(state, 9_000_000, { deck: shuffled(), firstBidSeat: 0 }).state;
    assert.equal(next.gameNo, 2); assert.ok(next.turnId > priorTurn); assert.equal(next.result, null);
    assertConservation(next);
  }
});

test("hint generation matches a subset oracle for ordinary, bomb and wing responses", () => {
  const hands = [
    ids(3, 3, 3, 4, 4, 4, 5, 5, 6, 7, 16, 17),
    ids(5, 5, 5, 5, 6, 6, 6, 7, 8, 9, 10, 11),
    ids(6, 6, 6, 7, 7, 7, 8, 8, 9, 9, 15, 15),
  ];
  const targets = [[3], [3, 3], [3, 3, 3, 4], [3, 3, 3, 4, 4], [3, 4, 5, 6, 7], [3, 3, 3, 4, 4, 4, 5, 6], [3, 3, 3, 4, 4, 4, 5, 5, 6, 6], [3, 3, 3, 3, 4, 4]];
  const signature = (play: DdzPlay) => `${play.type}:${play.mainRank}:${play.cardIds.map((id) => deck.find((card) => card.id === id)!.rank).sort((a, b) => a - b).join()}`;
  for (const hand of hands) {
    const legal: DdzPlay[] = [];
    for (let mask = 1; mask < 2 ** hand.length; mask++) {
      const play = classifyDdzPlay(hand.filter((_, index) => mask & (1 << index)));
      if (play) legal.push(play);
    }
    for (const ranks of targets) {
      const target = classifyDdzPlay(ids(...ranks))!;
      const expected = [...new Set(legal.filter((play) => beatsDdzPlay(play, target)).map(signature))].sort();
      const actual = [...new Set(listDdzHints(hand, target).map(signature))].sort();
      assert.deepEqual(actual, expected, `${hand.join()} over ${ranks.join()}`);
    }
  }
});

test("managed next turns use four seconds and a manual takeover keeps that deadline", () => {
  let state = playState([3, 9], [[5, 6], [7, 8]]);
  state = act(state, { type: "SET_MANAGED", managed: true }, 1, 300);
  state = act(state, { type: "PLAY", cardIds: ids(3) }, 0, 400);
  assert.equal(state.currentSeat, 1); assert.equal(state.deadlineAt, 4_400);
  state = act(state, { type: "SET_MANAGED", managed: false }, 1, 401);
  assert.equal(state.deadlineAt, 4_400);
  assert.equal(state.managedSeats.includes(1), false);
});
