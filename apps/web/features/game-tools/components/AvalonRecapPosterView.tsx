import Image from "next/image";
import Link from "next/link";
import {
  countAvalonMissionResults,
  type AvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import { cn } from "@/lib/utils";

type AvalonPosterEvent = {
  actorName: string | null;
  createdAt: string;
  id: string;
  payload: unknown;
  type: string;
};

type AvalonPosterSeat = {
  avatarLabel: string;
  displayName: string;
  id: string;
  isClaimed: boolean;
  isHostSeat: boolean;
  seatNumber: number;
};

type AvalonRecapPosterViewProps = {
  locale: string;
  room: {
    code: string;
    events: AvalonPosterEvent[];
    playerCount: number;
    seats: AvalonPosterSeat[];
    state: AvalonRoomState;
    status: string;
    title: string;
  };
  roomHref: string;
};

const copy = {
  "zh-CN": {
    back: "回房间",
    evilWins: "暗潮胜利",
    fail: "失败",
    goodWins: "圆桌胜利",
    mission: "任务",
    players: "玩家",
    poster: "复盘长图",
    success: "成功",
    timeline: "时间线",
    unresolved: "未结算",
  },
  en: {
    back: "Room",
    evilWins: "Evil wins",
    fail: "Fail",
    goodWins: "Good wins",
    mission: "Quest",
    players: "Players",
    poster: "Recap poster",
    success: "Success",
    timeline: "Timeline",
    unresolved: "Unresolved",
  },
  fr: {
    back: "Table",
    evilWins: "Ombre gagne",
    fail: "Échec",
    goodWins: "Table gagne",
    mission: "Quête",
    players: "Joueurs",
    poster: "Affiche récap",
    success: "Succès",
    timeline: "Chronologie",
    unresolved: "Non résolu",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRoundLabel(event: AvalonPosterEvent) {
  if (!isRecord(event.payload)) {
    return null;
  }

  const roundIndex = event.payload.roundIndex;

  return typeof roundIndex === "number" && Number.isFinite(roundIndex)
    ? roundIndex + 1
    : null;
}

function getEventIcon(type: string) {
  if (type === "mission_succeeded") {
    return "/game-tools/avalon/states/mission-success-token.svg";
  }

  if (type === "mission_failed") {
    return "/game-tools/avalon/states/mission-fail-token.svg";
  }

  if (type === "room_rolled_back" || type === "round_corrected") {
    return "/game-tools/avalon/share/timeline-node-correction.svg";
  }

  if (type === "team_proposed") {
    return "/game-tools/avalon/share/timeline-node-team.svg";
  }

  if (type.includes("vote")) {
    return "/game-tools/avalon/share/timeline-node-vote.svg";
  }

  if (type === "assassination_resolved") {
    return "/game-tools/avalon/share/timeline-node-assassin.svg";
  }

  return "/game-tools/avalon/share/timeline-node-start.svg";
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

export function AvalonRecapPosterView({
  locale,
  room,
  roomHref,
}: AvalonRecapPosterViewProps) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const missionCounts = countAvalonMissionResults(room.state.missionResults);
  const winner = getWinnerMeta(room.state, t);
  const claimedSeats = room.seats.filter((seat) => seat.isClaimed);

  return (
    <section className="mx-auto w-full max-w-[30rem] overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] shadow-2xl shadow-[#156240]/14 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="relative p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(138,182,142,0.24),transparent_34%),radial-gradient(circle_at_90%_72%,rgba(240,145,130,0.18),transparent_30%)]" />
        <div className="relative grid gap-5">
          <header className="rounded-[1.7rem] border border-[#D6D5B2] bg-white/82 p-4 shadow-xl shadow-[#156240]/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#156240]">
                  Friemi Avalon
                </p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-[#0E2A5A]">
                  {t.poster}
                </h1>
              </div>
              <Image
                alt=""
                className="h-16 w-16 object-contain"
                height={72}
                src={winner.image}
                width={72}
              />
            </div>
            <p className="mt-3 text-lg font-black leading-6 text-[#1D1D1B]">
              {room.title}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <PosterStat label={t.players} value={`${claimedSeats.length}/${room.playerCount}`} />
              <PosterStat label={t.success} tone="good" value={missionCounts.success} />
              <PosterStat label={t.fail} tone="evil" value={missionCounts.fail} />
            </div>
          </header>

          <section className="rounded-[1.7rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-inner">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#0E2A5A]">{t.mission}</h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-black",
                  winner.tone === "good"
                    ? "bg-[#EAF6E7] text-[#156240]"
                    : winner.tone === "evil"
                      ? "bg-[#FFF0EC] text-[#B5301F]"
                      : "bg-[#F1F2EC] text-[#156240]",
                )}
              >
                {winner.label}
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
                    className="grid min-h-20 place-items-center rounded-[1.1rem] border border-[#D6D5B2] bg-[#FEFFF9] p-2 shadow-sm"
                    key={index}
                  >
                    <Image alt="" height={48} src={src} width={48} />
                    <span className="text-[0.58rem] font-black text-[#156240]">
                      {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-[#D6D5B2] bg-white/78 p-4">
            <h2 className="mb-3 text-sm font-black text-[#0E2A5A]">{t.players}</h2>
            <div className="grid grid-cols-4 gap-2">
              {room.seats.map((seat) => (
                <div
                  className={cn(
                    "relative grid min-h-20 place-items-center rounded-[1.1rem] border bg-[#FEFFF9] p-2 text-center shadow-sm",
                    seat.isClaimed ? "border-[#8AB68E]/55" : "border-[#D6D5B2] opacity-55",
                  )}
                  key={seat.id}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#156240] text-sm font-black text-white">
                    {seat.avatarLabel}
                  </span>
                  <span className="mt-1 line-clamp-1 text-[0.62rem] font-black text-[#0E2A5A]">
                    {seat.displayName}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-[#D6D5B2] bg-white/78 p-4">
            <h2 className="mb-3 text-sm font-black text-[#0E2A5A]">{t.timeline}</h2>
            <div className="grid gap-2">
              {room.events.slice(0, 24).map((event) => (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[1.1rem] bg-[#FEFFF9] px-3 py-2 shadow-sm"
                  key={event.id}
                >
                  <Image alt="" height={34} src={getEventIcon(event.type)} width={34} />
                  <span className="truncate text-xs font-black text-[#0E2A5A]">
                    {event.actorName ?? "Friemi"}
                  </span>
                  {getRoundLabel(event) ? (
                    <span className="rounded-full bg-[#156240] px-2 py-0.5 text-[0.58rem] font-black text-white">
                      {getRoundLabel(event)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <Link
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#156240] px-4 text-sm font-black text-white shadow-lg shadow-[#156240]/20 print:hidden"
            href={roomHref}
          >
            {t.back}
          </Link>
        </div>
      </div>
    </section>
  );
}

function PosterStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "evil" | "good" | "neutral";
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.1rem] border bg-[#FEFFF9] px-2 py-3 text-center shadow-sm",
        tone === "good"
          ? "border-[#8AB68E]"
          : tone === "evil"
            ? "border-[#F09182]"
            : "border-[#D6D5B2]",
      )}
    >
      <p className="text-xl font-black text-[#0E2A5A]">{value}</p>
      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#156240]/68">
        {label}
      </p>
    </div>
  );
}
