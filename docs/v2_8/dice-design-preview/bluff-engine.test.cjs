'use strict';
const assert = require('node:assert/strict');
const E = require('./bluff-engine.js');
const names = ['我', '小鹿', '猫猫', '桃桃'];
function round(hands, starter = '桃桃') {
  const values = hands.flat();
  let index = 0;
  return E.createRound(names, () => values[index++], starter);
}
function freeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
  return value;
}
const hands = [
  [3, 1, 4, 5, 2], [1, 4, 4, 6, 2], [3, 2, 4, 5, 6], [3, 4, 2, 6, 5]
];
let tests = 0;
function check(name, run) { run(); tests++; console.log('PASS ' + name); }

check('create validates inputs and preserves the requested turn order', () => {
  const state = round(hands);
  assert.deepEqual(state.order, names);
  assert.equal(state.currentPlayer, '桃桃');
  assert.equal(state.players.flatMap(player => player.values).length, 20);
  assert.throws(() => E.createRound(['我', '我', '猫猫', '桃桃']), TypeError);
  assert.throws(() => E.createRound([, '小鹿', '猫猫', '桃桃']), TypeError);
  assert.throws(() => E.createRound(['我', '小鹿', , '桃桃']), TypeError);
  assert.throws(() => E.createRound(names, () => 7), RangeError);
  assert.throws(() => E.createRound(names, () => 2, '不存在'), RangeError);
});

check('illegal, wildcard, fractional and out-of-turn calls are rejected', () => {
  const state = round(hands);
  for (const [actor, count, face, code] of [
    ['我', 4, 3, 'NOT_YOUR_TURN'], ['陌生人', 4, 3, 'UNKNOWN_PLAYER'],
    ['桃桃', 3, 3, 'INVALID_COUNT'], ['桃桃', 21, 3, 'INVALID_COUNT'],
    ['桃桃', 4.5, 3, 'INVALID_COUNT'], ['桃桃', 4, 1, 'INVALID_FACE'],
    ['桃桃', 4, 7, 'INVALID_FACE'], ['桃桃', 4, 2.5, 'INVALID_FACE']
  ]) {
    assert.equal(E.validateBid(state, actor, count, face).code, code);
    assert.throws(() => E.placeBid(state, actor, count, face), error => error.code === code);
  }
  assert.throws(() => E.challenge(state, '桃桃'), error => error.code === 'NO_BID');
});

check('same count must increase face; increasing count can lower the face', () => {
  const state = E.placeBid(round(hands), '桃桃', 5, 4);
  assert.equal(state.currentPlayer, '我');
  assert.equal(E.validateBid(state, '我', 5, 3).ok, false);
  assert.equal(E.validateBid(state, '我', 5, 4).ok, false);
  assert.equal(E.validateBid(state, '我', 5, 5).ok, true);
  assert.equal(E.validateBid(state, '我', 6, 2).ok, true);
  const next = E.placeBid(state, '我', 6, 2);
  assert.equal(next.currentPlayer, '小鹿');
  assert.deepEqual(next.history, [{count: 5, face: 4, caller: '桃桃'}, {count: 6, face: 2, caller: '我'}]);
});

check('20 of 6 leaves only challenge; finished rounds reject all actions', () => {
  const state = E.placeBid(round(hands), '桃桃', 20, 6);
  assert.deepEqual(E.legalBids(state), []);
  assert.deepEqual(E.chooseBotAction(state, '我', () => 0.99), {type: 'challenge'});
  const result = E.challenge(state, '我');
  assert.equal(result.currentPlayer, null);
  assert.deepEqual(E.legalBids(result), []);
  assert.throws(() => E.placeBid(result, '我', 20, 6), error => error.code === 'ROUND_FINISHED');
  assert.throws(() => E.challenge(result, '我'), error => error.code === 'ROUND_FINISHED');
});

check('wildcards count once and equality awards the caller', () => {
  const result = E.challenge(E.placeBid(round(hands), '桃桃', 5, 3), '我').result;
  assert.equal(result.total, 5);
  assert.deepEqual(result.counts, [
    {name: '我', count: 2}, {name: '小鹿', count: 1}, {name: '猫猫', count: 1}, {name: '桃桃', count: 1}
  ]);
  assert.equal(result.winner, '桃桃');
  assert.equal(result.loser, '我');
  assert.equal(result.challenger, '我');
});

check('both sides can win, including callers and challengers other than the local player', () => {
  const loss = E.challenge(E.placeBid(round(hands), '桃桃', 6, 3), '我').result;
  assert.equal(loss.winner, '我');
  assert.equal(loss.loser, '桃桃');
  const botCaller = E.placeBid(round(hands, '小鹿'), '小鹿', 4, 4);
  const callerWins = E.challenge(botCaller, '猫猫').result;
  assert.equal(callerWins.winner, '小鹿');
  assert.equal(callerWins.loser, '猫猫');
  const botBluff = E.placeBid(round(hands, '小鹿'), '小鹿', 20, 2);
  const botWins = E.challenge(botBluff, '猫猫').result;
  assert.equal(botWins.winner, '猫猫');
  assert.equal(botWins.loser, '小鹿');
  assert.throws(() => E.challenge(botCaller, '我'), error => error.code === 'NOT_YOUR_TURN');
});

check('placing and challenging do not mutate or share mutable state with the prior snapshot', () => {
  const original = freeze(round(hands));
  const before = JSON.stringify(original);
  const called = E.placeBid(original, '桃桃', 4, 3);
  freeze(called);
  const calledBefore = JSON.stringify(called);
  const settled = E.challenge(called, '我');
  settled.players[0].values[0] = 6;
  settled.history[0].count = 19;
  settled.result.bid.count = 20;
  assert.equal(JSON.stringify(original), before);
  assert.equal(JSON.stringify(called), calledBefore);
});

check('bot decisions ignore all other hands, even when reading them would throw', () => {
  const state = E.placeBid(round(hands), '桃桃', 7, 3);
  const changed = structuredClone(state);
  changed.players.forEach(player => { if (player.name !== '我') player.values = [1, 1, 1, 1, 1]; });
  for (const randomValue of [0, 0.2, 0.7, 0.99]) {
    assert.deepEqual(E.chooseBotAction(state, '我', () => randomValue), E.chooseBotAction(changed, '我', () => randomValue));
  }
  const guarded = {...state, players: state.players.map(player => player.name === '我' ? player : {
    name: player.name, get values() { throw new Error('Bot read an opponent hand'); }
  })};
  assert.deepEqual(E.chooseBotAction(state, '我', () => 0.8), E.chooseBotAction(guarded, '我', () => 0.8));
});

check('seeded practice rounds always terminate with legal actions and exactly one winner', () => {
  let seed = 987654321;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let game = 0; game < 100; game++) {
    let state = E.createRound(names, () => Math.floor(random() * 6) + 1, names[game % 4]);
    let moves = 0;
    while (state.phase === 'bidding') {
      const actor = state.currentPlayer;
      const action = E.chooseBotAction(state, actor, random);
      if (action.type === 'bid') {
        assert.equal(E.validateBid(state, actor, action.count, action.face).ok, true);
        state = E.placeBid(state, actor, action.count, action.face);
      } else {
        assert.notEqual(state.bid, null);
        state = E.challenge(state, actor);
      }
      assert.ok(++moves <= 86, 'A call must strictly advance until challenge');
    }
    assert.notEqual(state.result.winner, state.result.loser);
    assert.ok(names.includes(state.result.winner));
    assert.ok(state.result.total >= 0 && state.result.total <= 20);
  }
});

console.log(`${tests} rule checks passed, including 100 seeded complete practice rounds.`);
