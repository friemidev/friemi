import "server-only";

import { createHash, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createGameToolPrivateToken, createUniqueGameToolRoomCode } from "./gameToolRooms";
import { fallbackDrawGuessCatId, isDrawGuessCatId } from "./drawGuessCats";
import { advanceUnoDeadline, applyUnoAction, createUnoState, getUnoViewerState, startUnoGame } from "./unoEngine";
import { configureUnoLobby, DEFAULT_UNO_RULES, getUnoRules } from "./unoRules";
import { unoReactionSchema, unoRoomSettingsSchema } from "./unoRequest";
import { broadcastUnoRoomChange } from "./unoRealtimeServer";
import { UNO_REACTION_COOLDOWN_MS, UNO_REACTION_DURATION_MS, type UnoReaction, type UnoReactionCommand } from "./unoReactions";
import type { UnoRoomCommand, UnoRoomView } from "./unoRoomTypes";
import type { UnoMatchMode, UnoRoomSettings, UnoRuleSettings, UnoState } from "./unoTypes";

const RETRIES = 6;
const PRESENCE_MS = 35_000;
const HOST_STALE_MS = 60_000;
const LOBBY_STALE_MS = 90_000;
const random = () => randomInt(0x100000000) / 0x100000000;
const json = (value: unknown) => value as Prisma.InputJsonValue;

function asState(value: Prisma.JsonValue | null): UnoState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as unknown as UnoState;
  if (![1, 2, 3].includes(state.rulesetVersion) || !Array.isArray(state.players) || !Number.isInteger(state.matchNumber)) return null;
  return state.phase === "LOBBY" && state.rulesetVersion < 3 ? configureUnoLobby(state, DEFAULT_UNO_RULES).state : state;
}

async function readRoom(roomId: string) {
  const room = await prisma.gameToolRoom.findUnique({
    where: { id: roomId },
    include: {
      seats: { orderBy: { seatNumber: "asc" }, include: { profile: { select: { avatarUrl: true } } } },
      members: true,
    },
  });
  return room?.status === "CANCELLED" ? null : room;
}
type Room = NonNullable<Awaited<ReturnType<typeof readRoom>>>;
type Config = { returnedProfileIds?: string[]; reactions?: UnoReaction[] };
type RoomResult = { room: UnoRoomView; error?: never } | { error: string; room?: never };

function config(room: Room): Config {
  return room.config && typeof room.config === "object" && !Array.isArray(room.config) ? room.config as Config : {};
}

function memberSeat(room: Room, profileId: string, allowLeft = false) {
  const member = room.members.find((item) => item.profileId === profileId && (allowLeft || !item.leftAt));
  return member ? room.seats.find((seat) => seat.id === member.seatedSeatId && seat.profileId === profileId) : undefined;
}

function roomView(room: Room, profileId: string): UnoRoomView | null {
  const state = asState(room.state);
  const viewer = memberSeat(room, profileId);
  if (!state || !viewer) return null;
  const now = Date.now();
  const returned = config(room).returnedProfileIds ?? [];
  return {
    id: room.id, code: room.code, revision: room.revision, serverNow: now,
    hostSeat: room.seats.find((seat) => seat.profileId === room.hostId)?.seatNumber ?? -1,
    viewerSeat: viewer.seatNumber,
    seats: room.seats.map((seat) => {
      const member = room.members.find((item) => item.profileId === seat.profileId && !item.leftAt);
      return { seat: seat.seatNumber, name: seat.displayName, avatarUrl: seat.profile?.avatarUrl ?? null,
        catId: isDrawGuessCatId(seat.roleKey) ? seat.roleKey : fallbackDrawGuessCatId(`${room.id}:${seat.seatNumber}`),
        ready: Boolean(seat.readyAt), connected: Boolean(member && member.lastSeenAt.getTime() > now - PRESENCE_MS),
        returned: Boolean(seat.profileId && returned.includes(seat.profileId)) };
    }),
    returnedToLobby: returned.includes(profileId),
    reactions: ["LOBBY", "PLAYING", "CHALLENGE"].includes(state.phase)
      ? (config(room).reactions ?? []).filter((reaction) => reaction.expiresAt > now && room.seats.some((seat) => seat.seatNumber === reaction.seat && !seat.leftAt))
      : [],
    state: getUnoViewerState(state, viewer.seatNumber),
  };
}

type PersistOptions = {
  command?: Pick<UnoRoomCommand, "commandId" | "matchNumber" | "roundNumber"> & { profileId: string; hash: string; error?: string };
  data?: Prisma.GameToolRoomUncheckedUpdateManyInput;
  mutate?: (tx: Prisma.TransactionClient) => Promise<void>;
};

async function persist(room: Room, before: UnoState, next: UnoState, options: PersistOptions = {}) {
  try {
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.gameToolRoom.updateMany({
        where: { id: room.id, kind: "UNO", revision: room.revision, status: { not: "CANCELLED" } },
        data: {
          state: json(next), revision: { increment: 1 },
          unoDeadlineAt: next.deadlineAt ? new Date(next.deadlineAt) : null,
          status: next.phase === "LOBBY" ? "LOBBY" : next.phase === "FINISHED" ? "FINISHED" : "IN_PROGRESS",
          startedAt: before.phase === "LOBBY" && next.phase !== "LOBBY" ? new Date() : undefined,
          finishedAt: next.phase === "FINISHED" ? room.finishedAt ?? new Date() : null,
          ...options.data,
        },
      });
      if (!updated.count) return false;
      await options.mutate?.(tx);
      if (options.command) {
        const command = options.command;
        await tx.unoCommand.create({ data: {
          roomId: room.id, commandId: command.commandId, actorProfileId: command.profileId,
          matchNumber: command.matchNumber, roundNumber: command.roundNumber, actionHash: command.hash,
          result: command.error ? { error: command.error } : { ok: true, revision: room.revision + 1 },
        } });
      }
      if (next.roundResult && (!before.roundResult || before.matchNumber !== next.matchNumber || before.roundNumber !== next.roundNumber)) {
        // Retain only score summaries and participants, never hands or shuffled decks.
        await tx.unoRound.create({ data: {
          roomId: room.id, matchNumber: next.matchNumber, roundNumber: next.roundNumber, finishedAt: new Date(),
          summary: json({ rulesetVersion: next.rulesetVersion, ...getUnoRules(next), matchMode: next.matchMode ?? "score", result: next.roundResult,
            players: next.players.map((player) => ({ seat: player.seat, name: player.name, score: player.score })),
            participantProfileIds: room.seats.flatMap((seat) => seat.profileId ? [seat.profileId] : []),
          }),
        } });
      }
      return true;
    });
    if (changed) await broadcastUnoRoomChange(room.id, room.revision + 1);
    return changed;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return false;
    if (error instanceof Error && error.message === "PRESENCE_CHANGED") return false;
    throw error;
  }
}

function lobbyState(room: Room, seats = room.seats, nextMatch = false) {
  const previous = asState(room.state)!;
  const state = createUnoState(seats.map((seat) => ({ seat: seat.seatNumber, name: seat.displayName })), { turnSeconds: previous.turnSeconds, targetScore: previous.targetScore, matchMode: previous.matchMode ?? "score", ...(previous.rulesetVersion === 3 ? getUnoRules(previous) : {}) });
  state.matchNumber = previous.matchNumber + (nextMatch ? 1 : 0);
  return state;
}

export async function createUnoRoom(input: { profileId: string; name: string; locale: string; turnSeconds?: 30 | 60 | 90 }) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const state = createUnoState([{ seat: 0, name: input.name.slice(0, 40) }], { turnSeconds: input.turnSeconds });
      const code = await createUniqueGameToolRoomCode();
      const room = await prisma.$transaction(async (tx) => {
        const created = await tx.gameToolRoom.create({ data: {
          code, hostId: input.profileId, kind: "UNO", locale: input.locale, title: "Friemi UNO", mode: "classic", playerCount: 1,
          state: json(state), config: { returnedProfileIds: [] },
          seats: { create: { seatNumber: 0, displayName: input.name.slice(0, 40), profileId: input.profileId, privateToken: createGameToolPrivateToken() } },
        }, include: { seats: true } });
        await tx.gameToolSeat.update({ where: { id: created.seats[0].id }, data: { roleKey: fallbackDrawGuessCatId(`${created.id}:0`) } });
        await tx.gameToolRoomMember.create({ data: {
          roomId: created.id, profileId: input.profileId, memberToken: createGameToolPrivateToken(), seatedSeatId: created.seats[0].id,
        } });
        return created;
      });
      return { roomId: room.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { error: "TRY_AGAIN" };
}

export async function joinUnoRoom(input: { code: string; profileId: string; name: string; expectedRoomId?: string }) {
  const found = await prisma.gameToolRoom.findUnique({ where: { code: input.code.trim().toUpperCase() }, select: { id: true, kind: true } });
  if (!found || found.kind !== "UNO" || input.expectedRoomId && found.id !== input.expectedRoomId) return { error: "ROOM_NOT_FOUND" };
  // An abandoned full lobby may need to retire stale seats before admission.
  for (let attempt = 0; attempt < RETRIES + 10; attempt += 1) {
    const room = await readRoom(found.id);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || room.status === "CANCELLED" || !state) return { error: "ROOM_NOT_FOUND" };
    const existing = room.seats.find((seat) => seat.profileId === input.profileId);
    if (existing) {
      const changed = await persist(room, state, state, { mutate: async (tx) => {
        await tx.gameToolSeat.update({ where: { id: existing.id }, data: { leftAt: null } });
        await tx.gameToolRoomMember.upsert({
          where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
          create: { roomId: room.id, profileId: input.profileId, seatedSeatId: existing.id, memberToken: createGameToolPrivateToken() },
          update: { leftAt: null, lastSeenAt: new Date(), seatedSeatId: existing.id },
        });
      } });
      if (changed) return { roomId: room.id };
      continue;
    }
    if (state.phase !== "LOBBY") return { error: "GAME_STARTED" };
    if (room.seats.length >= 10) {
      const staleBefore = new Date(Date.now() - LOBBY_STALE_MS);
      const stale = room.members.find((member) => member.profileId && !member.leftAt && member.lastSeenAt <= staleBefore
        && room.seats.some((seat) => seat.id === member.seatedSeatId));
      if (!stale?.profileId) return { error: "ROOM_FULL" };
      await leaveUnoRoom(room.id, stale.profileId, staleBefore);
      continue;
    }
    const taken = new Set(room.seats.map((seat) => seat.seatNumber));
    const seatNumber = Array.from({ length: 10 }, (_, index) => index).find((seat) => !taken.has(seat))!;
    const next = createUnoState([...state.players.map(({ seat, name }) => ({ seat, name })), { seat: seatNumber, name: input.name.slice(0, 40) }].sort((a, b) => a.seat - b.seat), { turnSeconds: state.turnSeconds, targetScore: state.targetScore, matchMode: state.matchMode ?? "score", ...(state.rulesetVersion === 3 ? getUnoRules(state) : {}) });
    next.matchNumber = state.matchNumber;
    const changed = await persist(room, state, next, { data: { playerCount: room.seats.length + 1 }, mutate: async (tx) => {
      const seat = await tx.gameToolSeat.create({ data: { roomId: room.id, profileId: input.profileId, seatNumber, displayName: input.name.slice(0, 40), roleKey: fallbackDrawGuessCatId(`${room.id}:${seatNumber}`), privateToken: createGameToolPrivateToken() } });
      await tx.gameToolRoomMember.upsert({
        where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
        create: { roomId: room.id, profileId: input.profileId, seatedSeatId: seat.id, memberToken: createGameToolPrivateToken() },
        update: { leftAt: null, readyAt: null, lastSeenAt: new Date(), seatedSeatId: seat.id },
      });
    } });
    if (changed) return { roomId: room.id };
  }
  return { error: "TRY_AGAIN" };
}

async function refreshPresence(room: Room, profileId: string) {
  const now = new Date();
  await prisma.gameToolRoomMember.updateMany({ where: { roomId: room.id, profileId, leftAt: null, lastSeenAt: { lt: new Date(now.getTime() - 10_000) } }, data: { lastSeenAt: now } });
  const current = room.members.find((member) => member.profileId === profileId && !member.leftAt);
  if (current) current.lastSeenAt = now;
  const host = room.members.find((member) => member.profileId === room.hostId && !member.leftAt);
  if (room.hostId === profileId || host && host.lastSeenAt.getTime() > now.getTime() - HOST_STALE_MS) return false;
  const successor = room.seats.find((seat) => seat.profileId && room.members.some((member) => member.profileId === seat.profileId && !member.leftAt && (member.profileId === profileId || member.lastSeenAt.getTime() > now.getTime() - HOST_STALE_MS)));
  const state = asState(room.state);
  if (!successor?.profileId || !state) return false;
  return persist(room, state, state, {
    data: { hostId: successor.profileId },
    mutate: async (tx) => {
      if (!host) return;
      // A heartbeat can race without changing room.revision. Lock and recheck
      // the original host membership before committing a succession decision.
      const currentHost = await tx.$queryRaw<{ leftAt: Date | null; lastSeenAt: Date }[]>`
        SELECT "leftAt", "lastSeenAt" FROM "GameToolRoomMember" WHERE "id" = ${host.id} FOR UPDATE
      `;
      if (currentHost[0] && !currentHost[0].leftAt && currentHost[0].lastSeenAt.getTime() > now.getTime() - HOST_STALE_MS) throw new Error("PRESENCE_CHANGED");
    },
  });
}

async function advanceRoomDeadline(room: Room) {
  const state = asState(room.state);
  if (!state?.deadlineAt || state.deadlineAt > Date.now()) return false;
  const next = advanceUnoDeadline(state, Date.now(), random);
  return next !== state && await persist(room, state, next);
}

export async function getUnoRoomView(roomId: string, profileId: string): Promise<RoomResult> {
  // Up to nine stale lobby seats may each require a successful revision update.
  // Reserve the normal contention budget in addition to that finite cleanup.
  for (let attempt = 0; attempt < RETRIES + 10; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "UNO" || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    if (!memberSeat(room, profileId)) return { error: "NOT_A_MEMBER" };
    if (await refreshPresence(room, profileId)) continue;
    const state = asState(room.state);
    if (!state) return { error: "ROOM_NOT_FOUND" };
    if (state.phase === "LOBBY") {
      const stale = room.members.find((member) => member.profileId && member.profileId !== profileId && !member.leftAt && member.lastSeenAt.getTime() <= Date.now() - LOBBY_STALE_MS);
      if (stale?.profileId) { await leaveUnoRoom(room.id, stale.profileId, new Date(Date.now() - LOBBY_STALE_MS)); continue; }
    }
    if (["ROUND_END", "FINISHED"].includes(state.phase) && (config(room).returnedProfileIds ?? []).includes(profileId)) {
      const returned = config(room).returnedProfileIds ?? [];
      const present = room.members.filter((member) => !member.leftAt && member.profileId && (member.profileId === profileId || member.lastSeenAt.getTime() > Date.now() - HOST_STALE_MS));
      if (present.every((member) => member.profileId && returned.includes(member.profileId))) return returnToUnoLobby(roomId, profileId);
    }
    if (state.deadlineAt && state.deadlineAt <= Date.now()) { await advanceRoomDeadline(room); continue; }
    const view = roomView(room, profileId);
    return view ? { room: view } : { error: "NOT_A_MEMBER" };
  }
  return { error: "TRY_AGAIN" };
}

export async function setUnoCharacter(roomId: string, profileId: string, catId: string, expectedRevision?: number): Promise<RoomResult> {
  if (!isDrawGuessCatId(catId)) return { error: "INVALID_CHARACTER" };
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    const seat = memberSeat(room, profileId);
    if (!seat) return { error: "NOT_A_MEMBER" };
    if (expectedRevision !== undefined && room.revision !== expectedRevision) return { error: "STALE_COMMAND" };
    if (state.phase !== "LOBBY") return { error: "WRONG_PHASE" };
    if (seat.roleKey === catId) return getUnoRoomView(roomId, profileId);
    if (await persist(room, state, state, { mutate: async (tx) => {
      await tx.gameToolSeat.update({ where: { id: seat.id }, data: { roleKey: catId } });
      await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null }, data: { lastSeenAt: new Date() } });
    } })) return getUnoRoomView(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

export async function setUnoRoomReady(roomId: string, profileId: string, ready: boolean, expectedRevision?: number) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    const seat = memberSeat(room, profileId);
    if (!seat) return { error: "NOT_A_MEMBER" };
    if (expectedRevision !== undefined && room.revision !== expectedRevision) return { error: "STALE_COMMAND" };
    if (state.phase !== "LOBBY") return { error: "WRONG_PHASE" };
    if (await persist(room, state, state, { mutate: async (tx) => {
      await tx.gameToolSeat.update({ where: { id: seat.id }, data: { readyAt: ready ? new Date() : null } });
      await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null }, data: { lastSeenAt: new Date(), readyAt: ready ? new Date() : null } });
    } })) return getUnoRoomView(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

export async function updateUnoRoomSettings(roomId: string, profileId: string, input: 30 | 60 | 90 | UnoRoomSettings, expectedRevision?: number) {
  const parsed = unoRoomSettingsSchema.safeParse(typeof input === "number" ? { turnSeconds: input } : input);
  if (!parsed.success) return { error: "INVALID_REQUEST" };
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state) return { error: "ROOM_NOT_FOUND" };
    if (!memberSeat(room, profileId)) return { error: "NOT_A_MEMBER" };
    if (expectedRevision !== undefined && room.revision !== expectedRevision) return { error: "STALE_COMMAND" };
    if (room.hostId !== profileId) return { error: "HOST_ONLY" };
    if (state.phase !== "LOBBY") return { error: "WRONG_PHASE" };
    const next = configureUnoLobby(state, parsed.data).state;
    if (next.rulesetVersion === state.rulesetVersion && next.turnSeconds === state.turnSeconds && next.matchMode === (state.matchMode ?? "score")
      && (["stackDraws", "challengeDrawFour", "allowActionFinish"] as const).every(key => next[key] === state[key])) return getUnoRoomView(roomId, profileId);
    if (await persist(room, state, next, { mutate: async (tx) => {
      await tx.gameToolSeat.updateMany({ where: { roomId }, data: { readyAt: null } });
      await tx.gameToolRoomMember.updateMany({ where: { roomId }, data: { readyAt: null } });
    } })) return getUnoRoomView(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

async function currentUnoRoomSnapshot(roomId: string, profileId: string): Promise<RoomResult> {
  const room = await readRoom(roomId);
  if (!room || room.kind !== "UNO" || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
  const view = roomView(room, profileId);
  return view ? { room: view } : { error: "NOT_A_MEMBER" };
}

export async function sendUnoReaction(roomId: string, profileId: string, input: UnoReactionCommand): Promise<RoomResult> {
  if (!unoReactionSchema.safeParse(input).success) return { error: "INVALID_REACTION" };
  const commandId = `reaction_${input.reactionId.toLowerCase()}`;
  const hash = createHash("sha256").update(JSON.stringify({ scope: "reaction", kind: input.kind, matchNumber: input.matchNumber, roundNumber: input.roundNumber })).digest("hex");
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    const seat = memberSeat(room, profileId);
    if (!seat) return { error: "NOT_A_MEMBER" };
    const previous = await prisma.unoCommand.findUnique({ where: { roomId_commandId: { roomId, commandId } } });
    if (previous) {
      if (previous.actorProfileId !== profileId || previous.actionHash !== hash) return { error: "COMMAND_ID_USED" };
      return currentUnoRoomSnapshot(roomId, profileId);
    }
    if (input.matchNumber !== state.matchNumber || input.roundNumber !== state.roundNumber) return { error: "STALE_ROUND" };
    if (!["LOBBY", "PLAYING", "CHALLENGE"].includes(state.phase)) return { error: "WRONG_PHASE" };
    const now = Date.now();
    const saved = config(room);
    const latest = (saved.reactions ?? []).find((reaction) => reaction.seat === seat.seatNumber);
    if (latest && now - latest.createdAt < UNO_REACTION_COOLDOWN_MS) return { error: "REACTION_COOLDOWN" };
    const reaction: UnoReaction = { id: input.reactionId.toLowerCase(), seat: seat.seatNumber, kind: input.kind, createdAt: now, expiresAt: now + UNO_REACTION_DURATION_MS };
    const reactions = [...(saved.reactions ?? []).filter((item) => item.seat !== seat.seatNumber && item.expiresAt > now), reaction];
    if (await persist(room, state, state, {
      command: { commandId, profileId, hash, matchNumber: state.matchNumber, roundNumber: state.roundNumber },
      data: { config: json({ ...saved, reactions }) },
      mutate: async (tx) => { await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null }, data: { lastSeenAt: new Date() } }); },
    })) return currentUnoRoomSnapshot(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

export async function leaveUnoRoom(roomId: string, profileId: string, staleBefore?: Date, expectedRevision?: number) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state) return { error: "ROOM_NOT_FOUND" };
    const seat = memberSeat(room, profileId);
    if (!seat) return { ok: true };
    if (expectedRevision !== undefined && room.revision !== expectedRevision) return { error: "STALE_COMMAND" };
    const otherSeats = room.seats.filter((item) => item.id !== seat.id);
    const successor = otherSeats.find((item) => item.profileId && room.members.some((member) => member.profileId === item.profileId && !member.leftAt))?.profileId;
    const next = state.phase === "LOBBY" ? lobbyState(room, otherSeats) : state;
    if (await persist(room, state, next, {
      data: { config: json({ ...config(room), reactions: (config(room).reactions ?? []).filter((reaction) => reaction.seat !== seat.seatNumber) }),
        ...(room.hostId === profileId && successor ? { hostId: successor } : {}),
        ...(state.phase === "LOBBY" ? { playerCount: otherSeats.length, ...(!otherSeats.length ? { status: "CANCELLED", cancelledAt: new Date() } : {}) } : {}) },
      mutate: async (tx) => {
        const left = await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null, ...(staleBefore ? { lastSeenAt: { lte: staleBefore } } : {}) }, data: { leftAt: new Date(), readyAt: null } });
        if (!left.count) throw new Error("PRESENCE_CHANGED");
        if (state.phase === "LOBBY") await tx.gameToolSeat.delete({ where: { id: seat.id } });
        else await tx.gameToolSeat.update({ where: { id: seat.id }, data: { leftAt: new Date() } });
      },
    })) return { ok: true };
  }
  return { error: "TRY_AGAIN" };
}

export async function commandUnoRoom(roomId: string, profileId: string, command: UnoRoomCommand) {
  const hash = createHash("sha256").update(JSON.stringify({ expectedRevision: command.expectedRevision, matchNumber: command.matchNumber, roundNumber: command.roundNumber, turnId: command.turnId, action: command.action })).digest("hex");
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" };
    const seat = memberSeat(room, profileId);
    if (!seat) return { error: "NOT_A_MEMBER" };
    const previous = await prisma.unoCommand.findUnique({ where: { roomId_commandId: { roomId, commandId: command.commandId } } });
    if (previous) {
      if (previous.actorProfileId !== profileId || previous.actionHash !== hash) return { error: "COMMAND_ID_USED" };
      const result = previous.result as { error?: string };
      return result.error ? { error: result.error } : getUnoRoomView(roomId, profileId);
    }
    // An expired action is never replayed into the new turn, including a self-turn after a skip.
    if (state.deadlineAt && state.deadlineAt <= Date.now()) {
      await advanceRoomDeadline(room);
      continue;
    }
    let error: string | undefined;
    let next = state;
    if (command.matchNumber !== state.matchNumber || command.roundNumber !== state.roundNumber) error = "STALE_ROUND";
    else if (!["CALL_UNO", "CATCH_UNO"].includes(command.action.type) && command.turnId !== state.turnId) error = "STALE_TURN";
    else if (["START", "NEXT_ROUND", "REMATCH"].includes(command.action.type) && room.hostId !== profileId) error = "HOST_ONLY";
    else if (command.action.type === "START" && command.expectedRevision !== room.revision) error = "STALE_COMMAND";
    else if (command.action.type === "REMATCH") error = "RETURN_TO_LOBBY_FIRST";
    else if (command.action.type === "NEXT_ROUND" && (config(room).returnedProfileIds ?? []).length) error = "RETURN_TO_LOBBY_FIRST";
    else if (command.action.type === "START") {
      if (state.phase !== "LOBBY") error = "WRONG_PHASE";
      else if (room.seats.length < 2 || room.seats.length > 10) error = "INVALID_PLAYERS";
      else if (!room.seats.every((item) => item.readyAt && item.profileId && room.members.some((member) => member.profileId === item.profileId && !member.leftAt && member.lastSeenAt.getTime() > Date.now() - PRESENCE_MS))) error = "PLAYERS_NOT_READY";
      else { const result = startUnoGame(state, Date.now(), random); next = result.state; error = result.error; }
    } else {
      const result = applyUnoAction(state, seat.seatNumber, command.action, Date.now(), random);
      next = result.state; error = result.error;
    }
    if (await persist(room, state, next, {
      command: { ...command, profileId, hash, error },
      data: !error && ["START", "REMATCH", "NEXT_ROUND"].includes(command.action.type) ? { config: json({ ...config(room), returnedProfileIds: [] }) } : undefined,
      mutate: async (tx) => { await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null }, data: { lastSeenAt: new Date() } }); },
    })) return error ? { error } : getUnoRoomView(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

export async function returnToUnoLobby(roomId: string, profileId: string, expectedRevision?: number): Promise<RoomResult> {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const room = await readRoom(roomId);
    const state = room && asState(room.state);
    if (!room || room.kind !== "UNO" || !state) return { error: "ROOM_NOT_FOUND" };
    if (!memberSeat(room, profileId)) return { error: "NOT_A_MEMBER" };
    if (expectedRevision !== undefined && room.revision !== expectedRevision) return { error: "STALE_COMMAND" };
    if (state.phase === "LOBBY") return getUnoRoomView(roomId, profileId);
    if (!["ROUND_END", "FINISHED"].includes(state.phase)) return { error: "WRONG_PHASE" };
    const returned = new Set([...(config(room).returnedProfileIds ?? []), profileId]);
    const inactiveBefore = new Date(Date.now() - HOST_STALE_MS);
    const active = room.seats.filter((seat) => seat.profileId && room.members.some((member) => member.profileId === seat.profileId && !member.leftAt && (member.profileId === profileId || member.lastSeenAt > inactiveBefore)));
    const reset = active.every((seat) => seat.profileId && returned.has(seat.profileId));
    const next = reset ? lobbyState(room, active, true) : state;
    if (await persist(room, state, next, {
      data: { config: json({ ...config(room), returnedProfileIds: reset ? [] : [...returned], ...(reset ? { reactions: [] } : {}) }), ...(reset ? { playerCount: active.length, hostId: active.some((seat) => seat.profileId === room.hostId) ? room.hostId : profileId, startedAt: null } : {}) },
      mutate: async (tx) => {
        await tx.gameToolRoomMember.updateMany({ where: { roomId, profileId, leftAt: null }, data: { lastSeenAt: new Date() } });
        if (!reset) return;
        const retained = active.map((seat) => seat.id);
        const excluded = room.members.filter((member) => member.seatedSeatId && !retained.includes(member.seatedSeatId)).map((member) => member.id);
        // Heartbeats do not increment room revision. Lock and conditionally retire each
        // excluded membership so a newer heartbeat cannot lose its reserved seat.
        const removed = await tx.gameToolRoomMember.updateMany({
          where: { id: { in: excluded }, OR: [{ leftAt: { not: null } }, { lastSeenAt: { lte: inactiveBefore } }] },
          data: { leftAt: new Date(), readyAt: null },
        });
        if (removed.count !== excluded.length) throw new Error("PRESENCE_CHANGED");
        await tx.gameToolSeat.deleteMany({ where: { roomId, id: { notIn: retained } } });
        await tx.gameToolSeat.updateMany({ where: { roomId }, data: { readyAt: null } });
        await tx.gameToolRoomMember.updateMany({ where: { roomId }, data: { readyAt: null } });
      },
    })) return getUnoRoomView(roomId, profileId);
  }
  return { error: "TRY_AGAIN" };
}

export async function getUnoRoomHistory(roomId: string, profileId: string) {
  const member = await prisma.gameToolRoomMember.findUnique({ where: { roomId_profileId: { roomId, profileId } }, select: { id: true, room: { select: { kind: true } } } });
  if (!member || member.room.kind !== "UNO") return { error: "NOT_A_MEMBER" };
  const rounds = await prisma.unoRound.findMany({ where: { roomId }, orderBy: [{ matchNumber: "desc" }, { roundNumber: "desc" }], take: 100 });
  return { rounds: rounds.flatMap((round) => {
    const summary = round.summary as Partial<UnoRuleSettings> & { participantProfileIds?: string[]; rulesetVersion?: number; matchMode?: UnoMatchMode; result?: unknown; players?: unknown };
    const rules = getUnoRules({ ...summary, rulesetVersion: summary.rulesetVersion === 1 ? 1 : summary.rulesetVersion === 3 ? 3 : 2 });
    return summary.participantProfileIds?.includes(profileId) ? [{ matchNumber: round.matchNumber, roundNumber: round.roundNumber, matchMode: summary.matchMode ?? "score", finishedAt: round.finishedAt.toISOString(), rulesetVersion: summary.rulesetVersion, ...rules, result: summary.result, players: summary.players }] : [];
  }) };
}

export async function sweepDueUnoRooms(limit = 100) {
  const rooms = await prisma.gameToolRoom.findMany({ where: { kind: "UNO", status: "IN_PROGRESS", unoDeadlineAt: { lte: new Date() } }, orderBy: { unoDeadlineAt: "asc" }, take: Math.min(100, limit), select: { id: true } });
  let advanced = 0;
  let errors = 0;
  for (const candidate of rooms) {
    try {
      for (let attempt = 0; attempt < RETRIES; attempt += 1) {
        const room = await readRoom(candidate.id);
        const state = room && asState(room.state);
        if (!room || room.kind !== "UNO" || !state?.deadlineAt || state.deadlineAt > Date.now()) break;
        if (await advanceRoomDeadline(room)) { advanced += 1; break; }
      }
    } catch { errors += 1; console.warn("[uno] deadline sweep failed", { roomId: candidate.id }); }
  }
  return { scanned: rooms.length, advanced, errors };
}
