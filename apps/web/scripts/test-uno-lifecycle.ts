/** Focused lifecycle/race regression. Uses synthetic records in an existing,
 * disposable localhost uno_test* database; never loads the project's .env. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { UnoAction, UnoState } from "../features/game-tools/unoTypes";
import type { UnoRoomView } from "../features/game-tools/unoRoomTypes";

const connection = process.env.UNO_TEST_DATABASE_URL;
if (!connection) throw new Error("Set UNO_TEST_DATABASE_URL to a disposable local database.");
const url = new URL(connection);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/uno_test[a-z0-9_-]*$/.test(url.pathname)) throw new Error("Refusing a non-test database.");
process.env.DATABASE_URL = connection;
process.env.DIRECT_URL = connection;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { prisma } = await import("../lib/prisma");
const server = await import("../features/game-tools/unoRoomServer");
const { createUnoDeck } = await import("../features/game-tools/unoEngine");
const { broadcastUnoRoomChange } = await import("../features/game-tools/unoRealtimeServer");
const prefix = `uno-lifecycle-${randomUUID()}`;
const profiles: string[] = [];
let roomId = "";
let checks = 0;
function check(value: unknown, message: string): asserts value { assert.ok(value, message); checks += 1; }
function view(result: Awaited<ReturnType<typeof server.getUnoRoomView>>) {
  check(Boolean(result.room), `Expected room: ${JSON.stringify(result)}`);
  return result.room!;
}
function envelope(room: UnoRoomView, action: UnoAction | { type: "START" }) {
  return { commandId: randomUUID(), expectedRevision: action.type === "START" ? room.revision : undefined, matchNumber: room.state.matchNumber, roundNumber: room.state.roundNumber, turnId: room.state.turnId, action };
}
async function fixture(change: (state: UnoState) => void) {
  const row = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const state = structuredClone(row.state) as unknown as UnoState;
  change(state);
  await prisma.gameToolRoom.update({ where: { id: roomId }, data: { state: JSON.parse(JSON.stringify(state)), revision: { increment: 1 }, unoDeadlineAt: state.deadlineAt ? new Date(state.deadlineAt) : null } });
}
async function finalHand() {
  await fixture((state) => {
    const deck = createUnoDeck();
    const top = deck.find((card) => card.id === "red-5-0")!;
    const last = deck.find((card) => card.id === "red-3-0")!;
    const used = new Set([top.id, last.id]);
    state.players.forEach((player, index) => {
      const card = index === 0 ? last : deck.find((item) => item.id === `blue-${index}-0`)!;
      used.add(card.id); player.hand = [card]; player.handVersion += 1; player.episodeId += 1;
      player.declared = false; player.grace = false;
    });
    state.drawPile = deck.filter((card) => !used.has(card.id)); state.discard = [top];
    state.currentColor = "red"; state.turnSeat = state.players[0].seat; state.turnId += 1;
    state.phase = "PLAYING"; state.deadlineAt = Date.now() + 60_000; state.colorChoiceSeat = null;
    state.challenge = null; state.drawnCardId = null; state.roundResult = null;
  });
}

try {
  for (const name of ["Host", "Original guest", "Later guest"]) {
    profiles.push((await prisma.userProfile.create({ data: { clerkUserId: `${prefix}-${name}`, nickname: name } })).id);
  }
  const created = await server.createUnoRoom({ profileId: profiles[0], name: "Host", locale: "en" });
  check(created.roomId, "Lifecycle fixture created"); roomId = created.roomId;
  const beforeSnapshot = Date.now();
  let host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(Number.isFinite(host.serverNow) && host.serverNow! >= beforeSnapshot && host.serverNow! <= Date.now(), "Snapshot time uses server clock at projection");
  await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Original guest" });
  await server.updateUnoRoomSettings(roomId, profiles[0], { matchMode: "single" });
  await server.setUnoRoomReady(roomId, profiles[0], true);
  await server.setUnoRoomReady(roomId, profiles[1], true);
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const firstReaction = { reactionId: randomUUID(), kind: "laugh" as const, matchNumber: host.state.matchNumber, roundNumber: host.state.roundNumber };
  await server.sendUnoReaction(roomId, profiles[0], firstReaction);
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  host = view(await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "START" })));

  // Two independent scanners and a late player command read the same due turn.
  await fixture((state) => {
    state.phase = "PLAYING"; state.challenge = null; state.colorChoiceSeat = null;
    state.turnSeat = 0; state.drawnCardId = null; state.events = []; state.deadlineAt = Date.now() - 1;
  });
  const beforeDeadline = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as UnoState;
  const lateDraw = { ...envelope(host, { type: "DRAW" }), turnId: beforeDeadline.turnId };
  const deadlineRace = await Promise.all([server.sweepDueUnoRooms(), server.commandUnoRoom(roomId, profiles[0], lateDraw), server.sweepDueUnoRooms()]);
  const afterDeadline = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as UnoState;
  check(deadlineRace[1].error === "STALE_TURN", "Expired command cannot win against concurrent deadline scans");
  check(afterDeadline.turnId === beforeDeadline.turnId + 1, "Overlapping scan/action advances the expired turn exactly once");
  check(afterDeadline.players[0].hand.length === beforeDeadline.players[0].hand.length + 1, "Overlapping scans draw the timeout penalty only once");
  check(afterDeadline.events.filter((event) => event.kind === "TIMEOUT").length === 1, "One timeout event survives the race");
  check(await prisma.unoCommand.count({ where: { roomId, commandId: lateDraw.commandId } }) === 1, "Late action receives one stable rejection receipt");

  // A completed command remains a receipt across membership loss and rejoin.
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const guestBefore = view(await server.getUnoRoomView(roomId, profiles[1]));
  const guestDraw = envelope(guestBefore, { type: "DRAW" });
  const guestAfter = view(await server.commandUnoRoom(roomId, profiles[1], guestDraw));
  check(guestAfter.state.hand.length === guestBefore.state.hand.length + 1, "Guest command executed before leaving");
  await server.leaveUnoRoom(roomId, profiles[1]);
  check((await server.commandUnoRoom(roomId, profiles[1], guestDraw)).error === "NOT_A_MEMBER", "A receipt cannot grant access after departure");
  await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Original guest", expectedRoomId: roomId });
  const restored = view(await server.commandUnoRoom(roomId, profiles[1], guestDraw));
  check(restored.state.hand.length === guestAfter.state.hand.length, "Retry after rejoin acknowledges receipt without drawing again");
  check(await prisma.unoCommand.count({ where: { roomId, commandId: guestDraw.commandId } }) === 1, "Rejoin does not create another receipt");

  await finalHand();
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const finish = envelope(host, { type: "PLAY", cardId: host.state.hand[0].id, handVersion: host.state.handVersion });
  const finishes = await Promise.all([server.commandUnoRoom(roomId, profiles[0], finish), server.commandUnoRoom(roomId, profiles[0], finish)]);
  check(finishes.every((result) => "room" in result && result.room?.state.phase === "FINISHED"), "Duplicate final play acknowledges one finished match");
  check(await prisma.unoRound.count({ where: { roomId } }) === 1, "Final-play retry writes settlement once");
  const firstHistory = await server.getUnoRoomHistory(roomId, profiles[1]);
  check(firstHistory.rounds?.length === 1, "Round participant can read completed score history");
  check(!JSON.stringify(firstHistory).match(/participantProfileIds|drawPile|handVersion|declared|grace|illegal|privateToken/), "History strips participant IDs and private rule data");
  check((await server.getUnoRoomHistory(roomId, profiles[2])).error === "NOT_A_MEMBER", "Unrelated profile cannot inspect historical summaries");
  await server.returnToUnoLobby(roomId, profiles[0]);
  await server.leaveUnoRoom(roomId, profiles[1]);
  const newLobby = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(newLobby.state.phase === "LOBBY" && newLobby.state.matchNumber === 2 && newLobby.seats.length === 1, "Departed participant does not block collective lobby reset");
  const replayedFinish = view(await server.commandUnoRoom(roomId, profiles[0], finish));
  check(replayedFinish.revision === newLobby.revision && replayedFinish.state.phase === "LOBBY", "Previous-match final-play receipt cannot finish or mutate the new lobby");
  const replayedReaction = view(await server.sendUnoReaction(roomId, profiles[0], firstReaction));
  check(replayedReaction.revision === newLobby.revision && replayedReaction.reactions.length === 0, "Previous-match reaction receipt cannot replay after reset");
  check((await server.commandUnoRoom(roomId, profiles[0], { ...finish, commandId: randomUUID() })).error === "STALE_ROUND", "Old match metadata with a new ID cannot execute in the new match");

  await server.joinUnoRoom({ code: host.code, profileId: profiles[2], name: "Later guest" });
  const later = view(await server.getUnoRoomView(roomId, profiles[2]));
  check(later.viewerSeat === 1, "New member may reuse the vacated seat number");
  check((await server.getUnoRoomHistory(roomId, profiles[2])).rounds?.length === 0, "Reusing a seat number never grants its previous owner's history");
  check((await server.getUnoRoomHistory(roomId, profiles[1])).rounds?.length === 1, "Former participant retains only their own finished history after removal");
  check((await server.commandUnoRoom(roomId, profiles[2], guestDraw)).error === "COMMAND_ID_USED", "Reused seat cannot claim the departed profile's command receipt");
  check((await server.sendUnoReaction(roomId, profiles[2], firstReaction)).error === "COMMAND_ID_USED", "Reaction receipt is bound to profile, not recycled seat number");
  await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Original guest" });
  const reseated = view(await server.getUnoRoomView(roomId, profiles[1]));
  check(reseated.viewerSeat === 2 && reseated.state.hand.length === 0, "Original guest receives a new empty lobby seat without taking another profile's seat");
  for (const profileId of profiles) await server.setUnoRoomReady(roomId, profileId, true);
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  host = view(await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "START" })));
  const newReaction = { reactionId: randomUUID(), kind: "surprise" as const, matchNumber: host.state.matchNumber, roundNumber: host.state.roundNumber };
  const liveReaction = view(await server.sendUnoReaction(roomId, profiles[0], newReaction));
  const oldReactionRetry = view(await server.sendUnoReaction(roomId, profiles[0], firstReaction));
  check(oldReactionRetry.revision === liveReaction.revision && oldReactionRetry.reactions[0]?.id === newReaction.reactionId, "Old reaction cannot replace a different reaction in a new match");
  const handBeforeOldReceipt = view(await server.getUnoRoomView(roomId, profiles[1]));
  const oldDrawRetry = view(await server.commandUnoRoom(roomId, profiles[1], guestDraw));
  check(oldDrawRetry.viewerSeat === 2 && oldDrawRetry.state.hand.length === handBeforeOldReceipt.state.hand.length, "Old draw receipt returns the new authorized seat without executing");
  check(JSON.stringify(oldDrawRetry.state.hand) === JSON.stringify(handBeforeOldReceipt.state.hand), "Receipt replay exposes only the current self hand");
  await finalHand();
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "PLAY", cardId: host.state.hand[0].id, handVersion: host.state.handVersion }));
  const laterHistory = await server.getUnoRoomHistory(roomId, profiles[2]);
  check(laterHistory.rounds?.length === 1 && laterHistory.rounds[0].matchNumber === 2, "Later joiner sees only the match they actually played");
  check((await server.getUnoRoomHistory(roomId, profiles[1])).rounds?.length === 2, "Returning participant sees both of their own matches despite seat change");

  const originalFetch = globalThis.fetch;
  const sent: { url: string; body: string }[] = [];
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://uno-realtime.invalid";
    process.env.SUPABASE_SECRET_KEY = "synthetic-test-key";
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => { sent.push({ url: String(input), body: String(init?.body) }); return new Response(null, { status: 204 }); }) as typeof fetch;
    check(await broadcastUnoRoomChange(roomId, 123), "Realtime adapter accepts successful transport acknowledgment");
    check(sent.length === 1 && sent[0].url.includes(encodeURIComponent(`friemi:uno:${roomId}`)), "Realtime publishes only to this room's invalidation topic");
    assert.deepEqual(JSON.parse(sent[0].body), { roomId, revision: 123 }); checks += 1;
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
  }
  console.log(`UNO lifecycle boundaries: ${checks} checks passed (disposable local PostgreSQL; Realtime fetch intercepted).`);
} finally {
  if (roomId) await prisma.gameToolRoom.deleteMany({ where: { id: roomId } });
  await prisma.userProfile.deleteMany({ where: { id: { in: profiles } } });
  await prisma.$disconnect();
}
