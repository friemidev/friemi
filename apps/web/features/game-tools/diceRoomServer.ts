import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { fallbackDrawGuessCatId } from "./drawGuessCats";
import { applyDiceAction, createDiceLobbyState, diceViewFor, DiceRuleError, removeDiceSeat, startDiceMatch, type DiceAction, type DiceRoomState } from "./diceRoomEngine";
import { broadcastDiceRoomChange } from "./diceRealtimeServer";
import { createGameToolPrivateToken, createUniqueGameToolRoomCode } from "./gameToolRooms";
import { prisma } from "@/lib/prisma";

const roll = () => randomInt(1, 7);
const json = (value: DiceRoomState) => value as unknown as Prisma.InputJsonValue;
const stateOf = (value: Prisma.JsonValue | null): DiceRoomState | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as unknown as DiceRoomState;
  return Array.isArray(state.seatNumbers) && Array.isArray(state.commandLog) && typeof state.phase === "string" ? state : null;
};
async function readRoom(roomId: string) {
  return prisma.gameToolRoom.findUnique({ where: { id: roomId }, include: {
    seats: { orderBy: { seatNumber: "asc" } },
    members: { where: { leftAt: null } },
  } });
}
type Room = NonNullable<Awaited<ReturnType<typeof readRoom>>>;
function activeSeat(room: Room, profileId: string) {
  if (!room.members.some((member) => member.profileId === profileId)) return null;
  return room.seats.find((seat) => seat.profileId === profileId && seat.leftAt === null) ?? null;
}
function publicRoom(room: Room, profileId: string) {
  const viewer = activeSeat(room, profileId);
  if (!viewer) return { error: "NOT_A_PLAYER" } as const;
  const state = stateOf(room.state);
  if (!state) return { error: "INVALID_STATE" } as const;
  return { room: {
    id: room.id, code: room.code, revision: room.revision, status: room.status,
    maxPlayers: room.playerCount, viewerSeat: viewer.seatNumber, isHost: room.hostId === profileId,
    seats: room.seats.filter((seat) => !seat.leftAt).map((seat) => ({
      number: seat.seatNumber, name: seat.displayName, ready: Boolean(seat.readyAt),
      isHost: room.hostId === seat.profileId, catId: fallbackDrawGuessCatId(seat.profileId ?? seat.id),
    })),
    view: diceViewFor(state, viewer.seatNumber),
  } } as const;
}

export async function createDiceRoom(input: { locale: string; hostId: string; hostName: string; maxPlayers: number }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await createUniqueGameToolRoomCode();
    try {
      const room = await prisma.$transaction(async (tx) => {
        const created = await tx.gameToolRoom.create({ data: {
          code, kind: "DICE", status: "LOBBY", locale: input.locale, title: "吹牛", mode: "BLUFF",
          playerCount: input.maxPlayers, hostId: input.hostId, state: json(createDiceLobbyState()),
        } });
        const seat = await tx.gameToolSeat.create({ data: {
          roomId: created.id, profileId: input.hostId, privateToken: createGameToolPrivateToken(),
          seatNumber: 1, displayName: input.hostName.slice(0, 32), readyAt: new Date(),
        } });
        await tx.gameToolRoomMember.create({ data: {
          roomId: created.id, profileId: input.hostId, memberToken: createGameToolPrivateToken(),
          seatedSeatId: seat.id, readyAt: new Date(),
        } });
        return created;
      });
      return { roomId: room.id, code: room.code } as const;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function joinDiceRoom(input: { code: string; profileId: string; displayName: string }) {
  const code = input.code.trim().toUpperCase();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const room = await prisma.gameToolRoom.findUnique({ where: { code }, include: { seats: true, members: true } });
    if (!room || room.kind !== "DICE" || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" } as const;
    const ownSeat = room.seats.find((seat) => seat.profileId === input.profileId);
    if (ownSeat?.leftAt) {
      if (room.status !== "LOBBY") return { error: "GAME_STARTED" } as const;
      if (room.seats.filter((seat) => !seat.leftAt).length >= room.playerCount) return { error: "ROOM_FULL" } as const;
      const member = room.members.find((item) => item.profileId === input.profileId);
      if (!member) return { error: "INVALID_STATE" } as const;
      const restored = await prisma.$transaction(async (tx) => {
        const reserved = await tx.gameToolRoom.updateMany({
          where: { id: room.id, revision: room.revision, status: "LOBBY" }, data: { revision: { increment: 1 } },
        });
        if (!reserved.count) return false;
        await tx.gameToolSeat.update({ where: { id: ownSeat.id }, data: {
          leftAt: null, readyAt: null, displayName: input.displayName.slice(0, 32),
        } });
        await tx.gameToolRoomMember.update({ where: { id: member.id }, data: {
          leftAt: null, readyAt: null, lastSeenAt: new Date(), seatedSeatId: ownSeat.id,
        } });
        await tx.gameToolEvent.create({ data: {
          roomId: room.id, actorId: input.profileId, type: "DICE_REJOINED", payload: { seatNumber: ownSeat.seatNumber },
        } });
        return true;
      });
      if (!restored) continue;
      await broadcastDiceRoomChange(room.id);
      return { roomId: room.id } as const;
    }
    if (ownSeat) {
      const member = room.members.find((item) => item.profileId === input.profileId);
      if (member?.leftAt) {
        const restored = await prisma.$transaction(async (tx) => {
          const reserved = await tx.gameToolRoom.updateMany({ where: { id: room.id, revision: room.revision }, data: { revision: { increment: 1 } } });
          if (!reserved.count) return false;
          await tx.gameToolRoomMember.update({ where: { id: member.id }, data: { leftAt: null, lastSeenAt: new Date() } });
          return true;
        });
        if (!restored) continue;
        await broadcastDiceRoomChange(room.id);
      }
      return { roomId: room.id } as const;
    }
    if (room.status !== "LOBBY") return { error: "GAME_STARTED" } as const;
    const occupied = room.seats.filter((seat) => !seat.leftAt);
    if (occupied.length >= room.playerCount) return { error: "ROOM_FULL" } as const;
    const used = new Set(room.seats.map((seat) => seat.seatNumber));
    let seatNumber = 1;
    while (used.has(seatNumber)) seatNumber += 1;
    const joined = await prisma.$transaction(async (tx) => {
      const reserved = await tx.gameToolRoom.updateMany({ where: { id: room.id, revision: room.revision, status: "LOBBY" }, data: { revision: { increment: 1 } } });
      if (!reserved.count) return false;
      const seat = await tx.gameToolSeat.create({ data: {
        roomId: room.id, profileId: input.profileId, privateToken: createGameToolPrivateToken(),
        seatNumber, displayName: input.displayName.slice(0, 32),
      } });
      await tx.gameToolRoomMember.create({ data: {
        roomId: room.id, profileId: input.profileId, memberToken: createGameToolPrivateToken(), seatedSeatId: seat.id,
      } });
      await tx.gameToolEvent.create({ data: { roomId: room.id, actorId: input.profileId, type: "DICE_JOINED", payload: { seatNumber } } });
      return true;
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    });
    if (!joined) continue;
    await broadcastDiceRoomChange(room.id);
    return { roomId: room.id } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function getDiceRoomView(roomId: string, profileId: string, known?: { revision: number; viewerSeat: number }) {
  let room = await readRoom(roomId);
  if (!room || room.kind !== "DICE" || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" } as const;
  const currentRoom = room;
  let viewer = activeSeat(room, profileId);
  if (!viewer) return { error: "NOT_A_PLAYER" } as const;
  const member = room.members.find((item) => item.profileId === profileId);
  if (member && Date.now() - member.lastSeenAt.getTime() > 15_000) {
    await prisma.gameToolRoomMember.updateMany({ where: { id: member.id, leftAt: null }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const now = Date.now();
  const hostMember = currentRoom.members.find((item) => item.profileId === currentRoom.hostId);
  if (currentRoom.hostId !== profileId && (!hostMember || hostMember.lastSeenAt.getTime() < now - 60_000)) {
    const successor = currentRoom.seats.find((seat) => !seat.leftAt && seat.profileId && currentRoom.members.some((item) =>
      item.profileId === seat.profileId && (item.profileId === profileId || item.lastSeenAt.getTime() >= now - 60_000),
    ));
    if (successor?.profileId) {
      const changed = await prisma.$transaction(async (tx) => {
        const reserved = await tx.gameToolRoom.updateMany({
          where: { id: currentRoom.id, hostId: currentRoom.hostId, revision: currentRoom.revision },
          data: { hostId: successor.profileId!, revision: { increment: 1 } },
        });
        if (!reserved.count) return false;
        await tx.gameToolEvent.create({ data: {
          roomId: currentRoom.id, actorId: successor.profileId, type: "DICE_HOST_CHANGED", payload: { seatNumber: successor.seatNumber },
        } });
        return true;
      });
      if (changed) {
        await broadcastDiceRoomChange(currentRoom.id);
        room = await readRoom(roomId);
        if (!room) return { error: "ROOM_NOT_FOUND" } as const;
        viewer = activeSeat(room, profileId);
        if (!viewer) return { error: "NOT_A_PLAYER" } as const;
      }
    }
  }
  if (known?.revision === room.revision && known.viewerSeat === viewer.seatNumber) return { notModified: true } as const;
  return publicRoom(room, profileId);
}

type DiceCommand = { type: "READY"; ready: boolean } | { type: "START" } | DiceAction | { type: "REMATCH" } | { type: "CLOSE" } | { type: "LEAVE" };
export async function commandDiceRoom(input: { roomId: string; profileId: string; commandId: string; expectedRound: number; action: DiceCommand }) {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(input.commandId)) return { error: "INVALID_COMMAND_ID" } as const;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const room = await readRoom(input.roomId);
    if (!room || room.kind !== "DICE" || room.status === "CANCELLED") return { error: "ROOM_NOT_FOUND" } as const;
    const seat = activeSeat(room, input.profileId);
    if (!seat) return { error: "NOT_A_PLAYER" } as const;
    const old = stateOf(room.state);
    if (!old) return { error: "INVALID_STATE" } as const;
    const previous = old.commandLog.find((command) => command.id === input.commandId);
    if (previous) return previous.actorSeat === seat.seatNumber ? publicRoom(room, input.profileId) : { error: "COMMAND_ID_USED" } as const;
    if (old.round !== input.expectedRound) return { error: "STALE_ROUND" } as const;
    const isHost = room.hostId === input.profileId;
    const action = input.action;
    if (["START", "NEXT_ROUND", "REMATCH", "CLOSE"].includes(action.type) && !isHost) return { error: "HOST_ONLY" } as const;
    let next = old;
    let nextStatus: "LOBBY" | "IN_PROGRESS" | "FINISHED" | "CANCELLED" = room.status;
    let readyAt: Date | null | undefined;
    let leaving = false;
    if (action.type === "READY") {
      if (room.status !== "LOBBY") return { error: "GAME_STARTED" } as const;
      readyAt = action.ready ? new Date() : null;
    } else if (action.type === "START") {
      const active = room.seats.filter((item) => !item.leftAt);
      if (room.status !== "LOBBY" || active.length < 2 || active.some((item) => !item.readyAt)) return { error: "NOT_READY" } as const;
      next = startDiceMatch(active.map((item) => item.seatNumber), roll);
      nextStatus = "IN_PROGRESS";
    } else if (action.type === "REMATCH") {
      if (room.status !== "FINISHED") return { error: "NOT_FINISHED" } as const;
      next = createDiceLobbyState();
      nextStatus = "LOBBY";
    } else if (action.type === "CLOSE") {
      nextStatus = "CANCELLED";
    } else if (action.type === "LEAVE") {
      leaving = true;
      next = removeDiceSeat(old, seat.seatNumber, roll);
      if (next.phase === "FINISHED") nextStatus = "FINISHED";
      if (room.seats.filter((item) => !item.leftAt).length <= 1) nextStatus = "CANCELLED";
    } else {
      if (room.status !== "IN_PROGRESS") return { error: "GAME_NOT_ACTIVE" } as const;
      if (action.type === "NEXT_ROUND" && old.phase !== "REVEAL") return { error: "ROUND_NOT_REVEALED" } as const;
      try { next = applyDiceAction(old, seat.seatNumber, action, roll); }
      catch (error) { if (error instanceof DiceRuleError) return { error: error.code } as const; throw error; }
      if (next.phase === "FINISHED") nextStatus = "FINISHED";
    }
    next = { ...next, commandLog: [...next.commandLog, { id: input.commandId, actorSeat: seat.seatNumber }].slice(-128) };
    const updated = await prisma.$transaction(async (tx) => {
      const reserved = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision },
        data: { revision: { increment: 1 }, state: json(next), status: nextStatus,
          startedAt: action.type === "START" ? new Date() : action.type === "REMATCH" ? null : undefined,
          finishedAt: nextStatus === "FINISHED" ? new Date() : action.type === "REMATCH" ? null : undefined,
          cancelledAt: nextStatus === "CANCELLED" ? new Date() : undefined },
      });
      if (!reserved.count) return false;
      if (readyAt !== undefined) {
        await tx.gameToolSeat.update({ where: { id: seat.id }, data: { readyAt } });
        await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id, profileId: input.profileId, leftAt: null }, data: { readyAt } });
      }
      await tx.gameToolRoomMember.updateMany({
        where: { roomId: room.id, profileId: input.profileId, leftAt: null }, data: { lastSeenAt: new Date() },
      });
      if (action.type === "REMATCH") {
        await tx.gameToolSeat.updateMany({ where: { roomId: room.id, leftAt: null }, data: { readyAt: null } });
        await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id, leftAt: null }, data: { readyAt: null } });
      }
      if (leaving) {
        await tx.gameToolSeat.update({ where: { id: seat.id }, data: { leftAt: new Date() } });
        await tx.gameToolRoomMember.updateMany({ where: { roomId: room.id, profileId: input.profileId, leftAt: null }, data: { leftAt: new Date() } });
        if (isHost) {
          const successor = room.seats.find((item) => !item.leftAt && item.id !== seat.id && item.profileId)?.profileId;
          if (successor) await tx.gameToolRoom.update({ where: { id: room.id }, data: { hostId: successor } });
        }
      }
      await tx.gameToolEvent.create({ data: { roomId: room.id, actorId: input.profileId, type: `DICE_${action.type}`, payload: {
        round: next.round, seatNumber: seat.seatNumber,
        ...(action.type === "BID" ? { count: action.count, face: action.face } : {}),
        ...(action.type === "CHALLENGE" ? { winnerSeat: next.result?.winnerSeat, total: next.result?.total } : {}),
      } } });
      return true;
    });
    if (!updated) continue;
    await broadcastDiceRoomChange(room.id);
    if (leaving || nextStatus === "CANCELLED") return { ok: true } as const;
    const fresh = await readRoom(room.id);
    return fresh ? publicRoom(fresh, input.profileId) : { error: "ROOM_NOT_FOUND" } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}
