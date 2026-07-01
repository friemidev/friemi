"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CircleHelp,
  Crown,
  Eye,
  EyeOff,
  Flag,
  Home,
  History,
  ShieldAlert,
  Swords,
  Users,
  Vote,
  X,
} from "lucide-react";
import {
  proposeAvalonTeamFromSeatAction,
  submitAvalonAssassinationAction,
  submitAvalonMissionCardAction,
  submitAvalonTeamVoteAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import type { AvalonPrivatePayload } from "@/features/game-tools/avalonConfig";
import {
  getAvalonQuestTeamSize,
  type AvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import { AvalonLiveRefresh } from "@/features/game-tools/components/AvalonLiveRefresh";
import { cn } from "@/lib/utils";

type AvalonPrivateRoleCardProps = {
  locale: string;
  payload: AvalonPrivatePayload | null;
  privateToken: string;
  roleKey: string | null;
  roomHref: string;
  roomSeats: Array<{
    displayName: string;
    id: string;
    roleAlignment: string | null;
    roleKey: string | null;
    seatNumber: number;
  }>;
  roomState: AvalonRoomState;
  roomStatus: string;
  roomSubmissions: Array<{
    kind: string;
    roundIndex: number;
    seatId: string | null;
    value: string;
  }>;
  seatId: string;
  seatDisplayName: string;
  seatNumber: number;
  showLiveRefresh?: boolean;
  toolHref: string;
};

const roleIconPaths: Record<string, string> = {
  assassin: "/game-tools/avalon/roles/role-assassin.svg",
  merlin: "/game-tools/avalon/roles/role-merlin.svg",
  minion: "/game-tools/avalon/roles/role-minion.svg",
  mordred: "/game-tools/avalon/roles/role-mordred.svg",
  morgana: "/game-tools/avalon/roles/role-morgana.svg",
  oberon: "/game-tools/avalon/roles/role-oberon.svg",
  percival: "/game-tools/avalon/roles/role-percival.svg",
  servant: "/game-tools/avalon/roles/role-servant.svg",
};

function getRoleIconPath(roleKey: string | null) {
  return roleKey
    ? (roleIconPaths[roleKey] ?? "/game-tools/avalon/roles/role-unknown.svg")
    : "/game-tools/avalon/roles/role-unknown.svg";
}

type Copy = {
  approve: string;
  backToHall: string;
  backToRoom: string;
  currentAction: string;
  currentRound: string;
  day: string;
  fail: string;
  help: string;
  helpBody: string;
  helpClose: string;
  hideRole: string;
  hidden: string;
  history: string;
  identityPocket: string;
  mission: string;
  missionResult: string;
  noRole: string;
  noAction: string;
  noRecord: string;
  notOnTeam: string;
  pickTeam: string;
  phaseAssassination: string;
  phaseMission: string;
  phaseTeam: string;
  proposeTeam: string;
  reject: string;
  reveal: string;
  selectExactly: string;
  role: string;
  seat: string;
  submit: string;
  success: string;
  target: string;
  today: string;
  vote: string;
  visible: string;
  wait: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    approve: "赞成",
    backToHall: "工具大厅",
    backToRoom: "返回房间",
    currentAction: "当前操作",
    currentRound: "本轮",
    day: "天",
    fail: "失败",
    help: "玩法提示",
    helpBody:
      "默认停在当前天。点击上方圆点回看过往投票和任务记录；只有亮起的大按钮需要你现在操作。",
    helpClose: "知道了",
    hideRole: "重新盖上",
    hidden: "先确认周围没人偷看，再揭开身份。",
    history: "回看",
    identityPocket: "身份口袋",
    mission: "任务牌",
    missionResult: "任务结果",
    noRole: "房主还没有开始发身份。",
    noAction: "这一步先听桌面讨论。",
    noRecord: "暂无记录",
    notOnTeam: "本轮你不在任务队伍。",
    pickTeam: "你是队长，选本轮队伍",
    phaseAssassination: "刺杀",
    phaseMission: "任务",
    phaseTeam: "投票",
    proposeTeam: "提交队伍",
    reject: "反对",
    reveal: "揭开身份",
    selectExactly: "选择正确人数后提交。",
    role: "身份",
    seat: "座位",
    submit: "提交",
    success: "成功",
    target: "刺杀目标",
    today: "今天",
    vote: "投票",
    visible: "你能看到",
    wait: "已记录，等待其他玩家",
  },
  en: {
    approve: "Approve",
    backToHall: "Tools",
    backToRoom: "Room",
    currentAction: "Action",
    currentRound: "Now",
    day: "Day",
    fail: "Fail",
    help: "Tip",
    helpBody:
      "This opens on the current day. Tap earlier dots to review past votes and quest records; only bright action buttons need your input.",
    helpClose: "Got it",
    hideRole: "Hide role",
    hidden: "Check the room before revealing your identity.",
    history: "History",
    identityPocket: "Identity",
    mission: "Quest card",
    missionResult: "Quest result",
    noRole: "The host has not dealt roles yet.",
    noAction: "Listen to the table for this step.",
    noRecord: "No record yet",
    notOnTeam: "You are not on this quest team.",
    pickTeam: "You lead this quest",
    phaseAssassination: "Assassinate",
    phaseMission: "Quest",
    phaseTeam: "Vote",
    proposeTeam: "Submit team",
    reject: "Reject",
    reveal: "Reveal role",
    selectExactly: "Pick the exact team size.",
    role: "Role",
    seat: "Seat",
    submit: "Submit",
    success: "Success",
    target: "Target",
    today: "Today",
    vote: "Vote",
    visible: "You can see",
    wait: "Recorded. Waiting for the table.",
  },
  fr: {
    approve: "Oui",
    backToHall: "Outils",
    backToRoom: "Salle",
    currentAction: "Action",
    currentRound: "Tour",
    day: "Jour",
    fail: "Échec",
    help: "Astuce",
    helpBody:
      "La page s'ouvre sur le jour actuel. Touche les anciens points pour revoir votes et quêtes; seuls les gros boutons lumineux demandent une action.",
    helpClose: "Compris",
    hideRole: "Masquer",
    hidden: "Vérifie autour de toi avant de révéler ton identité.",
    history: "Historique",
    identityPocket: "Rôle",
    mission: "Carte quête",
    missionResult: "Résultat",
    noRole: "L'hôte n'a pas encore distribué les rôles.",
    noAction: "Écoute la table pour cette étape.",
    noRecord: "Aucun enregistrement",
    notOnTeam: "Tu n'es pas dans cette équipe.",
    pickTeam: "Tu choisis l'équipe",
    phaseAssassination: "Cible",
    phaseMission: "Quête",
    phaseTeam: "Vote",
    proposeTeam: "Valider",
    reject: "Refuser",
    reveal: "Révéler",
    selectExactly: "Choisis le bon nombre.",
    role: "Rôle",
    seat: "Place",
    submit: "Valider",
    success: "Succès",
    target: "Cible",
    today: "Aujourd'hui",
    vote: "Vote",
    visible: "Tu peux voir",
    wait: "Enregistré. Attente des autres.",
  },
};
const initialState: AvalonRoomActionState = {};
const playerConsoleToken = "/game-tools/avalon/states/player-console-token.svg";
const submissionRecordedToken =
  "/game-tools/avalon/states/submission-recorded-token.svg";

function isEvilRole(roleKey: string | null) {
  return (
    roleKey === "assassin" ||
    roleKey === "minion" ||
    roleKey === "mordred" ||
    roleKey === "morgana" ||
    roleKey === "oberon"
  );
}

function getPlayerStage({
  roleKey,
  roomState,
  roomStatus,
  seatNumber,
  selectedRoundIndex,
  t,
}: {
  roleKey: string | null;
  roomState: AvalonRoomState;
  roomStatus: string;
  seatNumber: number;
  selectedRoundIndex: number;
  t: Copy;
}) {
  if (roomStatus !== "IN_PROGRESS") {
    return {
      detail: t.noRole,
      icon: playerConsoleToken,
      title: t.identityPocket,
      tone: "paper" as const,
    };
  }

  if (selectedRoundIndex !== roomState.roundIndex) {
    return {
      detail: `${t.day} ${selectedRoundIndex + 1}`,
      icon: "/game-tools/avalon/share/timeline-node-vote.svg",
      title: t.history,
      tone: "paper" as const,
    };
  }

  if (roomState.phase === "team_building") {
    const isLeader = roomState.currentLeaderSeatNumber === seatNumber;

    return {
      detail: isLeader ? t.selectExactly : t.noAction,
      icon: isLeader
        ? "/game-tools/avalon/states/team-leader-marker.svg"
        : playerConsoleToken,
      title: isLeader ? t.pickTeam : t.phaseTeam,
      tone: isLeader ? ("forest" as const) : ("paper" as const),
    };
  }

  if (roomState.phase === "team_vote") {
    return {
      detail: `${t.approve} / ${t.reject}`,
      icon: "/game-tools/avalon/states/vote-approve-card.svg",
      title: t.vote,
      tone: "forest" as const,
    };
  }

  if (roomState.phase === "mission") {
    const isOnMissionTeam = roomState.proposedTeamSeatNumbers.includes(seatNumber);

    return {
      detail: isOnMissionTeam
        ? isEvilRole(roleKey)
          ? `${t.success} / ${t.fail}`
          : t.success
        : t.notOnTeam,
      icon: "/game-tools/avalon/states/mission-pending-token.svg",
      title: t.mission,
      tone: isOnMissionTeam ? ("forest" as const) : ("paper" as const),
    };
  }

  if (roomState.phase === "assassination") {
    return {
      detail: roleKey === "assassin" ? t.target : t.noAction,
      icon: "/game-tools/avalon/states/assassination-phase.svg",
      title: t.phaseAssassination,
      tone: "coral" as const,
    };
  }

  return {
    detail: roomState.winner === "good" ? t.success : t.fail,
    icon:
      roomState.winner === "good"
        ? "/game-tools/avalon/states/good-victory.svg"
        : "/game-tools/avalon/states/evil-victory.svg",
    title: t.missionResult,
    tone: "paper" as const,
  };
}

export function AvalonPrivateRoleCard({
  locale,
  payload,
  privateToken,
  roleKey,
  roomHref,
  roomSeats,
  roomState,
  roomStatus,
  roomSubmissions,
  seatId,
  seatDisplayName,
  seatNumber,
  showLiveRefresh = false,
  toolHref,
}: AvalonPrivateRoleCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(roomState.roundIndex);
  const t = copies[locale] ?? copies.en;
  const canReveal = roomStatus === "IN_PROGRESS" && Boolean(payload);
  const stage = getPlayerStage({
    roleKey,
    roomState,
    roomStatus,
    seatNumber,
    selectedRoundIndex,
    t,
  });
  const roundTabs = useMemo(
    () =>
      roomState.missionResults.map((result, index) => ({
        index,
        isCurrent: index === roomState.roundIndex && roomState.phase !== "finished",
        isUnlocked: index <= roomState.roundIndex || result !== null,
        result,
      })),
    [roomState.missionResults, roomState.phase, roomState.roundIndex],
  );

  useEffect(() => {
    setSelectedRoundIndex(roomState.roundIndex);
  }, [roomState.roundIndex, roomState.phase]);

  return (
    <section className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-2.5 shadow-2xl shadow-[#156240]/15 sm:p-6">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#F09182]/14 blur-3xl" />
      <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[#8AB68E]/22 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(241,242,236,0.98),rgba(254,255,249,0))]" />

      <div className="relative grid gap-2.5 sm:gap-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[1.45rem] border border-[#D6D5B2] bg-white/82 px-2.5 py-2.5 shadow-sm backdrop-blur sm:gap-3 sm:px-3 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] bg-[#156240] text-white shadow-lg shadow-[#156240]/18">
              <Image
                alt=""
                className="h-8 w-8"
                height={36}
                src="/game-tools/avalon/avalon-tool-icon.svg"
                width={36}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#156240]/75">
                Friemi Table Lab
              </p>
              <h1 className="truncate text-xl font-black leading-tight tracking-normal text-[#0E2A5A] sm:text-3xl">
                {seatDisplayName}
              </h1>
              <p className="text-xs font-black text-[#156240]/75">
                {t.seat} {seatNumber}
              </p>
              <nav className="mt-2 flex flex-wrap gap-1.5">
                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#8AB68E]/70 bg-[#FEFFF9] px-2.5 text-[0.68rem] font-black text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  href={roomHref}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t.backToRoom}
                </Link>
                <Link
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D6D5B2] bg-[#F1F2EC] px-2.5 text-[0.68rem] font-black text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  href={toolHref}
                >
                  <Home className="h-3.5 w-3.5" />
                  {t.backToHall}
                </Link>
              </nav>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showLiveRefresh ? (
              <AvalonLiveRefresh enabled locale={locale} variant="inline" />
            ) : null}
            <button
              aria-label={t.help}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#8AB68E] bg-[#FEFFF9] text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white sm:h-11 sm:w-11"
              onClick={() => setHelpOpen(true)}
              type="button"
            >
              <CircleHelp className="h-5 w-5" />
            </button>
          </div>
        </header>

        <PlayerStageCard
          currentRoundIndex={roomState.roundIndex}
          selectedRoundIndex={selectedRoundIndex}
          stage={stage}
          t={t}
        />

        <RoundSwitcher
          currentRoundIndex={roomState.roundIndex}
          onSelect={setSelectedRoundIndex}
          rounds={roundTabs}
          selectedRoundIndex={selectedRoundIndex}
          t={t}
        />

        <PrivateActionPanel
          locale={locale}
          privateToken={privateToken}
          roleKey={roleKey}
          roomSeats={roomSeats}
          roomState={roomState}
          roomStatus={roomStatus}
          roomSubmissions={roomSubmissions}
          selectedRoundIndex={selectedRoundIndex}
          seatId={seatId}
          seatNumber={seatNumber}
          t={t}
        />

        <RolePocket
          canReveal={canReveal}
          onHide={() => setRevealed(false)}
          onReveal={() => setRevealed(true)}
          payload={payload}
          revealed={revealed}
          roleKey={roleKey}
          t={t}
        />
      </div>

      {helpOpen ? <HelpDialog onClose={() => setHelpOpen(false)} t={t} /> : null}
    </section>
  );
}

function RoundSwitcher({
  currentRoundIndex,
  onSelect,
  rounds,
  selectedRoundIndex,
  t,
}: {
  currentRoundIndex: number;
  onSelect: (roundIndex: number) => void;
  rounds: Array<{
    index: number;
    isCurrent: boolean;
    isUnlocked: boolean;
    result: AvalonRoomState["missionResults"][number];
  }>;
  selectedRoundIndex: number;
  t: Copy;
}) {
  return (
    <nav
      aria-label={t.history}
      className="rounded-[1.55rem] border border-[#D6D5B2] bg-white/78 p-2.5 shadow-sm backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#156240]/75">
          <History className="h-3.5 w-3.5" />
          {t.history}
        </span>
        <span className="rounded-full bg-[#F1F2EC] px-2.5 py-1 text-[0.68rem] font-black text-[#156240]">
          {t.today} {currentRoundIndex + 1}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {rounds.map((round) => {
          const selected = selectedRoundIndex === round.index;
          const icon =
            round.result === "success"
              ? "/game-tools/avalon/states/mission-success-token.svg"
              : round.result === "fail"
                ? "/game-tools/avalon/states/mission-fail-token.svg"
                : round.isCurrent
                  ? "/game-tools/avalon/states/live-sync-token.svg"
                  : "/game-tools/avalon/states/mission-pending-token.svg";

          return (
            <button
              aria-current={selected ? "step" : undefined}
              aria-label={`${t.day} ${round.index + 1}`}
              className={cn(
                "group relative grid min-h-[4.6rem] place-items-center rounded-[1.15rem] border p-1.5 transition",
                round.isUnlocked
                  ? "border-[#D6D5B2] bg-[#FEFFF9] shadow-sm hover:-translate-y-0.5 hover:border-[#8AB68E]"
                  : "border-transparent bg-[#F1F2EC]/45 opacity-45",
                selected &&
                  "border-[#156240] bg-white shadow-lg shadow-[#156240]/15",
              )}
              disabled={!round.isUnlocked}
              key={round.index}
              onClick={() => onSelect(round.index)}
              type="button"
            >
              {round.isCurrent ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#F09182] shadow-[0_0_0_4px_rgba(240,145,130,0.16)]" />
              ) : null}
              <Image
                alt=""
                className="h-8 w-8 object-contain drop-shadow-sm transition group-hover:scale-105"
                height={40}
                src={icon}
                width={40}
              />
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.68rem] font-black leading-none",
                  selected
                    ? "bg-[#156240] text-white"
                    : "bg-white/82 text-[#156240]",
                )}
              >
                {round.index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function PlayerStageCard({
  currentRoundIndex,
  selectedRoundIndex,
  stage,
  t,
}: {
  currentRoundIndex: number;
  selectedRoundIndex: number;
  stage: ReturnType<typeof getPlayerStage>;
  t: Copy;
}) {
  const toneClass =
    stage.tone === "forest"
      ? "border-[#8AB68E] bg-[#156240] text-white shadow-[#156240]/18"
      : stage.tone === "coral"
        ? "border-[#F09182] bg-[#FFF5E6] text-[#B5301F] shadow-[#F09182]/18"
        : "border-[#D6D5B2] bg-white/84 text-[#156240] shadow-[#156240]/10";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.65rem] border p-3 shadow-xl backdrop-blur",
        toneClass,
        stage.tone !== "paper" && "avalon-player-focus",
      )}
    >
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/18 blur-2xl" />
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-white/92 shadow-lg shadow-[#1D1D1B]/8">
          <Image
            alt=""
            className="h-12 w-12 object-contain drop-shadow-sm"
            height={56}
            src={stage.icon}
            width={56}
          />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[0.66rem] font-black uppercase tracking-[0.16em]",
              stage.tone === "forest" ? "text-white/78" : "text-[#156240]/70",
            )}
          >
            {t.currentAction}
          </p>
          <h2
            className={cn(
              "line-clamp-2 text-xl font-black leading-tight tracking-normal",
              stage.tone === "forest" ? "text-white" : "text-[#0E2A5A]",
            )}
          >
            {stage.title}
          </h2>
          <p
            className={cn(
              "mt-1 line-clamp-2 text-xs font-bold leading-5",
              stage.tone === "forest" ? "text-white/82" : "text-[#1D1D1B]/66",
            )}
          >
            {stage.detail}
          </p>
        </div>
        <span
          className={cn(
            "grid min-h-12 min-w-12 place-items-center rounded-full px-2 text-center text-[0.68rem] font-black shadow-sm",
            stage.tone === "forest"
              ? "bg-white text-[#156240]"
              : "border border-[#8AB68E]/55 bg-[#FEFFF9] text-[#156240]",
          )}
        >
          {selectedRoundIndex === currentRoundIndex
            ? t.currentRound
            : `${t.day} ${selectedRoundIndex + 1}`}
        </span>
      </div>
    </section>
  );
}

function RolePocket({
  canReveal,
  onHide,
  onReveal,
  payload,
  revealed,
  roleKey,
  t,
}: {
  canReveal: boolean;
  onHide: () => void;
  onReveal: () => void;
  payload: AvalonPrivatePayload | null;
  revealed: boolean;
  roleKey: string | null;
  t: Copy;
}) {
  if (!canReveal || !payload) {
    return (
      <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.55rem] border border-dashed border-[#8AB68E]/70 bg-white/70 p-3 shadow-sm">
        <span className="grid h-14 w-14 place-items-center rounded-[1.15rem] bg-[#F1F2EC] shadow-inner">
          <Image
            alt=""
            className="h-10 w-10 object-contain"
            height={48}
            src={playerConsoleToken}
            width={48}
          />
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#156240]/70">
            {t.identityPocket}
          </p>
          <p className="text-sm font-black leading-5 text-[#0E2A5A]">{t.noRole}</p>
        </div>
      </section>
    );
  }

  if (!revealed) {
    return (
      <section className="relative overflow-hidden rounded-[1.65rem] border border-[#1D1D1B]/20 bg-[#1D1D1B] p-3 text-white shadow-xl shadow-[#1D1D1B]/18">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(240,145,130,0.22),transparent_34%),radial-gradient(circle_at_88%_70%,rgba(138,182,142,0.22),transparent_36%)]" />
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <Image
            alt=""
            className="h-20 w-20 rounded-[1.25rem] object-contain shadow-xl shadow-black/20"
            height={88}
            src="/game-tools/avalon/roles/private-card-back.svg"
            width={88}
          />
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/58">
              {t.identityPocket}
            </p>
            <p className="mt-1 text-sm font-bold leading-5 text-white/82">
              {t.hidden}
            </p>
            <button
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#156240] shadow-lg shadow-black/20 transition active:scale-[0.98] hover:-translate-y-0.5"
              onClick={onReveal}
              type="button"
            >
              <Eye className="h-4 w-4" />
              {t.reveal}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.65rem] border p-3 shadow-xl",
        payload.alignmentLabel.includes("暗") ||
          payload.alignmentLabel.toLowerCase().includes("shadow") ||
          payload.alignmentLabel.toLowerCase().includes("ombre")
          ? "border-[#F09182] bg-[#FFF5E6] shadow-[#F09182]/14"
          : "border-[#8AB68E] bg-white/86 shadow-[#156240]/12",
      )}
    >
      <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-[#8AB68E]/16 blur-2xl" />
      <div className="relative grid gap-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="grid h-20 w-20 place-items-center rounded-[1.35rem] bg-[#FEFFF9] shadow-lg shadow-[#156240]/12">
            <Image
              alt=""
              className="h-16 w-16 object-contain drop-shadow-sm"
              height={72}
              src={getRoleIconPath(roleKey)}
              width={72}
            />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#156240]/70">
              {t.role}
            </p>
            <h2 className="line-clamp-1 text-2xl font-black leading-tight text-[#0E2A5A]">
              {payload.roleLabel}
            </h2>
            <span className="mt-1 inline-flex rounded-full border border-[#8AB68E]/60 bg-[#FEFFF9] px-2.5 py-0.5 text-xs font-black text-[#156240]">
              {payload.alignmentLabel}
            </span>
          </div>
          <button
            aria-label={t.hideRole}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] shadow-sm transition active:scale-[0.98] hover:-translate-y-0.5"
            onClick={onHide}
            type="button"
          >
            <EyeOff className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-[1.15rem] bg-[#F1F2EC]/82 px-3 py-2 text-sm font-semibold leading-6 text-[#1D1D1B]/75">
          {payload.roleDescription}
        </p>

        {payload.visibleHints.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#156240]/70">
              {t.visible}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {payload.visibleHints.map((hint) => (
                <div
                  className="grid min-h-24 place-items-center rounded-[1.2rem] border border-[#D6D5B2] bg-[#FEFFF9] px-2 py-2 text-center shadow-sm"
                  key={`${hint.seatNumber}-${hint.label}-${hint.displayName}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#156240] text-sm font-black text-white shadow-sm">
                    {hint.seatNumber}
                  </span>
                  <Image
                    alt=""
                    className="my-1 h-10 w-10 object-contain drop-shadow-sm"
                    height={44}
                    src={getRoleIconPath(hint.roleKey ?? null)}
                    width={44}
                  />
                  <span className="line-clamp-1 text-[0.68rem] font-black text-[#0E2A5A]">
                    {hint.displayName}
                  </span>
                  <span className="line-clamp-1 text-[0.62rem] font-black text-[#156240]/75">
                    {hint.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HelpDialog({ onClose, t }: { onClose: () => void; t: Copy }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)_+_5.85rem)] top-[calc(env(safe-area-inset-top)_+_5.25rem)] z-50 grid place-items-stretch bg-[#1D1D1B]/28 p-3 backdrop-blur-sm sm:inset-0 sm:place-items-center sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.7rem] border border-[#8AB68E] bg-[#FEFFF9] shadow-2xl shadow-[#1D1D1B]/18 sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:max-w-md">
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-[#D6D5B2] bg-[#F1F2EC] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#156240] shadow-sm">
              <CircleHelp className="h-5 w-5" />
            </span>
            <h2 className="text-base font-black text-[#0E2A5A]">{t.help}</h2>
          </div>
          <button
            aria-label={t.helpClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#156240] shadow-sm transition hover:-translate-y-0.5"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniHintCard icon={<Vote className="h-5 w-5" />} label={t.vote} />
            <MiniHintCard icon={<Flag className="h-5 w-5" />} label={t.mission} />
            <MiniHintCard icon={<Swords className="h-5 w-5" />} label={t.target} />
          </div>
          <p className="text-sm font-semibold leading-6 text-[#1D1D1B]/72">
            {t.helpBody}
          </p>
          <button
            className="h-11 rounded-2xl bg-[#156240] px-5 text-sm font-black text-white shadow-lg shadow-[#156240]/18"
            onClick={onClose}
            type="button"
          >
            {t.helpClose}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniHintCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="grid min-h-20 place-items-center rounded-[1.2rem] border border-[#D6D5B2] bg-white text-center text-[#156240] shadow-sm">
      {icon}
      <span className="text-xs font-black">{label}</span>
    </div>
  );
}

function PrivateActionPanel({
  locale,
  privateToken,
  roleKey,
  roomSeats,
  roomState,
  roomStatus,
  roomSubmissions,
  selectedRoundIndex,
  seatId,
  seatNumber,
  t,
}: {
  locale: string;
  privateToken: string;
  roleKey: string | null;
  roomSeats: AvalonPrivateRoleCardProps["roomSeats"];
  roomState: AvalonRoomState;
  roomStatus: string;
  roomSubmissions: AvalonPrivateRoleCardProps["roomSubmissions"];
  selectedRoundIndex: number;
  seatId: string;
  seatNumber: number;
  t: Copy;
}) {
  const selectedRoundSubmissions = roomSubmissions.filter(
    (submission) => submission.roundIndex === selectedRoundIndex,
  );
  const isCurrentRound =
    roomStatus === "IN_PROGRESS" && selectedRoundIndex === roomState.roundIndex;
  const selectedMissionResult =
    roomState.missionResults[selectedRoundIndex] ?? null;

  if (!isCurrentRound) {
    return (
      <RoundHistoryPanel
        missionResult={selectedMissionResult}
        roundIndex={selectedRoundIndex}
        seatId={seatId}
        submissions={selectedRoundSubmissions}
        t={t}
      />
    );
  }

  const hasVoted = selectedRoundSubmissions.some(
    (submission) => submission.kind === "TEAM_VOTE" && submission.seatId === seatId,
  );
  const hasMissionCard = selectedRoundSubmissions.some(
    (submission) =>
      submission.kind === "MISSION_CARD" && submission.seatId === seatId,
  );
  const hasAssassinated = roomSubmissions.some(
    (submission) =>
      submission.kind === "ASSASSINATION_TARGET" && submission.seatId === seatId,
  );
  const isOnMissionTeam = roomState.proposedTeamSeatNumbers.includes(seatNumber);

  if (roomState.phase === "team_building") {
    if (roomState.currentLeaderSeatNumber === seatNumber) {
      return (
        <LeaderTeamProposalPanel
          locale={locale}
          privateToken={privateToken}
          requiredTeamSize={getAvalonQuestTeamSize({
            playerCount: roomSeats.length,
            roundIndex: roomState.roundIndex,
          })}
          roomSeats={roomSeats}
          t={t}
        />
      );
    }

    return <PassiveRoundPanel phase={roomState.phase} t={t} />;
  }

  if (roomState.phase === "team_vote") {
    return hasVoted ? (
      <RecordedState t={t} />
    ) : (
      <TeamVotePanel locale={locale} privateToken={privateToken} t={t} />
    );
  }

  if (roomState.phase === "mission" && isOnMissionTeam) {
    return hasMissionCard ? (
      <RecordedState t={t} />
    ) : (
      <MissionCardPanel
        canFail={isEvilRole(roleKey)}
        locale={locale}
        privateToken={privateToken}
        t={t}
      />
    );
  }

  if (roomState.phase === "assassination" && roleKey === "assassin") {
    return hasAssassinated ? (
      <RecordedState t={t} />
    ) : (
      <AssassinationPanel
        locale={locale}
        privateToken={privateToken}
        roomSeats={roomSeats}
        t={t}
      />
    );
  }

  return <PassiveRoundPanel phase={roomState.phase} t={t} />;
}

function LeaderTeamProposalPanel({
  locale,
  privateToken,
  requiredTeamSize,
  roomSeats,
  t,
}: {
  locale: string;
  privateToken: string;
  requiredTeamSize: number;
  roomSeats: AvalonPrivateRoleCardProps["roomSeats"];
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    proposeAvalonTeamFromSeatAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="relative grid gap-3 overflow-hidden rounded-[1.75rem] border border-[#8AB68E] bg-white/90 p-3 shadow-xl shadow-[#156240]/12"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#8AB68E]/20 blur-2xl" />
      <input name="locale" type="hidden" value={locale} />
      <input name="privateToken" type="hidden" value={privateToken} />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#156240] text-white shadow-lg shadow-[#156240]/20">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#156240]/70">
              {t.phaseTeam}
            </p>
            <h2 className="text-lg font-black text-[#0E2A5A]">{t.pickTeam}</h2>
          </div>
        </div>
        <span className="grid h-10 min-w-10 place-items-center rounded-full bg-[#F1F2EC] px-2 text-sm font-black text-[#156240] ring-1 ring-[#8AB68E]">
          {requiredTeamSize}
        </span>
      </div>

      <div className="relative grid grid-cols-5 gap-2">
        {roomSeats.map((seat) => (
          <label className="group cursor-pointer" key={seat.id} title={seat.displayName}>
            <input
              className="peer sr-only"
              name="teamSeatNumbers"
              type="checkbox"
              value={seat.seatNumber}
            />
            <span className="relative grid min-h-16 place-items-center rounded-[1.2rem] border border-[#D6D5B2] bg-[#FEFFF9] px-1 py-2 text-center shadow-sm transition active:scale-[0.98] peer-checked:-translate-y-0.5 peer-checked:border-[#156240] peer-checked:bg-[#156240] peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-[#156240]/20">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-[#156240] shadow-sm">
                {seat.seatNumber}
              </span>
              <span className="mt-1 line-clamp-1 max-w-full text-[0.62rem] font-black">
                {seat.displayName}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="relative flex items-center justify-between gap-2 rounded-2xl bg-[#F1F2EC] px-3 py-2 text-xs font-black text-[#156240] shadow-inner">
        <span>{t.selectExactly}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[#0E2A5A]">
          {requiredTeamSize}
        </span>
      </div>
      <TeamProposalSeatSubmitButton label={t.proposeTeam} />
      {state.formError ? <ActionError error={state.formError} /> : null}
    </form>
  );
}

function RoundHistoryPanel({
  missionResult,
  roundIndex,
  seatId,
  submissions,
  t,
}: {
  missionResult: AvalonRoomState["missionResults"][number];
  roundIndex: number;
  seatId: string;
  submissions: AvalonPrivateRoleCardProps["roomSubmissions"];
  t: Copy;
}) {
  const ownVote = submissions.find(
    (submission) => submission.kind === "TEAM_VOTE" && submission.seatId === seatId,
  );
  const ownMissionCard = submissions.find(
    (submission) =>
      submission.kind === "MISSION_CARD" && submission.seatId === seatId,
  );
  const approveCount = submissions.filter(
    (submission) =>
      submission.kind === "TEAM_VOTE" && submission.value === "approve",
  ).length;
  const rejectCount = submissions.filter(
    (submission) =>
      submission.kind === "TEAM_VOTE" && submission.value === "reject",
  ).length;
  const missionCardCount = submissions.filter(
    (submission) => submission.kind === "MISSION_CARD",
  ).length;
  const failCardCount = submissions.filter(
    (submission) =>
      submission.kind === "MISSION_CARD" && submission.value === "fail",
  ).length;
  const resultIcon =
    missionResult === "success"
      ? "/game-tools/avalon/states/mission-success-token.svg"
      : missionResult === "fail"
        ? "/game-tools/avalon/states/mission-fail-token.svg"
        : "/game-tools/avalon/states/mission-pending-token.svg";

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/84 p-3 shadow-lg shadow-[#156240]/10">
      <div className="absolute -right-8 top-0 h-28 w-28 rounded-full bg-[#8AB68E]/18 blur-2xl" />
      <div className="relative grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F1F2EC] shadow-inner">
              <Image
                alt=""
                className="h-8 w-8 object-contain"
                height={36}
                src={resultIcon}
                width={36}
              />
            </span>
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#156240]/70">
                {t.history}
              </p>
              <h2 className="text-lg font-black text-[#0E2A5A]">
                {t.day} {roundIndex + 1}
              </h2>
            </div>
          </div>
          <span className="rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-3 py-1 text-xs font-black text-[#156240]">
            {missionResult === "success"
              ? t.success
              : missionResult === "fail"
                ? t.fail
                : t.noRecord}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <HistoryStat
            icon={<Vote className="h-4 w-4" />}
            label={t.vote}
            value={`${approveCount}/${rejectCount}`}
          />
          <HistoryStat
            icon={<Flag className="h-4 w-4" />}
            label={t.mission}
            value={
              missionCardCount > 0
                ? `${missionCardCount} · ${failCardCount} ${t.fail}`
                : t.noRecord
            }
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <OwnRecordCard
            image="/game-tools/avalon/states/vote-approve-card.svg"
            label={t.vote}
            value={
              ownVote
                ? ownVote.value === "approve"
                  ? t.approve
                  : t.reject
                : t.noRecord
            }
          />
          <OwnRecordCard
            image={
              ownMissionCard?.value === "fail"
                ? "/game-tools/avalon/states/mission-fail-token.svg"
                : "/game-tools/avalon/states/mission-success-token.svg"
            }
            label={t.missionResult}
            value={
              ownMissionCard
                ? ownMissionCard.value === "fail"
                  ? t.fail
                  : t.success
                : t.noRecord
            }
          />
        </div>
      </div>
    </section>
  );
}

function HistoryStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#D6D5B2] bg-[#FEFFF9] px-3 py-2 shadow-sm">
      <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#156240]/70">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#0E2A5A]">{value}</p>
    </div>
  );
}

function OwnRecordCard({
  image,
  label,
  value,
}: {
  image: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.25rem] border border-[#D6D5B2] bg-white px-3 py-3 shadow-sm">
      <Image
        alt=""
        className="h-12 w-12 object-contain drop-shadow-sm"
        height={56}
        src={image}
        width={56}
      />
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#156240]/70">
          {label}
        </p>
        <p className="truncate text-base font-black text-[#0E2A5A]">{value}</p>
      </div>
    </div>
  );
}

function PassiveRoundPanel({
  phase,
  t,
}: {
  phase: AvalonRoomState["phase"];
  t: Copy;
}) {
  const visual =
    phase === "mission"
      ? {
          icon: "/game-tools/avalon/states/mission-pending-token.svg",
          label: t.notOnTeam,
          title: t.phaseMission,
        }
      : phase === "assassination"
        ? {
            icon: "/game-tools/avalon/states/assassination-phase.svg",
            label: t.noAction,
            title: t.phaseAssassination,
          }
        : {
            icon: playerConsoleToken,
            label: t.noAction,
            title: t.phaseTeam,
          };

  return (
    <section className="grid min-h-44 place-items-center overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-4 text-center shadow-lg shadow-[#156240]/10">
      <div>
        <Image
          alt=""
          className="mx-auto h-20 w-20 object-contain drop-shadow-lg"
          height={96}
          src={visual.icon}
          width={96}
        />
        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#156240]/70">
          {visual.title}
        </p>
        <p className="mt-1 text-base font-black text-[#0E2A5A]">{visual.label}</p>
      </div>
    </section>
  );
}

function TeamVotePanel({
  locale,
  privateToken,
  t,
}: {
  locale: string;
  privateToken: string;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    submitAvalonTeamVoteAction,
    initialState,
  );

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/90 p-3 shadow-lg shadow-[#156240]/10">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#8AB68E]/20 blur-2xl" />
      <ActionPanelHeader
        image="/game-tools/avalon/states/vote-approve-card.svg"
        title={t.vote}
      />
      <div className="grid grid-cols-2 gap-3">
        <PrivateImageAction
          action={formAction}
          image="/game-tools/avalon/states/vote-approve-card.svg"
          label={t.approve}
          locale={locale}
          privateToken={privateToken}
          value="approve"
        />
        <PrivateImageAction
          action={formAction}
          image="/game-tools/avalon/states/vote-reject-card.svg"
          label={t.reject}
          locale={locale}
          privateToken={privateToken}
          value="reject"
        />
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}

function MissionCardPanel({
  canFail,
  locale,
  privateToken,
  t,
}: {
  canFail: boolean;
  locale: string;
  privateToken: string;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    submitAvalonMissionCardAction,
    initialState,
  );

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/90 p-3 shadow-lg shadow-[#156240]/10">
      <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#F09182]/20 blur-2xl" />
      <ActionPanelHeader
        image="/game-tools/avalon/states/mission-pending-token.svg"
        title={t.mission}
      />
      <div className={cn("grid gap-3", canFail ? "grid-cols-2" : "grid-cols-1")}>
        <PrivateImageAction
          action={formAction}
          image="/game-tools/avalon/states/mission-success-token.svg"
          label={t.success}
          locale={locale}
          privateToken={privateToken}
          value="success"
        />
        {canFail ? (
          <PrivateImageAction
            action={formAction}
            image="/game-tools/avalon/states/mission-fail-token.svg"
            label={t.fail}
            locale={locale}
            privateToken={privateToken}
            value="fail"
          />
        ) : null}
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}

function AssassinationPanel({
  locale,
  privateToken,
  roomSeats,
  t,
}: {
  locale: string;
  privateToken: string;
  roomSeats: AvalonPrivateRoleCardProps["roomSeats"];
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    submitAvalonAssassinationAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="relative grid gap-3 overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/90 p-3 shadow-lg shadow-[#156240]/10"
    >
      <div className="absolute -right-8 top-0 h-32 w-32 rounded-full bg-[#B5301F]/10 blur-2xl" />
      <input name="locale" type="hidden" value={locale} />
      <input name="privateToken" type="hidden" value={privateToken} />
      <ActionPanelHeader
        image="/game-tools/avalon/states/assassination-phase.svg"
        title={t.target}
      />
      <div className="relative grid grid-cols-5 gap-2">
        {roomSeats.map((seat) => (
          <label className="cursor-pointer" key={seat.id} title={seat.displayName}>
            <input
              className="peer sr-only"
              name="targetSeatNumber"
              type="radio"
              value={seat.seatNumber}
            />
            <span className="grid h-16 place-items-center rounded-[1.25rem] border border-[#D6D5B2] bg-[#FEFFF9] text-sm font-black text-[#156240] shadow-sm transition peer-checked:-translate-y-0.5 peer-checked:border-[#B5301F] peer-checked:bg-[#B5301F] peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-[#B5301F]/20">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-xs">
                {seat.seatNumber}
              </span>
            </span>
          </label>
        ))}
      </div>
      <PrivateSubmitButton label={t.submit} />
      <ActionFeedback state={state} />
    </form>
  );
}

function ActionPanelHeader({ image, title }: { image: string; title: string }) {
  return (
    <div className="relative mb-3 flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F1F2EC] shadow-inner">
        <Image
          alt=""
          className="h-7 w-7 object-contain"
          height={32}
          src={image}
          width={32}
        />
      </span>
      <h2 className="text-sm font-black text-[#0E2A5A]">{title}</h2>
    </div>
  );
}

function PrivateImageAction({
  action,
  image,
  label,
  locale,
  privateToken,
  value,
}: {
  action: (payload: FormData) => void;
  image: string;
  label: string;
  locale: string;
  privateToken: string;
  value: string;
}) {
  return (
    <form action={action}>
      <input name="locale" type="hidden" value={locale} />
      <input name="privateToken" type="hidden" value={privateToken} />
      <input name="value" type="hidden" value={value} />
      <PrivateImageActionButton image={image} label={label} />
    </form>
  );
}

function PrivateImageActionButton({
  image,
  label,
}: {
  image: string;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="avalon-action-shine group relative grid min-h-32 w-full place-items-center overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-sm font-black text-[#156240] shadow-sm transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-[#8AB68E] hover:shadow-xl hover:shadow-[#156240]/10 disabled:cursor-wait disabled:opacity-70 sm:min-h-40"
      disabled={pending}
      type="submit"
    >
      <span className="absolute inset-x-3 top-3 h-12 rounded-full bg-[#F1F2EC]/70 blur-xl transition group-hover:bg-[#8AB68E]/25" />
      <Image
        alt=""
        className={cn(
          "relative h-24 w-24 drop-shadow-xl transition group-hover:scale-105",
          pending && "scale-95 animate-pulse",
        )}
        height={112}
        src={image}
        width={112}
      />
      <span className="relative rounded-full bg-white/90 px-3 py-1 text-xs shadow-sm">
        {label}
      </span>
    </button>
  );
}

function PrivateSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 rounded-2xl bg-[#156240] px-5 text-sm font-black text-white shadow-lg shadow-[#156240]/20 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "..." : label}
    </button>
  );
}

function TeamProposalSeatSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#156240] px-5 text-sm font-black text-white shadow-xl shadow-[#156240]/20 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <span className="absolute inset-x-6 top-0 h-8 rounded-full bg-white/16 blur-xl" />
      <Flag className="relative h-4 w-4" />
      <span className="relative">{pending ? "..." : label}</span>
    </button>
  );
}

function RecordedState({ t }: { t: Copy }) {
  return (
    <div className="grid place-items-center overflow-hidden rounded-[1.6rem] border border-[#8AB68E]/60 bg-[radial-gradient(circle_at_50%_0%,rgba(138,182,142,0.18),rgba(241,242,236,0.88))] px-4 py-5 text-center shadow-inner">
      <div className="avalon-recorded-pop relative h-20 w-20">
        <Image
          alt=""
          className="h-20 w-20 drop-shadow-lg"
          height={88}
          src={submissionRecordedToken}
          width={88}
        />
      </div>
      <p className="mt-2 max-w-64 text-sm font-black leading-6 text-[#156240]">
        {t.wait}
      </p>
    </div>
  );
}

function ActionError({ error }: { error?: string }) {
  return error ? (
    <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F]">
      {error}
    </p>
  ) : null;
}

function ActionFeedback({ state }: { state: AvalonRoomActionState }) {
  if (state.formError) {
    return <ActionError error={state.formError} />;
  }

  return state.formNotice ? (
    <p className="rounded-2xl bg-[#8AB68E]/14 px-3 py-2 text-sm font-black text-[#156240] ring-1 ring-[#8AB68E]/35">
      {state.formNotice}
    </p>
  ) : null;
}
