import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createGameToolPrivateToken, createUniqueGameToolRoomCode } from "./gameToolRooms";
import { fallbackDrawGuessCatId, isDrawGuessCatId } from "./drawGuessCats";
import { advanceDdzDeadline, applyDdzAction, createDdzState, createDdzLobbyState, getDdzViewerState, getDdzMatchView, getDdzRoomSettings, updateDdzRoomSettings, startDdzGame } from "./doudizhuEngine";
import { createDdzDeck } from "./doudizhuCards";
import { broadcastDdzRoomChange } from "./doudizhuRealtimeServer";
import { ddzCommandConflict, ddzMutationConflict, ddzReceiptError, hashDdzRequest } from "./doudizhuProtocol";
import type { DdzRoomCommand, DdzRoomMutation, DdzRoomView, DdzReaction, DdzRoundSummary } from "./doudizhuRoomTypes";
import type { DdzRoomSettings, DdzState } from "./doudizhuTypes";

type Tx = Prisma.TransactionClient;
const RETRIES = 6, PRESENCE_MS = 35_000, HOST_STALE_MS = 60_000, EMPTY_MS = 30 * 60_000;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const include = { seats: { omit: { appearance: false as const }, orderBy: { seatNumber: "asc" as const }, include: { profile: { select: { avatarUrl: true } } } }, members: true };
async function readRoom(tx: Tx, roomId: string) { return tx.gameToolRoom.findUnique({ where: { id: roomId }, include, omit: { ddzDeadlineAt: false } }); }
type Room = NonNullable<Awaited<ReturnType<typeof readRoom>>>;
type Config = { returnedProfileIds?: string[]; reactions?: DdzReaction[]; emptySince?: number };
type Outcome = { room?: DdzRoomView; roomId?: string; error?: string; ok?: boolean };
const config = (room: Room): Config => (room.config && typeof room.config === "object" && !Array.isArray(room.config) ? room.config : {}) as Config;
const stateOf = (room: Room): DdzState | null => {
  const s = room.state as unknown as DdzState | null;
  return s?.schemaVersion === 1 && s.rulesetVersion === "friemi-ddz-v1" && Array.isArray(s.players) ? s : null;
};
function cat(seat: Room["seats"][number], roomId: string) { const appearance = seat.appearance as { catId?: unknown } | null; return isDrawGuessCatId(appearance?.catId) ? appearance.catId : fallbackDrawGuessCatId(`${roomId}:${seat.seatNumber}`); }
function memberSeat(room: Room, profileId: string, allowLeft = false) {
  const member = room.members.find(m => m.profileId === profileId && (allowLeft || !m.leftAt));
  return member ? room.seats.find(s => s.id === member.seatedSeatId && s.profileId === profileId && (allowLeft || !s.leftAt)) : undefined;
}
function view(room: Room, actor: string, now: number): DdzRoomView | null {
  const state = stateOf(room), self = memberSeat(room, actor);
  if (!state || !self || room.status === "CANCELLED") return null;
  const saved = config(room), returned = saved.returnedProfileIds ?? [];
  const viewerState = getDdzViewerState(state, self.seatNumber);
  // Old round summaries are account-authorized through history. A newly joined
  // lobby member must not inherit a prior participant's result by reused seat.
  if (state.phase === "LOBBY") viewerState.result = null;
  return { id: room.id, code: room.code, revision: room.revision, serverNow: now,
    hostSeat: room.seats.find(s => s.profileId === room.hostId)?.seatNumber ?? -1, viewerSeat: self.seatNumber,
    returnedToLobby: returned.includes(actor), state: viewerState,
    seats: room.seats.map(s => { const m = room.members.find(m => m.seatedSeatId === s.id); return {
      seat: s.seatNumber, name: s.displayName, avatarUrl: s.profile?.avatarUrl ?? null, catId: cat(s, room.id), ready: Boolean(s.readyAt),
      connected: Boolean(m && !m.leftAt && now - m.lastSeenAt.getTime() < PRESENCE_MS), returned: Boolean(s.profileId && returned.includes(s.profileId)), managed: state.managedSeats.includes(s.seatNumber), left: Boolean(s.leftAt || m?.leftAt),
    }; }), reactions: state.phase === "CLOSED" ? [] : (saved.reactions ?? []).filter(r => r.expiresAt > now && room.seats.some(s => s.seatNumber === r.seat && !s.leftAt)),
  };
}
function shuffle() { const ids = createDdzDeck().map(c => c.id); for (let i = ids.length - 1; i > 0; i--) { const j = randomInt(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; } return ids; }
function lobbyState(room: Room, seats = room.seats): DdzState {
  const old = stateOf(room)!;
  return createDdzLobbyState(old, seats.map(s => ({ seat: s.seatNumber, name: s.displayName, profileId: s.profileId ?? undefined, catId: cat(s, room.id) })));
}
async function persist(tx: Tx, room: Room, next: DdzState, now: number, data: Prisma.GameToolRoomUncheckedUpdateInput = {}) {
  const before = stateOf(room)!;
  const saved = config(room);
  const deadlineAt = next.deadlineAt ?? (next.phase === "LOBBY" && room.seats.length === 0 ? (saved.emptySince ?? now) + EMPTY_MS : null);
  await tx.gameToolRoom.update({ where: { id: room.id }, data: { state: json(next), revision: { increment: 1 }, ddzDeadlineAt: deadlineAt ? new Date(deadlineAt) : null,
    status: next.phase === "LOBBY" ? "LOBBY" : next.phase === "RESULT" ? "FINISHED" : next.phase === "CLOSED" ? "CANCELLED" : "IN_PROGRESS",
    startedAt: before.phase === "LOBBY" && next.phase === "BIDDING" ? new Date(now) : undefined,
    finishedAt: next.phase === "RESULT" ? new Date(next.result?.finishedAt ?? now) : undefined,
    cancelledAt: next.phase === "CLOSED" ? new Date(now) : undefined, ...data } });
  const events = next.events.filter(event => event.id > before.eventSeq);
  if (events.length) await tx.ddzEvent.createMany({ data: events.map(event => ({ roomId: room.id, eventSeq: event.id, gameNo: event.gameNo, payload: json(event), createdAt: new Date(event.at) })), skipDuplicates: true });
  if (next.result && (!before.result || before.result.gameNo !== next.result.gameNo)) {
    const summary = { gameNo: next.gameNo, rulesetVersion: next.rulesetVersion, rules: next.rules, result: next.result, match: getDdzMatchView(next), players: room.seats.map(s => ({ seat: s.seatNumber, name: s.displayName, catId: cat(s, room.id) })) };
    await tx.ddzRound.create({ data: { roomId: room.id, gameNo: next.gameNo, participantProfileIds: room.seats.flatMap(s => s.profileId ? [s.profileId] : []), summary: json(summary), finishedAt: new Date(next.result.finishedAt) } });
  }
}
async function refresh(room: Room, tx: Tx) { return (await readRoom(tx, room.id))!; }
async function resetLobby(tx: Tx, room: Room, now: number) {
  // All heartbeats use the same room lock, so this liveness decision cannot race a fresh heartbeat.
  const retained = room.seats.filter(s => s.profileId && room.members.some(m => m.seatedSeatId === s.id && !m.leftAt && now - m.lastSeenAt.getTime() < HOST_STALE_MS));
  const removed = room.seats.filter(s => !retained.includes(s));
  await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id, seatedSeatId: { in: removed.map(s => s.id) } }, data: { leftAt: new Date(now), readyAt: null } });
  await tx.gameToolSeat.deleteMany({ where: { id: { in: removed.map(s => s.id) } } });
  await tx.gameToolSeat.updateMany({ where: { roomId: room.id }, data: { readyAt: null } });
  await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id }, data: { readyAt: null } });
  const next = lobbyState(room, retained);
  await persist(tx, room, next, now, { playerCount: retained.length, hostId: retained.some(s => s.profileId === room.hostId) ? room.hostId : retained[0]?.profileId ?? room.hostId,
    startedAt: null, config: json({ returnedProfileIds: [], reactions: [], ...(!retained.length ? { emptySince: now } : {}) }), ddzDeadlineAt: retained.length ? null : new Date(now + EMPTY_MS) });
  return refresh(room, tx);
}
async function expire(tx: Tx, room: Room, now: number) {
  const state = stateOf(room)!;
  if (state.phase === "RESULT" && state.deadlineAt !== null && now >= state.deadlineAt) return resetLobby(tx, room, now);
  if (state.phase === "LOBBY" && !room.seats.length && room.ddzDeadlineAt && now >= room.ddzDeadlineAt.getTime()) { await persist(tx, room, { ...state, phase: "CLOSED", deadlineAt: null }, now); return refresh(room, tx); }
  if (state.deadlineAt !== null && now >= state.deadlineAt) { const next = advanceDdzDeadline(state, now, shuffle); if (next !== state) { await persist(tx, room, next, now); return refresh(room, tx); } }
  return room;
}
async function transferHost(tx: Tx, room: Room, now: number) {
  const host = room.members.find(m => m.profileId === room.hostId && !m.leftAt);
  if (host && now - host.lastSeenAt.getTime() < HOST_STALE_MS) return room;
  const successor = room.seats.find(s => s.profileId && s.profileId !== room.hostId && room.members.some(m => m.seatedSeatId === s.id && !m.leftAt && now - m.lastSeenAt.getTime() < HOST_STALE_MS));
  if (!successor?.profileId) return room;
  await persist(tx, room, stateOf(room)!, now, { hostId: successor.profileId });
  return refresh(room, tx);
}
async function lockRoom(tx: Tx, roomId: string) {
  await tx.$queryRaw`SELECT "id" FROM "GameToolRoom" WHERE "id" = ${roomId} FOR UPDATE`;
  // Member rows cannot be independently replaced while the room is being decided.
  await tx.$queryRaw`SELECT "id" FROM "GameToolRoomMember" WHERE "roomId" = ${roomId} ORDER BY "id" FOR UPDATE`;
  return readRoom(tx, roomId);
}
async function transact(roomId: string, work: (tx: Tx, room: Room, now: number) => Promise<Outcome>): Promise<Outcome> {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      let revision: number | undefined;
      const result = await prisma.$transaction(async tx => {
        const room = await lockRoom(tx, roomId);
        if (!room || room.kind !== "DOUDIZHU" || !stateOf(room)) return { error: "ROOM_NOT_FOUND" };
        const result = await work(tx, room, Date.now());
        const after = await tx.gameToolRoom.findUnique({ where: { id: roomId }, select: { revision: true } });
        if (after && after.revision > room.revision) revision = after.revision;
        return result;
      }, { maxWait: 5_000, timeout: 10_000 });
      if (revision !== undefined) await broadcastDdzRoomChange(roomId, revision);
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) continue;
      throw error;
    }
  }
  return { error: "TRY_AGAIN" };
}
async function record(tx: Tx, roomId: string, actor: string, commandId: string, hash: string, gameNo: number, result: object, createKey?: string) {
  await tx.ddzCommand.create({ data: { roomId, actorProfileId: actor, commandId, actionHash: hash, gameNo, result: json(result), createKey } });
}
async function receipt(tx: Tx, room: Room, actor: string, commandId: string, hash: string, now: number): Promise<Outcome | null> {
  const previous = await tx.ddzCommand.findUnique({ where: { roomId_commandId: { roomId: room.id, commandId } } });
  if (!previous) return null;
  const mismatch = ddzReceiptError(previous, actor, hash);
  if (mismatch) return { error: mismatch };
  const saved = previous.result as { error?: string; roomId?: string };
  // A lost-response retry is also a real reconnection. Refresh a still-authorized
  // member before result cleanup, but never revive a member who explicitly left.
  if (memberSeat(room, actor) && room.status !== "CANCELLED") {
    await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    room = await expire(tx, await refresh(room, tx), now);
  }
  if (saved.error) return { error: saved.error };
  // A departed actor can confirm their receipt but may not see new hands or members.
  const authorized = view(room, actor, now);
  return authorized ? { room: authorized, ...(saved.roomId ? { roomId: saved.roomId } : {}) } : { ok: true };
}
async function activeElsewhere(tx: Tx, ids: string[], roomId?: string) {
  // Serialize starts within this service. Other games also need this convention for a global guarantee.
  for (const id of [...ids].sort()) await tx.$queryRaw`SELECT "id" FROM "UserProfile" WHERE "id" = ${id} FOR UPDATE`;
  return Boolean(await tx.gameToolRoom.findFirst({ where: { id: roomId ? { not: roomId } : undefined, status: "IN_PROGRESS", seats: { some: { profileId: { in: ids }, leftAt: null } } }, select: { id: true } }));
}

export async function createDdzRoom(input: { commandId: string; profileId: string; name: string; locale: string }): Promise<Outcome> {
  const createKey = `${input.profileId}:${input.commandId}`, hash = hashDdzRequest("create", { locale: input.locale });
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const code = await createUniqueGameToolRoomCode();
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "UserProfile" WHERE "id" = ${input.profileId} FOR UPDATE`;
        const previous = await tx.ddzCommand.findUnique({ where: { createKey } });
        if (previous) { const error = ddzReceiptError(previous, input.profileId, hash); return error ? { error } : { roomId: previous.roomId }; }
        if (await activeElsewhere(tx, [input.profileId])) return { error: "ACTIVE_ROOM_EXISTS" };
        const state = createDdzState([{ seat: 0, name: input.name.slice(0, 40), profileId: input.profileId }]);
        const room = await tx.gameToolRoom.create({ data: { code, kind: "DOUDIZHU", hostId: input.profileId, locale: input.locale, title: "斗地主", mode: "classic", playerCount: 1, state: json(state), config: { returnedProfileIds: [], reactions: [] },
          seats: { create: { seatNumber: 0, profileId: input.profileId, displayName: input.name.slice(0, 40), privateToken: createGameToolPrivateToken(), appearance: { catId: fallbackDrawGuessCatId(input.profileId) } } } }, include: { seats: true } });
        await tx.gameToolRoomMember.create({ data: { roomId: room.id, profileId: input.profileId, seatedSeatId: room.seats[0].id, memberToken: createGameToolPrivateToken() } });
        await record(tx, room.id, input.profileId, input.commandId, hash, state.gameNo, { ok: true, roomId: room.id }, createKey);
        return { roomId: room.id };
      });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) continue; throw error; }
  }
  return { error: "TRY_AGAIN" };
}
export async function joinDdzRoom(input: { commandId: string; code: string; profileId: string; name: string; expectedRoomId?: string }): Promise<Outcome> {
  const found = await prisma.gameToolRoom.findUnique({ where: { code: input.code.toUpperCase().trim() }, select: { id: true, kind: true } });
  if (!found || found.kind !== "DOUDIZHU" || input.expectedRoomId && found.id !== input.expectedRoomId) return { error: "ROOM_NOT_FOUND" };
  const hash = hashDdzRequest("join", { code: input.code.toUpperCase().trim(), expectedRoomId: input.expectedRoomId });
  return transact(found.id, async (tx, original, now) => {
    const replay = await receipt(tx, original, input.profileId, input.commandId, hash, now); if (replay) return replay;
    // A still-seated recovery is presence before an expired result is cleaned.
    if (memberSeat(original, input.profileId) && original.status !== "CANCELLED") {
      await tx.gameToolRoomMember.updateMany({ where: { roomId: original.id, profileId: input.profileId, leftAt: null }, data: { lastSeenAt: new Date(now) } });
      original = await refresh(original, tx);
    }
    let room = await expire(tx, original, now), state = stateOf(room)!;
    let error: string | undefined;
    const existing = memberSeat(room, input.profileId, true);
    if (room.status === "CANCELLED") error = "ROOM_NOT_FOUND";
    else if (existing?.leftAt && state.phase !== "LOBBY" && input.expectedRoomId !== room.id) error = "ROOM_ID_REQUIRED";
    else if (!existing && state.phase !== "LOBBY") error = "GAME_STARTED";
    else if (!existing && room.seats.length >= 3) error = "ROOM_FULL";
    else if (await activeElsewhere(tx, [input.profileId], room.id)) error = "ACTIVE_ROOM_EXISTS";
    if (!error) {
      let seatId = existing?.id;
      if (existing) await tx.gameToolSeat.update({ where: { id: existing.id }, data: { leftAt: null } });
      else {
        const number = [0, 1, 2].find(n => !room.seats.some(s => s.seatNumber === n))!;
        const seat = await tx.gameToolSeat.create({ data: { roomId: room.id, profileId: input.profileId, seatNumber: number, displayName: input.name.slice(0, 40), privateToken: createGameToolPrivateToken(), appearance: { catId: fallbackDrawGuessCatId(input.profileId) } } });
        seatId = seat.id;
      }
      await tx.gameToolRoomMember.upsert({ where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
        create: { roomId: room.id, profileId: input.profileId, seatedSeatId: seatId, memberToken: createGameToolPrivateToken(), lastSeenAt: new Date(now) },
        update: { seatedSeatId: seatId, leftAt: null, lastSeenAt: new Date(now) } });
      room = await refresh(room, tx);
      state = state.phase === "LOBBY" ? lobbyState(room) : state;
      await persist(tx, room, state, now, { playerCount: room.seats.length, config: json({ ...config(room), emptySince: undefined }), ddzDeadlineAt: state.deadlineAt ? new Date(state.deadlineAt) : null });
      room = await transferHost(tx, await refresh(room, tx), now);
    }
    await record(tx, room.id, input.profileId, input.commandId, hash, state.gameNo, error ? { error } : { ok: true, roomId: room.id });
    return error ? { error } : { roomId: room.id };
  });
}
export async function getDdzRoomView(roomId: string, actor: string): Promise<Outcome> {
  return transact(roomId, async (tx, original, now) => {
    if (original.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    if (!memberSeat(original, actor)) return { error: "NOT_A_MEMBER" };
    await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    let room = await refresh(original, tx);
    room = await expire(tx, room, now);
    room = await transferHost(tx, room, now);
    const result = view(room, actor, now);
    return result ? { room: result } : { error: "NOT_A_MEMBER" };
  });
}
export async function commandDdzRoom(roomId: string, actor: string, command: DdzRoomCommand): Promise<Outcome> {
  const hash = hashDdzRequest("action", command);
  return transact(roomId, async (tx, original, now) => {
    const replay = await receipt(tx, original, actor, command.commandId, hash, now); if (replay) return replay;
    const seat = memberSeat(original, actor);
    if (!seat || original.status === "CANCELLED") return { error: "NOT_A_MEMBER" };
    await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    let room = await expire(tx, await refresh(original, tx), now), state = stateOf(room)!;
    if (!memberSeat(room, actor)) return { error: "NOT_A_MEMBER" };
    let error: string | null | undefined = ddzCommandConflict(state, room.revision, seat.seatNumber, command);
    let next = state;
    if (!error && command.action.type === "START") {
      if (room.hostId !== actor) error = "HOST_ONLY";
      else if (state.phase !== "LOBBY") error = "WRONG_PHASE";
      else if (room.seats.length !== 3 || room.seats.some(s => !s.profileId)) error = "INVALID_PLAYERS";
      else if (!room.seats.every(s => s.readyAt && !s.leftAt && room.members.some(m => m.seatedSeatId === s.id && !m.leftAt && now - m.lastSeenAt.getTime() < PRESENCE_MS))) error = "PLAYERS_NOT_READY";
      else if (await activeElsewhere(tx, room.seats.map(s => s.profileId!), room.id)) error = "ACTIVE_ROOM_EXISTS";
      else { const result = startDdzGame(lobbyState(room), now, { deck: shuffle(), firstBidSeat: randomInt(3) }); next = result.state; error = result.error; }
    } else if (!error && command.action.type !== "START") {
      const action = command.action.type === "PLAY" ? { ...command.action, handVersion: command.handVersion } : command.action;
      const result = applyDdzAction(state, seat.seatNumber, action, now, shuffle); next = result.state; error = result.error;
    }
    if (!error) { await persist(tx, room, next, now, command.action.type === "START" ? { config: { returnedProfileIds: [], reactions: [] } } : {}); room = await refresh(room, tx); }
    await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    await record(tx, roomId, actor, command.commandId, hash, command.gameNo, error ? { error } : { ok: true, revision: room.revision });
    return error ? { error } : { room: view(room, actor, now)! };
  });
}

type Mutation = DdzRoomMutation & ({ type: "READY"; ready: boolean } | { type: "SETTINGS"; settings: DdzRoomSettings } | { type: "CHARACTER"; catId: string } | { type: "LEAVE" } | { type: "RETURN" } | { type: "REMOVE"; targetSeat: number } | { type: "CLOSE" });
export async function mutateDdzRoom(roomId: string, actor: string, mutation: Mutation): Promise<Outcome> {
  const hash = hashDdzRequest("mutation", mutation);
  return transact(roomId, async (tx, original, now) => {
    const replay = await receipt(tx, original, actor, mutation.commandId, hash, now); if (replay) return replay;
    const seat = memberSeat(original, actor);
    if (!seat || original.status === "CANCELLED") return { error: "NOT_A_MEMBER" };
    await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    let room = await expire(tx, await refresh(original, tx), now), state = stateOf(room)!;
    if (!memberSeat(room, actor)) return { error: "NOT_A_MEMBER" };
    let error: string | null = ddzMutationConflict(state, room.revision, mutation);
    if (!error && ["READY", "CHARACTER", "REMOVE", "SETTINGS"].includes(mutation.type) && state.phase !== "LOBBY") error = "WRONG_PHASE";
    if (!error && ["REMOVE", "CLOSE", "SETTINGS"].includes(mutation.type) && room.hostId !== actor) error = "HOST_ONLY";
    if (!error && mutation.type === "CLOSE" && !["LOBBY", "RESULT"].includes(state.phase)) error = "WRONG_PHASE";
    if (!error && mutation.type === "CHARACTER" && !isDrawGuessCatId(mutation.catId)) error = "INVALID_CHARACTER";
    if (!error && mutation.type === "RETURN" && state.phase !== "RESULT") error = "WRONG_PHASE";
    if (!error) {
      await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
      room = await refresh(room, tx);
      switch (mutation.type) {
        case "SETTINGS": {
          const changed = updateDdzRoomSettings(state, mutation.settings);
          if (changed.error) { error = changed.error; break; }
          const before = getDdzRoomSettings(state), after = getDdzRoomSettings(changed.state);
          if (before.roundCount !== after.roundCount || before.playSeconds !== after.playSeconds) {
            await tx.gameToolSeat.updateMany({ where: { roomId }, data: { readyAt: null } });
            await tx.gameToolRoomMember.updateMany({ where: { roomId }, data: { readyAt: null } });
            await persist(tx, room, changed.state, now);
          }
          break;
        }
        case "READY":
          await tx.gameToolSeat.update({ where: { id: seat.id }, data: { readyAt: mutation.ready ? new Date(now) : null } });
          await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor }, data: { readyAt: mutation.ready ? new Date(now) : null } });
          await persist(tx, room, state, now); break;
        case "CHARACTER":
          await tx.gameToolSeat.update({ where: { id: seat.id }, data: { appearance: { catId: mutation.catId } } });
          room = await refresh(room, tx); await persist(tx, room, lobbyState(room), now); break;
        case "LEAVE": case "REMOVE": {
          const target = mutation.type === "LEAVE" ? seat : room.seats.find(s => s.seatNumber === mutation.targetSeat);
          if (!target || mutation.type === "REMOVE" && target.profileId === actor) { error = "INVALID_TARGET"; break; }
          await tx.gameToolRoomMember.updateMany({ where: { roomId, seatedSeatId: target.id }, data: { leftAt: new Date(now), readyAt: null } });
          if (state.phase === "LOBBY") {
            await tx.gameToolSeat.delete({ where: { id: target.id } }); room = await refresh(room, tx); state = lobbyState(room);
          } else {
            await tx.gameToolSeat.update({ where: { id: target.id }, data: { leftAt: new Date(now), readyAt: null } });
            if (["BIDDING", "PLAYING"].includes(state.phase)) state = applyDdzAction(state, target.seatNumber, { type: "SET_MANAGED", managed: true }, now, shuffle).state;
          }
          await persist(tx, room, state, now, { playerCount: state.phase === "LOBBY" ? room.seats.length : room.playerCount,
            config: json({ ...config(room), ...(!room.seats.length ? { emptySince: now } : {}), reactions: (config(room).reactions ?? []).filter(r => r.seat !== target.seatNumber) }),
            ...(!room.seats.length ? { ddzDeadlineAt: new Date(now + EMPTY_MS) } : {}) });
          room = await transferHost(tx, await refresh(room, tx), now); break;
        }
        case "RETURN": {
          const returned = [...new Set([...(config(room).returnedProfileIds ?? []), actor])];
          const active = room.members.filter(m => m.profileId && !m.leftAt && m.seatedSeatId && now - m.lastSeenAt.getTime() < HOST_STALE_MS);
          if (active.every(m => returned.includes(m.profileId!))) room = await resetLobby(tx, room, now);
          else await persist(tx, room, state, now, { config: json({ ...config(room), returnedProfileIds: returned }) });
          break;
        }
        case "CLOSE":
          await tx.gameToolRoomMember.updateMany({ where: { roomId }, data: { leftAt: new Date(now), readyAt: null } });
          await tx.gameToolSeat.updateMany({ where: { roomId }, data: { leftAt: new Date(now), readyAt: null } });
          await persist(tx, room, { ...state, phase: "CLOSED", deadlineAt: null }, now); break;
      }
    }
    await record(tx, roomId, actor, mutation.commandId, hash, mutation.gameNo, error ? { error } : { ok: true });
    if (error) return { error };
    room = await refresh(room, tx);
    const snapshot = view(room, actor, now);
    return snapshot ? { room: snapshot } : { ok: true };
  });
}
export async function reactDdzRoom(roomId: string, actor: string, input: { commandId: string; reactionId: string; gameNo: number; expectedPhase: DdzState["phase"]; kind: DdzReaction["kind"] }): Promise<Outcome> {
  const hash = hashDdzRequest("reaction", input);
  return transact(roomId, async (tx, original, now) => {
    const replay = await receipt(tx, original, actor, input.commandId, hash, now); if (replay) return replay;
    const seat = memberSeat(original, actor); if (!seat || original.status === "CANCELLED") return { error: "NOT_A_MEMBER" };
    await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId: actor, leftAt: null }, data: { lastSeenAt: new Date(now) } });
    let room = await expire(tx, await refresh(original, tx), now); const state = stateOf(room)!, saved = config(room);
    if (!memberSeat(room, actor)) return { error: "NOT_A_MEMBER" };
    let error = input.gameNo !== state.gameNo ? "STALE_GAME" : input.expectedPhase !== state.phase ? "WRONG_PHASE" : null;
    const previous = (saved.reactions ?? []).find(r => r.seat === seat.seatNumber);
    if (!error && previous && now - previous.createdAt < 3_000) error = "REACTION_COOLDOWN";
    if (!error) {
      const reactions = [...(saved.reactions ?? []).filter(r => r.seat !== seat.seatNumber && r.expiresAt > now), { id: input.reactionId, seat: seat.seatNumber, kind: input.kind, createdAt: now, expiresAt: now + 4_500 }];
      await persist(tx, room, state, now, { config: json({ ...saved, reactions }) }); room = await refresh(room, tx);
    }
    await record(tx, roomId, actor, input.commandId, hash, input.gameNo, error ? { error } : { ok: true });
    return error ? { error } : { room: view(room, actor, now)! };
  });
}
export async function getDdzRoomHistory(roomId: string, actor: string) {
  const rounds = await prisma.ddzRound.findMany({ where: { roomId, participantProfileIds: { has: actor } }, orderBy: { gameNo: "desc" }, take: 20 });
  return { rounds: rounds.map(round => ({ ...(round.summary as unknown as Omit<DdzRoundSummary, "finishedAt">), finishedAt: round.finishedAt.toISOString() })) };
}
export async function sweepDueDdzRooms(limit = 100) {
  const rooms = await prisma.gameToolRoom.findMany({ where: { kind: "DOUDIZHU", status: { in: ["LOBBY", "IN_PROGRESS", "FINISHED"] }, ddzDeadlineAt: { lte: new Date() } }, orderBy: { ddzDeadlineAt: "asc" }, take: Math.max(1, Math.min(100, limit)), select: { id: true } });
  let advanced = 0, errors = 0;
  for (const candidate of rooms) { try {
    const result = await transact(candidate.id, async (tx, room, now) => { const next = await expire(tx, room, now); return { ok: next.revision > room.revision }; });
    if (result.ok) advanced++; if (result.error) errors++;
  } catch { errors++; console.warn("[doudizhu] deadline sweep failed", { roomId: candidate.id }); } }
  // Closed private state and receipts share one lifetime; never discard receipts
  // while leaving an accessible room that could accept a duplicate old command.
  let cleanedRooms = 0, cleanedSummaries = 0;
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    const expired = await prisma.gameToolRoom.findMany({ where: { kind: "DOUDIZHU", status: "CANCELLED", cancelledAt: { lte: cutoff } }, select: { id: true }, take: 20 });
    if (expired.length) cleanedRooms = (await prisma.gameToolRoom.deleteMany({ where: { id: { in: expired.map(r => r.id) }, kind: "DOUDIZHU", status: "CANCELLED", cancelledAt: { lte: cutoff } } })).count;
    cleanedSummaries = (await prisma.ddzRound.deleteMany({ where: { finishedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60_000) } } })).count;
  } catch { errors++; console.warn("[doudizhu] retention cleanup failed"); }
  return { scanned: rooms.length, advanced, errors, cleanedRooms, cleanedSummaries };
}
