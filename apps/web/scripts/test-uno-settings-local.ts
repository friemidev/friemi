/** Local only: node --conditions=react-server --import tsx scripts/test-uno-settings-local.ts */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { applyUnoAction, createUnoDeck, createUnoState } from "../features/game-tools/unoEngine";
import type { UnoRoomCommand } from "../features/game-tools/unoRoomTypes";
import type { UnoState } from "../features/game-tools/unoTypes";
import type { UnoReaction } from "../features/game-tools/unoReactions";
import { DEFAULT_UNO_RULES, getUnoRules } from "../features/game-tools/unoRules";

function fixture() {
  const now = new Date();
  return {
    id: "local-settings", code: "LOCAL", kind: "UNO", hostId: "host", revision: 10,
    status: "LOBBY", finishedAt: null as Date | null, config: { returnedProfileIds: [] as string[], reactions: [] as UnoReaction[] },
    state: createUnoState([{ seat: 0, name: "Host" }, { seat: 1, name: "Guest" }]),
    seats: ["host", "guest"].map((profileId, seatNumber) => ({ id: `seat-${profileId}`, profileId, seatNumber, displayName: profileId, roleKey: "scholar", readyAt: now as Date | null, leftAt: null as Date | null, profile: { avatarUrl: null } })),
    members: ["host", "guest"].map(profileId => ({ id: `member-${profileId}`, profileId, seatedSeatId: `seat-${profileId}`, readyAt: now as Date | null, lastSeenAt: now, leftAt: null as Date | null })),
  };
}
let stored = fixture();
let conflictOnce = false;
let closeBeforeWrite = false;
let competingState: UnoState | null = null;
let heartbeatBeforeTransaction: string | null = null;
let writes = 0;
const receipts = new Map<string, Record<string, unknown>>();
const rounds: Record<string, unknown>[] = [];
type Input = { where: Record<string, unknown>; data?: Record<string, unknown> };
function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Record<string, unknown>[]).some(branch => matchesWhere(row, branch));
    if (key === "roomId") return condition === stored.id;
    const value = row[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      const filter = condition as { in?: unknown[]; notIn?: unknown[]; not?: unknown; lt?: Date; lte?: Date };
      return (!filter.in || filter.in.includes(value)) && (!filter.notIn || !filter.notIn.includes(value))
        && (!("not" in filter) || value !== filter.not)
        && (!filter.lt || (value as Date) < filter.lt) && (!filter.lte || (value as Date) <= filter.lte);
    }
    return value === condition;
  });
}
type LocalPrisma = {
  gameToolRoom: { findUnique: (input: Input) => Promise<ReturnType<typeof fixture> | null>; updateMany: (input: Input) => Promise<{ count: number }> };
  gameToolSeat: { create: (input: { data: Record<string, unknown> }) => Promise<ReturnType<typeof fixture>["seats"][number]>; update: (input: Input) => Promise<void>; updateMany: (input: Input) => Promise<{ count: number }>; delete: (input: Input) => Promise<void>; deleteMany: (input: Input) => Promise<{ count: number }> };
  gameToolRoomMember: { findUnique: (input: Input) => Promise<(ReturnType<typeof fixture>["members"][number] & { room: { kind: string } }) | null>; updateMany: (input: Input) => Promise<{ count: number }>; upsert: (input: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<void> };
  unoCommand: { findUnique: (input: Input) => Promise<Record<string, unknown> | null>; create: (input: { data: Record<string, unknown> }) => Promise<void> };
  unoRound: { create: (input: { data: Record<string, unknown> }) => Promise<void>; findMany: (input: Input & { take?: number }) => Promise<Record<string, unknown>[]> };
  $queryRaw: (query: TemplateStringsArray, id: string) => Promise<{ leftAt: Date | null; lastSeenAt: Date }[]>;
  $transaction: <T>(fn: (tx: LocalPrisma) => Promise<T>) => Promise<T>;
};
const mock: LocalPrisma = {
  gameToolRoom: {
    findUnique: async ({ where }) => matchesWhere(stored, where) ? structuredClone(stored) : null,
    updateMany: async ({ where, data = {} }: Input) => {
      if (conflictOnce) { conflictOnce = false; stored.revision++; return { count: 0 }; }
      if (competingState) { stored.state = competingState; competingState = null; stored.revision++; return { count: 0 }; }
      if (closeBeforeWrite) { closeBeforeWrite = false; stored.status = "CANCELLED"; }
      if (stored.status === "CANCELLED" && (where.status as { not?: string } | undefined)?.not === "CANCELLED") return { count: 0 };
      if (where.revision !== stored.revision) return { count: 0 };
      const { revision, ...patch } = data;
      Object.assign(stored, patch);
      stored.revision += (revision as { increment: number }).increment;
      writes++; return { count: 1 };
    },
  },
  gameToolSeat: {
    create: async ({ data }) => {
      const seat = { ...fixture().seats[0], id: `seat-${data.profileId}`, readyAt: null, ...data } as ReturnType<typeof fixture>["seats"][number];
      stored.seats.push(seat); stored.seats.sort((a, b) => a.seatNumber - b.seatNumber); return seat;
    },
    update: async ({ where, data = {} }) => { const seat = stored.seats.find(row => matchesWhere(row, where)); assert.ok(seat); Object.assign(seat, data); },
    updateMany: async ({ where, data = {} }: Input) => { const seats = stored.seats.filter(row => matchesWhere(row, where)); seats.forEach(seat => Object.assign(seat, data)); return { count: seats.length }; },
    delete: async ({ where }: Input) => { stored.seats = stored.seats.filter(seat => seat.id !== where.id); },
    deleteMany: async ({ where }: Input) => {
      const ids = (where.id as { notIn: string[] }).notIn;
      const before = stored.seats.length; stored.seats = stored.seats.filter(seat => ids.includes(seat.id));
      return { count: before - stored.seats.length };
    },
  },
  gameToolRoomMember: {
    findUnique: async ({ where }) => {
      const { roomId, profileId } = where.roomId_profileId as { roomId: string; profileId: string };
      const member = roomId === stored.id ? stored.members.find(row => row.profileId === profileId) : undefined;
      return member ? { ...structuredClone(member), room: { kind: stored.kind } } : null;
    },
    updateMany: async ({ where, data = {} }: Input) => {
      const members = stored.members.filter(member => matchesWhere(member, where));
      members.forEach(member => Object.assign(member, data)); return { count: members.length };
    },
    upsert: async ({ where, create, update }) => {
      const { profileId } = where.roomId_profileId as { profileId: string };
      const member = stored.members.find(row => row.profileId === profileId);
      if (member) Object.assign(member, update);
      else stored.members.push({ ...fixture().members[0], id: `member-${profileId}`, readyAt: null, ...create } as ReturnType<typeof fixture>["members"][number]);
    },
  },
  unoCommand: {
    findUnique: async ({ where }) => receipts.get((where.roomId_commandId as { commandId: string }).commandId) ?? null,
    create: async ({ data }) => { assert.ok(!receipts.has(String(data.commandId))); receipts.set(String(data.commandId), structuredClone(data)); },
  },
  unoRound: {
    create: async ({ data }) => { rounds.push(structuredClone(data)); },
    findMany: async ({ where, take }) => structuredClone(rounds.filter(row => row.roomId === where.roomId)
      .sort((a, b) => Number(b.matchNumber) - Number(a.matchNumber) || Number(b.roundNumber) - Number(a.roundNumber)).slice(0, take)),
  },
  $queryRaw: async (_query, id) => stored.members.filter(member => member.id === id).map(({ leftAt, lastSeenAt }) => ({ leftAt, lastSeenAt })),
  $transaction: async <T>(fn: (tx: LocalPrisma) => Promise<T>): Promise<T> => {
    if (heartbeatBeforeTransaction) {
      stored.members.find(member => member.profileId === heartbeatBeforeTransaction)!.lastSeenAt = new Date();
      heartbeatBeforeTransaction = null;
    }
    const before = structuredClone(stored);
    const previousReceipts = structuredClone(receipts), previousRounds = structuredClone(rounds);
    try { return await fn(mock); } catch (error) {
      stored = before; receipts.clear(); previousReceipts.forEach((value, key) => receipts.set(key, value));
      rounds.splice(0, rounds.length, ...previousRounds); throw error;
    }
  },
};
const globals = globalThis as typeof globalThis & { prisma?: unknown };
const previousPrisma = globals.prisma, previousFetch = globalThis.fetch;
globals.prisma = mock;
globalThis.fetch = async () => { throw new Error("Local UNO settings check attempted network access"); };
const scratch = await mkdtemp(fileURLToPath(new URL("../.uno-settings-check-", import.meta.url)));
try {
  const bundle = resolve(scratch, "server.cjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../features/game-tools/unoRoomServer.ts", import.meta.url))],
    outfile: bundle, bundle: true, platform: "node", format: "cjs", packages: "external", logLevel: "silent",
    plugins: [{ name: "local-broadcast", setup(builder) {
      builder.onResolve({ filter: /^\.\/unoRealtimeServer$/ }, () => ({ path: "broadcast", namespace: "local-test" }));
      builder.onLoad({ filter: /.*/, namespace: "local-test" }, () => ({ contents: "export async function broadcastUnoRoomChange() { return true; }", loader: "js" }));
    } }],
  });
  const server = createRequire(import.meta.url)(bundle) as typeof import("../features/game-tools/unoRoomServer");
  const custom = { stackDraws: false, challengeDrawFour: true, allowActionFinish: false };
  const saved = await server.updateUnoRoomSettings(stored.id, "host", custom, 10);
  assert.ok("room" in saved && saved.room); assert.equal(saved.room.revision, 11);
  assert.deepEqual(getUnoRules(saved.room.state), custom);
  assert.ok(stored.seats.every(seat => !seat.readyAt)); assert.ok(stored.members.every(member => !member.readyAt));
  const peer = await server.getUnoRoomView(stored.id, "guest");
  assert.ok(peer.room); assert.deepEqual(getUnoRules(peer.room.state), custom);

  const before = writes;
  assert.equal((await server.updateUnoRoomSettings(stored.id, "guest", { stackDraws: true }, 11)).error, "HOST_ONLY");
  assert.equal((await server.updateUnoRoomSettings(stored.id, "outsider", { stackDraws: true }, 11)).error, "NOT_A_MEMBER");
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", { stackDraws: true }, 10)).error, "STALE_COMMAND");
  stored.state.phase = "PLAYING";
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", { stackDraws: true }, 11)).error, "WRONG_PHASE");
  assert.equal(writes, before); stored.state.phase = "LOBBY";
  stored.seats[0].readyAt = new Date();
  await server.updateUnoRoomSettings(stored.id, "host", custom, 11);
  assert.equal(writes, before); assert.ok(stored.seats[0].readyAt);

  conflictOnce = true;
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", { stackDraws: true }, 11)).error, "STALE_COMMAND");
  assert.deepEqual(getUnoRules(stored.state), custom); assert.ok(stored.seats[0].readyAt);
  const left = await server.leaveUnoRoom(stored.id, "guest", undefined, stored.revision);
  assert.ok("ok" in left); assert.deepEqual(getUnoRules(stored.state), custom); assert.equal(stored.state.players.length, 1);

  stored = fixture(); Object.assign(stored.state, custom); stored.state.phase = "FINISHED"; stored.status = "FINISHED";
  await server.returnToUnoLobby(stored.id, "host", stored.revision);
  await server.returnToUnoLobby(stored.id, "guest", stored.revision);
  assert.equal(stored.state.phase, "LOBBY"); assert.deepEqual(getUnoRules(stored.state), custom);

  stored = fixture(); stored.state.rulesetVersion = 2;
  const legacyLobby = await server.getUnoRoomView(stored.id, "host");
  assert.ok(legacyLobby.room); assert.equal(legacyLobby.room.state.rulesetVersion, 3);
  assert.deepEqual(getUnoRules(legacyLobby.room.state), DEFAULT_UNO_RULES);
  stored.state.phase = "PLAYING";
  const legacyGame = await server.getUnoRoomView(stored.id, "host");
  assert.ok(legacyGame.room); assert.equal(legacyGame.room.state.rulesetVersion, 2);
  assert.deepEqual(getUnoRules(legacyGame.room.state), { stackDraws: false, challengeDrawFour: true, allowActionFinish: true });

  stored = fixture(); stored.status = "CANCELLED";
  const closedRevision = stored.revision;
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", custom, closedRevision)).error, "ROOM_NOT_FOUND", "closed rooms must not reopen through settings");
  assert.equal((await server.getUnoRoomView(stored.id, "host")).error, "ROOM_NOT_FOUND");
  assert.equal(stored.status, "CANCELLED"); assert.equal(stored.revision, closedRevision);
  stored = fixture(); closeBeforeWrite = true;
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", custom, stored.revision)).error, "ROOM_NOT_FOUND", "a close that races with settings must win");
  assert.equal(stored.status, "CANCELLED"); assert.equal(stored.revision, 10);

  stored = fixture(); Object.assign(stored.state, custom);
  assert.equal((await server.joinUnoRoom({ code: "WRONG", profileId: "third", name: "Third" })).error, "ROOM_NOT_FOUND");
  assert.equal((await server.joinUnoRoom({ code: " local ", profileId: "third", name: "Third", expectedRoomId: "old-room" })).error, "ROOM_NOT_FOUND");
  assert.equal((await server.joinUnoRoom({ code: " local ", profileId: "third", name: "Third", expectedRoomId: stored.id })).roomId, stored.id);
  assert.deepEqual(getUnoRules(stored.state), custom); assert.equal(stored.state.players.length, 3);
  assert.equal(stored.seats.find(seat => seat.profileId === "third")?.readyAt, null);
  await server.leaveUnoRoom(stored.id, "guest", undefined, stored.revision);
  await server.joinUnoRoom({ code: stored.code, profileId: "guest", name: "Guest" });
  assert.deepEqual(getUnoRules(stored.state), custom); assert.equal(stored.state.players.length, 3);
  assert.equal(stored.seats.find(seat => seat.profileId === "guest")?.seatNumber, 1);
  assert.equal(stored.members.find(member => member.profileId === "guest")?.readyAt, null);
  await server.leaveUnoRoom(stored.id, "host", undefined, stored.revision);
  assert.equal(stored.hostId, "guest"); assert.deepEqual(getUnoRules(stored.state), custom);

  stored = fixture(); Object.assign(stored.state, custom);
  stored.members[0].lastSeenAt = new Date(Date.now() - 70_000);
  const successor = await server.getUnoRoomView(stored.id, "guest");
  assert.ok(successor.room); assert.equal(successor.room.hostSeat, 1);
  assert.equal(stored.hostId, "guest"); assert.deepEqual(getUnoRules(successor.room.state), custom);
  stored = fixture(); Object.assign(stored.state, custom);
  stored.members[0].lastSeenAt = new Date(Date.now() - 70_000); heartbeatBeforeTransaction = "host";
  await server.getUnoRoomView(stored.id, "guest");
  assert.equal(stored.hostId, "host", "a host heartbeat that wins the succession race must preserve ownership");
  assert.deepEqual(getUnoRules(stored.state), custom);

  stored = fixture(); Object.assign(stored.state, custom); stored.state.phase = "FINISHED"; stored.status = "FINISHED";
  stored.members[1].lastSeenAt = new Date(Date.now() - 70_000); heartbeatBeforeTransaction = "guest";
  await server.returnToUnoLobby(stored.id, "host", stored.revision);
  assert.equal(stored.state.phase, "FINISHED", "a recovering guest must not lose their seat during lobby reset");
  assert.equal(stored.seats.length, 2); assert.equal(stored.members[1].leftAt, null);
  await server.returnToUnoLobby(stored.id, "guest", stored.revision);
  assert.equal(stored.state.phase, "LOBBY"); assert.equal(stored.seats.length, 2);
  assert.deepEqual(getUnoRules(stored.state), custom);

  stored = fixture(); Object.assign(stored.state, custom); receipts.clear();
  const beforeStart = stored.revision;
  await server.commandUnoRoom(stored.id, "host", {
    commandId: "local-settings-start", expectedRevision: beforeStart, matchNumber: 1, roundNumber: 0, turnId: 0,
    action: { type: "START" },
  });
  assert.ok(["PLAYING", "CHALLENGE"].includes(stored.state.phase));
  const started = structuredClone(stored.state), startedRevision = stored.revision;
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", { stackDraws: true }, beforeStart)).error, "STALE_COMMAND");
  assert.equal((await server.updateUnoRoomSettings(stored.id, "host", { stackDraws: true }, startedRevision)).error, "WRONG_PHASE");
  assert.equal((await server.setUnoRoomReady(stored.id, "guest", false, beforeStart)).error, "STALE_COMMAND");
  assert.deepEqual(stored.state, started); assert.equal(stored.revision, startedRevision);

  function stackingFixture(last = false) {
    stored = fixture(); receipts.clear(); rounds.length = 0;
    const deck = createUnoDeck();
    const take = (id: string) => { const index = deck.findIndex(card => card.id === id); assert.ok(index >= 0); return deck.splice(index, 1)[0]; };
    Object.assign(stored.state, { phase: "PLAYING", roundNumber: 1, turnId: 1, deadlineAt: Date.now() + 60_000, currentColor: "red", discard: [take("red-5-0")] });
    stored.state.players[0].hand = [take("red-draw2-0"), take("red-7-0")];
    stored.state.players[1].hand = [take("blue-draw2-0"), ...(!last ? [take("blue-8-0")] : [])];
    stored.state.drawPile = deck; stored.status = "IN_PROGRESS";
  }
  const playCommand = (id: string, seat: number): UnoRoomCommand => ({
    commandId: id, matchNumber: stored.state.matchNumber, roundNumber: stored.state.roundNumber, turnId: stored.state.turnId,
    action: { type: "PLAY", cardId: stored.state.players[seat].hand[0].id, handVersion: stored.state.players[seat].handVersion },
  });

  stackingFixture();
  Object.assign(stored.state, { challengeDrawFour: true, allowActionFinish: false });
  await server.commandUnoRoom(stored.id, "host", playCommand("local-rejoin-host", 0));
  const guestHand = structuredClone(stored.state.players[1].hand), pendingBeforeLeave = structuredClone(stored.state.pendingDraw);
  const rulesBeforeLeave = getUnoRules(stored.state);
  await server.leaveUnoRoom(stored.id, "guest", undefined, stored.revision);
  assert.equal((await server.getUnoRoomView(stored.id, "guest")).error, "NOT_A_MEMBER");
  assert.equal((await server.joinUnoRoom({ code: stored.code, profileId: "third", name: "Third" })).error, "GAME_STARTED");
  assert.equal((await server.joinUnoRoom({ code: stored.code, profileId: "guest", name: "Guest" })).roomId, stored.id);
  const recovered = await server.getUnoRoomView(stored.id, "guest");
  assert.ok(recovered.room); assert.deepEqual(recovered.room.state.hand, guestHand);
  assert.deepEqual(recovered.room.state.pendingDraw, pendingBeforeLeave); assert.deepEqual(getUnoRules(recovered.room.state), rulesBeforeLeave);
  await server.commandUnoRoom(stored.id, "guest", playCommand("local-rejoin-guest", 1));
  assert.equal(stored.state.pendingDraw?.count, 4); assert.equal(stored.state.players[1].hand.length, 1);

  stackingFixture();
  const first = playCommand("local-stack-host", 0);
  assert.ok("room" in await server.commandUnoRoom(stored.id, "host", first));
  const firstRevision = stored.revision;
  assert.equal(stored.state.pendingDraw?.count, 2);
  assert.ok("room" in await server.commandUnoRoom(stored.id, "host", first));
  assert.equal(stored.revision, firstRevision); assert.equal(stored.state.pendingDraw?.count, 2);
  const second = playCommand("local-stack-guest", 1);
  assert.ok("room" in await server.commandUnoRoom(stored.id, "guest", second));
  const secondRevision = stored.revision;
  assert.ok("room" in await server.commandUnoRoom(stored.id, "guest", second));
  assert.equal(stored.revision, secondRevision); assert.equal(stored.state.pendingDraw?.count, 4);
  assert.equal(stored.state.players[1].hand.length, 1);

  stackingFixture(true);
  await server.commandUnoRoom(stored.id, "host", playCommand("local-final-host", 0));
  const final = playCommand("local-final-guest", 1);
  await server.commandUnoRoom(stored.id, "guest", final);
  const score = stored.state.players[1].score, settledRevision = stored.revision;
  assert.equal(stored.state.phase, "ROUND_END"); assert.equal(stored.state.players[0].hand.length, 5); assert.equal(rounds.length, 1);
  await server.commandUnoRoom(stored.id, "guest", final);
  assert.equal(stored.state.players[1].score, score); assert.equal(stored.revision, settledRevision);
  assert.equal(stored.state.players[0].hand.length, 5); assert.equal(rounds.length, 1);

  stackingFixture();
  await server.commandUnoRoom(stored.id, "host", playCommand("local-race-host", 0));
  const stalePlay = playCommand("local-race-guest", 1);
  const drawn = applyUnoAction(stored.state, 1, { type: "DRAW" }, Date.now());
  assert.equal(drawn.error, undefined); competingState = drawn.state;
  assert.equal((await server.commandUnoRoom(stored.id, "guest", stalePlay)).error, "STALE_TURN");
  assert.equal(stored.state.pendingDraw, null); assert.equal(stored.state.players[1].hand.length, 4);
  assert.equal(stored.state.turnSeat, 0); assert.ok(stored.state.players[1].hand.some(card => card.id === "blue-draw2-0"));

  stackingFixture(true);
  await server.commandUnoRoom(stored.id, "host", playCommand("local-history-host", 0));
  const historicalFinish = playCommand("local-history-guest", 1);
  await server.commandUnoRoom(stored.id, "guest", historicalFinish);
  const history = await server.getUnoRoomHistory(stored.id, "guest");
  assert.equal(history.rounds?.length, 1);
  assert.equal(/participantProfileIds|"hand"|"drawPile"|"privateToken"|"illegal"|"pendingDraw"/.test(JSON.stringify(history)), false);
  assert.equal((await server.getUnoRoomHistory(stored.id, "outsider")).error, "NOT_A_MEMBER");
  await server.leaveUnoRoom(stored.id, "guest", undefined, stored.revision);
  assert.equal((await server.getUnoRoomHistory(stored.id, "guest")).rounds?.length, 1, "a departed participant retains their own score history");
  await server.returnToUnoLobby(stored.id, "host", stored.revision);
  assert.equal(stored.state.matchNumber, 2);
  await server.joinUnoRoom({ code: stored.code, profileId: "third", name: "Third" });
  assert.equal(stored.seats.find(seat => seat.profileId === "third")?.seatNumber, 1);
  assert.equal((await server.getUnoRoomHistory(stored.id, "third")).rounds?.length, 0, "seat reuse cannot grant another player's history");
  await server.joinUnoRoom({ code: stored.code, profileId: "guest", name: "Guest" });
  assert.equal(stored.seats.find(seat => seat.profileId === "guest")?.seatNumber, 2);
  const newLobbyState = structuredClone(stored.state), newLobbyRevision = stored.revision;
  const retriedFinish = await server.commandUnoRoom(stored.id, "guest", historicalFinish);
  assert.ok(retriedFinish.room); assert.equal(retriedFinish.room.viewerSeat, 2); assert.equal(retriedFinish.room.state.hand.length, 0);
  assert.deepEqual(stored.state, newLobbyState); assert.equal(stored.revision, newLobbyRevision);
  assert.equal(rounds.length, 1); assert.equal((await server.getUnoRoomHistory(stored.id, "guest")).rounds?.length, 1);

  stored = fixture(); receipts.clear();
  const delayedReaction = { reactionId: "d94703ee-0e5c-4b21-8aaa-cd5f8871e992", kind: "laugh" as const, matchNumber: 1, roundNumber: 0 };
  stored.state.matchNumber = 2;
  const beforeDelayedReaction = structuredClone(stored), beforeReactionWrites = writes;
  assert.equal((await server.sendUnoReaction(stored.id, "host", delayedReaction)).error, "STALE_ROUND", "a never-accepted reaction from an old match cannot appear in the new lobby");
  assert.deepEqual(stored, beforeDelayedReaction); assert.equal(writes, beforeReactionWrites); assert.equal(receipts.size, 0);

  stored = fixture(); receipts.clear();
  const firstReaction = { ...delayedReaction };
  assert.ok((await server.sendUnoReaction(stored.id, "host", firstReaction)).room);
  const firstReactionRevision = stored.revision;
  await server.sendUnoReaction(stored.id, "host", { ...firstReaction, reactionId: firstReaction.reactionId.toUpperCase() });
  assert.equal(stored.revision, firstReactionRevision); assert.equal(stored.config.reactions.length, 1);
  assert.equal((await server.sendUnoReaction(stored.id, "guest", firstReaction)).error, "COMMAND_ID_USED");
  assert.equal((await server.sendUnoReaction(stored.id, "host", { ...firstReaction, kind: "surprise" })).error, "COMMAND_ID_USED");
  assert.equal((await server.sendUnoReaction(stored.id, "host", { ...firstReaction, matchNumber: 2 })).error, "COMMAND_ID_USED");
  const secondReaction = { ...firstReaction, reactionId: "925f3d80-b5bb-4d82-a010-29d0d4ee22d3" };
  assert.equal((await server.sendUnoReaction(stored.id, "host", secondReaction)).error, "REACTION_COOLDOWN");
  assert.equal(stored.revision, firstReactionRevision);
  stored.state.roundNumber = 1;
  assert.equal((await server.sendUnoReaction(stored.id, "host", secondReaction)).error, "STALE_ROUND", "a delayed lobby reaction cannot appear after dealing");
  stored.state.matchNumber = 2; stored.state.roundNumber = 0; stored.config.reactions = [];
  const currentReaction = { ...secondReaction, reactionId: "fe053fe0-d9f3-43b6-b97a-ae10f4e1a938", matchNumber: 2, kind: "applause" as const };
  assert.ok((await server.sendUnoReaction(stored.id, "host", currentReaction)).room);
  const currentReactionRevision = stored.revision;
  await server.sendUnoReaction(stored.id, "host", firstReaction);
  assert.equal(stored.revision, currentReactionRevision); assert.equal(stored.config.reactions.length, 1);
  assert.equal(stored.config.reactions[0].id, currentReaction.reactionId, "an old accepted receipt acknowledges without replacing the new reaction");
  assert.equal((await server.sendUnoReaction(stored.id, "host", secondReaction)).error, "STALE_ROUND");
  await server.leaveUnoRoom(stored.id, "host", undefined, stored.revision);
  assert.equal((await server.sendUnoReaction(stored.id, "host", firstReaction)).error, "NOT_A_MEMBER");

  console.log("UNO local service: settings, membership recovery, heartbeat races, stacking, one-time settlement, historical privacy, recycled seats, reaction receipts, cooldown and delayed reactions passed. No live database or network used.");
} finally {
  globals.prisma = previousPrisma; globalThis.fetch = previousFetch;
  await rm(scratch, { recursive: true, force: true });
}
