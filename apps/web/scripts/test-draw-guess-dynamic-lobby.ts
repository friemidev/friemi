import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  createDrawGuessRoom,
  getDrawGuessRoomView,
  joinDrawGuessRoom,
  setDrawGuessRoomReady,
  startDrawGuessRoom,
  updateDrawGuessRoomSettings,
} from "../features/game-tools/drawGuessRoomServer";

if (!process.env.DATABASE_URL?.includes("dryhbxognbrljslzciuh") || !process.env.DIRECT_URL?.includes("dryhbxognbrljslzciuh")) {
  throw new Error("This check requires the isolated draw-and-guess Preview database.");
}

async function main() {
  const profileIds: string[] = [];
  const roomIds: string[] = [];
  try {
    for (const number of [1, 2]) {
      const profile = await prisma.userProfile.create({
        data: { clerkUserId: `draw-guess-lobby-${randomUUID()}`, nickname: `Lobby test ${number}` },
      });
      profileIds.push(profile.id);
    }
    const created = await createDrawGuessRoom({ hostId: profileIds[0], hostName: "Lobby test 1", locale: "zh-CN", mode: "CHAIN" });
    assert.ok(created.room);
    const roomId = created.room.id;
    roomIds.push(roomId);
    const initial = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(initial.room);
    assert.equal(initial.room.autoSize, true);
    assert.equal(initial.room.canStart, false);
    assert.equal(initial.room.seats.length, 1);
    assert.deepEqual(await updateDrawGuessRoomSettings(roomId, profileIds[1], { wordBankId: "animals-zh" }), { error: "HOST_ONLY" });
    assert.deepEqual(await updateDrawGuessRoomSettings(roomId, profileIds[0], { wordBankId: "animals-zh", timing: { drawSeconds: 90, guessSeconds: 40 } }), { ok: true });
    const configured = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(configured.room);
    assert.equal(configured.room.wordBank?.id, "animals-zh");
    assert.deepEqual(configured.room.view.timing, { drawSeconds: 90, guessSeconds: 40 });
    assert.deepEqual(await joinDrawGuessRoom({ code: created.room.code, profileId: profileIds[1], displayName: "Lobby test 2" }), { roomId });
    assert.deepEqual(await startDrawGuessRoom(roomId, profileIds[0]), { error: "WAIT_FOR_READY" });
    assert.deepEqual(await setDrawGuessRoomReady(roomId, profileIds[0], true), { ok: true });
    assert.deepEqual(await setDrawGuessRoomReady(roomId, profileIds[1], true), { ok: true });
    const ready = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(ready.room);
    assert.equal(ready.room.canStart, true);
    assert.deepEqual(await updateDrawGuessRoomSettings(roomId, profileIds[0], { wordBankId: "animals-zh", timing: { drawSeconds: 90, guessSeconds: 40 } }), { ok: true });
    const unchanged = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(unchanged.room);
    assert.equal(unchanged.room.canStart, true);
    assert.deepEqual(await updateDrawGuessRoomSettings(roomId, profileIds[0], { timing: { drawSeconds: 30, guessSeconds: 20 } }), { ok: true });
    const changed = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(changed.room);
    assert.equal(changed.room.canStart, false);
    assert.ok(changed.room.seats.every((seat) => !seat.ready));
    assert.deepEqual(await setDrawGuessRoomReady(roomId, profileIds[0], true), { ok: true });
    assert.deepEqual(await setDrawGuessRoomReady(roomId, profileIds[1], true), { ok: true });
    assert.deepEqual(await startDrawGuessRoom(roomId, profileIds[0]), { ok: true });
    const started = await getDrawGuessRoomView(roomId, profileIds[0]);
    assert.ok(started.room);
    assert.equal(started.room.playerCount, 3);
    assert.equal(started.room.practiceBotSeat, 2);
    assert.equal(started.room.seats.length, 3);
    assert.equal(started.room.view.phase, "CHAIN_WORD");
    assert.deepEqual(await joinDrawGuessRoom({ code: created.room.code, profileId: profileIds[1], displayName: "Lobby test 2" }), { roomId });
    const third = await prisma.userProfile.create({ data: { clerkUserId: `draw-guess-lobby-${randomUUID()}`, nickname: "Lobby test 3" } });
    profileIds.push(third.id);
    const classic = await createDrawGuessRoom({ hostId: profileIds[0], hostName: "Lobby test 1", locale: "zh-CN", mode: "CLASSIC" });
    assert.ok(classic.room);
    roomIds.push(classic.room.id);
    for (const index of [1, 2]) {
      await joinDrawGuessRoom({ code: classic.room.code, profileId: profileIds[index], displayName: `Lobby test ${index + 1}` });
    }
    for (const profileId of profileIds) assert.deepEqual(await setDrawGuessRoomReady(classic.room.id, profileId, true), { ok: true });
    assert.deepEqual(await startDrawGuessRoom(classic.room.id, profileIds[0]), { ok: true });
    const classicView = await getDrawGuessRoomView(classic.room.id, profileIds[0]);
    assert.ok(classicView.room);
    assert.equal(classicView.room.playerCount, 3);
    assert.equal(classicView.room.practiceBotSeat, undefined);
    assert.equal(classicView.room.view.phase, "WORD_SELECT");
    process.stdout.write("Dynamic lobby: settings, ready gate, two-player relay and three-player classic passed\n");
  } finally {
    for (const id of roomIds) await prisma.gameToolRoom.delete({ where: { id } });
    for (const id of profileIds) await prisma.userProfile.delete({ where: { id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
