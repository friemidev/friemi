import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createClerkClient } from "@clerk/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Bounded Preview-only benchmark. This never targets Production or sends more than
// six ink batches per second across the two-room scenario.
const previewRef = "dryhbxognbrljslzciuh";
const previewOrigin = "https://friemi-git-codex-draw-and-guess-friemi.vercel.app";
const connectedSnapshotIntervalMs = 10_000;
assert.ok(process.env.DATABASE_URL?.includes(previewRef));
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(previewRef));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
assert.equal(process.env.DRAW_GUESS_PREVIEW_URL, previewOrigin);

const databaseUrl = new URL(process.env.DATABASE_URL!);
databaseUrl.searchParams.set("connection_limit", "20");
process.env.DATABASE_URL = databaseUrl.toString();
process.env.DRAW_GUESS_CLASSIC_ENABLED = "true";

const { prisma } = await import("../lib/prisma");
const roomServer = await import("../features/game-tools/drawGuessRoomServer");
const { DRAW_GUESS_INK_EVENT, getDrawGuessInkTopic } = await import("../features/game-tools/drawGuessRealtime");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
const users: { userId: string; profileId: string; sessionId: string }[] = [];
const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdRoomIds: string[] = [];

type Listener = {
  client: SupabaseClient;
  channel: ReturnType<SupabaseClient["channel"]>;
  received: Map<number, number>;
  duplicateDeliveries: number;
  unexpectedPayloads: number;
  wrongRoom: number;
};
type ActiveRoom = { id: string; artistToken: string; listeners: Listener[]; memberCount: number; tokens: string[]; revision: number };
type Sample = { batch: number; roomId: string; sentAt: number; httpMs: number; httpStatus: number; seq?: number; serverTiming?: Record<string, number> };
type SnapshotSample = { httpMs: number; status: number };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const round = (value: number) => Math.round(value * 10) / 10;
function percentile(values: number[], percent: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * percent / 100) - 1)] ?? null;
}
function readServerTiming(header: string | null) {
  return Object.fromEntries([...((header ?? "").matchAll(/([a-z]+);dur=([\d.]+)/g))].map((match) => [match[1], Number(match[2])]));
}

async function subscribe(client: SupabaseClient, topic: string, roomId: string): Promise<Listener> {
  const listener: Listener = { client, channel: null!, received: new Map(), duplicateDeliveries: 0, unexpectedPayloads: 0, wrongRoom: 0 };
  listener.channel = client.channel(topic, { config: { private: true } })
    .on("broadcast", { event: DRAW_GUESS_INK_EVENT }, (message) => {
      const payload = message.payload as { roomId?: string; stroke?: { points?: number[][] } };
      if (payload.roomId !== roomId) { listener.wrongRoom += 1; return; }
      if (Object.keys(payload).some((key) => !["gameNumber", "id", "roomId", "seq", "stroke", "strokeIndex", "turnIndex"].includes(key))) listener.unexpectedPayloads += 1;
      const marker = payload.stroke?.points?.[0]?.[0];
      if (typeof marker === "number") {
        if (listener.received.has(marker)) listener.duplicateDeliveries += 1;
        else listener.received.set(marker, performance.now());
      }
    });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Private channel join timed out: ${roomId}`)), 15_000);
    listener.channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") { clearTimeout(timer); resolve(); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timer); reject(error ?? new Error(status)); }
    });
  });
  return listener;
}

async function openRoom(members: typeof users): Promise<ActiveRoom> {
  const created = await roomServer.createDrawGuessRoom({
    hostId: members[0].profileId, hostName: "P3 artist", locale: "en", mode: "CLASSIC", playerCount: members.length,
  });
  assert.ok("room" in created && created.room);
  const roomId = created.room.id;
  createdRoomIds.push(roomId);
  for (const member of members.slice(1)) {
    const joined = await roomServer.joinDrawGuessRoom({ code: created.room.code, profileId: member.profileId, displayName: "P3 viewer" });
    assert.ok("roomId" in joined);
  }
  assert.deepEqual(await roomServer.startDrawGuessRoom(roomId, members[0].profileId), { ok: true });
  const wordView = await roomServer.getDrawGuessRoomView(roomId, members[0].profileId);
  assert.ok("room" in wordView && wordView.room && "options" in wordView.room.view);
  const chosen = await roomServer.commandDrawGuessRoom({
    action: { type: "CHOOSE_WORD", value: wordView.room.view.options[0] }, commandId: randomUUID(),
    expectedChainStage: 0, expectedPhase: "WORD_SELECT", expectedTurnIndex: 0, gameNumber: 1,
    profileId: members[0].profileId, roomId,
  });
  assert.ok("ok" in chosen);
  const topic = getDrawGuessInkTopic(roomId, 1, 0);
  const listeners: Listener[] = [];
  const tokens: string[] = [];
  try {
    for (const member of members) {
      const token = (await clerk.sessions.getToken(member.sessionId)).jwt;
      tokens.push(token);
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        accessToken: async () => token,
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      });
      await client.realtime.setAuth(token);
      listeners.push(await subscribe(client, topic, roomId));
    }
    const runningView = await roomServer.getDrawGuessRoomView(roomId, members[0].profileId);
    assert.ok("room" in runningView && runningView.room);
    return { id: roomId, artistToken: tokens[0], listeners, memberCount: members.length, tokens, revision: runningView.room.revision };
  } catch (error) {
    await Promise.allSettled(listeners.map((listener) => listener.client.realtime.disconnect()));
    throw error;
  }
}

async function closeRoom(room: ActiveRoom) {
  await Promise.allSettled(room.listeners.map((listener) => listener.client.realtime.disconnect()));
}

async function runScenario(name: string, rooms: ActiveRoom[], batchesPerRoom: number, intervalMs: number) {
  const samples: Sample[] = [];
  const snapshotSamples: SnapshotSample[] = [];
  const launchedAt = performance.now();
  const sends: Promise<void>[] = [];
  const polls: Promise<void>[] = [];
  const durationMs = batchesPerRoom * intervalMs;
  for (const room of rooms) {
    for (const token of room.tokens) {
      for (let tick = 0; tick < Math.ceil(durationMs / connectedSnapshotIntervalMs); tick += 1) {
        polls.push((async () => {
          await pause(tick * connectedSnapshotIntervalMs);
          const started = performance.now();
          const response = await fetch(`${previewOrigin}/api/game-tools/draw-guess/rooms/${room.id}`, {
            headers: { authorization: `Bearer ${token}`, "if-none-match": `W/"draw-guess-${room.revision}"` },
            signal: AbortSignal.timeout(8_000),
          });
          await response.arrayBuffer();
          snapshotSamples.push({ httpMs: performance.now() - started, status: response.status });
        })());
      }
    }
  }
  for (const room of rooms) {
    for (let batch = 0; batch < batchesPerRoom; batch += 1) {
      sends.push((async () => {
        await pause(batch * intervalMs);
        // The first point uniquely identifies this batch within the scenario.
        const exactMarker = (batch + 1) / 1000 + (rooms.indexOf(room) + 1) / 10;
        const stroke = { color: "#123456", width: 4, points: [[exactMarker, 0.2], [exactMarker + 0.01, 0.3]] };
        const sentAt = performance.now();
        const response = await fetch(`${previewOrigin}/api/game-tools/draw-guess/rooms/${room.id}/ink`, {
          method: "POST",
          headers: { authorization: `Bearer ${room.artistToken}`, "content-type": "application/json" },
          body: JSON.stringify({ gameNumber: 1, turnIndex: 0, strokeIndex: 0, stroke }),
          signal: AbortSignal.timeout(8_000),
        });
        const body = await response.json() as { seq?: number };
        const serverTiming = readServerTiming(response.headers.get("server-timing"));
        samples.push({ batch, roomId: room.id, sentAt, httpMs: performance.now() - sentAt, httpStatus: response.status, seq: body.seq, serverTiming });
      })());
    }
  }
  const settled = await Promise.allSettled(sends);
  const settledPolls = await Promise.allSettled(polls);
  const failedSend = settled.find((item): item is PromiseRejectedResult => item.status === "rejected");
  if (failedSend) throw failedSend.reason;
  const failedPoll = settledPolls.find((item): item is PromiseRejectedResult => item.status === "rejected");
  if (failedPoll) throw failedPoll.reason;
  const delivered = () => rooms.every((room) => room.listeners.every((listener) => listener.received.size >= batchesPerRoom));
  const deadline = performance.now() + 8_000;
  while (!delivered() && performance.now() < deadline) await pause(50);
  const finishedAt = performance.now();
  const latencies: number[] = [];
  const viewerLatencies: number[] = [];
  let missing = 0;
  let wrongRoom = 0;
  let duplicateDeliveries = 0;
  let unexpectedPayloads = 0;
  for (const room of rooms) {
    const roomSamples = samples.filter((sample) => sample.roomId === room.id);
    for (const [listenerIndex, listener] of room.listeners.entries()) {
      wrongRoom += listener.wrongRoom;
      duplicateDeliveries += listener.duplicateDeliveries;
      unexpectedPayloads += listener.unexpectedPayloads;
      for (const sample of roomSamples) {
        const marker = (sample.batch + 1) / 1000 + (rooms.indexOf(room) + 1) / 10;
        const receivedAt = listener.received.get(marker);
        if (receivedAt === undefined) missing += 1;
        else {
          latencies.push(receivedAt - sample.sentAt);
          if (listenerIndex > 0) viewerLatencies.push(receivedAt - sample.sentAt);
        }
      }
    }
  }
  const httpErrors = samples.filter((sample) => sample.httpStatus !== 200);
  const result = {
    name, rooms: rooms.length, playersPerRoom: rooms.map((room) => room.memberCount),
    realtimeConnections: rooms.reduce((sum, room) => sum + room.listeners.length, 0),
    sentBatches: samples.length, expectedDeliveries: samples.reduce((sum, sample) => sum + rooms.find((room) => room.id === sample.roomId)!.memberCount, 0),
    estimatedRealtimeMessages: samples.reduce((sum, sample) => sum + 1 + rooms.find((room) => room.id === sample.roomId)!.memberCount, 0),
    receivedDeliveries: latencies.length, missing, duplicateDeliveries, unexpectedPayloads, wrongRoom, httpErrors: httpErrors.map(({ batch, roomId, httpStatus }) => ({ batch, roomId, httpStatus })),
    elapsedMs: round(finishedAt - launchedAt), effectiveBatchesPerSecond: round(samples.length / ((finishedAt - launchedAt) / 1000)),
    httpMs: { p50: round(percentile(samples.map((sample) => sample.httpMs), 50) ?? 0), p95: round(percentile(samples.map((sample) => sample.httpMs), 95) ?? 0) },
    snapshotPolls: { requests: snapshotSamples.length, errors: snapshotSamples.filter((sample) => sample.status !== 200 && sample.status !== 304).length, p95Ms: round(percentile(snapshotSamples.map((sample) => sample.httpMs), 95) ?? 0) },
    serverTimingP95Ms: Object.fromEntries(["auth", "room", "redis", "broadcast"].map((stage) => [stage, round(percentile(samples.map((sample) => sample.serverTiming?.[stage]).filter((value): value is number => typeof value === "number"), 95) ?? 0)])),
    inkVisibleMs: { p50: round(percentile(viewerLatencies, 50) ?? 0), p95: round(percentile(viewerLatencies, 95) ?? 0), max: round(percentile(viewerLatencies, 100) ?? 0) },
    latencyGatePassed: (percentile(viewerLatencies, 95) ?? Infinity) <= 300,
  };
  assert.equal(httpErrors.length, 0, `${name}: ink HTTP errors`);
  assert.equal(result.snapshotPolls.errors, 0, `${name}: snapshot polling HTTP errors`);
  assert.ok(samples.every((sample) => Number.isFinite(sample.serverTiming?.auth)), "Preview has not deployed the P3 Server-Timing instrumentation yet.");
  assert.equal(missing, 0, `${name}: missing private ink deliveries`);
  assert.equal(duplicateDeliveries, 0, `${name}: duplicate private ink deliveries`);
  assert.equal(unexpectedPayloads, 0, `${name}: unexpected or answer-bearing ink payload`);
  assert.equal(wrongRoom, 0, `${name}: cross-room ink leakage`);
  return result;
}

const report: { at: string; previewOrigin: string; scenarios: unknown[]; notes: string[] } = {
  at: new Date().toISOString(), previewOrigin, scenarios: [],
  notes: ["Sender HTTP request start to private Realtime callback; browser rendering and mobile network are excluded.", "Each scenario has a fixed upper bound on batch rate and runs only in isolated Preview.", "Room snapshot polls match the 10-second connected-channel safety interval; disconnected fallback remains 2 seconds.", "The two-room scenario uses the same 10 Clerk identities in both rooms because the Development instance has a 100-user quota; it measures 20 connections, not 20 distinct users."],
};
let failure: unknown;
try {
  for (let index = 0; index < 10; index += 1) {
    const user = await clerk.users.createUser({
      emailAddress: [`p3-load-${stamp}-${index}+clerk_test@example.com`], firstName: "P3", lastName: `Load ${index}`,
      skipPasswordRequirement: true,
    });
    createdUserIds.push(user.id);
    const profile = await prisma.userProfile.create({ data: { clerkUserId: user.id, nickname: `P3 Load ${index}` } });
    createdProfileIds.push(profile.id);
    const session = await clerk.sessions.createSession({ userId: user.id });
    users.push({ userId: user.id, profileId: profile.id, sessionId: session.id });
  }
  const scenarios = [
    { name: "one-room-five", groups: [users.slice(0, 5)], batches: 25, intervalMs: 250 },
    { name: "one-room-ten", groups: [users.slice(0, 10)], batches: 25, intervalMs: 250 },
    { name: "two-rooms-ten-shared-identities", groups: [users.slice(0, 10), users.slice(0, 10)], batches: 30, intervalMs: 333 },
  ];
  for (const scenario of scenarios) {
    const rooms: ActiveRoom[] = [];
    try {
      for (const group of scenario.groups) rooms.push(await openRoom(group));
      const result = await runScenario(scenario.name, rooms, scenario.batches, scenario.intervalMs);
      report.scenarios.push(result);
      console.log("P3 capacity scenario:", JSON.stringify(result));
    } finally {
      await Promise.allSettled(rooms.map(closeRoom));
    }
  }
  if (report.scenarios.some((scenario) => !(scenario as { latencyGatePassed: boolean }).latencyGatePassed)) {
    throw new Error("P3_LATENCY_GATE_FAILED: HTTP-to-Realtime p95 exceeded 300 ms in at least one Preview scenario.");
  }
} catch (error) {
  failure = error;
  console.error("P3 capacity probe failed:", error);
} finally {
  await mkdir("../../output/p3", { recursive: true });
  const path = `../../output/p3/draw-guess-capacity-${stamp}.json`;
  await writeFile(path, JSON.stringify({ ...report, failure: failure instanceof Error ? failure.message : failure }, null, 2));
  console.log("P3 capacity report:", path);
  let cleanupFailed = false;
  if (createdRoomIds.length) await prisma.gameToolRoom.deleteMany({ where: { id: { in: createdRoomIds } } }).catch((error) => { cleanupFailed = true; console.error("P3 room cleanup failed:", error); });
  if (createdProfileIds.length) await prisma.userProfile.deleteMany({ where: { id: { in: createdProfileIds } } }).catch((error) => { cleanupFailed = true; console.error("P3 profile cleanup failed:", error); });
  for (const userId of createdUserIds) await clerk.users.deleteUser(userId).catch((error) => { cleanupFailed = true; console.error("P3 Clerk cleanup failed:", error); });
  const remainingRooms = await prisma.gameToolRoom.count({ where: { id: { in: createdRoomIds } } });
  const remainingProfiles = await prisma.userProfile.count({ where: { id: { in: createdProfileIds } } });
  if (remainingRooms || remainingProfiles) cleanupFailed = true;
  await prisma.$disconnect();
  console.log(`P3 cleanup: ${createdRoomIds.length} rooms, ${createdProfileIds.length} profiles, ${createdUserIds.length} Clerk users; remaining rooms ${remainingRooms}, profiles ${remainingProfiles}`);
  if (cleanupFailed) failure ??= new Error("P3 probe cleanup did not finish.");
}
if (failure) process.exitCode = 1;
