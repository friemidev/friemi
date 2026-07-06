"use client";

import { Crown, HeartPulse, Moon, Skull, UsersRound } from "lucide-react";
import { WerewolfQrCode } from "@/features/game-tools/components/WerewolfQrCode";
import type { WerewolfRoomState } from "@/features/game-tools/werewolfRoomState";
import { cn } from "@/lib/utils";

type WerewolfPublicSeat = {
  avatarLabel: string;
  displayName: string;
  id: string;
  isClaimed: boolean;
  isDead: boolean;
  isJudgeSeat: boolean;
  isPlayerSeat: boolean;
  readyAt: string | null;
  roleLabel: string | null;
  seatNumber: number;
};

type WerewolfPublicScreenProps = {
  joinUrl: string;
  locale: string;
  room: {
    code: string;
    events: Array<{
      createdAt: string;
      id: string;
      type: string;
    }>;
    seats: WerewolfPublicSeat[];
    state: WerewolfRoomState;
    status: string;
    title: string;
    variant: {
      label: string;
      playerSeatCount: number;
      totalSeats: number;
    };
  };
};

const copy = {
  "zh-CN": {
    alive: "存活",
    dead: "死亡",
    events: "最新记录",
    finished: "本局结束",
    goodWins: "好人阵营获胜",
    join: "扫码进入",
    judge: "法官",
    lobby: "等待入座",
    players: "玩家",
    ready: "已准备",
    roomCode: "房号",
    running: "游戏进行中",
    seats: "座位",
    unready: "未准备",
    werewolfWins: "狼人阵营获胜",
  },
  en: {
    alive: "Alive",
    dead: "Dead",
    events: "Latest",
    finished: "Finished",
    goodWins: "Good team wins",
    join: "Scan to join",
    judge: "Judge",
    lobby: "Lobby",
    players: "Players",
    ready: "Ready",
    roomCode: "Code",
    running: "In progress",
    seats: "Seats",
    unready: "Not ready",
    werewolfWins: "Werewolf team wins",
  },
  fr: {
    alive: "Vivant",
    dead: "Mort",
    events: "Dernières actions",
    finished: "Terminée",
    goodWins: "Village gagnant",
    join: "Scanner",
    judge: "Maître",
    lobby: "Accueil",
    players: "Joueurs",
    ready: "Prêt",
    roomCode: "Code",
    running: "En cours",
    seats: "Places",
    unready: "Pas prêt",
    werewolfWins: "Loups gagnants",
  },
};

function getStatusLabel({
  room,
  t,
}: {
  room: WerewolfPublicScreenProps["room"];
  t: (typeof copy)[keyof typeof copy];
}) {
  if (room.status === "FINISHED") {
    return room.state.winner === "GOOD"
      ? t.goodWins
      : room.state.winner === "WEREWOLF"
        ? t.werewolfWins
        : t.finished;
  }

  if (room.status === "IN_PROGRESS") {
    return t.running;
  }

  return t.lobby;
}

function getEventLabel(type: string, locale: string) {
  const labels: Record<string, Record<string, string>> = {
    werewolf_member_joined: {
      "zh-CN": "成员进入",
      en: "Member joined",
      fr: "Entrée",
    },
    werewolf_player_marked_dead: {
      "zh-CN": "标记死亡",
      en: "Marked dead",
      fr: "Mort marqué",
    },
    werewolf_player_revived: {
      "zh-CN": "取消死亡",
      en: "Revived",
      fr: "Réanimer",
    },
    werewolf_ready_changed: {
      "zh-CN": "准备变化",
      en: "Ready changed",
      fr: "Prêt changé",
    },
    werewolf_room_created: {
      "zh-CN": "创建房间",
      en: "Room created",
      fr: "Table créée",
    },
    werewolf_room_finished: {
      "zh-CN": "游戏结束",
      en: "Game finished",
      fr: "Partie terminée",
    },
    werewolf_room_started: {
      "zh-CN": "游戏开始",
      en: "Game started",
      fr: "Partie lancée",
    },
    werewolf_seat_changed: {
      "zh-CN": "换座",
      en: "Seat changed",
      fr: "Place changée",
    },
    werewolf_seat_claimed: {
      "zh-CN": "落座",
      en: "Seat claimed",
      fr: "Place prise",
    },
  };

  return labels[type]?.[locale] ?? labels[type]?.en ?? type;
}

function formatTime(locale: string, value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function WerewolfPublicScreen({
  joinUrl,
  locale,
  room,
}: WerewolfPublicScreenProps) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const judgeSeat = room.seats.find((seat) => seat.isJudgeSeat);
  const claimedPlayerCount = playerSeats.filter((seat) => seat.isClaimed).length;
  const deadCount = playerSeats.filter((seat) => seat.isDead).length;
  const aliveCount = Math.max(0, claimedPlayerCount - deadCount);
  const statusLabel = getStatusLabel({ room, t });
  const showRoles = room.status === "FINISHED";

  return (
    <section className="min-h-[calc(100svh-6rem)] overflow-hidden rounded-[2rem] border border-[#D9C7B4] bg-[#FFFDF7] shadow-2xl shadow-[#1E1718]/12">
      <div className="grid min-h-[calc(100svh-6rem)] gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:p-8">
        <div className="grid content-between gap-6">
          <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_32rem] xl:items-start">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#7A1F2B]">
                <Moon className="h-4 w-4" />
                Friemi Werewolf
              </p>
              <h1 className="mt-3 max-w-5xl text-4xl font-black leading-[1.02] tracking-normal text-[#1E1718] md:text-6xl">
                {room.title}
              </h1>
              <p className="mt-3 text-lg font-black text-[#7A1F2B]">
                {statusLabel}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <PublicStat label={t.players} value={`${claimedPlayerCount}/${room.variant.playerSeatCount}`} />
              <PublicStat label={t.alive} tone="alive" value={aliveCount} />
              <PublicStat label={t.dead} tone="dead" value={deadCount} />
              <PublicStat label={t.seats} value={room.variant.totalSeats} />
            </div>
          </header>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-6">
            {playerSeats.map((seat) => (
              <div
                className={cn(
                  "relative grid min-h-32 place-items-center rounded-[1.3rem] border bg-white p-3 text-center shadow-lg transition",
                  seat.isDead
                    ? "border-[#C8B9AA] bg-[#E8E1D8] grayscale"
                    : seat.isClaimed
                      ? "border-[#7A1F2B]/35"
                      : "border-[#D9C7B4] opacity-60",
                )}
                key={seat.id}
              >
                <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                  {seat.seatNumber}
                </span>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1E1718] text-lg font-black text-white">
                  {seat.isClaimed ? seat.avatarLabel : seat.seatNumber}
                </span>
                <span className="line-clamp-1 max-w-full text-sm font-black text-[#1E1718]">
                  {seat.displayName}
                </span>
                {showRoles && seat.roleLabel ? (
                  <span className="line-clamp-1 max-w-full rounded-full bg-[#F4ECE6] px-2 py-1 text-[0.68rem] font-black text-[#7A1F2B]">
                    {seat.roleLabel}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-black",
                      seat.isDead
                        ? "bg-[#1E1718] text-white"
                        : "bg-[#F4ECE6] text-[#7A1F2B]",
                    )}
                  >
                    {seat.isDead ? (
                      <Skull className="h-3 w-3" />
                    ) : (
                      <HeartPulse className="h-3 w-3" />
                    )}
                    {seat.isDead ? t.dead : room.status === "LOBBY" ? seat.readyAt ? t.ready : t.unready : t.alive}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="grid content-between gap-5">
          <div className="rounded-[1.5rem] border border-[#D9C7B4] bg-[#1E1718] p-5 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">
              {t.roomCode}
            </p>
            <p className="mt-2 font-mono text-5xl font-black tracking-[0.18em] text-[#F0C36A]">
              {room.code}
            </p>
            <div className="mt-5 rounded-[1rem] border border-white/12 bg-white/8 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-black">
                <Crown className="h-4 w-4 text-[#F0C36A]" />
                {t.judge}
              </p>
              <p className="mt-2 truncate text-lg font-black">
                {judgeSeat?.isClaimed ? judgeSeat.displayName : "-"}
              </p>
            </div>
          </div>

          <WerewolfQrCode label={t.join} value={joinUrl} />

          <div className="rounded-[1.5rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <UsersRound className="h-4 w-4 text-[#7A1F2B]" />
              {t.events}
            </h2>
            <div className="mt-3 grid gap-2">
              {room.events.slice(0, 5).map((event) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F3EC] px-3 py-2 text-xs font-black text-[#7A1F2B]"
                  key={event.id}
                >
                  <span className="truncate">
                    {getEventLabel(event.type, locale)}
                  </span>
                  <span>{formatTime(locale, event.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PublicStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "alive" | "dead" | "neutral";
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-24 place-items-center rounded-[1.1rem] border bg-white px-2 py-3 text-center shadow-sm",
        tone === "alive"
          ? "border-[#8AB68E]"
          : tone === "dead"
            ? "border-[#7A1F2B]"
            : "border-[#D9C7B4]",
      )}
    >
      <p className="text-2xl font-black leading-none text-[#1E1718]">{value}</p>
      <p className="mt-1 text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#7A1F2B]/70">
        {label}
      </p>
    </div>
  );
}
