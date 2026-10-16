/** Run only against a disposable localhost PostgreSQL database named uno_test*.
 * UNO_TEST_DATABASE_URL=... node --conditions=react-server --import tsx scripts/test-uno-persistence.ts
 * Initialize its schema first; this script never reads project .env files.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { UnoAction, UnoState } from "../features/game-tools/unoTypes";
import type { UnoRoomView } from "../features/game-tools/unoRoomTypes";
import type { UnoReaction } from "../features/game-tools/unoReactions";

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
const { getActiveGameToolRoomForProfile } = await import("../features/game-tools/gameToolRooms");
const { fallbackDrawGuessCatId, isDrawGuessCatId } = await import("../features/game-tools/drawGuessCats");
const prefix = `uno-test-${randomUUID()}`;
const profiles: string[] = [];
let roomId = "";
const extraRoomIds: string[] = [];
let checks = 0;
function check(value: unknown, message: string): asserts value { assert.ok(value, message); checks += 1; }
function view(result: Awaited<ReturnType<typeof server.getUnoRoomView>>) {
  check("room" in result && result.room, `Expected room: ${JSON.stringify(result)}`);
  return result.room;
}
function envelope(room: UnoRoomView, action: UnoAction | { type: "START" }, commandId = randomUUID()) {
  return { commandId, expectedRevision: action.type === "START" ? room.revision : undefined, matchNumber: room.state.matchNumber, roundNumber: room.state.roundNumber, turnId: room.state.turnId, action };
}
async function fixture(change: (state: UnoState) => void) {
  const row = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const state = structuredClone(row.state) as unknown as UnoState;
  change(state);
  await prisma.gameToolRoom.update({ where: { id: roomId }, data: { state: JSON.parse(JSON.stringify(state)), revision: { increment: 1 }, unoDeadlineAt: state.deadlineAt ? new Date(state.deadlineAt) : null } });
}
async function expireReactions() {
  const row = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const config = row.config as { returnedProfileIds?: string[]; reactions?: UnoReaction[] };
  await prisma.gameToolRoom.update({ where: { id: roomId }, data: { config: { ...config, reactions: (config.reactions ?? []).map((reaction) => ({ ...reaction, createdAt: Date.now() - 10_000, expiresAt: Date.now() - 5_000 })) } } });
}

try {
  for (const name of ["Peach", "Bean", "Outside"]) {
    const profile = await prisma.userProfile.create({ data: { clerkUserId: `${prefix}-${name}`, nickname: name } });
    profiles.push(profile.id);
  }
  const created = await server.createUnoRoom({ profileId: profiles[0], name: "Peach", locale: "en" });
  check(created.roomId, "Room created"); roomId = created.roomId;
  let host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.state.matchMode === "score", "New room defaults to score mode");
  host = view(await server.updateUnoRoomSettings(roomId, profiles[0], { matchMode: "single" }));
  check(host.state.matchMode === "single" && host.state.turnSeconds === 60, "Host may change only match mode");
  check((await server.updateUnoRoomSettings(roomId, profiles[0], {})).error === "INVALID_REQUEST", "Settings require at least one recognized field");
  check((await server.getUnoRoomView(roomId, profiles[2])).error === "NOT_A_MEMBER", "Outsider cannot read room");
  check((await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Bean" })).roomId === roomId, "Second player joins");
  check((await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Bean", expectedRoomId: "a-different-room" })).error === "ROOM_NOT_FOUND", "Recovery cannot join a different room through a reused code");
  check((await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Bean", expectedRoomId: roomId })).roomId === roomId, "Explicit recovery can rejoin the expected room");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.state.matchMode === "single", "Lobby join preserves match mode");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[0] }, data: { lastSeenAt: new Date(Date.now() - 70_000) } });
  const hostRaceTransaction = prisma.$transaction;
  let hostHeartbeatInjected = false;
  prisma.$transaction = (async (...args: unknown[]) => {
    if (!hostHeartbeatInjected) {
      hostHeartbeatInjected = true;
      await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[0] }, data: { lastSeenAt: new Date() } });
    }
    return Reflect.apply(hostRaceTransaction, prisma, args);
  }) as typeof prisma.$transaction;
  let hostAfterHeartbeat: UnoRoomView;
  try { hostAfterHeartbeat = view(await server.getUnoRoomView(roomId, profiles[1])); }
  finally { prisma.$transaction = hostRaceTransaction; }
  check(hostHeartbeatInjected && hostAfterHeartbeat.hostSeat === 0, "A fresh host heartbeat between snapshot and transaction aborts stale succession");
  check((await server.updateUnoRoomSettings(roomId, profiles[1], { matchMode: "score" })).error === "HOST_ONLY", "Non-host cannot change mode");
  check((await server.updateUnoRoomSettings(roomId, profiles[2], { matchMode: "score" })).error === "NOT_A_MEMBER", "Outsider cannot change room rules");
  check(host.seats.every((seat) => isDrawGuessCatId(seat.catId)), "Every UNO seat exposes a valid shared cat character");
  const storedCats = await prisma.gameToolSeat.findMany({ where: { roomId }, select: { roleKey: true } });
  check(storedCats.every((seat) => isDrawGuessCatId(seat.roleKey)), "Create and join persist default characters in roleKey");
  await prisma.gameToolSeat.updateMany({ where: { roomId, profileId: profiles[0] }, data: { roleKey: "legacy-unknown-cat" } });
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.seats[0].catId === fallbackDrawGuessCatId(`${roomId}:0`), "Unknown legacy character receives deterministic room-seat fallback");
  check((await server.setUnoCharacter(roomId, profiles[2], "artist")).error === "NOT_A_MEMBER", "Outsider cannot select another player's character");
  check((await server.setUnoCharacter(roomId, profiles[0], "not-a-cat")).error === "INVALID_CHARACTER", "Server rejects unknown character IDs");
  const characterRoom = view(await server.setUnoCharacter(roomId, profiles[0], "artist"));
  check(characterRoom.seats[0].catId === "artist" && characterRoom.revision > host.revision, "Character selection commits a new public revision");
  check(view(await server.getUnoRoomView(roomId, profiles[1])).seats[0].catId === "artist", "Other members observe the selected public character");
  const oldLobbyRevision = characterRoom.revision;
  const revisedRules = view(await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 30 }, oldLobbyRevision));
  check((await server.setUnoRoomReady(roomId, profiles[0], true, oldLobbyRevision)).error === "STALE_COMMAND", "A delayed ready intent cannot consent to newer rules");
  check((await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 90 }, oldLobbyRevision)).error === "STALE_COMMAND", "A delayed settings intent cannot overwrite newer rules");
  check((await server.setUnoCharacter(roomId, profiles[0], "baker", oldLobbyRevision)).error === "STALE_COMMAND", "A delayed character choice cannot replace a newer room revision");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.revision === revisedRules.revision && host.state.turnSeconds === 30 && host.seats.every((seat) => !seat.ready), "Rejected delayed lobby mutations leave revision, rules and readiness untouched");
  const readyAtSameRevision = await Promise.all([
    server.setUnoRoomReady(roomId, profiles[0], true, host.revision),
    server.setUnoRoomReady(roomId, profiles[1], true, host.revision),
  ]);
  check(readyAtSameRevision.filter((result) => "room" in result && result.room).length === 1 && readyAtSameRevision.filter((result) => result.error === "STALE_COMMAND").length === 1, "Concurrent revision-bound preparation does not silently rebase either intent");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.seats.filter((seat) => seat.ready).length === 1, "Only the preparation accepted at the original revision is applied");
  host = view(await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 60 }, host.revision));

  const reactionId = randomUUID();
  const lobbyReactionFrame = { matchNumber: host.state.matchNumber, roundNumber: host.state.roundNumber };
  check((await server.sendUnoReaction(roomId, profiles[2], { reactionId: randomUUID(), kind: "laugh", ...lobbyReactionFrame })).error === "NOT_A_MEMBER", "Outsider cannot send reactions");
  check((await server.sendUnoReaction(roomId, profiles[0], { reactionId: "bad-id", kind: "laugh", ...lobbyReactionFrame })).error === "INVALID_REACTION", "Reaction IDs must be UUIDs");
  const beforeReaction = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const reactionResults = await Promise.all([
    server.sendUnoReaction(roomId, profiles[0], { reactionId, kind: "laugh", ...lobbyReactionFrame }),
    server.sendUnoReaction(roomId, profiles[0], { reactionId, kind: "laugh", ...lobbyReactionFrame }),
  ]);
  check(reactionResults.every((result) => result.room), "Duplicate concurrent reactions acknowledge the same send");
  const reactionRoom = view(reactionResults[0]);
  check(reactionRoom.reactions.length === 1 && reactionRoom.reactions[0].id === reactionId && reactionRoom.reactions[0].seat === 0, "Reaction seat comes from authenticated membership and is emitted once");
  check(reactionRoom.reactions[0].expiresAt - reactionRoom.reactions[0].createdAt === 4_500, "Reaction lifetime is 4.5 seconds");
  check(await prisma.unoCommand.count({ where: { roomId, commandId: `reaction_${reactionId}` } }) === 1, "Reaction dedup receipt commits once");
  check(JSON.stringify((await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state) === JSON.stringify(beforeReaction.state), "Reaction leaves complete rules state unchanged");
  check((await server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "applause", ...lobbyReactionFrame })).error === "REACTION_COOLDOWN", "Different reaction inside 3 seconds is rejected");
  check((await server.sendUnoReaction(roomId, profiles[1], { reactionId, kind: "laugh", ...lobbyReactionFrame })).error === "COMMAND_ID_USED", "Reaction receipt is bound to the original actor");
  check((await server.sendUnoReaction(roomId, profiles[0], { reactionId, kind: "surprise", ...lobbyReactionFrame })).error === "COMMAND_ID_USED", "Reaction receipt is bound to the original kind");
  check(view(await server.getUnoRoomView(roomId, profiles[1])).reactions.some((reaction) => reaction.id === reactionId), "Reaction is visible to other members without private game state");
  await expireReactions();
  check(view(await server.getUnoRoomView(roomId, profiles[0])).reactions.length === 0, "Expired reactions disappear from snapshots");
  const beforeRetry = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  check(view(await server.sendUnoReaction(roomId, profiles[0], { reactionId, kind: "laugh", ...lobbyReactionFrame })).reactions.length === 0, "Retrying an expired reaction never replays its animation");
  check((await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).revision === beforeRetry.revision, "Expired duplicate does not increment revision");
  const concurrentReactions = await Promise.all([
    server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "laugh", ...lobbyReactionFrame }),
    server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "applause", ...lobbyReactionFrame }),
  ]);
  check(concurrentReactions.filter((result) => result.room).length === 1 && concurrentReactions.filter((result) => result.error === "REACTION_COOLDOWN").length === 1, "Concurrent different reactions obey one cooldown window");
  const latestReaction = view(await server.getUnoRoomView(roomId, profiles[0])).reactions[0].id;
  check(view(await server.sendUnoReaction(roomId, profiles[0], { reactionId, kind: "laugh", ...lobbyReactionFrame })).reactions[0].id === latestReaction, "Old reaction retries cannot replace a newer reaction");

  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check((await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "START" }))).error === "PLAYERS_NOT_READY", "Cannot start before readiness");
  await server.setUnoRoomReady(roomId, profiles[0], true);
  await server.setUnoRoomReady(roomId, profiles[1], true);
  host = view(await server.updateUnoRoomSettings(roomId, profiles[0], 30));
  check(host.state.turnSeconds === 30 && host.state.matchMode === "single" && host.seats.every((seat) => !seat.ready), "Legacy timer update preserves mode and clears readiness");
  host = view(await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 60, matchMode: "score" }));
  check(host.state.matchMode === "score" && host.state.turnSeconds === 60, "Host can update both settings together");
  await server.setUnoRoomReady(roomId, profiles[0], true);
  await server.setUnoRoomReady(roomId, profiles[1], true);
  check(view(await server.updateUnoRoomSettings(roomId, profiles[0], { matchMode: "score" })).seats.every((seat) => seat.ready), "Unchanged rules do not unnecessarily clear readiness");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const delayedStart = envelope(host, { type: "START" });
  await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 90 });
  await server.setUnoRoomReady(roomId, profiles[0], true);
  await server.setUnoRoomReady(roomId, profiles[1], true);
  check((await server.commandUnoRoom(roomId, profiles[0], delayedStart)).error === "STALE_COMMAND", "An old start cannot launch after settings change and fresh readiness");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.state.phase === "LOBBY" && host.state.turnSeconds === 90, "Rejected delayed start leaves the updated lobby intact");
  await server.updateUnoRoomSettings(roomId, profiles[0], { turnSeconds: 60 });
  await server.setUnoRoomReady(roomId, profiles[0], true);
  await server.setUnoRoomReady(roomId, profiles[1], true);
  const characterUpdates = await Promise.all([server.setUnoCharacter(roomId, profiles[0], "baker"), server.setUnoCharacter(roomId, profiles[0], "dreamer")]);
  check(characterUpdates.every((result) => result.room), "Concurrent character changes serialize through the room revision");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(["baker", "dreamer"].includes(host.seats[0].catId) && host.seats.every((seat) => seat.ready), "Character changes preserve readiness and use a committed selection");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[1] }, data: { lastSeenAt: new Date(Date.now() - 40_000) } });
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.seats[1].ready && !host.seats[1].connected, "A disconnected guest retains their ready choice but is absent from start eligibility");
  check((await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "START" }))).error === "PLAYERS_NOT_READY", "Host cannot start with a disconnected ready guest");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[1] }, data: { lastSeenAt: new Date() } });
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.seats.every((seat) => seat.ready && seat.connected), "Guest heartbeat restores start eligibility without clearing readiness");
  const start = envelope(host, { type: "START" });
  const [starts, characterAtStart] = await Promise.all([
    Promise.all([server.commandUnoRoom(roomId, profiles[0], start), server.commandUnoRoom(roomId, profiles[0], start)]),
    server.setUnoCharacter(roomId, profiles[0], "captain"),
  ]);
  check(starts.every((item) => "room" in item) || starts.every((item) => item.error === "STALE_COMMAND"), "Concurrent identical START has one stable outcome even when character changes");
  check(Boolean(characterAtStart.room) || characterAtStart.error === "WRONG_PHASE", "Character/start race either precedes start or rejects after it");
  check(await prisma.unoCommand.count({ where: { roomId, commandId: start.commandId } }) === 1, "Exactly one command receipt committed");
  if (starts[0].error === "STALE_COMMAND") {
    const refreshed = view(await server.getUnoRoomView(roomId, profiles[0]));
    const retriedStart = await server.commandUnoRoom(roomId, profiles[0], envelope(refreshed, { type: "START" }));
    check("room" in retriedStart && Boolean(retriedStart.room), "Host can start from the refreshed lobby after a character change");
  }
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const guest = view(await server.getUnoRoomView(roomId, profiles[1]));
  const characterAfterStart = host.seats[0].catId;
  check((await server.setUnoCharacter(roomId, profiles[0], "mango")).error === "WRONG_PHASE", "Character selection is locked after start");
  check(guest.seats[0].catId === characterAfterStart, "Started game exposes the same public character to both players");
  check((await server.updateUnoRoomSettings(roomId, profiles[0], { matchMode: "single" })).error === "WRONG_PHASE", "Mode is locked after game start");
  check(host.state.hand.every((card) => !guest.state.hand.some((other) => other.id === card.id)), "Viewer hands are isolated");
  check(!JSON.stringify(host).includes('"drawPile":') && !JSON.stringify(host).includes('"grace":'), "Private deck/grace are absent");
  check(host.state.players.every((player) => !("hand" in player) && !("declared" in player)), "Opponent declaration and hand data are absent");
  check((await server.commandUnoRoom(roomId, profiles[1], start)).error === "COMMAND_ID_USED", "Command receipt is actor-bound");
  check((await server.commandUnoRoom(roomId, profiles[0], { ...start, action: { type: "DRAW" } })).error === "COMMAND_ID_USED", "Command receipt is payload-bound");
  check((await server.joinUnoRoom({ code: host.code, profileId: profiles[2], name: "Outside" })).error === "GAME_STARTED", "New players cannot enter locked game");

  await fixture((state) => { state.colorChoiceSeat = null; state.currentColor = "red"; state.phase = "PLAYING"; state.challenge = null; state.turnSeat = 0; state.drawnCardId = null; state.deadlineAt = Date.now() + 60_000; });
  await expireReactions();
  const beforePlayReaction = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  const playReactionFrame = { matchNumber: host.state.matchNumber, roundNumber: host.state.roundNumber };
  check(Boolean((await server.sendUnoReaction(roomId, profiles[1], { reactionId: randomUUID(), kind: "surprise", ...playReactionFrame })).room), "Players can manually react during play");
  const afterPlayReaction = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  check(JSON.stringify(beforePlayReaction.state) === JSON.stringify(afterPlayReaction.state) && beforePlayReaction.unoDeadlineAt?.getTime() === afterPlayReaction.unoDeadlineAt?.getTime(), "In-game reaction preserves turn, deadline, grace, cards and events");
  await fixture((state) => { state.phase = "CHALLENGE"; state.challenge = { offenderSeat: 0, targetSeat: 1, illegal: false }; });
  await expireReactions();
  check(Boolean((await server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "applause", ...playReactionFrame })).room), "Manual reactions remain available during a +4 challenge");
  await fixture((state) => { state.phase = "PLAYING"; state.challenge = null; state.deadlineAt = Date.now() - 10; });
  await expireReactions();
  const expiredTurnBeforeReaction = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  check(Boolean((await server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "laugh", ...playReactionFrame })).room), "Reaction acknowledgment does not run the deadline engine");
  check(JSON.stringify((await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state) === JSON.stringify(expiredTurnBeforeReaction.state), "Even an expired turn remains unchanged by a reaction alone");
  await fixture((state) => { state.deadlineAt = Date.now() + 60_000; });
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const handCount = host.state.hand.length;
  const draw = envelope(host, { type: "DRAW" });
  const draws = await Promise.all([server.commandUnoRoom(roomId, profiles[0], draw), server.commandUnoRoom(roomId, profiles[0], draw)]);
  check(draws.every((item) => "room" in item), "Identical concurrent draws both receive successful receipt");
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(host.state.hand.length === handCount + 1, "Concurrent replay draws one card only");
  check(await prisma.unoCommand.count({ where: { roomId, commandId: draw.commandId } }) === 1, "Draw receipt remains unique");

  const guestCount = view(await server.getUnoRoomView(roomId, profiles[1])).state.hand.length;
  const guestCharacter = host.seats.find((seat) => seat.seat === 1)!.catId;
  const leaveRevision = view(await server.getUnoRoomView(roomId, profiles[1])).revision;
  check((await server.leaveUnoRoom(roomId, profiles[1], undefined, leaveRevision)).ok, "Revision-bound explicit leave succeeds");
  check((await server.getUnoRoomView(roomId, profiles[1])).error === "NOT_A_MEMBER", "Left member cannot read private snapshots");
  check(await getActiveGameToolRoomForProfile({ profileId: profiles[1] }) === null, "Explicit UNO leave releases the shared active-game gate");
  await server.joinUnoRoom({ code: host.code, profileId: profiles[1], name: "Bean" });
  check((await server.leaveUnoRoom(roomId, profiles[1], undefined, leaveRevision)).error === "STALE_COMMAND", "A delayed old leave cannot evict a rejoined membership");
  check(view(await server.getUnoRoomView(roomId, profiles[1])).state.hand.length === guestCount, "Rejoining restores reserved seat and hand");
  check(view(await server.getUnoRoomView(roomId, profiles[1])).seats.find((seat) => seat.seat === 1)!.catId === guestCharacter, "Rejoining preserves the reserved character");
  check((await getActiveGameToolRoomForProfile({ profileId: profiles[1] }))?.id === roomId, "Rejoin restores shared active-game presence");

  await fixture((state) => { state.phase = "PLAYING"; state.challenge = null; state.colorChoiceSeat = null; state.turnSeat = 0; state.drawnCardId = null; state.deadlineAt = Date.now() - 10; });
  const beforeTimeout = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as UnoState;
  check((await server.sweepDueUnoRooms()).advanced === 1, "Independent sweep advances without any client request");
  const afterTimeout = (await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } })).state as unknown as UnoState;
  check(afterTimeout.turnId > beforeTimeout.turnId, "Timeout creates a new turn");
  check((await server.commandUnoRoom(roomId, profiles[0], { ...draw, commandId: randomUUID(), turnId: beforeTimeout.turnId })).error === "STALE_TURN", "Late turn command cannot act in new turn");

  await fixture((state) => {
    const deck = createUnoDeck();
    const last = deck.find((card) => card.color === "red" && card.value === "3")!;
    const top = deck.find((card) => card.color === "red" && card.value === "5")!;
    const opponent = deck.find((card) => card.color === "blue" && card.value === "7")!;
    state.players[0].hand = [last]; state.players[0].handVersion += 1; state.players[0].declared = false; state.players[0].episodeId += 1; state.players[0].grace = false; state.players[0].unoReportOpen = true;
    state.players[1].hand = [opponent]; state.players[1].handVersion += 1;
    state.drawPile = deck.filter((card) => ![last.id, top.id, opponent.id].includes(card.id)); state.discard = [top]; state.currentColor = "red";
    state.phase = "PLAYING"; state.challenge = null; state.colorChoiceSeat = null; state.turnSeat = 0; state.drawnCardId = null; state.deadlineAt = Date.now() + 60_000;
  });
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  const report = envelope(host, { type: "CATCH_UNO", targetSeat: 0, episodeId: host.state.players[0].episodeId, roundNumber: host.state.roundNumber });
  const finish = envelope(host, { type: "PLAY", cardId: host.state.hand[0].id, handVersion: host.state.handVersion });
  const race = await Promise.all([server.commandUnoRoom(roomId, profiles[1], report), server.commandUnoRoom(roomId, profiles[0], finish)]);
  host = view(await server.getUnoRoomView(roomId, profiles[0]));
  check(["ROUND_END", "PLAYING"].includes(host.state.phase), "Report/final-play race has a legal final state");
  if (host.state.phase === "ROUND_END") {
    check(host.state.hand.length === 0, "Committed winner stays empty");
    check(race[0].error === "WRONG_PHASE", "A committed win rejects later report");
    check(await prisma.unoRound.count({ where: { roomId } }) === 1, "Round settlement saved once atomically");
  } else {
    check(host.state.hand.length === 3 && race[1].error === "STALE_HAND", "Committed report invalidates old final play");
    check(await prisma.unoRound.count({ where: { roomId } }) === 0, "Report winner leaves no premature settlement");
  }
  // Force a completed round to exercise collective return and a fresh ready gate.
  await fixture((state) => { state.phase = "FINISHED"; state.matchMode = "single"; state.deadlineAt = null; });
  check((await server.sendUnoReaction(roomId, profiles[0], { reactionId: randomUUID(), kind: "laugh", matchNumber: host.state.matchNumber, roundNumber: host.state.roundNumber })).error === "WRONG_PHASE", "Finished games reject new reactions");
  check(view(await server.getUnoRoomView(roomId, profiles[0])).reactions.length === 0, "Finished games expose no live reaction animation");
  const oldMatch = host.state.matchNumber;
  check((await server.commandUnoRoom(roomId, profiles[0], envelope(host, { type: "REMATCH" }))).error === "RETURN_TO_LOBBY_FIRST", "Rematch cannot bypass fresh lobby readiness");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[1] }, data: { lastSeenAt: new Date(Date.now() - 120_000) } });
  const originalTransaction = prisma.$transaction;
  let heartbeatInjected = false;
  // Deterministically place a heartbeat between the reset snapshot and its CAS
  // transaction. This exercises a real independent member-row update in PostgreSQL.
  prisma.$transaction = (async (...args: unknown[]) => {
    if (!heartbeatInjected) {
      heartbeatInjected = true;
      await prisma.gameToolRoomMember.updateMany({ where: { roomId, profileId: profiles[1] }, data: { lastSeenAt: new Date() } });
    }
    return Reflect.apply(originalTransaction, prisma, args);
  }) as typeof prisma.$transaction;
  let waiting: UnoRoomView;
  try { waiting = view(await server.returnToUnoLobby(roomId, profiles[0])); }
  finally { prisma.$transaction = originalTransaction; }
  check(heartbeatInjected, "Injected reconnect after return snapshot");
  check(waiting.state.phase === "FINISHED" && waiting.state.matchNumber === oldMatch, "New heartbeat aborts premature lobby reset");
  check(waiting.seats.length === 2 && waiting.seats.some((seat) => seat.seat === 1 && seat.connected), "Reconnecting player retains seat");
  check(view(await server.getUnoRoomView(roomId, profiles[1])).state.phase === "FINISHED", "Reconnecting member remains authorized after race");
  check((await server.commandUnoRoom(roomId, profiles[0], envelope(waiting, { type: "NEXT_ROUND" }))).error === "RETURN_TO_LOBBY_FIRST", "Next round cannot pull a returning player back into play");
  const reset = view(await server.returnToUnoLobby(roomId, profiles[1]));
  check(reset.state.phase === "LOBBY" && reset.state.matchNumber === oldMatch + 1, "Both returning resets into a new match");
  check((await server.returnToUnoLobby(roomId, profiles[0], waiting.revision)).error === "STALE_COMMAND", "An old return intent cannot act in the new match");
  check((await server.setUnoRoomReady(roomId, profiles[0], true, waiting.revision)).error === "STALE_COMMAND", "An old ready intent cannot prepare a new match");
  check(reset.seats.every((seat) => !seat.ready), "Return clears every ready flag");
  check(reset.state.matchMode === "single", "Return to lobby preserves match mode");
  await server.leaveUnoRoom(roomId, profiles[0]);
  const successor = view(await server.getUnoRoomView(roomId, profiles[1]));
  check(successor.hostSeat === successor.viewerSeat && successor.seats.length === 1, "Lobby leave removes seat and transfers host");
  check(successor.state.matchMode === "single", "Lobby leave preserves match mode");
  check((await server.getUnoRoomHistory(roomId, profiles[2])).error === "NOT_A_MEMBER", "History denies outsiders");

  for (let index = profiles.length; index < 10; index += 1) {
    const profile = await prisma.userProfile.create({ data: { clerkUserId: `${prefix}-cleanup-${index}`, nickname: `Cleanup ${index}` } });
    profiles.push(profile.id);
  }
  const fullLobby = await server.createUnoRoom({ profileId: profiles[0], name: "Cleanup host", locale: "en" });
  check(fullLobby.roomId, "Ten-seat cleanup fixture created"); extraRoomIds.push(fullLobby.roomId);
  const fullLobbyCode = view(await server.getUnoRoomView(fullLobby.roomId, profiles[0])).code;
  for (let index = 1; index < 10; index += 1) {
    check((await server.joinUnoRoom({ code: fullLobbyCode, profileId: profiles[index], name: `Cleanup ${index}` })).roomId === fullLobby.roomId, `Cleanup seat ${index} joined`);
  }
  const lateProfile = await prisma.userProfile.create({ data: { clerkUserId: `${prefix}-late`, nickname: "Late player" } });
  profiles.push(lateProfile.id);
  check((await server.joinUnoRoom({ code: fullLobbyCode, profileId: lateProfile.id, name: "Late player" })).error === "ROOM_FULL", "Fresh ten-seat lobby rejects an eleventh player");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId: fullLobby.roomId, profileId: profiles[9] }, data: { lastSeenAt: new Date(Date.now() - 120_000) } });
  const admissionTransaction = prisma.$transaction;
  let admissionHeartbeatInjected = false;
  prisma.$transaction = (async (...args: unknown[]) => {
    if (!admissionHeartbeatInjected) {
      admissionHeartbeatInjected = true;
      await prisma.gameToolRoomMember.updateMany({ where: { roomId: fullLobby.roomId, profileId: profiles[9] }, data: { lastSeenAt: new Date() } });
    }
    return Reflect.apply(admissionTransaction, prisma, args);
  }) as typeof prisma.$transaction;
  let contestedAdmission: Awaited<ReturnType<typeof server.joinUnoRoom>>;
  try { contestedAdmission = await server.joinUnoRoom({ code: fullLobbyCode, profileId: lateProfile.id, name: "Late player" }); }
  finally { prisma.$transaction = admissionTransaction; }
  check(admissionHeartbeatInjected && contestedAdmission.error === "ROOM_FULL", "A heartbeat during stale-seat admission keeps the reconnected player seated");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId: fullLobby.roomId, profileId: profiles[9] }, data: { lastSeenAt: new Date(Date.now() - 120_000) } });
  check((await server.joinUnoRoom({ code: fullLobbyCode, profileId: lateProfile.id, name: "Late player" })).roomId === fullLobby.roomId, "A new player may claim an expired lobby seat without waiting for the host to refresh");
  const replacedLobby = view(await server.getUnoRoomView(fullLobby.roomId, profiles[0]));
  check(replacedLobby.seats.length === 10 && replacedLobby.seats.some((seat) => seat.name === "Late player") && !replacedLobby.seats.some((seat) => seat.name === "Cleanup 9"), "Expired seat is replaced without exceeding room capacity");
  await prisma.gameToolRoomMember.updateMany({ where: { roomId: fullLobby.roomId, profileId: { not: profiles[0] } }, data: { lastSeenAt: new Date(Date.now() - 120_000) } });
  const cleanedLobby = view(await server.getUnoRoomView(fullLobby.roomId, profiles[0]));
  check(cleanedLobby.seats.length === 1 && cleanedLobby.state.players.length === 1, "One GET cleans all nine stale seats without exhausting the contention retry budget");
  check(await prisma.gameToolRoomMember.count({ where: { roomId: fullLobby.roomId, leftAt: null } }) === 1, "Cleanup retires all nine stale memberships");
  console.log(`UNO persistence: ${checks} checks passed (disposable local PostgreSQL).`);
} finally {
  await prisma.gameToolRoom.deleteMany({ where: { id: { in: [roomId, ...extraRoomIds].filter(Boolean) } } });
  await prisma.userProfile.deleteMany({ where: { id: { in: profiles } } });
  await prisma.$disconnect();
}
