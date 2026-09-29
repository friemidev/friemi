import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DrawGuessAction } from "../features/game-tools/drawGuessEngine";

if (!process.env.DATABASE_URL?.includes("dryhbxognbrljslzciuh") || !process.env.DIRECT_URL?.includes("dryhbxognbrljslzciuh")) {
  throw new Error("This check requires the isolated draw-and-guess Preview database.");
}
process.env.VERCEL_ENV = "preview";
process.env.DRAW_GUESS_CHAIN_ENABLED = "true";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const stamp = randomUUID();
const playerIds: string[] = [];
let roomId: string | undefined;
const stroke = { color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] };

async function view(profileId: string) {
  const result = await server.getDrawGuessRoomView(roomId!, profileId);
  if (!("room" in result) || !result.room) throw new Error(JSON.stringify(result));
  return result.room;
}

async function command(profileId: string, action: DrawGuessAction) {
  const current = await view(profileId);
  const result = await server.commandDrawGuessRoom({
    action,
    commandId: randomUUID(),
    expectedChainStage: current.view.chainStage,
    expectedPhase: current.view.phase,
    expectedTurnIndex: current.view.turnIndex,
    gameNumber: current.view.gameNumber,
    profileId,
    roomId: roomId!,
  });
  assert.ok("ok" in result, `${JSON.stringify(action)}: ${JSON.stringify(result)}`);
}

try {
  for (let seat = 0; seat < 2; seat += 1) {
    const profile = await prisma.userProfile.create({
      data: { clerkUserId: `draw-guess-preview-duo-${stamp}-${seat}`, nickname: `双人测试 ${seat + 1}` },
    });
    playerIds.push(profile.id);
  }
  const created = await server.createDrawGuessRoom({ hostId: playerIds[0], hostName: "双人测试 1", locale: "zh-CN", mode: "CHAIN", playerCount: 2 });
  if (!("room" in created) || !created.room) throw new Error(JSON.stringify(created));
  roomId = created.room.id;
  let current = await view(playerIds[0]);
  assert.equal(current.practiceBotSeat, 2);
  assert.deepEqual(current.seats.map((seat) => seat.number), [1, 3]);
  assert.deepEqual(await server.startDrawGuessRoom(roomId, playerIds[0]), { error: "WAIT_FOR_PLAYERS" });
  assert.deepEqual(await server.joinDrawGuessRoom({ code: created.room.code, profileId: playerIds[1], displayName: "双人测试 2" }), { roomId });
  current = await view(playerIds[0]);
  assert.deepEqual(current.seats.map((seat) => seat.number), [1, 2, 3]);
  assert.deepEqual(await server.startDrawGuessRoom(roomId, playerIds[0]), { ok: true });
  for (let seat = 0; seat < 2; seat += 1) await command(playerIds[seat], { type: "SUBMIT_STEP", value: `起始词${seat}` });
  current = await view(playerIds[0]);
  assert.equal(current.view.phase, "CHAIN_STEP");
  assert.equal(current.view.chainStage, 1);
  for (let seat = 0; seat < 2; seat += 1) await command(playerIds[seat], { type: "SUBMIT_STEP", strokes: [stroke] });
  current = await view(playerIds[0]);
  assert.equal(current.view.chainStage, 2);
  for (let seat = 0; seat < 2; seat += 1) await command(playerIds[seat], { type: "SUBMIT_STEP", value: `猜词${seat}` });
  current = await view(playerIds[0]);
  assert.equal(current.view.phase, "REVEAL_VOTE");
  for (let owner = 0; owner < 3; owner += 1) {
    for (let seat = 0; seat < 2; seat += 1) await command(playerIds[seat], { type: "VOTE", owner, value: true });
  }
  current = await view(playerIds[0]);
  assert.equal(current.view.phase, "AUTHOR_PICK");
  if (!("voteCounts" in current.view)) throw new Error("Missing vote results");
  assert.deepEqual(current.view.voteCounts, Array.from({ length: 3 }, () => ({ yes: 2, no: 0, abstain: 1 })));
  await command(playerIds[0], { type: "PICK", owner: 0, step: 1 });
  current = await view(playerIds[0]);
  assert.equal(current.view.phase, "FINISHED");
  assert.equal(current.view.scores[2], 0);
  assert.equal(await prisma.drawGuessRound.count({ where: { roomId } }), 1);
  assert.deepEqual(await server.rematchDrawGuessRoom(roomId, playerIds[0]), { ok: true, gameNumber: 2 });
  current = await view(playerIds[0]);
  assert.equal(current.view.phase, "CHAIN_WORD");
  assert.equal(current.practiceBotSeat, 2);
  console.log("PASS Preview dual-human relay from lobby through ranking and rematch");
} finally {
  if (roomId) await prisma.gameToolRoom.deleteMany({ where: { id: roomId } });
  if (playerIds.length) await prisma.userProfile.deleteMany({ where: { id: { in: playerIds } } });
  await prisma.$disconnect();
}
