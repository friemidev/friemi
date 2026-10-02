import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const testUrl = process.env.DRAW_GUESS_TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set DRAW_GUESS_TEST_DATABASE_URL to an isolated local database.");
const parsedUrl = new URL(testUrl);
if (parsedUrl.protocol !== "postgresql:" || !["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
  throw new Error("The retention integration script only accepts local PostgreSQL.");
}
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
process.env.VERCEL_ENV = "preview";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const { maintainDrawGuessData } = await import("../features/game-tools/drawGuessMaintenance");
const stamp = randomUUID();
const DAY = 86_400_000;

async function run() {
  const bank = await prisma.drawGuessWordBank.create({ data: {
    id: `retention-${stamp}`, locale: "zh-CN", title: `Retention ${stamp}`,
    words: ["猫咪", "雨伞", "火车", "蛋糕", "云朵", "星星", "小狗", "苹果", "月亮", "飞机"],
  } });
  const players = await Promise.all(Array.from({ length: 5 }, (_, index) => prisma.userProfile.create({
    data: { clerkUserId: `draw-guess-retention-${stamp}-${index}`, nickname: `Retention-${index}` },
  })));
  const finished = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 5, wordBankId: bank.id });
  if (!("room" in finished) || !finished.room) throw new Error(JSON.stringify(finished));
  const finishedRoom = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: finished.room.id } });
  const finishedState = { ...(finishedRoom.state as Record<string, unknown>), phase: "FINISHED", deadlineAt: null };
  await prisma.gameToolRoom.update({ where: { id: finished.room.id }, data: {
    status: "FINISHED", state: finishedState, finishedAt: new Date(),
  } });
  await prisma.drawGuessArtwork.createMany({ data: [
    { roomId: finished.room.id, roundNumber: 1, ownerSeat: 0, stage: 1, artistSeat: 0, strokes: [], submittedAt: new Date() },
    { roomId: finished.room.id, roundNumber: 1, ownerSeat: 0, stage: 2, artistSeat: 0, strokes: [] },
  ] });
  await prisma.drawGuessCommand.create({ data: { roomId: finished.room.id, roundNumber: 1, commandId: randomUUID(), result: {} } });
  assert.deepEqual(await server.leaveDrawGuessRoom(finished.room.id, players[0].id), { ok: true });
  const saved = await prisma.gameToolRoom.findUniqueOrThrow({
    where: { id: finished.room.id }, include: { members: true, seats: true, drawGuessArtworks: true, drawGuessCommands: true },
  });
  assert.equal(saved.status, "FINISHED");
  assert.equal(saved.members.length, 1, "Finished rooms retain who participated.");
  assert.equal(saved.seats.length, 1);
  assert.equal(saved.drawGuessArtworks.length, 1, "Submitted artwork stays available.");
  assert.ok(saved.drawGuessArtworks[0].submittedAt);
  assert.equal(saved.drawGuessCommands.length, 0, "Live commands are removed after the last member leaves.");

  const abandoned = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 5, wordBankId: bank.id });
  if (!("room" in abandoned) || !abandoned.room) throw new Error(JSON.stringify(abandoned));
  for (const player of players.slice(1)) {
    const joined = await server.joinDrawGuessRoom({ code: abandoned.room.code, profileId: player.id, displayName: player.nickname });
    assert.ok("roomId" in joined);
  }
  for (const player of players) assert.deepEqual(await server.setDrawGuessRoomReady(abandoned.room.id, player.id, true), { ok: true });
  assert.deepEqual(await server.startDrawGuessRoom(abandoned.room.id, players[0].id), { ok: true });
  await prisma.drawGuessArtwork.create({ data: {
    roomId: abandoned.room.id, roundNumber: 1, ownerSeat: 0, stage: 1, artistSeat: 1, strokes: [],
  } });
  for (const player of players) assert.deepEqual(await server.leaveDrawGuessRoom(abandoned.room.id, player.id), { ok: true });
  const empty = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: abandoned.room.id } });
  assert.ok(empty.config && typeof empty.config === "object" && !Array.isArray(empty.config)
    && "drawGuessAbandonedAt" in empty.config, "The last departure starts the reconnect grace period.");
  const cleanup = await maintainDrawGuessData(Date.now() + 2 * DAY);
  assert.equal(cleanup.roomsCleared, 1);
  const retained = await prisma.gameToolRoom.findUniqueOrThrow({
    where: { id: abandoned.room.id }, include: { members: true, seats: true, drawGuessArtworks: true, drawGuessRounds: true },
  });
  assert.equal(retained.status, "CANCELLED");
  assert.equal(retained.state, null);
  assert.equal(retained.members.length, players.length, "Abandoned rooms retain their participant roster.");
  assert.equal(retained.seats.length, players.length);
  assert.equal(retained.drawGuessArtworks.length, 0);
  assert.equal(retained.drawGuessRounds.length, 0);
  assert.deepEqual(await server.joinDrawGuessRoom({ code: abandoned.room.code, profileId: players[0].id, displayName: players[0].nickname }), { error: "ROOM_NOT_FOUND" });

  await maintainDrawGuessData(Date.now() + 370 * DAY);
  assert.equal(await prisma.gameToolRoom.findUnique({ where: { id: finished.room.id } }), null);
  assert.equal(await prisma.gameToolRoom.findUnique({ where: { id: abandoned.room.id } }), null);
  console.log("Draw guess retention checks passed: finished history, abandoned-room cleanup, participant roster, one-year expiry.");
}

try { await run(); }
finally { await prisma.$disconnect(); }
