"use server";

import { randomInt, randomUUID } from "node:crypto";
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
  isActiveWerewolfJudgeSeat,
  isActiveWerewolfPlayerSeat,
  isActiveWerewolfSeatOccupant,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  normalizeWerewolfRoleDeck,
  type WerewolfRoleKey,
  werewolfRoleAlignments,
  werewolfToolPath,
} from "@/features/game-tools/werewolfConfig";
import {
  createInitialWerewolfRoomState,
  getWerewolfWinnerFromFinishSelection,
  normalizeWerewolfRoomState,
  type WerewolfFinishSelection,
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
  getGameToolRoomPath,
  revalidateWerewolfRoom,
} from "@/features/game-tools/gameToolRooms";
import { isWerewolfTestBotFeatureEnabled } from "@/features/game-tools/werewolfTestBots";
import { werewolfAtmospheres } from "@/features/game-tools/werewolfCardAssets";
import {
  canUseWerewolfAntidote,
  createInitialWerewolfFlowState,
  getWerewolfFactionAlert,
  getWerewolfNightCues,
  getWerewolfNightActionSubmissionKey,
  getWerewolfSeerResult,
  tallyWerewolfVotes,
  type WerewolfFlowState,
} from "@/features/game-tools/werewolfFlow";

export type WerewolfRoomActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  formNotice?: string;
  redirectHref?: string;
};

const roomTitleMaxLength = 80;

const createWerewolfRoomSchema = z.object({
  customRoleDeck: z.string().trim().optional(),
  locale: z.string().min(1).default("zh-CN"),
  title: z.string().trim().max(roomTitleMaxLength).optional(),
  variantKey: z.string().trim().min(1).default("twelve_player_idiot"),
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

const readyWerewolfSeatSchema = z
  .object({
    locale: z.string().min(1).default("zh-CN"),
    memberToken: z.string().min(16).max(40).optional(),
    operation: z.enum(["ready", "unready"]).optional(),
    privateToken: z.string().min(16).max(40).optional(),
    roomId: z.string().min(1).optional(),
  })
  .refine((input) => input.privateToken || input.roomId, {
    path: ["privateToken"],
  });

const updateWerewolfLifeSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  operation: z.enum(["mark_dead", "reveal_idiot", "revive"]),
  privateToken: z.string().min(16).max(40),
  seatNumber: z.coerce.number().int().min(1).max(20),
});

const updateWerewolfSheriffSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  operation: z.enum(["clear", "set"]),
  privateToken: z.string().min(16).max(40),
  seatNumber: z.coerce.number().int().min(1).max(20),
});

const finishWerewolfRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  memberToken: z.string().min(16).max(40).optional(),
  privateToken: z.string().min(16).max(40),
  winner: z.enum(["GOOD", "THIRD_PARTY", "WEREWOLF", "TERMINATED"]),
});

const updateWerewolfFlowSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  operation: z.enum(["dismiss_alert", "next", "previous_cue", "resolve_vote"]),
  privateToken: z.string().min(16).max(40),
});

const updateWerewolfCandidacySchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  operation: z.enum(["join", "withdraw"]),
  privateToken: z.string().min(16).max(40),
});

const submitWerewolfVoteSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  privateToken: z.string().min(16).max(40),
  targetSeatNumber: z.coerce.number().int().min(0).max(20),
});

const submitWerewolfNightActionSchema = z.object({
  actionKind: z.enum([
    "CUPID",
    "GUARD",
    "LOVERS",
    "SEER",
    "WITCH_ANTIDOTE",
    "WITCH_PASS",
    "WITCH_POISON",
    "WOLF_KILL",
  ]),
  locale: z.string().min(1).default("zh-CN"),
  privateToken: z.string().min(16).max(40),
  secondaryTargetSeatNumber: z.coerce.number().int().min(0).max(20).optional(),
  targetSeatNumber: z.coerce.number().int().min(0).max(20).optional(),
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
    intent: z.enum(["leave_seat", "exit_room"]).default("leave_seat"),
    locale: z.string().min(1).default("zh-CN"),
    memberToken: z.string().min(16).max(40).optional(),
    privateToken: z.string().min(16).max(40).optional(),
    roomId: z.string().min(1).optional(),
  })
  .refine((input) => input.privateToken || input.roomId, {
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

type LockedWerewolfRoom = {
  id: string;
  revision: number;
  state: Prisma.JsonValue;
  status: string;
};

async function lockWerewolfRoomForMutation(
  tx: Prisma.TransactionClient,
  roomId: string,
) {
  const rooms = await tx.$queryRaw<LockedWerewolfRoom[]>(Prisma.sql`
    SELECT "id", "revision", "state", "status"::text AS "status"
    FROM "GameToolRoom"
    WHERE "id" = ${roomId}
      AND "kind" = 'WEREWOLF'
    FOR UPDATE
  `);

  return rooms[0] ?? null;
}

function buildStartedWerewolfRoomState(
  now: Date,
  roundNumber: number,
): WerewolfRoomState {
  const timestamp = now.toISOString();

  return {
    deadSeatNumbers: [],
    finishedAt: null,
    flow: createInitialWerewolfFlowState({
      roundNumber,
      startedAt: timestamp,
    }),
    lockedAt: timestamp,
    phase: "IN_PROGRESS",
    resultRecordedAt: null,
    roundNumber,
    sheriffSeatNumber: null,
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
  winner: WerewolfWinner;
}): WerewolfRoomState {
  const timestamp = finishedAt.toISOString();

  return {
    ...currentState,
    finishedAt: timestamp,
    flow: {
      ...currentState.flow,
      stage: "FINISHED",
    },
    phase: "FINISHED",
    resultRecordedAt: winner ? timestamp : null,
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
    (seat) => seat.roleAlignment === "werewolf",
  );
  const aliveGood = aliveSeats.filter((seat) => seat.roleAlignment === "good");

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
      aliveSeats.filter((seat) => seat.roleAlignment !== "werewolf"),
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
    variantKey: getString(formData, "variantKey") || "twelve_player_idiot",
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
          },
          result.data.locale,
        )
      : getEnabledWerewolfVariant(result.data.variantKey);
  const host = await ensureCurrentUserProfile(
    result.data.locale,
    werewolfToolPath,
  );

  const activeRoom = await getActiveGameToolRoomForProfile({
    profileId: host.id,
  });

  if (activeRoom) {
    return {
      redirectHref: withLocale(
        result.data.locale,
        getGameToolRoomPath({ kind: activeRoom.kind, roomId: activeRoom.id }),
      ),
    };
  }

  const roomTitle =
    result.data.title?.trim() ||
    `${getWerewolfDefaultRoomTitle(result.data.locale)} · ${getWerewolfVariantLabel(
      result.data.locale,
      variant,
    )}`;
  const atmosphere =
    werewolfAtmospheres[randomInt(werewolfAtmospheres.length)] ??
    werewolfAtmospheres[0];
  let roomId: string;

  try {
    const room = await prisma.gameToolRoom.create({
      data: {
        code: await createUniqueGameToolRoomCode(),
        config: {
          atmosphereId: atmosphere.id,
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
              atmosphereId: atmosphere.id,
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

  await revalidateWerewolfRoom({
    locale: result.data.locale,
    roomId,
    toolPath: werewolfToolPath,
  });
  return {
    redirectHref: withLocale(
      result.data.locale,
      `${werewolfToolPath}/rooms/${roomId}`,
    ),
  };
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
        revision: true,
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

    if (room.status !== "LOBBY" && room.status !== "FINISHED") {
      return { formError: t.notLobby };
    }

    const displayName = getClaimedDisplayName({
      displayName: profile?.nickname ?? result.data.displayName,
      fallback: "玩家",
    });

    const joinResult = await prisma.$transaction(async (tx) => {
      const updatedRoom = await tx.gameToolRoom.updateMany({
        where: {
          id: room.id,
          revision: room.revision,
          status: room.status,
        },
        data: { revision: { increment: 1 } },
      });

      if (updatedRoom.count !== 1) {
        return { joined: false as const, memberToken: null };
      }

      let memberToken: string | null = null;

      if (profile) {
        await tx.gameToolRoomMember.upsert({
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
        const member = await tx.gameToolRoomMember.findFirst({
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
          await tx.gameToolRoomMember.update({
            where: { memberToken: member.memberToken },
            data: {
              guestName: displayName,
              lastSeenAt: new Date(),
            },
          });
          memberToken = member.memberToken;
        }
      }

      if (!profile && !memberToken) {
        const member = await tx.gameToolRoomMember.create({
          data: {
            guestName: displayName,
            memberToken: createGameToolPrivateToken(),
            roomId: room.id,
          },
          select: {
            memberToken: true,
          },
        });

        memberToken = member.memberToken;
      }

      await tx.gameToolEvent.create({
        data: {
          actorId: profile?.id ?? null,
          payload: {
            displayName,
          },
          roomId: room.id,
          type: "werewolf_member_joined",
        },
      });

      return { joined: true as const, memberToken };
    });

    if (!joinResult.joined) {
      return { formError: t.notLobby };
    }

    redirectMemberToken = joinResult.memberToken;

    await revalidateWerewolfRoom({
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
  const stalePrivateTokens: string[] = [];
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
            leftAt: true,
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

    if (room.status !== "LOBBY" && room.status !== "FINISHED") {
      return { formError: t.notLobby };
    }

    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);
    const currentMember = profile
      ? room.members.find((member) => member.profileId === profile.id)
      : result.data.memberToken
        ? room.members.find(
            (member) => member.memberToken === result.data.memberToken,
          )
        : null;

    if (!currentMember && !profile) {
      return { formError: t.joinRequired };
    }

    const currentMemberProfileId = currentMember?.profileId ?? profile?.id;
    const currentMemberToken =
      currentMember?.memberToken ?? createGameToolPrivateToken();
    redirectMemberToken = currentMemberProfileId ? null : currentMemberToken;

    const targetSeat = room.seats.find(
      (seat) => seat.seatNumber === result.data.seatNumber,
    );

    if (!targetSeat) {
      return { formError: t.claimFailed };
    }

    const targetMember = room.members.find(
      (member) => member.seatedSeatId === targetSeat.id,
    );
    const alreadyOnTarget = currentMember?.seatedSeatId === targetSeat.id;

    if (
      !alreadyOnTarget &&
      (targetSeat.profileId ||
        targetSeat.guestName ||
        (targetMember && targetMember.id !== currentMember?.id))
    ) {
      return { formError: t.seatTaken };
    }

    const previousTargetPrivateToken = targetSeat.privateToken;
    targetPrivateToken = alreadyOnTarget
      ? previousTargetPrivateToken
      : createGameToolPrivateToken();

    if (!alreadyOnTarget) {
      const now = new Date();
      const previousSeat = currentMember?.seatedSeatId
        ? room.seats.find((seat) => seat.id === currentMember.seatedSeatId)
        : null;
      notice = previousSeat ? "seat_changed" : "seat_claimed";
      const displayName = getClaimedDisplayName({
        displayName:
          profile?.nickname ??
          currentMember?.profile?.nickname ??
          currentMember?.guestName,
        fallback: getWerewolfSeatName({
          locale: room.locale,
          seatNumber: targetSeat.seatNumber,
          variant,
        }),
      });
      const didClaim = await prisma.$transaction(async (tx) => {
        const updatedRoom = await tx.gameToolRoom.updateMany({
          where: {
            id: room.id,
            revision: room.revision,
            status: room.status,
          },
          data: { revision: { increment: 1 } },
        });

        if (updatedRoom.count !== 1) {
          return false;
        }

        let memberId = currentMember?.id ?? null;

        if (!memberId) {
          if (!profile) {
            throw new Error("Missing profile while claiming a Werewolf seat");
          }

          const member = await tx.gameToolRoomMember.create({
            data: {
              memberToken: currentMemberToken,
              profileId: profile.id,
              roomId: room.id,
            },
            select: { id: true },
          });
          memberId = member.id;
        }

        if (previousSeat) {
          await tx.gameToolSeat.update({
            where: { id: previousSeat.id },
            data: {
              displayName: getWerewolfSeatName({
                locale: room.locale,
                seatNumber: previousSeat.seatNumber,
                variant,
              }),
              guestName: null,
              leftAt: now,
              privateToken: createGameToolPrivateToken(),
              profileId: null,
              readyAt: null,
            },
          });
        }

        await tx.gameToolSeat.update({
          where: { id: targetSeat.id },
          data: {
            displayName,
            guestName: currentMemberProfileId ? null : displayName,
            joinedAt: now,
            leftAt: null,
            privateToken: targetPrivateToken!,
            profileId: currentMemberProfileId,
            readyAt: null,
          },
        });
        await tx.gameToolRoomMember.update({
          where: { id: memberId },
          data: {
            lastSeenAt: now,
            readyAt: null,
            seatedSeatId: targetSeat.id,
          },
        });
        await tx.gameToolEvent.create({
          data: {
            actorId: currentMemberProfileId,
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
        });

        return true;
      });

      if (!didClaim) {
        return { formError: t.claimFailed };
      }

      if (previousSeat) {
        stalePrivateTokens.push(previousSeat.privateToken);
      }
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });

    if (targetPrivateToken) {
      revalidateWerewolfSeatPath(result.data.locale, targetPrivateToken);
    }

    if (!alreadyOnTarget) {
      stalePrivateTokens.push(previousTargetPrivateToken);
    }

    stalePrivateTokens.forEach((privateToken) =>
      revalidateWerewolfSeatPath(result.data.locale, privateToken),
    );
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
            leftAt: true,
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

    if (room.status !== "LOBBY" && room.status !== "FINISHED") {
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
      Boolean(judgeSeat && isActiveWerewolfJudgeSeat(judgeSeat, variant));

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
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.gameToolRoom.update({
        where: {
          id: room.id,
          revision: room.revision,
          status: room.status,
        },
        data: { revision: { increment: 1 } },
      }),
    ];

    oldPrivateToken = targetSeat.privateToken;

    if (result.data.operation === "release") {
      newPrivateToken = createGameToolPrivateToken();
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
            privateToken: newPrivateToken,
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

    await revalidateWerewolfRoom({
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
    memberToken: getOptionalString(formData, "memberToken"),
    operation: getString(formData, "operation") || "ready",
    privateToken: getOptionalString(formData, "privateToken"),
    roomId: getOptionalString(formData, "roomId"),
  };
  const result = readyWerewolfSeatSchema.safeParse(rawInput);
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
    const profile = await getOptionalCurrentUserProfile();
    const seatByToken = result.data.privateToken
      ? await prisma.gameToolSeat.findUnique({
          where: { privateToken: result.data.privateToken },
          include: {
            room: {
              select: {
                id: true,
                kind: true,
                revision: true,
                status: true,
              },
            },
          },
        })
      : null;
    const memberBySeat = seatByToken
      ? await prisma.gameToolRoomMember.findFirst({
          where: {
            leftAt: null,
            seatedSeatId: seatByToken.id,
          },
          select: {
            id: true,
            memberToken: true,
            profileId: true,
          },
        })
      : null;
    const memberByCurrentRoom = !seatByToken
      ? await prisma.gameToolRoomMember.findFirst({
          where: {
            leftAt: null,
            roomId: result.data.roomId ?? "",
            ...(result.data.memberToken || profile
              ? {
                  OR: [
                    ...(result.data.memberToken
                      ? [{ memberToken: result.data.memberToken }]
                      : []),
                    ...(profile ? [{ profileId: profile.id }] : []),
                  ],
                }
              : { memberToken: "" }),
          },
          select: {
            id: true,
            memberToken: true,
            profileId: true,
            room: {
              select: {
                id: true,
                kind: true,
                revision: true,
                status: true,
              },
            },
            seatedSeat: {
              select: {
                guestName: true,
                id: true,
                leftAt: true,
                profileId: true,
                seatNumber: true,
              },
            },
          },
        })
      : null;
    const member = memberBySeat ?? memberByCurrentRoom;
    const seat = seatByToken ?? memberByCurrentRoom?.seatedSeat ?? null;
    const room = seatByToken?.room ?? memberByCurrentRoom?.room ?? null;

    if (!seat || !room || room.kind !== "WEREWOLF") {
      return { formError: t.readyFailed };
    }

    if (room.status !== "LOBBY" && room.status !== "FINISHED") {
      return { formError: t.notLobby };
    }

    if (!isActiveWerewolfSeatOccupant(seat)) {
      return { formError: t.readyFailed };
    }

    const readyAt = result.data.operation === "unready" ? null : new Date();
    notice = readyAt ? "ready" : "unready";
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.gameToolRoom.update({
        where: {
          id: room.id,
          revision: room.revision,
          status: room.status,
        },
        data: {
          revision: { increment: 1 },
        },
      }),
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
          roomId: room.id,
          type: "werewolf_ready_changed",
        },
      }),
    );

    await prisma.$transaction(updates);

    roomId = room.id;
    redirectMemberToken = member?.profileId
      ? null
      : (member?.memberToken ?? null);

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: room.id,
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
    intent: getString(formData, "intent") || "leave_seat",
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
  let redirectToTool = result.data.intent === "exit_room";
  let oldPrivateToken: string | null = null;
  let newPrivateToken: string | null = null;

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
                revision: true,
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
                revision: true,
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
            roomId: result.data.roomId ?? "",
            ...(result.data.memberToken || profile
              ? {
                  OR: [
                    ...(result.data.memberToken
                      ? [{ memberToken: result.data.memberToken }]
                      : []),
                    ...(profile ? [{ profileId: profile.id }] : []),
                  ],
                }
              : { memberToken: "" }),
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
                revision: true,
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

    if (
      !room ||
      room.kind !== "WEREWOLF" ||
      (!targetSeat && result.data.intent !== "exit_room")
    ) {
      return { formError: t.leaveFailed };
    }

    if (seat && !isActiveWerewolfSeatOccupant(seat)) {
      return { formError: t.leaveFailed };
    }

    if (member?.profileId && profile?.id !== member.profileId) {
      return { formError: t.leaveFailed };
    }

    if (targetSeat?.profileId && profile?.id !== targetSeat.profileId) {
      return { formError: t.leaveFailed };
    }

    const now = new Date();
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (
      room.status === "IN_PROGRESS" &&
      targetSeat &&
      isWerewolfJudgeSeat(targetSeat.seatNumber, variant)
    ) {
      return { formError: t.leaveFailed };
    }

    const shouldReleaseSeat = room.status !== "IN_PROGRESS";
    const shouldLeaveRoom =
      result.data.intent === "exit_room" || room.status === "IN_PROGRESS";
    redirectToTool = shouldLeaveRoom;
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.gameToolRoom.update({
        where: {
          id: room.id,
          revision: room.revision,
          status: room.status,
        },
        data: {
          revision: { increment: 1 },
        },
      }),
    ];

    if (targetSeat) {
      oldPrivateToken = targetSeat.privateToken;
      newPrivateToken = createGameToolPrivateToken();
      updates.push(
        shouldReleaseSeat
          ? prisma.gameToolSeat.update({
              where: { id: targetSeat.id },
              data: {
                displayName: getWerewolfSeatName({
                  locale: room.locale,
                  seatNumber: targetSeat.seatNumber,
                  variant,
                }),
                guestName: null,
                leftAt: now,
                privateToken: newPrivateToken,
                profileId: null,
                readyAt: null,
              },
            })
          : prisma.gameToolSeat.update({
              where: { id: targetSeat.id },
              data: {
                guestName: targetSeat.guestName ?? targetSeat.displayName,
                leftAt: now,
                privateToken: newPrivateToken,
                readyAt: null,
              },
            }),
      );
    }

    if (member) {
      updates.push(
        prisma.gameToolRoomMember.update({
          where: { id: member.id },
          data: {
            lastSeenAt: now,
            leftAt: shouldLeaveRoom ? now : null,
            readyAt: null,
            seatedSeatId: null,
          },
        }),
      );
    }

    updates.push(
      prisma.gameToolEvent.create({
        data: {
          actorId: member?.profileId ?? targetSeat?.profileId ?? null,
          payload: {
            seatNumber: targetSeat?.seatNumber ?? null,
          },
          roomId: room.id,
          type: "werewolf_seat_left",
        },
      }),
    );

    await prisma.$transaction(updates);

    roomId = room.id;
    redirectMemberToken =
      shouldReleaseSeat && !shouldLeaveRoom && !member?.profileId
        ? (member?.memberToken ?? null)
        : null;

    await revalidateWerewolfRoom({
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
    console.error("Failed to leave Werewolf seat", error);

    return { formError: t.leaveFailed };
  }

  if (returnInline) {
    return {
      formNotice: result.data.intent === "exit_room" ? "exited" : "left",
    };
  }

  redirect(
    redirectToTool
      ? withLocale(result.data.locale, werewolfToolPath)
      : getRoomHref({
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

  let redirectMemberToken: string | null = null;
  let redirectRoomId: string | null = null;

  try {
    const judgeSeat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        roomMember: {
          select: {
            leftAt: true,
            memberToken: true,
            profileId: true,
          },
        },
        room: {
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
        },
      },
    });

    if (!judgeSeat || judgeSeat.room.kind !== "WEREWOLF") {
      return { formError: t.startFailed };
    }

    const room = judgeSeat.room;
    redirectRoomId = room.id;
    redirectMemberToken =
      !judgeSeat.profileId &&
      !judgeSeat.roomMember?.profileId &&
      !judgeSeat.roomMember?.leftAt
        ? (judgeSeat.roomMember?.memberToken ?? null)
        : null;
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (!isActiveWerewolfJudgeSeat(judgeSeat, variant)) {
      return { formError: t.notJudge };
    }

    if (room.status !== "LOBBY" && room.status !== "FINISHED") {
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

    const currentState = normalizeWerewolfRoomState(room.state);
    const isNextRound = room.status === "FINISHED";
    const roundNumber = isNextRound
      ? currentState.roundNumber + 1
      : currentState.roundNumber;
    const now = new Date();
    const roleDeck = shuffleRoles(variant.roles);
    const roleAssignments = playerSeats.map((seat, index) => {
      const roleKey = roleDeck[index];

      if (!roleKey) {
        throw new Error("Missing Werewolf role assignment");
      }

      return {
        data: {
          privatePayload: createWerewolfPrivatePayload({
            locale: room.locale,
            roleKey,
            variant,
          }),
          roleAlignment: werewolfRoleAlignments[roleKey],
          roleKey,
        },
        seatId: seat.id,
      };
    });

    const didStart = await prisma.$transaction(async (tx) => {
      const updatedRoom = await tx.gameToolRoom.updateMany({
        where: {
          id: room.id,
          revision: room.revision,
          status: room.status,
        },
        data: {
          finishedAt: null,
          revision: { increment: 1 },
          startedAt: now,
          state: {
            ...currentState,
            ...buildStartedWerewolfRoomState(now, roundNumber),
          },
          status: "IN_PROGRESS",
        },
      });

      if (updatedRoom.count !== 1) {
        return false;
      }

      await Promise.all(
        roleAssignments.map((assignment) =>
          tx.gameToolSeat.update({
            where: { id: assignment.seatId },
            data: assignment.data,
          }),
        ),
      );
      await tx.gameToolSeat.update({
        where: { id: judgeSeat.id },
        data: {
          privatePayload: Prisma.JsonNull,
          roleAlignment: null,
          roleKey: null,
        },
      });
      await tx.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            playerSeatCount: variant.playerSeatCount,
            roundNumber,
            startedFromFinishedRoom: isNextRound,
            totalSeats: variant.totalSeats,
            variantKey: variant.key,
          },
          roomId: room.id,
          type: "werewolf_room_started",
        },
      });

      return true;
    });

    if (!didStart) {
      return { formError: t.startFailed };
    }

    room.seats.forEach((seat) =>
      revalidateWerewolfSeatPath(result.data.locale, seat.privateToken),
    );
    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
  } catch (error) {
    console.error("Failed to start Werewolf room", error);

    return { formError: t.startFailed };
  }

  if (!redirectRoomId) {
    return { formError: t.startFailed };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: redirectMemberToken,
      roomId: redirectRoomId,
    }),
  );
}

export async function updateWerewolfPlayerLifeAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
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

  let redirectRoomId: string | null = null;

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
                leftAt: true,
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
      return { formError: t.statusFailed };
    }

    const room = judgeSeat.room;
    redirectRoomId = room.id;
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (!isActiveWerewolfJudgeSeat(judgeSeat, variant)) {
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

    const canManageTarget =
      targetSeat &&
      isWerewolfPlayerSeat(targetSeat.seatNumber, variant) &&
      (isActiveWerewolfPlayerSeat(targetSeat, variant) ||
        Boolean(targetSeat.roleKey));

    if (!canManageTarget) {
      return { formError: t.statusFailed };
    }

    const currentState = normalizeWerewolfRoomState(room.state);
    const deadSeatSet = new Set(currentState.deadSeatNumbers);

    if (
      result.data.operation === "reveal_idiot" &&
      targetSeat.roleKey !== "idiot"
    ) {
      return { formError: t.statusFailed };
    }

    if (result.data.operation === "mark_dead") {
      deadSeatSet.add(targetSeat.seatNumber);

      if (currentState.flow.loverSeatNumbers.includes(targetSeat.seatNumber)) {
        currentState.flow.loverSeatNumbers.forEach((loverSeatNumber) =>
          deadSeatSet.add(loverSeatNumber),
        );
      }
    } else if (result.data.operation === "revive") {
      deadSeatSet.delete(targetSeat.seatNumber);
    }

    const deadSeatNumbers = Array.from(deadSeatSet).sort(
      (first, second) => first - second,
    );
    const idiotRevealedSeatNumbers =
      result.data.operation === "reveal_idiot"
        ? Array.from(
            new Set([
              ...currentState.flow.idiotRevealedSeatNumbers,
              targetSeat.seatNumber,
            ]),
          ).sort((first, second) => first - second)
        : currentState.flow.idiotRevealedSeatNumbers;
    const shouldRecalculateFactionAlert =
      result.data.operation === "mark_dead" ||
      result.data.operation === "revive";
    const factionAlertResult = shouldRecalculateFactionAlert
      ? getWerewolfFactionAlert({
          cupidSeatNumber: currentState.flow.cupidSeatNumber,
          cupidSharedAlignment: currentState.flow.cupidSharedAlignment,
          deadSeatNumbers,
          seats: room.seats,
          thirdPartySeatNumbers: currentState.flow.thirdPartySeatNumbers,
        })
      : null;
    const factionAlert = factionAlertResult
      ? {
          ...factionAlertResult,
          id: randomUUID(),
        }
      : shouldRecalculateFactionAlert
        ? null
        : currentState.flow.factionAlert;

    const didUpdate = await prisma.$transaction(async (tx) => {
      const update = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision },
        data: {
          revision: { increment: 1 },
          state: {
            ...currentState,
            deadSeatNumbers,
            flow: {
              ...currentState.flow,
              factionAlert,
              idiotRevealedSeatNumbers,
            },
          },
        },
      });

      if (update.count !== 1) {
        return false;
      }

      await tx.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            displayName: targetSeat.displayName,
            linkedSeatNumbers:
              result.data.operation === "mark_dead" &&
              currentState.flow.loverSeatNumbers.includes(targetSeat.seatNumber)
                ? currentState.flow.loverSeatNumbers
                : [],
            operation: result.data.operation,
            seatNumber: targetSeat.seatNumber,
          },
          roomId: room.id,
          type:
            result.data.operation === "mark_dead"
              ? "werewolf_player_marked_dead"
              : result.data.operation === "reveal_idiot"
                ? "werewolf_idiot_revealed"
                : "werewolf_player_revived",
        },
      });

      return true;
    });

    if (!didUpdate) {
      return { formError: t.statusFailed };
    }

    await revalidateWerewolfRoom({
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

  if (!redirectRoomId) {
    return { formError: t.statusFailed };
  }

  if (returnInline) {
    return {
      formNotice: `${result.data.operation}:${result.data.seatNumber}`,
    };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: result.data.memberToken,
      roomId: redirectRoomId,
    }),
  );
}

export async function updateWerewolfSheriffAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
    operation: getString(formData, "operation"),
    privateToken: getString(formData, "privateToken"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = updateWerewolfSheriffSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  let redirectRoomId: string | null = null;

  try {
    const judgeSeat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                guestName: true,
                id: true,
                leftAt: true,
                privateToken: true,
                profileId: true,
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
    redirectRoomId = room.id;
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (!isActiveWerewolfJudgeSeat(judgeSeat, variant)) {
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

    if (!targetSeat || !isActiveWerewolfPlayerSeat(targetSeat, variant)) {
      return { formError: t.statusFailed };
    }

    const currentState = normalizeWerewolfRoomState(room.state);

    if (
      result.data.operation === "set" &&
      currentState.deadSeatNumbers.includes(targetSeat.seatNumber)
    ) {
      return { formError: t.statusFailed };
    }

    const sheriffSeatNumber =
      result.data.operation === "set" ? targetSeat.seatNumber : null;

    const didUpdate = await prisma.$transaction(async (tx) => {
      const update = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision },
        data: {
          revision: { increment: 1 },
          state: {
            ...currentState,
            sheriffSeatNumber,
          },
        },
      });

      if (update.count !== 1) {
        return false;
      }

      await tx.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: {
            operation: result.data.operation,
            seatNumber: targetSeat.seatNumber,
          },
          roomId: room.id,
          type:
            result.data.operation === "set"
              ? "werewolf_sheriff_assigned"
              : "werewolf_sheriff_cleared",
        },
      });

      return true;
    });

    if (!didUpdate) {
      return { formError: t.statusFailed };
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
    revalidateWerewolfSeatPath(result.data.locale, judgeSeat.privateToken);
    revalidateWerewolfSeatPath(result.data.locale, targetSeat.privateToken);
  } catch (error) {
    console.error("Failed to update Werewolf sheriff", error);

    return { formError: t.statusFailed };
  }

  if (!redirectRoomId) {
    return { formError: t.statusFailed };
  }

  if (returnInline) {
    return {
      formNotice: `${result.data.operation}:${result.data.seatNumber}`,
    };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: result.data.memberToken,
      roomId: redirectRoomId,
    }),
  );
}

function getWerewolfFlowActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      alreadySubmitted: "Cette action est déjà confirmée.",
      invalidAction: "Cette action n'est pas disponible maintenant.",
      invalidTarget: "Choisissez une cible valide.",
      saved: "Action enregistrée.",
      updateFailed: "Le déroulement n'a pas pu être mis à jour.",
    };
  }

  if (locale === "en") {
    return {
      alreadySubmitted: "This action has already been confirmed.",
      invalidAction: "That action is not available now.",
      invalidTarget: "Choose a valid target.",
      saved: "Action recorded.",
      updateFailed: "Could not update the game flow.",
    };
  }

  return {
    alreadySubmitted: "本轮操作已经确认，不能重复修改。",
    invalidAction: "当前阶段不能进行这个操作。",
    invalidTarget: "请选择有效目标。",
    saved: "操作已记录。",
    updateFailed: "局内流程更新失败，请重试。",
  };
}

function getNextWerewolfFlowAfterVote({
  flow,
  leaders,
}: {
  flow: WerewolfFlowState;
  leaders: number[];
}) {
  const isSheriffVote =
    flow.stage === "SHERIFF_VOTE" || flow.stage === "SHERIFF_RUNOFF_VOTE";
  const isSecondVote =
    flow.stage === "SHERIFF_RUNOFF_VOTE" || flow.stage === "EXILE_RUNOFF_VOTE";

  if (leaders.length > 1 && !isSecondVote) {
    return {
      ...flow,
      runoffSeatNumbers: leaders,
      sessionIndex: flow.sessionIndex + 1,
      stage: isSheriffVote
        ? ("SHERIFF_RUNOFF_SPEECH" as const)
        : ("EXILE_RUNOFF_SPEECH" as const),
      suggestedSeatNumber: null,
      voteRound: 2 as const,
    };
  }

  if (isSheriffVote) {
    return {
      ...flow,
      runoffSeatNumbers: [],
      sessionIndex: flow.sessionIndex + 1,
      sheriffElectionCompleted: true,
      stage: "SHERIFF_RESULT" as const,
      suggestedSeatNumber: leaders.length === 1 ? leaders[0]! : null,
      voteRound: 1 as const,
    };
  }

  if (isSecondVote && leaders.length !== 1) {
    return {
      ...flow,
      cueIndex: 0,
      dayNumber: flow.dayNumber + 1,
      runoffSeatNumbers: [],
      sessionIndex: flow.sessionIndex + 1,
      stage: "NIGHT" as const,
      suggestedSeatNumber: null,
      voteRound: 1 as const,
    };
  }

  return {
    ...flow,
    runoffSeatNumbers: [],
    sessionIndex: flow.sessionIndex + 1,
    stage: "EXILE_RESULT" as const,
    suggestedSeatNumber: leaders.length === 1 ? leaders[0]! : null,
    voteRound: 1 as const,
  };
}

export async function updateWerewolfFlowAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    operation: getString(formData, "operation"),
    privateToken: getString(formData, "privateToken"),
  };
  const result = updateWerewolfFlowSchema.safeParse(rawInput);
  const t = getWerewolfFlowActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.updateFailed };
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
                id: true,
                privateToken: true,
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
      return { formError: t.updateFailed };
    }

    const room = judgeSeat.room;
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (
      room.status !== "IN_PROGRESS" ||
      !isActiveWerewolfJudgeSeat(judgeSeat, variant)
    ) {
      return { formError: t.invalidAction };
    }

    const currentState = normalizeWerewolfRoomState(room.state);
    const currentFlow = currentState.flow;
    let nextFlow = currentFlow;
    let eventPayload: Prisma.InputJsonValue = {
      operation: result.data.operation,
      stage: currentFlow.stage,
    };
    let eventType = "werewolf_flow_advanced";

    if (result.data.operation === "dismiss_alert") {
      nextFlow = { ...currentFlow, factionAlert: null };
      eventType = "werewolf_faction_alert_dismissed";
    } else if (result.data.operation === "previous_cue") {
      if (currentFlow.stage !== "NIGHT" || currentFlow.cueIndex <= 0) {
        return { formError: t.invalidAction };
      }

      nextFlow = { ...currentFlow, cueIndex: currentFlow.cueIndex - 1 };
    } else if (result.data.operation === "resolve_vote") {
      const isSheriffVote =
        currentFlow.stage === "SHERIFF_VOTE" ||
        currentFlow.stage === "SHERIFF_RUNOFF_VOTE";
      const isExileVote =
        currentFlow.stage === "EXILE_VOTE" ||
        currentFlow.stage === "EXILE_RUNOFF_VOTE";

      if (!isSheriffVote && !isExileVote) {
        return { formError: t.invalidAction };
      }

      const kind = isSheriffVote
        ? "WEREWOLF_SHERIFF_VOTE"
        : "WEREWOLF_EXILE_VOTE";
      const submissions = await prisma.gameToolSubmission.findMany({
        where: {
          kind,
          roomId: room.id,
          roundIndex: currentFlow.sessionIndex,
        },
        select: { seat: { select: { seatNumber: true } }, value: true },
      });
      const votes = submissions.flatMap((submission) => {
        const voterSeatNumber = submission.seat?.seatNumber;
        const value = Number(submission.value);

        return voterSeatNumber
          ? [
              {
                targetSeatNumber:
                  Number.isInteger(value) && value > 0 ? value : null,
                voterSeatNumber,
              },
            ]
          : [];
      });
      const voteResult = tallyWerewolfVotes({
        sheriffSeatNumber: isSheriffVote
          ? null
          : (currentState.sheriffSeatNumber ?? null),
        votes,
      });

      nextFlow = getNextWerewolfFlowAfterVote({
        flow: currentFlow,
        leaders: voteResult.leaders,
      });
      eventPayload = {
        leaders: voteResult.leaders,
        stage: currentFlow.stage,
        totals: voteResult.totals,
        voteRound: currentFlow.voteRound,
      };
      eventType = isSheriffVote
        ? "werewolf_sheriff_vote_resolved"
        : "werewolf_exile_vote_resolved";
    } else {
      const roles = room.seats.map((seat) => seat.roleKey);
      const cues = getWerewolfNightCues(
        roles,
        currentFlow.dayNumber,
        room.locale,
      );

      switch (currentFlow.stage) {
        case "NIGHT":
          nextFlow =
            currentFlow.cueIndex < cues.length - 1
              ? { ...currentFlow, cueIndex: currentFlow.cueIndex + 1 }
              : {
                  ...currentFlow,
                  cueIndex: 0,
                  sessionIndex: currentFlow.sessionIndex + 1,
                  stage:
                    currentFlow.dayNumber === 1 &&
                    !currentFlow.sheriffElectionCompleted
                      ? "SHERIFF_SIGNUP"
                      : "DAY_ANNOUNCEMENT",
                };
          break;
        case "SHERIFF_SIGNUP":
          nextFlow = { ...currentFlow, stage: "SHERIFF_SPEECH" };
          break;
        case "SHERIFF_SPEECH":
          nextFlow = { ...currentFlow, stage: "SHERIFF_WITHDRAW" };
          break;
        case "SHERIFF_WITHDRAW":
          nextFlow = {
            ...currentFlow,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "SHERIFF_VOTE",
            voteRound: 1,
          };
          break;
        case "SHERIFF_RUNOFF_SPEECH":
          nextFlow = {
            ...currentFlow,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "SHERIFF_RUNOFF_VOTE",
          };
          break;
        case "SHERIFF_RESULT":
          nextFlow = {
            ...currentFlow,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "DAY_ANNOUNCEMENT",
          };
          break;
        case "DAY_ANNOUNCEMENT":
          nextFlow = { ...currentFlow, stage: "DAY_SPEECH" };
          break;
        case "DAY_SPEECH":
          nextFlow = {
            ...currentFlow,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "EXILE_VOTE",
            voteRound: 1,
          };
          break;
        case "EXILE_RUNOFF_SPEECH":
          nextFlow = {
            ...currentFlow,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "EXILE_RUNOFF_VOTE",
          };
          break;
        case "EXILE_RESULT":
          nextFlow = {
            ...currentFlow,
            cueIndex: 0,
            dayNumber: currentFlow.dayNumber + 1,
            sessionIndex: currentFlow.sessionIndex + 1,
            stage: "NIGHT",
            suggestedSeatNumber: null,
          };
          break;
        default:
          return { formError: t.invalidAction };
      }
    }

    const didUpdate = await prisma.$transaction(async (tx) => {
      const update = await tx.gameToolRoom.updateMany({
        where: { id: room.id, revision: room.revision },
        data: {
          revision: { increment: 1 },
          state: { ...currentState, flow: nextFlow },
        },
      });

      if (update.count !== 1) {
        return false;
      }

      await tx.gameToolEvent.create({
        data: {
          actorId: judgeSeat.profileId,
          payload: eventPayload,
          roomId: room.id,
          type: eventType,
        },
      });

      return true;
    });

    if (!didUpdate) {
      return { formError: t.updateFailed };
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: room.id,
      toolPath: werewolfToolPath,
    });
    room.seats.forEach((seat) =>
      revalidateWerewolfSeatPath(result.data.locale, seat.privateToken),
    );

    return { formNotice: `${eventType}:${nextFlow.sessionIndex}` };
  } catch (error) {
    console.error("Failed to update Werewolf flow", error);
    return { formError: t.updateFailed };
  }
}

export async function updateWerewolfCandidacyAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    operation: getString(formData, "operation"),
    privateToken: getString(formData, "privateToken"),
  };
  const result = updateWerewolfCandidacySchema.safeParse(rawInput);
  const t = getWerewolfFlowActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.updateFailed };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: { room: true },
    });

    if (!seat || seat.room.kind !== "WEREWOLF") {
      return { formError: t.updateFailed };
    }

    const isJoin = result.data.operation === "join";
    const variant = getWerewolfVariantFromRoomConfig(
      seat.room.config,
      seat.room.locale,
    );
    const mutationResult = await prisma.$transaction(async (tx) => {
      const lockedRoom = await lockWerewolfRoomForMutation(tx, seat.roomId);
      const actorSeat = await tx.gameToolSeat.findUnique({
        where: { id: seat.id },
        select: {
          guestName: true,
          leftAt: true,
          profileId: true,
          seatNumber: true,
        },
      });

      if (
        !lockedRoom ||
        lockedRoom.status !== "IN_PROGRESS" ||
        !actorSeat ||
        !isActiveWerewolfPlayerSeat(actorSeat, variant)
      ) {
        return "invalid" as const;
      }

      const state = normalizeWerewolfRoomState(lockedRoom.state);

      if (
        state.deadSeatNumbers.includes(actorSeat.seatNumber) ||
        (isJoin && state.flow.stage !== "SHERIFF_SIGNUP") ||
        (!isJoin && state.flow.stage !== "SHERIFF_WITHDRAW") ||
        (!isJoin &&
          !state.flow.candidateSeatNumbers.includes(actorSeat.seatNumber))
      ) {
        return "invalid" as const;
      }

      const nextFlow = isJoin
        ? {
            ...state.flow,
            candidateSeatNumbers: Array.from(
              new Set([
                ...state.flow.candidateSeatNumbers,
                actorSeat.seatNumber,
              ]),
            ).sort((first, second) => first - second),
          }
        : {
            ...state.flow,
            withdrawnSeatNumbers: Array.from(
              new Set([
                ...state.flow.withdrawnSeatNumbers,
                actorSeat.seatNumber,
              ]),
            ).sort((first, second) => first - second),
          };

      await tx.gameToolRoom.update({
        where: { id: seat.roomId },
        data: {
          revision: { increment: 1 },
          state: { ...state, flow: nextFlow },
        },
      });

      await tx.gameToolEvent.create({
        data: {
          actorId: actorSeat.profileId,
          payload: {
            operation: result.data.operation,
            seatNumber: actorSeat.seatNumber,
          },
          roomId: seat.roomId,
          type: isJoin
            ? "werewolf_sheriff_candidate_joined"
            : "werewolf_sheriff_candidate_withdrew",
        },
      });

      return "updated" as const;
    });

    if (mutationResult !== "updated") {
      return { formError: t.invalidAction };
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: seat.roomId,
      toolPath: werewolfToolPath,
    });
    revalidateWerewolfSeatPath(result.data.locale, seat.privateToken);
    return { formNotice: isJoin ? "candidate:joined" : "candidate:withdrew" };
  } catch (error) {
    console.error("Failed to update Werewolf candidacy", error);
    return { formError: t.updateFailed };
  }
}

export async function submitWerewolfVoteAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    targetSeatNumber: getString(formData, "targetSeatNumber"),
  };
  const result = submitWerewolfVoteSchema.safeParse(rawInput);
  const t = getWerewolfFlowActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.invalidTarget };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: { select: { id: true, seatNumber: true } },
          },
        },
      },
    });

    if (!seat || seat.room.kind !== "WEREWOLF") {
      return { formError: t.updateFailed };
    }

    const targetSeatNumber =
      result.data.targetSeatNumber === 0 ? null : result.data.targetSeatNumber;
    const variant = getWerewolfVariantFromRoomConfig(
      seat.room.config,
      seat.room.locale,
    );
    const mutationResult = await prisma.$transaction(async (tx) => {
      const lockedRoom = await lockWerewolfRoomForMutation(tx, seat.roomId);

      if (!lockedRoom || lockedRoom.status !== "IN_PROGRESS") {
        return "invalid" as const;
      }

      const roomSeats = await tx.gameToolSeat.findMany({
        where: { roomId: seat.roomId },
        select: {
          guestName: true,
          id: true,
          leftAt: true,
          profileId: true,
          seatNumber: true,
        },
      });
      const actorSeat = roomSeats.find((roomSeat) => roomSeat.id === seat.id);

      if (!actorSeat || !isActiveWerewolfPlayerSeat(actorSeat, variant)) {
        return "invalid" as const;
      }

      const state = normalizeWerewolfRoomState(lockedRoom.state);
      const flow = state.flow;
      const isSheriffVote =
        flow.stage === "SHERIFF_VOTE" || flow.stage === "SHERIFF_RUNOFF_VOTE";
      const isExileVote =
        flow.stage === "EXILE_VOTE" || flow.stage === "EXILE_RUNOFF_VOTE";
      const isAlive = !state.deadSeatNumbers.includes(actorSeat.seatNumber);
      const activePlayerSeatNumbers = roomSeats
        .filter((roomSeat) => isActiveWerewolfPlayerSeat(roomSeat, variant))
        .map((roomSeat) => roomSeat.seatNumber);
      const activeCandidates = flow.candidateSeatNumbers.filter(
        (candidate) =>
          activePlayerSeatNumbers.includes(candidate) &&
          !flow.withdrawnSeatNumbers.includes(candidate),
      );
      const targetPool =
        flow.stage === "SHERIFF_RUNOFF_VOTE" ||
        flow.stage === "EXILE_RUNOFF_VOTE"
          ? flow.runoffSeatNumbers
          : isSheriffVote
            ? activeCandidates
            : activePlayerSeatNumbers.filter(
                (seatNumber) => !state.deadSeatNumbers.includes(seatNumber),
              );
      const canVote = isSheriffVote
        ? !flow.candidateSeatNumbers.includes(actorSeat.seatNumber)
        : isExileVote && isAlive;
      const targetIsValid =
        targetSeatNumber === null
          ? isExileVote
          : activePlayerSeatNumbers.includes(targetSeatNumber) &&
            targetPool.includes(targetSeatNumber);

      if (!isAlive || !canVote || !targetIsValid) {
        return "invalid" as const;
      }

      const kind = isSheriffVote
        ? ("WEREWOLF_SHERIFF_VOTE" as const)
        : ("WEREWOLF_EXILE_VOTE" as const);

      await tx.gameToolSubmission.create({
        data: {
          kind,
          profileId: actorSeat.profileId,
          roomId: seat.roomId,
          roundIndex: flow.sessionIndex,
          seatId: actorSeat.id,
          value:
            targetSeatNumber === null ? "ABSTAIN" : String(targetSeatNumber),
        },
      });
      await tx.gameToolRoom.update({
        where: { id: seat.roomId },
        data: { revision: { increment: 1 } },
      });
      await tx.gameToolEvent.create({
        data: {
          actorId: actorSeat.profileId,
          payload: {
            stage: flow.stage,
            targetSeatNumber,
            voterSeatNumber: actorSeat.seatNumber,
          },
          roomId: seat.roomId,
          type: isSheriffVote
            ? "werewolf_sheriff_vote_submitted"
            : "werewolf_exile_vote_submitted",
        },
      });

      return "submitted" as const;
    });

    if (mutationResult !== "submitted") {
      return { formError: t.invalidAction };
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: seat.roomId,
      toolPath: werewolfToolPath,
    });
    revalidateWerewolfSeatPath(result.data.locale, seat.privateToken);
    return { formNotice: "vote:submitted" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { formError: t.alreadySubmitted };
    }

    console.error("Failed to submit Werewolf vote", error);
    return { formError: t.updateFailed };
  }
}

export async function submitWerewolfNightActionAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const rawInput = {
    actionKind: getString(formData, "actionKind"),
    locale: getString(formData, "locale") || "zh-CN",
    privateToken: getString(formData, "privateToken"),
    secondaryTargetSeatNumber:
      getOptionalString(formData, "secondaryTargetSeatNumber") ?? undefined,
    targetSeatNumber:
      getOptionalString(formData, "targetSeatNumber") ?? undefined,
  };
  const result = submitWerewolfNightActionSchema.safeParse(rawInput);
  const t = getWerewolfFlowActionCopy(rawInput.locale);

  if (!result.success) {
    return { formError: t.invalidTarget };
  }

  try {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: result.data.privateToken },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                id: true,
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

    if (!seat || seat.room.kind !== "WEREWOLF") {
      return { formError: t.updateFailed };
    }

    const actionKind = result.data.actionKind;
    const targetSeatNumber = result.data.targetSeatNumber ?? null;
    const secondaryTargetSeatNumber =
      result.data.secondaryTargetSeatNumber ?? null;
    const variant = getWerewolfVariantFromRoomConfig(
      seat.room.config,
      seat.room.locale,
    );
    const mutationResult = await prisma.$transaction(async (tx) => {
      const lockedRoom = await lockWerewolfRoomForMutation(tx, seat.roomId);

      if (!lockedRoom || lockedRoom.status !== "IN_PROGRESS") {
        return { status: "invalidAction" as const };
      }

      const roomSeats = await tx.gameToolSeat.findMany({
        where: { roomId: seat.roomId },
        orderBy: { seatNumber: "asc" },
        select: {
          guestName: true,
          id: true,
          leftAt: true,
          profileId: true,
          roleAlignment: true,
          roleKey: true,
          seatNumber: true,
        },
      });
      const actorSeat = roomSeats.find((roomSeat) => roomSeat.id === seat.id);

      if (!actorSeat || !isActiveWerewolfPlayerSeat(actorSeat, variant)) {
        return { status: "invalidAction" as const };
      }

      const state = normalizeWerewolfRoomState(lockedRoom.state);
      const flow = state.flow;
      const cues = getWerewolfNightCues(
        roomSeats.map((roomSeat) => roomSeat.roleKey),
        flow.dayNumber,
        seat.room.locale,
      );
      const activeCue = cues[flow.cueIndex];
      const isWitchAction = actionKind.startsWith("WITCH_");
      const cueMatches =
        flow.stage === "NIGHT" &&
        activeCue &&
        (activeCue.actionKind === actionKind ||
          (activeCue.actionKind === "WITCH" && isWitchAction));
      const isActor =
        (actionKind === "CUPID" && actorSeat.roleKey === "cupid") ||
        (actionKind === "GUARD" && actorSeat.roleKey === "guard") ||
        (actionKind === "LOVERS" &&
          flow.loverSeatNumbers.includes(actorSeat.seatNumber)) ||
        (actionKind === "SEER" && actorSeat.roleKey === "seer") ||
        (isWitchAction && actorSeat.roleKey === "witch") ||
        (actionKind === "WOLF_KILL" && actorSeat.roleAlignment === "werewolf");

      if (
        state.deadSeatNumbers.includes(actorSeat.seatNumber) ||
        !cueMatches ||
        !isActor
      ) {
        return { status: "invalidAction" as const };
      }

      const targetSeat = roomSeats.find(
        (roomSeat) =>
          roomSeat.seatNumber === targetSeatNumber &&
          isActiveWerewolfPlayerSeat(roomSeat, variant),
      );
      const secondaryTargetSeat = roomSeats.find(
        (roomSeat) =>
          roomSeat.seatNumber === secondaryTargetSeatNumber &&
          isActiveWerewolfPlayerSeat(roomSeat, variant),
      );
      const needsTarget = !["LOVERS", "WITCH_ANTIDOTE", "WITCH_PASS"].includes(
        actionKind,
      );

      if (
        (needsTarget && (!targetSeat || targetSeatNumber === null)) ||
        (targetSeatNumber !== null && !targetSeat) ||
        (secondaryTargetSeatNumber !== null && !secondaryTargetSeat) ||
        (targetSeatNumber !== null &&
          state.deadSeatNumbers.includes(targetSeatNumber)) ||
        (secondaryTargetSeatNumber !== null &&
          state.deadSeatNumbers.includes(secondaryTargetSeatNumber)) ||
        (actionKind === "CUPID" &&
          (!secondaryTargetSeat ||
            secondaryTargetSeatNumber === targetSeatNumber ||
            secondaryTargetSeatNumber === null)) ||
        (actionKind === "GUARD" &&
          flow.lastGuardedSeatNumber === targetSeatNumber) ||
        (actionKind === "WITCH_POISON" && flow.witchPoisonUsed)
      ) {
        return { status: "invalidTarget" as const };
      }

      const [existing, wolfKillSubmission] = await Promise.all([
        tx.gameToolSubmission.findFirst({
          where: {
            actionKey: getWerewolfNightActionSubmissionKey(actionKind),
            kind: "WEREWOLF_NIGHT_ACTION",
            roomId: seat.roomId,
            roundIndex: flow.sessionIndex,
            ...(actionKind === "WOLF_KILL"
              ? { value: { startsWith: "WOLF_KILL:" } }
              : { seatId: actorSeat.id }),
          },
          select: { id: true },
        }),
        actionKind === "WITCH_ANTIDOTE"
          ? tx.gameToolSubmission.findFirst({
              where: {
                kind: "WEREWOLF_NIGHT_ACTION",
                roomId: seat.roomId,
                roundIndex: flow.sessionIndex,
                value: { startsWith: "WOLF_KILL:" },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (
        actionKind === "WITCH_ANTIDOTE" &&
        !canUseWerewolfAntidote({
          hasWolfKill: Boolean(wolfKillSubmission),
          isAntidoteUsed: flow.witchAntidoteUsed,
        })
      ) {
        return { status: "invalidTarget" as const };
      }

      if (existing) {
        return { status: "alreadySubmitted" as const };
      }

      let nextFlow = flow;
      let value = `${actionKind}:${targetSeatNumber ?? "NONE"}`;
      let notice = t.saved;
      let seerResult: ReturnType<typeof getWerewolfSeerResult> | null = null;

      if (actionKind === "GUARD") {
        nextFlow = { ...flow, lastGuardedSeatNumber: targetSeatNumber };
      } else if (actionKind === "WITCH_ANTIDOTE") {
        nextFlow = { ...flow, witchAntidoteUsed: true };
      } else if (actionKind === "WITCH_POISON") {
        nextFlow = { ...flow, witchPoisonUsed: true };
      } else if (actionKind === "CUPID" && targetSeat && secondaryTargetSeat) {
        const alignments = new Set([
          targetSeat.roleAlignment,
          secondaryTargetSeat.roleAlignment,
        ]);
        const isMixed = alignments.size > 1;
        const lovers = [
          targetSeat.seatNumber,
          secondaryTargetSeat.seatNumber,
        ].sort((first, second) => first - second);
        nextFlow = {
          ...flow,
          cupidSeatNumber: actorSeat.seatNumber,
          cupidSharedAlignment: isMixed
            ? null
            : targetSeat.roleAlignment === "werewolf"
              ? "werewolf"
              : "good",
          loverSeatNumbers: lovers,
          thirdPartySeatNumbers: isMixed
            ? Array.from(new Set([actorSeat.seatNumber, ...lovers])).sort(
                (first, second) => first - second,
              )
            : [],
        };
        value = `CUPID:${lovers.join(",")}`;
      } else if (actionKind === "SEER" && targetSeat) {
        seerResult = getWerewolfSeerResult({
          roleAlignment: targetSeat.roleAlignment,
          seatNumber: targetSeat.seatNumber,
          thirdPartySeatNumbers: flow.thirdPartySeatNumbers,
        });
        notice = `SEER_RESULT:${seerResult}:${targetSeat.seatNumber}`;
      }

      await tx.gameToolSubmission.create({
        data: {
          actionKey: getWerewolfNightActionSubmissionKey(actionKind),
          kind: "WEREWOLF_NIGHT_ACTION",
          metadata: {
            actionKind,
            seerResult,
            secondaryTargetSeatNumber,
            targetSeatNumber,
          },
          profileId: actorSeat.profileId,
          roomId: seat.roomId,
          roundIndex: flow.sessionIndex,
          seatId: actorSeat.id,
          value,
        },
      });
      await tx.gameToolRoom.update({
        where: { id: seat.roomId },
        data: {
          revision: { increment: 1 },
          state: { ...state, flow: nextFlow },
        },
      });
      await tx.gameToolEvent.create({
        data: {
          actorId: actorSeat.profileId,
          payload: { private: true },
          roomId: seat.roomId,
          type: "werewolf_night_action_submitted",
        },
      });

      return { notice, status: "submitted" as const };
    });

    if (mutationResult.status === "invalidAction") {
      return { formError: t.invalidAction };
    }

    if (mutationResult.status === "invalidTarget") {
      return { formError: t.invalidTarget };
    }

    if (mutationResult.status === "alreadySubmitted") {
      return { formError: t.alreadySubmitted };
    }

    await revalidateWerewolfRoom({
      locale: result.data.locale,
      roomId: seat.roomId,
      toolPath: werewolfToolPath,
    });
    seat.room.seats.forEach((roomSeat) =>
      revalidateWerewolfSeatPath(result.data.locale, roomSeat.privateToken),
    );
    return { formNotice: mutationResult.notice };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { formError: t.alreadySubmitted };
    }

    console.error("Failed to submit Werewolf night action", error);
    return { formError: t.updateFailed };
  }
}

export async function finishWerewolfRoomAction(
  _previousState: WerewolfRoomActionState,
  formData: FormData,
): Promise<WerewolfRoomActionState> {
  const returnInline = shouldReturnInline(formData);
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    memberToken: getOptionalString(formData, "memberToken"),
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

  let redirectRoomId: string | null = null;

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
                leftAt: true,
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
    redirectRoomId = room.id;
    const variant = getWerewolfVariantFromRoomConfig(room.config, room.locale);

    if (!isActiveWerewolfJudgeSeat(judgeSeat, variant)) {
      return { formError: t.notJudge };
    }

    if (room.status !== "IN_PROGRESS") {
      return { formError: t.notRunning };
    }

    const finishSelection = result.data.winner as WerewolfFinishSelection;
    const winner = getWerewolfWinnerFromFinishSelection(finishSelection);
    const wasTerminated = finishSelection === "TERMINATED";
    const finishedAt = new Date();
    const currentState = normalizeWerewolfRoomState(room.state);
    const variantName = getWerewolfVariantLabel(room.locale, variant);
    const departedSeats = room.seats
      .filter((seat) => seat.leftAt !== null)
      .map((seat) => ({
        id: seat.id,
        privateToken: createGameToolPrivateToken(),
        seatNumber: seat.seatNumber,
      }));
    const playerResults = winner
      ? room.seats
          .filter((seat) => isWerewolfPlayerSeat(seat.seatNumber, variant))
          .map((seat) => {
            const isThirdParty =
              currentState.flow.thirdPartySeatNumbers.includes(seat.seatNumber);
            const isCupid =
              currentState.flow.cupidSeatNumber === seat.seatNumber;
            const effectiveAlignment =
              isCupid && currentState.flow.cupidSharedAlignment
                ? currentState.flow.cupidSharedAlignment
                : seat.roleAlignment;
            const won =
              winner === "THIRD_PARTY"
                ? isThirdParty
                : !isThirdParty &&
                  ((winner === "WEREWOLF" &&
                    effectiveAlignment === "werewolf") ||
                    (winner === "GOOD" && effectiveAlignment === "good"));

            return {
              alignment: isThirdParty ? "third_party" : effectiveAlignment,
              displayName: seat.displayName,
              profileId: seat.profileId,
              result: won ? "WIN" : "LOSE",
              roleKey: seat.roleKey,
              seatNumber: seat.seatNumber,
            };
          })
      : [];
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
        where: {
          id: room.id,
          revision: room.revision,
          status: "IN_PROGRESS",
        },
        data: {
          finishedAt,
          revision: { increment: 1 },
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
            roundNumber: currentState.roundNumber,
            results: eventPlayerResults,
            terminated: wasTerminated,
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
              roomId_profileId_roundNumber: {
                profileId: record.profileId,
                roomId: room.id,
                roundNumber: currentState.roundNumber,
              },
            },
            create: {
              kind: "WEREWOLF",
              metadata: {
                displayName: record.displayName,
                roomCode: room.code,
                roundNumber: currentState.roundNumber,
                winner,
              },
              isJudge: record.isJudge,
              playedAt: finishedAt,
              profileId: record.profileId,
              result: record.result,
              roleAlignment: record.roleAlignment,
              roleKey: record.roleKey,
              roundNumber: currentState.roundNumber,
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
                roundNumber: currentState.roundNumber,
                winner,
              },
              isJudge: record.isJudge,
              playedAt: finishedAt,
              result: record.result,
              roleAlignment: record.roleAlignment,
              roleKey: record.roleKey,
              roundNumber: currentState.roundNumber,
              seatNumber: record.seatNumber,
              variantKey: variant.key,
              variantName,
            },
          }),
        ),
      );
      await Promise.all(
        departedSeats.map((seat) =>
          tx.gameToolSeat.update({
            where: { id: seat.id },
            data: {
              displayName: getWerewolfSeatName({
                locale: room.locale,
                seatNumber: seat.seatNumber,
                variant,
              }),
              guestName: null,
              privatePayload: Prisma.JsonNull,
              privateToken: seat.privateToken,
              profileId: null,
              readyAt: null,
              roleAlignment: null,
              roleKey: null,
            },
          }),
        ),
      );

      return true;
    });

    if (!didFinish) {
      return { formError: t.notRunning };
    }

    await revalidateWerewolfRoom({
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

  if (!redirectRoomId) {
    return { formError: t.finishFailed };
  }

  if (returnInline) {
    return {
      formNotice: `finished:${result.data.winner}`,
    };
  }

  redirect(
    getRoomHref({
      locale: result.data.locale,
      memberToken: result.data.memberToken,
      roomId: redirectRoomId,
    }),
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
                ...buildStartedWerewolfRoomState(
                  now,
                  normalizeWerewolfRoomState(room.state).roundNumber,
                ),
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

    await revalidateWerewolfRoom({
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
