"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Check,
  Crown,
  Eye,
  EyeOff,
  Moon,
  Skull,
  UsersRound,
} from "lucide-react";
import {
  leaveWerewolfSeatAction,
  startWerewolfRoomAction,
  updateWerewolfReadyAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import type { WerewolfPrivatePayload } from "@/features/game-tools/werewolfConfig";
import type { WerewolfRoomState } from "@/features/game-tools/werewolfRoomState";

type WerewolfPrivateSeatCardProps = {
  allReady: boolean;
  isJudgeSeat: boolean;
  isReady: boolean;
  locale: string;
  payload: WerewolfPrivatePayload | null;
  privateToken: string;
  roomHref: string;
  roomState: WerewolfRoomState;
  roomStatus: string;
  seatDisplayName: string;
  seatNumber: number;
  seats: Array<{
    displayName: string;
    isJudgeSeat: boolean;
    isPlayerSeat: boolean;
    readyAt: string | null;
    roleLabel: string | null;
    seatNumber: number;
  }>;
  variantLabel: string;
};

type Copy = {
  allReady: string;
  back: string;
  boundary: string;
  hide: string;
  judgeHelper: string;
  leaveSeat: string;
  noRole: string;
  notReady: string;
  ready: string;
  reveal: string;
  role: string;
  seat: string;
  start: string;
  startConfirm: string;
  started: string;
  unready: string;
  waiting: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    allReady: "全员已准备，法官可以开始。",
    back: "返回房间",
    boundary: "发言、投票、计时和夜晚行动继续由线下法官主持。",
    hide: "盖回去",
    judgeHelper: "你是法官。所有玩家和法官准备后，可以从这里开始游戏并发身份。",
    leaveSeat: "离开座位",
    noRole: "法官还没有开始发身份。",
    notReady: "等待所有座位准备。",
    ready: "我准备好了",
    reveal: "查看我的角色",
    role: "角色",
    seat: "座位",
    start: "开始游戏并发身份",
    startConfirm: "确认开始游戏并随机发身份？开始后不能换座或加入本局。",
    started: "游戏已开始",
    unready: "取消准备",
    waiting: "已准备，等待其他人。",
  },
  en: {
    allReady: "Everyone is ready. The judge can start.",
    back: "Back to room",
    boundary:
      "Speaking, votes, timing, and night actions stay with the offline judge.",
    hide: "Hide",
    judgeHelper:
      "You are the judge. Once everyone is ready, start the game and deal roles here.",
    leaveSeat: "Leave seat",
    noRole: "The judge has not dealt roles yet.",
    notReady: "Waiting for every seat to be ready.",
    ready: "I'm ready",
    reveal: "Reveal my role",
    role: "Role",
    seat: "Seat",
    start: "Start and deal roles",
    startConfirm:
      "Start the game and randomly deal roles? Seats lock after this.",
    started: "Game started",
    unready: "Cancel ready",
    waiting: "Ready. Waiting for the table.",
  },
  fr: {
    allReady: "Tout le monde est prêt. Le maître peut commencer.",
    back: "Retour salle",
    boundary:
      "Parole, votes, rythme et nuit restent gérés par le maître du jeu.",
    hide: "Masquer",
    judgeHelper:
      "Vous êtes le maître du jeu. Quand tout le monde est prêt, démarrez et distribuez les rôles ici.",
    leaveSeat: "Quitter la place",
    noRole: "Le maître du jeu n'a pas encore distribué les rôles.",
    notReady: "En attente de toutes les places.",
    ready: "Je suis prêt",
    reveal: "Voir mon rôle",
    role: "Rôle",
    seat: "Place",
    start: "Démarrer et distribuer",
    startConfirm:
      "Démarrer la partie et distribuer les rôles ? Les places seront verrouillées.",
    started: "Partie commencée",
    unready: "Annuler prêt",
    waiting: "Prêt. En attente de la table.",
  },
};

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
        "inline-flex h-11 items-center justify-center rounded-full bg-[#7A1F2B] px-4 text-sm font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
      }
      disabled={pending || disabled}
      type="submit"
    >
      {label}
    </button>
  );
}

function getRoleTone(payload: WerewolfPrivatePayload | null) {
  if (!payload) {
    return "from-[#1E1718] to-[#3D2E31]";
  }

  return payload.alignmentLabel.toLowerCase().includes("wolf") ||
    payload.alignmentLabel.includes("狼") ||
    payload.alignmentLabel.toLowerCase().includes("loup")
    ? "from-[#4A1018] to-[#9B2D3C]"
    : "from-[#15395C] to-[#2F6E7C]";
}

export function WerewolfPrivateSeatCard({
  allReady,
  isJudgeSeat,
  isReady,
  locale,
  payload,
  privateToken,
  roomHref,
  roomState,
  roomStatus,
  seatDisplayName,
  seatNumber,
  seats,
  variantLabel,
}: WerewolfPrivateSeatCardProps) {
  const [readyState, readyAction] = useActionState(
    updateWerewolfReadyAction,
    initialState,
  );
  const [startState, startAction] = useActionState(
    startWerewolfRoomAction,
    initialState,
  );
  const [leaveState, leaveAction] = useActionState(
    leaveWerewolfSeatAction,
    initialState,
  );
  const [revealed, setRevealed] = useState(false);
  const t = copies[locale] ?? copies.en;
  const canStart = isJudgeSeat && roomStatus === "LOBBY" && allReady;
  const readySeats = useMemo(
    () => seats.filter((seat) => Boolean(seat.readyAt)).length,
    [seats],
  );

  useEffect(() => {
    if (!revealed) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRevealed(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [revealed]);

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#7A1F2B] shadow-sm transition hover:bg-[#FFF7F1]"
        href={roomHref}
      >
        <ArrowLeft className="h-4 w-4" />
        {t.back}
      </Link>

      <section className="overflow-hidden rounded-[1.6rem] border border-[#D9C7B4] bg-[#FFFDF7] shadow-[0_18px_48px_rgba(30,23,24,0.08)]">
        <div className={`bg-gradient-to-br ${getRoleTone(payload)} p-5 text-white sm:p-7`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] backdrop-blur">
              {isJudgeSeat ? (
                <Crown className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              {variantLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-black text-[#1E1718]">
              {t.seat} {seatNumber}
            </span>
          </div>

          <div className="mt-8 grid place-items-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-white/30 bg-white/12 text-5xl font-black shadow-[0_22px_48px_rgba(0,0,0,0.22)]">
              {seatNumber}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-normal">
              {seatDisplayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/72">
              {isJudgeSeat ? t.judgeHelper : t.boundary}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          {roomStatus === "LOBBY" ? (
            <div className="grid gap-3 rounded-[1.2rem] border border-[#D9C7B4] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
                  <UsersRound className="h-4 w-4 text-[#7A1F2B]" />
                  {readySeats}/{seats.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F4ECE6] px-3 py-1.5 text-xs font-black text-[#7A1F2B]">
                  {isReady ? <Check className="h-3.5 w-3.5" /> : null}
                  {isReady ? t.waiting : t.notReady}
                </span>
              </div>

              <form action={readyAction} className="flex flex-wrap gap-2">
                <input name="locale" type="hidden" value={locale} />
                <input name="privateToken" type="hidden" value={privateToken} />
                <input
                  name="operation"
                  type="hidden"
                  value={isReady ? "unready" : "ready"}
                />
                <SubmitButton label={isReady ? t.unready : t.ready} />
              </form>

              <form action={leaveAction}>
                <input name="locale" type="hidden" value={locale} />
                <input name="privateToken" type="hidden" value={privateToken} />
                <SubmitButton
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#D9C7B4] bg-white px-4 text-sm font-black text-[#7A1F2B] transition hover:bg-[#FFF7F1] disabled:cursor-not-allowed disabled:opacity-55"
                  label={t.leaveSeat}
                />
              </form>

              {readyState.formError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {readyState.formError}
                </p>
              ) : null}
              {leaveState.formError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {leaveState.formError}
                </p>
              ) : null}
            </div>
          ) : null}

          {isJudgeSeat && roomStatus === "LOBBY" ? (
            <div className="grid gap-3 rounded-[1.2rem] border border-[#D9C7B4] bg-[#1E1718] p-4 text-white">
              <p className="text-sm font-bold text-white/72">
                {allReady ? t.allReady : t.notReady}
              </p>
              <form
                action={startAction}
                onSubmit={(event) => {
                  if (!window.confirm(t.startConfirm)) {
                    event.preventDefault();
                  }
                }}
              >
                <input name="locale" type="hidden" value={locale} />
                <input name="privateToken" type="hidden" value={privateToken} />
                <SubmitButton
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#1E1718] transition hover:bg-[#F4ECE6] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canStart}
                  label={t.start}
                />
              </form>
              {startState.formError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {startState.formError}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isJudgeSeat ? (
            <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-4">
              <span className="text-sm font-black text-[#7A1F2B]">
                {t.role}
              </span>
              <div className="mt-3 grid min-h-64 place-items-center rounded-[1.1rem] bg-[#F7F3EC] p-4 text-center">
                {roomStatus === "IN_PROGRESS" && payload ? (
                  <div className="grid gap-4">
                    <div
                      className={`grid h-44 w-32 place-items-center rounded-[1.1rem] border border-[#D9C7B4] bg-gradient-to-br ${revealed ? getRoleTone(payload) : "from-[#1E1718] to-[#3D2E31]"} p-3 text-white shadow-[0_22px_48px_rgba(30,23,24,0.22)] transition`}
                    >
                      {revealed ? (
                        <div>
                          <p className="text-2xl font-black">
                            {payload.roleLabel}
                          </p>
                          <p className="mt-2 text-xs font-bold text-white/72">
                            {payload.alignmentLabel}
                          </p>
                        </div>
                      ) : (
                        <EyeOff className="h-10 w-10 text-white/76" />
                      )}
                    </div>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-4 text-sm font-black text-white transition hover:bg-[#9B2D3C]"
                      onClick={() => setRevealed((current) => !current)}
                      type="button"
                    >
                      {revealed ? t.hide : t.reveal}
                      {revealed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <p className="max-w-sm text-sm font-bold leading-6 text-[#7A1F2B]/72">
                      {payload.roleDescription}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Skull className="mx-auto h-10 w-10 text-[#7A1F2B]/35" />
                    <p className="mt-3 text-sm font-bold text-[#7A1F2B]/72">
                      {roomStatus === "IN_PROGRESS" ? t.noRole : t.noRole}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-4">
              <span className="text-sm font-black text-[#7A1F2B]">
                {roomState.phase === "IN_PROGRESS" ? t.started : t.role}
              </span>
              <div className="mt-3 grid gap-2">
                {seats
                  .filter((seat) => seat.isPlayerSeat)
                  .map((seat) => (
                    <div
                      className="flex items-center justify-between rounded-2xl bg-[#F7F3EC] px-3 py-2 text-sm font-bold text-[#1E1718]"
                      key={seat.seatNumber}
                    >
                      <span>
                        {t.seat} {seat.seatNumber} · {seat.displayName}
                      </span>
                      <span className="text-[#7A1F2B]">
                        {roomStatus === "IN_PROGRESS"
                          ? (seat.roleLabel ?? "-")
                          : seat.readyAt
                            ? "ready"
                            : "-"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
