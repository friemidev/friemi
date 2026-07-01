"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { AvalonQrCode } from "@/features/game-tools/components/AvalonQrCode";
import {
  getAvalonQuestTeamSize,
  type AvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import { cn } from "@/lib/utils";

type PublicSeat = {
  avatarLabel: string;
  displayName: string;
  id: string;
  isClaimed: boolean;
  isHostSeat: boolean;
  isOnProposedTeam: boolean;
  seatNumber: number;
};

type AvalonPublicScreenProps = {
  joinUrl: string;
  locale: string;
  room: {
    code: string;
    events: Array<{
      createdAt: string;
      id: string;
      payload: unknown;
      type: string;
    }>;
    playerCount: number;
    progress: {
      failureThreshold: number;
      missionCardSubmissionCount: number;
      requiredTeamSize: number;
      teamVoteSubmissionCount: number;
    };
    seats: PublicSeat[];
    state: AvalonRoomState;
    status: string;
    title: string;
  };
};

const copy = {
  "zh-CN": {
    current: "当前",
    fail: "失败",
    join: "扫码入座",
    latestReveal: "刚刚揭晓",
    mission: "任务",
    missionReveal: "任务揭晓",
    players: "玩家",
    questCards: "任务牌",
    rejects: "否决",
    round: "第",
    success: "成功",
    team: "队伍",
    target: "刺杀",
    votes: "投票",
    waitingCards: "等待任务牌",
  },
  en: {
    current: "Now",
    fail: "Fail",
    join: "Scan to join",
    latestReveal: "Latest reveal",
    mission: "Quest",
    missionReveal: "Quest reveal",
    players: "Players",
    questCards: "Quest cards",
    rejects: "Rejects",
    round: "Round",
    success: "Success",
    team: "Team",
    target: "Target",
    votes: "Votes",
    waitingCards: "Waiting for cards",
  },
  fr: {
    current: "Maintenant",
    fail: "Échec",
    join: "Scanner",
    latestReveal: "Révélation",
    mission: "Quête",
    missionReveal: "Cartes révélées",
    players: "Joueurs",
    questCards: "Cartes",
    rejects: "Refus",
    round: "Tour",
    success: "Succès",
    team: "Équipe",
    target: "Cible",
    votes: "Votes",
    waitingCards: "En attente",
  },
};

function getPhaseIcon(state: AvalonRoomState) {
  if (state.phase === "team_vote") {
    return "/game-tools/avalon/states/vote-approve-card.svg";
  }

  if (state.phase === "mission") {
    return "/game-tools/avalon/states/mission-pending-token.svg";
  }

  if (state.phase === "assassination") {
    return "/game-tools/avalon/states/assassination-phase.svg";
  }

  if (state.phase === "finished") {
    return state.winner === "evil"
      ? "/game-tools/avalon/states/evil-victory.svg"
      : "/game-tools/avalon/states/good-victory.svg";
  }

  return "/game-tools/avalon/avalon-tool-icon.svg";
}

function getPhaseTitle(
  phase: AvalonRoomState["phase"],
  t: (typeof copy)[keyof typeof copy],
) {
  if (phase === "team_vote") {
    return t.votes;
  }

  if (phase === "mission") {
    return t.questCards;
  }

  if (phase === "assassination") {
    return t.target;
  }

  if (phase === "finished") {
    return t.success;
  }

  return t.team;
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

function isEventPayloadRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getEventRoundLabel(event: AvalonPublicScreenProps["room"]["events"][number]) {
  if (!isEventPayloadRecord(event.payload)) {
    return null;
  }

  const roundIndex = event.payload.roundIndex;

  return typeof roundIndex === "number" && Number.isFinite(roundIndex)
    ? String(roundIndex + 1)
    : null;
}

function getEventSeatNumbers(event: AvalonPublicScreenProps["room"]["events"][number]) {
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

function getLatestMissionEvent(events: AvalonPublicScreenProps["room"]["events"]) {
  return (
    events.find(
      (event) => event.type === "mission_succeeded" || event.type === "mission_failed",
    ) ?? null
  );
}

function getMissionEventDetails(
  event: AvalonPublicScreenProps["room"]["events"][number] | null,
) {
  if (!event || !isEventPayloadRecord(event.payload)) {
    return null;
  }

  const failCount = Number(event.payload.failCount);
  const roundIndex = Number(event.payload.roundIndex);
  const missionResult = event.payload.missionResult;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex > 4) {
    return null;
  }

  return {
    failCount: Number.isInteger(failCount) && failCount >= 0 ? failCount : 0,
    missionResult: missionResult === "fail" ? ("fail" as const) : ("success" as const),
    roundIndex,
  };
}

export function AvalonPublicScreen({
  joinUrl,
  locale,
  room,
}: AvalonPublicScreenProps) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const phaseIcon = getPhaseIcon(room.state);
  const phaseTitle = getPhaseTitle(room.state.phase, t);
  const latestMissionEvent = getLatestMissionEvent(room.events);
  const latestMission = getMissionEventDetails(latestMissionEvent);
  const successCount = room.state.missionResults.filter(
    (result) => result === "success",
  ).length;
  const failCount = room.state.missionResults.filter((result) => result === "fail").length;
  const claimedCount = room.seats.filter((seat) => seat.isClaimed).length;

  return (
    <section className="min-h-[calc(100svh-6rem)] overflow-hidden rounded-[2.5rem] border border-[#8AB68E]/35 bg-[#FEFFF9] shadow-2xl shadow-[#156240]/15">
      <div className="relative grid min-h-[calc(100svh-6rem)] gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:p-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(138,182,142,0.22),transparent_34%),radial-gradient(circle_at_78%_64%,rgba(240,145,130,0.16),transparent_32%)]" />

        <div className="relative grid content-between gap-8">
          <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#156240]">
                Friemi Avalon
              </p>
              <h1 className="mt-3 max-w-5xl text-5xl font-black leading-[0.98] tracking-normal text-[#0E2A5A] md:text-7xl">
                {room.title}
              </h1>
            </div>
            <div className="grid grid-cols-4 gap-2 md:min-w-[26rem]">
              <PublicStat
                image="/game-tools/avalon/player-ready-token.svg"
                label={t.players}
                value={`${claimedCount}/${room.playerCount}`}
              />
              <PublicStat
                image="/game-tools/avalon/states/team-leader-marker.svg"
                label={t.team}
                value={room.progress.requiredTeamSize}
              />
              <PublicStat
                image="/game-tools/avalon/states/mission-success-token.svg"
                label={t.success}
                tone="good"
                value={successCount}
              />
              <PublicStat
                image="/game-tools/avalon/states/mission-fail-token.svg"
                label={t.fail}
                tone="evil"
                value={failCount}
              />
            </div>
          </header>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)] xl:items-center">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-3">
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
                        "relative grid h-24 w-24 place-items-center rounded-[2rem] border bg-white shadow-xl transition",
                        index === room.state.roundIndex &&
                          room.state.phase !== "finished"
                          ? "scale-110 border-[#156240] shadow-[#156240]/20"
                          : "border-[#D6D5B2]",
                      )}
                      key={index}
                    >
                      <Image
                        alt=""
                        className={cn(result && "avalon-token-reveal")}
                        height={74}
                        src={src}
                        width={74}
                      />
                      <span className="absolute -bottom-2 rounded-full bg-[#FEFFF9] px-3 py-1 text-sm font-black text-[#156240] shadow-sm">
                        {t.mission} {index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[2rem] border border-[#D6D5B2] bg-white/78 p-4 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#FEFFF9] px-3 py-1 text-xs font-black text-[#156240] shadow-sm">
                    {t.rejects}
                  </span>
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full border border-[#D6D5B2] shadow-sm",
                        index < room.state.teamVoteRejectCount
                          ? "bg-[#F09182]"
                          : "bg-[#FEFFF9]",
                      )}
                      key={index}
                    />
                  ))}
                </div>
              </div>

              {room.events.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 rounded-[2rem] border border-[#D6D5B2] bg-white/70 p-3 shadow-inner">
                  {room.events.slice(0, 4).map((event, index) => {
                    const roundLabel = getEventRoundLabel(event);
                    const seatNumbers = getEventSeatNumbers(event);

                    return (
                      <div
                        className="relative grid min-h-24 place-items-center rounded-[1.25rem] bg-[#FEFFF9] px-2 py-3 text-center shadow-sm"
                        key={event.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {roundLabel ? (
                          <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#156240] text-[0.64rem] font-black text-white">
                            {roundLabel}
                          </span>
                        ) : null}
                        <Image
                          alt=""
                          className="avalon-token-reveal h-14 w-14 object-contain drop-shadow-md"
                          height={64}
                          src={getEventIcon(event.type)}
                          width={64}
                        />
                        {seatNumbers.length > 0 ? (
                          <span className="mt-1 flex justify-center gap-1">
                            {seatNumbers.map((seatNumber) => (
                              <span
                                className="grid h-5 min-w-5 place-items-center rounded-full bg-[#F09182] px-1 text-[0.58rem] font-black text-white"
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
              ) : null}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-[#D6D5B2] bg-white shadow-2xl shadow-[#156240]/10">
              <div className="flex items-center justify-between gap-3 border-b border-[#D6D5B2] bg-[#FEFFF9] px-5 py-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#156240]/65">
                    {t.current}
                  </p>
                  <h2 className="text-2xl font-black text-[#0E2A5A]">
                    {phaseTitle}
                  </h2>
                </div>
                <span className="rounded-full bg-[#F1F2EC] px-3 py-1 text-sm font-black text-[#156240] shadow-inner">
                  {t.mission} {room.state.roundIndex + 1}
                </span>
              </div>
              <div className="relative grid min-h-80 place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(241,242,236,0.95),rgba(254,255,249,0.68)_55%,rgba(138,182,142,0.22))]">
                <div className="absolute inset-6 rounded-[2rem] border border-[#D6D5B2]/70" />
                <div className="absolute left-6 top-6 flex gap-1.5">
                  {room.state.proposedTeamSeatNumbers.map((seatNumber) => (
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#F09182] text-xs font-black text-white shadow-lg shadow-[#F09182]/25"
                      key={seatNumber}
                    >
                      {seatNumber}
                    </span>
                  ))}
                </div>
                <Image
                  alt=""
                  className="relative h-44 w-44 rounded-[2rem] object-contain drop-shadow-2xl"
                  height={240}
                  src={phaseIcon}
                  width={240}
                />
              </div>
              <MissionRevealDeck
                latestMission={latestMission}
                playerCount={room.playerCount}
                progress={room.progress}
                state={room.state}
                t={t}
              />
              <div className="grid grid-cols-2 gap-2 p-4">
                <PublicStat
                  image="/game-tools/avalon/states/vote-approve-card.svg"
                  label={t.votes}
                  value={`${room.progress.teamVoteSubmissionCount}/${room.playerCount}`}
                />
                <PublicStat
                  image="/game-tools/avalon/states/mission-pending-token.svg"
                  label={t.questCards}
                  value={`${room.progress.missionCardSubmissionCount}/${room.state.proposedTeamSeatNumbers.length || room.progress.requiredTeamSize}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 md:grid-cols-10">
            {room.seats.map((seat) => (
              <div
                className={cn(
                  "relative grid min-h-24 place-items-center rounded-[1.45rem] border bg-white/86 p-2 text-center shadow-lg transition",
                  seat.isOnProposedTeam
                    ? "scale-105 border-[#F09182] shadow-[#F09182]/20"
                    : seat.isClaimed
                      ? "border-[#8AB68E]/55"
                      : "border-[#D6D5B2] opacity-60",
                )}
                key={seat.id}
              >
                {seat.isHostSeat ? (
                  <span className="absolute -top-2 rounded-full bg-[#FFF5E6] px-2 py-0.5 text-[0.62rem] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
                    HOST
                  </span>
                ) : null}
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#156240] text-lg font-black text-white">
                  {seat.avatarLabel}
                </span>
                <span className="line-clamp-1 max-w-full text-xs font-black text-[#0E2A5A]">
                  {seat.displayName}
                </span>
                <span className="absolute bottom-1 right-2 text-[0.65rem] font-black text-[#156240]/65">
                  {seat.seatNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="relative grid content-between gap-5">
          <div className="rounded-[2rem] border border-[#D6D5B2] bg-white/84 p-4 text-center shadow-xl shadow-[#156240]/10">
            <p className="text-5xl font-black tracking-[0.2em] text-[#0E2A5A]">
              {room.code}
            </p>
          </div>
          <AvalonQrCode label={t.join} value={joinUrl} />
        </aside>
      </div>
    </section>
  );
}

function MissionRevealDeck({
  latestMission,
  playerCount,
  progress,
  state,
  t,
}: {
  latestMission: ReturnType<typeof getMissionEventDetails>;
  playerCount: number;
  progress: AvalonPublicScreenProps["room"]["progress"];
  state: AvalonRoomState;
  t: (typeof copy)[keyof typeof copy];
}) {
  const isWaitingForCards = state.phase === "mission";
  const roundIndex = latestMission?.roundIndex ?? state.roundIndex;
  const teamSize =
    latestMission || roundIndex !== state.roundIndex
      ? getAvalonQuestTeamSize({ playerCount, roundIndex })
      : state.proposedTeamSeatNumbers.length || progress.requiredTeamSize || 0;
  const visibleCards = Math.max(1, Math.min(teamSize || 1, 5));
  const failCount = latestMission?.failCount ?? 0;

  return (
    <div className="border-t border-[#D6D5B2] bg-[#FEFFF9] px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#156240]/65">
            {latestMission ? t.latestReveal : t.missionReveal}
          </p>
          <h3 className="text-lg font-black text-[#0E2A5A]">
            {t.round} {roundIndex + 1}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-black shadow-sm",
            latestMission?.missionResult === "fail"
              ? "bg-[#FFF0EC] text-[#B5301F] ring-1 ring-[#F09182]/45"
              : latestMission
                ? "bg-[#EAF6E7] text-[#156240] ring-1 ring-[#8AB68E]/45"
                : "bg-[#F1F2EC] text-[#156240]",
          )}
        >
          {latestMission
            ? latestMission.missionResult === "fail"
              ? t.fail
              : t.success
            : `${progress.missionCardSubmissionCount}/${teamSize || progress.requiredTeamSize}`}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 justify-center gap-2 overflow-hidden rounded-[1.35rem] border border-[#D6D5B2] bg-white/75 px-3 py-3 shadow-inner">
          {Array.from({ length: visibleCards }, (_, index) => {
            const isFailCard = latestMission ? index < failCount : false;
            const src = latestMission
              ? isFailCard
                ? "/game-tools/avalon/states/mission-fail-token.svg"
                : "/game-tools/avalon/states/mission-success-token.svg"
              : "/game-tools/avalon/roles/private-card-back.svg";

            return (
              <span
                className={cn(
                  "avalon-mission-card grid h-16 w-12 shrink-0 place-items-center rounded-[0.95rem] border bg-[#FEFFF9] shadow-lg",
                  isFailCard ? "border-[#F09182]" : "border-[#8AB68E]/55",
                )}
                key={index}
                style={
                  {
                    "--shuffle-rotate": `${(index - visibleCards / 2) * 4}deg`,
                    "--shuffle-x": `${(index - visibleCards / 2) * 0.42}rem`,
                    animationDelay: `${index * 70}ms`,
                  } as CSSProperties
                }
              >
                <Image
                  alt=""
                  className="h-9 w-9 object-contain"
                  height={44}
                  src={src}
                  width={44}
                />
              </span>
            );
          })}
        </div>
        <div
          className={cn(
            "avalon-result-pulse grid h-16 w-16 place-items-center rounded-[1.25rem] border bg-white shadow-xl",
            latestMission?.missionResult === "fail"
              ? "border-[#F09182]"
              : "border-[#8AB68E]/70",
          )}
        >
          <Image
            alt=""
            className="h-12 w-12 object-contain"
            height={56}
            src={
              latestMission?.missionResult === "fail"
                ? "/game-tools/avalon/states/mission-fail-token.svg"
                : latestMission?.missionResult === "success"
                  ? "/game-tools/avalon/states/mission-success-token.svg"
                  : isWaitingForCards
                    ? "/game-tools/avalon/states/mission-pending-token.svg"
                    : "/game-tools/avalon/states/public-screen-token.svg"
            }
            width={56}
          />
        </div>
      </div>
    </div>
  );
}

function PublicStat({
  image,
  label,
  tone = "neutral",
  value,
}: {
  image?: string;
  label: string;
  tone?: "evil" | "good" | "neutral";
  value: number | string;
}) {
  const toneClass =
    tone === "good"
      ? "border-[#8AB68E] bg-[#EAF6E7] text-[#156240]"
      : tone === "evil"
        ? "border-[#F09182] bg-[#FFF0EC] text-[#B5301F]"
        : "border-[#D6D5B2] bg-[#FEFFF9] text-[#0E2A5A]";

  return (
    <div
      className={cn(
        "grid place-items-center rounded-[1.2rem] border px-3 py-3 text-center shadow-sm",
        toneClass,
      )}
    >
      {image ? (
        <Image
          alt=""
          className="mb-1 h-8 w-8 object-contain drop-shadow-sm"
          height={40}
          src={image}
          width={40}
        />
      ) : null}
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
    </div>
  );
}
