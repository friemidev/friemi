import {
  isWerewolfRoleKey,
  type WerewolfRoleKey,
} from "@/features/game-tools/werewolfConfig";

export const werewolfFlowStages = [
  "NIGHT",
  "SHERIFF_SIGNUP",
  "SHERIFF_SPEECH",
  "SHERIFF_WITHDRAW",
  "SHERIFF_VOTE",
  "SHERIFF_RUNOFF_SPEECH",
  "SHERIFF_RUNOFF_VOTE",
  "SHERIFF_RESULT",
  "DAY_ANNOUNCEMENT",
  "DAY_SPEECH",
  "EXILE_VOTE",
  "EXILE_RUNOFF_SPEECH",
  "EXILE_RUNOFF_VOTE",
  "EXILE_RESULT",
  "FINISHED",
] as const;

export type WerewolfFlowStage = (typeof werewolfFlowStages)[number];

export type WerewolfFactionAlertKind =
  | "GODS_ELIMINATED"
  | "THIRD_PARTY_WIN"
  | "VILLAGERS_ELIMINATED"
  | "WEREWOLVES_ELIMINATED";

export type WerewolfFactionAlert = {
  id: string;
  kind: WerewolfFactionAlertKind;
  seatNumbers: number[];
};

export type WerewolfFlowState = {
  candidateSeatNumbers: number[];
  cueIndex: number;
  cupidSeatNumber: number | null;
  cupidSharedAlignment: "good" | "werewolf" | null;
  dayNumber: number;
  factionAlert: WerewolfFactionAlert | null;
  idiotRevealedSeatNumbers: number[];
  lastGuardedSeatNumber: number | null;
  loverSeatNumbers: number[];
  runoffSeatNumbers: number[];
  sessionIndex: number;
  sheriffElectionCompleted: boolean;
  stage: WerewolfFlowStage;
  suggestedSeatNumber: number | null;
  thirdPartySeatNumbers: number[];
  transitionStartedAt: string | null;
  voteRound: 1 | 2;
  witchAntidoteUsed: boolean;
  witchPoisonUsed: boolean;
  withdrawnSeatNumbers: number[];
};

export type WerewolfNightCue = {
  actionKind:
    | "CUPID"
    | "GUARD"
    | "LOVERS"
    | "NONE"
    | "SEER"
    | "WITCH"
    | "WOLF_KILL";
  key: string;
  lines: string[];
  roleKey: WerewolfRoleKey | null;
  title: string;
};

export type WerewolfVoteInput = {
  targetSeatNumber: number | null;
  voterSeatNumber: number;
};

export type WerewolfVoteResult = {
  leaders: number[];
  totals: Record<number, number>;
};

export type WerewolfFlowRecordEvent = {
  payload?: unknown;
  type: string;
};

export function localizeWerewolfFlowText(
  locale: string,
  translations: { en: string; fr: string; "zh-CN": string },
) {
  if (locale === "zh-CN") {
    return translations["zh-CN"];
  }

  return locale === "fr" ? translations.fr : translations.en;
}

export function formatWerewolfSeatLabel(seatNumber: number, locale: string) {
  return localizeWerewolfFlowText(locale, {
    "zh-CN": `${seatNumber}号`,
    en: `seat ${seatNumber}`,
    fr: `siège ${seatNumber}`,
  });
}

export function getWerewolfNightActionLabel(
  actionKind: string | null,
  locale: string,
) {
  const labels: Record<string, { en: string; fr: string; "zh-CN": string }> = {
    CUPID: {
      "zh-CN": "丘比特连情侣",
      en: "Cupid linked lovers",
      fr: "Cupidon a lié les amoureux",
    },
    GUARD: {
      "zh-CN": "守卫守护",
      en: "Guard protected",
      fr: "Le garde a protégé",
    },
    LOVERS: {
      "zh-CN": "情侣确认",
      en: "Lovers confirmed",
      fr: "Amoureux confirmés",
    },
    SEER: {
      "zh-CN": "预言家查验",
      en: "Seer inspected",
      fr: "La voyante a vérifié",
    },
    WITCH_ANTIDOTE: {
      "zh-CN": "女巫使用解药",
      en: "Witch used antidote",
      fr: "La sorcière a utilisé l'antidote",
    },
    WITCH_PASS: {
      "zh-CN": "女巫未用药",
      en: "Witch passed",
      fr: "La sorcière n'a rien utilisé",
    },
    WITCH_POISON: {
      "zh-CN": "女巫使用毒药",
      en: "Witch used poison",
      fr: "La sorcière a utilisé le poison",
    },
    WOLF_KILL: {
      "zh-CN": "狼人确认击杀",
      en: "Pack confirmed kill",
      fr: "Les loups ont confirmé leur cible",
    },
  };
  const label = actionKind ? labels[actionKind] : null;

  return label ? localizeWerewolfFlowText(locale, label) : (actionKind ?? "-");
}

export function getWerewolfFlowRecordLabel(
  event: WerewolfFlowRecordEvent,
  locale: string,
) {
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};
  const seatNumber = Number(payload.seatNumber);
  const voterSeatNumber = Number(payload.voterSeatNumber);
  const targetSeatNumber = Number(payload.targetSeatNumber);
  const voterLabel = localizeWerewolfFlowText(locale, {
    "zh-CN": formatWerewolfSeatLabel(voterSeatNumber, locale),
    en: `Seat ${voterSeatNumber}`,
    fr: `Le siège ${voterSeatNumber}`,
  });
  const targetLabel =
    Number.isInteger(targetSeatNumber) && targetSeatNumber > 0
      ? formatWerewolfSeatLabel(targetSeatNumber, locale)
      : localizeWerewolfFlowText(locale, {
          "zh-CN": "弃票",
          en: "abstained",
          fr: "s'est abstenu",
        });
  const seatLabel = localizeWerewolfFlowText(locale, {
    "zh-CN": formatWerewolfSeatLabel(seatNumber, locale),
    en: `Seat ${seatNumber}`,
    fr: `Le siège ${seatNumber}`,
  });

  if (
    event.type.endsWith("vote_submitted") &&
    Number.isInteger(voterSeatNumber)
  ) {
    if (!(Number.isInteger(targetSeatNumber) && targetSeatNumber > 0)) {
      return localizeWerewolfFlowText(locale, {
        "zh-CN": `${voterLabel} 弃票`,
        en: `${voterLabel} abstained`,
        fr: `${voterLabel} s'est abstenu`,
      });
    }

    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${voterLabel} 投给 ${targetLabel}`,
      en: `${voterLabel} voted for ${targetLabel}`,
      fr: `${voterLabel} a voté pour le ${targetLabel}`,
    });
  }

  if (event.type === "werewolf_sheriff_candidate_joined") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 上警`,
      en: `${seatLabel} entered the sheriff race`,
      fr: `${seatLabel} se présente comme capitaine`,
    });
  }

  if (event.type === "werewolf_sheriff_candidate_withdrew") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 退水`,
      en: `${seatLabel} withdrew`,
      fr: `${seatLabel} retire sa candidature`,
    });
  }

  if (event.type === "werewolf_player_marked_dead") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 被标记死亡`,
      en: `${seatLabel} was marked dead`,
      fr: `${seatLabel} a été déclaré mort`,
    });
  }

  if (event.type === "werewolf_player_revived") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 恢复存活`,
      en: `${seatLabel} was revived`,
      fr: `${seatLabel} revient en jeu`,
    });
  }

  if (event.type === "werewolf_sheriff_assigned") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 获得警徽`,
      en: `${seatLabel} became sheriff`,
      fr: `${seatLabel} reçoit l'insigne de capitaine`,
    });
  }

  if (event.type === "werewolf_sheriff_cleared") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": "警徽已移除",
      en: "Sheriff badge removed",
      fr: "L'insigne de capitaine a été retiré",
    });
  }

  if (event.type === "werewolf_idiot_revealed") {
    return localizeWerewolfFlowText(locale, {
      "zh-CN": `${seatLabel} 白痴翻牌`,
      en: `${seatLabel} revealed as the Idiot`,
      fr: `${seatLabel} révèle son rôle d'Idiot`,
    });
  }

  if (event.type.endsWith("vote_resolved")) {
    const leaders = Array.isArray(payload.leaders)
      ? payload.leaders
          .map(Number)
          .filter(Number.isInteger)
          .map((leader) => formatWerewolfSeatLabel(leader, locale))
          .join(locale === "zh-CN" ? "、" : ", ")
      : "";

    return leaders
      ? localizeWerewolfFlowText(locale, {
          "zh-CN": `投票结算：${leaders}`,
          en: `Vote resolved: ${leaders}`,
          fr: `Vote dépouillé : ${leaders}`,
        })
      : localizeWerewolfFlowText(locale, {
          "zh-CN": "投票结算：无人当选或出局",
          en: "Vote resolved: no one was selected",
          fr: "Vote dépouillé : personne n'est élu ou éliminé",
        });
  }

  return null;
}

export function getWerewolfNightActionSubmissionKey(actionKind: string) {
  return actionKind.startsWith("WITCH_") ? "WITCH" : actionKind;
}

export function shouldShowWerewolfSuggestedSeat(stage: WerewolfFlowStage) {
  return stage === "SHERIFF_RESULT" || stage === "EXILE_RESULT";
}

export function canUseWerewolfAntidote({
  hasWolfKill,
  isAntidoteUsed,
}: {
  hasWolfKill: boolean;
  isAntidoteUsed: boolean;
}) {
  return hasWolfKill && !isAntidoteUsed;
}

const godRoleKeys = new Set<WerewolfRoleKey>([
  "cupid",
  "guard",
  "hunter",
  "idiot",
  "knight",
  "lovers",
  "seer",
  "witch",
]);

function normalizeSeatNumbers(value: unknown) {
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

function optionalSeatNumber(value: unknown) {
  const seatNumber = typeof value === "number" ? value : Number(value);

  return Number.isInteger(seatNumber) && seatNumber > 0 && seatNumber <= 20
    ? seatNumber
    : null;
}

export function createInitialWerewolfFlowState({
  roundNumber = 1,
  startedAt = null,
}: {
  roundNumber?: number;
  startedAt?: string | null;
} = {}): WerewolfFlowState {
  return {
    candidateSeatNumbers: [],
    cueIndex: 0,
    cupidSeatNumber: null,
    cupidSharedAlignment: null,
    dayNumber: 1,
    factionAlert: null,
    idiotRevealedSeatNumbers: [],
    lastGuardedSeatNumber: null,
    loverSeatNumbers: [],
    runoffSeatNumbers: [],
    sessionIndex: roundNumber * 1000,
    sheriffElectionCompleted: false,
    stage: "NIGHT",
    suggestedSeatNumber: null,
    thirdPartySeatNumbers: [],
    transitionStartedAt: startedAt,
    voteRound: 1,
    witchAntidoteUsed: false,
    witchPoisonUsed: false,
    withdrawnSeatNumbers: [],
  };
}

export function normalizeWerewolfFlowState(
  value: unknown,
  roundNumber = 1,
): WerewolfFlowState {
  const fallback = createInitialWerewolfFlowState({ roundNumber });

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const flow = value as Partial<WerewolfFlowState>;
  const sessionIndex = Number(flow.sessionIndex);
  const dayNumber = Number(flow.dayNumber);
  const cueIndex = Number(flow.cueIndex);
  const stage = werewolfFlowStages.includes(flow.stage as WerewolfFlowStage)
    ? (flow.stage as WerewolfFlowStage)
    : fallback.stage;
  const factionAlertValue = flow.factionAlert;
  const factionAlert =
    factionAlertValue &&
    typeof factionAlertValue === "object" &&
    typeof factionAlertValue.id === "string" &&
    [
      "GODS_ELIMINATED",
      "THIRD_PARTY_WIN",
      "VILLAGERS_ELIMINATED",
      "WEREWOLVES_ELIMINATED",
    ].includes(factionAlertValue.kind)
      ? {
          id: factionAlertValue.id,
          kind: factionAlertValue.kind as WerewolfFactionAlertKind,
          seatNumbers: normalizeSeatNumbers(factionAlertValue.seatNumbers),
        }
      : null;

  return {
    candidateSeatNumbers: normalizeSeatNumbers(flow.candidateSeatNumbers),
    cueIndex: Number.isInteger(cueIndex) && cueIndex >= 0 ? cueIndex : 0,
    cupidSeatNumber: optionalSeatNumber(flow.cupidSeatNumber),
    cupidSharedAlignment:
      flow.cupidSharedAlignment === "good" ||
      flow.cupidSharedAlignment === "werewolf"
        ? flow.cupidSharedAlignment
        : null,
    dayNumber: Number.isInteger(dayNumber) && dayNumber > 0 ? dayNumber : 1,
    factionAlert,
    idiotRevealedSeatNumbers: normalizeSeatNumbers(
      flow.idiotRevealedSeatNumbers,
    ),
    lastGuardedSeatNumber: optionalSeatNumber(flow.lastGuardedSeatNumber),
    loverSeatNumbers: normalizeSeatNumbers(flow.loverSeatNumbers).slice(0, 2),
    runoffSeatNumbers: normalizeSeatNumbers(flow.runoffSeatNumbers),
    sessionIndex:
      Number.isInteger(sessionIndex) && sessionIndex >= roundNumber * 1000
        ? sessionIndex
        : fallback.sessionIndex,
    sheriffElectionCompleted: flow.sheriffElectionCompleted === true,
    stage,
    suggestedSeatNumber: optionalSeatNumber(flow.suggestedSeatNumber),
    thirdPartySeatNumbers: normalizeSeatNumbers(flow.thirdPartySeatNumbers),
    transitionStartedAt:
      typeof flow.transitionStartedAt === "string"
        ? flow.transitionStartedAt
        : null,
    voteRound: flow.voteRound === 2 ? 2 : 1,
    witchAntidoteUsed: flow.witchAntidoteUsed === true,
    witchPoisonUsed: flow.witchPoisonUsed === true,
    withdrawnSeatNumbers: normalizeSeatNumbers(flow.withdrawnSeatNumbers),
  };
}

export function getWerewolfNightCues(
  roleKeys: Array<string | null>,
  dayNumber: number,
  locale: string,
): WerewolfNightCue[] {
  const roles = new Set(roleKeys.filter(isWerewolfRoleKey));
  const cue = (
    key: string,
    title: string,
    lines: string[],
    actionKind: WerewolfNightCue["actionKind"] = "NONE",
    roleKey: WerewolfRoleKey | null = null,
  ): WerewolfNightCue => ({ actionKind, key, lines, roleKey, title });
  const localized = (zh: string, en: string, fr: string) =>
    localizeWerewolfFlowText(locale, { "zh-CN": zh, en, fr });
  const cues: WerewolfNightCue[] = [
    cue("night_close", localized("入夜", "Night falls", "La nuit tombe"), [
      localized(
        "天黑请闭眼。",
        "Everyone, close your eyes.",
        "Tout le monde ferme les yeux.",
      ),
    ]),
  ];

  if (dayNumber === 1 && roles.has("cupid")) {
    cues.push(
      cue(
        "cupid",
        localized("丘比特行动", "Cupid acts", "Cupidon agit"),
        [
          localized(
            "丘比特请睁眼。",
            "Cupid, open your eyes.",
            "Cupidon, ouvrez les yeux.",
          ),
          localized(
            "请选择两名玩家成为情侣。",
            "Choose two players to become lovers.",
            "Choisissez deux joueurs qui deviendront amoureux.",
          ),
          localized(
            "丘比特请闭眼。",
            "Cupid, close your eyes.",
            "Cupidon, fermez les yeux.",
          ),
        ],
        "CUPID",
        "cupid",
      ),
      cue(
        "lovers",
        localized(
          "情侣确认",
          "Lovers confirm",
          "Les amoureux se reconnaissent",
        ),
        [
          localized(
            "情侣请睁眼，请确认彼此。",
            "Lovers, open your eyes and recognize each other.",
            "Amoureux, ouvrez les yeux et reconnaissez-vous.",
          ),
          localized(
            "情侣请闭眼。",
            "Lovers, close your eyes.",
            "Amoureux, fermez les yeux.",
          ),
        ],
        "LOVERS",
      ),
    );
  }

  if (roles.has("guard")) {
    cues.push(
      cue(
        "guard",
        localized("守卫行动", "Guard acts", "Le garde agit"),
        [
          localized(
            "守卫请睁眼。",
            "Guard, open your eyes.",
            "Garde, ouvrez les yeux.",
          ),
          localized(
            "今晚你要守护谁？",
            "Who will you protect tonight?",
            "Qui protégez-vous cette nuit ?",
          ),
          localized(
            "守卫请闭眼。",
            "Guard, close your eyes.",
            "Garde, fermez les yeux.",
          ),
        ],
        "GUARD",
        "guard",
      ),
    );
  }

  cues.push(
    cue(
      "wolves",
      localized("狼人行动", "Werewolves act", "Les loups agissent"),
      [
        localized(
          "狼人请睁眼。",
          "Werewolves, open your eyes.",
          "Loups-garous, ouvrez les yeux.",
        ),
        localized(
          "狼人请确认同伴。",
          "Confirm your pack.",
          "Reconnaissez votre meute.",
        ),
        localized(
          "今晚你们要击杀谁？",
          "Who will you eliminate tonight?",
          "Qui éliminez-vous cette nuit ?",
        ),
        localized(
          "狼人请闭眼。",
          "Werewolves, close your eyes.",
          "Loups-garous, fermez les yeux.",
        ),
      ],
      "WOLF_KILL",
      "werewolf",
    ),
  );

  if (roles.has("seer")) {
    cues.push(
      cue(
        "seer",
        localized("预言家行动", "Seer acts", "La voyante agit"),
        [
          localized(
            "预言家请睁眼。",
            "Seer, open your eyes.",
            "Voyante, ouvrez les yeux.",
          ),
          localized(
            "今晚你要查验谁？",
            "Who will you inspect tonight?",
            "Qui voulez-vous vérifier ?",
          ),
          localized("他的身份是……", "Their faction is...", "Son camp est..."),
          localized(
            "预言家请闭眼。",
            "Seer, close your eyes.",
            "Voyante, fermez les yeux.",
          ),
        ],
        "SEER",
        "seer",
      ),
    );
  }

  if (roles.has("witch")) {
    cues.push(
      cue(
        "witch",
        localized("女巫行动", "Witch acts", "La sorcière agit"),
        [
          localized(
            "女巫请睁眼。",
            "Witch, open your eyes.",
            "Sorcière, ouvrez les yeux.",
          ),
          localized(
            "今晚他死了，你要使用解药吗？",
            "This player was attacked. Use the antidote?",
            "Ce joueur a été attaqué. Utiliser l'antidote ?",
          ),
          localized(
            "你要使用毒药吗？",
            "Do you want to use poison?",
            "Voulez-vous utiliser le poison ?",
          ),
          localized(
            "女巫请闭眼。",
            "Witch, close your eyes.",
            "Sorcière, fermez les yeux.",
          ),
        ],
        "WITCH",
        "witch",
      ),
    );
  }

  cues.push(
    cue("dawn", localized("天亮", "Dawn", "Le jour se lève"), [
      localized("天亮了。", "Day breaks.", "Le jour se lève."),
    ]),
  );

  return cues;
}

export function tallyWerewolfVotes({
  sheriffSeatNumber,
  votes,
}: {
  sheriffSeatNumber: number | null;
  votes: WerewolfVoteInput[];
}): WerewolfVoteResult {
  const totals: Record<number, number> = {};

  votes.forEach((vote) => {
    if (vote.targetSeatNumber === null) {
      return;
    }

    const weight = vote.voterSeatNumber === sheriffSeatNumber ? 1.5 : 1;
    totals[vote.targetSeatNumber] =
      (totals[vote.targetSeatNumber] ?? 0) + weight;
  });

  const highest = Math.max(0, ...Object.values(totals));
  const leaders =
    highest === 0
      ? []
      : Object.entries(totals)
          .filter(([, total]) => total === highest)
          .map(([seatNumber]) => Number(seatNumber))
          .sort((first, second) => first - second);

  return { leaders, totals };
}

export function getWerewolfFactionAlert({
  cupidSeatNumber,
  cupidSharedAlignment,
  deadSeatNumbers,
  seats,
  thirdPartySeatNumbers,
}: {
  cupidSeatNumber?: number | null;
  cupidSharedAlignment?: "good" | "werewolf" | null;
  deadSeatNumbers: number[];
  seats: Array<{
    roleAlignment: string | null;
    roleKey: string | null;
    seatNumber: number;
  }>;
  thirdPartySeatNumbers: number[];
}): Omit<WerewolfFactionAlert, "id"> | null {
  const dead = new Set(deadSeatNumbers);
  const thirdParty = new Set(thirdPartySeatNumbers);
  const players = seats.filter((seat) => isWerewolfRoleKey(seat.roleKey));
  const thirdPartyPlayers = players.filter((seat) =>
    thirdParty.has(seat.seatNumber),
  );
  const nonThirdPartyPlayers = players.filter(
    (seat) => !thirdParty.has(seat.seatNumber),
  );
  const cupidFollowsWerewolves =
    cupidSharedAlignment === "werewolf" && typeof cupidSeatNumber === "number";

  if (
    thirdPartyPlayers.length > 0 &&
    thirdPartyPlayers.some((seat) => !dead.has(seat.seatNumber)) &&
    nonThirdPartyPlayers.every((seat) => dead.has(seat.seatNumber))
  ) {
    return {
      kind: "THIRD_PARTY_WIN",
      seatNumbers: thirdPartyPlayers.map((seat) => seat.seatNumber),
    };
  }

  const factions: Array<{
    kind: WerewolfFactionAlertKind;
    seats: typeof players;
  }> = [
    {
      kind: "WEREWOLVES_ELIMINATED",
      seats: nonThirdPartyPlayers.filter(
        (seat) =>
          seat.roleAlignment === "werewolf" ||
          (cupidFollowsWerewolves && seat.seatNumber === cupidSeatNumber),
      ),
    },
    {
      kind: "GODS_ELIMINATED",
      seats: nonThirdPartyPlayers.filter(
        (seat) =>
          isWerewolfRoleKey(seat.roleKey) &&
          godRoleKeys.has(seat.roleKey) &&
          !(cupidFollowsWerewolves && seat.seatNumber === cupidSeatNumber),
      ),
    },
    {
      kind: "VILLAGERS_ELIMINATED",
      seats: nonThirdPartyPlayers.filter((seat) => seat.roleKey === "villager"),
    },
  ];

  const eliminated = factions.find(
    (faction) =>
      faction.seats.length > 0 &&
      faction.seats.every((seat) => dead.has(seat.seatNumber)),
  );

  return eliminated
    ? {
        kind: eliminated.kind,
        seatNumbers: eliminated.seats.map((seat) => seat.seatNumber),
      }
    : null;
}

export function getWerewolfSeerResult({
  roleAlignment,
  seatNumber,
  thirdPartySeatNumbers,
}: {
  roleAlignment: string | null;
  seatNumber: number;
  thirdPartySeatNumbers: number[];
}) {
  if (thirdPartySeatNumbers.includes(seatNumber)) {
    return "THIRD_PARTY" as const;
  }

  return roleAlignment === "werewolf"
    ? ("WEREWOLF" as const)
    : ("GOOD" as const);
}
