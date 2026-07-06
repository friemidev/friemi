"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createWerewolfPrivatePayload,
  getEnabledWerewolfVariant,
  getWerewolfDefaultRoomTitle,
  getWerewolfSeatName,
  getWerewolfVariantLabel,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  type WerewolfRoleKey,
  werewolfRoleAlignments,
  werewolfToolPath,
} from "@/features/game-tools/werewolfConfig";
import {
  createInitialWerewolfRoomState,
  normalizeWerewolfRoomState,
  type WerewolfRoomState,
  type WerewolfWinner,
} from "@/features/game-tools/werewolfRoomState";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfile,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  createGameToolPrivateToken,
  createUniqueGameToolRoomCode,
  revalidateGameToolRoom,
} from "@/features/game-tools/gameToolRooms";

export type WerewolfRoomActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
};

const roomTitleMaxLength = 80;

const createWerewolfRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  title: z.string().trim().max(roomTitleMaxLength).optional(),
  variantKey: z.string().trim().min(1).default("ten_player_seer_witch_hunter"),
});

const joinWerewolfRoomSchema = z.object({
  displayName: z.string().trim().max(40).optional(),
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  roomId: z.string().min(1),
});

const claimWerewolfSeatSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  roomId: z.string().min(1),
  seatNumber: z.coerce.number().int().min(1).max(20),
});

const privateSeatActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  operation: z.enum(["ready", "unready"]).optional(),
  privateToken: z.string().min(16).max(40),
});

const updateWerewolfLifeSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  operation: z.enum(["mark_dead", "revive"]),
  privateToken: z.string().min(16).max(40),
  seatNumber: z.coerce.number().int().min(1).max(20),
});

const finishWerewolfRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  privateToken: z.string().min(16).max(40),
  winner: z.enum(["GOOD", "WEREWOLF"]),
});

const leaveWerewolfSeatSchema = z
  .object({
    locale: z.string().min(1).default("zh-CN"),
    memberToken: z.string().min(16).max(40).optional(),
    privateToken: z.string().min(16).max(40).optional(),
    roomId: z.string().min(1).optional(),
  })
  .refine((input) => input.privateToken || (input.roomId && input.memberToken), {
    path: ["privateToken"],
  });

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();

  return value || undefined;
}

function getActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      claimFailed: "Impossible de prendre cette place.",
      createFailed: "La table n'a pas pu s'ouvrir.",
      invalidRequest: "Vérifiez la table.",
      finishFailed: "La partie n'a pas pu se terminer.",
      joinFailed: "Impossible d'entrer dans la table.",
      joinRequired: "Entrez un nom avant de choisir une place.",
      leaveFailed: "Impossible de quitter cette place.",
      notJudge: "Cette action est réservée à la place du maître.",
      notRunning: "La partie n'est pas lancée.",
      notLobby: "La partie a déjà commencé.",
      notReady: "Attendez que toute la table soit prête.",
      readyFailed: "Impossible de modifier votre prêt.",
      seatTaken: "Cette place est déjà prise.",
      startFailed: "Les rôles n'ont pas pu être distribués.",
      statusFailed: "Impossible de modifier cette place.",
    };
  }

  if (locale === "en") {
    return {
      claimFailed: "Could not claim this seat.",
      createFailed: "The table could not be opened.",
      finishFailed: "The game could not be finished.",
      invalidRequest: "Check the table.",
      joinFailed: "Could not enter the table.",
      joinRequired: "Enter a name before choosing a seat.",
      leaveFailed: "Could not leave this seat.",
      notJudge: "That action belongs to the judge seat.",
      notRunning: "The game has not started.",
      notLobby: "The game has already started.",
      notReady: "Wait until the full table is ready.",
      readyFailed: "Could not update your ready state.",
      seatTaken: "This seat is already taken.",
      startFailed: "Roles could not be dealt.",
      statusFailed: "Could not update that seat.",
    };
  }

  return {
    claimFailed: "认领座位失败。",
    createFailed: "这局没开起来，再试一次。",
    finishFailed: "结算没成功，再试一次。",
    invalidRequest: "检查一下这局的信息。",
    joinFailed: "没能进入房间。",
    joinRequired: "输入昵称后再选座。",
    leaveFailed: "离开座位失败。",
    notJudge: "这个操作留给法官席。",
    notRunning: "本局还没开始。",
    notLobby: "本局已经开始。",
    notReady: "等全桌准备好再发身份。",
    readyFailed: "准备状态没改成功。",
    seatTaken: "这个座位已经有人了。",
    startFailed: "身份没发出去，再试一次。",
    statusFailed: "这个座位没改成功。",
  };
}

function getClaimedDisplayName({
  displayName,
  fallback,
}: {
  displayName?: string | null;
  fallback: string;
}) {
  const trimmed = displayName?.trim();

  return trimmed ? trimmed.slice(0, 40) : fallback;
}

function getRoomHref({
  locale,
  memberToken,
  roomId,
}: {
  locale: string;
  memberToken?: string | null;
  roomId: string;
}) {
  const query = memberToken
    ? `?memberToken=${encodeURIComponent(memberToken)}`
    : "";

  return withLocale(locale, `${werewolfToolPath}/rooms/${roomId}${query}`);
}

function shuffleRoles(roles: WerewolfRoleKey[]) {
  const shuffled = [...roles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current!;
  }

  return shuffled;
}

function buildStartedWerewolfRoomState(now: Date): WerewolfRoomState {
  const timestamp = now.toISOString();

  return {
    deadSeatNumbers: [],
    finishedAt: null,
    lockedAt: timestamp,
    phase: "IN_PROGRESS",
    resultRecordedAt: null,
    startedAt: timestamp,
    winner: null,
  };
}

function buildFinishedWerewolfRoomState({
  currentState,
  finishedAt,
  winner,
}: {
  currentState: WerewolfRoomState;
  finishedAt: Date;
  winner: Exclude<WerewolfWinner, null>;
}): WerewolfRoomState {
  const timestamp = finishedAt.toISOString();

  return {
    ...currentState,
    finishedAt: timestamp,
    phase: "FINISHED",
    resultRecordedAt: timestamp,
    winner,
  };
}

function getConfigVariantKey(config: unknown) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as { variantKey?: unknown }).variantKey;

  return typeof value === "string" ? value : null;
}

function revalidateWerewolfSeatPath(locale: string, privateToken: string) {
  revalidatePath(withLocale(locale, `${werewolfToolPath}/seats/${privateToken}`));
}

export async function createWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    title: getString(formData, "title"),
    variantKey: getString(formData, "variantKey") || "ten_player_seer_witch_hunter",
  };
  const result = createWerewolfRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const variant = getEnabledWerewolfVariant(result.data.variantKey);
  const host = await ensureCurrentUserProfile(
    result.data.locale,
    werewolfToolPath,
  );
  const roomTitle =
    result.data.title?.trim() ||
    `${getWerewolfDefaultRoomTitle(result.data.locale)} · ${getWerewolfVariantLabel(
      result.data.locale,
      variant,
    )}`;
  let roomId: string;

  try {
    const room = await prisma.gameToolRoom.create({
      data: {
        code: await createUniqueGameToolRoomCode(),
        config: {
          hasJudge: true,
          judgeSeatNumber: variant.judgeSeatNumber,
          kind: "WEREWOLF",
          playerSeatCount: variant.playerSeatCount,
          roleDeck: variant.roles,
          totalSeats: variant.totalSeats,
          variantKey: variant.key,
          variantName: getWerewolfVariantLabel(result.data.locale, variant),
        },
        events: {
          create: {
            actorId: host.id,
            payload: {
              playerSeatCount: variant.playerSeatCount,
              totalSeats: variant.totalSeats,
              variantKey: variant.key,
            },
            type: "werewolf_room_created",
          },
        },
        hostId: host.id,
        kind: "WEREWOLF",
        locale: result.data.locale,
        members: {
          create: {
            memberToken: createGameToolPrivateToken(),
            profileId: host.id,
          },
        },
        mode: "offline_judge",
        playerCount: variant.totalSeats,
        state: createInitialWerewolfRoomState(),
        seats: {
          create: Array.from({ length: variant.totalSeats }, (_, index) => {
            const seatNumber = index + 1;

            return {
              displayName: getWerewolfSeatName({
                locale: result.data.locale,
                seatNumber,
                variant,
              }),
              privateToken: createGameToolPrivateToken(),
              seatNumber,
            };
          }),
        },
        title: roomTitle,
      },
      select: { id: true },
    });

    roomId = room.id;
  } catch (error) {
    console.error("Failed to create Werewolf room", error);

    return {
      formError: t.createFailed,
    };
  }

  revalidateGameToolRoom({
    locale: result.data.locale,
    roomId,
    toolPath: werewolfToolPath,
  });
  redirect(withLocale(result.data.locale, `${werewolfToolPath}/rooms/${roomId}`));
}

export async function joinWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    displayName: getString(formData, "displayName"),
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
    roomId: getString(formData, "roomId"),
  };
  const result = joinWerewolfRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let redirectMemberToken: string | null = null;

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "WEREWOLF" },
      select: {
        id: true,
        status: true,
      },
    });

    if (!room) {
      return { formError: t.joinFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    const displayName = getClaimedDisplayName({
      displayName: profile?.nickname ?? result.data.displayName,
      fallback: "玩家",
    });

    if (profile) {
      await prisma.gameToolRoomMember.upsert({
        where: {
          roomId_profileId: {
            profileId: profile.id,
            roomId: room.id,
          },
        },
        create: {
          memberToken: createGameToolPrivateToken(),
          profileId: profile.id,
          roomId: room.id,
        },
        update: {
          lastSeenAt: new Date(),
          leftAt: null,
        },
      });
    } else if (result.data.memberToken) {
      const member = await prisma.gameToolRoomMember.findFirst({
        where: {
          leftAt: null,
          memberToken: result.data.memberToken,
          roomId: room.id,
        },
        select: {
          memberToken: true,
        },
      });

      if (member) {
        await prisma.gameToolRoomMember.update({
          where: { memberToken: member.memberToken },
          data: {
            guestName: displayName,
            lastSeenAt: new Date(),
          },
        });
        redirectMemberToken = member.memberToken;
      }
    }

    if (!profile && !redirectMemberToken) {
      const member = await prisma.gameToolRoomMember.create({
        data: {
          guestName: displayName,
          memberToken: createGameToolPrivateToken(),
          roomId: room.id,
        },
        select: {
          memberToken: true,
        },
      });

      redirectMemberToken = member.memberToken;
    }

    await prisma.gameToolEvent.create({
      data: {
        actorId: profile?.id ?? null,
        payload: {
          displayName,
        },
        roomId: room.id,
        type: "werewolf_member_joined",
      },
    });

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to join Werewolf room", error);

    return { formError: t.joinFailed };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      roomId: result.data.roomId,
    }),
  );
}

export async function claimWerewolfSeatAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
    roomId: getString(formData, "roomId"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = claimWerewolfSeatSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let privateToken: string | null = null;
  let redirectMemberToken: string | null = null;

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "WEREWOLF" },
      include: {
        members: {
          where: { leftAt: null },
          select: {
            guestName: true,
            id: true,
            memberToken: true,
            profile: {
              select: {
                nickname: true,
              },
            },
            profileId: true,
            readyAt: true,
            seatedSeatId: true,
          },
        },
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            displayName: true,
            guestName: true,
            id: true,
            privateToken: true,
            profileId: true,
            readyAt: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.claimFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    const variant = getEnabledWerewolfVariant(getConfigVariantKey(room.config));
    if (profile) {
      const existingMember = room.members.find(
        (member) => member.profileId === profile.id,
      );

      if (!existingMember) {
        const member = await prisma.gameToolRoomMember.create({
          data: {
            memberToken: createGameToolPrivateToken(),
            profileId: profile.id,
            roomId: room.id,
          },
          select: {
            id: true,
            memberToken: true,
            profileId: true,
            seatedSeatId: true,
          },
        });

        room.members.push({
          guestName: null,
          id: member.id,
          memberToken: member.memberToken,
          profile: {
            nickname: profile.nickname,
          },
          profileId: member.profileId,
          readyAt: null,
          seatedSeatId: member.seatedSeatId,
        });
      }
    }

    const currentMember = profile
      ? room.members.find((member) => member.profileId === profile.id)
      : result.data.memberToken
        ? room.members.find(
            (member) => member.memberToken === result.data.memberToken,
          )
        : null;

    if (!currentMember) {
      return { formError: t.joinRequired };
    }

    redirectMemberToken = currentMember.profileId
      ? null
      : currentMember.memberToken;

    const targetSeat = room.seats.find(
      (seat) => seat.seatNumber === result.data.seatNumber,
    );

    if (!targetSeat) {
      return { formError: t.claimFailed };
    }

    const targetMember = room.members.find(
      (member) => member.seatedSeatId === targetSeat.id,
    );
    const alreadyOnTarget = currentMember.seatedSeatId === targetSeat.id;

    if (
      !alreadyOnTarget &&
      (targetSeat.profileId ||
        targetSeat.guestName ||
        (targetMember && targetMember.id !== currentMember.id))
    ) {
      return { formError: t.seatTaken };
    }

    privateToken = targetSeat.privateToken;

    if (!alreadyOnTarget) {
      const now = new Date();
      const previousSeat = currentMember.seatedSeatId
        ? room.seats.find((seat) => seat.id === currentMember.seatedSeatId)
        : null;
      const displayName = getClaimedDisplayName({
        displayName:
          profile?.nickname ??
          currentMember.profile?.nickname ??
          currentMember.guestName,
        fallback: getWerewolfSeatName({
          locale: room.locale,
          seatNumber: targetSeat.seatNumber,
          variant,
        }),
      });
      const updates: Prisma.PrismaPromise<unknown>[] = [];

      if (previousSeat) {
        updates.push(
          prisma.gameToolSeat.update({
            where: { id: previousSeat.id },
            data: {
              displayName: getWerewolfSeatName({
                locale: room.locale,
                seatNumber: previousSeat.seatNumber,
                variant,
              }),
              guestName: null,
              leftAt: now,
              profileId: null,
              readyAt: null,
            },
          }),
        );
      }

      updates.push(
        prisma.gameToolSeat.update({
          where: { id: targetSeat.id },
          data: {
            displayName,
            guestName: currentMember.profileId ? null : displayName,
            joinedAt: now,
            leftAt: null,
            profileId: currentMember.profileId,
            readyAt: null,
          },
        }),
        prisma.gameToolRoomMember.update({
          where: { id: currentMember.id },
          data: {
            lastSeenAt: now,
            readyAt: null,
            seatedSeatId: targetSeat.id,
          },
        }),
        prisma.gameToolEvent.create({
          data: {
            actorId: currentMember.profileId,
            payload: {
              displayName,
              previousSeatNumber: previousSeat?.seatNumber ?? null,
              seatNumber: result.data.seatNumber,
            },
            roomId: room.id,
            type: previousSeat
              ? "werewolf_seat_changed"
              : "werewolf_seat_claimed",
          },
        }),
      );

      await prisma.$transaction(updates);
    }

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to claim Werewolf seat", error);

    return { formError: t.claimFailed };
  }

  if (privateToken) {
    redirect(withLocale(result.data.locale, `${werewolfToolPath}/seats/${privateToken}`));
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      roomId: result.data.roomId,
    }),
  );
}

export async function updateWerewolfReadyAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    operation: getString(formData, "operation") || "ready",
    privateToken: getString(formData, "privateToken"),
  };
  const result = privateSeatActionSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          select: {
            id: true,
            kind: true,
            status: true,
          },
        },
      },
    });

    if (!seat || seat.room.kind !== "WEREWOLF") {
      return { formError: t.readyFailed };
    }

    if (seat.room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    if (!seat.profileId && !seat.guestName) {
      return { formError: t.readyFailed };
    }

    const readyAt = result.data.operation === "unready" ? null : new Date();
    const member = await prisma.gameToolRoomMember.findFirst({
      where: {
        leftAt: null,
        seatedSeatId: seat.id,
      },
      select: {
        id: true,
      },
    });
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.gameToolSeat.update({
        where: { id: seat.id },
        data: {
          readyAt,
        },
      }),
    ];

    if (member) {
      updates.push(
        prisma.gameToolRoomMember.update({
          where: { id: member.id },
          data: {
            lastSeenAt: new Date(),
            readyAt,
          },
        }),
      );
    }

    updates.push(
      prisma.gameToolEvent.create({
        data: {
          actorId: seat.profileId,
          payload: {
            ready: Boolean(readyAt),
            seatNumber: seat.seatNumber,
          },
          roomId: seat.room.id,
          type: "werewolf_ready_changed",
        },
      }),
    );

    await prisma.$transaction(updates);

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: seat.room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to update Werewolf ready state", error);

    return { formError: t.readyFailed };
  }

  redirect(withLocale(result.data.locale, `${werewolfToolPath}/seats/${result.data.privateToken}`));
}

export async function leaveWerewolfSeatAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
    privateToken: getOptionalString(formData, "privateToken"),
    roomId: getOptionalString(formData, "roomId"),
  };
  const result = leaveWerewolfSeatSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let roomId: string | null = result.data.roomId ?? null;
  let redirectMemberToken: string | null = result.data.memberToken ?? null;

  try {
    const seat = result.data.privateToken
      ? await prisma.gameToolSeat.findUnique({
          where: { privateToken: result.data.privateToken },
          include: {
            room: {
              select: {
                config: true,
                id: true,
                kind: true,
                locale: true,
                status: true,
              },
            },
          },
        })
      : null;
    const member = seat
      ? await prisma.gameToolRoomMember.findFirst({
          where: {
            leftAt: null,
            seatedSeatId: seat.id,
          },
          select: {
            id: true,
            memberToken: true,
            profileId: true,
            room: {
              select: {
                config: true,
                id: true,
                kind: true,
                locale: true,
                status: true,
              },
            },
            roomId: true,
            seatedSeat: true,
            seatedSeatId: true,
          },
        })
      : await prisma.gameToolRoomMember.findFirst({
          where: {
            leftAt: null,
            memberToken: result.data.memberToken ?? "",
            roomId: result.data.roomId ?? "",
          },
          select: {
            id: true,
            memberToken: true,
            profileId: true,
            room: {
              select: {
                config: true,
                id: true,
                kind: true,
                locale: true,
                status: true,
              },
            },
            roomId: true,
            seatedSeat: true,
            seatedSeatId: true,
          },
        });

    const targetSeat = seat ?? member?.seatedSeat ?? null;
    const room = seat?.room ?? member?.room ?? null;

    if (!room || room.kind !== "WEREWOLF" || !targetSeat) {
      return { formError: t.leaveFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    if (member?.profileId && profile?.id !== member.profileId) {
      return { formError: t.leaveFailed };
    }

    const variant = getEnabledWerewolfVariant(getConfigVariantKey(room.config));
    const now = new Date();

    await prisma.$transaction([
      prisma.gameToolSeat.update({
        where: { id: targetSeat.id },
        data: {
          displayName: getWerewolfSeatName({
            locale: room.locale,
            seatNumber: targetSeat.seatNumber,
            variant,
          }),
          guestName: null,
          leftAt: now,
          profileId: null,
          readyAt: null,
        },
      }),
      ...(member
        ? [
            prisma.gameToolRoomMember.update({
              where: { id: member.id },
              data: {
                lastSeenAt: now,
                readyAt: null,
                seatedSeatId: null,
              },
            }),
          ]
        : []),
      prisma.gameToolEvent.create({
        data: {
          actorId: member?.profileId ?? targetSeat.profileId,
          payload: {
            seatNumber: targetSeat.seatNumber,
          },
          roomId: room.id,
          type: "werewolf_seat_left",
        },
      }),
    ]);

    roomId = room.id;
    redirectMemberToken = member?.profileId ? null : member?.memberToken ?? null;

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to leave Werewolf seat", error);

    return { formError: t.leaveFailed };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      roomId: roomId ?? "",
    }),
  );
}

export async function startWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
  };
  const result = privateSeatActionSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  let roomId: string | null = null;

  try {
    const judgeSeat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                displayName: true,
                guestName: true,
                id: true,
                profileId: true,
                readyAt: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!judgeSeat || judgeSeat.room.kind !== "WEREWOLF") {
      return { formError: t.startFailed };
    }

    const room = judgeSeat.room;
    const variant = getEnabledWerewolfVariant(getConfigVariantKey(room.config));

    if (!isWerewolfJudgeSeat(judgeSeat.seatNumber, variant)) {
      return { formError: t.notJudge };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    const playerSeats = room.seats.filter((seat) =>
      isWerewolfPlayerSeat(seat.seatNumber, variant),
    );
    const judgeSeatInRoom = room.seats.find((seat) =>
      isWerewolfJudgeSeat(seat.seatNumber, variant),
    );
    const requiredSeats = [...playerSeats, ...(judgeSeatInRoom ? [judgeSeatInRoom] : [])];
    const allReady =
      playerSeats.length === variant.playerSeatCount &&
      requiredSeats.length === variant.totalSeats &&
      requiredSeats.every(
        (seat) => Boolean(seat.profileId || seat.guestName) && Boolean(seat.readyAt),
      );

    if (!allReady) {
      return { formError: t.notReady };
    }

    const now = new Date();
    const roleDeck = shuffleRoles(variant.roles);
    const roleUpdates = playerSeats.map((seat, index) => {
      const roleKey = roleDeck[index];

      if (!roleKey) {
        throw new Error("Missing Werewolf role assignment");
      }

      return prisma.gameToolSeat.update({
        where: { id: seat.id },
        data: {
          privatePayload: createWerewolfPrivatePayload({
            locale: room.locale,
            roleKey,
            variant,
          }),
          roleAlignment: werewolfRoleAlignments[roleKey],
          roleKey,
        },
      });
    });

    await prisma.$transaction([
      ...roleUpdates,
      prisma.gameToolSeat.update({
        where: { id: judgeSeat.id },
        data: {
          privatePayload: Prisma.JsonNull,
          roleAlignment: null,
          roleKey: null,
        },
      }),
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          startedAt: now,
          state: {
            ...normalizeWerewolfRoomState(room.state),
            ...buildStartedWerewolfRoomState(now),
          },
          status: "IN_PROGRESS",
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            playerSeatCount: variant.playerSeatCount,
            totalSeats: variant.totalSeats,
            variantKey: variant.key,
          },
          roomId: room.id,
          type: "werewolf_room_started",
        },
      }),
    ]);

    roomId = room.id;
    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to start Werewolf room", error);

    return { formError: t.startFailed };
  }

  redirect(
    withLocale(
      result.data.locale,
      roomId
        ? `${werewolfToolPath}/rooms/${roomId}`
        : `${werewolfToolPath}/seats/${result.data.privateToken}`,
    ),
  );
}

export async function updateWerewolfPlayerLifeAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    operation: getString(formData, "operation"),
    privateToken: getString(formData, "privateToken"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = updateWerewolfLifeSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  try {
    const judgeSeat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                displayName: true,
                id: true,
                privateToken: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!judgeSeat || judgeSeat.room.kind !== "WEREWOLF") {
      return { formError: t.statusFailed };
    }

    const room = judgeSeat.room;
    const variant = getEnabledWerewolfVariant(getConfigVariantKey(room.config));

    if (!isWerewolfJudgeSeat(judgeSeat.seatNumber, variant)) {
      return { formError: t.notJudge };
    }

    if (room.status !== "IN_PROGRESS") {
      return { formError: t.notRunning };
    }

    if (!isWerewolfPlayerSeat(result.data.seatNumber, variant)) {
      return { formError: t.statusFailed };
    }

    const targetSeat = room.seats.find(
      (seat) => seat.seatNumber === result.data.seatNumber,
    );

    if (!targetSeat) {
      return { formError: t.statusFailed };
    }

    const currentState = normalizeWerewolfRoomState(room.state);
    const deadSeatSet = new Set(currentState.deadSeatNumbers);

    if (result.data.operation === "mark_dead") {
      deadSeatSet.add(targetSeat.seatNumber);
    } else {
      deadSeatSet.delete(targetSeat.seatNumber);
    }

    const deadSeatNumbers = Array.from(deadSeatSet).sort(
      (first, second) => first - second,
    );

    await prisma.$transaction([
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          state: {
            ...currentState,
            deadSeatNumbers,
          },
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            displayName: targetSeat.displayName,
            operation: result.data.operation,
            seatNumber: targetSeat.seatNumber,
          },
          roomId: room.id,
          type:
            result.data.operation === "mark_dead"
              ? "werewolf_player_marked_dead"
              : "werewolf_player_revived",
        },
      }),
    ]);

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
    revalidateWerewolfSeatPath(result.data.locale, judgeSeat.privateToken);
    revalidateWerewolfSeatPath(result.data.locale, targetSeat.privateToken);
  } catch (error) {
    console.error("Failed to update Werewolf player life state", error);

    return { formError: t.statusFailed };
  }

  redirect(
    withLocale(
      result.data.locale,
      `${werewolfToolPath}/seats/${result.data.privateToken}`,
    ),
  );
}

export async function finishWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    winner: getString(formData, "winner"),
  };
  const result = finishWerewolfRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  try {
    const judgeSeat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                displayName: true,
                privateToken: true,
                profileId: true,
                roleAlignment: true,
                roleKey: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!judgeSeat || judgeSeat.room.kind !== "WEREWOLF") {
      return { formError: t.finishFailed };
    }

    const room = judgeSeat.room;
    const variant = getEnabledWerewolfVariant(getConfigVariantKey(room.config));

    if (!isWerewolfJudgeSeat(judgeSeat.seatNumber, variant)) {
      return { formError: t.notJudge };
    }

    if (room.status !== "IN_PROGRESS") {
      return { formError: t.notRunning };
    }

    const winner = result.data.winner as Exclude<WerewolfWinner, null>;
    const finishedAt = new Date();
    const currentState = normalizeWerewolfRoomState(room.state);
    const variantName = getWerewolfVariantLabel(room.locale, variant);
    const playerResults = room.seats
      .filter((seat) => isWerewolfPlayerSeat(seat.seatNumber, variant))
      .map((seat) => {
        const won =
          winner === "WEREWOLF"
            ? seat.roleAlignment === "werewolf"
            : seat.roleAlignment === "good";

        return {
          alignment: seat.roleAlignment,
          displayName: seat.displayName,
          profileId: seat.profileId,
          result: won ? "WIN" : "LOSE",
          roleKey: seat.roleKey,
          seatNumber: seat.seatNumber,
        };
      });
    const eventPlayerResults = playerResults.map((player) => ({
      alignment: player.alignment,
      displayName: player.displayName,
      result: player.result,
      roleKey: player.roleKey,
      seatNumber: player.seatNumber,
    }));
    const recordInputs = [
      ...playerResults
        .filter((player) => player.profileId)
        .map((player) => ({
          displayName: player.displayName,
          isJudge: false,
          profileId: player.profileId!,
          result: player.result,
          roleAlignment: player.alignment,
          roleKey: player.roleKey,
          seatNumber: player.seatNumber,
        })),
      ...(judgeSeat.profileId
        ? [
            {
              displayName: judgeSeat.displayName,
              isJudge: true,
              profileId: judgeSeat.profileId,
              result: null,
              roleAlignment: null,
              roleKey: null,
              seatNumber: judgeSeat.seatNumber,
            },
          ]
        : []),
    ];
    const didFinish = await prisma.$transaction(async (tx) => {
      const updatedRoom = await tx.gameToolRoom.updateMany({
        where: { id: room.id, status: "IN_PROGRESS" },
        data: {
          finishedAt,
          state: buildFinishedWerewolfRoomState({
            currentState,
            finishedAt,
            winner,
          }),
          status: "FINISHED",
        },
      });

      if (updatedRoom.count !== 1) {
        return false;
      }

      await tx.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            finishedAt: finishedAt.toISOString(),
            judgeSeatNumber: judgeSeat.seatNumber,
            results: eventPlayerResults,
            winner,
          },
          roomId: room.id,
          type: "werewolf_room_finished",
        },
      });
      await Promise.all(
        recordInputs.map((record) =>
          tx.gameToolPlayerRecord.upsert({
            where: {
              roomId_profileId: {
                profileId: record.profileId,
                roomId: room.id,
              },
            },
            create: {
              kind: "WEREWOLF",
              metadata: {
                displayName: record.displayName,
                roomCode: room.code,
                winner,
              },
              isJudge: record.isJudge,
              playedAt: finishedAt,
              profileId: record.profileId,
              result: record.result,
              roleAlignment: record.roleAlignment,
              roleKey: record.roleKey,
              roomId: room.id,
              seatNumber: record.seatNumber,
              variantKey: variant.key,
              variantName,
            },
            update: {
              kind: "WEREWOLF",
              metadata: {
                displayName: record.displayName,
                roomCode: room.code,
                winner,
              },
              isJudge: record.isJudge,
              playedAt: finishedAt,
              result: record.result,
              roleAlignment: record.roleAlignment,
              roleKey: record.roleKey,
              seatNumber: record.seatNumber,
              variantKey: variant.key,
              variantName,
            },
          }),
        ),
      );

      return true;
    });

    if (!didFinish) {
      return { formError: t.notRunning };
    }

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
    room.seats.forEach((seat) =>
      revalidateWerewolfSeatPath(result.data.locale, seat.privateToken),
    );
    const recordProfileIds = Array.from(
      new Set(recordInputs.map((record) => record.profileId)),
    );

    if (recordProfileIds.length > 0) {
      revalidatePath(withLocale(result.data.locale, "/profile"));
      recordProfileIds.forEach((profileId) => {
        revalidatePath(withLocale(result.data.locale, `/profile/${profileId}`));
      });
    }
  } catch (error) {
    console.error("Failed to finish Werewolf room", error);

    return { formError: t.finishFailed };
  }

  redirect(
    withLocale(
      result.data.locale,
      `${werewolfToolPath}/seats/${result.data.privateToken}`,
    ),
  );
}
