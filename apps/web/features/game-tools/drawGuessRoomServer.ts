import "server-only";

import { Prisma } from "@prisma/client";
import { changedDrawGuessArtworks, compactDrawGuessState, hydrateDrawGuessState, prepareArtworkChanges } from "@/features/game-tools/drawGuessArtworkPersistence";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  createDrawGuessState,
  getDrawGuessViewerState,
  isDrawGuessTiming,
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
import { prisma } from "@/lib/prisma";

type RoomWithSeats = NonNullable<Awaited<ReturnType<typeof readRoom>>>;

function asState(value: Prisma.JsonValue | null): DrawGuessState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as unknown as DrawGuessState;
  return state.phase && state.mode && Array.isArray(state.scores)
    ? { ...state, classicAnswers: state.classicAnswers ?? [], gameNumber: state.gameNumber ?? 1, inkSeq: state.inkSeq ?? 0 }
    : null;
}

async function readRoom(roomId: string) {
  return prisma.gameToolRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { where: { leftAt: null } },
      seats: { where: { leftAt: null }, orderBy: { seatNumber: "asc" } },
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
      await tx.drawGuessRound.create({
        data: {
          finishedAt: finishedAt!,
          mode: state.mode,
          roomId: room.id,
          roundNumber: state.gameNumber,
          state: compactDrawGuessState(state),
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
  playerCount: number;
  timing?: DrawGuessTiming;
  wordBankId?: string;
}) {
  if (input.timing !== undefined && !isDrawGuessTiming(input.timing)) return { error: "INVALID_TIMING" } as const;
  const practiceRelay = input.mode === "CHAIN" && input.playerCount === 2 && isDrawGuessPreviewRelayDuoEnabled();
  if (input.mode === "CLASSIC"
    ? input.playerCount < (isDrawGuessPreviewDuoEnabled() ? 2 : 3) || input.playerCount > 10
    : !practiceRelay && (input.playerCount < 5 || input.playerCount > 8)) {
    return { error: "INVALID_PLAYER_COUNT" } as const;
  }
  if (input.mode === "CLASSIC" && !isDrawGuessClassicEnabled()) return { error: "CLASSIC_NOT_ENABLED" } as const;
  if (input.mode === "CHAIN" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
  const wordBank = input.wordBankId
    ? await getDrawGuessWordBank(input.wordBankId, input.locale)
    : (await listDrawGuessWordBanks(input.locale))[0] ?? null;
  if (!wordBank) return { error: "INVALID_WORD_BANK" } as const;
  const seatCount = practiceRelay ? 3 : input.playerCount;
  const timing = input.timing ?? { drawSeconds: 60, guessSeconds: 20 };
  const state = createDrawGuessState(input.mode, seatCount, shuffledDrawGuessWordBank(wordBank), { drawSeconds: timing.drawSeconds, guessSeconds: timing.guessSeconds });
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
            seatNumber: 1,
          }, ...(practiceRelay ? [{ displayName: input.locale === "en" ? "Practice helper" : input.locale === "fr" ? "Aide à l'essai" : "测试补位", privateToken: createGameToolPrivateToken(), seatNumber: 3 }] : [])],
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
    const existing = room.seats.find((seat) => seat.profileId === input.profileId);
    if (existing) {
      await touchPresence(room.id, input.profileId);
      return { roomId: room.id } as const;
    }
    if (room.status !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
    const taken = new Set(room.seats.map((seat) => seat.seatNumber));
    const seatNumber = Array.from({ length: room.playerCount }, (_, index) => index + 1).find((seat) => !taken.has(seat));
    if (!seatNumber) return { error: "ROOM_FULL" } as const;
    try {
      await prisma.$transaction(async (tx) => {
        const seat = await tx.gameToolSeat.create({
          data: {
            displayName: input.displayName.slice(0, 40),
            privateToken: createGameToolPrivateToken(),
            profileId: input.profileId,
            roomId: room.id,
            seatNumber,
          },
        });
        await tx.gameToolRoomMember.create({
          data: {
            memberToken: createGameToolPrivateToken(),
            profileId: input.profileId,
            roomId: room.id,
            seatedSeatId: seat.id,
          },
        });
        await tx.gameToolRoom.update({ where: { id: room.id }, data: { revision: { increment: 1 } } });
      });
      await broadcastDrawGuessRoomChange(room.id);
      return { roomId: room.id } as const;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
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
    const viewer = room.seats.find((seat) => seat.profileId === profileId);
    if (!viewer) return { error: "NOT_A_PLAYER" } as const;
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
        isHost: room.hostId === profileId,
        mode: state.mode,
        playerCount: room.playerCount,
        practiceBotSeat: state.practiceBotSeat,
        revision: room.revision,
        seats: room.seats.map((seat) => ({ name: seat.displayName, number: seat.seatNumber, isHost: seat.profileId === room.hostId, isSystem: seat.seatNumber - 1 === state.practiceBotSeat })),
        status: room.status,
        viewerSeat: viewer.seatNumber - 1,
        wordBank: state.wordBank
          ? { ...state.wordBank, words: [...state.wordBank.words].sort((a, b) => a.localeCompare(b, room.locale)) }
          : null,
        view: getDrawGuessViewerState(state, viewer.seatNumber - 1, room.playerCount),
      },
    } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function startDrawGuessRoom(roomId: string, profileId: string) {
  await touchPresence(roomId, profileId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (await transferHostIfNeeded(room, Date.now())) continue;
    if (room.hostId !== profileId) return { error: "HOST_ONLY" } as const;
    if (room.mode === "chain" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
    if (room.seats.length !== room.playerCount) return { error: "WAIT_FOR_PLAYERS" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    await hydrateDrawGuessState(room.id, state);
    const started = startDrawGuessGame(state, Date.now(), room.locale);
    if ("error" in started) return { error: started.error } as const;
    if (!(await updateState(room, state, started.state, "DRAW_GUESS_STARTED", profileId))) continue;
    return { ok: true } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function rematchDrawGuessRoom(roomId: string, profileId: string) {
  await touchPresence(roomId, profileId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = await readRoom(roomId);
    if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
    if (await transferHostIfNeeded(room, Date.now())) continue;
    if (room.hostId !== profileId) return { error: "HOST_ONLY" } as const;
    if (room.mode === "chain" && !isDrawGuessChainEnabled()) return { error: "CHAIN_NOT_ENABLED" } as const;
    const state = asState(room.state);
    if (!state) return { error: "INVALID_STATE" } as const;
    await hydrateDrawGuessState(room.id, state);
    if (state.phase !== "FINISHED" || room.status !== "FINISHED") return { error: "GAME_NOT_FINISHED" } as const;
    if (room.seats.length !== room.playerCount) return { error: "WAIT_FOR_PLAYERS" } as const;
    const fresh = createDrawGuessState(state.mode, room.playerCount, state.wordBank ? shuffledDrawGuessWordBank(state.wordBank) : undefined, state.timing);
    fresh.practiceBotSeat = state.practiceBotSeat;
    fresh.gameNumber = state.gameNumber + 1;
    const started = startDrawGuessGame(fresh, Date.now(), room.locale);
    if (!started.state) return { error: "TRY_AGAIN" } as const;
    if (!(await updateState(room, state, started.state, "DRAW_GUESS_REMATCH_STARTED", profileId))) continue;
    return { ok: true, gameNumber: fresh.gameNumber } as const;
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function getDrawGuessHistory(roomId: string, profileId: string) {
  const room = await readRoom(roomId);
  if (!room || room.kind !== "DRAW_GUESS") return { error: "ROOM_NOT_FOUND" } as const;
  if (!room.seats.some((seat) => seat.profileId === profileId)) return { error: "NOT_A_PLAYER" } as const;
  const rounds = await prisma.drawGuessRound.findMany({
    where: { roomId },
    orderBy: { roundNumber: "desc" },
    take: 20,
  });
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
      roundNumber: round.roundNumber,
      scores: state.scores,
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
    errors: results.filter((result) => result.status === "rejected" || result.status === "fulfilled" && "error" in result.value).length,
    scanned: due.length,
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
    if (!viewer) return { error: "NOT_A_PLAYER" } as const;
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
