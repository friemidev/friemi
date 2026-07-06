import Link from "next/link";
import { ArrowLeft, Crown, HeartPulse, Monitor, Skull } from "lucide-react";
import type {
  WerewolfRoomState,
  WerewolfWinner,
} from "@/features/game-tools/werewolfRoomState";
import { cn } from "@/lib/utils";

type WerewolfRecapEvent = {
  actorName: string | null;
  createdAt: string;
  id: string;
  payload: unknown;
  type: string;
};

type WerewolfRecapSeat = {
  avatarLabel: string;
  displayName: string;
  id: string;
  isClaimed: boolean;
  isDead: boolean;
  isJudgeSeat: boolean;
  isPlayerSeat: boolean;
  roleAlignment: string | null;
  roleLabel: string | null;
  seatNumber: number;
};

type WerewolfRecapViewProps = {
  locale: string;
  room: {
    code: string;
    events: WerewolfRecapEvent[];
    seats: WerewolfRecapSeat[];
    state: WerewolfRoomState;
    status: string;
    title: string;
    variant: {
      label: string;
      playerSeatCount: number;
      totalSeats: number;
    };
  };
  roomHref: string;
  screenHref: string;
};

const copy = {
  "zh-CN": {
    actor: "来自",
    alive: "存活",
    backRoom: "回房间",
    dead: "死亡",
    defeat: "失败",
    events: "时间线",
    finished: "本局已结束",
    goodWins: "好人阵营获胜",
    judge: "法官",
    noEvents: "还没有记录。",
    pending: "未结算",
    publicScreen: "公共屏",
    recap: "本局复盘",
    result: "结果",
    seats: "座位结果",
    victory: "胜利",
    werewolfWins: "狼人阵营获胜",
  },
  en: {
    actor: "Actor",
    alive: "Alive",
    backRoom: "Room",
    dead: "Dead",
    defeat: "Defeat",
    events: "Timeline",
    finished: "Finished",
    goodWins: "Good team wins",
    judge: "Judge",
    noEvents: "No recap records yet.",
    pending: "Unresolved",
    publicScreen: "Public screen",
    recap: "Recap",
    result: "Result",
    seats: "Seat results",
    victory: "Victory",
    werewolfWins: "Werewolf team wins",
  },
  fr: {
    actor: "Action",
    alive: "Vivant",
    backRoom: "Table",
    dead: "Mort",
    defeat: "Défaite",
    events: "Chronologie",
    finished: "Terminée",
    goodWins: "Village gagnant",
    judge: "Maître",
    noEvents: "Aucun événement à revoir.",
    pending: "Non résolu",
    publicScreen: "Écran public",
    recap: "Récap",
    result: "Résultat",
    seats: "Résultats",
    victory: "Victoire",
    werewolfWins: "Loups gagnants",
  },
};

function getWinnerLabel(
  winner: WerewolfWinner,
  t: (typeof copy)[keyof typeof copy],
) {
  if (winner === "GOOD") {
    return t.goodWins;
  }

  if (winner === "WEREWOLF") {
    return t.werewolfWins;
  }

  return t.pending;
}

function getPlayerResult({
  alignment,
  winner,
}: {
  alignment: string | null;
  winner: WerewolfWinner;
}) {
  if (!alignment || !winner) {
    return null;
  }

  return (
    (winner === "GOOD" && alignment === "good") ||
    (winner === "WEREWOLF" && alignment === "werewolf")
  );
}

function getEventLabel(type: string, locale: string) {
  const labels: Record<string, Record<string, string>> = {
    werewolf_member_joined: {
      "zh-CN": "进房间",
      en: "Member joined",
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
      en: "Seat changed",
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
  };

  return labels[type]?.[locale] ?? labels[type]?.en ?? type;
}

function formatEventDate(locale: string, value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function WerewolfRecapView({
  locale,
  room,
  roomHref,
  screenHref,
}: WerewolfRecapViewProps) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const claimedPlayerCount = playerSeats.filter((seat) => seat.isClaimed).length;
  const deadCount = playerSeats.filter((seat) => seat.isDead).length;
  const winnerLabel = getWinnerLabel(room.state.winner ?? null, t);
  const finished = room.status === "FINISHED";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#D9C7B4] bg-[#FFFDF7] shadow-2xl shadow-[#1E1718]/10">
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1fr)] lg:p-8">
        <div className="grid content-start gap-5">
          <div className="rounded-[1.5rem] border border-[#D9C7B4] bg-[#1E1718] p-5 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
              {locale === "zh-CN" ? "狼人杀" : "Friemi Werewolf"}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              {t.recap}
            </h1>
            <p className="mt-2 line-clamp-2 text-base font-bold leading-7 text-white/72">
              {room.title}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#1E1718] transition hover:bg-[#F4ECE6]"
                href={roomHref}
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backRoom}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/16"
                href={screenHref}
                target="_blank"
              >
                <Monitor className="h-4 w-4" />
                {t.publicScreen}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryTile
              label={t.result}
              tone={
                room.state.winner === "WEREWOLF"
                  ? "werewolf"
                  : room.state.winner === "GOOD"
                    ? "good"
                    : "neutral"
              }
              value={finished ? winnerLabel : t.pending}
            />
            <SummaryTile label={t.seats} value={room.variant.label} />
            <SummaryTile
              label={t.alive}
              tone="good"
              value={Math.max(0, claimedPlayerCount - deadCount)}
            />
            <SummaryTile label={t.dead} tone="werewolf" value={deadCount} />
          </div>

          <section className="rounded-[1.5rem] border border-[#D9C7B4] bg-white p-4 shadow-inner">
            <h2 className="mb-3 text-sm font-black text-[#1E1718]">
              {t.events}
            </h2>
            {room.events.length ? (
              <div className="grid gap-2">
                {room.events.slice(0, 16).map((event) => (
                  <TimelineEvent event={event} key={event.id} locale={locale} t={t} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-36 place-items-center rounded-[1rem] border border-dashed border-[#D9C7B4] bg-[#FFFDF7] p-4 text-center text-sm font-bold text-[#7A1F2B]/70">
                {t.noEvents}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-[1.5rem] border border-[#D9C7B4] bg-white p-4 shadow-xl shadow-[#1E1718]/6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7A1F2B]/68">
                {room.code}
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#1E1718]">
                {t.seats}
              </h2>
            </div>
            <span className="rounded-full bg-[#F4ECE6] px-3 py-1 text-xs font-black text-[#7A1F2B]">
              {claimedPlayerCount}/{room.variant.playerSeatCount}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {room.seats.map((seat) => {
              const won = getPlayerResult({
                alignment: seat.roleAlignment,
                winner: room.state.winner ?? null,
              });

              return (
                <div
                  className={cn(
                    "relative grid min-h-32 content-between rounded-[1.1rem] border bg-[#FFFDF7] p-3 shadow-sm",
                    seat.isDead
                      ? "border-[#C8B9AA] bg-[#E8E1D8]"
                      : "border-[#D9C7B4]",
                  )}
                  key={seat.id}
                >
                  {seat.isJudgeSeat ? (
                    <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-[#1E1718] px-2 py-0.5 text-[0.58rem] font-black text-white">
                      <Crown className="h-3 w-3 text-[#F0C36A]" />
                      {t.judge}
                    </span>
                  ) : null}
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                      {seat.seatNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#1E1718]">
                        {seat.displayName}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-[#7A1F2B]/68">
                        {seat.isDead ? t.dead : t.alive}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1.5">
                    <p className="truncate rounded-full bg-white px-2 py-1 text-xs font-black text-[#7A1F2B]">
                      {finished
                        ? seat.isJudgeSeat
                          ? t.judge
                          : (seat.roleLabel ?? "-")
                        : t.pending}
                    </p>
                    {!seat.isJudgeSeat && finished && won !== null ? (
                      <p
                        className={cn(
                          "inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-black",
                          won
                            ? "bg-[#EAF6E7] text-[#36624A]"
                            : "bg-[#FFF0EC] text-[#7A1F2B]",
                        )}
                      >
                        {won ? (
                          <HeartPulse className="h-3.5 w-3.5" />
                        ) : (
                          <Skull className="h-3.5 w-3.5" />
                        )}
                        {won ? t.victory : t.defeat}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "good" | "neutral" | "werewolf";
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-28 place-items-center rounded-[1.25rem] border bg-white p-3 text-center shadow-sm",
        tone === "good"
          ? "border-[#8AB68E]"
          : tone === "werewolf"
            ? "border-[#7A1F2B]"
            : "border-[#D9C7B4]",
      )}
    >
      <p className="text-lg font-black leading-tight text-[#1E1718]">{value}</p>
      <p className="mt-1 text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#7A1F2B]/70">
        {label}
      </p>
    </div>
  );
}

function TimelineEvent({
  event,
  locale,
  t,
}: {
  event: WerewolfRecapEvent;
  locale: string;
  t: (typeof copy)[keyof typeof copy];
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1rem] border border-[#D9C7B4] bg-[#FFFDF7] px-3 py-2 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1E1718] text-xs font-black text-white">
        W
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#1E1718]">
          {getEventLabel(event.type, locale)}
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-[#7A1F2B]/64">
          {event.actorName
            ? `${formatEventDate(locale, event.createdAt)} · ${t.actor}: ${event.actorName}`
            : formatEventDate(locale, event.createdAt)}
        </p>
      </div>
    </div>
  );
}
