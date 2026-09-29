import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { DrawGuessState } from "../features/game-tools/drawGuessEngine";
import { DRAW_GUESS_ROOM_EVENT, getDrawGuessRoomTopic } from "../features/game-tools/drawGuessRealtime";

const databaseUrl = process.env.DIRECT_URL;
const expectedDbRef = process.env.DRAW_GUESS_PREVIEW_DB_REF;
if (!databaseUrl || expectedDbRef !== "dryhbxognbrljslzciuh" ||
  new URL(databaseUrl).hostname !== `db.${expectedDbRef}.supabase.co`) {
  throw new Error("Set DIRECT_URL and DRAW_GUESS_PREVIEW_DB_REF for the isolated Preview database.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.DRAW_GUESS_CHAIN_ENABLED = "true";

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/drawGuessRoomServer");
const browserUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const browserKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!browserUrl || !browserKey) throw new Error("Set Preview browser Supabase URL and publishable key to verify Broadcast.");
const realtime = createClient(browserUrl, browserKey, { auth: { persistSession: false } });
const stamp = randomUUID();
const players = await Promise.all(Array.from({ length: 5 }, (_, index) => prisma.userProfile.create({
  data: { clerkUserId: `draw-guess-preview-cron-${stamp}-${index}`, nickname: `Cron probe ${index + 1}` },
})));
let roomId: string | undefined;
let channel: RealtimeChannel | undefined;

try {
  const created = await server.createDrawGuessRoom({
    hostId: players[0].id, hostName: players[0].nickname, locale: "zh-CN", mode: "CHAIN", playerCount: 5,
  });
  assert.ok("room" in created && created.room, JSON.stringify(created));
  roomId = created.room.id;
  for (const player of players.slice(1)) {
    const joined = await server.joinDrawGuessRoom({ code: created.room.code, profileId: player.id, displayName: player.nickname });
    assert.ok("roomId" in joined, JSON.stringify(joined));
  }
  assert.deepEqual(await server.startDrawGuessRoom(roomId, players[0].id), { ok: true });
  const before = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const state = before.state as unknown as DrawGuessState;
  assert.equal(state.phase, "CHAIN_WORD");
  let receivedBroadcast = false;
  channel = realtime.channel(getDrawGuessRoomTopic(roomId))
    .on("broadcast", { event: DRAW_GUESS_ROOM_EVENT }, ({ payload }) => {
      if (payload?.roomId === roomId) receivedBroadcast = true;
    });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Preview Realtime subscription did not connect.")), 10_000);
    channel!.subscribe((status) => {
      if (status === "SUBSCRIBED") { clearTimeout(timeout); resolve(); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timeout); reject(new Error(`Preview Realtime subscription ${status}.`)); }
    });
  });
  const expired = new Date(Date.now() - 1000);
  await prisma.gameToolRoom.update({
    where: { id: roomId },
    data: { drawGuessDeadlineAt: expired, state: { ...state, deadlineAt: expired.toISOString() } as never },
  });

  let advanced = false;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const current = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
    const currentState = current.state as unknown as DrawGuessState;
    if (current.revision > before.revision && currentState.phase === "CHAIN_STEP") {
      advanced = true;
      break;
    }
  }
  assert.ok(advanced, "The Preview cron did not advance the overdue room within 30 seconds.");
  const automaticEvents = await prisma.gameToolEvent.count({
    where: { roomId, type: "DRAW_GUESS_PHASE_ADVANCED" },
  });
  assert.equal(automaticEvents, 1);
  for (let attempt = 0; attempt < 5 && !receivedBroadcast; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(receivedBroadcast, "The Preview server did not Broadcast the automatic phase change.");
  console.log("Preview cron probe passed: a fully offline room advanced automatically and Broadcast reached the subscriber.");
} finally {
  realtime.realtime.disconnect();
  if (roomId) await prisma.gameToolRoom.delete({ where: { id: roomId } });
  await prisma.userProfile.deleteMany({ where: { id: { in: players.map((player) => player.id) } } });
  await prisma.$disconnect();
}
