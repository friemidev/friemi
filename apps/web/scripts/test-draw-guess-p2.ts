import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const previewRef = "dryhbxognbrljslzciuh";
if (!process.env.DATABASE_URL?.includes(previewRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(previewRef)) {
  throw new Error("P2 probe only runs against the isolated draw-and-guess Preview project.");
}
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("connection_limit", "10");
process.env.DATABASE_URL = databaseUrl.toString();
process.env.DRAW_GUESS_CLASSIC_ENABLED = "true";

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const { getDrawGuessInkTopic } = await import("../features/game-tools/drawGuessRealtime");
const { broadcastDrawGuessInk, getDrawGuessInkSequence, reserveDrawGuessInkSequence } = await import("../features/game-tools/drawGuessInkServer");
const stamp = randomUUID();
const players: { id: string; clerkUserId: string; nickname: string }[] = [];
let roomId: string | null = null;

async function canRead(clerkUserId: string, topic: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: clerkUserId })}, true)`;
    await tx.$queryRaw`SELECT set_config('realtime.topic', ${topic}, true)`;
    const rows = await tx.$queryRaw<{ allowed: boolean }[]>`SELECT public.draw_guess_can_read_ink_topic() AS allowed`;
    return rows[0]?.allowed ?? false;
  });
}

try {
  for (let index = 0; index < 4; index += 1) {
    const player = await prisma.userProfile.create({
      data: { clerkUserId: `draw-guess-p2-${stamp}-${index}`, nickname: `P2-${index}` },
    });
    players.push(player);
  }
  const created = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "en", mode: "CLASSIC", playerCount: 3 });
  assert.ok("room" in created && created.room);
  roomId = created.room.id;
  for (const player of players.slice(1, 3)) {
    const joined = await server.joinDrawGuessRoom({ code: created.room.code, profileId: player.id, displayName: player.nickname });
    assert.ok("roomId" in joined);
  }
  assert.deepEqual(await server.startDrawGuessRoom(roomId, players[0].id), { ok: true });
  const wordView = await server.getDrawGuessRoomView(roomId, players[0].id);
  assert.ok("room" in wordView && wordView.room);
  assert.equal(wordView.room.mode, "CLASSIC");
  assert.ok("options" in wordView.room.view);
  const selected = await server.commandDrawGuessRoom({
    action: { type: "CHOOSE_WORD", value: wordView.room.view.options[0] }, commandId: randomUUID(), expectedChainStage: 0,
    expectedPhase: "WORD_SELECT", expectedTurnIndex: 0, gameNumber: 1, profileId: players[0].id, roomId,
  });
  assert.ok("ok" in selected);
  const topic = getDrawGuessInkTopic(roomId, 1, 0);
  assert.equal(await canRead(players[0].clerkUserId, topic), true);
  assert.equal(await canRead(players[1].clerkUserId, topic), true);
  assert.equal(await canRead(players[3].clerkUserId, topic), false);
  assert.equal(await canRead(players[1].clerkUserId, getDrawGuessInkTopic(roomId, 2, 0)), false);
  assert.equal(await canRead(players[1].clerkUserId, getDrawGuessInkTopic(roomId, 1, 1)), false);
  const first = await reserveDrawGuessInkSequence(roomId, 1, 0, players[0].id);
  const second = await reserveDrawGuessInkSequence(roomId, 1, 0, players[0].id);
  assert.ok(typeof first.seq === "number");
  assert.ok(typeof second.seq === "number");
  assert.equal(second.seq, first.seq + 1);
  assert.equal(await getDrawGuessInkSequence(roomId, 1, 0), second.seq);
  const stroke = { color: "#123456", width: 4, points: [[0.1, 0.2], [0.3, 0.4]] as [number, number][] };
  assert.equal(await broadcastDrawGuessInk({ gameNumber: 1, roomId, seq: second.seq, stroke, strokeIndex: 0, turnIndex: 0 }), true);
  const saved = await server.commandDrawGuessRoom({
    action: { type: "SAVE_CLASSIC_DRAFT", strokes: [stroke], inkSeq: first.seq }, commandId: randomUUID(), expectedChainStage: 0,
    expectedPhase: "DRAW_GUESS", expectedTurnIndex: 0, gameNumber: 1, profileId: players[0].id, roomId,
  });
  assert.ok("ok" in saved);
  const guestView = await server.getDrawGuessRoomView(roomId, players[1].id);
  assert.ok("room" in guestView && guestView.room);
  assert.ok("inkSeq" in guestView.room.view);
  assert.equal(guestView.room.view.inkSeq, first.seq);
  assert.deepEqual(guestView.room.view.drawing, [stroke]);
  assert.equal(guestView.room.view.answer, null);
  const stale = await server.commandDrawGuessRoom({
    action: { type: "SAVE_CLASSIC_DRAFT", strokes: [], inkSeq: first.seq - 1 }, commandId: randomUUID(), expectedChainStage: 0,
    expectedPhase: "DRAW_GUESS", expectedTurnIndex: 0, gameNumber: 1, profileId: players[0].id, roomId,
  });
  assert.deepEqual(stale, { error: "STALE_INK_DRAFT" });
  const future = await server.commandDrawGuessRoom({
    action: { type: "SAVE_CLASSIC_DRAFT", strokes: [], inkSeq: second.seq + 1 }, commandId: randomUUID(), expectedChainStage: 0,
    expectedPhase: "DRAW_GUESS", expectedTurnIndex: 0, gameNumber: 1, profileId: players[0].id, roomId,
  });
  assert.deepEqual(future, { error: "STALE_INK_DRAFT" });
  const afterRejected = await server.getDrawGuessRoomView(roomId, players[1].id);
  assert.ok("room" in afterRejected && afterRejected.room);
  assert.ok("inkSeq" in afterRejected.room.view);
  assert.equal(afterRejected.room.view.inkSeq, first.seq);
  assert.deepEqual(afterRejected.room.view.drawing, [stroke]);
  const artwork = await prisma.drawGuessArtwork.findUnique({
    where: { roomId_roundNumber_ownerSeat_stage: { roomId, roundNumber: 1, ownerSeat: 0, stage: 0 } },
  });
  assert.ok(artwork && artwork.previewBytes > 0);
  console.log("P2 Preview probe passed: private topic membership, round isolation, Redis sequence, private DB broadcast, draft and answer privacy.");
} finally {
  if (roomId) await prisma.gameToolRoom.delete({ where: { id: roomId } }).catch(() => undefined);
  for (const player of players) await prisma.userProfile.delete({ where: { id: player.id } }).catch(() => undefined);
  await prisma.$disconnect();
}
