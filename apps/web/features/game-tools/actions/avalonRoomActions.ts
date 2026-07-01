"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAvalonPrivatePayload,
  getAvalonRoleDeck,
  isAvalonPlayerCount,
  normalizeAvalonMode,
  type AvalonAssignedSeat,
  type AvalonPlayerCount,
  type AvalonRoleKey,
} from "@/features/game-tools/avalonConfig";
import {
  countAvalonMissionResults,
  getAvalonMissionFailureThresholdFromState,
  getAvalonQuestTeamSize,
  getNextAvalonLeaderSeatNumber,
  normalizeAvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfile,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  createGameToolPrivateToken,
  createUniqueGameToolRoomCode,
  getDefaultGameToolSeatName,
  revalidateGameToolRoom,
} from "@/features/game-tools/gameToolRooms";

export type AvalonRoomActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
};

const roomTitleMaxLength = 80;

const createRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  mode: z.enum(["public", "identity", "full"]).default("identity"),
  playerCount: z.coerce.number().int().min(5).max(10),
  title: z.string().trim().max(roomTitleMaxLength).optional(),
});

const joinRoomSchema = z.object({
  displayName: z.string().trim().max(40).optional(),
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
  seatNumber: z.coerce.number().int().min(1).max(10),
});

const startRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
});

const proposeTeamSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
  teamSeatNumbers: z.array(z.coerce.number().int().min(1).max(10)).min(1),
});

const privateSeatActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  privateToken: z.string().min(16).max(40),
});

const submitTeamVoteSchema = privateSeatActionSchema.extend({
  value: z.enum(["approve", "reject"]),
});

const submitMissionCardSchema = privateSeatActionSchema.extend({
  value: z.enum(["fail", "success"]),
});

const submitAssassinationSchema = privateSeatActionSchema.extend({
  targetSeatNumber: z.coerce.number().int().min(1).max(10),
});

const correctRoomSchema = z.object({
  correction: z.enum(["reset_current_round", "undo_last_mission"]),
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getDefaultRoomTitle(locale: string) {
  if (locale === "fr") {
    return "Table Avalon Friemi";
  }

  if (locale === "en") {
    return "Friemi Avalon table";
  }

  return "Friemi 阿瓦隆小局";
}

function getActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      createFailed: "Impossible de créer la table. Réessaie dans un instant.",
      invalidRequest: "La demande n'est pas valide.",
      joinFailed: "Impossible de rejoindre cette place.",
      noSeat: "Cette place n'est plus disponible.",
      roomFull: "La table est complète.",
      roomNotLobby: "La partie a déjà commencé.",
      startFailed: "Impossible de démarrer cette partie.",
      startHostOnly: "Seul l'hôte peut démarrer la partie.",
      startNotLobby: "Cette partie ne peut plus être démarrée.",
      submitFailed: "Action impossible pour le moment.",
      teamInvalid: "Choisis le bon nombre de joueurs.",
      voteAlreadyDone: "Ton choix est déjà enregistré.",
    };
  }

  if (locale === "en") {
    return {
      createFailed: "Could not create the table. Try again in a moment.",
      invalidRequest: "The request is not valid.",
      joinFailed: "Could not claim this seat.",
      noSeat: "This seat is no longer available.",
      roomFull: "The table is full.",
      roomNotLobby: "The game has already started.",
      startFailed: "Could not start this game.",
      startHostOnly: "Only the host can start the game.",
      startNotLobby: "This game can no longer be started.",
      submitFailed: "This action is not available right now.",
      teamInvalid: "Pick the required number of players.",
      voteAlreadyDone: "Your choice is already recorded.",
    };
  }

  return {
    createFailed: "无法创建房间，请稍后再试。",
    invalidRequest: "请求内容无效。",
    joinFailed: "无法认领这个座位。",
    noSeat: "这个座位已经不可认领。",
    roomFull: "房间已经满员。",
    roomNotLobby: "本局已经开始。",
    startFailed: "无法开始本局，请稍后再试。",
    startHostOnly: "只有房主可以开始本局。",
    startNotLobby: "本局已经不能开始。",
    submitFailed: "当前不能执行这个动作。",
    teamInvalid: "请选择正确人数的队伍。",
    voteAlreadyDone: "你的选择已经记录。",
  };
}

function shuffleRoles(roleDeck: AvalonRoleKey[]) {
  const roles = [...roleDeck];

  for (let index = roles.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [roles[index], roles[swapIndex]] = [roles[swapIndex], roles[index]];
  }

  return roles;
}

function getClaimedDisplayName({
  displayName,
  fallback,
}: {
  displayName?: string | null;
  fallback: string;
}) {
  const trimmed = displayName?.trim();

  return trimmed || fallback;
}

function revalidateAvalonRoom(locale: string, roomId: string) {
  revalidateGameToolRoom({
    locale,
    roomId,
    toolPath: "/game-tools/avalon",
  });
}

function dedupeSeatNumbers(seatNumbers: number[]) {
  return [...new Set(seatNumbers)].sort((a, b) => a - b);
}

function getRoleAlignment(roleKey: AvalonRoleKey) {
  return roleKey === "assassin" ||
    roleKey === "minion" ||
    roleKey === "mordred" ||
    roleKey === "morgana" ||
    roleKey === "oberon"
    ? "evil"
    : "good";
}

export async function createAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    mode: normalizeAvalonMode(getString(formData, "mode")),
    playerCount: getString(formData, "playerCount"),
    title: getString(formData, "title"),
  };
  const result = createRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  if (!isAvalonPlayerCount(result.data.playerCount)) {
    return {
      formError: t.invalidRequest,
    };
  }

  const host = await ensureCurrentUserProfile(
    result.data.locale,
    "/game-tools/avalon",
  );
  const roomTitle =
    result.data.title?.trim() || getDefaultRoomTitle(result.data.locale);
  let roomId: string;

  try {
    const room = await prisma.gameToolRoom.create({
      data: {
        code: await createUniqueGameToolRoomCode(),
        config: {
          roleDeck: getAvalonRoleDeck(result.data.playerCount),
        },
        events: {
          create: {
            actorId: host.id,
            type: "room_created",
            payload: {
              mode: result.data.mode,
              playerCount: result.data.playerCount,
            },
          },
        },
        hostId: host.id,
        kind: "AVALON",
        locale: result.data.locale,
        mode: result.data.mode,
        playerCount: result.data.playerCount,
        seats: {
          create: Array.from(
            { length: result.data.playerCount },
            (_, index) => {
              const seatNumber = index + 1;
              const isHostSeat = seatNumber === 1;

              return {
                displayName: isHostSeat
                  ? host.nickname
                  : getDefaultGameToolSeatName(
                      result.data.locale,
                      seatNumber,
                    ),
                privateToken: createGameToolPrivateToken(),
                profileId: isHostSeat ? host.id : undefined,
                readyAt: isHostSeat ? new Date() : undefined,
                seatNumber,
              };
            },
          ),
        },
        title: roomTitle,
      },
      select: { id: true },
    });

    roomId = room.id;
  } catch (error) {
    console.error("Failed to create Avalon room", error);

    return {
      formError: t.createFailed,
    };
  }

  revalidateAvalonRoom(result.data.locale, roomId);
  redirect(withLocale(result.data.locale, `/game-tools/avalon/rooms/${roomId}`));
}

export async function joinAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    displayName: getString(formData, "displayName"),
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = joinRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let shouldRedirectToRoom = false;

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "AVALON" },
      include: {
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            guestName: true,
            id: true,
            profileId: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.joinFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.roomNotLobby };
    }

    if (
      profile &&
      room.seats.some((seat) => seat.profileId && seat.profileId === profile.id)
    ) {
      revalidateAvalonRoom(result.data.locale, room.id);
      shouldRedirectToRoom = true;
    } else {
      const targetSeat = room.seats.find(
        (seat) => seat.seatNumber === result.data.seatNumber,
      );

      if (!targetSeat) {
        return { formError: t.noSeat };
      }

      if (targetSeat.profileId || targetSeat.guestName) {
        return { formError: t.noSeat };
      }

      const displayName = getClaimedDisplayName({
        displayName: profile?.nickname ?? result.data.displayName,
        fallback: getDefaultGameToolSeatName(
          room.locale,
          result.data.seatNumber,
        ),
      });

      await prisma.gameToolSeat.update({
        where: { id: targetSeat.id },
        data: {
          displayName,
          guestName: profile ? null : displayName,
          profileId: profile?.id ?? null,
          readyAt: new Date(),
        },
      });
      await prisma.gameToolEvent.create({
        data: {
          actorId: profile?.id ?? null,
          payload: {
            displayName,
            seatNumber: result.data.seatNumber,
          },
          roomId: room.id,
          type: "seat_claimed",
        },
      });
    }

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to join Avalon room", error);

    return {
      formError: t.joinFailed,
    };
  }

  if (shouldRedirectToRoom) {
    redirect(
      withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`),
    );
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`),
  );
}

export async function startAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
  };
  const result = startRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    `/game-tools/avalon/rooms/${result.data.roomId}`,
  );

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "AVALON" },
      include: {
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            displayName: true,
            id: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.startFailed };
    }

    if (room.hostId !== profile.id) {
      return { formError: t.startHostOnly };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.startNotLobby };
    }

    if (!isAvalonPlayerCount(room.playerCount)) {
      return { formError: t.startFailed };
    }

    if (room.seats.length < room.playerCount) {
      return { formError: t.roomFull };
    }

    const shuffledRoles = shuffleRoles(getAvalonRoleDeck(room.playerCount));
    const assignedSeats: AvalonAssignedSeat[] = room.seats.map((seat, index) => {
      const roleKey = shuffledRoles[index];

      return {
        displayName: seat.displayName,
        roleAlignment: getRoleAlignment(roleKey),
        roleKey,
        seatNumber: seat.seatNumber,
      };
    });

    await prisma.$transaction([
      ...room.seats.map((seat) => {
        const assignedSeat = assignedSeats.find(
          (candidate) => candidate.seatNumber === seat.seatNumber,
        );

        if (!assignedSeat) {
          throw new Error("Missing assigned Avalon seat");
        }

        return prisma.gameToolSeat.update({
          where: { id: seat.id },
          data: {
            privatePayload: createAvalonPrivatePayload({
              assignedSeats,
              locale: room.locale,
              seat: assignedSeat,
            }),
            roleAlignment: assignedSeat.roleAlignment,
            roleKey: assignedSeat.roleKey,
          },
        });
      }),
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          startedAt: new Date(),
          state: {
            currentLeaderSeatNumber: 1,
            missionResults: [null, null, null, null, null],
            phase: "team_building",
            proposedTeamSeatNumbers: [],
            roundIndex: 0,
            teamVoteRejectCount: 0,
            voteResult: null,
            winner: null,
            winnerReason: null,
          },
          status: "IN_PROGRESS",
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: profile.id,
          payload: {
            mode: room.mode,
            playerCount: room.playerCount,
          },
          roomId: room.id,
          type: "room_started",
        },
      }),
    ]);

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to start Avalon room", error);

    return {
      formError: t.startFailed,
    };
  }

  redirect(withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`));
}

export async function proposeAvalonTeamAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
    teamSeatNumbers: formData.getAll("teamSeatNumbers"),
  };
  const result = proposeTeamSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.teamInvalid,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    `/game-tools/avalon/rooms/${result.data.roomId}`,
  );

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "AVALON" },
      include: {
        seats: {
          select: {
            id: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room || room.status !== "IN_PROGRESS" || room.hostId !== profile.id) {
      return { formError: t.submitFailed };
    }

    const currentState = normalizeAvalonRoomState(room.state);

    if (currentState.phase !== "team_building") {
      return { formError: t.submitFailed };
    }

    const requiredTeamSize = getAvalonQuestTeamSize({
      playerCount: room.playerCount,
      roundIndex: currentState.roundIndex,
    });
    const teamSeatNumbers = dedupeSeatNumbers(result.data.teamSeatNumbers);
    const validSeatNumbers = new Set(room.seats.map((seat) => seat.seatNumber));

    if (
      teamSeatNumbers.length !== requiredTeamSize ||
      teamSeatNumbers.some((seatNumber) => !validSeatNumbers.has(seatNumber))
    ) {
      return { formError: t.teamInvalid };
    }

    await prisma.$transaction([
      prisma.gameToolSubmission.deleteMany({
        where: {
          kind: { in: ["TEAM_VOTE", "MISSION_CARD"] },
          roomId: room.id,
          roundIndex: currentState.roundIndex,
        },
      }),
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          state: {
            ...currentState,
            missionFailureCount: null,
            phase: "team_vote",
            proposedTeamSeatNumbers: teamSeatNumbers,
            voteResult: null,
          },
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: profile.id,
          payload: {
            roundIndex: currentState.roundIndex,
            teamSeatNumbers,
          },
          roomId: room.id,
          type: "team_proposed",
        },
      }),
    ]);

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to propose Avalon team", error);

    return { formError: t.submitFailed };
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`),
  );
}

export async function submitAvalonTeamVoteAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    value: getString(formData, "value"),
  };
  const result = submitTeamVoteSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.submitFailed };
  }

  let roomId: string | null = null;

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (
      !seat ||
      seat.room.kind !== "AVALON" ||
      seat.room.status !== "IN_PROGRESS"
    ) {
      return { formError: t.submitFailed };
    }

    roomId = seat.roomId;
    const currentState = normalizeAvalonRoomState(seat.room.state);

    if (currentState.phase !== "team_vote") {
      return { formError: t.submitFailed };
    }

    const existingVote = await prisma.gameToolSubmission.findFirst({
      where: {
        kind: "TEAM_VOTE",
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
        seatId: seat.id,
      },
      select: { id: true },
    });

    if (existingVote) {
      return { formError: t.voteAlreadyDone };
    }

    await prisma.gameToolSubmission.create({
      data: {
        kind: "TEAM_VOTE",
        profileId: seat.profileId,
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
        seatId: seat.id,
        value: result.data.value,
      },
    });

    const votes = await prisma.gameToolSubmission.findMany({
      where: {
        kind: "TEAM_VOTE",
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
      },
      select: { value: true },
    });

    if (votes.length >= seat.room.playerCount) {
      const approve = votes.filter((vote) => vote.value === "approve").length;
      const reject = votes.length - approve;
      const passed = approve > reject;
      const nextRejectCount = passed
        ? 0
        : currentState.teamVoteRejectCount + 1;
      const nextLeaderSeatNumber = getNextAvalonLeaderSeatNumber({
        currentLeaderSeatNumber: currentState.currentLeaderSeatNumber,
        playerCount: seat.room.playerCount,
      });
      const nextState =
        !passed && nextRejectCount >= 5
          ? {
              ...currentState,
              phase: "finished" as const,
              teamVoteRejectCount: nextRejectCount,
              voteResult: { approve, passed, reject },
              winner: "evil" as const,
              winnerReason: "five_rejections",
            }
          : {
              ...currentState,
              currentLeaderSeatNumber: passed
                ? currentState.currentLeaderSeatNumber
                : nextLeaderSeatNumber,
              phase: passed ? ("mission" as const) : ("team_building" as const),
              proposedTeamSeatNumbers: passed
                ? currentState.proposedTeamSeatNumbers
                : [],
              teamVoteRejectCount: nextRejectCount,
              voteResult: { approve, passed, reject },
            };

      await prisma.$transaction([
        prisma.gameToolRoom.update({
          where: { id: seat.roomId },
          data: {
            finishedAt: nextState.phase === "finished" ? new Date() : undefined,
            state: nextState,
            status:
              nextState.phase === "finished" ? "FINISHED" : "IN_PROGRESS",
          },
        }),
        prisma.gameToolEvent.create({
          data: {
            actorId: seat.profileId,
            payload: {
              approve,
              passed,
              reject,
              roundIndex: currentState.roundIndex,
            },
            roomId: seat.roomId,
            type: passed ? "team_vote_passed" : "team_vote_rejected",
          },
        }),
      ]);
    }

    revalidateAvalonRoom(result.data.locale, seat.roomId);
  } catch (error) {
    console.error("Failed to submit Avalon team vote", error);

    return { formError: t.submitFailed };
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/seats/${result.data.privateToken}`),
  );
}

export async function submitAvalonMissionCardAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    value: getString(formData, "value"),
  };
  const result = submitMissionCardSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.submitFailed };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              select: {
                id: true,
                roleAlignment: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (
      !seat ||
      seat.room.kind !== "AVALON" ||
      seat.room.status !== "IN_PROGRESS"
    ) {
      return { formError: t.submitFailed };
    }

    const currentState = normalizeAvalonRoomState(seat.room.state);

    if (
      currentState.phase !== "mission" ||
      !currentState.proposedTeamSeatNumbers.includes(seat.seatNumber)
    ) {
      return { formError: t.submitFailed };
    }

    if (seat.roleAlignment !== "evil" && result.data.value === "fail") {
      return { formError: t.submitFailed };
    }

    const existingCard = await prisma.gameToolSubmission.findFirst({
      where: {
        kind: "MISSION_CARD",
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
        seatId: seat.id,
      },
      select: { id: true },
    });

    if (existingCard) {
      return { formError: t.voteAlreadyDone };
    }

    await prisma.gameToolSubmission.create({
      data: {
        kind: "MISSION_CARD",
        profileId: seat.profileId,
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
        seatId: seat.id,
        value: result.data.value,
      },
    });

    const cards = await prisma.gameToolSubmission.findMany({
      where: {
        kind: "MISSION_CARD",
        roomId: seat.roomId,
        roundIndex: currentState.roundIndex,
      },
      select: { value: true },
    });

    if (cards.length >= currentState.proposedTeamSeatNumbers.length) {
      const failCount = cards.filter((card) => card.value === "fail").length;
      const failureThreshold = getAvalonMissionFailureThresholdFromState({
        playerCount: seat.room.playerCount,
        roundIndex: currentState.roundIndex,
      });
      const missionResult = failCount >= failureThreshold ? "fail" : "success";
      const missionResults = [...currentState.missionResults];

      missionResults[currentState.roundIndex] = missionResult;
      const resultCount = countAvalonMissionResults(missionResults);
      const nextLeaderSeatNumber = getNextAvalonLeaderSeatNumber({
        currentLeaderSeatNumber: currentState.currentLeaderSeatNumber,
        playerCount: seat.room.playerCount,
      });
      const nextState =
        resultCount.fail >= 3
          ? {
              ...currentState,
              missionFailureCount: failCount,
              missionResults,
              phase: "finished" as const,
              winner: "evil" as const,
              winnerReason: "three_failed_missions",
            }
          : resultCount.success >= 3
            ? {
                ...currentState,
                missionFailureCount: failCount,
                missionResults,
                phase: "assassination" as const,
                winner: null,
                winnerReason: null,
              }
            : {
                ...currentState,
                currentLeaderSeatNumber: nextLeaderSeatNumber,
                missionFailureCount: failCount,
                missionResults,
                phase: "team_building" as const,
                proposedTeamSeatNumbers: [],
                roundIndex: currentState.roundIndex + 1,
                teamVoteRejectCount: 0,
                voteResult: null,
              };

      await prisma.$transaction([
        prisma.gameToolRoom.update({
          where: { id: seat.roomId },
          data: {
            finishedAt: nextState.phase === "finished" ? new Date() : undefined,
            state: nextState,
            status:
              nextState.phase === "finished" ? "FINISHED" : "IN_PROGRESS",
          },
        }),
        prisma.gameToolEvent.create({
          data: {
            actorId: seat.profileId,
            payload: {
              failCount,
              missionResult,
              roundIndex: currentState.roundIndex,
            },
            roomId: seat.roomId,
            type:
              missionResult === "success"
                ? "mission_succeeded"
                : "mission_failed",
          },
        }),
      ]);
    }

    revalidateAvalonRoom(result.data.locale, seat.roomId);
  } catch (error) {
    console.error("Failed to submit Avalon mission card", error);

    return { formError: t.submitFailed };
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/seats/${result.data.privateToken}`),
  );
}

export async function submitAvalonAssassinationAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    targetSeatNumber: getString(formData, "targetSeatNumber"),
  };
  const result = submitAssassinationSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.submitFailed };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              select: {
                displayName: true,
                roleKey: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (
      !seat ||
      seat.roleKey !== "assassin" ||
      seat.room.kind !== "AVALON" ||
      seat.room.status !== "IN_PROGRESS"
    ) {
      return { formError: t.submitFailed };
    }

    const currentState = normalizeAvalonRoomState(seat.room.state);

    if (currentState.phase !== "assassination") {
      return { formError: t.submitFailed };
    }

    const targetSeat = seat.room.seats.find(
      (candidate) => candidate.seatNumber === result.data.targetSeatNumber,
    );

    if (!targetSeat) {
      return { formError: t.submitFailed };
    }

    const winner = targetSeat.roleKey === "merlin" ? "evil" : "good";
    const winnerReason =
      targetSeat.roleKey === "merlin"
        ? "assassination_hit_merlin"
        : "assassination_missed_merlin";
    const nextState = {
      ...currentState,
      phase: "finished" as const,
      winner,
      winnerReason,
    };

    await prisma.$transaction([
      prisma.gameToolSubmission.create({
        data: {
          kind: "ASSASSINATION_TARGET",
          metadata: {
            targetDisplayName: targetSeat.displayName,
            targetSeatNumber: targetSeat.seatNumber,
          },
          profileId: seat.profileId,
          roomId: seat.roomId,
          roundIndex: currentState.roundIndex,
          seatId: seat.id,
          value: String(targetSeat.seatNumber),
        },
      }),
      prisma.gameToolRoom.update({
        where: { id: seat.roomId },
        data: {
          finishedAt: new Date(),
          state: nextState,
          status: "FINISHED",
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: seat.profileId,
          payload: {
            targetSeatNumber: targetSeat.seatNumber,
            winner,
          },
          roomId: seat.roomId,
          type: "assassination_resolved",
        },
      }),
    ]);

    revalidateAvalonRoom(result.data.locale, seat.roomId);
  } catch (error) {
    console.error("Failed to submit Avalon assassination", error);

    return { formError: t.submitFailed };
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/seats/${result.data.privateToken}`),
  );
}

export async function correctAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    correction: getString(formData, "correction"),
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
  };
  const result = correctRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.invalidRequest };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    `/game-tools/avalon/rooms/${result.data.roomId}`,
  );

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "AVALON" },
      select: {
        hostId: true,
        id: true,
        playerCount: true,
        state: true,
        status: true,
      },
    });

    if (
      !room ||
      room.hostId !== profile.id ||
      (room.status !== "IN_PROGRESS" && room.status !== "FINISHED")
    ) {
      return { formError: t.submitFailed };
    }

    const currentState = normalizeAvalonRoomState(room.state);
    let nextState = currentState;
    let correctedRoundIndex = currentState.roundIndex;
    const submissionKinds: Array<"ASSASSINATION_TARGET" | "MISSION_CARD" | "TEAM_VOTE"> = [
      "MISSION_CARD",
      "TEAM_VOTE",
    ];

    if (result.data.correction === "reset_current_round") {
      if (currentState.phase === "finished") {
        return { formError: t.submitFailed };
      }

      nextState = {
        ...currentState,
        missionFailureCount: null,
        phase: "team_building",
        proposedTeamSeatNumbers: [],
        voteResult: null,
      };
    } else {
      let lastMissionIndex = -1;

      for (let index = currentState.missionResults.length - 1; index >= 0; index -= 1) {
        if (currentState.missionResults[index]) {
          lastMissionIndex = index;
          break;
        }
      }

      if (lastMissionIndex < 0) {
        return { formError: t.submitFailed };
      }

      const missionResults = [...currentState.missionResults];

      missionResults[lastMissionIndex] = null;
      correctedRoundIndex = lastMissionIndex;
      submissionKinds.push("ASSASSINATION_TARGET");
      nextState = {
        ...currentState,
        missionFailureCount: null,
        missionResults,
        phase: "team_building",
        proposedTeamSeatNumbers: [],
        roundIndex: lastMissionIndex,
        teamVoteRejectCount: 0,
        voteResult: null,
        winner: null,
        winnerReason: null,
      };
    }

    await prisma.$transaction([
      prisma.gameToolSubmission.deleteMany({
        where: {
          kind: { in: submissionKinds },
          roomId: room.id,
          roundIndex: correctedRoundIndex,
        },
      }),
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          finishedAt: null,
          state: nextState,
          status: "IN_PROGRESS",
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: profile.id,
          payload: {
            correction: result.data.correction,
            roundIndex: correctedRoundIndex,
          },
          roomId: room.id,
          type: "round_corrected",
        },
      }),
    ]);

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to correct Avalon room", error);

    return { formError: t.submitFailed };
  }

  redirect(withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`));
}
