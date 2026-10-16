import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  createDrawGuessState,
  getDrawGuessVoteCounts,
  setDrawGuessSeatManaged,
  type DrawGuessPhase,
} from "./drawGuessEngine";

const DEADLINE = 10_000;
const COUNT = 5;

function relay(phase: DrawGuessPhase) {
  const state = createDrawGuessState("CHAIN", COUNT, undefined, undefined, 2);
  state.phase = phase;
  state.deadlineAt = new Date(DEADLINE).toISOString();
  state.chains = Array.from({ length: COUNT }, (_, owner) => Array.from({ length: COUNT }, (_, stage) => stage % 2
    ? { kind: "DRAWING" as const, seat: (owner + stage) % COUNT, system: false, value: [] }
    : { kind: "WORD" as const, seat: (owner + stage) % COUNT, system: false, value: "cat" }));
  return state;
}

function matchVote() {
  const state = relay("MATCH_VOTE");
  state.votes["0"] = { "0": true, "1": true, "2": true, "3": false };
  for (let owner = 1; owner < COUNT; owner += 1) {
    state.votes[String(owner)] = { "0": false, "1": false, "2": false, "3": false, "4": false };
  }
  return state;
}

function artworkVote() {
  const state = relay("ARTWORK_VOTE");
  state.artworkVotes = { "0": { "0": 1, "1": 1 }, "1": { "2": 1, "3": 1 } };
  return state;
}

for (const at of [DEADLINE - 1, DEADLINE, DEADLINE + 1]) {
  const beforeDeadline = at < DEADLINE;

  test(`match departure at ${at} changes only an open ballot`, () => {
    const changed = setDrawGuessSeatManaged(matchVote(), 2, true, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.equal(result.phase, "MATCH_RESULT");
    assert.equal(result.matchResults["0"], !beforeDeadline);
    assert.deepEqual(result.matchVoterSeats, beforeDeadline ? [0, 1, 3, 4] : [0, 1, 2, 3, 4]);
    assert.deepEqual(getDrawGuessVoteCounts(result)[0], { yes: beforeDeadline ? 2 : 3, no: 1, abstain: 1 });
    assert.deepEqual(result.managedSeats, [2]);
  });

  test(`match reconnect at ${at} cannot restore a vote after its deadline`, () => {
    const state = matchVote();
    state.managedSeats = [2];
    state.forfeitedChainSeats = [2];
    const changed = setDrawGuessSeatManaged(state, 2, false, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.equal(result.matchResults["0"], beforeDeadline);
    assert.deepEqual(result.matchVoterSeats, beforeDeadline ? [0, 1, 2, 3, 4] : [0, 1, 3, 4]);
    assert.deepEqual(result.managedSeats, []);
    assert.deepEqual(result.forfeitedChainSeats, [2]);
  });

  test(`artwork departure at ${at} cannot change an expired winner or award`, () => {
    const changed = setDrawGuessSeatManaged(artworkVote(), 0, true, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.equal(result.phase, "ARTWORK_RESULT");
    assert.deepEqual(result.picks, beforeDeadline ? { "1": 1 } : { "0": 1 });
    assert.deepEqual(result.scores, beforeDeadline ? [0, 0, 100, 0, 0] : [0, 100, 0, 0, 0]);
    assert.deepEqual(result.artworkVoterSeats, beforeDeadline ? [1, 2, 3, 4] : [0, 1, 2, 3, 4]);
    assert.deepEqual(advanceDrawGuessGame(result, COUNT, DEADLINE + 2, "en").scores, result.scores);
  });

  test(`artwork reconnect at ${at} cannot change an expired winner or award`, () => {
    const state = artworkVote();
    state.managedSeats = [0];
    state.forfeitedChainSeats = [0];
    const changed = setDrawGuessSeatManaged(state, 0, false, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.deepEqual(result.picks, beforeDeadline ? { "0": 1 } : { "1": 1 });
    assert.deepEqual(result.scores, beforeDeadline ? [0, 100, 0, 0, 0] : [0, 0, 100, 0, 0]);
    assert.deepEqual(result.artworkVoterSeats, beforeDeadline ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]);
    assert.deepEqual(result.forfeitedChainSeats, [0]);
  });

  test(`break reconnect at ${at} preserves forfeiture if the new round already started`, () => {
    const state = relay("ROUND_BREAK");
    state.managedSeats = [2];
    state.forfeitedChainSeats = [2];
    state.scores = [20, 40, 0, 40, 40];
    const changed = setDrawGuessSeatManaged(state, 2, false, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.equal(result.phase, "CHAIN_WORD");
    assert.equal(result.roundIndex, 2);
    assert.deepEqual(result.forfeitedChainSeats, beforeDeadline ? [] : [2]);
    assert.deepEqual(result.managedSeats, []);
    assert.equal(result.chains[2][0]?.system, beforeDeadline ? undefined : true);
    assert.deepEqual(result.scores, state.scores);
  });

  test(`break departure at ${at} forfeits the upcoming or current round`, () => {
    const state = relay("ROUND_BREAK");
    state.scores = [20, 40, 60, 40, 40];
    const changed = setDrawGuessSeatManaged(state, 2, true, COUNT, at, "en");
    const result = advanceDrawGuessGame(changed, COUNT, DEADLINE + 1, "en");
    assert.equal(result.roundIndex, 2);
    assert.deepEqual(result.forfeitedChainSeats, [2]);
    assert.deepEqual(result.managedSeats, [2]);
    assert.equal(result.chains[2][0]?.system, true);
    assert.deepEqual(result.scores, state.scores);
  });
}

test("a reconnecting artist may vote again but still earns zero for that round", () => {
  const state = artworkVote();
  state.matchResults = { "0": true };
  const absent = setDrawGuessSeatManaged(state, 1, true, COUNT, 2_000, "en");
  const resumed = setDrawGuessSeatManaged(absent, 1, false, COUNT, 3_000, "en");
  const vote = applyDrawGuessAction(resumed, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, 1, COUNT, 4_000, "en");
  assert.ok(!("error" in vote));
  const result = advanceDrawGuessGame(vote.state, COUNT, DEADLINE, "en");
  assert.deepEqual(result.picks, { "0": 1 });
  assert.deepEqual(result.scores, [20, 0, 40, 40, 40]);
});

test("the last artwork vote settles once before the deadline and is rejected at it", () => {
  const state = artworkVote();
  const accepted = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 1, step: 1 }, 4, COUNT, DEADLINE - 1, "en");
  assert.ok(!("error" in accepted));
  assert.equal(accepted.state.phase, "ARTWORK_RESULT");
  assert.deepEqual(accepted.state.scores, [0, 0, 100, 0, 0]);
  const afterDeparture = setDrawGuessSeatManaged(accepted.state, 0, true, COUNT, DEADLINE, "en");
  assert.deepEqual(afterDeparture.picks, accepted.state.picks);
  assert.deepEqual(afterDeparture.scores, accepted.state.scores);
  const rejected = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 1, step: 1 }, 4, COUNT, DEADLINE, "en");
  assert.equal("error" in rejected ? rejected.error : null, "PHASE_ENDED");
  assert.deepEqual(rejected.state.picks, { "0": 1 });
  assert.deepEqual(rejected.state.scores, [0, 100, 0, 0, 0]);
});

test("presence changes preserve an overdue round-break checkpoint for persistence", () => {
  const state = relay("ARTWORK_RESULT");
  state.managedSeats = [2];
  state.forfeitedChainSeats = [2];
  state.scores = [20, 40, 0, 40, 40];
  for (const managed of [true, false]) {
    const result = setDrawGuessSeatManaged(state, 2, managed, COUNT, DEADLINE + 30_000, "en");
    assert.equal(result.phase, "ROUND_BREAK");
    assert.equal(result.gameNumber, state.gameNumber);
    assert.equal(result.roundIndex, state.roundIndex);
    assert.deepEqual(result.chains, state.chains);
    assert.deepEqual(result.scores, state.scores);
    assert.equal(result.managedSeats?.includes(2), managed);
    assert.equal(Date.parse(result.deadlineAt!), DEADLINE + 5_000);
  }
});
