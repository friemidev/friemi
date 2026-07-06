export type AvalonPlayerCount = 5 | 6 | 7 | 8 | 9 | 10;
export type AvalonMode = "public" | "identity" | "full";
export type AvalonRoleKey =
  | "assassin"
  | "merlin"
  | "minion"
  | "mordred"
  | "morgana"
  | "oberon"
  | "percival"
  | "servant";
export type AvalonAlignment = "evil" | "good";
export type AvalonAssignedSeat = {
  displayName: string;
  roleAlignment: AvalonAlignment;
  roleKey: AvalonRoleKey;
  seatNumber: number;
};
export type AvalonPrivatePayload = {
  alignmentLabel: string;
  roleDescription: string;
  roleLabel: string;
  visibleHints: Array<{
    displayName: string;
    label: string;
    roleKey?: AvalonRoleKey;
    seatNumber: number;
  }>;
};

type AvalonRoleCopy = {
  alignmentLabels: Record<AvalonAlignment, string>;
  roleDescriptions: Record<AvalonRoleKey, string>;
  roleLabels: Record<AvalonRoleKey, string>;
  visibleLabels: {
    evilAlly: string;
    merlinSees: string;
    percivalSees: string;
  };
};

export const avalonPlayerCounts: AvalonPlayerCount[] = [5, 6, 7, 8, 9, 10];

export const avalonQuestTeamSizes: Record<AvalonPlayerCount, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export const avalonRoleConfigs: Record<AvalonPlayerCount, AvalonRoleKey[]> = {
  5: ["merlin", "servant", "servant", "assassin", "minion"],
  6: ["merlin", "servant", "servant", "servant", "assassin", "minion"],
  7: ["merlin", "percival", "servant", "servant", "assassin", "morgana", "minion"],
  8: [
    "merlin",
    "percival",
    "servant",
    "servant",
    "servant",
    "assassin",
    "morgana",
    "minion",
  ],
  9: [
    "merlin",
    "percival",
    "servant",
    "servant",
    "servant",
    "servant",
    "assassin",
    "morgana",
    "mordred",
  ],
  10: [
    "merlin",
    "percival",
    "servant",
    "servant",
    "servant",
    "servant",
    "assassin",
    "morgana",
    "mordred",
    "oberon",
  ],
};

export const avalonRoleAlignments: Record<AvalonRoleKey, AvalonAlignment> = {
  assassin: "evil",
  merlin: "good",
  minion: "evil",
  mordred: "evil",
  morgana: "evil",
  oberon: "evil",
  percival: "good",
  servant: "good",
};

export const avalonRoleCopy: Record<string, AvalonRoleCopy> = {
  "zh-CN": {
    alignmentLabels: {
      evil: "暗潮阵营",
      good: "圆桌阵营",
    },
    roleLabels: {
      assassin: "刺客",
      merlin: "星眼智者",
      minion: "影子",
      mordred: "隐盾",
      morgana: "镜中星",
      oberon: "孤星",
      percival: "双星守望",
      servant: "圆桌伙伴",
    },
    roleDescriptions: {
      assassin: "你属于暗潮阵营。最终若圆桌完成三次任务，你负责寻找并刺杀星眼智者。",
      merlin: "你属于圆桌阵营。你能看见大多数暗潮成员，但必须隐藏自己的身份。",
      minion: "你属于暗潮阵营。发言时保护同伴，扰乱圆桌判断。",
      mordred: "你属于暗潮阵营。星眼智者看不见你，你是更深的阴影。",
      morgana: "你属于暗潮阵营。你会混淆双星守望的判断。",
      oberon: "你属于暗潮阵营。你不认识其他暗潮成员，其他暗潮也不认识你。",
      percival: "你属于圆桌阵营。你会看到两颗星，其中一位是星眼智者，另一位可能是镜中星。",
      servant: "你属于圆桌阵营。你没有额外视野，需要通过发言、投票和任务结果判断局势。",
    },
    visibleLabels: {
      evilAlly: "暗潮同伴",
      merlinSees: "你感知到的暗潮",
      percivalSees: "你看到的两颗星",
    },
  },
  en: {
    alignmentLabels: {
      evil: "Shadow side",
      good: "Round table",
    },
    roleLabels: {
      assassin: "Assassin",
      merlin: "Star Seer",
      minion: "Shadow",
      mordred: "Hidden Shield",
      morgana: "Mirror Star",
      oberon: "Lone Star",
      percival: "Twin Watcher",
      servant: "Table Ally",
    },
    roleDescriptions: {
      assassin: "You are on the shadow side. If the round table completes three quests, you choose the final assassination target.",
      merlin: "You are on the round table. You can sense most shadow players, but you must stay hidden.",
      minion: "You are on the shadow side. Protect your allies and bend the table's read.",
      mordred: "You are on the shadow side. The Star Seer cannot see you.",
      morgana: "You are on the shadow side. You confuse the Twin Watcher.",
      oberon: "You are on the shadow side. You do not know the other shadows, and they do not know you.",
      percival: "You are on the round table. You see two stars: one is the Star Seer, the other may be the Mirror Star.",
      servant: "You are on the round table. You have no special vision; read the room through speech, votes, and quest results.",
    },
    visibleLabels: {
      evilAlly: "Shadow ally",
      merlinSees: "Shadow you sense",
      percivalSees: "Two stars you see",
    },
  },
  fr: {
    alignmentLabels: {
      evil: "Camp de l'ombre",
      good: "Table ronde",
    },
    roleLabels: {
      assassin: "Assassin",
      merlin: "Voyant étoilé",
      minion: "Ombre",
      mordred: "Bouclier caché",
      morgana: "Étoile miroir",
      oberon: "Étoile seule",
      percival: "Veilleur double",
      servant: "Allié de table",
    },
    roleDescriptions: {
      assassin: "Tu appartiens au camp de l'ombre. Si la table ronde réussit trois quêtes, tu choisis la cible finale.",
      merlin: "Tu appartiens à la table ronde. Tu perçois la plupart des ombres, mais tu dois rester discret.",
      minion: "Tu appartiens au camp de l'ombre. Protège tes alliés et brouille les lectures.",
      mordred: "Tu appartiens au camp de l'ombre. Le Voyant étoilé ne te voit pas.",
      morgana: "Tu appartiens au camp de l'ombre. Tu brouilles la vision du Veilleur double.",
      oberon: "Tu appartiens au camp de l'ombre. Tu ne connais pas les autres ombres, et elles ne te connaissent pas.",
      percival: "Tu appartiens à la table ronde. Tu vois deux étoiles : l'une est le Voyant étoilé, l'autre peut être l'Étoile miroir.",
      servant: "Tu appartiens à la table ronde. Tu n'as pas de vision spéciale ; lis la table par les paroles, les votes et les quêtes.",
    },
    visibleLabels: {
      evilAlly: "Allié de l'ombre",
      merlinSees: "Ombre perçue",
      percivalSees: "Deux étoiles vues",
    },
  },
};

export function getAvalonFailureThreshold(playerCount: number, roundIndex: number) {
  return playerCount >= 7 && roundIndex === 3 ? 2 : 1;
}

export function isAvalonPlayerCount(value: number): value is AvalonPlayerCount {
  return avalonPlayerCounts.includes(value as AvalonPlayerCount);
}

export function normalizeAvalonMode(value: unknown): AvalonMode {
  return value === "public" || value === "full" || value === "identity"
    ? value
    : "identity";
}

export function getAvalonRoleCopy(locale: string) {
  return avalonRoleCopy[locale] ?? avalonRoleCopy.en;
}

export function getAvalonRoleLabel(locale: string, roleKey: string | null | undefined) {
  if (!roleKey || !isAvalonRoleKey(roleKey)) {
    return "";
  }

  return getAvalonRoleCopy(locale).roleLabels[roleKey];
}

export function isAvalonRoleKey(value: string): value is AvalonRoleKey {
  return Object.prototype.hasOwnProperty.call(avalonRoleAlignments, value);
}

export function getAvalonRoleDeck(playerCount: AvalonPlayerCount) {
  return avalonRoleConfigs[playerCount];
}

export function createAvalonPrivatePayload({
  assignedSeats,
  locale,
  seat,
}: {
  assignedSeats: AvalonAssignedSeat[];
  locale: string;
  seat: AvalonAssignedSeat;
}): AvalonPrivatePayload {
  const copy = getAvalonRoleCopy(locale);
  const roleKey = seat.roleKey;
  const visibleHints: AvalonPrivatePayload["visibleHints"] = [];

  if (roleKey === "merlin") {
    visibleHints.push(
      ...assignedSeats
        .filter(
          (candidate) =>
            candidate.roleAlignment === "evil" &&
            candidate.roleKey !== "mordred",
        )
        .map((candidate) => ({
          displayName: candidate.displayName,
          label: copy.visibleLabels.merlinSees,
          seatNumber: candidate.seatNumber,
        })),
    );
  } else if (roleKey === "percival") {
    visibleHints.push(
      ...assignedSeats
        .filter(
          (candidate) =>
            candidate.roleKey === "merlin" || candidate.roleKey === "morgana",
        )
        .map((candidate) => ({
          displayName: candidate.displayName,
          label: copy.visibleLabels.percivalSees,
          seatNumber: candidate.seatNumber,
        })),
    );
  } else if (seat.roleAlignment === "evil" && roleKey !== "oberon") {
    visibleHints.push(
      ...assignedSeats
        .filter(
          (candidate) =>
            candidate.seatNumber !== seat.seatNumber &&
            candidate.roleAlignment === "evil" &&
            candidate.roleKey !== "oberon",
        )
        .map((candidate) => ({
          displayName: candidate.displayName,
          label: copy.visibleLabels.evilAlly,
          seatNumber: candidate.seatNumber,
        })),
    );
  }

  return {
    alignmentLabel: copy.alignmentLabels[seat.roleAlignment],
    roleDescription: copy.roleDescriptions[roleKey],
    roleLabel: copy.roleLabels[roleKey],
    visibleHints,
  };
}
