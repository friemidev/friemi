"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  Check,
  Clipboard,
  Crown,
  Eye,
  Link2,
  LockKeyhole,
  Pencil,
  RefreshCcw,
  Shield,
  Sparkles,
  UserMinus,
  UserRoundPlus,
  Users,
  Wrench,
} from "lucide-react";
import {
  correctAvalonRoomAction,
  joinAvalonRoomAction,
  manageAvalonLobbySeatAction,
  proposeAvalonTeamAction,
  startAvalonRoomAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import { AvalonQrCode } from "@/features/game-tools/components/AvalonQrCode";
import type { AvalonRoomState } from "@/features/game-tools/avalonRoomState";
import { cn } from "@/lib/utils";

type AvalonRoomSeat = {
  avatarLabel: string;
  displayName: string;
  guestName: string | null;
  id: string;
  isClaimed: boolean;
  isHostSeat: boolean;
  isOnProposedTeam: boolean;
  isViewerSeat: boolean;
  privateToken: string | null;
  profileId: string | null;
  roleAlignment: string | null;
  roleKey: string | null;
  roleLabel: string | null;
  seatNumber: number;
};

type AvalonRoomView = {
  code: string;
  events: Array<{
    actorName: string | null;
    createdAt: string;
    id: string;
    payload: unknown;
    type: string;
  }>;
  id: string;
  isHost: boolean;
  mode: string;
  playerCount: number;
  progress: {
    failureThreshold: number;
    missionCardSubmissionCount: number;
    requiredTeamSize: number;
    teamVoteSubmissionCount: number;
  };
  seats: AvalonRoomSeat[];
  state: AvalonRoomState;
  status: string;
  title: string;
  viewerSeatId: string | null;
};

type AvalonRoomLobbyProps = {
  baseUrl: string;
  locale: string;
  room: AvalonRoomView;
};

type Copy = {
  claim: string;
  claimSeat: string;
  code: string;
  copied: string;
  copy: string;
  current: string;
  emptySeat: string;
  fail: string;
  finished: string;
  goodWins: string;
  helper: string;
  host: string;
  joinHint: string;
  leader: string;
  lobby: string;
  log: string;
  mission: string;
  missionCards: string;
  myIdentity: string;
  namePlaceholder: string;
  manageSeats: string;
  pickTeam: string;
  players: string;
  privateLink: string;
  privateLinks: string;
  privateLinksHint: string;
  proposeTeam: string;
  progress: string;
  rejectTrack: string;
  resetRound: string;
  round: string;
  roomLink: string;
  screen: string;
  scanToJoin: string;
  ready: string;
  releaseSeat: string;
  renewPrivateLink: string;
  renameSeat: string;
  repair: string;
  roleHidden: string;
  roleRevealed: string;
  seat: string;
  selectTeam: string;
  start: string;
  started: string;
  startHint: string;
  success: string;
  table: string;
  target: string;
  team: string;
  undoMission: string;
  votes: string;
  waiting: string;
  viewerSeat: string;
  evilWins: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    claim: "认领",
    claimSeat: "认领座位",
    code: "房号",
    copied: "已复制",
    copy: "复制",
    current: "当前步骤",
    emptySeat: "待认领",
    evilWins: "暗潮胜利",
    fail: "失败",
    finished: "结算",
    goodWins: "圆桌胜利",
    helper: "把房号或链接发给玩家。房主可以先开局，再把每个座位的私密身份链接交给对应玩家。",
    host: "房主",
    joinHint: "输入一个桌上好认的名字，认领后本座位会绑定到你。",
    leader: "队长",
    lobby: "候场",
    log: "记录",
    mission: "任务",
    missionCards: "任务牌",
    myIdentity: "我的身份",
    namePlaceholder: "你的桌上昵称",
    manageSeats: "座位管理",
    pickTeam: "选队",
    players: "玩家",
    privateLink: "身份链接",
    privateLinks: "私密身份链接",
    privateLinksHint: "只把对应座位链接发给本人。游戏开始后链接里会显示身份和可见信息。",
    proposeTeam: "提交队伍",
    progress: "进度",
    rejectTrack: "否决",
    repair: "修正",
    resetRound: "重置本轮",
    round: "第",
    roomLink: "房间链接",
    scanToJoin: "扫码入座",
    screen: "公共屏",
    ready: "已入座",
    releaseSeat: "释放",
    renewPrivateLink: "刷新链接",
    renameSeat: "改名",
    roleHidden: "身份未公开",
    roleRevealed: "已发身份",
    seat: "座位",
    selectTeam: "选择本轮队伍",
    start: "开始发身份",
    started: "进行中",
    startHint: "开局后身份会写入每个座位的私密链接。公共房间页不会暴露所有身份。",
    success: "成功",
    table: "圆桌座位",
    target: "刺杀",
    team: "队伍",
    undoMission: "撤回任务",
    votes: "投票",
    waiting: "等待",
    viewerSeat: "你的座位",
  },
  en: {
    claim: "Claim",
    claimSeat: "Claim seat",
    code: "Code",
    copied: "Copied",
    copy: "Copy",
    current: "Now",
    emptySeat: "Open",
    evilWins: "Evil wins",
    fail: "Fail",
    finished: "Resolved",
    goodWins: "Good wins",
    helper:
      "Share the code or link. The host can start the room first, then hand each private identity link to the right player.",
    host: "Host",
    joinHint: "Use a table nickname players can recognize.",
    leader: "Leader",
    lobby: "Lobby",
    log: "Log",
    mission: "Quest",
    missionCards: "Quest cards",
    myIdentity: "My identity",
    namePlaceholder: "Your table name",
    manageSeats: "Seat tools",
    pickTeam: "Pick team",
    players: "Players",
    privateLink: "Identity link",
    privateLinks: "Private identity links",
    privateLinksHint:
      "Send each link only to the matching player. Roles and private vision appear after the game starts.",
    proposeTeam: "Submit team",
    progress: "Progress",
    rejectTrack: "Rejects",
    repair: "Repair",
    resetRound: "Reset round",
    round: "Round",
    roomLink: "Room link",
    scanToJoin: "Scan to join",
    screen: "Public screen",
    ready: "Seated",
    releaseSeat: "Release",
    renewPrivateLink: "Renew link",
    renameSeat: "Rename",
    roleHidden: "Role hidden",
    roleRevealed: "Role dealt",
    seat: "Seat",
    selectTeam: "Pick this quest team",
    start: "Deal roles",
    started: "In progress",
    startHint:
      "Starting writes roles into private seat links. The public room page will not reveal every identity.",
    success: "Success",
    table: "Table seats",
    target: "Target",
    team: "Team",
    undoMission: "Undo quest",
    votes: "Votes",
    waiting: "Waiting",
    viewerSeat: "Your seat",
  },
  fr: {
    claim: "Prendre",
    claimSeat: "Prendre la place",
    code: "Code",
    copied: "Copié",
    copy: "Copier",
    current: "Maintenant",
    emptySeat: "Libre",
    evilWins: "Ombre gagne",
    fail: "Échec",
    finished: "Résolu",
    goodWins: "Table gagne",
    helper:
      "Partage le code ou le lien. L'hôte peut lancer la partie, puis envoyer chaque lien privé au bon joueur.",
    host: "Hôte",
    joinHint: "Choisis un nom facile à reconnaître autour de la table.",
    leader: "Chef",
    lobby: "Accueil",
    log: "Journal",
    mission: "Quête",
    missionCards: "Cartes",
    myIdentity: "Mon identité",
    namePlaceholder: "Ton nom à table",
    manageSeats: "Places",
    pickTeam: "Équipe",
    players: "Joueurs",
    privateLink: "Lien d'identité",
    privateLinks: "Liens privés d'identité",
    privateLinksHint:
      "Envoie chaque lien uniquement à la personne concernée. Les rôles s'affichent après le lancement.",
    proposeTeam: "Valider",
    progress: "Progression",
    rejectTrack: "Refus",
    repair: "Corriger",
    resetRound: "Reprendre",
    round: "Tour",
    roomLink: "Lien de table",
    scanToJoin: "Scanner",
    screen: "Écran public",
    ready: "Assis",
    releaseSeat: "Libérer",
    renewPrivateLink: "Nouveau lien",
    renameSeat: "Renommer",
    roleHidden: "Rôle caché",
    roleRevealed: "Rôle distribué",
    seat: "Place",
    selectTeam: "Choisir l'équipe",
    start: "Distribuer",
    started: "En cours",
    startHint:
      "Le lancement écrit les rôles dans les liens privés. La page publique ne révèle pas toutes les identités.",
    success: "Succès",
    table: "Places",
    target: "Cible",
    team: "Équipe",
    undoMission: "Annuler",
    votes: "Votes",
    waiting: "Attente",
    viewerSeat: "Ta place",
  },
};

const initialState: AvalonRoomActionState = {};

export function AvalonRoomLobby({
  baseUrl,
  locale,
  room,
}: AvalonRoomLobbyProps) {
  const t = copies[locale] ?? copies.en;
  const roomUrl = `${baseUrl}/${locale}/game-tools/avalon/rooms/${room.id}`;
  const joinUrl = `${baseUrl}/${locale}/game-tools/avalon/join/${room.code}`;
  const screenUrl = `${baseUrl}/${locale}/game-tools/avalon/rooms/${room.id}/screen`;
  const claimedCount = room.seats.filter((seat) => seat.isClaimed).length;
  const statusLabel =
    room.status === "FINISHED"
      ? t.finished
      : room.status === "IN_PROGRESS"
        ? t.started
        : t.lobby;
  const controlCard = getControlCardHeader(room, t);

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.08fr)_25rem]">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-6">
        <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-[#8AB68E]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-10 h-40 w-40 rounded-full bg-[#F09182]/12 blur-3xl" />

        <div className="relative grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] xl:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#156240] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-[#156240]/15">
                <Sparkles className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-3 py-1 text-xs font-black text-[#156240]">
                <Users className="h-3.5 w-3.5" />
                {claimedCount}/{room.playerCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#156240]/70">
                Friemi Table Lab
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-[#0E2A5A] sm:text-4xl">
                {room.title}
              </h1>
            </div>
            <div className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[1.5rem] border border-[#D6D5B2] bg-white/85 p-2 shadow-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240]">
                  <Image
                    alt=""
                    className="h-7 w-7 object-contain"
                    height={32}
                    src="/game-tools/avalon/states/scan-join-token.svg"
                    width={32}
                  />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#156240]">
                    {t.code}
                  </span>
                  <code className="block truncate text-xl font-black tracking-[0.18em] text-[#0E2A5A]">
                    {room.code}
                  </code>
                </div>
              </div>
              <CopyButton label={t.copy} successLabel={t.copied} value={joinUrl} />
            </div>
          </div>

          <RoundTable room={room} t={t} />
        </div>

        <PhaseSnapshot claimedCount={claimedCount} room={room} t={t} />

        {room.status !== "LOBBY" ? (
          <MissionBoard progress={room.progress} state={room.state} t={t} />
        ) : null}

        {room.events.length > 0 ? <AvalonEventRail events={room.events} t={t} /> : null}

        <div className="relative mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#156240]" />
            <h2 className="text-base font-bold text-[#1D1D1B]">{t.table}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {room.seats.map((seat) => (
              <SeatCard
                key={seat.id}
                locale={locale}
                roomId={room.id}
                roomStatus={room.status}
                seat={seat}
                t={t}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="min-w-0 space-y-5">
        <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240] shadow-inner">
              <Image
                alt=""
                className="h-9 w-9 object-contain"
                height={40}
                src={controlCard.icon}
                width={40}
              />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1B]">
                {controlCard.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#156240]/75">
                {controlCard.description}
              </p>
            </div>
          </div>
          {room.isHost && room.status === "LOBBY" ? (
            <StartRoomForm locale={locale} roomId={room.id} t={t} />
          ) : (
            <GameControlPanel locale={locale} room={room} t={t} />
          )}
        </section>

        {room.isHost && room.status !== "LOBBY" ? (
          <HostCorrectionPanel locale={locale} room={room} t={t} />
        ) : null}

        {room.isHost && room.status === "LOBBY" ? (
          <LobbySeatManagementPanel locale={locale} room={room} t={t} />
        ) : null}

        <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
            <AvalonQrCode label={t.scanToJoin} value={joinUrl} />
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#156240] px-4 text-sm font-black text-white shadow-xl shadow-[#156240]/20 transition hover:-translate-y-0.5"
              href={screenUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt=""
                className="h-7 w-7 object-contain"
                height={32}
                src="/game-tools/avalon/states/public-screen-token.svg"
                width={32}
              />
              {t.screen}
            </a>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F09182] text-white shadow-lg shadow-[#F09182]/20">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1B]">
                {t.privateLinks}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#156240]/75">
                {t.privateLinksHint}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {room.seats.map((seat) => {
              const seatUrl = seat.privateToken
                ? `${baseUrl}/${locale}/game-tools/avalon/seats/${seat.privateToken}`
                : "";

              return (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#D6D5B2] bg-white/80 px-3 py-2"
                  key={seat.id}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F2EC] text-xs font-black text-[#156240]">
                    {seat.seatNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1D1D1B]">
                      {seat.displayName}
                    </p>
                    <p className="text-xs font-medium text-[#156240]/65">
                      {seat.privateToken ? t.privateLink : t.roleHidden}
                    </p>
                  </div>
                  {seat.privateToken ? (
                    <CopyButton
                      compact
                      label={t.copy}
                      successLabel={t.copied}
                      value={seatUrl}
                    />
                  ) : (
                    <Eye className="h-4 w-4 text-[#D6D5B2]" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#D6D5B2] bg-white/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#156240]/70">
                URL
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#0E2A5A]">
                {roomUrl}
              </p>
            </div>
            <CopyButton label={t.copy} successLabel={t.copied} value={roomUrl} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function MissionBoard({
  progress,
  state,
  t,
}: {
  progress: AvalonRoomView["progress"];
  state: AvalonRoomState;
  t: Copy;
}) {
  const successCount = state.missionResults.filter(
    (result) => result === "success",
  ).length;
  const failCount = state.missionResults.filter((result) => result === "fail").length;

  return (
    <div className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/75 p-3 shadow-inner sm:p-4">
      <div className="absolute inset-0 opacity-30">
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={420}
          src="/game-tools/avalon/states/mission-board-bg.svg"
          width={1200}
        />
      </div>
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#156240]/70">
            {t.progress}
          </p>
          <h2 className="text-lg font-black text-[#0E2A5A]">
            {t.mission} {state.roundIndex + 1}
          </h2>
        </div>
        <span className="rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-3 py-1 text-xs font-black text-[#156240] shadow-sm">
          {t.team} {progress.requiredTeamSize}
        </span>
      </div>

      <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center justify-center gap-2.5 sm:justify-start">
          {state.missionResults.map((result, index) => {
            const src =
              result === "success"
                ? "/game-tools/avalon/states/mission-success-token.svg"
                : result === "fail"
                  ? "/game-tools/avalon/states/mission-fail-token.svg"
                  : "/game-tools/avalon/states/mission-pending-token.svg";

            return (
              <div
                className={cn(
                  "relative grid h-16 w-16 place-items-center rounded-[1.35rem] border bg-[#FEFFF9] shadow-sm transition",
                  index === state.roundIndex &&
                    state.phase !== "finished" &&
                    "scale-110 border-[#156240] shadow-lg shadow-[#156240]/20",
                )}
                key={index}
              >
                <Image
                  alt=""
                  className={cn(result && "avalon-token-reveal")}
                  height={46}
                  src={src}
                  width={46}
                />
                <span className="absolute -bottom-1.5 rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-black text-[#156240] shadow-sm">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <StatPill tone="good" label={t.success} value={successCount} />
          <StatPill tone="evil" label={t.fail} value={failCount} />
          <StatPill tone="team" label={t.rejectTrack} value={state.teamVoteRejectCount} />
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-center gap-1.5 sm:justify-start">
        <span className="mr-2 rounded-full bg-[#FEFFF9]/90 px-2 py-1 text-[0.66rem] font-black text-[#156240]/75 shadow-sm">
          {t.rejectTrack}
        </span>
        {Array.from({ length: 5 }, (_, index) => {
          const filled = index < state.teamVoteRejectCount;
          const danger = filled && index === 4;

          return (
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border shadow-sm transition",
                filled
                  ? "scale-105 border-[#F09182] bg-[#FFF0EC]"
                  : "border-[#D6D5B2] bg-white",
              )}
              key={index}
            >
              <Image
                alt=""
                className="h-4 w-4 object-contain"
                height={20}
                src={
                  danger
                    ? "/game-tools/avalon/states/reject-track-danger.svg"
                    : "/game-tools/avalon/states/reject-track-dot.svg"
                }
                width={20}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PhaseSnapshot({
  claimedCount,
  room,
  t,
}: {
  claimedCount: number;
  room: AvalonRoomView;
  t: Copy;
}) {
  const phase = getPhaseSnapshot(room, t, claimedCount);

  return (
    <section className="relative mt-5 overflow-hidden rounded-[1.85rem] border border-[#8AB68E]/35 bg-[#F1F2EC]/72 p-3 shadow-inner sm:p-4">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[#156240]" />
      <div className="relative grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <div className="grid h-16 w-16 place-items-center rounded-[1.35rem] border border-[#D6D5B2] bg-[#FEFFF9] shadow-lg shadow-[#156240]/10">
          <Image
            alt=""
            className="h-12 w-12 object-contain drop-shadow-md"
            height={56}
            src={phase.icon}
            width={56}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#156240]/70">
            {t.current}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight tracking-normal text-[#0E2A5A] sm:text-2xl">
            {phase.title}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#156240]/75">
            {phase.description}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-52">
          {phase.chips.map((chip) => (
            <div
              className="rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-2 py-2 text-center shadow-sm"
              key={chip.label}
            >
              <p className="text-lg font-black leading-none text-[#0E2A5A]">
                {chip.value}
              </p>
              <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#156240]/65">
                {chip.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getPhaseSnapshot(
  room: AvalonRoomView,
  t: Copy,
  claimedCount: number,
) {
  const roundNumber = room.state.roundIndex + 1;
  const baseChips = [
    { label: t.round, value: roundNumber },
    { label: t.leader, value: room.state.currentLeaderSeatNumber },
    { label: t.team, value: room.progress.requiredTeamSize },
  ];

  if (room.status === "FINISHED" || room.state.phase === "finished") {
    const isGoodWinner = room.state.winner === "good";

    return {
      chips: baseChips,
      description: room.state.winnerReason ?? t.finished,
      icon: isGoodWinner
        ? "/game-tools/avalon/states/good-victory.svg"
        : "/game-tools/avalon/states/evil-victory.svg",
      title: isGoodWinner ? t.goodWins : t.evilWins,
    };
  }

  if (room.status === "LOBBY") {
    return {
      chips: [
        { label: t.ready, value: claimedCount },
        { label: t.players, value: room.playerCount },
        { label: t.seat, value: Math.max(room.playerCount - claimedCount, 0) },
      ],
      description: t.joinHint,
      icon: "/game-tools/avalon/states/scan-join-token.svg",
      title: t.scanToJoin,
    };
  }

  if (room.state.phase === "team_vote") {
    return {
      chips: [
        { label: t.votes, value: room.progress.teamVoteSubmissionCount },
        { label: t.players, value: room.playerCount },
        { label: t.rejectTrack, value: room.state.teamVoteRejectCount },
      ],
      description: room.state.proposedTeamSeatNumbers.join(" · "),
      icon: "/game-tools/avalon/states/vote-approve-card.svg",
      title: t.votes,
    };
  }

  if (room.state.phase === "mission") {
    return {
      chips: [
        { label: t.missionCards, value: room.progress.missionCardSubmissionCount },
        { label: t.team, value: room.state.proposedTeamSeatNumbers.length },
        { label: t.fail, value: room.progress.failureThreshold },
      ],
      description: room.state.proposedTeamSeatNumbers.join(" · "),
      icon: "/game-tools/avalon/states/mission-pending-token.svg",
      title: t.mission,
    };
  }

  if (room.state.phase === "assassination") {
    return {
      chips: baseChips,
      description: t.target,
      icon: "/game-tools/avalon/states/assassination-phase.svg",
      title: t.target,
    };
  }

  return {
    chips: baseChips,
    description: `${t.leader} ${room.state.currentLeaderSeatNumber}`,
    icon: "/game-tools/avalon/share/timeline-node-team.svg",
    title: t.selectTeam,
  };
}

function getControlCardHeader(room: AvalonRoomView, t: Copy) {
  if (room.status === "FINISHED" || room.state.phase === "finished") {
    const isGoodWinner = room.state.winner === "good";

    return {
      description: t.finished,
      icon: isGoodWinner
        ? "/game-tools/avalon/states/good-victory.svg"
        : "/game-tools/avalon/states/evil-victory.svg",
      title: isGoodWinner ? t.goodWins : t.evilWins,
    };
  }

  if (room.status === "LOBBY") {
    return {
      description: t.startHint,
      icon: "/game-tools/avalon/avalon-tool-icon.svg",
      title: t.start,
    };
  }

  if (room.state.phase === "team_vote") {
    return {
      description: `${room.progress.teamVoteSubmissionCount}/${room.playerCount}`,
      icon: "/game-tools/avalon/states/vote-approve-card.svg",
      title: t.votes,
    };
  }

  if (room.state.phase === "mission") {
    return {
      description: `${room.progress.missionCardSubmissionCount}/${room.state.proposedTeamSeatNumbers.length}`,
      icon: "/game-tools/avalon/states/mission-pending-token.svg",
      title: t.missionCards,
    };
  }

  if (room.state.phase === "assassination") {
    return {
      description: t.target,
      icon: "/game-tools/avalon/states/assassination-phase.svg",
      title: t.target,
    };
  }

  return {
    description: `${t.leader} ${room.state.currentLeaderSeatNumber} · ${t.team} ${room.progress.requiredTeamSize}`,
    icon: "/game-tools/avalon/share/timeline-node-team.svg",
    title: t.selectTeam,
  };
}

function StatPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "evil" | "good" | "team";
  value: number;
}) {
  const toneClass =
    tone === "good"
      ? "border-[#8AB68E] bg-[#EAF6E7] text-[#156240]"
      : tone === "evil"
        ? "border-[#F09182] bg-[#FFF0EC] text-[#B5301F]"
        : "border-[#D6D5B2] bg-[#FEFFF9] text-[#0E2A5A]";

  return (
    <div className={cn("rounded-2xl border px-3 py-2 shadow-sm", toneClass)}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[0.65rem] font-black opacity-75">{label}</p>
    </div>
  );
}

function getEventIcon(type: string) {
  if (type === "mission_succeeded") {
    return "/game-tools/avalon/states/mission-success-token.svg";
  }

  if (type === "mission_failed") {
    return "/game-tools/avalon/states/mission-fail-token.svg";
  }

  if (type === "round_corrected") {
    return "/game-tools/avalon/share/timeline-node-correction.svg";
  }

  if (type === "team_proposed") {
    return "/game-tools/avalon/share/timeline-node-team.svg";
  }

  if (type === "room_started") {
    return "/game-tools/avalon/share/timeline-node-start.svg";
  }

  if (type === "assassination_resolved") {
    return "/game-tools/avalon/share/timeline-node-assassin.svg";
  }

  if (type.includes("vote")) {
    return "/game-tools/avalon/share/timeline-node-vote.svg";
  }

  return "/game-tools/avalon/avalon-tool-icon.svg";
}

function getEventLabel(type: string, t: Copy) {
  if (type === "mission_succeeded") {
    return t.success;
  }

  if (type === "mission_failed") {
    return t.fail;
  }

  if (type === "round_corrected") {
    return t.repair;
  }

  if (type === "team_proposed") {
    return t.team;
  }

  if (type.includes("vote")) {
    return t.votes;
  }

  if (type === "assassination_resolved") {
    return t.finished;
  }

  if (type === "room_started") {
    return t.started;
  }

  return t.log;
}

function isEventPayloadRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getEventRoundLabel(event: AvalonRoomView["events"][number]) {
  if (!isEventPayloadRecord(event.payload)) {
    return null;
  }

  const roundIndex = event.payload.roundIndex;

  return typeof roundIndex === "number" && Number.isFinite(roundIndex)
    ? String(roundIndex + 1)
    : null;
}

function getEventSeatNumbers(event: AvalonRoomView["events"][number]) {
  if (!isEventPayloadRecord(event.payload)) {
    return [];
  }

  if (Array.isArray(event.payload.teamSeatNumbers)) {
    return event.payload.teamSeatNumbers
      .map((seatNumber) => Number(seatNumber))
      .filter((seatNumber) => Number.isInteger(seatNumber) && seatNumber > 0)
      .slice(0, 5);
  }

  const targetSeatNumber = Number(event.payload.targetSeatNumber);

  return Number.isInteger(targetSeatNumber) && targetSeatNumber > 0
    ? [targetSeatNumber]
    : [];
}

function AvalonEventRail({
  events,
  t,
}: {
  events: AvalonRoomView["events"];
  t: Copy;
}) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/72 p-3 shadow-inner sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-[#0E2A5A]">{t.log}</h2>
        <span className="rounded-full bg-[#F1F2EC] px-3 py-1 text-[0.66rem] font-black text-[#156240]/75">
          {events.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {events.slice(0, 8).map((event, index) => {
          const roundLabel = getEventRoundLabel(event);
          const seatNumbers = getEventSeatNumbers(event);

          return (
            <div
              className="relative grid min-w-24 place-items-center rounded-[1.35rem] border border-[#D6D5B2] bg-[#FEFFF9] px-2 py-2 text-center shadow-sm"
              key={event.id}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              {roundLabel ? (
                <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#156240] text-[0.58rem] font-black text-white">
                  {roundLabel}
                </span>
              ) : null}
              <Image
                alt=""
                className="avalon-token-reveal h-12 w-12 object-contain drop-shadow-md"
                height={56}
                src={getEventIcon(event.type)}
                width={56}
              />
              <span className="mt-1 text-[0.64rem] font-black text-[#156240]">
                {getEventLabel(event.type, t)}
              </span>
              {seatNumbers.length > 0 ? (
                <span className="mt-1 flex justify-center gap-0.5">
                  {seatNumbers.map((seatNumber) => (
                    <span
                      className="grid h-4 min-w-4 place-items-center rounded-full bg-[#F09182] px-1 text-[0.5rem] font-black text-white"
                      key={`${event.id}-${seatNumber}`}
                    >
                      {seatNumber}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LobbySeatManagementPanel({
  locale,
  room,
  t,
}: {
  locale: string;
  room: AvalonRoomView;
  t: Copy;
}) {
  return (
    <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240] shadow-inner">
            <Users className="h-5 w-5" />
          </span>
          <h2 className="text-base font-black text-[#1D1D1B]">
            {t.manageSeats}
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#156240] ring-1 ring-[#D6D5B2]">
          {room.seats.filter((seat) => seat.isClaimed).length}/{room.playerCount}
        </span>
      </div>
      <div className="grid gap-2">
        {room.seats.map((seat) => (
          <LobbySeatManagementRow
            key={seat.id}
            locale={locale}
            roomId={room.id}
            seat={seat}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

function LobbySeatManagementRow({
  locale,
  roomId,
  seat,
  t,
}: {
  locale: string;
  roomId: string;
  seat: AvalonRoomSeat;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    manageAvalonLobbySeatAction,
    initialState,
  );

  return (
    <div className="rounded-[1.25rem] border border-[#D6D5B2] bg-white/82 p-2.5 shadow-sm">
      <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F2EC] text-xs font-black text-[#156240] ring-1 ring-[#D6D5B2]">
          {seat.seatNumber}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#0E2A5A]">
            {seat.displayName}
          </p>
          <p className="text-[0.68rem] font-black text-[#156240]/65">
            {seat.isClaimed ? t.ready : t.emptySeat}
          </p>
        </div>
        {seat.isHostSeat ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E6] px-2 py-1 text-[0.62rem] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
            <Crown className="h-3 w-3" />
            {t.host}
          </span>
        ) : null}
      </div>

      <form action={formAction} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input name="roomId" type="hidden" value={roomId} />
        <input name="seatId" type="hidden" value={seat.id} />
        <input
          className="h-9 min-w-0 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-xs font-semibold text-[#1D1D1B] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
          defaultValue={seat.displayName}
          maxLength={40}
          name="displayName"
        />
        <SeatManageSubmit
          icon={<Pencil className="h-3.5 w-3.5" />}
          label={t.renameSeat}
          operation="rename_seat"
        />
      </form>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <form action={formAction}>
          <input name="locale" type="hidden" value={locale} />
          <input name="roomId" type="hidden" value={roomId} />
          <input name="seatId" type="hidden" value={seat.id} />
          <SeatManageSubmit
            full
            icon={<RefreshCcw className="h-3.5 w-3.5" />}
            label={t.renewPrivateLink}
            operation="renew_private_link"
          />
        </form>
        <form action={formAction}>
          <input name="locale" type="hidden" value={locale} />
          <input name="roomId" type="hidden" value={roomId} />
          <input name="seatId" type="hidden" value={seat.id} />
          <SeatManageSubmit
            disabled={seat.isHostSeat || !seat.isClaimed}
            full
            icon={<UserMinus className="h-3.5 w-3.5" />}
            label={t.releaseSeat}
            operation="release_seat"
            tone="coral"
          />
        </form>
      </div>
      {state.formError ? (
        <p className="mt-2 rounded-2xl bg-[#F09182]/12 px-3 py-2 text-xs font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}

function SeatManageSubmit({
  disabled,
  full,
  icon,
  label,
  operation,
  tone = "forest",
}: {
  disabled?: boolean;
  full?: boolean;
  icon: ReactNode;
  label: string;
  operation: "release_seat" | "renew_private_link" | "rename_seat";
  tone?: "coral" | "forest";
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "coral"
      ? "border-[#F09182] text-[#B5301F] hover:bg-[#FFF0EC]"
      : "border-[#8AB68E] text-[#156240] hover:bg-[#F1F2EC]";

  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border bg-white px-3 text-xs font-black shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45",
        toneClass,
        full && "w-full",
      )}
      disabled={disabled || pending}
      name="operation"
      type="submit"
      value={operation}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function HostCorrectionPanel({
  locale,
  room,
  t,
}: {
  locale: string;
  room: AvalonRoomView;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    correctAvalonRoomAction,
    initialState,
  );
  const canResetCurrentRound =
    room.status === "IN_PROGRESS" && room.state.phase !== "team_building";
  const canUndoMission = room.state.missionResults.some(Boolean);

  return (
    <section className="rounded-[2rem] border border-[#D6D5B2] bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240] shadow-inner">
          <Wrench className="h-5 w-5" />
        </span>
        <h2 className="text-base font-black text-[#1D1D1B]">{t.repair}</h2>
      </div>
      <form action={formAction} className="grid grid-cols-2 gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input name="roomId" type="hidden" value={room.id} />
        <CorrectionSubmitButton
          disabled={!canResetCurrentRound}
          image="/game-tools/avalon/states/round-reset-token.svg"
          label={t.resetRound}
          tone="forest"
          value="reset_current_round"
        />
        <CorrectionSubmitButton
          disabled={!canUndoMission}
          image="/game-tools/avalon/states/undo-mission-token.svg"
          label={t.undoMission}
          tone="coral"
          value="undo_last_mission"
        />
      </form>
      {state.formError ? (
        <p className="mt-3 rounded-2xl bg-[#F09182]/12 px-3 py-2 text-xs font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </section>
  );
}

function CorrectionSubmitButton({
  disabled,
  image,
  label,
  tone,
  value,
}: {
  disabled: boolean;
  image: string;
  label: string;
  tone: "coral" | "forest";
  value: string;
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "forest"
      ? "hover:border-[#8AB68E] hover:shadow-[#156240]/15"
      : "hover:border-[#F09182] hover:shadow-[#F09182]/20";

  return (
    <button
      className={cn(
        "group grid min-h-28 place-items-center overflow-hidden rounded-[1.35rem] border border-[#D6D5B2] bg-white px-2 py-3 text-center text-xs font-black text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45",
        toneClass,
      )}
      disabled={disabled || pending}
      name="correction"
      type="submit"
      value={value}
    >
      <Image
        alt=""
        className="h-14 w-14 object-contain drop-shadow-md transition group-hover:scale-105"
        height={64}
        src={image}
        width={64}
      />
      <span className="rounded-full bg-[#FEFFF9] px-2 py-0.5 shadow-sm">
        {label}
      </span>
    </button>
  );
}

function GameControlPanel({
  locale,
  room,
  t,
}: {
  locale: string;
  room: AvalonRoomView;
  t: Copy;
}) {
  if (room.status === "FINISHED" || room.state.phase === "finished") {
    const isGoodWinner = room.state.winner === "good";

    return (
      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-white">
        <Image
          alt=""
          className="h-36 w-full object-cover"
          height={240}
          src={
            isGoodWinner
              ? "/game-tools/avalon/states/good-victory.svg"
              : "/game-tools/avalon/states/evil-victory.svg"
          }
          width={420}
        />
        <div className="p-3 text-center">
          <p className="text-xl font-black text-[#0E2A5A]">
            {isGoodWinner ? t.goodWins : t.evilWins}
          </p>
        </div>
      </div>
    );
  }

  if (room.state.phase === "team_building") {
    return room.isHost ? (
      <TeamProposalForm locale={locale} room={room} t={t} />
    ) : (
      <StatusToken label={t.waiting} value={t.pickTeam} />
    );
  }

  if (room.state.phase === "team_vote") {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        <VoteImageCard
          image="/game-tools/avalon/states/vote-approve-card.svg"
          label={t.votes}
          value={`${room.progress.teamVoteSubmissionCount}/${room.playerCount}`}
        />
        <StatusToken label={t.team} value={room.state.proposedTeamSeatNumbers.length} />
      </div>
    );
  }

  if (room.state.phase === "mission") {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        <VoteImageCard
          image="/game-tools/avalon/states/mission-pending-token.svg"
          label={t.missionCards}
          value={`${room.progress.missionCardSubmissionCount}/${room.state.proposedTeamSeatNumbers.length}`}
        />
        <StatusToken label={t.fail} value={room.progress.failureThreshold} />
      </div>
    );
  }

  if (room.state.phase === "assassination") {
    return (
      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-white">
        <Image
          alt=""
          className="h-36 w-full object-cover"
          height={240}
          src="/game-tools/avalon/states/assassination-phase.svg"
          width={420}
        />
      </div>
    );
  }

  return (
    <p className="mt-4 rounded-2xl bg-[#F1F2EC] px-4 py-3 text-sm font-semibold text-[#156240]">
      {room.status === "IN_PROGRESS" ? t.roleRevealed : t.roleHidden}
    </p>
  );
}

function VoteImageCard({
  image,
  label,
  value,
}: {
  image: string;
  label: string;
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-white text-center shadow-sm">
      <div className="grid min-h-24 place-items-center bg-[#F1F2EC]/55 p-3">
        <Image alt="" className="h-16 w-16 drop-shadow-md" height={72} src={image} width={72} />
      </div>
      <div className="px-3 py-2">
        <p className="text-xl font-black text-[#0E2A5A]">{value}</p>
        <p className="text-xs font-black text-[#156240]/70">{label}</p>
      </div>
    </div>
  );
}

function StatusToken({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-[#D6D5B2] bg-[#F1F2EC]/70 p-4 text-center shadow-inner">
      <p className="text-3xl font-black text-[#0E2A5A]">{value}</p>
      <p className="mt-1 text-xs font-black text-[#156240]/70">{label}</p>
    </div>
  );
}

function TeamProposalForm({
  locale,
  room,
  t,
}: {
  locale: string;
  room: AvalonRoomView;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    proposeAvalonTeamAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={room.id} />
      <div className="grid grid-cols-5 gap-2">
        {room.seats.map((seat) => (
          <label
            className="group relative cursor-pointer"
            key={seat.id}
            title={seat.displayName}
          >
            <input
              className="peer sr-only"
              name="teamSeatNumbers"
              type="checkbox"
              value={seat.seatNumber}
            />
            <span className="relative grid h-16 place-items-center rounded-[1.25rem] border border-[#D6D5B2] bg-white text-sm font-black text-[#156240] shadow-sm transition peer-checked:-translate-y-0.5 peer-checked:border-[#156240] peer-checked:bg-[#156240] peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-[#156240]/20">
              {seat.seatNumber === room.state.currentLeaderSeatNumber ? (
                <Crown className="absolute -top-1.5 h-4 w-4 rounded-full bg-[#FFF5E6] p-0.5 text-[#156240] ring-1 ring-[#D6D5B2]" />
              ) : null}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F1F2EC] text-xs text-[#156240] peer-checked:bg-white">
                {seat.avatarLabel}
              </span>
              <span className="absolute bottom-1 text-[0.62rem] font-black opacity-80">
                {seat.seatNumber}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F1F2EC] px-3 py-2 shadow-inner">
        <span className="inline-flex items-center gap-2 text-xs font-black text-[#156240]">
          <Shield className="h-3.5 w-3.5" />
          {t.selectTeam}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-black text-[#0E2A5A] shadow-sm">
          {room.progress.requiredTeamSize}
        </span>
      </div>
      <TeamProposalSubmitButton label={t.proposeTeam} />
      {state.formError ? (
        <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function TeamProposalSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#156240] px-5 text-sm font-black text-white shadow-xl shadow-[#156240]/20 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <Shield className="h-4 w-4" />
      {label}
    </button>
  );
}

function RoundTable({ room, t }: { room: AvalonRoomView; t: Copy }) {
  return (
    <div className="relative mx-auto aspect-square w-[min(100%,19rem)] max-w-[19rem] sm:w-full sm:max-w-[26rem]">
      <div className="absolute inset-[13%] rounded-full border border-[#D6D5B2] bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.95),rgba(241,242,236,0.92)_58%,rgba(138,182,142,0.18))] shadow-2xl shadow-[#156240]/10" />
      <div className="absolute inset-[31%] grid place-items-center rounded-full border border-[#8AB68E]/40 bg-[#FEFFF9]/90 text-center shadow-inner">
        <Image
          alt=""
          className="h-14 w-14"
          height={64}
          src="/game-tools/avalon/avalon-tool-icon.svg"
          width={64}
        />
        <span className="sr-only">{t.table}</span>
      </div>

      {room.seats.map((seat, index) => {
        const angle = -90 + (360 / room.seats.length) * index;
        const radius = 41;
        const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
        const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

        return (
          <div
            className="absolute"
            key={seat.id}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={cn(
                "group relative grid h-12 w-12 place-items-center rounded-[1rem] border bg-white shadow-lg transition hover:-translate-y-1 sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[1.35rem]",
                seat.isViewerSeat
                  ? "border-[#369758] shadow-[#156240]/25 ring-4 ring-[#8AB68E]/20"
                  : seat.isOnProposedTeam
                    ? "border-[#F09182] shadow-[#F09182]/25 ring-4 ring-[#F09182]/15"
                  : seat.isClaimed
                    ? "border-[#8AB68E]/60 shadow-[#156240]/15"
                    : "border-[#D6D5B2] opacity-75",
              )}
            >
              <div
                className={cn(
                  "absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white",
                  seat.isClaimed ? "bg-[#369758]" : "bg-[#D6D5B2]",
                )}
              />
              {seat.isHostSeat ? (
                <Crown className="absolute -left-1 -top-1 h-4 w-4 rounded-full bg-[#FFF5E6] p-0.5 text-[#156240] ring-1 ring-[#D6D5B2]" />
              ) : null}
              <Image
                alt=""
                className="h-6 w-6 sm:h-10 sm:w-10"
                height={48}
                src="/game-tools/avalon/player-ready-token.svg"
                width={48}
              />
              <span className="absolute bottom-0.5 rounded-full bg-white/90 px-1.5 text-[0.58rem] font-black text-[#156240] shadow-sm sm:bottom-1 sm:text-[0.65rem]">
                {seat.seatNumber}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeatCard({
  locale,
  roomId,
  roomStatus,
  seat,
  t,
}: {
  locale: string;
  roomId: string;
  roomStatus: string;
  seat: AvalonRoomSeat;
  t: Copy;
}) {
  const canClaim = roomStatus === "LOBBY" && !seat.isClaimed;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5",
        seat.isViewerSeat
          ? "border-[#369758] shadow-[#156240]/20"
          : seat.isOnProposedTeam
            ? "border-[#F09182] shadow-[#F09182]/15"
          : "border-[#D6D5B2]",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          seat.roleAlignment === "evil"
            ? "bg-[#B5301F]"
            : seat.roleAlignment === "good"
              ? "bg-[#156240]"
              : "bg-[#D6D5B2]",
        )}
      />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border bg-[#FEFFF9] text-lg font-black shadow-md",
            seat.roleAlignment === "evil"
              ? "border-[#B5301F]/30"
              : seat.roleAlignment === "good"
                ? "border-[#156240]/30"
                : "border-[#D6D5B2]",
          )}
        >
          <Image
            alt=""
            className="h-10 w-10"
            height={44}
            src="/game-tools/avalon/player-ready-token.svg"
            width={44}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-black text-[#1D1D1B]">
              {seat.displayName}
            </h3>
            {seat.isHostSeat ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E6] px-2 py-0.5 text-[0.68rem] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
                <Crown className="h-3 w-3" />
                {t.host}
              </span>
            ) : null}
            {seat.isViewerSeat ? (
              <span className="rounded-full bg-[#DEEBFF] px-2 py-0.5 text-[0.68rem] font-black text-[#0E2A5A]">
                {t.viewerSeat}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-[#156240]/70">
            {t.seat} {seat.seatNumber} ·{" "}
            {seat.isClaimed ? t.ready : t.emptySeat}
          </p>
          <p className="mt-2 rounded-full bg-[#F1F2EC] px-3 py-1 text-xs font-bold text-[#156240]">
            {seat.roleLabel ?? t.roleHidden}
          </p>
          {seat.privateToken ? (
            <a
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#156240] px-3 text-xs font-black text-white shadow-lg shadow-[#156240]/15 transition hover:-translate-y-0.5"
              href={`/${locale}/game-tools/avalon/seats/${seat.privateToken}`}
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {t.myIdentity}
            </a>
          ) : null}
        </div>
      </div>

      {canClaim ? (
        <ClaimSeatForm locale={locale} roomId={roomId} seat={seat} t={t} />
      ) : null}
    </article>
  );
}

function ClaimSeatForm({
  locale,
  roomId,
  seat,
  t,
}: {
  locale: string;
  roomId: string;
  seat: AvalonRoomSeat;
  t: Copy;
}) {
  const [state, formAction] = useActionState(joinAvalonRoomAction, initialState);

  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={roomId} />
      <input name="seatNumber" type="hidden" value={seat.seatNumber} />
      <input
        className="h-10 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-sm font-semibold text-[#1D1D1B] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
        maxLength={40}
        name="displayName"
        placeholder={t.namePlaceholder}
      />
      <p className="text-xs leading-5 text-[#156240]/65">{t.joinHint}</p>
      <ClaimSeatSubmitButton label={t.claimSeat} />
      {state.formError ? (
        <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-xs font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function ClaimSeatSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#156240] px-4 text-sm font-bold text-white shadow-lg shadow-[#156240]/15 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <UserRoundPlus className="h-4 w-4" />
      {label}
    </button>
  );
}

function StartRoomForm({
  locale,
  roomId,
  t,
}: {
  locale: string;
  roomId: string;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    startAvalonRoomAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={roomId} />
      <StartRoomSubmitButton label={t.start} />
      {state.formError ? (
        <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function StartRoomSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F09182] px-5 text-sm font-black text-white shadow-xl shadow-[#F09182]/25 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <Image
        alt=""
        className="h-6 w-6 object-contain"
        height={28}
        src="/game-tools/avalon/avalon-tool-icon.svg"
        width={28}
      />
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function CopyButton({
  compact = false,
  label,
  successLabel,
  value,
}: {
  compact?: boolean;
  label: string;
  successLabel: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const icon = copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />;
  const buttonLabel = copied ? successLabel : label;
  const canCopy = Boolean(value);
  const handleCopy = async () => {
    if (!canCopy) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border border-[#8AB68E]/45 bg-white text-xs font-bold text-[#156240] transition hover:-translate-y-0.5 hover:bg-[#F1F2EC] disabled:opacity-50",
        compact ? "h-8 w-8" : "h-9 px-3",
      )}
      disabled={!canCopy}
      onClick={handleCopy}
      type="button"
    >
      {compact ? <Link2 className="h-4 w-4" /> : icon}
      {compact ? null : buttonLabel}
    </button>
  );
}
