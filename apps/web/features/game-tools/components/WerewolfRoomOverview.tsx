"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Check,
  Crown,
  HeartPulse,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Shield,
  Skull,
  Ticket,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  claimWerewolfSeatAction,
  joinWerewolfRoomAction,
  leaveWerewolfSeatAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import { WerewolfQrCode } from "@/features/game-tools/components/WerewolfQrCode";
import { WerewolfTestBotPanel } from "@/features/game-tools/components/WerewolfTestBotPanel";
import { getWerewolfRoleCardImage } from "@/features/game-tools/werewolfCardAssets";
import { withLocale } from "@/lib/routes";

type WerewolfRoomOverviewProps = {
  baseUrl: string;
  locale: string;
  room: {
    code: string;
    currentMember: {
      avatarLabel: string;
      displayName: string;
      id: string;
      isGuest: boolean;
      memberToken: string | null;
      readyAt: string | null;
      seatedPrivateToken: string | null;
      seatedSeatId: string | null;
      seatedSeatNumber: number | null;
    } | null;
    events: Array<{
      actorName: string | null;
      createdAt: string;
      id: string;
      type: string;
    }>;
    host: {
      nickname: string;
    };
    id: string;
    isHost: boolean;
    members: Array<{
      avatarLabel: string;
      displayName: string;
      id: string;
      isCurrentMember: boolean;
      isGuest: boolean;
      lastSeenAt: string;
      readyAt: string | null;
      seatedSeatId: string | null;
      seatedSeatNumber: number | null;
    }>;
    seats: Array<{
      avatarLabel: string;
      displayName: string;
      id: string;
      isClaimed: boolean;
      isDead: boolean;
      isJudgeSeat: boolean;
      isPlayerSeat: boolean;
      isViewerSeat: boolean;
      privateToken: string | null;
      readyAt: string | null;
      roleKey: string | null;
      roleLabel: string | null;
      seatNumber: number;
    }>;
    state: {
      phase: string;
      winner?: "GOOD" | "WEREWOLF" | null;
    };
    status: string;
    title: string;
    variant: {
      label: string;
      playerSeatCount: number;
      totalSeats: number;
    };
  };
  testBotsEnabled?: boolean;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Tous les outils",
      boundary:
        "Scannez, choisissez une place, puis lancez les rôles quand tout le monde est prêt.",
      changeSeat: "Changer",
      claimError: "Impossible de modifier la place.",
      code: "Code",
      currentMember: "Vous",
      dead: "Mort",
      empty: "Libre",
      enterMember: "Entrer",
      events: "Dernières actions",
      finished: "Partie terminée",
      foundation: "Loups-garous",
      host: "Hôte",
      joinFirst: "Entrez un nom d'abord",
      joinName: "Nom",
      judge: "Maître",
      leaveSeat: "Quitter",
      lobby: "Avant la partie",
      locked: "La partie a commencé.",
      members: "À placer",
      noMembers: "Personne en attente.",
      openSeat: "Ma place",
      playerSeats: "Places",
      playerUnit: "joueurs",
      publicScreen: "Écran public",
      ready: "Prêt",
      alive: "Vivant",
      recap: "Récap",
      running: "En cours",
      seatedAt: "Place",
      selectSeat: "Choisir",
      scanJoin: "Scanner pour entrer",
      share: "Invitation",
      status: "Statut",
      unready: "Pas prêt",
      waitingMember: "Entrez un nom, puis choisissez une place.",
      winnerGood: "Village gagnant",
      winnerWerewolf: "Loups gagnants",
    };
  }

  if (locale === "en") {
    return {
      back: "All tools",
      boundary:
        "Scan in, pick seats, then deal roles when the table is ready.",
      changeSeat: "Switch",
      claimError: "Could not update the seat.",
      code: "Code",
      currentMember: "You",
      dead: "Dead",
      empty: "Open",
      enterMember: "Enter",
      events: "Latest moves",
      finished: "Game finished",
      foundation: "Werewolf",
      host: "Host",
      joinFirst: "Enter a name first",
      joinName: "Name",
      judge: "Judge",
      leaveSeat: "Leave",
      lobby: "Before game",
      locked: "The game has started.",
      members: "Waiting to sit",
      noMembers: "No one is waiting.",
      openSeat: "My seat",
      playerSeats: "Player seats",
      playerUnit: "players",
      publicScreen: "Public screen",
      ready: "Ready",
      alive: "Alive",
      recap: "Recap",
      running: "In progress",
      seatedAt: "Seat",
      selectSeat: "Choose",
      scanJoin: "Scan to join",
      share: "Invite link",
      status: "Status",
      unready: "Not ready",
      waitingMember: "Enter a name, then choose a seat.",
      winnerGood: "Good team wins",
      winnerWerewolf: "Werewolf team wins",
    };
  }

  return {
    back: "全部工具",
    boundary: "扫码入座，人齐发身份。现场照常聊、投票、走夜晚。",
    changeSeat: "换座",
    claimError: "座位操作失败。",
    code: "房号",
    currentMember: "我",
    dead: "死亡",
    empty: "空位",
    enterMember: "进入房间",
    events: "最近记录",
    finished: "本局已结束",
    foundation: "狼人杀",
    host: "房主",
    joinFirst: "先输入昵称",
    joinName: "昵称",
    judge: "法官",
    leaveSeat: "离座",
    lobby: "开局前",
    locked: "本局已经开始。",
    members: "待入座",
    noMembers: "没人等座。",
    openSeat: "身份页",
    playerSeats: "座位",
    playerUnit: "玩家",
    publicScreen: "公共屏",
    ready: "已准备",
    alive: "存活",
    recap: "复盘",
    running: "游戏中",
    seatedAt: "座位",
    selectSeat: "入座",
    scanJoin: "扫码进入房间",
    share: "邀请链接",
    status: "进度",
    unready: "未准备",
    waitingMember: "取个昵称入房。",
    winnerGood: "好人阵营获胜",
    winnerWerewolf: "狼人阵营获胜",
  };
}

const initialState: WerewolfRoomActionState = {};

function SubmitButton({
  className,
  disabled = false,
  label,
}: {
  className?: string;
  disabled?: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        className ??
        "inline-flex h-9 items-center justify-center rounded-full bg-[#7A1F2B] px-3 text-xs font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
      }
      disabled={pending || disabled}
      type="submit"
    >
      {label}
    </button>
  );
}

function getStatusLabel({
  isClaimed,
  isDead,
  isLocked,
  isReady,
  t,
}: {
  isClaimed: boolean;
  isDead: boolean;
  isLocked: boolean;
  isReady: boolean;
  t: ReturnType<typeof getCopy>;
}) {
  if (!isClaimed) {
    return t.empty;
  }

  if (isDead) {
    return t.dead;
  }

  if (isLocked) {
    return t.alive;
  }

  return isReady ? t.ready : t.unready;
}

function getRoomStatusLabel({
  room,
  t,
}: {
  room: WerewolfRoomOverviewProps["room"];
  t: ReturnType<typeof getCopy>;
}) {
  if (room.status === "FINISHED") {
    return t.finished;
  }

  if (room.status === "IN_PROGRESS") {
    return t.running;
  }

  return t.lobby;
}

function getEventLabel(type: string, locale: string) {
  const labels: Record<string, Record<string, string>> = {
    werewolf_member_joined: {
      "zh-CN": "进房间",
      en: "Joined",
      fr: "Entrée",
    },
    werewolf_player_marked_dead: {
      "zh-CN": "出局",
      en: "Out",
      fr: "Élimination",
    },
    werewolf_player_revived: {
      "zh-CN": "回到场上",
      en: "Back in",
      fr: "Retour",
    },
    werewolf_ready_changed: {
      "zh-CN": "准备更新",
      en: "Ready update",
      fr: "Prêt",
    },
    werewolf_room_created: {
      "zh-CN": "开桌",
      en: "Table opened",
      fr: "Table ouverte",
    },
    werewolf_room_finished: {
      "zh-CN": "结算",
      en: "Result",
      fr: "Résultat",
    },
    werewolf_room_started: {
      "zh-CN": "发身份",
      en: "Roles dealt",
      fr: "Rôles donnés",
    },
    werewolf_seat_changed: {
      "zh-CN": "换座",
      en: "Seat switched",
      fr: "Place changée",
    },
    werewolf_seat_claimed: {
      "zh-CN": "入座",
      en: "Seated",
      fr: "Place prise",
    },
    werewolf_seat_left: {
      "zh-CN": "离座",
      en: "Left seat",
      fr: "Place quittée",
    },
    werewolf_test_bots_filled: {
      "zh-CN": "测试补位",
      en: "Test seats filled",
      fr: "Places test ajoutées",
    },
    werewolf_test_bots_readied: {
      "zh-CN": "测试准备",
      en: "Test ready",
      fr: "Prêt test",
    },
    werewolf_test_flow_started: {
      "zh-CN": "测试开局",
      en: "Test start",
      fr: "Départ test",
    },
    werewolf_test_phase_advanced: {
      "zh-CN": "测试推进",
      en: "Test step",
      fr: "Étape test",
    },
  };

  return labels[type]?.[locale] ?? labels[type]?.en ?? type;
}

export function WerewolfRoomOverview({
  baseUrl,
  locale,
  room,
  testBotsEnabled = false,
}: WerewolfRoomOverviewProps) {
  const [joinState, joinAction] = useActionState(
    joinWerewolfRoomAction,
    initialState,
  );
  const [seatState, seatAction] = useActionState(
    claimWerewolfSeatAction,
    initialState,
  );
  const [leaveState, leaveAction] = useActionState(
    leaveWerewolfSeatAction,
    initialState,
  );
  const t = getCopy(locale);
  const joinUrl = `${baseUrl}${withLocale(
    locale,
    `/game-tools/werewolf/join/${room.code}`,
  )}`;
  const recapHref = withLocale(
    locale,
    `/game-tools/werewolf/rooms/${room.id}/recap`,
  );
  const screenHref = withLocale(
    locale,
    `/game-tools/werewolf/rooms/${room.id}/screen`,
  );
  const isLobby = room.status === "LOBBY";
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const judgeSeat = room.seats.find((seat) => seat.isJudgeSeat);
  const unseatedMembers = room.members.filter(
    (member) => !member.seatedSeatNumber,
  );
  const currentMemberToken = room.currentMember?.memberToken ?? "";
  const canChooseSeat = Boolean(room.currentMember) && isLobby;
  const winnerLabel =
    room.state.winner === "GOOD"
      ? t.winnerGood
      : room.state.winner === "WEREWOLF"
        ? t.winnerWerewolf
        : null;
  const statusLabel = getRoomStatusLabel({ room, t });

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#7A1F2B] shadow-sm transition hover:bg-[#FFF7F1]"
        href={withLocale(locale, "/game-tools/werewolf")}
      >
        <ArrowLeft className="h-4 w-4" />
        {t.back}
      </Link>

      <section className="overflow-hidden rounded-[1.4rem] border border-[#D9C7B4] bg-[#141820] p-4 text-white shadow-[0_18px_48px_rgba(30,23,24,0.12)] sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white">
              <Moon className="h-3.5 w-3.5" />
              {t.foundation}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal text-white sm:text-4xl">
              {room.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/70">
              {t.boundary}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1.1rem] border border-white/12 bg-white/10 p-2 text-white backdrop-blur lg:grid-cols-1">
            <div className="rounded-[0.8rem] bg-white/10 px-3 py-2">
              <p className="text-[11px] font-black text-white/52">{t.code}</p>
              <p className="mt-1 font-mono text-base font-black tracking-[0.18em] text-[#F0C36A]">
                {room.code}
              </p>
            </div>
            <div className="rounded-[0.8rem] bg-white/10 px-3 py-2">
              <p className="text-[11px] font-black text-white/52">{t.status}</p>
              <p className="mt-1 truncate text-sm font-black">{statusLabel}</p>
            </div>
            <div className="rounded-[0.8rem] bg-white/10 px-3 py-2">
              <p className="text-[11px] font-black text-white/52">{t.host}</p>
              <p className="mt-1 truncate text-sm font-black">
                {room.host.nickname}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm sm:p-5">
          {room.status === "FINISHED" ? (
            <div className="mb-4 rounded-[1rem] border border-[#D9C7B4] bg-[#1E1718] px-4 py-3 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/62">
                {t.finished}
              </p>
              {winnerLabel ? (
                <p className="mt-1 text-lg font-black text-[#F0C36A]">
                  {winnerLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#1E1718]">
                {t.playerSeats}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#7A1F2B]/72">
                {room.variant.label} · {room.variant.playerSeatCount}{" "}
                {t.playerUnit} + 1 {t.judge}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F4ECE6] px-3 py-1.5 text-xs font-black text-[#7A1F2B]">
              <UsersRound className="h-3.5 w-3.5" />
              {playerSeats.filter((seat) => seat.isClaimed).length}/
              {playerSeats.length}
            </span>
          </div>

          {seatState.formError ? (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {seatState.formError || t.claimError}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {playerSeats.map((seat) => {
              const isCurrentSeat =
                seat.isViewerSeat ||
                room.currentMember?.seatedSeatNumber === seat.seatNumber;
              const emptySeatActionLabel = room.currentMember?.seatedSeatNumber
                ? t.changeSeat
                : t.selectSeat;
              const showSeatStatus =
                seat.isClaimed || seat.isDead || room.status !== "LOBBY";
              const statusLabel = getStatusLabel({
                isClaimed: seat.isClaimed,
                isDead: seat.isDead,
                isLocked: room.status !== "LOBBY",
                isReady: Boolean(seat.readyAt),
                t,
              });
              const roleCard =
                room.status === "FINISHED"
                  ? getWerewolfRoleCardImage(seat.roleKey, locale)
                  : null;

              if (!seat.isClaimed && isLobby && canChooseSeat) {
                return (
                  <form action={seatAction} key={seat.id}>
                    <input name="locale" type="hidden" value={locale} />
                    <input name="roomId" type="hidden" value={room.id} />
                    <input
                      name="memberToken"
                      type="hidden"
                      value={currentMemberToken}
                    />
                    <input
                      name="seatNumber"
                      type="hidden"
                      value={seat.seatNumber}
                    />
                    <button
                      className="group grid min-h-[7.5rem] w-full content-between overflow-hidden rounded-[1.1rem] border border-dashed border-[#D9C7B4] bg-[#FFFDF7] p-2.5 text-center transition duration-200 hover:border-[#7A1F2B] hover:bg-[#FFF7F1] hover:shadow-[0_12px_26px_rgba(122,31,43,0.10)] disabled:cursor-not-allowed disabled:opacity-55"
                      type="submit"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black text-[#7A1F2B] shadow-sm">
                        {seat.seatNumber}
                      </span>
                      <span className="grid place-items-center gap-1.5">
                        <span className="grid h-12 w-12 place-items-center rounded-full border border-[#D9C7B4] bg-white text-[#7A1F2B] transition group-hover:scale-105 group-hover:bg-[#7A1F2B] group-hover:text-white">
                          <Plus className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-black text-[#1E1718]">
                          {emptySeatActionLabel}
                        </span>
                      </span>
                      <span className="h-7" />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  className={`group relative grid min-h-[7.5rem] content-between overflow-hidden rounded-[1.1rem] border p-2.5 text-center transition duration-200 ${
                    seat.isDead
                      ? "border-[#C8B9AA] bg-[#E8E1D8] grayscale"
                      : isCurrentSeat
                        ? "border-[#7A1F2B] bg-[#FFF7F1] shadow-[0_12px_26px_rgba(122,31,43,0.12)]"
                        : seat.isClaimed
                          ? "border-[#D9C7B4] bg-white shadow-sm"
                          : "border-[#D9C7B4] bg-[#FFFDF7] hover:border-[#7A1F2B]/45"
                  }`}
                  key={seat.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                      {seat.seatNumber}
                    </span>
                    {showSeatStatus ? (
                      <span
                        className={`inline-flex h-7 max-w-[5.5rem] items-center gap-1 rounded-full px-2 text-[11px] font-black ${
                          seat.isDead
                            ? "bg-[#1E1718] text-white"
                            : seat.readyAt || room.status !== "LOBBY"
                              ? "bg-[#EAF6E7] text-[#36624A]"
                              : "bg-[#F4ECE6] text-[#7A1F2B]"
                        }`}
                      >
                        {seat.isDead ? (
                          <Skull className="h-3 w-3" />
                        ) : seat.isClaimed && room.status !== "LOBBY" ? (
                          <HeartPulse className="h-3 w-3" />
                        ) : null}
                        <span className="truncate">{statusLabel}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="grid place-items-center gap-1">
                    {roleCard ? (
                      <span
                        className={`aspect-[2/3] h-16 overflow-hidden rounded-[0.65rem] border border-[#D9C7B4] bg-white shadow-sm ${
                          seat.isDead ? "grayscale" : ""
                        }`}
                      >
                        <img
                          alt={seat.roleLabel ?? ""}
                          className="h-full w-full object-cover"
                          draggable={false}
                          src={roleCard}
                        />
                      </span>
                    ) : (
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-full text-base font-black ${
                          seat.isClaimed
                            ? "bg-[#1E1718] text-white"
                            : "border border-dashed border-[#D9C7B4] bg-white text-[#7A1F2B]/42"
                        }`}
                      >
                        {seat.isClaimed ? (
                          seat.avatarLabel
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                      </span>
                    )}
                    <p className="w-full truncate text-sm font-black text-[#1E1718]">
                      {seat.isClaimed ? seat.displayName : t.empty}
                    </p>
                    {room.status === "FINISHED" && seat.roleLabel ? (
                      <p className="max-w-full truncate rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#7A1F2B]">
                        {seat.roleLabel}
                      </p>
                    ) : null}
                  </div>

                  {isCurrentSeat && seat.privateToken ? (
                    <div className="mt-3 grid gap-1.5">
                      <Link
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D]"
                        href={withLocale(
                          locale,
                          `/game-tools/werewolf/seats/${seat.privateToken}`,
                        )}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        {t.openSeat}
                      </Link>
                      {isLobby ? (
                        <form action={leaveAction}>
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="privateToken"
                            type="hidden"
                            value={seat.privateToken}
                          />
                          <SubmitButton
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#D9C7B4] bg-white px-3 text-xs font-black text-[#7A1F2B] transition hover:bg-[#FFF7F1] disabled:cursor-not-allowed disabled:opacity-55"
                            label={t.leaveSeat}
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <WerewolfQrCode label={t.scanJoin} value={joinUrl} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D]"
                href={screenHref}
                target="_blank"
              >
                <Monitor className="h-3.5 w-3.5" />
                {t.publicScreen}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#D9C7B4] bg-[#FFFDF7] px-3 text-xs font-black text-[#7A1F2B] transition hover:bg-[#FFF7F1]"
                href={recapHref}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.recap}
              </Link>
            </div>
          </div>

          {testBotsEnabled && room.isHost ? (
            <WerewolfTestBotPanel locale={locale} room={room} />
          ) : null}

          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-[#1E1718] p-4 text-white shadow-sm">
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <Crown className="h-4 w-4 text-[#F0C36A]" />
              {t.judge}
            </span>
            <div className="mt-4 grid min-h-36 place-items-center rounded-[1rem] border border-white/12 bg-white/8 p-3 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-black text-[#1E1718]">
                {judgeSeat?.seatNumber ?? "J"}
              </span>
              <p className="mt-2 text-sm font-black">
                {judgeSeat?.isClaimed ? judgeSeat.displayName : t.empty}
              </p>
              {judgeSeat?.isClaimed ? (
                <p className="mt-1 text-xs font-bold text-white/62">
                  {judgeSeat.readyAt ? t.ready : t.unready}
                </p>
              ) : null}
              {judgeSeat && !judgeSeat.isClaimed && isLobby ? (
                canChooseSeat ? (
                  <form action={seatAction} className="mt-3 grid w-full gap-1.5">
                    <input name="locale" type="hidden" value={locale} />
                    <input name="roomId" type="hidden" value={room.id} />
                    <input
                      name="memberToken"
                      type="hidden"
                      value={currentMemberToken}
                    />
                    <input
                      name="seatNumber"
                      type="hidden"
                      value={judgeSeat.seatNumber}
                    />
                    <SubmitButton
                      className="inline-flex h-9 items-center justify-center rounded-full bg-white px-3 text-xs font-black text-[#1E1718] transition hover:bg-[#F4ECE6] disabled:cursor-not-allowed disabled:opacity-55"
                      label={
                        room.currentMember?.seatedSeatNumber
                          ? t.changeSeat
                          : t.selectSeat
                      }
                    />
                  </form>
                ) : (
                  <p className="mt-3 text-xs font-bold text-white/62">
                    {t.joinFirst}
                  </p>
                )
              ) : null}
              {judgeSeat?.isViewerSeat && judgeSeat.privateToken ? (
                <div className="mt-3 grid w-full gap-1.5">
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-[#1E1718] transition hover:bg-[#F4ECE6]"
                    href={withLocale(
                      locale,
                      `/game-tools/werewolf/seats/${judgeSeat.privateToken}`,
                    )}
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    {t.openSeat}
                  </Link>
                  {isLobby ? (
                    <form action={leaveAction}>
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={judgeSeat.privateToken}
                      />
                      <SubmitButton
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.leaveSeat}
                      />
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <span className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <Shield className="h-4 w-4 text-[#7A1F2B]" />
              {t.members}
            </span>

            {room.currentMember ? (
              <div className="mt-3 rounded-[1rem] border border-[#D9C7B4] bg-[#FFF7F1] p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A1F2B]/70">
                  {t.currentMember}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                    {room.currentMember.avatarLabel}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#1E1718]">
                      {room.currentMember.displayName}
                    </p>
                    <p className="text-xs font-bold text-[#7A1F2B]/68">
                      {room.currentMember.seatedSeatNumber
                        ? `${t.seatedAt} ${room.currentMember.seatedSeatNumber}`
                        : t.members}
                    </p>
                  </div>
                </div>
              </div>
            ) : isLobby ? (
              <form
                action={joinAction}
                className="mt-3 grid gap-2 rounded-[1rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3"
              >
                <input name="locale" type="hidden" value={locale} />
                <input name="roomId" type="hidden" value={room.id} />
                <p className="text-sm font-bold leading-6 text-[#7A1F2B]/72">
                  {t.waitingMember}
                </p>
                <input
                  className="h-10 min-w-0 rounded-full border border-[#D9C7B4] bg-white px-3 text-sm font-bold text-[#1E1718] outline-none focus:border-[#7A1F2B]"
                  maxLength={40}
                  name="displayName"
                  placeholder={t.joinName}
                />
                <SubmitButton
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-4 text-sm font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
                  label={t.enterMember}
                />
                {joinState.formError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {joinState.formError}
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="mt-3 text-sm font-bold leading-6 text-[#7A1F2B]/72">
                {t.locked}
              </p>
            )}

            <div className="mt-3 space-y-2">
              {unseatedMembers.length ? (
                unseatedMembers.map((member) => (
                  <div
                    className="flex items-center gap-2 rounded-2xl bg-[#F7F3EC] px-3 py-2"
                    key={member.id}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1E1718] text-xs font-black text-white">
                      {member.avatarLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-[#1E1718]">
                      {member.displayName}
                    </span>
                    {member.isCurrentMember ? (
                      <Check className="h-4 w-4 text-[#7A1F2B]" />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-[#7A1F2B]/70">
                  {t.noMembers}
                </p>
              )}
            </div>

            {leaveState.formError ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {leaveState.formError}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <UserPlus className="h-4 w-4 text-[#7A1F2B]" />
              {t.events}
            </h2>
            <div className="mt-3 space-y-2">
              {room.events.length ? (
                room.events.slice(0, 4).map((event) => (
                  <div
                    className="flex items-center gap-2 rounded-2xl bg-[#F7F3EC] px-3 py-2 text-xs font-bold text-[#7A1F2B]"
                    key={event.id}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#7A1F2B]">
                      <UserPlus className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{getEventLabel(event.type, locale)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-[#7A1F2B]/70">-</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
