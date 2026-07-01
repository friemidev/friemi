import Image from "next/image";
import Link from "next/link";
import {
  countAvalonMissionResults,
  getAvalonQuestTeamSize,
  type AvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import { cn } from "@/lib/utils";

type AvalonRecapEvent = {
  actorName: string | null;
  createdAt: string;
  id: string;
  payload: unknown;
  type: string;
};

type AvalonRecapSeat = {
  avatarLabel: string;
  displayName: string;
  id: string;
  isClaimed: boolean;
  isHostSeat: boolean;
  seatNumber: number;
};

type AvalonRecapViewProps = {
  locale: string;
  room: {
    code: string;
    events: AvalonRecapEvent[];
    playerCount: number;
    seats: AvalonRecapSeat[];
    state: AvalonRoomState;
    status: string;
    title: string;
  };
  roomHref: string;
  screenHref: string;
};

const copy = {
  "zh-CN": {
    actor: "操作者",
    backRoom: "回房间",
    evilWins: "暗潮胜利",
    fail: "失败",
    goodWins: "圆桌胜利",
    latest: "时间线",
    mission: "任务",
    noEvents: "还没有可复盘的记录。",
    player: "玩家",
    players: "座位",
    publicScreen: "公共屏",
    recap: "复盘",
    redeal: "重新发牌",
    rejects: "否决",
    repair: "修正",
    restart: "重开",
    round: "第",
    seats: "座位",
    started: "开局",
    success: "成功",
    summary: "这一局发生了什么",
    team: "队伍",
    unresolved: "未结算",
    winner: "胜负",
  },
  en: {
    actor: "Actor",
    backRoom: "Room",
    evilWins: "Evil wins",
    fail: "Fail",
    goodWins: "Good wins",
    latest: "Timeline",
    mission: "Quest",
    noEvents: "No recap events yet.",
    player: "Player",
    players: "Seats",
    publicScreen: "Screen",
    recap: "Recap",
    redeal: "Redeal",
    rejects: "Rejects",
    repair: "Repair",
    restart: "Restart",
    round: "Round",
    seats: "Seats",
    started: "Started",
    success: "Success",
    summary: "What happened",
    team: "Team",
    unresolved: "Unresolved",
    winner: "Winner",
  },
  fr: {
    actor: "Action",
    backRoom: "Table",
    evilWins: "Ombre gagne",
    fail: "Échec",
    goodWins: "Table gagne",
    latest: "Chronologie",
    mission: "Quête",
    noEvents: "Aucun événement à revoir.",
    player: "Joueur",
    players: "Places",
    publicScreen: "Écran",
    recap: "Récap",
    redeal: "Redistribuer",
    rejects: "Refus",
    repair: "Corriger",
    restart: "Relancer",
    round: "Tour",
    seats: "Places",
    started: "Lancée",
    success: "Succès",
    summary: "Résumé de la partie",
    team: "Équipe",
    unresolved: "Non résolu",
    winner: "Victoire",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRoundLabel(event: AvalonRecapEvent) {
  if (!isRecord(event.payload)) {
    return null;
  }

  const roundIndex = event.payload.roundIndex;

  return typeof roundIndex === "number" && Number.isFinite(roundIndex)
    ? roundIndex + 1
    : null;
}

function getSeatNumbers(event: AvalonRecapEvent) {
  if (!isRecord(event.payload)) {
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

function getMissionDetails(event: AvalonRecapEvent) {
  if (!isRecord(event.payload)) {
    return null;
  }

  const failCount = Number(event.payload.failCount);
  const missionResult = event.payload.missionResult;
  const roundIndex = Number(event.payload.roundIndex);

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex > 4) {
    return null;
  }

  return {
    failCount: Number.isInteger(failCount) && failCount >= 0 ? failCount : 0,
    missionResult: missionResult === "fail" ? ("fail" as const) : ("success" as const),
    roundIndex,
  };
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

  if (type === "room_redealt") {
    return "/game-tools/avalon/avalon-tool-icon.svg";
  }

  if (type === "room_reopened") {
    return "/game-tools/avalon/states/round-reset-token.svg";
  }

  if (type === "assassination_resolved") {
    return "/game-tools/avalon/share/timeline-node-assassin.svg";
  }

  if (type.includes("vote")) {
    return "/game-tools/avalon/share/timeline-node-vote.svg";
  }

  return "/game-tools/avalon/share/timeline-node-start.svg";
}

function getEventLabel(type: string, t: (typeof copy)[keyof typeof copy]) {
  if (type === "mission_succeeded") {
    return t.success;
  }

  if (type === "mission_failed") {
    return t.fail;
  }

  if (type === "team_proposed") {
    return t.team;
  }

  if (type === "round_corrected") {
    return t.repair;
  }

  if (type === "assassination_resolved") {
    return t.winner;
  }

  if (type === "room_redealt") {
    return t.redeal;
  }

  if (type === "room_reopened") {
    return t.restart;
  }

  if (type === "room_started") {
    return t.started;
  }

  return t.summary;
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

function getWinnerMeta(
  state: AvalonRoomState,
  t: (typeof copy)[keyof typeof copy],
) {
  if (state.winner === "good") {
    return {
      image: "/game-tools/avalon/states/good-victory.svg",
      label: t.goodWins,
      tone: "good" as const,
    };
  }

  if (state.winner === "evil") {
    return {
      image: "/game-tools/avalon/states/evil-victory.svg",
      label: t.evilWins,
      tone: "evil" as const,
    };
  }

  return {
    image: "/game-tools/avalon/states/mission-pending-token.svg",
    label: t.unresolved,
    tone: "neutral" as const,
  };
}

export function AvalonRecapView({
  locale,
  room,
  roomHref,
  screenHref,
}: AvalonRecapViewProps) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const missionCounts = countAvalonMissionResults(room.state.missionResults);
  const winner = getWinnerMeta(room.state, t);
  const claimedCount = room.seats.filter((seat) => seat.isClaimed).length;
  const missionEvents = room.events.filter(
    (event) => event.type === "mission_succeeded" || event.type === "mission_failed",
  );

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-[#8AB68E]/35 bg-[#FEFFF9] shadow-2xl shadow-[#156240]/12">
      <div className="relative grid gap-7 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,1fr)] lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(138,182,142,0.18),transparent_34%),radial-gradient(circle_at_86%_70%,rgba(240,145,130,0.13),transparent_30%)]" />

        <div className="relative grid content-start gap-5">
          <div className="rounded-[2rem] border border-[#D6D5B2] bg-white/82 p-5 shadow-xl shadow-[#156240]/10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#156240]">
              Friemi Avalon
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal text-[#0E2A5A] sm:text-5xl">
              {t.recap}
            </h1>
            <p className="mt-2 line-clamp-2 text-base font-bold leading-7 text-[#156240]/80">
              {room.title}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#156240] px-4 text-sm font-black text-white shadow-lg shadow-[#156240]/20 transition hover:-translate-y-0.5"
                href={roomHref}
              >
                {t.backRoom}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-4 text-sm font-black text-[#156240] transition hover:-translate-y-0.5"
                href={screenHref}
                target="_blank"
              >
                {t.publicScreen}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryTile
              image={winner.image}
              label={t.winner}
              tone={winner.tone}
              value={winner.label}
            />
            <SummaryTile
              image="/game-tools/avalon/player-ready-token.svg"
              label={t.players}
              value={`${claimedCount}/${room.playerCount}`}
            />
            <SummaryTile
              image="/game-tools/avalon/states/mission-success-token.svg"
              label={t.success}
              tone="good"
              value={missionCounts.success}
            />
            <SummaryTile
              image="/game-tools/avalon/states/mission-fail-token.svg"
              label={t.fail}
              tone="evil"
              value={missionCounts.fail}
            />
          </div>

          <div className="rounded-[2rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-inner">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-[#0E2A5A]">{t.mission}</h2>
              <span className="rounded-full bg-[#F1F2EC] px-3 py-1 text-[0.68rem] font-black text-[#156240]">
                {room.code}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {room.state.missionResults.map((result, index) => {
                const src =
                  result === "success"
                    ? "/game-tools/avalon/states/mission-success-token.svg"
                    : result === "fail"
                      ? "/game-tools/avalon/states/mission-fail-token.svg"
                      : "/game-tools/avalon/states/mission-pending-token.svg";

                return (
                  <div
                    className={cn(
                      "grid min-h-24 place-items-center rounded-[1.35rem] border bg-[#FEFFF9] px-2 py-3 text-center shadow-sm",
                      result === "success"
                        ? "border-[#8AB68E]"
                        : result === "fail"
                          ? "border-[#F09182]"
                          : "border-[#D6D5B2]",
                    )}
                    key={index}
                  >
                    <Image
                      alt=""
                      className={cn(result && "avalon-token-reveal")}
                      height={52}
                      src={src}
                      width={52}
                    />
                    <span className="mt-2 text-[0.62rem] font-black text-[#156240]">
                      {t.round} {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative grid gap-5">
          <section className="rounded-[2rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-xl shadow-[#156240]/8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-[#156240]/70">
                  {t.summary}
                </p>
                <h2 className="mt-1 text-xl font-black text-[#0E2A5A]">
                  {t.latest}
                </h2>
              </div>
              <span className="rounded-full bg-[#F1F2EC] px-3 py-1 text-xs font-black text-[#156240]">
                {room.events.length}
              </span>
            </div>

            {room.events.length > 0 ? (
              <div className="grid gap-2">
                {room.events.slice(0, 18).map((event) => (
                  <TimelineEvent event={event} key={event.id} locale={locale} t={t} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center rounded-[1.5rem] border border-dashed border-[#D6D5B2] bg-[#FEFFF9] p-5 text-center text-sm font-bold text-[#156240]/70">
                {t.noEvents}
              </div>
            )}
          </section>

          {missionEvents.length > 0 ? (
            <section className="rounded-[2rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-inner">
              <h2 className="mb-3 text-sm font-black text-[#0E2A5A]">
                {t.mission}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {missionEvents.slice(0, 5).map((event) => (
                  <MissionRevealSummary
                    event={event}
                    key={event.id}
                    playerCount={room.playerCount}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-inner">
            <h2 className="mb-3 text-sm font-black text-[#0E2A5A]">{t.seats}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {room.seats.map((seat) => (
                <div
                  className={cn(
                    "relative grid min-h-24 place-items-center rounded-[1.35rem] border bg-[#FEFFF9] p-2 text-center shadow-sm",
                    seat.isClaimed ? "border-[#8AB68E]/55" : "border-[#D6D5B2] opacity-65",
                  )}
                  key={seat.id}
                >
                  {seat.isHostSeat ? (
                    <span className="absolute -top-2 rounded-full bg-[#FFF5E6] px-2 py-0.5 text-[0.58rem] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
                      HOST
                    </span>
                  ) : null}
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#156240] text-lg font-black text-white shadow-md">
                    {seat.avatarLabel}
                  </span>
                  <span className="mt-1 line-clamp-1 max-w-full text-xs font-black text-[#0E2A5A]">
                    {seat.displayName}
                  </span>
                  <span className="absolute bottom-1 right-2 text-[0.62rem] font-black text-[#156240]/60">
                    {seat.seatNumber}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function SummaryTile({
  image,
  label,
  tone = "neutral",
  value,
}: {
  image: string;
  label: string;
  tone?: "evil" | "good" | "neutral";
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-32 place-items-center rounded-[1.6rem] border bg-white/82 p-3 text-center shadow-lg",
        tone === "good"
          ? "border-[#8AB68E]"
          : tone === "evil"
            ? "border-[#F09182]"
            : "border-[#D6D5B2]",
      )}
    >
      <Image alt="" className="h-12 w-12 object-contain" height={56} src={image} width={56} />
      <p className="mt-2 text-lg font-black leading-tight text-[#0E2A5A]">{value}</p>
      <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#156240]/68">
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
  event: AvalonRecapEvent;
  locale: string;
  t: (typeof copy)[keyof typeof copy];
}) {
  const roundLabel = getRoundLabel(event);
  const seatNumbers = getSeatNumbers(event);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.35rem] border border-[#D6D5B2] bg-[#FEFFF9] px-3 py-2 shadow-sm">
      <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-inner">
        {roundLabel ? (
          <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#156240] px-1 text-[0.56rem] font-black text-white">
            {roundLabel}
          </span>
        ) : null}
        <Image
          alt=""
          className="h-8 w-8 object-contain"
          height={40}
          src={getEventIcon(event.type)}
          width={40}
        />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-[#0E2A5A]">
          {getEventLabel(event.type, t)}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-[#156240]/64">
          {event.actorName
            ? `${formatEventDate(locale, event.createdAt)} · ${t.actor}: ${event.actorName}`
            : formatEventDate(locale, event.createdAt)}
        </p>
      </div>
      <div className="flex max-w-28 flex-wrap justify-end gap-1">
        {seatNumbers.map((seatNumber) => (
          <span
            className="grid h-6 min-w-6 place-items-center rounded-full bg-[#F09182] px-1 text-[0.58rem] font-black text-white"
            key={`${event.id}-${seatNumber}`}
          >
            {seatNumber}
          </span>
        ))}
      </div>
    </div>
  );
}

function MissionRevealSummary({
  event,
  playerCount,
  t,
}: {
  event: AvalonRecapEvent;
  playerCount: number;
  t: (typeof copy)[keyof typeof copy];
}) {
  const details = getMissionDetails(event);

  if (!details) {
    return null;
  }

  const teamSize = Math.max(
    1,
    getAvalonQuestTeamSize({ playerCount, roundIndex: details.roundIndex }),
  );

  return (
    <div className="rounded-[1.45rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black text-[#0E2A5A]">
          {t.round} {details.roundIndex + 1}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.62rem] font-black",
            details.missionResult === "fail"
              ? "bg-[#FFF0EC] text-[#B5301F]"
              : "bg-[#EAF6E7] text-[#156240]",
          )}
        >
          {details.missionResult === "fail" ? t.fail : t.success}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: teamSize }, (_, index) => {
          const isFail = index < details.failCount;

          return (
            <span
              className={cn(
                "grid h-10 w-8 place-items-center rounded-xl border bg-white shadow-sm",
                isFail ? "border-[#F09182]" : "border-[#8AB68E]/55",
              )}
              key={index}
            >
              <Image
                alt=""
                className="h-6 w-6 object-contain"
                height={28}
                src={
                  isFail
                    ? "/game-tools/avalon/states/mission-fail-token.svg"
                    : "/game-tools/avalon/states/mission-success-token.svg"
                }
                width={28}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
