"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Crown,
  Eye,
  EyeOff,
  Flag,
  RefreshCcw,
  RotateCcw,
  Shield,
  Sparkles,
  Users,
  Vote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PlayerCount = 5 | 6 | 7 | 8 | 9 | 10;
type AvalonMode = "public" | "identity" | "full";
type RoleKey =
  | "merlin"
  | "assassin"
  | "servant"
  | "minion"
  | "percival"
  | "morgana"
  | "mordred"
  | "oberon";
type Alignment = "good" | "evil";
type MissionResult = "success" | "fail" | null;
type Phase = "playing" | "assassination" | "finished";
type GameStep = "setup" | "identity" | "team" | "mission" | "assassination" | "recap";
type Winner = {
  side: Alignment;
  reason: string;
} | null;
type TimelineEvent = {
  id: string;
  tone: "success" | "fail" | "vote" | "special";
  text: string;
};

type AvalonAssistantClientProps = {
  locale: string;
};

type AvalonCopy = {
  addFail: string;
  approveTeam: string;
  assistantTitle: string;
  countLabel: string;
  currentLeader: string;
  currentRound: string;
  currentTeam: string;
  desktopHint: string;
  evilWins: string;
  evilSide: string;
  failMission: string;
  failMissionPlural: string;
  failThreshold: string;
  failureCount: string;
  goodWins: string;
  goodSide: string;
  heroBody: string;
  heroEyebrow: string;
  identityHint: string;
  identityPanel: string;
  localOnly: string;
  missionBoard: string;
  missionRequirement: string;
  modeFull: string;
  modeIdentity: string;
  modePublic: string;
  modeNoteFull: string;
  modeNoteIdentity: string;
  modeNotePublic: string;
  nextLeader: string;
  pending: string;
  playerCount: string;
  quickRoom: string;
  recap: string;
  rejectTeam: string;
  resolveMission: string;
  reset: string;
  reveal: string;
  roleMix: string;
  roundLabel: string;
  roundSuffix: string;
  seatLabel: string;
  selectExactly: string;
  setup: string;
  shuffle: string;
  stageAssassination: string;
  stageFinished: string;
  stagePlaying: string;
  successMission: string;
  teamPassed: string;
  teamRejected: string;
  title: string;
  v01: string;
  victoryAssassinated: string;
  victoryFailedAssassination: string;
  voteReady: string;
  winner: string;
  evilCount: string;
  goodCount: string;
  defaultPlayers: string[];
  roleLabels: Record<RoleKey, string>;
  roleDescriptions: Record<RoleKey, string>;
};

const copies: Record<string, AvalonCopy> = {
  "zh-CN": {
    addFail: "增加失败",
    approveTeam: "队伍通过",
    assistantTitle: "阿瓦隆离线助手",
    countLabel: "人局",
    currentLeader: "当前队长",
    currentRound: "当前任务",
    currentTeam: "本轮队伍",
    desktopHint: "适合桌面、平板或投屏。玩家仍然面对面发言，手机只负责防错和记录。",
    evilWins: "邪恶方获胜",
    evilSide: "邪恶方",
    failMission: "失败",
    failMissionPlural: "失败牌",
    failThreshold: "本轮失败门槛",
    failureCount: "失败牌数量",
    goodWins: "好人方获胜",
    goodSide: "好人方",
    heroBody:
      "给线下桌游局一个轻量主持台：快速配身份、看座位、记投票、算任务结果，结束后还能直接复盘。",
    heroEyebrow: "Friemi Table Lab",
    identityHint: "点击座位查看对应身份。真实多人版会改成每位玩家只能看自己的身份。",
    identityPanel: "身份预览",
    localOnly: "本地演示",
    missionBoard: "任务板",
    missionRequirement: "本轮需要",
    modeFull: "全数字操作",
    modeIdentity: "数字身份",
    modePublic: "公共辅助",
    modeNoteFull: "身份、投票、任务都走手机，适合无实体牌的临时局。",
    modeNoteIdentity: "系统发身份，桌面记录投票和任务，是当前推荐试玩方式。",
    modeNotePublic: "使用实体牌，Friemi 只记录座位、投票、任务和复盘。",
    nextLeader: "队长顺移",
    pending: "待定",
    playerCount: "玩家人数",
    quickRoom: "快速开局",
    recap: "复盘时间线",
    rejectTeam: "队伍未过",
    resolveMission: "记录任务结果",
    reset: "重置本局",
    reveal: "查看身份",
    roleMix: "身份配置",
    roundLabel: "第",
    roundSuffix: "轮",
    seatLabel: "座位",
    selectExactly: "请选择正确人数后再记录结果。",
    setup: "开局设置",
    shuffle: "重新洗牌",
    stageAssassination: "刺杀阶段",
    stageFinished: "已结算",
    stagePlaying: "任务进行中",
    successMission: "成功",
    teamPassed: "队伍通过，进入任务提交。",
    teamRejected: "队伍被否决。",
    title: "线下玩得更顺，不抢走桌上的热闹。",
    v01: "v0.1 原型",
    victoryAssassinated: "刺杀命中梅林。",
    victoryFailedAssassination: "刺杀未命中梅林。",
    voteReady: "记录投票",
    winner: "胜负结算",
    evilCount: "邪恶方",
    goodCount: "好人方",
    defaultPlayers: [
      "房主",
      "小林",
      "Mia",
      "Leo",
      "阿圆",
      "Nina",
      "Jules",
      "可可",
      "Sam",
      "Yuki",
    ],
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
      assassin: "负责最终刺杀关键好人，图标为抽象匕首，不使用官方牌面。",
      merlin: "能看见大多数邪恶方，但需要隐藏自己。",
      minion: "邪恶阵营成员，通常互相知晓。",
      mordred: "隐藏得更深的邪恶方身份。",
      morgana: "会混淆关键好人视线的邪恶方身份。",
      oberon: "孤立的邪恶方身份，适合更复杂配置。",
      percival: "需要分辨两颗星里谁更可信。",
      servant: "普通好人，依靠发言和投票推进任务。",
    },
  },
  en: {
    addFail: "Add fail",
    approveTeam: "Approve team",
    assistantTitle: "Avalon Offline Assistant",
    countLabel: "players",
    currentLeader: "Leader",
    currentRound: "Current quest",
    currentTeam: "Team",
    desktopHint:
      "Built for table, tablet, or shared screen. Players keep talking face to face; Friemi handles the bookkeeping.",
    evilWins: "Evil wins",
    evilSide: "Evil",
    failMission: "Fail",
    failMissionPlural: "Fail cards",
    failThreshold: "Fail threshold",
    failureCount: "Fail cards",
    goodWins: "Good wins",
    goodSide: "Good",
    heroBody:
      "A lightweight table console for offline social deduction nights: assign roles, seat players, track teams, resolve quests, and recap the game.",
    heroEyebrow: "Friemi Table Lab",
    identityHint:
      "Tap a seat to preview a role. A real multiplayer room will only reveal each player's own identity.",
    identityPanel: "Identity preview",
    localOnly: "Local demo",
    missionBoard: "Quest board",
    missionRequirement: "Needs",
    modeFull: "Full digital",
    modeIdentity: "Digital roles",
    modePublic: "Public assist",
    modeNoteFull: "Roles, votes, and quest cards all happen on phones.",
    modeNoteIdentity: "Recommended for this prototype: digital roles, table-side tracking.",
    modeNotePublic: "Use physical cards; Friemi only tracks seats, votes, quests, and recap.",
    nextLeader: "Next leader",
    pending: "Pending",
    playerCount: "Players",
    quickRoom: "Quick room",
    recap: "Recap timeline",
    rejectTeam: "Reject team",
    resolveMission: "Record quest result",
    reset: "Reset",
    reveal: "Reveal",
    roleMix: "Role mix",
    roundLabel: "Quest",
    roundSuffix: "",
    seatLabel: "Seat",
    selectExactly: "Select the required number before recording the result.",
    setup: "Setup",
    shuffle: "Shuffle",
    stageAssassination: "Assassination",
    stageFinished: "Resolved",
    stagePlaying: "Quest in progress",
    successMission: "Success",
    teamPassed: "Team approved. Resolve the quest.",
    teamRejected: "Team rejected.",
    title: "Keep the night moving without stealing the table.",
    v01: "v0.1 prototype",
    victoryAssassinated: "Assassination hit the hidden good role.",
    victoryFailedAssassination: "Assassination missed the hidden good role.",
    voteReady: "Record vote",
    winner: "Result",
    evilCount: "Evil",
    goodCount: "Good",
    defaultPlayers: [
      "Host",
      "Lina",
      "Mia",
      "Leo",
      "Ari",
      "Nina",
      "Jules",
      "Coco",
      "Sam",
      "Yuki",
    ],
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
      assassin: "Makes the final strike. This is an original generic icon, not official card art.",
      merlin: "Sees most evil players but must stay hidden.",
      minion: "An evil-side teammate, usually aware of allies.",
      mordred: "A deeper hidden evil role.",
      morgana: "A confusing mirror role for advanced setups.",
      oberon: "An isolated evil role for complex tables.",
      percival: "Tries to read which star is trustworthy.",
      servant: "A regular good-side player relying on talk and votes.",
    },
  },
  fr: {
    addFail: "Ajouter échec",
    approveTeam: "Valider l'équipe",
    assistantTitle: "Assistant Avalon hors ligne",
    countLabel: "joueurs",
    currentLeader: "Chef d'équipe",
    currentRound: "Quête en cours",
    currentTeam: "Équipe",
    desktopHint:
      "Pensé pour table, tablette ou écran partagé. Les joueurs parlent toujours en face à face; Friemi garde le fil.",
    evilWins: "Le camp sombre gagne",
    evilSide: "Camp sombre",
    failMission: "Échec",
    failMissionPlural: "Cartes échec",
    failThreshold: "Seuil d'échec",
    failureCount: "Cartes échec",
    goodWins: "Le camp clair gagne",
    goodSide: "Camp clair",
    heroBody:
      "Une console légère pour les soirées jeu de rôle caché: distribuer les rôles, placer les joueurs, suivre les équipes, résoudre les quêtes et revoir la partie.",
    heroEyebrow: "Friemi Table Lab",
    identityHint:
      "Touchez une place pour prévisualiser un rôle. La vraie salle multijoueur ne montrera que l'identité du joueur concerné.",
    identityPanel: "Aperçu des identités",
    localOnly: "Démo locale",
    missionBoard: "Plateau des quêtes",
    missionRequirement: "Besoin de",
    modeFull: "Tout numérique",
    modeIdentity: "Rôles numériques",
    modePublic: "Aide publique",
    modeNoteFull: "Rôles, votes et cartes de quête passent par les téléphones.",
    modeNoteIdentity: "Recommandé ici: rôles numériques et suivi autour de la table.",
    modeNotePublic: "Utilisez les cartes physiques; Friemi suit seulement la table et le fil.",
    nextLeader: "Chef suivant",
    pending: "À venir",
    playerCount: "Joueurs",
    quickRoom: "Partie rapide",
    recap: "Fil de partie",
    rejectTeam: "Refuser l'équipe",
    resolveMission: "Noter le résultat",
    reset: "Réinitialiser",
    reveal: "Révéler",
    roleMix: "Composition",
    roundLabel: "Quête",
    roundSuffix: "",
    seatLabel: "Place",
    selectExactly: "Sélectionnez le bon nombre de joueurs avant d'enregistrer.",
    setup: "Configuration",
    shuffle: "Mélanger",
    stageAssassination: "Assassinat",
    stageFinished: "Résolu",
    stagePlaying: "Quête en cours",
    successMission: "Succès",
    teamPassed: "Équipe validée, passez à la quête.",
    teamRejected: "Équipe refusée.",
    title: "Fluidifier la partie sans voler la soirée.",
    v01: "Prototype v0.1",
    victoryAssassinated: "L'assassinat touche le rôle caché clé.",
    victoryFailedAssassination: "L'assassinat manque le rôle caché clé.",
    voteReady: "Noter le vote",
    winner: "Résultat",
    evilCount: "Sombre",
    goodCount: "Clair",
    defaultPlayers: [
      "Hôte",
      "Lina",
      "Mia",
      "Leo",
      "Ari",
      "Nina",
      "Jules",
      "Coco",
      "Sam",
      "Yuki",
    ],
    roleLabels: {
      assassin: "Assassin",
      merlin: "Voyant étoilé",
      minion: "Ombre",
      mordred: "Bouclier caché",
      morgana: "Étoile miroir",
      oberon: "Étoile seule",
      percival: "Guetteur double",
      servant: "Allié de table",
    },
    roleDescriptions: {
      assassin: "Porte le coup final. Icône originale générique, sans visuel officiel.",
      merlin: "Voit la plupart des joueurs sombres mais doit rester caché.",
      minion: "Membre du camp sombre, souvent au courant de ses alliés.",
      mordred: "Rôle sombre plus difficile à lire.",
      morgana: "Rôle miroir qui brouille la lecture des bons joueurs.",
      oberon: "Rôle sombre isolé pour tables avancées.",
      percival: "Cherche quelle étoile est vraiment fiable.",
      servant: "Joueur du camp clair qui avance par discussion et vote.",
    },
  },
};

const playerCounts: PlayerCount[] = [5, 6, 7, 8, 9, 10];

const questTeamSizes: Record<PlayerCount, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

const roleConfigs: Record<PlayerCount, RoleKey[]> = {
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

const roleAssets: Record<RoleKey, string> = {
  assassin: "/game-tools/avalon/roles/role-assassin.svg",
  merlin: "/game-tools/avalon/roles/role-merlin.svg",
  minion: "/game-tools/avalon/roles/role-minion.svg",
  mordred: "/game-tools/avalon/roles/role-mordred.svg",
  morgana: "/game-tools/avalon/roles/role-morgana.svg",
  oberon: "/game-tools/avalon/roles/role-oberon.svg",
  percival: "/game-tools/avalon/roles/role-percival.svg",
  servant: "/game-tools/avalon/roles/role-servant.svg",
};

const roleAlignments: Record<RoleKey, Alignment> = {
  assassin: "evil",
  merlin: "good",
  minion: "evil",
  mordred: "evil",
  morgana: "evil",
  oberon: "evil",
  percival: "good",
  servant: "good",
};

type AvalonFlowCopy = {
  activeStep: string;
  assassinationBody: string;
  assassinationTitle: string;
  backToTeam: string;
  continueToIdentity: string;
  gameOver: string;
  identityDone: string;
  identityBody: string;
  identityTitle: string;
  missionBody: string;
  missionTitle: string;
  missionReady: string;
  missionTeamHint: string;
  nextUp: string;
  noEvents: string;
  recapBody: string;
  recapTitle: string;
  roleWarning: string;
  setupBody: string;
  setupTitle: string;
  stepAssassination: string;
  stepIdentity: string;
  stepMission: string;
  stepRecap: string;
  stepSetup: string;
  stepTeam: string;
  tableGuide: string;
  teamBody: string;
  teamReady: string;
  teamTitle: string;
};

const flowCopies: Record<string, AvalonFlowCopy> = {
  "zh-CN": {
    activeStep: "当前步骤",
    assassinationBody: "好人方已经完成 3 次任务。现在让刺客指出他认为的关键好人身份。",
    assassinationTitle: "最后一步：刺杀",
    backToTeam: "返回选队伍",
    continueToIdentity: "开始发身份",
    gameOver: "本局结束",
    identityDone: "身份确认完毕",
    identityBody: "让玩家按座位逐个查看自己的身份。主持人可以用这个步骤确认座位和身份没有错。",
    identityTitle: "发身份，不要急着开聊",
    missionBody: "根据任务过程选择失败牌数量。系统会自动判断本轮成功或失败，并进入下一轮。",
    missionTitle: "记录本轮任务结果",
    missionReady: "队伍已选好",
    missionTeamHint: "这一步只记录任务结果，不再修改队伍。",
    nextUp: "下一步",
    noEvents: "还没有记录，开始第一轮后这里会自动生成复盘。",
    recapBody: "这里保留队伍投票、任务成功/失败和刺杀结果，方便结束后复盘。",
    recapTitle: "复盘和结算",
    roleWarning: "这是本地原型，真实多人房间需要每位玩家只看到自己的身份。",
    setupBody: "先选择人数和玩法模式。默认配置适合快速试玩，也可以重新洗牌。",
    setupTitle: "先把这一局搭起来",
    stepAssassination: "刺杀",
    stepIdentity: "发身份",
    stepMission: "任务结果",
    stepRecap: "复盘",
    stepSetup: "开局",
    stepTeam: "选队伍",
    tableGuide: "跟着步骤走就行。主持人不用一次看完所有面板。",
    teamBody: "队长提出本轮队伍。点选对应座位，人数够了以后可以记录投票结果。",
    teamReady: "进入任务结果",
    teamTitle: "队长选本轮队伍",
  },
  en: {
    activeStep: "Current step",
    assassinationBody:
      "Good has completed three quests. The assassin now chooses the hidden key role.",
    assassinationTitle: "Final step: assassination",
    backToTeam: "Back to team",
    continueToIdentity: "Deal identities",
    gameOver: "Game over",
    identityDone: "Identities checked",
    identityBody:
      "Let players check their role by seat. The host can make sure seats and roles are correct.",
    identityTitle: "Deal roles before the table talks",
    missionBody:
      "Choose how many fail cards appeared. Friemi resolves this quest and moves the table forward.",
    missionTitle: "Record this quest result",
    missionReady: "Team ready",
    missionTeamHint: "This step only records the quest result. Go back if the team changed.",
    nextUp: "Next",
    noEvents: "No records yet. The recap will build itself once the table starts.",
    recapBody:
      "Votes, quest results, and assassination outcome stay here for the after-game recap.",
    recapTitle: "Recap and result",
    roleWarning:
      "This is a local prototype. A real multiplayer room must only reveal each player's own role.",
    setupBody:
      "Choose player count and mode first. The default role mix is ready for a quick test.",
    setupTitle: "Set up the table",
    stepAssassination: "Assassinate",
    stepIdentity: "Roles",
    stepMission: "Quest result",
    stepRecap: "Recap",
    stepSetup: "Setup",
    stepTeam: "Team",
    tableGuide: "Follow the steps. The host never needs to read every panel at once.",
    teamBody:
      "The leader proposes a team. Select seats, then record whether the table approved it.",
    teamReady: "Go to quest result",
    teamTitle: "Leader selects the team",
  },
  fr: {
    activeStep: "Étape actuelle",
    assassinationBody:
      "Le camp clair a réussi trois quêtes. L'assassin choisit maintenant le rôle clé caché.",
    assassinationTitle: "Dernière étape: assassinat",
    backToTeam: "Retour équipe",
    continueToIdentity: "Distribuer les rôles",
    gameOver: "Partie terminée",
    identityDone: "Identités vérifiées",
    identityBody:
      "Chaque joueur regarde son rôle selon sa place. L'hôte vérifie que la table est prête.",
    identityTitle: "Distribuer les rôles avant de parler",
    missionBody:
      "Indiquez le nombre de cartes échec. Friemi résout la quête et avance la partie.",
    missionTitle: "Noter le résultat de quête",
    missionReady: "Équipe prête",
    missionTeamHint:
      "Cette étape note seulement le résultat. Revenez en arrière si l'équipe change.",
    nextUp: "Suite",
    noEvents:
      "Aucune trace pour l'instant. Le fil se remplira quand la partie commencera.",
    recapBody:
      "Votes, résultats de quête et assassinat restent ici pour revoir la partie.",
    recapTitle: "Récapitulatif",
    roleWarning:
      "Prototype local: une vraie salle multijoueur devra cacher les rôles aux autres joueurs.",
    setupBody:
      "Choisissez le nombre de joueurs et le mode. La composition par défaut permet de tester vite.",
    setupTitle: "Préparer la table",
    stepAssassination: "Assassinat",
    stepIdentity: "Rôles",
    stepMission: "Résultat",
    stepRecap: "Récap",
    stepSetup: "Départ",
    stepTeam: "Équipe",
    tableGuide:
      "Suivez les étapes. L'hôte n'a pas besoin de tout lire en même temps.",
    teamBody:
      "Le chef propose une équipe. Sélectionnez les places, puis notez le vote de table.",
    teamReady: "Résultat de quête",
    teamTitle: "Le chef choisit l'équipe",
  },
};

function getFlowCopy(locale: string) {
  return flowCopies[locale] ?? flowCopies.en;
}

function getCopy(locale: string) {
  return copies[locale] ?? copies.en;
}

function seededShuffle<T>(items: T[], seed: number) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = Math.abs(Math.sin(seed * 97 + index * 31)) % 1;
    const swapIndex = Math.floor(random * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function getSeatPosition(index: number, total: number) {
  const angle = -90 + (360 / total) * index;
  const radians = (angle * Math.PI) / 180;
  const radius = 41;

  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  };
}

function formatRound(copy: AvalonCopy, roundIndex: number) {
  return `${copy.roundLabel} ${roundIndex + 1}${copy.roundSuffix}`;
}

export function AvalonAssistantClient({ locale }: AvalonAssistantClientProps) {
  const copy = getCopy(locale);
  const flow = getFlowCopy(locale);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(7);
  const [mode, setMode] = useState<AvalonMode>("identity");
  const [seed, setSeed] = useState(3);
  const [activeStep, setActiveStep] = useState<GameStep>("setup");
  const [roundIndex, setRoundIndex] = useState(0);
  const [leaderIndex, setLeaderIndex] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [revealedSeat, setRevealedSeat] = useState<number | null>(null);
  const [missionResults, setMissionResults] = useState<MissionResult[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [rejectCount, setRejectCount] = useState(0);
  const [failCards, setFailCards] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [winner, setWinner] = useState<Winner>(null);

  const players = useMemo(
    () =>
      copy.defaultPlayers.slice(0, playerCount).map((name, index) => ({
        id: `seat-${index}`,
        name,
        seat: index + 1,
      })),
    [copy.defaultPlayers, playerCount],
  );

  const assignments = useMemo(() => {
    const roles = seededShuffle(roleConfigs[playerCount], seed);

    return players.map((player, index) => ({
      ...player,
      alignment: roleAlignments[roles[index]],
      role: roles[index],
    }));
  }, [playerCount, players, seed]);

  const currentQuestSizes = questTeamSizes[playerCount];
  const requiredTeamSize = currentQuestSizes[roundIndex] ?? currentQuestSizes[4];
  const requiredFails = playerCount >= 7 && roundIndex === 3 ? 2 : 1;
  const successCount = missionResults.filter((result) => result === "success").length;
  const failedCount = missionResults.filter((result) => result === "fail").length;
  const phase: Phase = winner
    ? "finished"
    : successCount >= 3
      ? "assassination"
      : "playing";
  const selectedTeam = selectedSeats
    .map((seatIndex) => players[seatIndex]?.name)
    .filter(Boolean)
    .join(" · ");
  const canResolveTeam =
    selectedSeats.length === requiredTeamSize && phase === "playing";
  const currentLeader = players[leaderIndex % playerCount];
  const revealedAssignment =
    revealedSeat === null ? null : assignments[revealedSeat] ?? null;
  const roleMix = useMemo(() => {
    const good = assignments.filter((assignment) => assignment.alignment === "good");
    const evil = assignments.filter((assignment) => assignment.alignment === "evil");

    return {
      evil,
      good,
      line: `${copy.goodCount} ${good.length} · ${copy.evilCount} ${evil.length}`,
    };
  }, [assignments, copy.evilCount, copy.goodCount]);
  const currentStageLabel =
    phase === "finished"
      ? copy.stageFinished
      : phase === "assassination"
        ? copy.stageAssassination
        : copy.stagePlaying;
  const currentModeNote =
    mode === "full"
      ? copy.modeNoteFull
      : mode === "identity"
        ? copy.modeNoteIdentity
        : copy.modeNotePublic;
  const displayStep: GameStep =
    phase === "finished"
      ? "recap"
      : phase === "assassination"
        ? "assassination"
        : activeStep;
  const stepItems: Array<{
    key: GameStep;
    label: string;
    disabled?: boolean;
  }> = [
    { key: "setup", label: flow.stepSetup },
    { key: "identity", label: flow.stepIdentity },
    { key: "team", label: flow.stepTeam },
    {
      disabled: !canResolveTeam && displayStep !== "mission",
      key: "mission",
      label: flow.stepMission,
    },
    {
      disabled: phase !== "assassination" && displayStep !== "assassination",
      key: "assassination",
      label: flow.stepAssassination,
    },
    {
      disabled: timeline.length === 0 && !winner && displayStep !== "recap",
      key: "recap",
      label: flow.stepRecap,
    },
  ];

  function resetGame(nextCount = playerCount) {
    setPlayerCount(nextCount);
    setActiveStep("setup");
    setRoundIndex(0);
    setLeaderIndex(0);
    setSelectedSeats([]);
    setRevealedSeat(null);
    setMissionResults([null, null, null, null, null]);
    setRejectCount(0);
    setFailCards(0);
    setTimeline([]);
    setWinner(null);
  }

  function addTimeline(tone: TimelineEvent["tone"], text: string) {
    setTimeline((items) => [
      {
        id: `${Date.now()}-${items.length}`,
        text,
        tone,
      },
      ...items,
    ]);
  }

  function toggleSeat(seatIndex: number) {
    if (phase !== "playing") {
      return;
    }

    setSelectedSeats((seats) => {
      if (seats.includes(seatIndex)) {
        return seats.filter((seat) => seat !== seatIndex);
      }

      if (seats.length >= requiredTeamSize) {
        return seats;
      }

      return [...seats, seatIndex].sort((left, right) => left - right);
    });
  }

  function rejectTeam() {
    if (!canResolveTeam) {
      return;
    }

    const nextRejectCount = rejectCount + 1;
    addTimeline(
      nextRejectCount >= 5 ? "fail" : "vote",
      `${formatRound(copy, roundIndex)} · ${copy.teamRejected} ${selectedTeam}`,
    );
    setSelectedSeats([]);
    setFailCards(0);

    if (nextRejectCount >= 5) {
      setRejectCount(nextRejectCount);
      setWinner({
        reason: copy.teamRejected,
        side: "evil",
      });
      setActiveStep("recap");
      return;
    }

    setRejectCount(nextRejectCount);
    setLeaderIndex((leader) => (leader + 1) % playerCount);
    setActiveStep("team");
  }

  function resolveMission() {
    if (!canResolveTeam) {
      return;
    }

    const result: Exclude<MissionResult, null> =
      failCards >= requiredFails ? "fail" : "success";
    const nextResults = missionResults.map((item, index) =>
      index === roundIndex ? result : item,
    );
    const nextSuccessCount = nextResults.filter((item) => item === "success").length;
    const nextFailedCount = nextResults.filter((item) => item === "fail").length;

    setMissionResults(nextResults);
    addTimeline(
      result === "success" ? "success" : "fail",
      `${formatRound(copy, roundIndex)} · ${
        result === "success" ? copy.successMission : copy.failMission
      } · ${failCards} ${copy.failMissionPlural}`,
    );
    setSelectedSeats([]);
    setFailCards(0);
    setRejectCount(0);

    if (nextFailedCount >= 3) {
      setWinner({
        reason: copy.failMission,
        side: "evil",
      });
      setActiveStep("recap");
      return;
    }

    if (nextSuccessCount >= 3) {
      addTimeline("special", copy.victoryFailedAssassination);
      setActiveStep("assassination");
      return;
    }

    setRoundIndex((round) => Math.min(round + 1, 4));
    setLeaderIndex((leader) => (leader + 1) % playerCount);
    setActiveStep("team");
  }

  function finishAssassination(side: Alignment) {
    setWinner({
      reason:
        side === "evil" ? copy.victoryAssassinated : copy.victoryFailedAssassination,
      side,
    });
    addTimeline(
      side === "evil" ? "fail" : "success",
      side === "evil" ? copy.victoryAssassinated : copy.victoryFailedAssassination,
    );
    setActiveStep("recap");
  }

  return (
    <div className="avalon-tool relative isolate overflow-hidden rounded-[2rem] border border-sage/45 bg-paper text-ink shadow-[0_24px_80px_rgb(var(--friemi-forest-rgb)/0.12)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_9%_11%,rgb(var(--friemi-sage-rgb)/0.22),transparent_18rem),radial-gradient(circle_at_93%_2%,rgb(var(--friemi-coral-rgb)/0.18),transparent_20rem),linear-gradient(135deg,rgb(var(--friemi-paper-rgb)),rgb(var(--friemi-fog-rgb))_52%,rgb(var(--friemi-cream-rgb)))]" />
      <section className="grid gap-4 p-3 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)] lg:gap-6 lg:p-8">
        <aside className="min-w-0 space-y-4">
          <div className="avalon-rise min-w-0 overflow-hidden rounded-[1.5rem] border border-sage/45 bg-paper/88 p-4 shadow-[0_18px_50px_rgb(var(--friemi-forest-rgb)/0.12)] backdrop-blur sm:rounded-[1.75rem] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/game-tools/avalon/avalon-tool-icon.svg"
                  alt=""
                  className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
                />
                <div className="min-w-0">
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.26em] text-forest">
                    {copy.heroEyebrow}
                  </p>
                  <h1 className="mt-1 text-xl font-black leading-tight text-forest sm:text-2xl">
                    {copy.assistantTitle}
                  </h1>
                </div>
              </div>
              <span className="rounded-full border border-coral/35 bg-cream px-3 py-1 text-xs font-black text-danger">
                {copy.v01}
              </span>
            </div>
            <h2 className="mt-4 max-w-full break-words text-2xl font-black leading-[1.08] text-ink sm:mt-6 sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-forest/75 sm:mt-4 sm:leading-7">
              {flow.tableGuide}
            </p>

            <div className="mt-5 hidden gap-2 rounded-[1.35rem] border border-sage/30 bg-white/60 p-2 sm:grid">
              <MiniStat label={copy.currentRound} value={currentStageLabel} />
              <MiniStat
                label={copy.currentLeader}
                value={`${currentLeader?.seat ?? 1}. ${currentLeader?.name ?? ""}`}
              />
              <MiniStat label={copy.roleMix} value={roleMix.line} />
            </div>
          </div>

          <nav className="avalon-rise min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-sage/40 bg-white/74 p-2 shadow-sm [animation-delay:80ms] sm:rounded-[1.5rem] sm:p-3">
            <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.2em] text-forest">
              {flow.activeStep}
            </p>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
              {stepItems.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  disabled={step.disabled}
                  onClick={() => setActiveStep(step.key)}
                  className={cn(
                    "flex min-h-10 min-w-[7.5rem] items-center gap-2 rounded-2xl border px-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 lg:min-h-12 lg:min-w-0 lg:gap-3",
                    displayStep === step.key
                      ? "border-forest bg-forest text-white shadow-[0_12px_26px_rgb(var(--friemi-forest-rgb)/0.2)]"
                      : "border-sage/30 bg-paper/76 text-forest hover:border-forest/45",
                  )}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/82 text-[0.68rem] font-black text-forest lg:h-7 lg:w-7 lg:text-xs">
                    {index + 1}
                  </span>
                  <span className="text-xs font-black lg:text-sm">{step.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="avalon-rise min-w-0 overflow-hidden rounded-[1.5rem] border border-sage/45 bg-white/78 p-4 shadow-[0_18px_60px_rgb(var(--friemi-forest-rgb)/0.1)] [animation-delay:120ms] sm:rounded-[1.9rem] sm:p-5 lg:min-h-[38rem] lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-forest">
                {flow.nextUp}
              </p>
              <h3 className="mt-2 max-w-full break-words text-2xl font-black leading-tight text-ink sm:text-3xl">
                {displayStep === "setup"
                  ? flow.setupTitle
                  : displayStep === "identity"
                    ? flow.identityTitle
                    : displayStep === "team"
                      ? flow.teamTitle
                      : displayStep === "mission"
                        ? flow.missionTitle
                        : displayStep === "assassination"
                          ? flow.assassinationTitle
                          : flow.recapTitle}
              </h3>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-forest/72">
                {displayStep === "setup"
                  ? flow.setupBody
                  : displayStep === "identity"
                    ? flow.identityBody
                    : displayStep === "team"
                      ? flow.teamBody
                      : displayStep === "mission"
                        ? flow.missionBody
                        : displayStep === "assassination"
                          ? flow.assassinationBody
                          : flow.recapBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetGame()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-sage/45 bg-paper px-4 text-sm font-black text-forest transition hover:-translate-y-0.5 hover:bg-cream"
            >
              <RotateCcw className="h-4 w-4" />
              {copy.reset}
            </button>
          </div>

          <div
            className={cn(
              "mt-5 gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0",
              displayStep === "setup" ? "hidden sm:grid" : "flex",
            )}
          >
            {missionResults.map((result, index) => (
              <div
                key={index}
                className={cn(
                  "min-h-20 min-w-[7.4rem] rounded-[1.15rem] border p-3 text-center transition sm:min-w-0",
                  index === roundIndex && phase === "playing"
                    ? "border-forest bg-cream shadow-[0_12px_28px_rgb(var(--friemi-forest-rgb)/0.12)]"
                    : "border-sage/30 bg-paper/70",
                )}
              >
                <img
                  src={
                    result === "success"
                      ? "/game-tools/avalon/states/mission-success-token.svg"
                      : result === "fail"
                        ? "/game-tools/avalon/states/mission-fail-token.svg"
                        : "/game-tools/avalon/states/mission-pending-token.svg"
                  }
                  alt=""
                  className="mx-auto h-8 w-8"
                />
                <p className="mt-1 text-xs font-black text-forest">
                  {formatRound(copy, index)}
                </p>
                <p className="mt-1 text-[0.68rem] font-bold text-forest/65">
                  {currentQuestSizes[index]} {copy.countLabel}
                  {playerCount >= 7 && index === 3
                    ? ` · 2 ${copy.failMissionPlural}`
                    : ""}
                </p>
              </div>
            ))}
          </div>

          {displayStep === "setup" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                      {copy.playerCount}
                    </p>
                    <h4 className="mt-1 text-2xl font-black text-ink">
                      {playerCount} {copy.countLabel}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSeed((value) => value + 1);
                      setRevealedSeat(null);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-sage/45 bg-white/70 px-4 text-sm font-black text-forest transition hover:-translate-y-0.5"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {copy.shuffle}
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3">
                  {playerCounts.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => resetGame(count)}
                      className={cn(
                        "h-12 rounded-full border text-sm font-black transition",
                        count === playerCount
                          ? "border-forest bg-forest text-white shadow-[0_8px_20px_rgb(var(--friemi-forest-rgb)/0.18)]"
                          : "border-sage/35 bg-white/70 text-forest hover:border-forest/45",
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                  {copy.roleMix}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-forest/72">
                  {roleMix.line}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {roleConfigs[playerCount].map((role, index) => (
                    <img
                      key={`${role}-${index}`}
                      src={roleAssets[role]}
                      alt=""
                      className={cn(
                        "h-11 w-11 rounded-full border bg-paper p-1 shadow-sm",
                        roleAlignments[role] === "good"
                          ? "border-forest/40"
                          : "border-coral/50",
                      )}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4 xl:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                  {copy.setup}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {[
                    ["public", copy.modePublic],
                    ["identity", copy.modeIdentity],
                    ["full", copy.modeFull],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value as AvalonMode)}
                      className={cn(
                        "flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm font-black transition",
                        mode === value
                          ? "border-forest bg-forest text-white"
                          : "border-sage/35 bg-white/72 text-forest hover:border-forest/45",
                      )}
                    >
                      <span>{label}</span>
                      {mode === value ? <Check className="h-4 w-4" /> : null}
                    </button>
                  ))}
                </div>
                <p className="mt-3 rounded-2xl border border-sage/30 bg-white/58 px-4 py-3 text-xs font-bold leading-5 text-forest/72">
                  {currentModeNote}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep("identity")}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-black text-white shadow-[0_14px_30px_rgb(var(--friemi-forest-rgb)/0.2)] transition hover:-translate-y-0.5 sm:w-auto"
                >
                  {flow.continueToIdentity}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            </div>
          ) : null}

          {displayStep === "identity" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <div className="relative mx-auto aspect-square max-w-[24rem]">
                  <img
                    src="/game-tools/common/round-table-seat-map.svg"
                    alt=""
                    className="absolute inset-0 h-full w-full opacity-80"
                  />
                  {players.map((player, index) => {
                    const position = getSeatPosition(index, playerCount);
                    const isRevealed = revealedSeat === index;
                    const assignment = assignments[index];

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setRevealedSeat(index)}
                        className={cn(
                          "absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-black shadow-[0_10px_22px_rgb(var(--friemi-forest-rgb)/0.16)] transition hover:scale-105",
                          isRevealed
                            ? assignment.alignment === "good"
                              ? "border-forest bg-forest text-white"
                              : "border-coral bg-danger text-white"
                            : "border-sage bg-paper text-forest",
                        )}
                        style={position}
                      >
                        {player.seat}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                      {copy.identityPanel}
                    </p>
                    <h4 className="mt-1 text-2xl font-black text-ink">
                      {revealedAssignment
                        ? `${copy.seatLabel} ${revealedAssignment.seat}`
                        : copy.reveal}
                    </h4>
                  </div>
                  {revealedAssignment ? (
                    <Eye className="h-5 w-5 text-forest" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-forest/60" />
                  )}
                </div>
                <div className="mt-4 rounded-[1.35rem] border border-sage/35 bg-white/58 p-4">
                  {revealedAssignment ? (
                    <div className="flex gap-4">
                      <img
                        src={roleAssets[revealedAssignment.role]}
                        alt=""
                        className="h-24 w-24 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-black",
                              revealedAssignment.alignment === "good"
                                ? "bg-forest text-white"
                                : "bg-danger text-white",
                            )}
                          >
                            {revealedAssignment.alignment === "good"
                              ? copy.goodSide
                              : copy.evilSide}
                          </span>
                          <span className="text-base font-black text-ink">
                            {copy.roleLabels[revealedAssignment.role]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-6 text-forest/72">
                          {copy.roleDescriptions[revealedAssignment.role]}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid place-items-center gap-3 py-4 text-center">
                      <img
                        src="/game-tools/avalon/roles/private-card-back.svg"
                        alt=""
                        className="h-36 w-28 rounded-2xl"
                      />
                      <p className="max-w-sm text-sm font-medium leading-6 text-forest/72">
                        {copy.identityHint}
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-3 rounded-2xl border border-coral/25 bg-cream/70 px-4 py-3 text-xs font-bold leading-5 text-danger">
                  {flow.roleWarning}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep("team")}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-black text-white shadow-[0_14px_30px_rgb(var(--friemi-forest-rgb)/0.2)] transition hover:-translate-y-0.5"
                >
                  {flow.identityDone}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            </div>
          ) : null}

          {displayStep === "team" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {players.map((player, index) => {
                    const selected = selectedSeats.includes(index);
                    const disabled = !selected && selectedSeats.length >= requiredTeamSize;

                    return (
                      <button
                        key={player.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleSeat(index)}
                        className={cn(
                          "min-h-14 rounded-2xl border px-3 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-35",
                          selected
                            ? "border-forest bg-forest text-white shadow-[0_10px_24px_rgb(var(--friemi-forest-rgb)/0.16)]"
                            : "border-sage/30 bg-white/70 text-forest hover:border-forest/45",
                        )}
                      >
                        <span className="block text-[0.7rem] opacity-70">
                          {copy.seatLabel} {player.seat}
                        </span>
                        <span className="block truncate">{player.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                      {copy.currentTeam}
                    </p>
                    <h4 className="mt-1 text-2xl font-black text-ink">
                      {selectedSeats.length}/{requiredTeamSize}
                    </h4>
                  </div>
                  <Crown className="h-8 w-8 text-forest" />
                </div>
                <p className="mt-3 min-h-12 rounded-2xl border border-sage/30 bg-white/60 px-4 py-3 text-sm font-black leading-6 text-ink">
                  {selectedTeam || copy.selectExactly}
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    disabled={!canResolveTeam}
                    onClick={rejectTeam}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-coral/40 bg-cream px-4 text-sm font-black text-danger transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <img
                      src="/game-tools/avalon/states/vote-reject-card.svg"
                      alt=""
                      className="h-7 w-5"
                    />
                    {copy.rejectTeam}
                  </button>
                  <button
                    type="button"
                    disabled={!canResolveTeam}
                    onClick={() => setActiveStep("mission")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-black text-white shadow-[0_12px_26px_rgb(var(--friemi-forest-rgb)/0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Flag className="h-4 w-4" />
                    {flow.teamReady}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {displayStep === "mission" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                  {flow.missionReady}
                </p>
                <h4 className="mt-2 text-2xl font-black text-ink">
                  {formatRound(copy, roundIndex)}
                </h4>
                <div className="mt-4 grid gap-3">
                  <InfoPill
                    icon={<Users className="h-4 w-4" />}
                    label={copy.missionRequirement}
                    value={`${requiredTeamSize} ${copy.countLabel}`}
                  />
                  <InfoPill
                    icon={<Shield className="h-4 w-4" />}
                    label={copy.failThreshold}
                    value={`${requiredFails} ${copy.failMissionPlural}`}
                  />
                  <InfoPill
                    icon={<X className="h-4 w-4" />}
                    label={copy.rejectTeam}
                    value={`${rejectCount}/5`}
                  />
                </div>
                <p className="mt-4 rounded-2xl border border-sage/30 bg-white/58 px-4 py-3 text-xs font-bold leading-5 text-forest/72">
                  {flow.missionTeamHint}
                </p>
              </section>

              <section className="rounded-[1.5rem] border border-sage/35 bg-paper/72 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-forest">
                  {copy.currentTeam}
                </p>
                <p className="mt-2 rounded-2xl border border-sage/30 bg-white/60 px-4 py-3 text-sm font-black leading-6 text-ink">
                  {selectedTeam || copy.selectExactly}
                </p>

                <div className="mt-4 rounded-[1.35rem] border border-sage/30 bg-white/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-black text-forest">
                      {copy.failureCount}
                    </span>
                    <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-danger">
                      {copy.failThreshold}: {requiredFails}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setFailCards(count)}
                        className={cn(
                          "min-h-16 rounded-2xl border text-2xl font-black transition",
                          failCards === count
                            ? "border-danger bg-danger text-white shadow-[0_12px_24px_rgb(var(--friemi-coral-rgb)/0.22)]"
                            : "border-sage/35 bg-paper text-forest",
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep("team")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-sage/45 bg-white/70 px-4 text-sm font-black text-forest transition hover:-translate-y-0.5"
                  >
                    {flow.backToTeam}
                  </button>
                  <button
                    type="button"
                    disabled={!canResolveTeam}
                    onClick={resolveMission}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-black text-white shadow-[0_12px_26px_rgb(var(--friemi-forest-rgb)/0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <img
                      src="/game-tools/avalon/states/vote-approve-card.svg"
                      alt=""
                      className="h-7 w-5"
                    />
                    {copy.resolveMission}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {displayStep === "assassination" ? (
            <div className="mt-6 rounded-[1.75rem] border border-coral/35 bg-cream p-5">
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src="/game-tools/avalon/states/assassination-phase.svg"
                  alt=""
                  className="h-28 w-28 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-black text-forest">
                    {successCount} / 3 {copy.successMission}
                  </p>
                  <h4 className="mt-2 text-2xl font-black text-ink">
                    {flow.assassinationTitle}
                  </h4>
                  <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-forest/72">
                    {flow.assassinationBody}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => finishAssassination("evil")}
                  className="min-h-12 rounded-full bg-danger px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {copy.victoryAssassinated}
                </button>
                <button
                  type="button"
                  onClick={() => finishAssassination("good")}
                  className="min-h-12 rounded-full bg-forest px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {copy.victoryFailedAssassination}
                </button>
              </div>
            </div>
          ) : null}

          {displayStep === "recap" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <section className="rounded-[1.75rem] border border-sage/35 bg-paper/72 p-5 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-coral" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-forest">
                  {winner ? flow.gameOver : copy.pending}
                </p>
                <h4 className="mt-2 text-3xl font-black text-ink">
                  {winner
                    ? winner.side === "good"
                      ? copy.goodWins
                      : copy.evilWins
                    : flow.recapTitle}
                </h4>
                <p className="mt-3 text-sm font-bold leading-6 text-forest/72">
                  {winner?.reason ?? flow.recapBody}
                </p>
                <button
                  type="button"
                  onClick={() => resetGame()}
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-black text-white"
                >
                  {copy.reset}
                </button>
              </section>

              <section className="rounded-[1.75rem] border border-sage/35 bg-paper/72 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm font-black text-forest sm:grid-cols-4">
                  <MiniStat label={copy.successMission} value={`${successCount}/3`} />
                  <MiniStat label={copy.failMission} value={`${failedCount}/3`} />
                  <MiniStat label={copy.rejectTeam} value={`${rejectCount}/5`} />
                  <MiniStat label={copy.nextLeader} value={`${currentLeader?.seat ?? 1}`} />
                </div>
                <div className="mt-4 grid gap-2">
                  {(timeline.length
                    ? timeline
                    : [{ id: "empty", text: flow.noEvents, tone: "vote" as const }]
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-sage/25 bg-white/58 p-3"
                    >
                      <img
                        src={
                          item.tone === "success"
                            ? "/game-tools/avalon/share/timeline-node-success.svg"
                            : item.tone === "fail"
                              ? "/game-tools/avalon/share/timeline-node-fail.svg"
                              : item.tone === "special"
                                ? "/game-tools/avalon/share/timeline-node-assassin.svg"
                                : "/game-tools/avalon/share/timeline-node-vote.svg"
                        }
                        alt=""
                        className="h-8 w-8 shrink-0"
                      />
                      <p className="text-sm font-bold leading-5 text-forest/78">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </section>

      <section className="border-t border-sage/30 bg-white/55 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-sage/35 bg-paper/82 p-4">
          <p className="max-w-3xl text-xs font-black uppercase tracking-[0.2em] text-forest">
            {copy.desktopHint}
          </p>
          <div className="flex items-center gap-2 text-sm font-black text-forest">
            <ArrowRight className="h-4 w-4" />
            {flow.stepRecap}: {timeline.length}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl bg-white/60 px-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-black uppercase tracking-[0.12em] text-forest/58">
          {label}
        </span>
        <span className="block truncate text-sm font-black text-ink">{value}</span>
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sage/25 bg-white/58 px-3 py-2">
      <span className="block text-[0.68rem] font-black text-forest/58">
        {label}
      </span>
      <span className="mt-1 block text-lg font-black text-ink">{value}</span>
    </div>
  );
}
