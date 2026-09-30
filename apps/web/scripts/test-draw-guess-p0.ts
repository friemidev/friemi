import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DrawGuessAction, DrawGuessState } from "../features/game-tools/drawGuessEngine";
import type { DrawGuessRoomView } from "../features/game-tools/components/DrawGuessRoomClient";

const testUrl = process.env.DRAW_GUESS_TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set DRAW_GUESS_TEST_DATABASE_URL to an isolated local PostgreSQL database.");
const parsedUrl = new URL(testUrl);
if (parsedUrl.protocol !== "postgresql:" || !["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
  throw new Error("The P0 integration script only accepts a local PostgreSQL database.");
}
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
process.env.DRAW_GUESS_CLASSIC_ENABLED = "false";
process.env.DRAW_GUESS_CHAIN_ENABLED = "true";
process.env.VERCEL_ENV = "preview";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const { getChainActor, getChainStageCount } = await import("../features/game-tools/drawGuessEngine");
const stamp = randomUUID();
const stroke = { color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] };
let group = 0;

async function profiles(count: number) {
  const groupId = group++;
  return Promise.all(Array.from({ length: count }, (_, index) => prisma.userProfile.create({
    data: { clerkUserId: `draw-guess-p0-${stamp}-${groupId}-${index}`, nickname: `P0-${count}-${index}` },
  })));
}

async function roomFor(count: number, concurrentJoin = false) {
  const players = await profiles(count);
  const created = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: count });
  if (!("room" in created) || !created.room) throw new Error(JSON.stringify(created));
  const joins = players.slice(1).map((player) => () => server.joinDrawGuessRoom({ code: created.room.code, profileId: player.id, displayName: player.nickname }));
  const joined = concurrentJoin ? await Promise.all(joins.map((join) => join())) : [];
  if (!concurrentJoin) for (const join of joins) joined.push(await join());
  for (const result of joined) assert.ok("roomId" in result, JSON.stringify(result));
  const dbRoom = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: created.room.id }, include: { seats: true, members: true } });
  assert.deepEqual(dbRoom.seats.map((seat) => seat.seatNumber).sort((a, b) => a - b), Array.from({ length: count }, (_, index) => index + 1));
  assert.equal(dbRoom.members.length, count);
  const bySeat = dbRoom.seats.sort((a, b) => a.seatNumber - b.seatNumber).map((seat) => {
    const player = players.find((candidate) => candidate.id === seat.profileId);
    assert.ok(player);
    return player;
  });
  for (const player of bySeat) assert.deepEqual(await server.setDrawGuessRoomReady(created.room.id, player.id, true), { ok: true });
  return { id: created.room.id, players: bySeat };
}

async function view(roomId: string, playerId: string) {
  const result = await server.getDrawGuessRoomView(roomId, playerId);
  if (!("room" in result) || !result.room) throw new Error(JSON.stringify(result));
  return result.room as DrawGuessRoomView;
}

async function command(roomId: string, playerId: string, action: DrawGuessAction, commandId = randomUUID()) {
  const current = await view(roomId, playerId);
  const input = {
    action, commandId, expectedChainStage: current.view.chainStage,
    expectedPhase: current.view.phase, expectedTurnIndex: current.view.turnIndex,
    gameNumber: current.view.gameNumber, profileId: playerId, roomId,
  };
  const result = await server.commandDrawGuessRoom(input);
  assert.ok("ok" in result, `${JSON.stringify(action)}: ${JSON.stringify(result)}`);
  return { input, result };
}

async function fullChain(count: number) {
  const { id, players } = await roomFor(count, count === 8);
  const stranger = await prisma.userProfile.create({ data: { clerkUserId: `draw-guess-p0-${stamp}-stranger-${count}`, nickname: "Stranger" } });
  assert.deepEqual(await server.getDrawGuessRoomView(id, stranger.id), { error: "NOT_A_PLAYER" });
  assert.deepEqual(await server.getDrawGuessHistory(id, stranger.id), { error: "NOT_A_PLAYER" });
  assert.deepEqual(await server.startDrawGuessRoom(id, players[1].id), { error: "HOST_ONLY" });
  assert.deepEqual(await server.startDrawGuessRoom(id, players[0].id), { ok: true });

  let firstWord: Awaited<ReturnType<typeof command>> | null = null;
  for (let owner = 0; owner < count; owner += 1) {
    const current = await view(id, players[owner].id);
    assert.equal(current.view.phase, "CHAIN_WORD");
    assert.equal("chains" in current.view, false);
    const word = current.view.task?.options?.[0];
    assert.ok(word);
    const submitted = await command(id, players[owner].id, { type: "SUBMIT_STEP", value: word });
    if (owner === 0) firstWord = submitted;
  }
  assert.ok(firstWord);
  assert.deepEqual(await server.commandDrawGuessRoom({ ...firstWord.input, commandId: randomUUID() }), { error: "STALE_PHASE" });
  assert.deepEqual(await server.commandDrawGuessRoom(firstWord.input), firstWord.result);
  for (let stage = 1; stage <= getChainStageCount(count); stage += 1) {
    if (count === 8 && stage === 1) {
      const contexts = await Promise.all(Array.from({ length: count }, (_, owner) => view(id, players[getChainActor(owner, stage, count)].id)));
      const parallel = await Promise.all(contexts.map((current, owner) => server.commandDrawGuessRoom({
        action: { type: "SUBMIT_STEP", strokes: [stroke] },
        commandId: randomUUID(), expectedChainStage: current.view.chainStage,
        expectedPhase: current.view.phase, expectedTurnIndex: current.view.turnIndex,
        gameNumber: current.view.gameNumber, profileId: players[getChainActor(owner, stage, count)].id, roomId: id,
      })));
      for (const result of parallel) assert.ok("ok" in result, JSON.stringify(result));
      continue;
    }
    for (let owner = 0; owner < count; owner += 1) {
      const actor = getChainActor(owner, stage, count);
      assert.notEqual(actor, owner);
      const current = await view(id, players[actor].id);
      assert.equal(current.view.phase, "CHAIN_STEP");
      assert.equal(current.view.chainStage, stage);
      assert.equal("chains" in current.view, false);
      assert.ok("task" in current.view && current.view.task?.owner === owner);
      assert.equal(current.view.task?.previous?.kind, stage % 2 ? "WORD" : "DRAWING");
      await command(id, players[actor].id, stage % 2
        ? { type: "SUBMIT_STEP", strokes: [stroke] }
        : { type: "SUBMIT_STEP", value: `词语${owner}` });
    }
  }
  const firstVote = await command(id, players[0].id, { type: "VOTE", owner: 0, value: true });
  const repeatedVote = await server.commandDrawGuessRoom(firstVote.input);
  assert.deepEqual(repeatedVote, firstVote.result);
  const privateVote = await view(id, players[1].id);
  assert.equal(privateVote.view.phase, "REVEAL_VOTE");
  assert.equal(privateVote.view.voteCounts, null);
  assert.equal("votes" in privateVote.view, false);
  for (let owner = 0; owner < count; owner += 1) {
    for (let voter = 0; voter < count; voter += 1) {
      if (owner === 0 && voter === 0) continue;
      await command(id, players[voter].id, { type: "VOTE", owner, value: true });
    }
  }
  const voteResult = await view(id, players[0].id);
  assert.equal(voteResult.view.phase, "AUTHOR_PICK");
  assert.deepEqual(voteResult.view.voteCounts, Array.from({ length: count }, () => ({ yes: count, no: 0, abstain: 0 })));
  for (let owner = 0; owner < count; owner += 1) {
    await command(id, players[owner].id, { type: "PICK", owner, step: 1 });
  }
  const finished = await view(id, players[0].id);
  assert.equal(finished.view.phase, "FINISHED");
  assert.equal(finished.view.scores.length, count);
  assert.deepEqual(finished.view.scores, Array(count).fill(count <= 6 ? 320 : 400));
  assert.equal(await prisma.drawGuessRound.count({ where: { roomId: id } }), 1);
  const history = await server.getDrawGuessHistory(id, players[1].id);
  if (!("rounds" in history) || !history.rounds) throw new Error(JSON.stringify(history));
  assert.equal(history.rounds.length, 1);
  assert.equal(history.rounds[0].chains?.length, count);
  assert.deepEqual(history.rounds[0].scores, finished.view.scores);
  assert.deepEqual(history.rounds[0].voteCounts, Array.from({ length: count }, () => ({ yes: count, no: 0, abstain: 0 })));

  const oldCommand = { ...firstVote.input, commandId: randomUUID() };
  const rematch = await server.rematchDrawGuessRoom(id, players[0].id);
  assert.deepEqual(rematch, { ok: true, gameNumber: 2 });
  const next = await view(id, players[1].id);
  assert.equal(next.view.phase, "CHAIN_WORD");
  assert.equal(next.view.gameNumber, 2);
  assert.deepEqual(next.view.scores, Array(count).fill(0));
  assert.deepEqual(await server.commandDrawGuessRoom(oldCommand), { error: "STALE_GAME" });
  assert.deepEqual(await server.rematchDrawGuessRoom(id, players[0].id), { error: "GAME_NOT_FINISHED" });
  assert.equal(await prisma.drawGuessRound.count({ where: { roomId: id } }), 1);
  console.log(`PASS ${count} players: complete chain, privacy, scoring, archive, rematch`);
}

async function deadlineAndHostRecovery() {
  const { id, players } = await roomFor(5);
  const current = await view(id, players[0].id);
  assert.equal(current.isHost, true);
  await prisma.gameToolRoomMember.updateMany({
    where: { roomId: id, profileId: players[0].id },
    data: { lastSeenAt: new Date(Date.now() - 120_000) },
  });
  const successor = await view(id, players[1].id);
  assert.equal(successor.isHost, true);
  assert.deepEqual(await server.startDrawGuessRoom(id, players[0].id), { error: "HOST_ONLY" });
  assert.deepEqual(await server.startDrawGuessRoom(id, players[1].id), { ok: true });
  const room = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id } });
  const state = room.state as unknown as DrawGuessState;
  const expired = new Date(Date.now() - 86_400_000).toISOString();
  state.deadlineAt = expired;
  await prisma.gameToolRoom.update({ where: { id }, data: { state: state as never, drawGuessDeadlineAt: new Date(expired) } });
  const [first, second] = await Promise.all([server.sweepDueDrawGuessRooms(), server.sweepDueDrawGuessRooms()]);
  assert.equal(first.errors + second.errors, 0);
  assert.ok(first.advanced + second.advanced >= 1);
  const after = await view(id, players[1].id);
  assert.equal(after.view.phase, "FINISHED");
  assert.equal(await prisma.drawGuessRound.count({ where: { roomId: id } }), 1);
  assert.equal((await server.sweepDueDrawGuessRooms()).advanced, 0);

  const late = await roomFor(5);
  assert.deepEqual(await server.startDrawGuessRoom(late.id, late.players[0].id), { ok: true });
  const lateView = await view(late.id, late.players[0].id);
  const fallbackWord = lateView.view.task?.options?.[0];
  assert.ok(fallbackWord);
  const lateRoom = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: late.id } });
  const lateState = lateRoom.state as unknown as DrawGuessState;
  const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
  lateState.deadlineAt = oneSecondAgo;
  await prisma.gameToolRoom.update({ where: { id: late.id }, data: { state: lateState as never, drawGuessDeadlineAt: new Date(oneSecondAgo) } });
  const rejected = await server.commandDrawGuessRoom({
    action: { type: "SUBMIT_STEP", value: "太晚提交" }, commandId: randomUUID(),
    expectedChainStage: lateView.view.chainStage, expectedPhase: lateView.view.phase,
    expectedTurnIndex: lateView.view.turnIndex, gameNumber: lateView.view.gameNumber,
    profileId: late.players[0].id, roomId: late.id,
  });
  assert.deepEqual(rejected, { error: "PHASE_ENDED" });
  const advanced = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: late.id } });
  const advancedState = advanced.state as unknown as DrawGuessState;
  assert.equal(advancedState.phase, "CHAIN_STEP");
  assert.deepEqual(advancedState.chains[0][0], { kind: "WORD", seat: 0, system: true, value: fallbackWord });
  console.log("PASS host failover, fully offline deadline progression, concurrent sweep idempotency");
}

async function previewDuoRelay() {
  const players = await profiles(2);
  const invalid = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 3 });
  assert.deepEqual(invalid, { error: "INVALID_PLAYER_COUNT" });
  const created = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 2 });
  if (!("room" in created) || !created.room) throw new Error(JSON.stringify(created));
  const id = created.room.id;
  let current = await view(id, players[0].id);
  assert.equal(current.playerCount, 3);
  assert.equal(current.practiceBotSeat, 2);
  assert.deepEqual(current.seats.map((seat) => seat.number), [1, 3]);
  assert.equal(current.seats[1].isSystem, true);
  assert.deepEqual(await server.startDrawGuessRoom(id, players[0].id), { error: "WAIT_FOR_PLAYERS" });
  assert.ok("roomId" in await server.joinDrawGuessRoom({ code: created.room.code, profileId: players[1].id, displayName: players[1].nickname }));
  current = await view(id, players[0].id);
  assert.deepEqual(current.seats.map((seat) => seat.number), [1, 2, 3]);
  assert.deepEqual(await server.startDrawGuessRoom(id, players[0].id), { error: "WAIT_FOR_READY" });
  for (const player of players) assert.deepEqual(await server.setDrawGuessRoomReady(id, player.id, true), { ok: true });
  assert.deepEqual(await server.startDrawGuessRoom(id, players[0].id), { ok: true });
  for (let seat = 0; seat < 2; seat += 1) {
    const word = (await view(id, players[seat].id)).view.task?.options?.[0];
    assert.ok(word);
    await command(id, players[seat].id, { type: "SUBMIT_STEP", value: word });
  }
  current = await view(id, players[0].id);
  assert.equal(current.view.phase, "CHAIN_STEP");
  assert.equal(current.view.chainStage, 1);
  for (let seat = 0; seat < 2; seat += 1) await command(id, players[seat].id, { type: "SUBMIT_STEP", strokes: [stroke] });
  current = await view(id, players[0].id);
  assert.equal(current.view.chainStage, 2);
  for (let seat = 0; seat < 2; seat += 1) await command(id, players[seat].id, { type: "SUBMIT_STEP", value: `猜词${seat}` });
  current = await view(id, players[0].id);
  assert.equal(current.view.phase, "REVEAL_VOTE");
  for (let owner = 0; owner < 3; owner += 1) {
    for (let seat = 0; seat < 2; seat += 1) await command(id, players[seat].id, { type: "VOTE", owner, value: true });
  }
  current = await view(id, players[0].id);
  assert.equal(current.view.phase, "AUTHOR_PICK");
  assert.deepEqual(current.view.voteCounts, Array.from({ length: 3 }, () => ({ yes: 2, no: 0, abstain: 1 })));
  await command(id, players[0].id, { type: "PICK", owner: 0, step: 1 });
  current = await view(id, players[0].id);
  assert.equal(current.view.phase, "FINISHED");
  assert.equal(current.view.scores[2], 0);
  assert.equal(await prisma.drawGuessRound.count({ where: { roomId: id } }), 1);
  assert.deepEqual(await server.rematchDrawGuessRoom(id, players[0].id), { ok: true, gameNumber: 2 });
  current = await view(id, players[0].id);
  assert.equal(current.practiceBotSeat, 2);
  assert.equal(current.view.phase, "CHAIN_WORD");
  process.env.VERCEL_ENV = "production";
  try {
    assert.deepEqual(await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 2 }), { error: "INVALID_PLAYER_COUNT" });
  } finally { process.env.VERCEL_ENV = "preview"; }
  console.log("PASS Preview two-person relay: system seat, full game, human voting, rematch, production guard");
}

try {
  const closed = await server.createDrawGuessRoom({ hostId: "irrelevant", hostName: "X", locale: "zh-CN", mode: "CLASSIC", playerCount: 5 });
  assert.deepEqual(closed, { error: "CLASSIC_NOT_ENABLED" });
  for (const count of [5, 6, 7, 8]) await fullChain(count);
  await deadlineAndHostRecovery();
  await previewDuoRelay();
  console.log("P0 isolated database integration checks passed.");
} finally {
  await prisma.$disconnect();
}
