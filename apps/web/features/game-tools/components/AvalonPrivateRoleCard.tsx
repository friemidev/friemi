"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  CircleHelp,
  Eye,
  Flag,
  History,
  ShieldAlert,
  Swords,
  Users,
  Vote,
  X,
} from "lucide-react";
import {
  submitAvalonAssassinationAction,
  submitAvalonMissionCardAction,
  submitAvalonTeamVoteAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import type { AvalonPrivatePayload } from "@/features/game-tools/avalonConfig";
import type { AvalonRoomState } from "@/features/game-tools/avalonRoomState";
import { cn } from "@/lib/utils";

type AvalonPrivateRoleCardProps = {
  locale: string;
  payload: AvalonPrivatePayload | null;
  privateToken: string;
  roleKey: string | null;
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
  day: string;
  fail: string;
  help: string;
  helpBody: string;
  helpClose: string;
  hidden: string;
  history: string;
  mission: string;
  missionResult: string;
  noRole: string;
  noAction: string;
  noRecord: string;
  notOnTeam: string;
  phaseAssassination: string;
  phaseMission: string;
  phaseTeam: string;
  reject: string;
  reveal: string;
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
    day: "天",
    fail: "失败",
    help: "玩法提示",
    helpBody:
      "默认停在当前天。点击上方圆点回看过往投票和任务记录；只有亮起的大按钮需要你现在操作。",
    helpClose: "知道了",
    hidden: "先确认周围没人偷看，再揭开身份。",
    history: "回看",
    mission: "任务牌",
    missionResult: "任务结果",
    noRole: "房主还没有开始发身份。",
    noAction: "这一步先听桌面讨论。",
    noRecord: "暂无记录",
    notOnTeam: "本轮你不在任务队伍。",
    phaseAssassination: "刺杀",
    phaseMission: "任务",
    phaseTeam: "投票",
    reject: "反对",
    reveal: "揭开身份",
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
    day: "Day",
    fail: "Fail",
    help: "Tip",
    helpBody:
      "This opens on the current day. Tap earlier dots to review past votes and quest records; only bright action buttons need your input.",
    helpClose: "Got it",
    hidden: "Check the room before revealing your identity.",
    history: "History",
    mission: "Quest card",
    missionResult: "Quest result",
    noRole: "The host has not dealt roles yet.",
    noAction: "Listen to the table for this step.",
    noRecord: "No record yet",
    notOnTeam: "You are not on this quest team.",
    phaseAssassination: "Assassinate",
    phaseMission: "Quest",
    phaseTeam: "Vote",
    reject: "Reject",
    reveal: "Reveal role",
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
    day: "Jour",
    fail: "Échec",
    help: "Astuce",
    helpBody:
      "La page s'ouvre sur le jour actuel. Touche les anciens points pour revoir votes et quêtes; seuls les gros boutons lumineux demandent une action.",
    helpClose: "Compris",
    hidden: "Vérifie autour de toi avant de révéler ton identité.",
    history: "Historique",
    mission: "Carte quête",
    missionResult: "Résultat",
    noRole: "L'hôte n'a pas encore distribué les rôles.",
    noAction: "Écoute la table pour cette étape.",
    noRecord: "Aucun enregistrement",
    notOnTeam: "Tu n'es pas dans cette équipe.",
    phaseAssassination: "Cible",
    phaseMission: "Quête",
    phaseTeam: "Vote",
    reject: "Refuser",
    reveal: "Révéler",
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

export function AvalonPrivateRoleCard({
  locale,
  payload,
  privateToken,
  roleKey,
  roomSeats,
  roomState,
  roomStatus,
  roomSubmissions,
  seatId,
  seatDisplayName,
  seatNumber,
}: AvalonPrivateRoleCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(roomState.roundIndex);
  const t = copies[locale] ?? copies.en;
  const canReveal = roomStatus === "IN_PROGRESS" && payload;
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
    <section className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-3 shadow-2xl shadow-[#156240]/15 sm:p-6">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#F09182]/18 blur-3xl" />
      <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[#8AB68E]/24 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(241,242,236,0.98),rgba(254,255,249,0))]" />

      <div className="relative grid gap-3 sm:gap-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1.55rem] border border-[#D6D5B2] bg-white/78 px-3 py-3 shadow-sm backdrop-blur">
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
            </div>
          </div>
          <button
            aria-label={t.help}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#8AB68E] bg-[#FEFFF9] text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            onClick={() => setHelpOpen(true)}
            type="button"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        </header>

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

        <section
          className={cn(
            "rounded-[1.65rem] border p-2.5 transition sm:p-4",
            revealed
              ? "border-[#8AB68E]/45 bg-white/78"
              : "border-[#1D1D1B]/10 bg-[#1D1D1B]",
          )}
        >
          {!canReveal ? (
            <div className="grid min-h-28 place-items-center rounded-[1.35rem] border border-dashed border-[#D6D5B2] bg-white/75 p-4 text-center">
              <ShieldAlert className="h-8 w-8 text-[#F09182]" />
              <p className="mt-2 text-sm font-bold text-[#1D1D1B]">{t.noRole}</p>
            </div>
          ) : revealed ? (
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
              <div className="relative mx-auto grid h-32 w-28 place-items-center rounded-[1.45rem] border border-[#D6D5B2] bg-[linear-gradient(145deg,#FEFFF9,#F1F2EC)] shadow-xl shadow-[#156240]/10">
                <Image
                  alt=""
                  className="h-20 w-20 object-contain drop-shadow-md"
                  height={96}
                  src={getRoleIconPath(roleKey)}
                  width={96}
                />
                <span className="absolute -bottom-2 rounded-full bg-[#156240] px-3 py-1 text-[0.68rem] font-black text-white shadow-lg">
                  {payload.alignmentLabel}
                </span>
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#156240]/70">
                  <Eye className="h-3.5 w-3.5" />
                  {t.role}
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight tracking-normal text-[#0E2A5A] sm:text-3xl">
                  {payload.roleLabel}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#1D1D1B]/72">
                  {payload.roleDescription}
                </p>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <p className="inline-flex items-center gap-2 text-sm font-black text-[#156240]">
                  <Users className="h-4 w-4" />
                  {t.visible}
                </p>
                {payload.visibleHints.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {payload.visibleHints.map((hint) => (
                      <div
                        className="relative grid min-h-28 place-items-center rounded-[1.25rem] border border-[#D6D5B2] bg-white px-2 py-3 text-center shadow-sm"
                        key={`${hint.seatNumber}-${hint.label}`}
                      >
                        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#156240] text-[0.7rem] font-black text-white shadow-sm">
                          {hint.seatNumber}
                        </span>
                        <Image
                          alt=""
                          className="h-14 w-14 object-contain drop-shadow-md"
                          height={64}
                          src={getRoleIconPath(hint.roleKey ?? null)}
                          width={64}
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-xs font-black text-[#0E2A5A]">
                            {hint.displayName}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[0.66rem] font-black text-[#156240]/70">
                            {hint.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-20 place-items-center rounded-[1.25rem] border border-[#D6D5B2] bg-white shadow-sm">
                    <Image
                      alt=""
                      className="h-14 w-14 opacity-70"
                      height={64}
                      src="/game-tools/avalon/roles/role-unknown.svg"
                      width={64}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_25%_25%,rgba(240,145,130,0.22),transparent_38%),radial-gradient(circle_at_70%_65%,rgba(138,182,142,0.28),transparent_34%)] p-5 text-center text-white">
              <div>
                <Image
                  alt=""
                  className="mx-auto h-28 w-20 drop-shadow-2xl"
                  height={148}
                  src="/game-tools/avalon/roles/private-card-back.svg"
                  width={104}
                />
                <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-white/80">
                  {t.hidden}
                </p>
                <button
                  className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#156240] shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
                  onClick={() => setRevealed(true)}
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  {t.reveal}
                </button>
              </div>
            </div>
          )}
        </section>
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

function HelpDialog({ onClose, t }: { onClose: () => void; t: Copy }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#1D1D1B]/28 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-md overflow-hidden rounded-[1.7rem] border border-[#8AB68E] bg-[#FEFFF9] shadow-2xl shadow-[#1D1D1B]/18">
        <div className="flex items-center justify-between gap-3 border-b border-[#D6D5B2] bg-[#F1F2EC] px-4 py-3">
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
        <div className="grid gap-4 p-4">
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
        canFail={
          roleKey === "assassin" ||
          roleKey === "minion" ||
          roleKey === "mordred" ||
          roleKey === "morgana" ||
          roleKey === "oberon"
        }
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
            icon: "/game-tools/avalon/states/live-sync-token.svg",
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
      <ActionError error={state.formError} />
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
      <ActionError error={state.formError} />
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
      <ActionError error={state.formError} />
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
      <button
        className="group relative grid min-h-36 w-full place-items-center overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-sm font-black text-[#156240] shadow-sm transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-[#8AB68E] hover:shadow-xl hover:shadow-[#156240]/10 sm:min-h-40"
        type="submit"
      >
        <span className="absolute inset-x-3 top-3 h-12 rounded-full bg-[#F1F2EC]/70 blur-xl transition group-hover:bg-[#8AB68E]/25" />
        <Image
          alt=""
          className="relative h-24 w-24 drop-shadow-xl transition group-hover:scale-105"
          height={112}
          src={image}
          width={112}
        />
        <span className="relative rounded-full bg-white/90 px-3 py-1 text-xs shadow-sm">
          {label}
        </span>
      </button>
    </form>
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
      {label}
    </button>
  );
}

function RecordedState({ t }: { t: Copy }) {
  return (
    <div className="grid place-items-center rounded-[1.5rem] border border-[#D6D5B2] bg-[#F1F2EC] px-4 py-5 text-center shadow-inner">
      <div className="relative h-16 w-16">
        <Image
          alt=""
          className="h-16 w-16 drop-shadow-md"
          height={72}
          src="/game-tools/avalon/states/mission-pending-token.svg"
          width={72}
        />
      </div>
      <p className="mt-2 text-sm font-black text-[#156240]">{t.wait}</p>
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
