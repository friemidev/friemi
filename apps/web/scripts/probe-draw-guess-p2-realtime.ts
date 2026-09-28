import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const previewRef = "dryhbxognbrljslzciuh";
const clerkDomain = "simple-ewe-14.clerk.accounts.dev";
const encodedDomain = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split("_").slice(2).join("_") ?? "";
if (!process.env.DATABASE_URL?.includes(previewRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(previewRef) ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    Buffer.from(encodedDomain, "base64").toString("utf8").replace(/\$$/, "") !== clerkDomain) {
  throw new Error("P2 Realtime probe only runs with the isolated Preview database and its Clerk Development instance.");
}
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("connection_limit", "10");
process.env.DATABASE_URL = databaseUrl.toString();
process.env.DRAW_GUESS_CLASSIC_ENABLED = "true";

const { prisma } = await import("../lib/prisma");
const roomServer = await import("../features/game-tools/drawGuessRoomServer");
const { broadcastDrawGuessInk, reserveDrawGuessInkSequence } = await import("../features/game-tools/drawGuessInkServer");
const { DRAW_GUESS_INK_EVENT, getDrawGuessInkTopic } = await import("../features/game-tools/drawGuessRealtime");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
const users: { id: string; profileId: string; token: string }[] = [];
const createdClerkUserIds: string[] = [];
const createdProfileIds: string[] = [];
const clients: SupabaseClient[] = [];
let roomId: string | null = null;

function channelStatus(client: SupabaseClient, topic: string) {
  return new Promise<{ channel: ReturnType<SupabaseClient["channel"]>; messages: unknown[]; status: string }>((resolve, reject) => {
    const messages: unknown[] = [];
    const channel = client.channel(topic, { config: { private: true, broadcast: { ack: true } } })
      .on("broadcast", { event: DRAW_GUESS_INK_EVENT }, (message) => messages.push(message.payload));
    const timer = setTimeout(() => reject(new Error(`Private channel join timed out: ${topic}`)), 10_000);
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        resolve({ channel, messages, status: error?.message ?? status });
      }
    });
  });
}

try {
  for (let index = 0; index < 6; index += 1) {
    const user = await clerk.users.createUser({
      emailAddress: [`p2-${stamp}-${index}+clerk_test@example.com`],
      firstName: "Preview", lastName: `P2-${index}`, skipPasswordRequirement: true,
    });
    createdClerkUserIds.push(user.id);
    const profile = await prisma.userProfile.create({ data: { clerkUserId: user.id, nickname: `P2-${index}` } });
    createdProfileIds.push(profile.id);
    const session = await clerk.sessions.createSession({ userId: user.id });
    const jwt = (await clerk.sessions.getToken(session.id)).jwt;
    const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")) as { role?: string; sub?: string };
    assert.equal(claims.role, "authenticated");
    assert.equal(claims.sub, user.id);
    users.push({ id: user.id, profileId: profile.id, token: jwt });
  }
  const created = await roomServer.createDrawGuessRoom({
    hostId: users[0].profileId, hostName: "P2-0", locale: "en", mode: "CLASSIC", playerCount: 5,
  });
  assert.ok("room" in created && created.room);
  roomId = created.room.id;
  for (let index = 1; index < 5; index += 1) {
    const joined = await roomServer.joinDrawGuessRoom({
      code: created.room.code, profileId: users[index].profileId, displayName: `P2-${index}`,
    });
    assert.ok("roomId" in joined);
  }
  assert.deepEqual(await roomServer.startDrawGuessRoom(roomId, users[0].profileId), { ok: true });
  const wordView = await roomServer.getDrawGuessRoomView(roomId, users[0].profileId);
  assert.ok("room" in wordView && wordView.room && "options" in wordView.room.view);
  const chosen = await roomServer.commandDrawGuessRoom({
    action: { type: "CHOOSE_WORD", value: wordView.room.view.options[0] }, commandId: randomUUID(),
    expectedChainStage: 0, expectedPhase: "WORD_SELECT", expectedTurnIndex: 0,
    gameNumber: 1, profileId: users[0].profileId, roomId,
  });
  assert.ok("ok" in chosen);
  const topic = getDrawGuessInkTopic(roomId, 1, 0);
  const authProbe = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/GameToolRoom?select=id&limit=1`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, authorization: `Bearer ${users[0].token}` },
  });
  console.log("P2 third-party JWT REST status:", authProbe.status, authProbe.ok ? "accepted" : (await authProbe.text()).slice(0, 300));
  const sqlMembership = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: users[0].id })}, true)`;
    await tx.$queryRaw`SELECT set_config('realtime.topic', ${topic}, true)`;
    const rows = await tx.$queryRaw<{ allowed: boolean }[]>`SELECT public.draw_guess_can_read_ink_topic() AS allowed`;
    return rows[0]?.allowed;
  });
  console.log("P2 SQL membership:", sqlMembership);
  const sqlRead = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT realtime.send(${JSON.stringify({ probe: true })}::jsonb, ${DRAW_GUESS_INK_EVENT}, ${topic}, true)::text`;
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: users[0].id })}, true)`;
    await tx.$queryRaw`SELECT set_config('realtime.topic', ${topic}, true)`;
    const rows = await tx.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM realtime.messages WHERE topic = ${topic}`;
    return rows[0]?.count;
  });
  console.log("P2 SQL RLS read:", sqlRead);
  for (const user of users) {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      accessToken: async () => user.token,
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    await client.realtime.setAuth(user.token);
    clients.push(client);
  }
  const joined = await Promise.all(clients.slice(0, 5).map((client) => channelStatus(client, topic)));
  assert.ok(joined.every((item) => item.status === "SUBSCRIBED"), JSON.stringify(joined.map((item) => item.status)));
  const outsider = await channelStatus(clients[5], topic);
  assert.notEqual(outsider.status, "SUBSCRIBED");
  const wrongTurn = await channelStatus(clients[1], getDrawGuessInkTopic(roomId, 1, 1));
  assert.notEqual(wrongTurn.status, "SUBSCRIBED");
  const directPublish = await joined[0].channel.send({ type: "broadcast", event: DRAW_GUESS_INK_EVENT, payload: { forged: true } });
  assert.notEqual(directPublish, "ok");
  const reserved = await reserveDrawGuessInkSequence(roomId, 1, 0, users[0].profileId);
  assert.ok(typeof reserved.seq === "number");
  const stroke = { color: "#123456", width: 4, points: [[0.1, 0.2], [0.3, 0.4]] as [number, number][] };
  assert.equal(await broadcastDrawGuessInk({ gameNumber: 1, roomId, seq: reserved.seq, stroke, strokeIndex: 0, turnIndex: 0 }), true);
  await new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (joined.every((item) => item.messages.length > 0)) { clearInterval(timer); resolve(); }
      else if (Date.now() - started > 5_000) { clearInterval(timer); reject(new Error("Not all five private subscribers received the ink batch.")); }
    }, 50);
  });
  for (const item of joined) {
    const payload = item.messages[0] as Record<string, unknown>;
    assert.equal(payload.roomId, roomId);
    assert.equal(payload.gameNumber, 1);
    assert.equal(payload.turnIndex, 0);
    assert.equal(payload.strokeIndex, 0);
    assert.equal(payload.seq, reserved.seq);
    assert.deepEqual(payload.stroke, stroke);
  }
  console.log("P2 live Preview probe passed: five Clerk JWTs subscribed, outsider/old turn denied, private ink delivered to all five.");
} finally {
  for (const client of clients) await client.removeAllChannels().catch(() => undefined);
  if (roomId) await prisma.gameToolRoom.delete({ where: { id: roomId } }).catch(() => undefined);
  for (const profileId of createdProfileIds) await prisma.userProfile.delete({ where: { id: profileId } }).catch(() => undefined);
  for (const userId of createdClerkUserIds) await clerk.users.deleteUser(userId).catch(() => undefined);
  await prisma.$disconnect();
}
