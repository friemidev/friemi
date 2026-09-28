import "server-only";

import { Prisma } from "@prisma/client";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  createDrawGuessState,
  getDrawGuessViewerState,
  startDrawGuessGame,
  type DrawGuessAction,
  type DrawGuessMode,
  type DrawGuessState,
} from "@/features/game-tools/drawGuessEngine";
import { createGameToolPrivateToken, createUniqueGameToolRoomCode } from "@/features/game-tools/gameToolRooms";
import { broadcastDrawGuessRoomChange } from "@/features/game-tools/drawGuessRealtimeServer";
import { prisma } from "@/lib/prisma";

type RoomWithSeats = NonNullable<Awaited<ReturnType<typeof readRoom>>>;

function asState(value: Prisma.JsonValue | null): DrawGuessState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as unknown as DrawGuessState;
  return state.phase && state.mode && Array.isArray(state.scores) ? state : null;
}

async function readRoom(roomId: string) {
  return prisma.gameToolRoom.findUnique({
    where: { id: roomId },
    include: { seats: { where: { leftAt: null }, orderBy: { seatNumber: "asc" } } },
  });
}

function toJson(state: DrawGuessState) {
  return state as unknown as Prisma.InputJsonValue;
}

async function updateState(room: RoomWithSeats, state: DrawGuessState, eventType?: string, actorId?: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.gameToolRoom.updateMany({
      where: { id: room.id, revision: room.revision },
      data: {
        finishedAt: state.phase === "FINISHED" ? new Date() : undefined,
        startedAt: room.status === "LOBBY" && state.phase !== "LOBBY" ? new Date() : undefined,
        revision: { increment: 1 },
        state: toJson(state),
        status: state.phase === "FINISHED" ? "FINISHED" : state.phase === "LOBBY" ? "LOBBY" : "IN_PROGRESS",
      },
    });
    if (!updated.count) return false;
    if (eventType) {
      await tx.gameToolEvent.create({
        data: { actorId, roomId: room.id, type: eventType, payload: { revision: room.revision + 1 } },
      });
    }
    return true;
  });
  if (updated) await broadcastDrawGuessRoomChange(room.id);
  return updated;
}

export async function createDrawGuessRoom(input: {
  hostId: string;
  hostName: string;
  locale: string;
  mode: DrawGuessMode;
  playerCount: number;
}) {
  if (input.mode === "CLASSIC" ? input.playerCount < 3 || input.playerCount > 10 : input.playerCount < 5 || input.playerCount > 8) {
    return { error: "INVALID_PLAYER_COUNT" } as const;
  }
  const state = createDrawGuessState(input.mode, input.playerCount);
  const room = await prisma.gameToolRoom.create({
    data: {
      code: await createUniqueGameToolRoomCode(),
      hostId: input.hostId,
      kind: "DRAW_GUESS",
      locale: input.locale,
      mode: input.mode.toLowerCase(),
      playerCount: input.playerCount,
      state: toJson(state),
      title: input.locale === "en" ? "Draw & Guess" : input.locale === "fr" ? "Dessine et devine" : "你画我猜",
      seats: {
        create: {
          displayName: input.hostName.slice(0, 40),
          privateToken: createGameToolPrivateToken(),
          profileId: input.hostId,
          seatNumber: 1,
        },
      },
    },
    select: { code: true, id: true },
  });
  return { room } as const;
}

export async function joinDrawGuessRoom(input: { code: string; profileId: string; displayName: string }) {
  const room = await prisma.gameToolRoom.findUnique({
    where: { code: input.code.trim().toUpperCase() },
    include: { seats: { where: { leftAt: null } } },
  });
  if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
  const existing = room.seats.find((seat) => seat.profileId === input.profileId);
  if (existing) return { roomId: room.id } as const;
  if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
  const taken = new Set(room.seats.map((seat) => seat.seatNumber));
  const seatNumber = Array.from({ length: room.playerCount }, (_, index) => index + 1).find((seat) => !taken.has(seat));
  if (!seatNumber) return { error: "ROOM_FULL" } as const;
  try {
    await prisma.gameToolSeat.create({
      data: {
        displayName: input.displayName.slice(0, 40),
        privateToken: createGameToolPrivateToken(),
        profileId: input.profileId,
        roomId: room.id,
        seatNumber,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "SEAT_TAKEN_RETRY" } as const;
    throw error;
  }
  return { roomId: room.id } as const;
}

export async function getDrawGuessRoomView(roomId: string, profileId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    const viewer = room.seats.find((seat) => seat.profileId === profileId);
    if (!viewer) return { error: "NOT_A_PLAYER" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    const next = advanceDrawGuessGame(state, room.playerCount, Date.now(), room.locale);
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      if (!(await updateState(room, next, "DRAW_GUESS_PHASE_ADVANCED"))) continue;
      continue;
    }
    return {
      room: {
        code: room.code,
        id: room.id,
        isHost: room.hostId === profileId,
        mode: state.mode,
        playerCount: room.playerCount,
        revision: room.revision,
        seats: room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber, isHost: seat.profileId === room.hostId })),
        status: room.status,
        viewerSeat: viewer.seatNumber - 1,
        view: getDrawGuessViewerState(state, viewer.seatNumber - 1, room.playerCount),
      },
    } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function startDrawGuessRoom(roomId: string, profileId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.hostId !== profileId) return { error: "HOST_ONLY" } as const;
    if (room.seats.length !== room.playerCount) return { error: "WAIT_FOR_PLAYERS" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    const started = startDrawGuessGame(state, Date.now(), room.locale);
    if ("error" in started) return { error: started.error } as const;
    if (!(await updateState(room, started.state, "DRAW_GUESS_STARTED", profileId))) continue;
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function commandDrawGuessRoom(input: {
  action: DrawGuessAction;
  commandId: string;
  profileId: string;
  roomId: string;
}) {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(input.commandId)) return { error: "INVALID_COMMAND_ID" } as const;
  const receivedAt = Date.now();
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const room = await readRoom(input.roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    const viewer = room.seats.find((seat) => seat.profileId === input.profileId);
    if (!viewer) return { error: "NOT_A_PLAYER" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    const previous = state.commandResults[input.commandId];
    if (previous) return { ok: true, ...previous } as const;
    const result = applyDrawGuessAction(state, input.action, viewer.seatNumber - 1, room.playerCount, receivedAt, room.locale);
    const next = result.state;
    if ("error" in result) {
      if (JSON.stringify(next) !== JSON.stringify(state)) {
        if (!(await updateState(room, next, "DRAW_GUESS_PHASE_ADVANCED"))) continue;
      }
      return { error: result.error } as const;
    }
    next.commandResults[input.commandId] = {
      correct: "correct" in result ? result.correct : undefined,
      points: "points" in result ? result.points : undefined,
    };
    const ids = Object.keys(next.commandResults);
    if (ids.length > 1_000) delete next.commandResults[ids[0]];
    if (!(await updateState(room, next, input.action.type, input.profileId))) continue;
    return { ok: true, ...next.commandResults[input.commandId] } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}
