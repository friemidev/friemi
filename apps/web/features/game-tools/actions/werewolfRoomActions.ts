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
  getWerewolfVariantFromRoomConfig,
  getWerewolfSeatName,
  getWerewolfVariantLabel,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  normalizeWerewolfRoleDeck,
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
  getActiveGameToolRoomForProfile,
  revalidateGameToolRoom,
} from "@/features/game-tools/gameToolRooms";
import { isWerewolfTestBotFeatureEnabled } from "@/features/game-tools/werewolfTestBots";

export type WerewolfRoomActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  formNotice?: string;
};

const roomTitleMaxLength = 80;

const createWerewolfRoomSchema = z.object({
  customRoleDeck: z.string().trim().optional(),
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

const manageWerewolfSeatSchema = z.object({
  actorPrivateToken: z.string().min(16).max(40).optional(),
  displayName: z.string().trim().max(40).optional(),
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  operation: z.enum(["refresh_token", "release", "rename"]),
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

const werewolfTestBotOperationSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  operation: z.enum([
    "fill",
    "ready",
    "fill_ready_start",
    "random_death",
    "random_revive",
    "finish_good",
    "finish_werewolf",
  ]),
  roomId: z.string().min(1),
});

const leaveWerewolfSeatSchema = z
  .object({
    locale: z.string().min(1).default("zh-CN"),
    memberToken: z.string().min(16).max(40).optional(),
    privateToken: z.string().min(16).max(40).optional(),
    roomId: z.string().min(1).optional(),
  })
  .refine(
    (input) => input.privateToken || (input.roomId && input.memberToken),
    {
      path: ["privateToken"],
    },
  );

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();

  return value || undefined;
}

function shouldReturnInline(formData: FormData) {
  return getString(formData, "responseMode") === "inline";
}

function parseCustomWerewolfRoleDeck(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return normalizeWerewolfRoleDeck(JSON.parse(value));
  } catch {
    return null;
  }
}

function getActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      claimFailed: "Impossible de prendre cette place.",
      createFailed: "La table n'a pas pu s'ouvrir.",
      invalidRequest: "Vérifiez la table.",
      activeRoomConflict:
        "Vous êtes déjà dans une partie en cours. Revenez à cette table avant d'en ouvrir une autre.",
      activeRoomStartConflict:
        "Un joueur est déjà dans une autre partie en cours.",
      finishFailed: "La partie n'a pas pu se terminer.",
      joinFailed: "Impossible d'entrer dans la table.",
      joinRequired: "Entrez un nom avant de choisir une place.",
      leaveFailed: "Impossible de quitter cette place.",
      manageSeatFailed: "Impossible de modifier cette place.",
      notJudge: "Cette action est réservée à la place du maître.",
      notRunning: "La partie n'est pas lancée.",
      notLobby: "La partie a déjà commencé.",
      notReady: "Attendez que toute la table soit prête.",
      readyFailed: "Impossible de modifier votre prêt.",
      seatTaken: "Cette place vient d'être prise par quelqu'un d'autre.",
      startFailed: "Les rôles n'ont pas pu être distribués.",
      statusFailed: "Impossible de modifier cette place.",
    };
  }

  if (locale === "en") {
    return {
      claimFailed: "Could not claim this seat.",
      activeRoomConflict:
        "You are already in a running game. Return to that table before opening another one.",
      activeRoomStartConflict:
        "A seated player is already in another running game.",
      createFailed: "The table could not be opened.",
      finishFailed: "The game could not be finished.",
      invalidRequest: "Check the table.",
      joinFailed: "Could not enter the table.",
      joinRequired: "Enter a name before choosing a seat.",
      leaveFailed: "Could not leave this seat.",
      manageSeatFailed: "Could not manage this seat.",
      notJudge: "That action belongs to the judge seat.",
      notRunning: "The game has not started.",
      notLobby: "The game has already started.",
      notReady: "Wait until the full table is ready.",
      readyFailed: "Could not update your ready state.",
      seatTaken: "This seat was just taken by someone else.",
      startFailed: "Roles could not be dealt.",
      statusFailed: "Could not update that seat.",
    };
  }

  return {
    claimFailed: "认领座位失败。",
    activeRoomConflict:
      "你已经在一局进行中的桌游里，先回到那局再进入其他房间。",
    activeRoomStartConflict: "有玩家已经在其他进行中的桌游里，暂时不能开局。",
    createFailed: "这局没开起来，再试一次。",
    finishFailed: "结算没成功，再试一次。",
    invalidRequest: "检查一下这局的信息。",
    joinFailed: "没能进入房间。",
    joinRequired: "输入昵称后再选座。",
    leaveFailed: "离开座位失败。",
    manageSeatFailed: "座位管理失败。",
    notJudge: "这个操作留给法官席。",
    notRunning: "本局还没开始。",
    notLobby: "本局已经开始。",
    notReady: "等全桌准备好再发身份。",
    readyFailed: "准备状态没改成功。",
    seatTaken: "这个座位刚刚被别人抢先坐了。",
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

async function hasOtherActiveGameToolRoom({
  exceptRoomId,
  profileId,
}: {
  exceptRoomId?: string;
  profileId: string;
}) {
  const activeRoom = await getActiveGameToolRoomForProfile({
    exceptRoomId,
    profileId,
  });

  return Boolean(activeRoom);
}

type WerewolfRoomNotice =
  | "joined"
  | "left"
  | "ready"
  | "seat_changed"
  | "seat_claimed"
  | "seat_managed"
  | "unready";

function getRoomHref({
  locale,
  memberToken,
  notice,
  roomId,
}: {
  locale: string;
  memberToken?: string | null;
  notice?: WerewolfRoomNotice;
  roomId: string;
}) {
  const params = new URLSearchParams();

  if (memberToken) {
    params.set("memberToken", memberToken);
  }

  if (notice) {
    params.set("notice", notice);
  }

  const query = params.toString() ? `?${params.toString()}` : "";

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

function revalidateWerewolfSeatPath(locale: string, privateToken: string) {
  revalidatePath(
    withLocale(locale, `${werewolfToolPath}/seats/${privateToken}`),
  );
}

function getTestBotActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      disabled: "L'assistant de test est désactivé.",
      hostOnly: "Seul l'hôte peut utiliser l'assistant de test.",
      invalidRequest: "Vérifiez la table.",
      noAlive: "Aucun joueur vivant à éliminer.",
      noDead: "Aucun joueur à faire revenir.",
      notFound: "Table introuvable.",
      notLobby: "Cette action se lance avant la partie.",
      notRunning: "La partie n'est pas lancée.",
      operationFailed: "L'action de test a échoué.",
      testJudge: "Maître test",
      testPlayer: "Joueur test",
    };
  }

  if (locale === "en") {
    return {
      disabled: "The test assistant is disabled.",
      hostOnly: "Only the host can use the test assistant.",
      invalidRequest: "Check the table.",
      noAlive: "No alive player to mark out.",
      noDead: "No dead player to bring back.",
      notFound: "Table not found.",
      notLobby: "Use this action before the game starts.",
      notRunning: "The game has not started.",
      operationFailed: "The test action failed.",
      testJudge: "Test judge",
      testPlayer: "Test player",
    };
  }

  return {
    disabled: "测试助手未开启。",
    hostOnly: "只有房主能使用测试助手。",
    invalidRequest: "检查一下这局的信息。",
    noAlive: "没有可标记出局的存活玩家。",
    noDead: "没有可恢复的出局玩家。",
    notFound: "没找到这局。",
    notLobby: "这个操作只能在开局前使用。",
    notRunning: "本局还没开始。",
    operationFailed: "测试操作失败。",
    testJudge: "测试法官",
    testPlayer: "测试玩家",
  };
}

function getWerewolfTestBotDisplayName({
  isJudgeSeat,
  locale,
  seatNumber,
}: {
  isJudgeSeat: boolean;
  locale: string;
  seatNumber: number;
}) {
  const t = getTestBotActionCopy(locale);

  return isJudgeSeat ? t.testJudge : `${t.testPlayer} ${seatNumber}`;
}

function isSeatClaimed(seat: {
  guestName: string | null;
  profileId: string | null;
}) {
  return Boolean(seat.profileId || seat.guestName);
}

function pickRandomItem<T>(items: T[]) {
  return items.length ? items[randomInt(items.length)] : null;
}

type WerewolfTestBotPhase = "DAY" | "NIGHT";

type WerewolfTestBotRuntimeState = {
  hunterShotUsed: boolean;
  idiotRevealedSeatNumbers: number[];
  phase: WerewolfTestBotPhase;
  round: number;
  witchPoisonUsed: boolean;
  witchSaveUsed: boolean;
};

type WerewolfTestBotPlayerSeat = {
  displayName: string;
  roleAlignment: string | null;
  roleKey: string | null;
  seatNumber: number;
};

type WerewolfTestBotCasualtyReason = "hunter" | "poison" | "vote" | "wolf";

function getWerewolfTestBotSeatNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "number" ? item : Number(item)))
        .filter((item) => Number.isInteger(item) && item > 0 && item <= 20),
    ),
  ).sort((first, second) => first - second);
}

function getWerewolfTestBotRuntimeState(
  value: unknown,
): WerewolfTestBotRuntimeState {
  const source =
    value && typeof value === "object"
      ? (value as { testBot?: unknown }).testBot
      : null;
  const testBot = source && typeof source === "object" ? source : {};
  const phase =
    (testBot as { phase?: unknown }).phase === "DAY" ? "DAY" : "NIGHT";
  const roundValue = Number((testBot as { round?: unknown }).round);

  return {
    hunterShotUsed: Boolean(
      (testBot as { hunterShotUsed?: unknown }).hunterShotUsed,
    ),
    idiotRevealedSeatNumbers: getWerewolfTestBotSeatNumbers(
      (testBot as { idiotRevealedSeatNumbers?: unknown })
        .idiotRevealedSeatNumbers,
    ),
    phase,
    round: Number.isInteger(roundValue) && roundValue > 0 ? roundValue : 1,
    witchPoisonUsed: Boolean(
      (testBot as { witchPoisonUsed?: unknown }).witchPoisonUsed,
    ),
    witchSaveUsed: Boolean(
      (testBot as { witchSaveUsed?: unknown }).witchSaveUsed,
    ),
  };
}

function getAliveWerewolfTestBotSeats(
  playerSeats: WerewolfTestBotPlayerSeat[],
  deadSeatSet: Set<number>,
) {
  return playerSeats.filter((seat) => !deadSeatSet.has(seat.seatNumber));
}

function getWerewolfTestBotWinner(
  playerSeats: WerewolfTestBotPlayerSeat[],
  deadSeatSet: Set<number>,
): Exclude<WerewolfWinner, null> | null {
  const aliveSeats = getAliveWerewolfTestBotSeats(playerSeats, deadSeatSet);
  const aliveWerewolves = aliveSeats.filter(
    (seat) => seat.roleKey === "werewolf",
  );
  const aliveGood = aliveSeats.filter((seat) => seat.roleKey !== "werewolf");

  if (aliveWerewolves.length === 0) {
    return "GOOD";
  }

  if (aliveGood.length === 0 || aliveWerewolves.length >= aliveGood.length) {
    return "WEREWOLF";
  }

  return null;
}

function buildWerewolfTestBotPlayerResults({
  playerSeats,
  winner,
}: {
  playerSeats: WerewolfTestBotPlayerSeat[];
  winner: Exclude<WerewolfWinner, null>;
}) {
  return playerSeats.map((seat) => {
    const won =
      winner === "WEREWOLF"
        ? seat.roleAlignment === "werewolf"
        : seat.roleAlignment === "good";

    return {
      alignment: seat.roleAlignment,
      displayName: seat.displayName,
      result: won ? "WIN" : "LOSE",
      roleKey: seat.roleKey,
      seatNumber: seat.seatNumber,
    };
  });
}

function maybeApplyWerewolfTestHunterShot({
  casualties,
  deadSeatSet,
  playerSeats,
  runtimeState,
}: {
  casualties: Array<{
    reason: WerewolfTestBotCasualtyReason;
    seatNumber: number;
  }>;
  deadSeatSet: Set<number>;
  playerSeats: WerewolfTestBotPlayerSeat[];
  runtimeState: WerewolfTestBotRuntimeState;
}) {
  if (runtimeState.hunterShotUsed) {
    return runtimeState;
  }

  const hunterCasualty = casualties.find((casualty) => {
    const seat = playerSeats.find(
      (playerSeat) => playerSeat.seatNumber === casualty.seatNumber,
    );

    return seat?.roleKey === "hunter" && casualty.reason !== "poison";
  });

  if (!hunterCasualty || randomInt(100) >= 70) {
    return runtimeState;
  }

  const soonDeadSeatNumbers = new Set([
    ...Array.from(deadSeatSet),
    ...casualties.map((casualty) => casualty.seatNumber),
  ]);
  const target = pickRandomItem(
    playerSeats.filter(
      (seat) =>
        seat.seatNumber !== hunterCasualty.seatNumber &&
        !soonDeadSeatNumbers.has(seat.seatNumber),
    ),
  );

  if (!target) {
    return runtimeState;
  }

  casualties.push({
    reason: "hunter",
    seatNumber: target.seatNumber,
  });

  return {
    ...runtimeState,
    hunterShotUsed: true,
  };
}

function simulateWerewolfTestBotPhase({
  currentState,
  playerSeats,
  sourceState,
}: {
  currentState: WerewolfRoomState;
  playerSeats: WerewolfTestBotPlayerSeat[];
  sourceState: unknown;
}) {
  const deadSeatSet = new Set(currentState.deadSeatNumbers);
  let runtimeState = getWerewolfTestBotRuntimeState(sourceState);
  const casualties: Array<{
    reason: WerewolfTestBotCasualtyReason;
    seatNumber: number;
  }> = [];
  const phase = runtimeState.phase;

  if (phase === "NIGHT") {
    const aliveSeats = getAliveWerewolfTestBotSeats(playerSeats, deadSeatSet);
    const wolfTarget = pickRandomItem(
      aliveSeats.filter((seat) => seat.roleKey !== "werewolf"),
    );
    const witchAlive = aliveSeats.some((seat) => seat.roleKey === "witch");
    const witchSaves =
      Boolean(wolfTarget) &&
      witchAlive &&
      !runtimeState.witchSaveUsed &&
      randomInt(100) < 35;

    if (wolfTarget && !witchSaves) {
      casualties.push({
        reason: "wolf",
        seatNumber: wolfTarget.seatNumber,
      });
    }

    if (witchSaves) {
      runtimeState = {
        ...runtimeState,
        witchSaveUsed: true,
      };
    }

    if (witchAlive && !runtimeState.witchPoisonUsed && randomInt(100) < 30) {
      const poisonTarget = pickRandomItem(
        aliveSeats.filter(
          (seat) =>
            seat.roleKey !== "witch" &&
            !casualties.some(
              (casualty) => casualty.seatNumber === seat.seatNumber,
            ),
        ),
      );

      if (poisonTarget) {
        casualties.push({
          reason: "poison",
          seatNumber: poisonTarget.seatNumber,
        });
        runtimeState = {
          ...runtimeState,
          witchPoisonUsed: true,
        };
      }
    }

    runtimeState = {
      ...runtimeState,
      phase: "DAY",
    };
  } else {
    const aliveSeats = getAliveWerewolfTestBotSeats(playerSeats, deadSeatSet);
    const voteTarget = pickRandomItem(aliveSeats);

    if (voteTarget) {
      const idiotAlreadyRevealed =
        runtimeState.idiotRevealedSeatNumbers.includes(voteTarget.seatNumber);

      if (voteTarget.roleKey === "idiot" && !idiotAlreadyRevealed) {
        runtimeState = {
          ...runtimeState,
          idiotRevealedSeatNumbers: [
            ...runtimeState.idiotRevealedSeatNumbers,
            voteTarget.seatNumber,
          ],
        };
      } else {
        casualties.push({
          reason: "vote",
          seatNumber: voteTarget.seatNumber,
        });
      }
    }

    runtimeState = {
      ...runtimeState,
      phase: "NIGHT",
      round: runtimeState.round + 1,
    };
  }

  runtimeState = maybeApplyWerewolfTestHunterShot({
    casualties,
    deadSeatSet,
    playerSeats,
    runtimeState,
  });

  casualties.forEach((casualty) => {
    deadSeatSet.add(casualty.seatNumber);
  });

  const deadSeatNumbers = Array.from(deadSeatSet).sort(
    (first, second) => first - second,
  );

  return {
    casualties,
    deadSeatNumbers,
    phase,
    runtimeState,
    winner: getWerewolfTestBotWinner(playerSeats, deadSeatSet),
  };
}

export async function createWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    customRoleDeck: getOptionalString(formData, "customRoleDeck"),
    locale: getString(formData, "locale") || "zh-CN",
    title: getString(formData, "title"),
    variantKey:
      getString(formData, "variantKey") || "ten_player_seer_witch_hunter",
  };
  const result = createWerewolfRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const customRoleDeck =
    result.data.variantKey === "custom"
      ? parseCustomWerewolfRoleDeck(result.data.customRoleDeck)
      : null;

  if (result.data.variantKey === "custom" && !customRoleDeck) {
    return {
      formError: t.invalidRequest,
    };
  }

  const variant =
    result.data.variantKey === "custom" && customRoleDeck
      ? getWerewolfVariantFromRoomConfig(
          {
            hasJudge: true,
            judgeSeatNumber: customRoleDeck.length + 1,
            kind: "WEREWOLF",
            playerSeatCount: customRoleDeck.length,
            roleDeck: customRoleDeck,
            totalSeats: customRoleDeck.length + 1,
            variantKey: "custom",
            variantName:
              result.data.locale === "zh-CN"
                ? "自定义板子"
                : result.data.locale === "fr"
                  ? "Configuration libre"
                  : "Custom setup",
          },
          result.data.locale,
        )
      : getEnabledWerewolfVariant(result.data.variantKey);
  const host = await ensureCurrentUserProfile(
    result.data.locale,
    werewolfToolPath,
  );

  if (await hasOtherActiveGameToolRoom({ profileId: host.id })) {
    return {
      formError: t.activeRoomConflict,
    };
  }

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
  redirect(
    withLocale(result.data.locale, `${werewolfToolPath}/rooms/${roomId}`),
  );
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

    if (
      profile &&
      (await hasOtherActiveGameToolRoom({
        exceptRoomId: room.id,
        profileId: profile.id,
      }))
    ) {
      return { formError: t.activeRoomConflict };
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
      notice: "joined",
      roomId: result.data.roomId,
    }),
  );
}

export async function claimWerewolfSeatAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
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
  let redirectMemberToken: string | null = null;
  let targetPrivateToken: string | null = null;
  let notice: WerewolfRoomNotice = "seat_claimed";

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

    if (
      profile &&
      (await hasOtherActiveGameToolRoom({
        exceptRoomId: room.id,
        profileId: profile.id,
      }))
    ) {
      return { formError: t.activeRoomConflict };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);
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

    targetPrivateToken = targetSeat.privateToken;

    if (!alreadyOnTarget) {
      const now = new Date();
      const previousSeat = currentMember.seatedSeatId
        ? room.seats.find((seat) => seat.id === currentMember.seatedSeatId)
        : null;
      notice = previousSeat ? "seat_changed" : "seat_claimed";
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

    if (targetPrivateToken) {
      revalidateWerewolfSeatPath(result.data.locale, targetPrivateToken);
    }
  } catch (error) {
    console.error("Failed to claim Werewolf seat", error);

    return { formError: t.claimFailed };
  }

  if (returnInline) {
    return { formNotice: notice };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      notice,
      roomId: result.data.roomId,
    }),
  );
}

export async function manageWerewolfSeatAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    actorPrivateToken: getOptionalString(formData, "actorPrivateToken"),
    displayName: getOptionalString(formData, "displayName"),
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
    operation: getString(formData, "operation"),
    roomId: getString(formData, "roomId"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = manageWerewolfSeatSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let oldPrivateToken: string | null = null;
  let newPrivateToken: string | null = null;

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "WEREWOLF" },
      include: {
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
      return { formError: t.manageSeatFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.notLobby };
    }

    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);
    const judgeSeat = room.seats.find((seat) =>
      isWerewolfJudgeSeat(seat.seatNumber, variant),
    );
    const isHost = Boolean(profile && room.hostId === profile.id);
    const isJudge =
      Boolean(result.data.actorPrivateToken) &&
      judgeSeat?.privateToken === result.data.actorPrivateToken &&
      Boolean(judgeSeat?.profileId || judgeSeat?.guestName);

    if (!isHost && !isJudge) {
      return { formError: t.notJudge };
    }

    const targetSeat = room.seats.find(
      (seat) => seat.seatNumber === result.data.seatNumber,
    );

    if (!targetSeat) {
      return { formError: t.manageSeatFailed };
    }

    const member = await prisma.gameToolRoomMember.findFirst({
      where: {
        leftAt: null,
        seatedSeatId: targetSeat.id,
      },
      select: {
        id: true,
        profileId: true,
      },
    });
    const now = new Date();
    const actorId = profile?.id ?? (isJudge ? judgeSeat?.profileId : null);
    const updates: Prisma.PrismaPromise<unknown>[] = [];

    oldPrivateToken = targetSeat.privateToken;

    if (result.data.operation === "release") {
      updates.push(
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
            privatePayload: Prisma.JsonNull,
            profileId: null,
            readyAt: null,
            roleAlignment: null,
            roleKey: null,
          },
        }),
      );

      if (member) {
        updates.push(
          prisma.gameToolRoomMember.update({
            where: { id: member.id },
            data: {
              lastSeenAt: now,
              readyAt: null,
              seatedSeatId: null,
            },
          }),
        );
      }

      updates.push(
        prisma.gameToolEvent.create({
          data: {
            actorId,
            payload: {
              seatNumber: targetSeat.seatNumber,
            },
            roomId: room.id,
            type: "werewolf_seat_released",
          },
        }),
      );
    } else if (result.data.operation === "refresh_token") {
      newPrivateToken = createGameToolPrivateToken();
      updates.push(
        prisma.gameToolSeat.update({
          where: { id: targetSeat.id },
          data: {
            privateToken: newPrivateToken,
          },
        }),
        prisma.gameToolEvent.create({
          data: {
            actorId,
            payload: {
              seatNumber: targetSeat.seatNumber,
            },
            roomId: room.id,
            type: "werewolf_seat_link_refreshed",
          },
        }),
      );
    } else {
      const displayName = getClaimedDisplayName({
        displayName: result.data.displayName,
        fallback: targetSeat.displayName,
      });

      if (!displayName.trim()) {
        return { formError: t.manageSeatFailed };
      }

      updates.push(
        prisma.gameToolSeat.update({
          where: { id: targetSeat.id },
          data: {
            displayName,
            guestName: targetSeat.profileId
              ? targetSeat.guestName
              : displayName,
          },
        }),
        prisma.gameToolEvent.create({
          data: {
            actorId,
            payload: {
              displayName,
              seatNumber: targetSeat.seatNumber,
            },
            roomId: room.id,
            type: "werewolf_seat_renamed",
          },
        }),
      );

      if (member && !member.profileId) {
        updates.push(
          prisma.gameToolRoomMember.update({
            where: { id: member.id },
            data: {
              guestName: displayName,
              lastSeenAt: now,
            },
          }),
        );
      }
    }

    await prisma.$transaction(updates);

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });

    if (oldPrivateToken) {
      revalidateWerewolfSeatPath(result.data.locale, oldPrivateToken);
    }

    if (newPrivateToken) {
      revalidateWerewolfSeatPath(result.data.locale, newPrivateToken);
    }
  } catch (error) {
    console.error("Failed to manage Werewolf seat", error);

    return { formError: t.manageSeatFailed };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: result.data.memberToken,
      notice: "seat_managed",
      roomId: result.data.roomId,
    }),
  );
}

export async function updateWerewolfReadyAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
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

  let redirectMemberToken: string | null = null;
  let roomId: string | null = null;
  let notice: WerewolfRoomNotice = "ready";
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
    notice = readyAt ? "ready" : "unready";
    const member = await prisma.gameToolRoomMember.findFirst({
      where: {
        leftAt: null,
        seatedSeatId: seat.id,
      },
      select: {
        id: true,
        memberToken: true,
        profileId: true,
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

    roomId = seat.room.id;
    redirectMemberToken = member?.profileId
      ? null
      : (member?.memberToken ?? null);

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: seat.room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to update Werewolf ready state", error);

    return { formError: t.readyFailed };
  }

  if (returnInline) {
    return { formNotice: notice };
  }

  redirect(
    roomId
      ? getRoomHref({
          locale: result.data.locale,
          memberToken: redirectMemberToken,
          notice,
          roomId,
        })
      : withLocale(result.data.locale, werewolfToolPath),
  );
}

export async function leaveWerewolfSeatAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
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

    if (member?.profileId && profile?.id !== member.profileId) {
      return { formError: t.leaveFailed };
    }

    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);
    const now = new Date();
    const shouldReleaseSeat = room.status === "LOBBY";

    await prisma.$transaction([
      ...(shouldReleaseSeat
        ? [
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
          ]
        : [
            prisma.gameToolSeat.update({
              where: { id: targetSeat.id },
              data: {
                guestName: targetSeat.guestName ?? targetSeat.displayName,
                leftAt: now,
                profileId: null,
                readyAt: null,
              },
            }),
          ]),
      ...(member
        ? [
            prisma.gameToolRoomMember.update({
              where: { id: member.id },
              data: {
                lastSeenAt: now,
                leftAt: shouldReleaseSeat ? null : now,
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
    redirectMemberToken =
      shouldReleaseSeat && !member?.profileId
        ? (member?.memberToken ?? null)
        : null;

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to leave Werewolf seat", error);

    return { formError: t.leaveFailed };
  }

  if (returnInline) {
    return { formNotice: "left" };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      notice: "left",
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
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

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
    const requiredSeats = [
      ...playerSeats,
      ...(judgeSeatInRoom ? [judgeSeatInRoom] : []),
    ];
    const allReady =
      playerSeats.length === variant.playerSeatCount &&
      requiredSeats.length === variant.totalSeats &&
      requiredSeats.every(
        (seat) =>
          Boolean(seat.profileId || seat.guestName) && Boolean(seat.readyAt),
      );

    if (!allReady) {
      return { formError: t.notReady };
    }

    const seatedProfileIds = Array.from(
      new Set(
        requiredSeats
          .map((seat) => seat.profileId)
          .filter((profileId): profileId is string => Boolean(profileId)),
      ),
    );

    if (seatedProfileIds.length > 0) {
      const conflictingSeat = await prisma.gameToolSeat.findFirst({
        where: {
          leftAt: null,
          profileId: { in: seatedProfileIds },
          room: {
            id: { not: room.id },
            status: "IN_PROGRESS",
          },
        },
        select: { id: true },
      });

      if (conflictingSeat) {
        return { formError: t.activeRoomStartConflict };
      }
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
      `${werewolfToolPath}/seats/${result.data.privateToken}`,
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
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

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
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

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

export async function runWerewolfTestBotAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    operation: getString(formData, "operation"),
    roomId: getString(formData, "roomId"),
  };
  const result = werewolfTestBotOperationSchema.safeParse(rawInput);
  const t = getTestBotActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  if (!isWerewolfTestBotFeatureEnabled()) {
    return { formError: t.disabled };
  }

  const profile = await getOptionalCurrentUserProfile();

  if (!profile) {
    return { formError: t.hostOnly };
  }

  try {
    const room = await prisma.gameToolRoom.findFirst({
      where: { id: result.data.roomId, kind: "WEREWOLF" },
      include: {
        members: {
          where: { leftAt: null },
          select: {
            id: true,
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
            roleAlignment: true,
            roleKey: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.notFound };
    }

    if (room.hostId !== profile.id) {
      return { formError: t.hostOnly };
    }

    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);
    const playerSeats = room.seats.filter((seat) =>
      isWerewolfPlayerSeat(seat.seatNumber, variant),
    );
    const judgeSeat = room.seats.find((seat) =>
      isWerewolfJudgeSeat(seat.seatNumber, variant),
    );
    const requiredSeats = [...playerSeats, ...(judgeSeat ? [judgeSeat] : [])];
    const memberBySeatId = new Map(
      room.members
        .filter((member) => member.seatedSeatId)
        .map((member) => [member.seatedSeatId!, member]),
    );
    const now = new Date();

    if (
      result.data.operation === "fill" ||
      result.data.operation === "ready" ||
      result.data.operation === "fill_ready_start"
    ) {
      if (room.status !== "LOBBY") {
        return { formError: t.notLobby };
      }

      const shouldFill =
        result.data.operation === "fill" ||
        result.data.operation === "fill_ready_start";
      const shouldReady =
        result.data.operation === "ready" ||
        result.data.operation === "fill_ready_start";
      const shouldStart = result.data.operation === "fill_ready_start";
      const updates: Prisma.PrismaPromise<unknown>[] = [];
      const filledSeatNumbers: number[] = [];
      const readyAtForFilledSeats = shouldReady ? now : null;

      if (shouldFill) {
        requiredSeats
          .filter((seat) => !isSeatClaimed(seat))
          .forEach((seat) => {
            const isJudgeSeat = isWerewolfJudgeSeat(seat.seatNumber, variant);
            const displayName = getWerewolfTestBotDisplayName({
              isJudgeSeat,
              locale: room.locale,
              seatNumber: seat.seatNumber,
            });

            filledSeatNumbers.push(seat.seatNumber);
            updates.push(
              prisma.gameToolSeat.update({
                where: { id: seat.id },
                data: {
                  displayName,
                  guestName: displayName,
                  joinedAt: now,
                  leftAt: null,
                  profileId: null,
                  readyAt: readyAtForFilledSeats,
                },
              }),
              prisma.gameToolRoomMember.create({
                data: {
                  guestName: displayName,
                  lastSeenAt: now,
                  memberToken: createGameToolPrivateToken(),
                  readyAt: readyAtForFilledSeats,
                  roomId: room.id,
                  seatedSeatId: seat.id,
                },
              }),
            );
          });
      }

      if (shouldReady) {
        requiredSeats
          .filter((seat) => isSeatClaimed(seat))
          .forEach((seat) => {
            const member = memberBySeatId.get(seat.id);

            updates.push(
              prisma.gameToolSeat.update({
                where: { id: seat.id },
                data: {
                  readyAt: now,
                },
              }),
            );

            if (member) {
              updates.push(
                prisma.gameToolRoomMember.update({
                  where: { id: member.id },
                  data: {
                    lastSeenAt: now,
                    readyAt: now,
                  },
                }),
              );
            }
          });
      }

      if (shouldStart) {
        const roleDeck = shuffleRoles(variant.roles);
        const roleUpdates = playerSeats.map((seat, index) => {
          const roleKey = roleDeck[index];

          if (!roleKey) {
            throw new Error("Missing Werewolf test role assignment");
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

        updates.push(...roleUpdates);

        if (judgeSeat) {
          updates.push(
            prisma.gameToolSeat.update({
              where: { id: judgeSeat.id },
              data: {
                privatePayload: Prisma.JsonNull,
                roleAlignment: null,
                roleKey: null,
              },
            }),
          );
        }

        updates.push(
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
        );
      }

      updates.push(
        prisma.gameToolEvent.create({
          data: {
            actorId: profile.id,
            payload: {
              filledSeatNumbers,
              operation: result.data.operation,
              testOnly: true,
            },
            roomId: room.id,
            type: shouldStart
              ? "werewolf_test_flow_started"
              : shouldReady
                ? "werewolf_test_bots_readied"
                : "werewolf_test_bots_filled",
          },
        }),
      );

      await prisma.$transaction(updates);
    } else if (
      result.data.operation === "random_death" ||
      result.data.operation === "random_revive"
    ) {
      if (room.status !== "IN_PROGRESS") {
        return { formError: t.notRunning };
      }

      const currentState = normalizeWerewolfRoomState(room.state);
      const deadSeatSet = new Set(currentState.deadSeatNumbers);

      if (result.data.operation === "random_revive") {
        const targetSeat = pickRandomItem(
          playerSeats.filter((seat) => deadSeatSet.has(seat.seatNumber)),
        );

        if (!targetSeat) {
          return { formError: t.noDead };
        }

        deadSeatSet.delete(targetSeat.seatNumber);

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
                testBot: getWerewolfTestBotRuntimeState(room.state),
              },
            },
          }),
          prisma.gameToolEvent.create({
            data: {
              actorId: profile.id,
              payload: {
                displayName: targetSeat.displayName,
                operation: "revive",
                seatNumber: targetSeat.seatNumber,
                testOnly: true,
              },
              roomId: room.id,
              type: "werewolf_player_revived",
            },
          }),
        ]);
      } else {
        const existingWinner = getWerewolfTestBotWinner(
          playerSeats,
          deadSeatSet,
        );
        const simulation = existingWinner
          ? null
          : simulateWerewolfTestBotPhase({
              currentState,
              playerSeats,
              sourceState: room.state,
            });
        const winner = existingWinner ?? simulation?.winner ?? null;
        const runtimeState =
          simulation?.runtimeState ??
          getWerewolfTestBotRuntimeState(room.state);
        const deadSeatNumbers =
          simulation?.deadSeatNumbers ?? currentState.deadSeatNumbers;
        const eventPlayerResults = winner
          ? buildWerewolfTestBotPlayerResults({
              playerSeats,
              winner,
            })
          : [];

        if (!simulation && !winner) {
          return { formError: t.noAlive };
        }

        if (winner) {
          const finishedAt = new Date();
          const didFinish = await prisma.$transaction(async (tx) => {
            const updatedRoom = await tx.gameToolRoom.updateMany({
              where: { id: room.id, status: "IN_PROGRESS" },
              data: {
                finishedAt,
                state: {
                  ...buildFinishedWerewolfRoomState({
                    currentState: {
                      ...currentState,
                      deadSeatNumbers,
                    },
                    finishedAt,
                    winner,
                  }),
                  testBot: runtimeState,
                },
                status: "FINISHED",
              },
            });

            if (updatedRoom.count !== 1) {
              return false;
            }

            if (simulation) {
              await tx.gameToolEvent.create({
                data: {
                  actorId: profile.id,
                  payload: {
                    killedSeatNumbers: simulation.casualties.map(
                      (casualty) => casualty.seatNumber,
                    ),
                    nextPhase: runtimeState.phase,
                    phase: simulation.phase,
                    round: runtimeState.round,
                    testOnly: true,
                  },
                  roomId: room.id,
                  type: "werewolf_test_phase_advanced",
                },
              });
            }

            await tx.gameToolEvent.create({
              data: {
                actorId: profile.id,
                payload: {
                  finishedAt: finishedAt.toISOString(),
                  results: eventPlayerResults,
                  testOnly: true,
                  winner,
                },
                roomId: room.id,
                type: "werewolf_room_finished",
              },
            });

            return true;
          });

          if (!didFinish) {
            return { formError: t.notRunning };
          }
        } else if (simulation) {
          await prisma.$transaction([
            prisma.gameToolRoom.update({
              where: { id: room.id },
              data: {
                state: {
                  ...currentState,
                  deadSeatNumbers,
                  testBot: runtimeState,
                },
              },
            }),
            prisma.gameToolEvent.create({
              data: {
                actorId: profile.id,
                payload: {
                  killedSeatNumbers: simulation.casualties.map(
                    (casualty) => casualty.seatNumber,
                  ),
                  nextPhase: runtimeState.phase,
                  phase: simulation.phase,
                  round: runtimeState.round,
                  testOnly: true,
                },
                roomId: room.id,
                type: "werewolf_test_phase_advanced",
              },
            }),
          ]);
        }
      }
    } else {
      if (room.status !== "IN_PROGRESS") {
        return { formError: t.notRunning };
      }

      const winner: Exclude<WerewolfWinner, null> =
        result.data.operation === "finish_werewolf" ? "WEREWOLF" : "GOOD";
      const finishedAt = new Date();
      const currentState = normalizeWerewolfRoomState(room.state);
      const eventPlayerResults = playerSeats.map((seat) => {
        const won =
          winner === "WEREWOLF"
            ? seat.roleAlignment === "werewolf"
            : seat.roleAlignment === "good";

        return {
          alignment: seat.roleAlignment,
          displayName: seat.displayName,
          result: won ? "WIN" : "LOSE",
          roleKey: seat.roleKey,
          seatNumber: seat.seatNumber,
        };
      });
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
            actorId: profile.id,
            payload: {
              finishedAt: finishedAt.toISOString(),
              results: eventPlayerResults,
              testOnly: true,
              winner,
            },
            roomId: room.id,
            type: "werewolf_room_finished",
          },
        });

        return true;
      });

      if (!didFinish) {
        return { formError: t.notRunning };
      }
    }

    revalidateGameToolRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
    room.seats.forEach((seat) =>
      revalidateWerewolfSeatPath(result.data.locale, seat.privateToken),
    );
  } catch (error) {
    console.error("Failed to run Werewolf test bot action", error);

    return { formError: t.operationFailed };
  }

  redirect(
    withLocale(
      result.data.locale,
      `${werewolfToolPath}/rooms/${result.data.roomId}`,
    ),
  );
}
