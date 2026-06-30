"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, ShieldAlert, Users } from "lucide-react";
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
  fail: string;
  hidden: string;
  mission: string;
  noRole: string;
  reject: string;
  reveal: string;
  seat: string;
  submit: string;
  success: string;
  target: string;
  vote: string;
  visible: string;
  wait: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    fail: "失败",
    hidden: "先确认周围没人偷看，再揭开身份。",
    mission: "任务牌",
    noRole: "房主还没有开始发身份。",
    reject: "反对",
    reveal: "揭开身份",
    seat: "座位",
    submit: "提交",
    success: "成功",
    target: "刺杀目标",
    vote: "投票",
    visible: "你能看到",
    wait: "已记录，等待其他玩家",
  },
  en: {
    fail: "Fail",
    hidden: "Check the room before revealing your identity.",
    mission: "Quest card",
    noRole: "The host has not dealt roles yet.",
    reject: "Reject",
    reveal: "Reveal role",
    seat: "Seat",
    submit: "Submit",
    success: "Success",
    target: "Target",
    vote: "Vote",
    visible: "You can see",
    wait: "Recorded. Waiting for the table.",
  },
  fr: {
    fail: "Échec",
    hidden: "Vérifie autour de toi avant de révéler ton identité.",
    mission: "Carte quête",
    noRole: "L'hôte n'a pas encore distribué les rôles.",
    reject: "Refuser",
    reveal: "Révéler",
    seat: "Place",
    submit: "Valider",
    success: "Succès",
    target: "Cible",
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
  const t = copies[locale] ?? copies.en;
  const canReveal = roomStatus === "IN_PROGRESS" && payload;

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-2xl shadow-[#156240]/15 sm:p-6">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#F09182]/20 blur-3xl" />
      <div className="absolute -bottom-14 left-4 h-40 w-40 rounded-full bg-[#8AB68E]/20 blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#156240]">
              Friemi Table Lab
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#0E2A5A]">
              {seatDisplayName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#156240]/75">
              {t.seat} {seatNumber}
            </p>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#156240] text-white shadow-lg shadow-[#156240]/20">
            <Image
              alt=""
              className="h-8 w-8"
              height={36}
              src="/game-tools/avalon/avalon-tool-icon.svg"
              width={36}
            />
          </span>
        </div>

        {!canReveal ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#D6D5B2] bg-white/75 p-5 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-[#F09182]" />
            <p className="mt-3 text-sm font-bold text-[#1D1D1B]">{t.noRole}</p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-[1.75rem] border p-3 transition sm:p-4",
              revealed
                ? "border-[#156240]/35 bg-white"
                : "border-[#D6D5B2] bg-[#1D1D1B]",
            )}
          >
            {revealed ? (
              <div className="space-y-4">
                <div className="grid gap-4 rounded-[1.5rem] bg-[radial-gradient(circle_at_25%_20%,rgba(255,245,230,0.95),transparent_36%),linear-gradient(135deg,#F1F2EC,#FEFFF9)] p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
                  <div className="relative mx-auto grid h-40 w-32 place-items-center rounded-[1.65rem] border border-[#D6D5B2] bg-white shadow-xl shadow-[#156240]/10">
                    <Image
                      alt=""
                      className="h-28 w-28"
                      height={112}
                      src={getRoleIconPath(roleKey)}
                      width={112}
                    />
                    <span className="absolute -bottom-3 rounded-full bg-[#156240] px-3 py-1 text-xs font-black text-white shadow-lg">
                      {payload.alignmentLabel}
                    </span>
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <h2 className="text-4xl font-black leading-tight tracking-normal text-[#0E2A5A]">
                      {payload.roleLabel}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#1D1D1B]/75">
                      {payload.roleDescription}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-black text-[#156240]">
                    <Users className="h-4 w-4" />
                    {t.visible}
                  </p>
                  {payload.visibleHints.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {payload.visibleHints.map((hint) => (
                        <div
                          className="relative grid min-h-32 place-items-center rounded-[1.35rem] border border-[#D6D5B2] bg-white px-2 py-3 text-center shadow-sm"
                          key={`${hint.seatNumber}-${hint.label}`}
                        >
                          <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#156240] text-[0.7rem] font-black text-white shadow-sm">
                            {hint.seatNumber}
                          </span>
                          <Image
                            alt=""
                            className="h-16 w-16 object-contain drop-shadow-md"
                            height={72}
                            src={getRoleIconPath(hint.roleKey ?? null)}
                            width={72}
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
                    <div className="grid min-h-24 place-items-center rounded-[1.35rem] border border-[#D6D5B2] bg-white shadow-sm">
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
              <div className="grid min-h-72 place-items-center rounded-[1.25rem] border border-white/10 bg-[radial-gradient(circle_at_25%_25%,rgba(240,145,130,0.22),transparent_38%),radial-gradient(circle_at_70%_65%,rgba(138,182,142,0.28),transparent_34%)] p-6 text-center text-white">
                <div>
                  <Image
                    alt=""
                    className="mx-auto h-32 w-24 drop-shadow-2xl"
                    height={160}
                    src="/game-tools/avalon/roles/private-card-back.svg"
                    width={112}
                  />
                  <p className="mt-4 max-w-xs text-sm font-semibold leading-6 text-white/80">
                    {t.hidden}
                  </p>
                  <button
                    className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#156240] shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
                    onClick={() => setRevealed(true)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" />
                    {t.reveal}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <PrivateActionPanel
          locale={locale}
          privateToken={privateToken}
          roleKey={roleKey}
          roomSeats={roomSeats}
          roomState={roomState}
          roomStatus={roomStatus}
          roomSubmissions={roomSubmissions}
          seatId={seatId}
          seatNumber={seatNumber}
          t={t}
        />
      </div>
    </section>
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
  seatId: string;
  seatNumber: number;
  t: Copy;
}) {
  if (roomStatus !== "IN_PROGRESS") {
    return null;
  }

  const currentRoundSubmissions = roomSubmissions.filter(
    (submission) => submission.roundIndex === roomState.roundIndex,
  );
  const hasVoted = currentRoundSubmissions.some(
    (submission) => submission.kind === "TEAM_VOTE" && submission.seatId === seatId,
  );
  const hasMissionCard = currentRoundSubmissions.some(
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

  return null;
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
          label={t.success}
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
        className="group relative grid min-h-40 w-full place-items-center overflow-hidden rounded-[1.5rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-sm font-black text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:shadow-xl hover:shadow-[#156240]/10"
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
