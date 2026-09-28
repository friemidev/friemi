import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DrawGuessAction, DrawGuessState } from "../features/game-tools/drawGuessEngine";

const testUrl = process.env.DRAW_GUESS_TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set DRAW_GUESS_TEST_DATABASE_URL to an isolated local database.");
const parsedUrl = new URL(testUrl);
if (parsedUrl.protocol !== "postgresql:" || !["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
  throw new Error("The P1 integration script only accepts local PostgreSQL.");
}
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const reports = await import("../features/game-tools/drawGuessReports");
const { getFinishedDrawGuessArtworkForMember } = await import("../features/game-tools/drawGuessArtworkAccess");
const { maintainDrawGuessData } = await import("../features/game-tools/drawGuessMaintenance");
const stroke = { color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] };
const stamp = randomUUID();

async function view(roomId: string, profileId: string) {
  const result = await server.getDrawGuessRoomView(roomId, profileId);
  if (!("room" in result) || !result.room) throw new Error(JSON.stringify(result));
  return result.room;
}

async function command(roomId: string, profileId: string, action: DrawGuessAction) {
  const current = await view(roomId, profileId);
  const result = await server.commandDrawGuessRoom({
    action, commandId: randomUUID(), expectedChainStage: current.view.chainStage,
    expectedPhase: current.view.phase, expectedTurnIndex: current.view.turnIndex,
    gameNumber: current.view.gameNumber, profileId, roomId,
  });
  assert.ok("ok" in result, JSON.stringify(result));
}

async function run() {
  const players = await Promise.all(Array.from({ length: 5 }, (_, index) => prisma.userProfile.create({
    data: { clerkUserId: `draw-guess-p1-${stamp}-${index}`, nickname: `P1-${index}` },
  })));
  const outsider = await prisma.userProfile.create({ data: { clerkUserId: `draw-guess-p1-${stamp}-outsider`, nickname: "Outsider" } });
  const created = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 5 });
  if (!("room" in created) || !created.room) throw new Error(JSON.stringify(created));
  const roomId = created.room.id;
  for (const player of players.slice(1)) {
    const joined = await server.joinDrawGuessRoom({ code: created.room.code, profileId: player.id, displayName: player.nickname });
    assert.ok("roomId" in joined);
  }
  assert.deepEqual(await server.startDrawGuessRoom(roomId, players[0].id), { ok: true });
  for (let index = 0; index < 5; index += 1) await command(roomId, players[index].id, { type: "SUBMIT_STEP", value: `词语${index}` });
  assert.deepEqual(await reports.reportDrawGuessContent({ ownerSeat: 0, profileId: players[2].id, reason: "OTHER", roomId, roundNumber: 1, stage: 0, targetKind: "WORD" }), { error: "NOT_REVEALED" });

  await command(roomId, players[1].id, { type: "SAVE_DRAFT", strokes: [stroke] });
  const draft = await prisma.drawGuessArtwork.findUniqueOrThrow({ where: { roomId_roundNumber_ownerSeat_stage: { roomId, roundNumber: 1, ownerSeat: 0, stage: 1 } } });
  assert.equal(draft.submittedAt, null);
  assert.deepEqual(draft.strokes, [stroke]);
  assert.ok(draft.previewPng && draft.previewBytes > 0 && Buffer.from(draft.previewPng).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  const compactDraft = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  assert.deepEqual((compactDraft.state as unknown as DrawGuessState).drafts, {});
  const restored = await view(roomId, players[1].id);
  assert.ok("task" in restored.view && restored.view.task?.kind === "DRAWING");
  assert.deepEqual(restored.view.task?.draft, [stroke]);

  await command(roomId, players[1].id, { type: "SUBMIT_STEP", strokes: [stroke] });
  const finalWork = await prisma.drawGuessArtwork.findUniqueOrThrow({ where: { roomId_roundNumber_ownerSeat_stage: { roomId, roundNumber: 1, ownerSeat: 0, stage: 1 } } });
  assert.ok(finalWork.submittedAt);
  assert.equal(await getFinishedDrawGuessArtworkForMember({ artworkId: finalWork.id, profileId: players[0].id, roomId }), null);
  const compact = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const compactState = compact.state as unknown as DrawGuessState;
  assert.deepEqual(compactState.commandResults, {});
  assert.deepEqual(compactState.chains[0][1], { kind: "DRAWING", seat: 1, system: false, value: [] });
  assert.ok(await prisma.drawGuessCommand.count({ where: { roomId, roundNumber: 1 } }) >= 7);

  const expired = new Date(Date.now() - 86_400_000).toISOString();
  compactState.deadlineAt = expired;
  await prisma.gameToolRoom.update({ where: { id: roomId }, data: { state: compactState as never, drawGuessDeadlineAt: new Date(expired) } });
  assert.deepEqual(await server.advanceDrawGuessRoom(roomId), { advanced: true, phase: "FINISHED" });
  const history = await server.getDrawGuessHistory(roomId, players[0].id);
  if (!("rounds" in history) || !history.rounds) throw new Error(JSON.stringify(history));
  assert.deepEqual(history.rounds[0].chains?.[0][1], { kind: "DRAWING", seat: 1, system: false, value: [stroke] });
  assert.ok(history.rounds[0].artworkUrls["0:1"]?.includes(finalWork.id));
  const archive = await prisma.drawGuessRound.findUniqueOrThrow({ where: { roomId_roundNumber: { roomId, roundNumber: 1 } } });
  assert.deepEqual((archive.state as unknown as DrawGuessState).chains[0][1], { kind: "DRAWING", seat: 1, system: false, value: [] });
  assert.ok(await getFinishedDrawGuessArtworkForMember({ artworkId: finalWork.id, profileId: players[0].id, roomId }));
  assert.equal(await getFinishedDrawGuessArtworkForMember({ artworkId: finalWork.id, profileId: outsider.id, roomId }), null);

  assert.deepEqual(await reports.reportDrawGuessContent({ ownerSeat: 0, profileId: outsider.id, reason: "OTHER", roomId, roundNumber: 1, stage: 0, targetKind: "WORD" }), { error: "NOT_A_PLAYER" });
  const report = await reports.reportDrawGuessContent({ ownerSeat: 0, profileId: players[2].id, reason: "INAPPROPRIATE", roomId, roundNumber: 1, stage: 0, targetKind: "WORD" });
  if (!("ok" in report) || !report.reportId) throw new Error(JSON.stringify(report));
  assert.deepEqual(await reports.reportDrawGuessContent({ ownerSeat: 0, profileId: players[2].id, reason: "OTHER", roomId, roundNumber: 1, stage: 0, targetKind: "WORD" }), { error: "ALREADY_REPORTED" });
  const artReport = await reports.reportDrawGuessContent({ ownerSeat: 0, profileId: players[2].id, reason: "OTHER", roomId, roundNumber: 1, stage: 1, targetKind: "DRAWING" });
  if (!("ok" in artReport) || !artReport.reportId) throw new Error(JSON.stringify(artReport));
  await prisma.drawGuessReport.createMany({ data: Array.from({ length: 7 }, (_, index) => ({
    ownerSeat: 0, reason: "OTHER", reporterProfileId: players[2].id, roomId, roundNumber: 1,
    snapshot: { testFixture: true }, stage: index + 2, status: "DISMISSED", targetKind: "WORD",
  })) });
  const quotaRace = await Promise.all([1, 2].map((ownerSeat) => reports.reportDrawGuessContent({
    ownerSeat, profileId: players[2].id, reason: "OTHER", roomId, roundNumber: 1, stage: 0, targetKind: "WORD",
  })));
  assert.equal(quotaRace.filter((item) => "ok" in item).length, 1);
  assert.equal(quotaRace.filter((item) => "error" in item && item.error === "RATE_LIMITED").length, 1);
  const quotaWinner = quotaRace.find((item): item is { ok: true; reportId: string } => "ok" in item);
  assert.ok(quotaWinner);
  assert.deepEqual(await reports.reviewDrawGuessReport({ id: quotaWinner.reportId, reviewerProfileId: players[0].id, status: "REVIEWED", note: "Quota test" }), { ok: true });
  assert.ok((await reports.listOpenDrawGuessReports()).some((item) => item.id === report.reportId));
  assert.deepEqual(await reports.reviewDrawGuessReport({ id: report.reportId, reviewerProfileId: players[0].id, status: "REVIEWED", note: "Reviewed in local test" }), { ok: true });
  assert.deepEqual(await reports.reviewDrawGuessReport({ id: report.reportId, reviewerProfileId: players[0].id, status: "DISMISSED", note: "Duplicate review" }), { error: "NOT_OPEN" });

  process.env.DRAW_GUESS_CHAIN_ENABLED = "false";
  assert.deepEqual(await server.createDrawGuessRoom({ hostId: players[0].id, hostName: "P1", locale: "zh-CN", mode: "CHAIN", playerCount: 5 }), { error: "CHAIN_NOT_ENABLED" });
  process.env.DRAW_GUESS_CHAIN_ENABLED = "true";
  const cleanup = await maintainDrawGuessData(Date.now());
  assert.deepEqual(cleanup, { commandsDeleted: 0, draftsDeleted: 0, roomsDeleted: 0 });
  const future = Date.now() + 366 * 86_400_000;
  await maintainDrawGuessData(future);
  assert.ok(await prisma.gameToolRoom.findUnique({ where: { id: roomId } }), "An open report must preserve its room and artwork.");
  assert.deepEqual(await reports.reviewDrawGuessReport({ id: artReport.reportId, reviewerProfileId: players[0].id, status: "DISMISSED", note: "Reviewed in local test" }), { ok: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!await prisma.gameToolRoom.findUnique({ where: { id: roomId } })) break;
    await maintainDrawGuessData(future);
  }
  assert.equal(await prisma.gameToolRoom.findUnique({ where: { id: roomId } }), null);

  const legacyCreated = await server.createDrawGuessRoom({ hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 5 });
  if (!("room" in legacyCreated) || !legacyCreated.room) throw new Error(JSON.stringify(legacyCreated));
  const legacyRoomId = legacyCreated.room.id;
  for (const player of players.slice(1)) {
    const joined = await server.joinDrawGuessRoom({ code: legacyCreated.room.code, profileId: player.id, displayName: player.nickname });
    assert.ok("roomId" in joined);
  }
  assert.deepEqual(await server.startDrawGuessRoom(legacyRoomId, players[0].id), { ok: true });
  for (let index = 0; index < 5; index += 1) await command(legacyRoomId, players[index].id, { type: "SUBMIT_STEP", value: `旧词${index}` });
  await command(legacyRoomId, players[1].id, { type: "SUBMIT_STEP", strokes: [stroke] });
  const legacyStored = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: legacyRoomId } });
  const legacyState = legacyStored.state as unknown as DrawGuessState;
  delete legacyState.storageVersion;
  legacyState.phase = "FINISHED";
  legacyState.deadlineAt = null;
  legacyState.chains[0][1].value = [stroke];
  const legacyCommandId = randomUUID();
  legacyState.commandResults = { [legacyCommandId]: {} };
  await prisma.$transaction(async (tx) => {
    await tx.drawGuessArtwork.deleteMany({ where: { roomId: legacyRoomId } });
    await tx.gameToolRoom.update({ where: { id: legacyRoomId }, data: { status: "FINISHED", state: legacyState as never, drawGuessDeadlineAt: null } });
    await tx.drawGuessRound.create({ data: { roomId: legacyRoomId, roundNumber: 1, mode: "CHAIN", state: legacyState as never, finishedAt: new Date() } });
  });
  assert.deepEqual(await server.rematchDrawGuessRoom(legacyRoomId, players[0].id), { ok: true, gameNumber: 2 });
  const migrated = await prisma.drawGuessArtwork.findUniqueOrThrow({
    where: { roomId_roundNumber_ownerSeat_stage: { roomId: legacyRoomId, roundNumber: 1, ownerSeat: 0, stage: 1 } },
  });
  assert.deepEqual(migrated.strokes, [stroke]);
  assert.ok(migrated.previewPng);
  assert.ok(await prisma.drawGuessCommand.findUnique({ where: { roomId_roundNumber_commandId: { roomId: legacyRoomId, roundNumber: 1, commandId: legacyCommandId } } }));
  await prisma.gameToolRoom.delete({ where: { id: legacyRoomId } });
  console.log("P1 isolated checks passed: compact state, private preview bytes, recovery, reports, review, rollback, cleanup, legacy rematch migration.");
}

try { await run(); }
finally { await prisma.$disconnect(); }
