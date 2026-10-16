/** Disposable LOCAL PostgreSQL only. Never loads .env or runs migrations.
 * DDZ_TEST_ALLOW_LOCAL=true DDZ_TEST_DATABASE_URL=postgresql://...@127.0.0.1:55436/friemi_ddz_test
 * node --conditions=react-server --import tsx scripts/test-doudizhu-persistence.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DdzAction, DdzState } from "../features/game-tools/doudizhuTypes";
import type { DdzRoomCommand, DdzRoomMutation, DdzRoomView } from "../features/game-tools/doudizhuRoomTypes";
const connection = process.env.DDZ_TEST_DATABASE_URL;
if (!connection || process.env.DDZ_TEST_ALLOW_LOCAL !== "true") throw new Error("Explicitly enable a disposable local DDZ test database.");
const url = new URL(connection);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/(friemi_ddz_test|ddz_test)[a-z0-9_-]*$/.test(url.pathname)) throw new Error("Refusing a non-local or non-test database.");
process.env.DATABASE_URL = connection; process.env.DIRECT_URL = connection;
delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/doudizhuRoomServer");
const { createDdzDeck } = await import("../features/game-tools/doudizhuEngine");
const { getActiveGameToolRoomForProfile } = await import("../features/game-tools/gameToolRooms");
const prefix = `ddz-test-${randomUUID()}`, profiles: string[] = [], rooms: string[] = [];
let roomId = "", checks = 0;
function check(condition: unknown, message: string): asserts condition { assert.ok(condition, message); checks++; }
function view(result: Awaited<ReturnType<typeof server.getDdzRoomView>>) { check(result.room, `Expected authorized view: ${JSON.stringify(result)}`); return result.room; }
const get = (actor: number) => server.getDdzRoomView(roomId, profiles[actor]).then(view);
function command(room: DdzRoomView, action: DdzAction | { type: "START" }, commandId = randomUUID()): DdzRoomCommand {
  return { commandId, gameNo: room.state.gameNo, dealNo: room.state.dealNo, expectedPhase: room.state.phase, turnId: room.state.turnId,
    expectedRevision: action.type === "START" ? room.revision : undefined, handVersion: action.type === "PLAY" ? room.state.handVersion : undefined, action };
}
function mutation(room: DdzRoomView): DdzRoomMutation { return { commandId: randomUUID(), gameNo: room.state.gameNo, expectedPhase: room.state.phase, expectedRevision: room.revision }; }
async function fixture(change: (s: DdzState) => void) {
  const row = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } }); const state = structuredClone(row.state) as unknown as DdzState;
  change(state); await prisma.gameToolRoom.update({ where: { id: roomId }, data: { state: JSON.parse(JSON.stringify(state)), revision: { increment: 1 }, ddzDeadlineAt: state.deadlineAt ? new Date(state.deadlineAt) : null } });
}
try {
  for (const name of ["Peach", "Bean", "Cloud", "Outside"]) { const p = await prisma.userProfile.create({ data: { clerkUserId: `${prefix}-${name}`, nickname: name } }); profiles.push(p.id); }
  const creation = { commandId: randomUUID(), profileId: profiles[0], name: "Peach", locale: "en" };
  const creates = await Promise.all([server.createDdzRoom(creation), server.createDdzRoom(creation)]);
  check(creates[0].roomId && creates[0].roomId === creates[1].roomId, "Concurrent create has one room"); roomId = creates[0].roomId; rooms.push(roomId);
  check((await server.createDdzRoom({ ...creation, locale: "fr" })).error === "COMMAND_ID_USED", "Creation binds request content");
  let host = await get(0);
  check((await server.getDdzRoomView(roomId, profiles[3])).error === "NOT_A_MEMBER", "Outsider cannot read private room");
  for (const actor of [1, 2]) check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, profileId: profiles[actor], name: `Player ${actor}` })).roomId === roomId, "Friend joins");
  check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, profileId: profiles[3], name: "Outside" })).error === "ROOM_FULL", "Room has exactly 3 seats");
  check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, expectedRoomId: "wrong-room", profileId: profiles[1], name: "Bean" })).error === "ROOM_NOT_FOUND", "Recovery binds room ID");
  host = await get(0);
  const ready = { ...mutation(host), type: "READY" as const, ready: true };
  const concurrentReady = await Promise.all([server.mutateDdzRoom(roomId, profiles[0], ready), server.mutateDdzRoom(roomId, profiles[0], ready)]);
  check(concurrentReady.every(r => r.room), "Duplicate readiness acknowledges once");
  check(await prisma.ddzCommand.count({ where: { roomId, commandId: ready.commandId } }) === 1, "Ready receipt persists once");
  check((await server.mutateDdzRoom(roomId, profiles[1], ready)).error === "COMMAND_ID_USED", "Receipt actor binding");
  check((await server.mutateDdzRoom(roomId, profiles[0], { ...ready, ready: false })).error === "COMMAND_ID_USED", "Receipt content binding");
  for (const actor of [1, 2]) { const r = await get(actor); view(await server.mutateDdzRoom(roomId, profiles[actor], { ...mutation(r), type: "READY", ready: true })); }
  host = await get(0);
  view(await server.mutateDdzRoom(roomId, profiles[0], { ...mutation(host), type: "CHARACTER", catId: "artist" }));
  host = await get(0); check(host.seats.every(s => s.ready), "Cosmetic character preserves readiness");
  check(host.seats[0].catId === "artist", "Character is persisted independently");
  const start = command(host, { type: "START" });
  const starts = await Promise.all([server.commandDdzRoom(roomId, profiles[0], start), server.commandDdzRoom(roomId, profiles[0], start)]);
  check(starts.every(r => r.room), "Duplicate start acknowledges same game");
  const views = await Promise.all([get(0), get(1), get(2)]); host = views[0];
  check(host.state.gameNo === 1 && host.state.phase === "BIDDING", "One game started");
  check(new Set(views.flatMap(v => v.state.hand.map(c => c.id))).size === 51, "Three distinct private 17-card hands");
  check(views.every(v => !v.state.bottomCards.length && v.state.bottomCardCount === 3 && !v.state.remainingHands), "Bottom and opponent hands remain hidden");
  check(!JSON.stringify(host).includes('"hands":') && !JSON.stringify(host).includes('"profileId":') && !JSON.stringify(host).includes(profiles[1]), "Private fields and account IDs do not escape");
  check((await server.mutateDdzRoom(roomId, profiles[0], { ...mutation(host), type: "CLOSE" })).error === "WRONG_PHASE", "Host cannot close active game");
  check((await server.mutateDdzRoom(roomId, profiles[0], { ...mutation(host), type: "REMOVE", targetSeat: 1 })).error === "WRONG_PHASE", "Host cannot kick during play");
  const bidSeat = host.state.currentSeat!;
  const bid = command(await get(bidSeat), { type: "BID", score: 3 });
  view(await server.commandDdzRoom(roomId, profiles[bidSeat], bid));
  let current = await get(bidSeat);
  check(current.state.hand.length === 20 && current.state.bottomCards.length === 3, "Landlord receives public bottom cards");
  const firstCard = current.state.hand[0].id;
  const play = command(current, { type: "PLAY", cardIds: [firstCard] });
  const plays = await Promise.all([server.commandDdzRoom(roomId, profiles[bidSeat], play), server.commandDdzRoom(roomId, profiles[bidSeat], play)]);
  check(plays.every(r => r.room), "Duplicate play succeeds with one accepted action");
  current = await get(bidSeat); check(current.state.hand.length === 19, "Only one card consumed");
  check(await prisma.ddzEvent.count({ where: { roomId, gameNo: 1 } }) >= 4, "Public domain events persisted");
  const actor = current.state.currentSeat!, turn = await get(actor), pass = command(turn, { type: "PASS" });
  const racing = await Promise.all([server.commandDdzRoom(roomId, profiles[actor], pass), server.commandDdzRoom(roomId, profiles[actor], { ...pass, commandId: randomUUID() })]);
  check(racing.filter(r => r.room).length === 1 && racing.filter(r => r.error === "STALE_TURN").length === 1, "Different concurrent actions consume a turn once");
  const beforeLeave = await get(1), leave = { ...mutation(beforeLeave), type: "LEAVE" as const };
  check((await server.mutateDdzRoom(roomId, profiles[1], leave)).ok, "Explicit leave succeeds");
  check((await server.getDdzRoomView(roomId, profiles[1])).error === "NOT_A_MEMBER", "Left actor has no private view");
  const replayLeave = await server.mutateDdzRoom(roomId, profiles[1], leave);
  check(replayLeave.ok && !replayLeave.room, "Departed actor receives minimal replay receipt");
  check(await getActiveGameToolRoomForProfile({ profileId: profiles[1] }) === null, "Explicit departure releases shared active slot");
  check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, profileId: profiles[1], name: "Bean" })).error === "ROOM_ID_REQUIRED", "Departed player must restore original room ID");
  check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, expectedRoomId: roomId, profileId: profiles[1], name: "Bean" })).roomId === roomId, "Original room recovery succeeds");
  const recovered = await get(1); check(recovered.state.hand.length === beforeLeave.state.hand.length, "Reserved hand survives leave/rejoin");
  check(recovered.seats[1].managed, "Recovery does not silently cancel managed mode");
  const reclaim = command(recovered, { type: "SET_MANAGED", managed: false });
  view(await server.commandDdzRoom(roomId, profiles[1], reclaim));
  check((await get(1)).state.deadlineAt === recovered.state.deadlineAt, "Reclaim does not reset deadline");
  let snapshot = await get(0); const oldTurn = snapshot.state.turnId;
  const expiredSeat = snapshot.state.currentSeat!; const stale = command(await get(expiredSeat), { type: "PASS" });
  await fixture(s => { s.deadlineAt = Date.now() - 1; });
  check((await server.commandDdzRoom(roomId, profiles[expiredSeat], stale)).error === "STALE_TURN", "Expired deadline wins against late action");
  snapshot = await get(0); check(snapshot.state.turnId === oldTurn + 1 && snapshot.state.managedSeats.includes(expiredSeat), "Timeout advances exactly once and sets managed");
  await fixture(s => { s.deadlineAt = Date.now() - 1; });
  const beforeSweep = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as DdzState;
  const sweeps = await Promise.all([server.sweepDueDdzRooms(), server.sweepDueDdzRooms()]);
  const afterSweep = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as DdzState;
  check(sweeps.every(s => !s.errors) && afterSweep.turnId === beforeSweep.turnId + 1, "Concurrent independent scheduler advances once");
  // Controlled near-terminal fixture preserves all 54 cards to test persisted settlement.
  const deck = createDdzDeck().map(c => c.id);
  await fixture(s => { s.phase = "PLAYING"; s.currentSeat = 0; s.landlordSeat = 0; s.targetPlay = null; s.consecutivePasses = 0; s.hands = { 0: [deck[0]], 1: [deck[1]], 2: [deck[2]] }; s.playedCards = deck.slice(3); s.bid.highestScore = 1; s.playCounts = { 0: 0, 1: 0, 2: 0 }; s.result = null; s.deadlineAt = Date.now() + 30_000; });
  current = await get(0); const finish = command(current, { type: "PLAY", cardIds: [deck[0]] });
  const finishes = await Promise.all([server.commandDdzRoom(roomId, profiles[0], finish), server.commandDdzRoom(roomId, profiles[0], finish)]);
  check(finishes.every(r => r.room?.state.phase === "RESULT"), "Concurrent terminal play reaches result once");
  check(await prisma.ddzRound.count({ where: { roomId } }) === 1, "One immutable result summary");
  host = await get(0); check(host.state.remainingHands?.length === 3 && host.state.result?.scores.reduce((sum, s) => sum + s.delta, 0) === 0, "Result reveals remaining hands and zero-sum scores");
  const history = await server.getDdzRoomHistory(roomId, profiles[1]); check(history.rounds.length === 1 && !JSON.stringify(history).includes('"hands":') && !JSON.stringify(history).includes(profiles[0]), "History only exposes score summary");
  check((await server.getDdzRoomHistory(roomId, profiles[3])).rounds.length === 0, "Outsider cannot read participant history");
  const deadlineRow = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId }, omit: { ddzDeadlineAt: false } });
  check(deadlineRow.status === "FINISHED" && deadlineRow.ddzDeadlineAt, "Result is indexed for deadline scanner");
  await fixture(s => { s.deadlineAt = Date.now() - 1; });
  await server.sweepDueDdzRooms(); host = await get(0);
  check(host.state.phase === "LOBBY" && host.seats.every(s => !s.ready), "Result timeout returns lobby with new readiness required");
  check(host.seats[0].catId === "artist", "Appearance survives round boundary");
  check(view(await server.commandDdzRoom(roomId, profiles[0], finish)).state.phase === "LOBBY", "Old accepted command cannot alter next lobby");
  for (const actor of [0, 1, 2]) { const r = await get(actor); view(await server.mutateDdzRoom(roomId, profiles[actor], { ...mutation(r), type: "READY", ready: true })); }
  host = await get(0); view(await server.commandDdzRoom(roomId, profiles[0], command(host, { type: "START" })));
  host = await get(0); check(host.state.gameNo === 2 && host.state.turnId > afterSweep.turnId, "Next game preserves monotonic room turn identity");
  await fixture(s => { s.phase = "PLAYING"; s.currentSeat = 0; s.landlordSeat = 0; s.targetPlay = null; s.consecutivePasses = 0; s.hands = { 0: [deck[0]], 1: [deck[1]], 2: [deck[2]] }; s.playedCards = deck.slice(3); s.bid.highestScore = 1; s.playCounts = { 0: 0, 1: 0, 2: 0 }; s.result = null; s.deadlineAt = Date.now() + 30_000; });
  host = await get(0); view(await server.commandDdzRoom(roomId, profiles[0], command(host, { type: "PLAY", cardIds: [deck[0]] })));
  host = await get(0); const returning = { ...mutation(host), type: "RETURN" as const };
  await prisma.gameToolRoomMember.updateMany({ where: { roomId }, data: { lastSeenAt: new Date(Date.now() - 90_000) } });
  await fixture(s => { s.deadlineAt = Date.now() - 1; });
  check((await server.mutateDdzRoom(roomId, profiles[0], returning)).error === "WRONG_PHASE", "Late result return rejects original expired phase");
  host = await get(0);
  check(host.state.phase === "LOBBY" && host.seats.length === 1 && host.viewerSeat === 0, "Restoring actor heartbeat is retained before result cleanup");
  check((await server.getDdzRoomView(roomId, profiles[1])).error === "NOT_A_MEMBER", "Truly stale seat is removed at result boundary");
  check((await server.getDdzRoomHistory(roomId, profiles[1])).rounds.length === 2, "Departed participant retains account-bound summaries");
  // An accepted command retried after a long disconnect is a reconnect, not a
  // replayed mutation. It must refresh the remaining member before cleanup.
  await fixture(s => { s.phase = "RESULT"; s.deadlineAt = Date.now() - 1; });
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[0] }, data: { lastSeenAt: new Date(Date.now() - 90_000) } });
  const recoveredReceipt = view(await server.commandDdzRoom(roomId, profiles[0], finish));
  check(recoveredReceipt.state.phase === "LOBBY" && recoveredReceipt.seats.length === 1, "Receipt recovery refreshes current actor before deadline cleanup");
  check((await server.joinDdzRoom({ commandId: randomUUID(), code: host.code, profileId: profiles[3], name: "Newcomer" })).roomId === roomId, "A new person may occupy a released lobby seat");
  const newcomer = view(await server.getDdzRoomView(roomId, profiles[3]));
  check(newcomer.state.result === null && (await server.getDdzRoomHistory(roomId, profiles[3])).rounds.length === 0, "Reused seat does not inherit old participant result or history");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[0] }, data: { lastSeenAt: new Date(Date.now() - 90_000) } });
  check(view(await server.getDdzRoomView(roomId, profiles[3])).hostSeat === newcomer.viewerSeat, "Online member takes over a stale host under room lock");
  const staleHost = await get(0);
  check((await server.mutateDdzRoom(roomId, profiles[0], { ...mutation(staleHost), type: "CLOSE" })).error === "HOST_ONLY", "Transferred former host cannot close lobby");
  const nextHost = view(await server.getDdzRoomView(roomId, profiles[3]));
  const remove = { ...mutation(nextHost), type: "REMOVE" as const, targetSeat: 0 };
  view(await server.mutateDdzRoom(roomId, profiles[3], remove));
  check((await server.getDdzRoomView(roomId, profiles[0])).error === "NOT_A_MEMBER", "Host removes another lobby seat only");
  check((await server.getDdzRoomHistory(roomId, profiles[0])).rounds.length === 2, "Lobby removal preserves participant history");
  const toClose = view(await server.getDdzRoomView(roomId, profiles[3]));
  const close = { ...mutation(toClose), type: "CLOSE" as const };
  check((await server.mutateDdzRoom(roomId, profiles[3], close)).ok, "Host closes lobby");
  const duplicateClose = await server.mutateDdzRoom(roomId, profiles[3], close);
  check(duplicateClose.ok && !duplicateClose.room, "Closed-room command replay returns minimal receipt");
  check((await server.getDdzRoomView(roomId, profiles[3])).error === "ROOM_NOT_FOUND", "Closed room has no accessible snapshot");
  const emptyCreation = await server.createDdzRoom({ commandId: randomUUID(), profileId: profiles[3], name: "Newcomer", locale: "en" });
  check(emptyCreation.roomId, "Create empty-lobby cleanup fixture"); const emptyId = emptyCreation.roomId; rooms.push(emptyId);
  const emptyHost = view(await server.getDdzRoomView(emptyId, profiles[3]));
  check((await server.mutateDdzRoom(emptyId, profiles[3], { ...mutation(emptyHost), type: "LEAVE" })).ok, "Last lobby player may leave");
  const emptyRoom = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: emptyId }, omit: { ddzDeadlineAt: false } });
  check(emptyRoom.status === "LOBBY" && emptyRoom.playerCount === 0 && emptyRoom.ddzDeadlineAt, "Empty room gets a cleanup deadline");
  await prisma.gameToolRoom.update({ where: { id: emptyId }, data: { ddzDeadlineAt: new Date(Date.now() - 1) } });
  await server.sweepDueDdzRooms();
  check((await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: emptyId } })).status === "CANCELLED", "Scheduler closes an expired empty lobby");
  console.log(`Dou Dizhu PostgreSQL integration: ${checks} checks passed.`);
} finally {
  // Only this script's IDs; never truncate or clean other sessions' fixtures.
  await prisma.ddzRound.deleteMany({ where: { roomId: { in: rooms } } });
  await prisma.gameToolRoom.deleteMany({ where: { id: { in: rooms } } });
  await prisma.userProfile.deleteMany({ where: { id: { in: profiles } } });
  await prisma.$disconnect();
}
