/* Local practice rules only. Multiplayer must use a server-authoritative engine. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DiceBluffEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const DICE_PER_PLAYER = 5;
  const PLAYER_COUNT = 4;

  function failure(code, reason) { return { ok: false, reason, code }; }
  function reject(validation) {
    const error = new Error(validation.reason);
    error.code = validation.code;
    throw error;
  }
  function turnValidation(state, actor) {
    if (state.phase !== 'bidding') return failure('ROUND_FINISHED', '这一局已经结束。');
    if (!state.order.includes(actor)) return failure('UNKNOWN_PLAYER', '你不在这一桌。');
    if (state.currentPlayer !== actor) return failure('NOT_YOUR_TURN', '还没轮到你。');
    return { ok: true, reason: '', code: null };
  }
  function maxDice(state) { return state.order.length * DICE_PER_PLAYER; }
  function copyState(state) {
    return {
      ...state,
      players: state.players.map(player => ({ name: player.name, values: player.values.slice() })),
      order: state.order.slice(),
      bid: state.bid ? { ...state.bid } : null,
      history: state.history.map(bid => ({ ...bid })),
      result: state.result ? {
        ...state.result,
        bid: { ...state.result.bid },
        counts: state.result.counts.map(count => ({ ...count }))
      } : null
    };
  }

  function createRound(names, randomDie = () => Math.floor(Math.random() * 6) + 1, startingName) {
    if (!Array.isArray(names) || names.length !== PLAYER_COUNT ||
        Array.from(names).some(name => typeof name !== 'string' || !name.trim()) ||
        new Set(names).size !== PLAYER_COUNT) {
      throw new TypeError('本机练习需要四个不同的玩家名字。');
    }
    if (typeof randomDie !== 'function') throw new TypeError('randomDie 必须是函数。');
    const currentPlayer = startingName === undefined ? names[0] : startingName;
    if (!names.includes(currentPlayer)) throw new RangeError('首叫玩家必须在这一桌。');
    const players = names.map(name => ({
      name,
      values: Array.from({ length: DICE_PER_PLAYER }, () => {
        const value = randomDie();
        if (!Number.isInteger(value) || value < 1 || value > 6) {
          throw new RangeError('randomDie 必须返回 1–6 的整数。');
        }
        return value;
      })
    }));
    return { players, order: names.slice(), currentPlayer, bid: null, history: [], phase: 'bidding', result: null };
  }

  function validateBid(state, actor, count, face) {
    const turn = turnValidation(state, actor);
    if (!turn.ok) return turn;
    if (!Number.isInteger(count) || count < state.order.length || count > maxDice(state)) {
      return failure('INVALID_COUNT', '这一桌只能叫 4–20 个。');
    }
    if (!Number.isInteger(face) || face < 2 || face > 6) {
      return failure('INVALID_FACE', '1 点是百搭，请叫 2–6 点。');
    }
    if (state.bid && (count < state.bid.count || (count === state.bid.count && face <= state.bid.face))) {
      return failure('BID_NOT_HIGHER', '数量不变要加点；增加数量后可以换点。');
    }
    return { ok: true, reason: '', code: null };
  }

  function legalBids(state) {
    if (state.phase !== 'bidding') return [];
    const bids = [];
    for (let count = state.order.length; count <= maxDice(state); count++) {
      for (let face = 2; face <= 6; face++) {
        if (!state.bid || count > state.bid.count || (count === state.bid.count && face > state.bid.face)) {
          bids.push({ count, face });
        }
      }
    }
    return bids;
  }

  function placeBid(state, actor, count, face) {
    const validation = validateBid(state, actor, count, face);
    if (!validation.ok) reject(validation);
    const next = copyState(state);
    next.bid = { count, face, caller: actor };
    next.history.push({ ...next.bid });
    next.currentPlayer = next.order[(next.order.indexOf(actor) + 1) % next.order.length];
    return next;
  }

  function challenge(state, actor) {
    const validation = turnValidation(state, actor);
    if (!validation.ok) reject(validation);
    if (!state.bid) reject(failure('NO_BID', '还没有人叫点，先叫一个。'));
    const next = copyState(state);
    const counts = next.players.map(player => ({
      name: player.name,
      count: player.values.filter(value => value === 1 || value === next.bid.face).length
    }));
    const total = counts.reduce((sum, player) => sum + player.count, 0);
    const callerWins = total >= next.bid.count;
    next.phase = 'settled';
    next.currentPlayer = null;
    next.result = {
      bid: { ...next.bid }, challenger: actor,
      winner: callerWins ? next.bid.caller : actor,
      loser: callerWins ? actor : next.bid.caller,
      total, counts
    };
    return next;
  }

  // Estimate unknown dice, never inspect opponents' hands. Two of six faces
  // match any legal call: its own face and the wildcard 1.
  function atLeastProbability(needed, unknown) {
    if (needed <= 0) return 1;
    if (needed > unknown) return 0;
    let term = Math.pow(2 / 3, unknown);
    let below = 0;
    for (let hits = 0; hits < needed; hits++) {
      below += term;
      term *= (unknown - hits) / (hits + 1) / 2;
    }
    return Math.max(0, Math.min(1, 1 - below));
  }
  function chooseBotAction(state, actor, randomFn = Math.random) {
    const validation = turnValidation(state, actor);
    if (!validation.ok) reject(validation);
    const legal = legalBids(state);
    if (!legal.length) return { type: 'challenge' };

    const self = state.players.find(player => player.name === actor);
    if (!self) reject(failure('UNKNOWN_PLAYER', '你不在这一桌。'));
    const own = self.values;
    const unknown = (state.order.length - 1) * DICE_PER_PLAYER;
    const support = face => own.filter(value => value === 1 || value === face).length;
    const plausibility = bid => atLeastProbability(bid.count - support(bid.face), unknown);
    const draw = () => {
      const value = randomFn();
      if (!Number.isFinite(value)) throw new RangeError('randomFn 必须返回有限数值。');
      return Math.max(0, Math.min(1 - Number.EPSILON, value));
    };

    if (state.bid) {
      const challengeChance = Math.max(0.03, Math.min(0.94, 0.96 - plausibility(state.bid)));
      if (draw() < challengeChance) return { type: 'challenge' };
    }

    // Prefer nearby legal bids, sometimes push one count further. Fixed random
    // draws make this policy reproducible and independent of hidden opponents.
    const minimumCount = legal[0].count;
    const candidates = legal.filter(bid => bid.count <= minimumCount + 1);
    const ranked = candidates.map(bid => ({
      ...bid,
      score: plausibility(bid) + support(bid.face) * 0.045 - (bid.count - minimumCount) * 0.11
    })).sort((a, b) => b.score - a.score || a.count - b.count || a.face - b.face);
    const choice = ranked[Math.floor(draw() * Math.min(3, ranked.length))];
    return { type: 'bid', count: choice.count, face: choice.face };
  }

  return Object.freeze({ createRound, validateBid, placeBid, challenge, legalBids, chooseBotAction });
});
