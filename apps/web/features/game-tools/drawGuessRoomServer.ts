import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { changedDrawGuessArtworks, compactDrawGuessState, hydrateDrawGuessState, prepareArtworkChanges } from "@/features/game-tools/drawGuessArtworkPersistence";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  createDrawGuessState,
  getDrawGuessViewerState,
  isDrawGuessTiming,
  setDrawGuessSeatManaged,
  startDrawGuessGame,
  type DrawGuessAction,
  type DrawGuessMode,
  type DrawGuessPhase,
  type DrawGuessState,
  type DrawGuessTiming,
} from "@/features/game-tools/drawGuessEngine";
import { createGameToolPrivateToken, createUniqueGameToolRoomCode } from "@/features/game-tools/gameToolRooms";
import { isDrawGuessChainEnabled, isDrawGuessClassicEnabled, isDrawGuessPreviewDuoEnabled, isDrawGuessPreviewRelayDuoEnabled } from "@/features/game-tools/drawGuessFlags";
import { broadcastDrawGuessRoomChange } from "@/features/game-tools/drawGuessRealtimeServer";
import { getDrawGuessInkSequence } from "@/features/game-tools/drawGuessInkServer";
import { getDrawGuessWordBank, listDrawGuessWordBanks, shuffledDrawGuessWordBank } from "@/features/game-tools/drawGuessWordBanks";
import { DRAW_GUESS_CATS, fallbackDrawGuessCatId, isDrawGuessCatId, type DrawGuessCatId } from "@/features/game-tools/drawGuessCats";
import { prisma } from "@/lib/prisma";

type RoomWithSeats = NonNullable<Awaited<ReturnType<typeof readRoom>>>;
const DRAW_GUESS_STALE_MS = 35_000;
const DRAW_GUESS_DEPART_GRACE_MS = 8_000;

function kickedDrawGuessProfiles(config: Prisma.JsonValue | null): string[] {
  if (!config || typeof config !== "object" || Array.isArray(config)) return [];
  const ids = (config as Record<string, unknown>).drawGuessKickedProfileIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

type DrawGuessStoredSeat = { name: string; number: number; profileId: string | null };

function storedDrawGuessSeats(state: Prisma.JsonValue): DrawGuessStoredSeat[] | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const seats = (state as Record<string, unknown>).seatRoster;
  if (!Array.isArray(seats)) return null;
  return seats.filter((seat): seat is DrawGuessStoredSeat => Boolean(seat && typeof seat === "object"
    && typeof seat.name === "string" && Number.isInteger(seat.number)
    && (typeof seat.profileId === "string" || seat.profileId === null)));
}

async function compactLobbySeatNumbers(tx: Prisma.TransactionClient, seats: { id: string; seatNumber: number }[]) {
  for (const [index, seat] of [...seats].sort((a, b) => a.seatNumber - b.seatNumber).entries()) {
    if (seat.seatNumber !== index + 1) await tx.gameToolSeat.update({ where: { id: seat.id }, data: { seatNumber: index + 1 } });
  }
}

function randomDrawGuessCatId(): DrawGuessCatId {
  return DRAW_GUESS_CATS[randomInt(DRAW_GUESS_CATS.length)].id;
}

function asState(value: Prisma.JsonValue | null): DrawGuessState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as unknown as DrawGuessState;
  return state.phase && state.mode && Array.isArray(state.scores)
    ? { ...state, classicAnswers: state.classicAnswers ?? [], classicChat: state.classicChat ?? [], gameNumber: state.gameNumber ?? 1, inkSeq: state.inkSeq ?? 0 }
    : null;
}

async function readRoom(roomId: string) {
  return prisma.gameToolRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { where: { leftAt: null } },
      seats: { where: { leftAt: null }, orderBy: { seatNumber: "asc" }, include: { profile: { select: { avatarUrl: true } } } },
    },
  });
}

function toJson(state: DrawGuessState) {
  return state as unknown as Prisma.InputJsonValue;
}

async function updateState(
  room: RoomWithSeats,
  previousState: DrawGuessState,
  state: DrawGuessState,
  eventType?: string,
  actorId?: string,
  command?: { id: string; result: { correct?: boolean; points?: number } },
  leavingMember?: { id: string; staleBefore?: Date },
) {
  const crossingRounds = previousState.gameNumber !== state.gameNumber;
  const artworkRoundNumber = crossingRounds ? previousState.gameNumber : state.gameNumber;
  const artworkSource = crossingRounds ? previousState : state;
  const artworkChanges = await prepareArtworkChanges(changedDrawGuessArtworks(previousState, artworkSource, room.playerCount)).catch((error) => {
    console.error("[draw-guess] artwork preview preparation failed", { roomId: room.id, errorName: error instanceof Error ? error.name : "UnknownError" });
    throw error;
  });
  const updated = await prisma.$transaction(async (tx) => {
    const finishedAt = state.phase === "FINISHED" ? new Date() : null;
    const updated = await tx.gameToolRoom.updateMany({
      where: { id: room.id, revision: room.revision },
      data: {
        drawGuessDeadlineAt: state.deadlineAt ? new Date(state.deadlineAt) : null,
        finishedAt,
        startedAt: (room.status === "LOBBY" || room.status === "FINISHED") && state.phase !== "LOBBY" ? new Date() : undefined,
        revision: { increment: 1 },
        state: compactDrawGuessState(state),
        status: state.phase === "FINISHED" ? "FINISHED" : state.phase === "LOBBY" ? "LOBBY" : "IN_PROGRESS",
      },
    });
    if (!updated.count) return false;
    if (leavingMember) {
      const left = await tx.gameToolRoomMember.updateMany({
        where: { id: leavingMember.id, leftAt: null, ...(leavingMember.staleBefore ? { lastSeenAt: { lte: leavingMember.staleBefore } } : {}) },
        data: { leftAt: new Date() },
      });
      if (!left.count) throw new Error("PRESENCE_CHANGED");
    }
    if (previousState.storageVersion !== 1) {
      const legacyCommands = Object.entries(previousState.commandResults);
      if (legacyCommands.length) {
        await tx.drawGuessCommand.createMany({
          data: legacyCommands.map(([commandId, result]) => ({ commandId, result, roomId: room.id, roundNumber: previousState.gameNumber })),
          skipDuplicates: true,
        });
      }
    }
    for (const artwork of artworkChanges) {
      await tx.drawGuessArtwork.upsert({
        where: { roomId_roundNumber_ownerSeat_stage: { roomId: room.id, roundNumber: artworkRoundNumber, ownerSeat: artwork.ownerSeat, stage: artwork.stage } },
        create: {
          artistSeat: artwork.artistSeat,
          ownerSeat: artwork.ownerSeat,
          previewBytes: artwork.png.byteLength,
          previewPng: Uint8Array.from(artwork.png),
          roomId: room.id,
          roundNumber: artworkRoundNumber,
          stage: artwork.stage,
          strokes: artwork.strokes as unknown as Prisma.InputJsonValue,
          submittedAt: artwork.submitted ? new Date() : null,
        },
        update: {
          previewBytes: artwork.png.byteLength,
          previewPng: Uint8Array.from(artwork.png),
          strokes: artwork.strokes as unknown as Prisma.InputJsonValue,
          submittedAt: artwork.submitted ? new Date() : null,
        },
      });
    }
    if (command) {
      await tx.drawGuessCommand.create({
        data: { actorProfileId: actorId, commandId: command.id, result: command.result, roomId: room.id, roundNumber: state.gameNumber },
      });
    }
    if (state.phase === "FINISHED" && room.status !== "FINISHED") {
      const seatRoster = room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber, profileId: seat.profileId }));
      await tx.drawGuessRound.create({
        data: {
          finishedAt: finishedAt!,
          mode: state.mode,
          roomId: room.id,
          roundNumber: state.gameNumber,
          state: { ...(compactDrawGuessState(state) as Record<string, unknown>), seatRoster } as Prisma.InputJsonValue,
        },
      });
    }
    if (eventType) {
      await tx.gameToolEvent.create({
        data: { actorId, roomId: room.id, type: eventType, payload: { revision: room.revision + 1 } },
      });
    }
    return true;
  }).catch((error) => {
    if (error instanceof Error && error.message === "PRESENCE_CHANGED") return false;
    console.error("[draw-guess] state persistence failed", { roomId: room.id, errorName: error instanceof Error ? error.name : "UnknownError" });
    throw error;
  });
  if (updated) {
    if (previousState.phase !== state.phase) console.info("[draw-guess] phase changed", { roomId: room.id, roundNumber: state.gameNumber, from: previousState.phase, to: state.phase, automatic: eventType === "DRAW_GUESS_PHASE_ADVANCED" });
    await broadcastDrawGuessRoomChange(room.id);
  }
  return updated;
}

export async function createDrawGuessRoom(input: {
  hostId: string;
  hostName: string;
  locale: string;
  mode: DrawGuessMode;
  playerCount?: number;
  timing?: DrawGuessTiming;
  wordBankId?: string;
}) {
  if (input.timing !== undefined && !isDrawGuessTiming(input.timing)) return { error: "INVALID_TIMING" } as const;
  const autoSize = input.playerCount === undefined;
  const requestedCount = input.playerCount ?? (input.mode === "CHAIN" ? 8 : 10);
  const practiceRelay = input.mode === "CHAIN" && requestedCount === 2 && isDrawGuessPreviewRelayDuoEnabled();
  if (input.mode === "CLASSIC"
    ? requestedCount < (isDrawGuessPreviewDuoEnabled() ? 2 : 3) || requestedCount > 10
    : !practiceRelay && (requestedCount < 5 || requestedCount > 8)) {
    return { error: "INVALID_PLAYER_COUNT" } as const;
  }
  if (input.mode === "CLASSIC" && !isDrawGuessClassicEnabled()) return { error: "CLASSIC_NOT_ENABLED" } as const;
  if (input.mode === "CHAIN" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
  const availableBanks = input.wordBankId ? null : await listDrawGuessWordBanks(input.locale);
  const wordBank = input.wordBankId
    ? await getDrawGuessWordBank(input.wordBankId, input.locale)
    : availableBanks?.length ? availableBanks[randomInt(availableBanks.length)] : null;
  if (!wordBank) return { error: "INVALID_WORD_BANK" } as const;
  const seatCount = practiceRelay ? 3 : requestedCount;
  const timing = input.timing ?? { drawSeconds: 60, guessSeconds: 20 };
  const state = createDrawGuessState(input.mode, seatCount, shuffledDrawGuessWordBank(wordBank), { drawSeconds: timing.drawSeconds, guessSeconds: timing.guessSeconds });
  if (autoSize) state.autoSize = true;
  if (practiceRelay) state.practiceBotSeat = 2;
  const code = await createUniqueGameToolRoomCode();
  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.gameToolRoom.create({
      data: {
        code,
        hostId: input.hostId,
        kind: "DRAW_GUESS",
        locale: input.locale,
        mode: input.mode.toLowerCase(),
        playerCount: seatCount,
        state: toJson(state),
        wordBankId: wordBank.id,
        title: input.locale === "en" ? "Draw & Guess" : input.locale === "fr" ? "Dessine et devine" : "你画我猜",
        seats: {
          create: [{
            displayName: input.hostName.slice(0, 40),
            privateToken: createGameToolPrivateToken(),
            profileId: input.hostId,
            roleKey: randomDrawGuessCatId(),
            seatNumber: 1,
          }, ...(practiceRelay ? [{ displayName: input.locale === "en" ? "Practice helper" : input.locale === "fr" ? "Aide à l'essai" : "测试补位", privateToken: createGameToolPrivateToken(), roleKey: randomDrawGuessCatId(), seatNumber: 3 }] : [])],
        },
      },
      include: { seats: true },
    });
    await tx.gameToolRoomMember.create({
      data: {
        memberToken: createGameToolPrivateToken(),
        profileId: input.hostId,
        roomId: created.id,
        seatedSeatId: created.seats.find((seat) => seat.seatNumber === 1)!.id,
      },
    });
    return { code: created.code, id: created.id };
  }, { maxWait: 15_000, timeout: 15_000 });
  return { room } as const;
}

export async function joinDrawGuessRoom(input: { code: string; profileId: string; displayName: string }) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const room = await prisma.gameToolRoom.findUnique({
      where: { code: input.code.trim().toUpperCase() },
      include: { seats: { where: { leftAt: null } } },
    });
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (kickedDrawGuessProfiles(room.config).includes(input.profileId)) return { error: "KICKED" } as const;
    const existing = room.seats.find((seat) => seat.profileId === input.profileId);
    if (existing) {
      await prisma.gameToolRoomMember.upsert({
        where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
        create: { memberToken: createGameToolPrivateToken(), profileId: input.profileId, roomId: room.id, seatedSeatId: existing.id },
        update: { lastSeenAt: new Date(), leftAt: null, seatedSeatId: existing.id },
      });
      const state = asState(room.state);
      if (state?.managedSeats?.includes(existing.seatNumber - 1)) {
        const next = setDrawGuessSeatManaged(state, existing.seatNumber - 1, false, room.playerCount, Date.now(), room.locale);
        const current = await readRoom(room.id);
        if (!current || current.revision !== room.revision || !(await updateState(current, state, next, "DRAW_GUESS_PLAYER_RECONNECTED", input.profileId))) continue;
      }
      return { roomId: room.id, spectator: false } as const;
    }
    if (room.mode === "chain" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
    if (room.status !== "LOBBY") {
      await prisma.gameToolRoomMember.upsert({
        where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
        create: { memberToken: createGameToolPrivateToken(), profileId: input.profileId, roomId: room.id },
        update: { lastSeenAt: new Date(), leftAt: null, seatedSeatId: null },
      });
      return { roomId: room.id, spectator: true } as const;
    }
    const taken = new Set(room.seats.map((seat) => seat.seatNumber));
    const seatNumber = Array.from({ length: room.playerCount }, (_, index) => index + 1).find((seat) => !taken.has(seat));
    if (!seatNumber) return { error: "ROOM_FULL" } as const;
    try {
      await prisma.$transaction(async (tx) => {
        const reserved = await tx.gameToolRoom.updateMany({
          where: { id: room.id, revision: room.revision, status: "LOBBY" },
          data: { revision: { increment: 1 } },
        });
        if (!reserved.count) throw new Error("JOIN_RACE");
        const seat = await tx.gameToolSeat.create({
          data: {
            displayName: input.displayName.slice(0, 40),
            privateToken: createGameToolPrivateToken(),
            profileId: input.profileId,
            roleKey: randomDrawGuessCatId(),
            roomId: room.id,
            seatNumber,
          },
        });
        await tx.gameToolRoomMember.upsert({
          where: { roomId_profileId: { roomId: room.id, profileId: input.profileId } },
          create: { memberToken: createGameToolPrivateToken(), profileId: input.profileId, roomId: room.id, seatedSeatId: seat.id },
          update: { lastSeenAt: new Date(), leftAt: null, seatedSeatId: seat.id },
        });
      });
      await broadcastDrawGuessRoomChange(room.id);
      return { roomId: room.id } as const;
    } catch (error) {
      if (error instanceof Error && error.message === "JOIN_RACE") continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function leaveDrawGuessRoom(roomId: string, profileId: string, staleBefore?: Date) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    const member = room.members.find((item) => item.profileId === profileId);
    if (!member || staleBefore && member.lastSeenAt > staleBefore) return { ok: true } as const;
    const seat = room.seats.find((item) => item.profileId === profileId);
    if (!seat) {
      await prisma.gameToolRoomMember.updateMany({ where: { id: member.id, leftAt: null, ...(staleBefore ? { lastSeenAt: { lte: staleBefore } } : {}) }, data: { leftAt: new Date() } });
      return { ok: true } as const;
    }
    if (room.status === "LOBBY") {
      const others = room.seats.filter((item) => item.id !== seat.id && item.profileId);
      const autoSize = asState(room.state)?.autoSize === true;
      const changed = await prisma.$transaction(async (tx) => {
        const reserved = await tx.gameToolRoom.updateMany({ where: { id: room.id, revision: room.revision, status: "LOBBY" }, data: { revision: { increment: 1 }, ...(room.hostId === profileId && others[0]?.profileId ? { hostId: others[0].profileId } : {}) } });
        if (!reserved.count) return false;
        const marked = await tx.gameToolRoomMember.updateMany({ where: { id: member.id, leftAt: null, ...(staleBefore ? { lastSeenAt: { lte: staleBefore } } : {}) }, data: { leftAt: new Date() } });
        if (!marked.count) throw new Error("PRESENCE_CHANGED");
        if (!others.length) await tx.gameToolRoom.delete({ where: { id: room.id } });
        else {
          await tx.gameToolRoomMember.delete({ where: { id: member.id } });
          await tx.gameToolSeat.delete({ where: { id: seat.id } });
          if (autoSize) await compactLobbySeatNumbers(tx, room.seats.filter((item) => item.id !== seat.id));
        }
        return true;
      }).catch((error) => {
        if (error instanceof Error && error.message === "PRESENCE_CHANGED") return false;
        throw error;
      });
      if (!changed) continue;
      await broadcastDrawGuessRoomChange(roomId);
      return { ok: true } as const;
    }
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    if (!state.managedSeats?.includes(seat.seatNumber - 1) && state.phase !== "FINISHED") {
      await hydrateDrawGuessState(room.id, state);
      const next = setDrawGuessSeatManaged(state, seat.seatNumber - 1, true, room.playerCount, Date.now(), room.locale);
      if (!(await updateState(room, state, next, "DRAW_GUESS_PLAYER_MANAGED", profileId, undefined, { id: member.id, staleBefore }))) continue;
      return { ok: true } as const;
    }
    await prisma.gameToolRoomMember.updateMany({ where: { id: member.id, leftAt: null, ...(staleBefore ? { lastSeenAt: { lte: staleBefore } } : {}) }, data: { leftAt: new Date() } });
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function markDrawGuessPresenceDeparting(roomId: string, profileId: string) {
  const departingAt = new Date(Date.now() - DRAW_GUESS_STALE_MS + DRAW_GUESS_DEPART_GRACE_MS);
  await prisma.gameToolRoomMember.updateMany({
    where: { roomId, profileId, leftAt: null, room: { kind: "DRAW_GUESS", status: { in: ["LOBBY", "IN_PROGRESS", "FINISHED"] } } },
    data: { lastSeenAt: departingAt },
  });
  return { ok: true } as const;
}

export async function kickDrawGuessRoomPlayer(roomId: string, hostId: string, seatId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.hostId !== hostId) return { error: "HOST_ONLY" } as const;
    if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
    const target = room.seats.find((seat) => seat.id === seatId);
    if (!target?.profileId || target.profileId === hostId) return { error: "PLAYER_NOT_FOUND" } as const;
    const config = room.config && typeof room.config === "object" && !Array.isArray(room.config) ? room.config : {};
    const kicked = [...new Set([...kickedDrawGuessProfiles(room.config), target.profileId])];
    const autoSize = asState(room.state)?.autoSize === true;
    const changed = await prisma.$transaction(async (tx) => {
      const reserved = await tx.gameToolRoom.updateMany({
        where: { id: roomId, hostId, revision: room.revision, status: "LOBBY" },
        data: { config: { ...config, drawGuessKickedProfileIds: kicked } as Prisma.InputJsonValue, revision: { increment: 1 } },
      });
      if (!reserved.count) return false;
      await tx.gameToolRoomMember.deleteMany({ where: { roomId, profileId: target.profileId } });
      await tx.gameToolSeat.delete({ where: { id: target.id } });
      if (autoSize) await compactLobbySeatNumbers(tx, room.seats.filter((seat) => seat.id !== target.id));
      await tx.gameToolEvent.create({ data: { actorId: hostId, roomId, type: "DRAW_GUESS_PLAYER_KICKED", payload: { seatNumber: target.seatNumber } } });
      return true;
    });
    if (!changed) continue;
    await broadcastDrawGuessRoomChange(roomId);
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

async function touchPresence(roomId: string, profileId: string) {
  const now = new Date();
  await prisma.gameToolRoomMember.updateMany({
    where: {
      lastSeenAt: { lt: new Date(now.getTime() - 15_000) },
      leftAt: null,
      profileId,
      roomId,
    },
    data: { lastSeenAt: now },
  });
}

async function transferHostIfNeeded(room: RoomWithSeats, now: number) {
  const hostMember = room.members.find((member) => member.profileId === room.hostId);
  if (hostMember && hostMember.lastSeenAt.getTime() >= now - 60_000) return false;
  const active = room.seats
    .filter((seat) => seat.profileId && room.members.some((member) =>
      member.profileId === seat.profileId && member.lastSeenAt.getTime() >= now - 60_000,
    ))
    .sort((a, b) => a.seatNumber - b.seatNumber);
  const successor = active[0];
  if (!successor?.profileId || successor.profileId === room.hostId) return false;
  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.gameToolRoom.updateMany({
      where: { hostId: room.hostId, id: room.id, revision: room.revision },
      data: { hostId: successor.profileId!, revision: { increment: 1 } },
    });
    if (!result.count) return false;
    await tx.gameToolEvent.create({
      data: { actorId: successor.profileId, roomId: room.id, type: "DRAW_GUESS_HOST_CHANGED", payload: { seatNumber: successor.seatNumber } },
    });
    return true;
  });
  if (changed) await broadcastDrawGuessRoomChange(room.id);
  return changed;
}

export async function getDrawGuessRoomView(roomId: string, profileId: string, knownRevision?: number) {
  await touchPresence(roomId, profileId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (kickedDrawGuessProfiles(room.config).includes(profileId)) return { error: "KICKED" } as const;
    if (!room.members.some((member) => member.profileId === profileId)) return { error: "NOT_A_PLAYER" } as const;
    const staleBefore = new Date(Date.now() - DRAW_GUESS_STALE_MS);
    const staleMembers = room.members.filter((member) => member.profileId !== profileId && member.lastSeenAt <= staleBefore);
    if (staleMembers.length) {
      for (const member of staleMembers) if (member.profileId) await leaveDrawGuessRoom(roomId, member.profileId, staleBefore);
      continue;
    }
    const viewer = room.seats.find((seat) => seat.profileId === profileId);
    if (await transferHostIfNeeded(room, Date.now())) continue;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    if (knownRevision === room.revision &&
      (!room.drawGuessDeadlineAt || room.drawGuessDeadlineAt.getTime() > Date.now())) {
      return { notModified: true } as const;
    }
    await hydrateDrawGuessState(room.id, state);
    const next = advanceDrawGuessGame(state, room.playerCount, Date.now(), room.locale);
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      if (!(await updateState(room, state, next, "DRAW_GUESS_PHASE_ADVANCED"))) continue;
      continue;
    }
    return {
      room: {
        code: room.code,
        id: room.id,
        isHost: Boolean(viewer && room.hostId === profileId),
        autoSize: state.autoSize === true,
        requiredPlayers: state.mode === "CLASSIC" ? isDrawGuessPreviewDuoEnabled() ? 2 : 3
          : state.practiceBotSeat !== undefined || isDrawGuessPreviewRelayDuoEnabled() && room.seats.length <= 2 ? 2 : 5,
        canStart: state.phase === "LOBBY" && (state.mode !== "CHAIN" || isDrawGuessChainEnabled()) && room.seats.filter((seat) => seat.profileId).every((seat) => Boolean(seat.readyAt)) && (state.autoSize
          ? (state.mode === "CLASSIC"
            ? room.seats.length >= (isDrawGuessPreviewDuoEnabled() ? 2 : 3)
            : room.seats.length >= 5 || room.seats.length === 2 && isDrawGuessPreviewRelayDuoEnabled())
          : room.seats.length === room.playerCount),
        mode: state.mode,
        playerCount: room.playerCount,
        practiceBotSeat: state.practiceBotSeat,
        revision: room.revision,
        seats: room.seats.map((seat) => ({ id: seat.id, name: seat.displayName, number: seat.seatNumber, avatarUrl: seat.profile?.avatarUrl ?? null, catId: isDrawGuessCatId(seat.roleKey) ? seat.roleKey : fallbackDrawGuessCatId(`${room.id}:${seat.seatNumber}`), ready: Boolean(seat.readyAt), isHost: seat.profileId === room.hostId, isSystem: seat.seatNumber - 1 === state.practiceBotSeat, managed: Boolean(state.managedSeats?.includes(seat.seatNumber - 1)) })),
        status: room.status,
        viewerSeat: viewer ? viewer.seatNumber - 1 : -1,
        wordBank: state.wordBank
          ? { ...state.wordBank, words: viewer ? [...state.wordBank.words].sort((a, b) => a.localeCompare(b, room.locale)) : [] }
          : null,
        view: getDrawGuessViewerState(state, viewer ? viewer.seatNumber - 1 : -1, room.playerCount),
      },
    } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function setDrawGuessRoomReady(roomId: string, profileId: string, ready: boolean) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
    const seat = room.seats.find((item) => item.profileId === profileId);
    if (!seat) return { error: "NOT_A_PLAYER" } as const;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.gameToolRoom.updateMany({ where: { id: roomId, revision: room.revision, status: "LOBBY" }, data: { revision: { increment: 1 } } });
      if (!result.count) return false;
      await tx.gameToolSeat.update({ where: { id: seat.id }, data: { readyAt: ready ? new Date() : null } });
      await tx.gameToolEvent.create({ data: { actorId: profileId, roomId, type: ready ? "DRAW_GUESS_PLAYER_READY" : "DRAW_GUESS_PLAYER_UNREADY", payload: { seatNumber: seat.seatNumber } } });
      return true;
    });
    if (!updated) continue;
    await broadcastDrawGuessRoomChange(roomId);
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function setDrawGuessCharacter(roomId: string, profileId: string, catId: string) {
  if (!isDrawGuessCatId(catId)) return { error: "INVALID_CHARACTER" } as const;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
    const seat = room.seats.find((item) => item.profileId === profileId);
    if (!seat) return { error: "NOT_A_PLAYER" } as const;
    if (seat.roleKey === catId) return { ok: true } as const;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.gameToolRoom.updateMany({ where: { id: roomId, revision: room.revision, status: "LOBBY" }, data: { revision: { increment: 1 } } });
      if (!result.count) return false;
      await tx.gameToolSeat.update({ where: { id: seat.id }, data: { roleKey: catId } });
      await tx.gameToolEvent.create({ data: { actorId: profileId, roomId, type: "DRAW_GUESS_CHARACTER_SELECTED", payload: { catId, seatNumber: seat.seatNumber } } });
      return true;
    });
    if (!updated) continue;
    await broadcastDrawGuessRoomChange(roomId);
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function updateDrawGuessRoomSettings(roomId: string, profileId: string, input: { timing?: DrawGuessTiming; wordBankId?: string }) {
  if (!input.timing && !input.wordBankId) return { error: "INVALID_REQUEST" } as const;
  if (input.timing && !isDrawGuessTiming(input.timing)) return { error: "INVALID_TIMING" } as const;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.hostId !== profileId) return { error: "HOST_ONLY" } as const;
    if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
    const state = asState(room.state);
    if (!state || state.phase !== "LOBBY") return { error: "INVALID_STATE" } as const;
    const bankChanged = Boolean(input.wordBankId && input.wordBankId !== state.wordBank?.id);
    const currentTiming = state.timing ?? { drawSeconds: 60, guessSeconds: 20 };
    const timingChanged = Boolean(input.timing && (input.timing.drawSeconds !== currentTiming.drawSeconds || input.timing.guessSeconds !== currentTiming.guessSeconds));
    if (!bankChanged && !timingChanged) return { ok: true } as const;
    const bank = bankChanged ? await getDrawGuessWordBank(input.wordBankId!, room.locale) : null;
    if (bankChanged && !bank) return { error: "INVALID_WORD_BANK" } as const;
    const next = { ...state, ...(input.timing ? { timing: input.timing } : {}), ...(bank ? { wordBank: shuffledDrawGuessWordBank(bank) } : {}) };
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision, status: "LOBBY" },
        data: { revision: { increment: 1 }, state: toJson(next), ...(bank ? { wordBankId: bank.id } : {}) },
      });
      if (!result.count) return false;
      await tx.gameToolSeat.updateMany({ where: { roomId, leftAt: null, profileId: { not: null } }, data: { readyAt: null } });
      await tx.gameToolEvent.create({ data: { actorId: profileId, roomId, type: "DRAW_GUESS_SETTINGS_UPDATED", payload: { wordBankId: bank?.id ?? null, timing: input.timing ?? null } } });
      return true;
    });
    if (!updated) continue;
    await broadcastDrawGuessRoomChange(roomId);
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function startDrawGuessRoom(roomId: string, profileId: string) {
  await touchPresence(roomId, profileId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (await transferHostIfNeeded(room, Date.now())) continue;
    if (!room.members.some((member) => member.profileId === profileId)) return { error: "NOT_A_PLAYER" } as const;
    if (room.hostId !== profileId) return { error: "HOST_ONLY" } as const;
    if (room.mode === "chain" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    if (state.autoSize) {
      const humanCount = room.seats.length;
      const practiceRelay = state.mode === "CHAIN" && humanCount === 2 && isDrawGuessPreviewRelayDuoEnabled();
      const validCount = state.mode === "CLASSIC"
        ? humanCount >= (isDrawGuessPreviewDuoEnabled() ? 2 : 3) && humanCount <= 10
        : practiceRelay || humanCount >= 5 && humanCount <= 8;
      if (!validCount) return { error: "WAIT_FOR_PLAYERS" } as const;
      if (room.seats.some((seat) => seat.profileId && !seat.readyAt)) return { error: "WAIT_FOR_READY" } as const;
      const playerCount = humanCount + (practiceRelay ? 1 : 0);
      const fresh = createDrawGuessState(state.mode, playerCount, state.wordBank, state.timing);
      fresh.gameNumber = state.gameNumber;
      if (practiceRelay) fresh.practiceBotSeat = humanCount;
      const started = startDrawGuessGame(fresh, Date.now(), room.locale);
      if (!started.state) return { error: "TRY_AGAIN" } as const;
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.gameToolRoom.updateMany({
          where: { id: room.id, revision: room.revision, status: "LOBBY" },
          data: { drawGuessDeadlineAt: new Date(started.state.deadlineAt!), playerCount, revision: { increment: 1 }, startedAt: new Date(), state: toJson(started.state), status: "IN_PROGRESS" },
        });
        if (!result.count) return false;
        if (practiceRelay) await tx.gameToolSeat.create({ data: { displayName: room.locale === "en" ? "Practice helper" : room.locale === "fr" ? "Aide à l'essai" : "测试补位", privateToken: createGameToolPrivateToken(), roleKey: randomDrawGuessCatId(), roomId, seatNumber: playerCount } });
        await tx.gameToolEvent.create({ data: { actorId: profileId, roomId, type: "DRAW_GUESS_STARTED", payload: { playerCount, revision: room.revision + 1 } } });
        return true;
      });
      if (!updated) continue;
      await broadcastDrawGuessRoomChange(roomId);
      return { ok: true } as const;
    }
    if (room.seats.length !== room.playerCount) return { error: "WAIT_FOR_PLAYERS" } as const;
    if (room.seats.some((seat) => seat.profileId && !seat.readyAt)) return { error: "WAIT_FOR_READY" } as const;
    await hydrateDrawGuessState(room.id, state);
    const started = startDrawGuessGame(state, Date.now(), room.locale);
    if ("error" in started) return { error: started.error } as const;
    if (!(await updateState(room, state, started.state, "DRAW_GUESS_STARTED", profileId))) continue;
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function rematchDrawGuessRoom(roomId: string, profileId: string) {
  return returnDrawGuessRoomToLobby(roomId, profileId);
}

export async function returnDrawGuessRoomToLobby(roomId: string, profileId: string) {
  await touchPresence(roomId, profileId);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (!room.members.some((member) => member.profileId === profileId)) return { error: "NOT_A_MEMBER" } as const;
    if (room.status === "LOBBY") return { ok: true } as const;
    const state = asState(room.state);
    if (!state || room.status !== "FINISHED" || state.phase !== "FINISHED") return { error: "GAME_NOT_FINISHED" } as const;
    const activeProfiles = new Set(room.members.map((member) => member.profileId));
    const departedSeats = room.seats.filter((seat) => seat.profileId && !activeProfiles.has(seat.profileId));
    const seatRoster = room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber, profileId: seat.profileId }));
    const capacity = state.autoSize ? state.mode === "CLASSIC" ? 10 : 8 : room.playerCount;
    const fresh = createDrawGuessState(state.mode, capacity, state.wordBank ? shuffledDrawGuessWordBank(state.wordBank) : undefined, state.timing);
    fresh.gameNumber = state.gameNumber + 1;
    if (state.autoSize) fresh.autoSize = true;
    else fresh.practiceBotSeat = state.practiceBotSeat;
    const returned = await prisma.$transaction(async (tx) => {
      const reserved = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision, status: "FINISHED" },
        data: { drawGuessDeadlineAt: null, finishedAt: null, startedAt: null, playerCount: capacity, revision: { increment: 1 }, state: toJson(fresh), status: "LOBBY" },
      });
      if (!reserved.count) return false;
      if (departedSeats.length) {
        const oldRounds = await tx.drawGuessRound.findMany({ where: { roomId }, orderBy: { roundNumber: "desc" }, take: 20, select: { id: true, state: true } });
        for (const round of oldRounds) if (!storedDrawGuessSeats(round.state)) {
          await tx.drawGuessRound.update({ where: { id: round.id }, data: { state: { ...(round.state as Record<string, unknown>), seatRoster } as Prisma.InputJsonValue } });
        }
      }
      if (state.autoSize && state.practiceBotSeat !== undefined) {
        await tx.gameToolSeat.deleteMany({ where: { roomId, seatNumber: state.practiceBotSeat + 1, profileId: null } });
      }
      if (departedSeats.length) await tx.gameToolSeat.deleteMany({ where: { id: { in: departedSeats.map((seat) => seat.id) } } });
      if (state.autoSize) await compactLobbySeatNumbers(tx, room.seats.filter((seat) => !departedSeats.some((departed) => departed.id === seat.id) && (state.practiceBotSeat === undefined || seat.seatNumber !== state.practiceBotSeat + 1)));
      await tx.gameToolSeat.updateMany({ where: { roomId, leftAt: null, profileId: { not: null } }, data: { readyAt: null } });
      await tx.gameToolRoomMember.updateMany({ where: { roomId, leftAt: null }, data: { readyAt: null } });
      await tx.gameToolEvent.create({ data: { actorId: profileId, roomId, type: "DRAW_GUESS_RETURNED_TO_LOBBY", payload: { gameNumber: fresh.gameNumber } } });
      return true;
    }, { maxWait: 10_000, timeout: 15_000 });
    if (!returned) continue;
    await broadcastDrawGuessRoomChange(roomId);
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function getDrawGuessHistory(roomId: string, profileId: string) {
  const room = await readRoom(roomId);
  if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
  const rounds = await prisma.drawGuessRound.findMany({
    where: { roomId },
    orderBy: { roundNumber: "desc" },
    take: 20,
  });
  if (!room.seats.some((seat) => seat.profileId === profileId) && !rounds.some((round) => storedDrawGuessSeats(round.state)?.some((seat) => seat.profileId === profileId))) return { error: "NOT_A_PLAYER" } as const;
  const history = await Promise.all(rounds.map(async (round) => {
    const state = asState(round.state);
    if (!state) return null;
    await hydrateDrawGuessState(room.id, state);
    const artworks = await prisma.drawGuessArtwork.findMany({
      where: { roomId, roundNumber: round.roundNumber, submittedAt: { not: null } },
      select: { id: true, ownerSeat: true, stage: true },
    });
    const artworkUrls = Object.fromEntries(artworks.map((artwork) => [
      `${artwork.ownerSeat}:${artwork.stage}`,
      `/api/game-tools/draw-guess/rooms/${roomId}/artworks/${artwork.id}`,
    ]));
    return {
      artworkUrls,
      chains: state.mode === "CHAIN" ? state.chains : null,
      classicTurns: state.mode === "CLASSIC" ? state.drawings.map((drawing, index) => ({
        answer: state.classicAnswers[index] ?? "",
        drawing,
        guesses: state.guesses[String(index)] ?? {},
      })) : null,
      finishedAt: round.finishedAt.toISOString(),
      matchResults: state.mode === "CHAIN" ? state.matchResults : null,
      mode: state.mode,
      picks: state.mode === "CHAIN" ? state.picks : null,
      practiceBotSeat: state.practiceBotSeat,
      roundNumber: round.roundNumber,
      scores: state.scores,
      seats: (storedDrawGuessSeats(round.state) ?? room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber, profileId: seat.profileId }))).map((seat) => ({ name: seat.name, number: seat.number })),
      voteCounts: state.mode === "CHAIN" ? state.chains.map((_, owner) => {
        const votes = Object.values(state.votes[String(owner)] ?? {});
        return { yes: votes.filter(Boolean).length, no: votes.filter((vote) => !vote).length, abstain: room.playerCount - votes.length };
      }) : null,
    };
  }));
  return {
    room: {
      code: room.code,
      id: room.id,
      practiceBotSeat: asState(room.state)?.practiceBotSeat,
      seats: room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber })),
    },
    rounds: history.filter((round): round is NonNullable<typeof round> => round !== null),
  } as const;
}

export async function advanceDrawGuessRoom(roomId: string, now = Date.now()) {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (room.status !== "IN_PROGRESS") return { advanced: false } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    await hydrateDrawGuessState(room.id, state);
    const next = advanceDrawGuessGame(state, room.playerCount, now, room.locale);
    if (JSON.stringify(next) === JSON.stringify(state)) return { advanced: false } as const;
    if (!(await updateState(room, state, next, "DRAW_GUESS_PHASE_ADVANCED"))) continue;
    return { advanced: true, phase: next.phase } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function sweepDueDrawGuessRooms(now = Date.now()) {
  const staleBefore = new Date(now - DRAW_GUESS_STALE_MS);
  const staleMembers = await prisma.gameToolRoomMember.findMany({
    where: { lastSeenAt: { lte: staleBefore }, leftAt: null, room: { kind: "DRAW_GUESS", status: { in: ["LOBBY", "IN_PROGRESS", "FINISHED"] } } },
    select: { profileId: true, roomId: true },
    take: 100,
  });
  const staleRooms = new Map<string, string[]>();
  for (const member of staleMembers) {
    if (!member.profileId) continue;
    staleRooms.set(member.roomId, [...(staleRooms.get(member.roomId) ?? []), member.profileId]);
  }
  const staleResults: PromiseSettledResult<Awaited<ReturnType<typeof leaveDrawGuessRoom>>>[] = [];
  const staleEntries = [...staleRooms];
  for (let index = 0; index < staleEntries.length; index += 5) {
    const batches = await Promise.all(staleEntries.slice(index, index + 5).map(async ([roomId, profileIds]) => {
      const results: typeof staleResults = [];
      for (const profileId of profileIds) {
        try { results.push({ status: "fulfilled", value: await leaveDrawGuessRoom(roomId, profileId, staleBefore) }); }
        catch (reason) { results.push({ status: "rejected", reason }); }
      }
      return results;
    }));
    staleResults.push(...batches.flat());
  }
  const due = await prisma.gameToolRoom.findMany({
    where: {
      drawGuessDeadlineAt: { lte: new Date(now) },
      kind: "DRAW_GUESS",
      status: "IN_PROGRESS",
    },
    orderBy: [{ drawGuessDeadlineAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: 100,
  });
  const results: PromiseSettledResult<Awaited<ReturnType<typeof advanceDrawGuessRoom>>>[] = [];
  for (let index = 0; index < due.length; index += 5) {
    results.push(...await Promise.allSettled(due.slice(index, index + 5).map((room) => advanceDrawGuessRoom(room.id, now))));
  }
  return {
    advanced: results.filter((result) => result.status === "fulfilled" && "advanced" in result.value && result.value.advanced).length,
    errors: [...results, ...staleResults].filter((result) => result.status === "rejected" || result.status === "fulfilled" && "error" in result.value).length,
    scanned: due.length + staleMembers.length,
  };
}

export async function commandDrawGuessRoom(input: {
  action: DrawGuessAction;
  commandId: string;
  expectedChainStage: number;
  expectedPhase: DrawGuessPhase;
  expectedTurnIndex: number;
  gameNumber: number;
  profileId: string;
  roomId: string;
}) {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(input.commandId)) return { error: "INVALID_COMMAND_ID" } as const;
  const receivedAt = Date.now();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const room = await readRoom(input.roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    const viewer = room.seats.find((seat) => seat.profileId === input.profileId);
    if (!viewer || !room.members.some((member) => member.profileId === input.profileId)) return { error: "NOT_A_PLAYER" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    const previous = await prisma.drawGuessCommand.findUnique({
      where: { roomId_roundNumber_commandId: { roomId: room.id, roundNumber: input.gameNumber, commandId: input.commandId } },
    });
    if (previous) {
      if (previous.actorProfileId && previous.actorProfileId !== input.profileId) return { error: "COMMAND_ID_USED" } as const;
      console.info("[draw-guess] duplicate command", { roomId: room.id, roundNumber: input.gameNumber });
      return { ok: true, ...previous.result as { correct?: boolean; points?: number } } as const;
    }
    if (state.commandResults[input.commandId] && state.gameNumber === input.gameNumber) return { ok: true, ...state.commandResults[input.commandId] } as const;
    if (state.gameNumber !== input.gameNumber) return { error: "STALE_GAME" } as const;
    if (state.phase !== input.expectedPhase || state.chainStage !== input.expectedChainStage || state.turnIndex !== input.expectedTurnIndex) {
      return { error: "STALE_PHASE" } as const;
    }
    if (input.action.type === "SAVE_DRAFT" || input.action.type === "SAVE_CLASSIC_DRAFT" || input.action.type === "SUBMIT_STEP") {
      const recent = await prisma.drawGuessCommand.count({
        where: { actorProfileId: input.profileId, createdAt: { gte: new Date(receivedAt - 60_000) } },
      });
      if (recent >= (input.action.type === "SAVE_CLASSIC_DRAFT" ? 150 : 40)) return { error: "RATE_LIMITED" } as const;
    }
    await hydrateDrawGuessState(room.id, state);
    const result = applyDrawGuessAction(state, input.action, viewer.seatNumber - 1, room.playerCount, receivedAt, room.locale);
    const next = result.state;
    if ("error" in result) {
      if (JSON.stringify(next) !== JSON.stringify(state)) {
        if (!(await updateState(room, state, next, "DRAW_GUESS_PHASE_ADVANCED"))) continue;
      }
      return { error: result.error } as const;
    }
    if (state.mode === "CLASSIC" && input.action.type === "SAVE_CLASSIC_DRAFT") {
      const availableSeq = await getDrawGuessInkSequence(room.id, state.gameNumber, state.turnIndex);
      const draftSeq = input.action.inkSeq ?? 0;
      if (!Number.isSafeInteger(draftSeq) || draftSeq < (state.inkSeq ?? 0) || draftSeq > availableSeq) {
        return { error: "STALE_INK_DRAFT" } as const;
      }
      next.inkSeq = draftSeq;
    } else if (state.mode === "CLASSIC" && ["ADD_STROKE", "UNDO_STROKE", "CLEAR_STROKES"].includes(input.action.type)) {
      next.inkSeq = Math.max(next.inkSeq ?? 0, await getDrawGuessInkSequence(room.id, state.gameNumber, state.turnIndex));
    }
    const commandResult = {
      ...("correct" in result ? { correct: result.correct } : {}),
      ...("points" in result ? { points: result.points } : {}),
    };
    if (!(await updateState(room, state, next, input.action.type, input.profileId, { id: input.commandId, result: commandResult }))) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(30, 3 * (attempt + 1))));
      continue;
    }
    return { ok: true, ...commandResult } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}
