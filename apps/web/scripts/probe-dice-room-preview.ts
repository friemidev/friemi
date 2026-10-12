import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const settings = dotenv.parse(readFileSync(process.argv[2]));
const url = new URL(settings.DIRECT_URL || settings.DATABASE_URL);
if (!decodeURIComponent(url.username).endsWith(".dryhbxognbrljslzciuh")) throw new Error("Preview project required");
if (!settings.DIRECT_URL && url.port === "6543") url.port = "5432";
process.env.DATABASE_URL = url.href;
process.env.DIRECT_URL = url.href;
const realtimeSettings = settings;
process.env.NEXT_PUBLIC_SUPABASE_URL = realtimeSettings.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = realtimeSettings.SUPABASE_SERVICE_ROLE_KEY;
const { prisma } = await import("@/lib/prisma");
const { createDiceRoom, joinDiceRoom, commandDiceRoom, getDiceRoomView } = await import("@/features/game-tools/diceRoomServer");
const { DICE_ROOM_EVENT, getDiceRoomTopic } = await import("@/features/game-tools/diceRealtime");
const unique = randomUUID();
const profiles: string[] = [];
let roomId: string | null = null;
let realtimeClient: ReturnType<typeof createClient> | null = null;
try {
  for (const name of ["测试桃桃", "测试小鹿", "测试旁观"]) {
    const profile = await prisma.userProfile.create({ data: { clerkUserId: `dice-probe-${unique}-${profiles.length}`, nickname: name } });
    profiles.push(profile.id);
  }
  const created = await createDiceRoom({ locale: "zh-CN", hostId: profiles[0], hostName: "测试桃桃", maxPlayers: 2 });
  assert.ok("roomId" in created && created.roomId);
  roomId = created.roomId;
  realtimeClient = createClient(realtimeSettings.NEXT_PUBLIC_SUPABASE_URL, realtimeSettings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
  const changed = new Promise<{ payload?: { roomId?: string } }>((resolve, reject) => {
    const channel = realtimeClient!.channel(getDiceRoomTopic(roomId!)).on("broadcast", { event: DICE_ROOM_EVENT }, resolve).subscribe((status) => {
      if (status === "SUBSCRIBED") return;
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`Realtime ${status}`));
    });
  });
  await new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const poll = () => { if (realtimeClient?.getChannels().some((channel) => channel.state === "joined")) resolve();
      else if (Date.now() - start > 12000) reject(new Error("Realtime subscription unavailable")); else setTimeout(poll, 100); };
    poll();
  });
  assert.deepEqual(await joinDiceRoom({ code: created.code, profileId: profiles[1], displayName: "测试小鹿" }), { roomId });
  const notice = await Promise.race([changed, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("No room broadcast")), 12000))]);
  assert.equal(notice.payload?.roomId, roomId);
  assert.equal(JSON.stringify(notice).includes("hands"), false);
  const command = (profileId: string, expectedRound: number, action: Parameters<typeof commandDiceRoom>[0]["action"], commandId = randomUUID()) => commandDiceRoom({ roomId: roomId!, profileId, expectedRound, action, commandId });
  assert.ok("room" in await command(profiles[1], 0, { type: "READY", ready: true }));
  assert.ok("room" in await command(profiles[0], 0, { type: "START" }));
  const seat1 = await getDiceRoomView(roomId, profiles[0]);
  const seat2 = await getDiceRoomView(roomId, profiles[1]);
  const seat1Room = "room" in seat1 ? seat1.room : null;
  const seat2Room = "room" in seat2 ? seat2.room : null;
  assert.ok(seat1Room && seat2Room);
  const browserReads = await Promise.all([
    realtimeClient.from("GameToolRoom").select("id,state").eq("id", roomId),
    realtimeClient.from("GameToolSeat").select("id").eq("roomId", roomId),
    realtimeClient.from("GameToolRoomMember").select("id").eq("roomId", roomId),
    realtimeClient.from("GameToolEvent").select("id").eq("roomId", roomId),
  ]);
  for (const read of browserReads) {
    assert.equal(read.error, null, `Browser read failed: ${read.error?.message}`);
    assert.equal(read.data?.length, 0, "A browser role can read private dice room data");
  }
  assert.equal(seat1Room.view.myHand?.length, 5);
  assert.equal(seat2Room.view.myHand?.length, 5);
  assert.equal(seat1Room.view.revealedHands, null);
  assert.equal(seat2Room.view.revealedHands, null);
  assert.deepEqual(await getDiceRoomView(roomId, profiles[0], { revision: seat1Room.revision, viewerSeat: seat1Room.viewerSeat }), { notModified: true });
  const otherViewer = await getDiceRoomView(roomId, profiles[1], { revision: seat1Room.revision, viewerSeat: seat1Room.viewerSeat });
  const otherViewerRoom = "room" in otherViewer ? otherViewer.room : null;
  assert.ok(otherViewerRoom);
  assert.deepEqual(otherViewerRoom.view.myHand, seat2Room.view.myHand);
  assert.deepEqual(Object.keys(seat1Room.view).filter((key) => key.toLowerCase().includes("hand")), ["myHand", "revealedHands"]);
  assert.deepEqual(await getDiceRoomView(roomId, profiles[2]), { error: "NOT_A_PLAYER" });
  const bidId = randomUUID();
  const bid = await command(profiles[0], 1, { type: "BID", count: 10, face: 6 }, bidId);
  const bidRoom = "room" in bid ? bid.room : null; assert.ok(bidRoom);
  const retry = await command(profiles[0], 1, { type: "BID", count: 10, face: 6 }, bidId);
  const retryRoom = "room" in retry ? retry.room : null; assert.ok(retryRoom);
  assert.equal(retryRoom.revision, bidRoom.revision);
  assert.deepEqual(await command(profiles[0], 1, { type: "CHALLENGE" }), { error: "NOT_YOUR_TURN" });
  const revealed = await command(profiles[1], 1, { type: "CHALLENGE" });
  const revealedRoom = "room" in revealed ? revealed.room : null; assert.ok(revealedRoom);
  assert.equal(revealedRoom.view.revealedHands?.["1"].length, 5);
  assert.equal(revealedRoom.view.revealedHands?.["2"].length, 5);
  assert.ok(revealedRoom.view.result);
  const next = await command(profiles[0], 1, { type: "NEXT_ROUND" });
  const nextRoom = "room" in next ? next.room : null; assert.ok(nextRoom);
  assert.equal(nextRoom.view.round, 2);
  assert.equal(nextRoom.view.revealedHands, null);
  const refreshed = await getDiceRoomView(roomId, profiles[1]);
  const refreshedRoom = "room" in refreshed ? refreshed.room : null; assert.ok(refreshedRoom);
  assert.equal(refreshedRoom.view.round, 2);
  assert.equal(refreshedRoom.view.revealedHands, null);
  assert.deepEqual(await command(profiles[1], 2, { type: "LEAVE" }), { ok: true });
  assert.deepEqual(await joinDiceRoom({ code: created.code, profileId: profiles[1], displayName: "测试小鹿" }), { error: "GAME_STARTED" });
  const lobby = await command(profiles[0], 2, { type: "REMATCH" });
  const lobbyRoom = "room" in lobby ? lobby.room : null; assert.ok(lobbyRoom);
  assert.equal(lobbyRoom.view.phase, "LOBBY");
  assert.deepEqual(await joinDiceRoom({ code: created.code, profileId: profiles[1], displayName: "测试小鹿" }), { roomId });
  const rejoined = await getDiceRoomView(roomId, profiles[1]);
  const rejoinedRoom = "room" in rejoined ? rejoined.room : null; assert.ok(rejoinedRoom);
  assert.equal(rejoinedRoom.viewerSeat, seat2Room.viewerSeat);
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[0] }, data: { lastSeenAt: new Date(Date.now() - 120_000) } });
  const promoted = await getDiceRoomView(roomId, profiles[1]);
  const promotedRoom = "room" in promoted ? promoted.room : null; assert.ok(promotedRoom);
  assert.equal(promotedRoom.isHost, true);
  assert.ok("room" in await command(profiles[0], 0, { type: "READY", ready: true }));
  assert.ok("room" in await command(profiles[1], 0, { type: "READY", ready: true }));
  assert.ok("room" in await command(profiles[1], 0, { type: "START" }));
  const competing = await Promise.all([
    command(profiles[0], 1, { type: "BID", count: 2, face: 2 }),
    command(profiles[0], 1, { type: "BID", count: 2, face: 3 }),
  ]);
  assert.equal(competing.filter((result) => "room" in result).length, 1);
  assert.equal(competing.filter((result) => "error" in result && result.error === "NOT_YOUR_TURN").length, 1);
  assert.ok("room" in await command(profiles[1], 1, { type: "CHALLENGE" }));
  assert.deepEqual(await command(profiles[0], 1, { type: "NEXT_ROUND" }), { error: "HOST_ONLY" });
  const successorNext = await command(profiles[1], 1, { type: "NEXT_ROUND" });
  const successorNextRoom = "room" in successorNext ? successorNext.room : null; assert.ok(successorNextRoom);
  assert.equal(successorNextRoom.view.round, 2);
  console.log(JSON.stringify({ project: "preview", joined: 2, privateHands: true, browserRows: 0, duplicateCommand: true, challenge: true, realtimeNotice: true, reconnectRound: 2, rejoin: true, hostTakeover: true, competingBid: true }));
} finally {
  if (realtimeClient) { for (const channel of realtimeClient.getChannels()) await realtimeClient.removeChannel(channel); realtimeClient.realtime.disconnect(); }
  if (roomId) await prisma.gameToolRoom.delete({ where: { id: roomId } }).catch(() => {});
  for (const id of profiles.reverse()) await prisma.userProfile.delete({ where: { id } }).catch(() => {});
  await prisma.$disconnect();
}
