import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createDiceLobbyState } from "./diceRoomEngine";

// Exercise the real command service against isolated in-memory records.
// No database, authentication service, or realtime network is used.
const directory = fileURLToPath(new URL(".", import.meta.url));
const bundle = await build({
  stdin: { contents: 'export * from "./diceRoomServer"; import { prisma } from "@/lib/prisma"; export const install = (value) => Object.assign(prisma, value);', resolveDir: directory, loader: "ts" },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
  plugins: [{ name: "isolated-dice-dependencies", setup(builder) {
    builder.onResolve({ filter: /^(server-only|@\/lib\/prisma)$|\/diceRealtimeServer$|\/gameToolRooms$/ }, ({ path }) => ({ path, namespace: "dice-test" }));
    builder.onLoad({ filter: /.*/, namespace: "dice-test" }, ({ path }) => ({ contents:
      path === "@/lib/prisma" ? "export const prisma = {};" :
      path.endsWith("diceRealtimeServer") ? "export const broadcastDiceRoomChange = async () => true;" :
      path.endsWith("gameToolRooms") ? 'export const createGameToolPrivateToken = () => "test-token"; export const createUniqueGameToolRoomCode = async () => "AUDIT2";' : "",
    }));
  } }],
});
const module = { exports: {} };
new Function("module", "require", bundle.outputFiles[0].text)(module, createRequire(import.meta.url));
const server = module.exports as typeof import("./diceRoomServer") & { install(value: unknown): void };

function fixture(profiles = ["host", "guest"], maxPlayers = profiles.length) {
  const now = new Date();
  const room = {
    id: "isolated-room", code: "AUDIT2", kind: "DICE", status: "LOBBY", revision: 1,
    playerCount: maxPlayers, hostId: "host", startedAt: null, state: createDiceLobbyState(),
    seats: profiles.map((profileId, index) => ({
      id: `seat-${index + 1}`, profileId, seatNumber: index + 1, displayName: profileId,
      leftAt: null as Date | null, readyAt: now as Date | null, roleKey: "cloud",
    })),
    members: profiles.map((profileId, index) => ({ id: `member-${index + 1}`, profileId, leftAt: null as Date | null, readyAt: now as Date | null, lastSeenAt: now })),
  };
  const events: Record<string, unknown>[] = [];
  const matches = (target: object, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => Reflect.get(target, key) === value);
  const apply = (target: object, data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === "revision") Reflect.set(target, key, Reflect.get(target, key) + (value as { increment: number }).increment);
      else Reflect.set(target, key, structuredClone(value));
    }
  };
  const updateRecords = (records: object[], where: Record<string, unknown>, data: Record<string, unknown>) => {
    const selected = records.filter(record => matches(record, where));
    selected.forEach(record => apply(record, data));
    return { count: selected.length };
  };
  const prisma = {
    gameToolRoom: {
      findUnique: async ({ where, include }: { where: Record<string, unknown>; include: { members: boolean | { where: Record<string, unknown> } } }) => {
        if (!matches(room, where)) return null;
        const memberQuery = include.members;
        return structuredClone({ ...room, members: typeof memberQuery === "object" ? room.members.filter(member => matches(member, memberQuery.where)) : room.members });
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => updateRecords([room], where, data),
      update: async ({ data }: { data: Record<string, unknown> }) => { apply(room, data); return room; },
    },
    gameToolSeat: {
      update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => updateRecords(room.seats, where, data),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => updateRecords(room.seats, Object.fromEntries(Object.entries(where).filter(([key]) => key !== "roomId")), data),
    },
    gameToolRoomMember: {
      update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => updateRecords(room.members, where, data),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => updateRecords(room.members, Object.fromEntries(Object.entries(where).filter(([key]) => key !== "roomId")), data),
    },
    gameToolEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { events.push(data); return data; } },
    $transaction: async <T>(run: (tx: unknown) => Promise<T>) => run(prisma),
  };
  server.install(prisma);
  let serial = 0;
  const command = (profileId: string, action: Parameters<typeof server.commandDiceRoom>[0]["action"], expectedRound = room.state.round, commandId = `test-command-${++serial}`) =>
    server.commandDiceRoom({ roomId: room.id, profileId, action, expectedRound, commandId });
  const join = (profileId: string, displayName = profileId) => server.joinDiceRoom({ code: room.code, profileId, displayName });
  const view = (profileId: string, known?: { revision: number; viewerSeat: number }) => server.getDiceRoomView(room.id, profileId, known);
  return { room, events, command, join, view };
}

async function finishMatch(current: ReturnType<typeof fixture>) {
  for (let round = 0; round < 3; round += 1) {
    const caller = current.room.state.turnSeat === 1 ? "host" : "guest";
    const challenger = caller === "host" ? "guest" : "host";
    // Among 10 dice, at least one callable face has two matches including wilds.
    // Choose from persisted hands; never re-roll an accepted hand in the test.
    const face = [2, 3, 4, 5, 6].find(value => Object.values(current.room.state.hands).flat().filter(die => die === 1 || die === value).length >= 2)!;
    assert.equal("error" in await current.command(caller, { type: "BID", count: 2, face }), false);
    assert.equal("error" in await current.command(challenger, { type: "CHALLENGE" }), false);
    if (round < 2) assert.equal("error" in await current.command("host", { type: "NEXT_ROUND" }), false);
  }
  assert.equal(current.room.state.phase, "FINISHED");
}

test("commands delayed from an earlier match cannot become moves or ready votes in a rematch", async () => {
  const current = fixture();
  await current.command("host", { type: "START" });
  const previousRound = current.room.state.round;
  await finishMatch(current);
  await current.command("host", { type: "REMATCH" });
  const delayedReady = await current.command("guest", { type: "READY", ready: true }, 0, "delayed-ready-command");
  const guestStayedUnready = current.room.seats[1].readyAt === null;
  await current.command("host", { type: "READY", ready: true });
  await current.command("guest", { type: "READY", ready: true });
  await current.command("host", { type: "START" });
  const hands = structuredClone(current.room.state.hands);
  const delayedBid = await current.command("host", { type: "BID", count: 2, face: 3 }, previousRound, "delayed-bid-command");
  assert.deepEqual({ readyError: "error" in delayedReady ? delayedReady.error : null, bidError: "error" in delayedBid ? delayedBid.error : null }, { readyError: "STALE_ROUND", bidError: "STALE_ROUND" });
  assert.equal(guestStayedUnready, true);
  assert.equal(current.room.state.bid, null);
  assert.deepEqual(current.room.state.hands, hands);
});

test("simultaneous duplicate commands apply once, retain the hand and stay bound to their player", async () => {
  const current = fixture();
  await current.command("host", { type: "START" });
  const hands = structuredClone(current.room.state.hands);
  const revision = current.room.revision;
  const results = await Promise.all([
    current.command("host", { type: "BID", count: 2, face: 3 }, 1, "duplicate-bid-command"),
    current.command("host", { type: "BID", count: 2, face: 3 }, 1, "duplicate-bid-command"),
  ]);
  assert.equal(results.every(result => "room" in result), true);
  assert.equal(current.room.revision, revision + 1);
  assert.equal(current.events.filter(event => event.type === "DICE_BID").length, 1);
  assert.deepEqual(current.room.state.hands, hands);
  assert.deepEqual(await current.command("guest", { type: "CHALLENGE" }, 1, "duplicate-bid-command"), { error: "COMMAND_ID_USED" });
});

test("readiness and host permissions prevent an unauthorized or premature start", async () => {
  const current = fixture();
  assert.deepEqual(await current.command("guest", { type: "START" }), { error: "HOST_ONLY" });
  await current.command("guest", { type: "READY", ready: false });
  assert.deepEqual(await current.command("host", { type: "START" }), { error: "NOT_READY" });
  assert.equal(current.room.state.phase, "LOBBY");
  await current.command("guest", { type: "READY", ready: true });
  const started = await current.command("host", { type: "START" });
  assert.equal("room" in started, true);
  if ("room" in started) {
    assert.equal(started.room.view.myHand?.length, 5);
    assert.equal(started.room.view.revealedHands, null);
  }
});

test("a player who leaves the lobby can rejoin the same seat but must get ready again", async () => {
  const current = fixture();
  const seatId = current.room.seats[1].id;
  assert.deepEqual(await current.command("guest", { type: "LEAVE" }), { ok: true });
  assert.deepEqual(await current.view("guest"), { error: "NOT_A_PLAYER" });
  assert.deepEqual(await current.join("guest", "回来的朋友"), { roomId: current.room.id });
  assert.equal(current.room.seats.length, 2);
  assert.equal(current.room.seats[1].id, seatId);
  assert.equal(current.room.seats[1].displayName, "回来的朋友");
  assert.equal(current.room.seats[1].roleKey, "cloud");
  assert.equal(current.room.seats[1].leftAt, null);
  assert.equal(current.room.seats[1].readyAt, null);
  assert.equal(current.room.members[1].leftAt, null);
  assert.equal(current.room.members[1].readyAt, null);
  assert.deepEqual(await current.command("host", { type: "START" }), { error: "NOT_READY" });
  assert.deepEqual(await current.join("guest"), { roomId: current.room.id });
  assert.equal(current.events.filter(event => event.type === "DICE_REJOINED").length, 1);
  await current.command("guest", { type: "READY", ready: true });
  assert.equal("room" in await current.command("host", { type: "START" }), true);
});

test("leaving during a match discards the unfinished call and rejects rejoining until the lobby", async () => {
  const current = fixture(["host", "guest", "friend"]);
  await current.command("host", { type: "START" });
  await current.command("host", { type: "BID", count: 3, face: 2 });
  const previousRound = current.room.state.round;
  assert.deepEqual(await current.command("guest", { type: "LEAVE" }), { ok: true });
  assert.equal(current.room.state.phase, "BIDDING");
  assert.equal(current.room.state.round, previousRound + 1);
  assert.deepEqual(current.room.state.seatNumbers, [1, 3]);
  assert.equal(current.room.state.turnSeat, 3);
  assert.equal(current.room.state.bid, null);
  assert.deepEqual(current.room.state.history, []);
  assert.equal(current.room.state.hands["2"], undefined);
  assert.deepEqual(await current.join("guest"), { error: "GAME_STARTED" });
  assert.deepEqual(await current.command("friend", { type: "BID", count: 3, face: 3 }, previousRound), { error: "STALE_ROUND" });
  const visible = await current.view("friend");
  assert.equal("room" in visible, true);
  if ("room" in visible && visible.room) {
    assert.deepEqual(visible.room.view.myHand, current.room.state.hands["3"]);
    assert.equal(visible.room.view.revealedHands, null);
  }
});

test("a departing host hands the room to an online player before an absent seat", async () => {
  const current = fixture(["host", "guest", "friend"]);
  current.room.members[1].lastSeenAt = new Date(Date.now() - 120_000);
  assert.deepEqual(await current.command("host", { type: "LEAVE" }), { ok: true });
  assert.equal(current.room.hostId, "friend");
  const view = await current.view("friend");
  assert.equal("room" in view && view.room?.isHost, true);
});

test("an absent host is replaced once without dealing new dice", async () => {
  const current = fixture(["host", "guest", "friend"]);
  await current.command("host", { type: "START" });
  const hands = structuredClone(current.room.state.hands);
  const revision = current.room.revision;
  current.room.members[0].lastSeenAt = new Date(Date.now() - 120_000);
  const guest = await current.view("guest");
  assert.equal("room" in guest && guest.room?.isHost, true);
  assert.equal(current.room.revision, revision + 1);
  assert.deepEqual(current.room.state.hands, hands);
  const returned = await current.view("host");
  assert.equal("room" in returned && returned.room?.isHost, false);
  assert.equal(current.events.filter(event => event.type === "DICE_HOST_CHANGED").length, 1);
  assert.deepEqual(await current.view("guest", { revision: current.room.revision, viewerSeat: 2 }), { notModified: true });
});

test("a closed room rejects both its members and returning players", async () => {
  const current = fixture();
  assert.deepEqual(await current.command("guest", { type: "CLOSE" }), { error: "HOST_ONLY" });
  assert.deepEqual(await current.command("host", { type: "CLOSE" }), { ok: true });
  assert.deepEqual(await current.view("guest"), { error: "ROOM_NOT_FOUND" });
  assert.deepEqual(await current.join("guest"), { error: "ROOM_NOT_FOUND" });
});

test("a host can still be selected when every remaining member is absent", async () => {
  const current = fixture(["host", "guest", "friend"]);
  current.room.members.slice(1).forEach(member => { member.lastSeenAt = new Date(Date.now() - 120_000); });
  assert.deepEqual(await current.command("host", { type: "LEAVE" }), { ok: true });
  assert.equal(current.room.hostId, "guest");
});

test("a sole remaining player can return to the lobby, invite the departed player and start a new match", async () => {
  const current = fixture();
  await current.command("host", { type: "START" });
  assert.deepEqual(await current.command("host", { type: "LEAVE" }), { ok: true });
  assert.equal(current.room.status, "FINISHED");
  assert.equal(current.room.hostId, "guest");
  assert.deepEqual(current.room.state.seatNumbers, [2]);
  assert.equal("room" in await current.command("guest", { type: "REMATCH" }), true);
  assert.deepEqual(await current.command("guest", { type: "START" }), { error: "NOT_READY" });
  assert.deepEqual(await current.join("host"), { roomId: current.room.id });
  await current.command("host", { type: "READY", ready: true });
  await current.command("guest", { type: "READY", ready: true });
  const started = await current.command("guest", { type: "START" });
  assert.equal("room" in started, true);
  if ("room" in started) {
    assert.equal(started.room.view.round, 2);
    assert.equal(started.room.view.roundNumber, 1);
    assert.deepEqual(started.room.view.scores, { "1": 0, "2": 0 });
  }
});

test("the last player's departure closes the room rather than leaving a joinable empty table", async () => {
  const current = fixture();
  await current.command("host", { type: "LEAVE" });
  assert.deepEqual(await current.command("guest", { type: "LEAVE" }), { ok: true });
  assert.equal(current.room.status, "CANCELLED");
  assert.equal(current.room.seats.every(seat => seat.leftAt), true);
  assert.equal(current.room.members.every(member => member.leftAt), true);
  assert.deepEqual(await current.join("guest"), { error: "ROOM_NOT_FOUND" });
});
