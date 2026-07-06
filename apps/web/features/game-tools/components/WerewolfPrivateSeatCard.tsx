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
  Flag,
  HeartPulse,
  Sparkles,
  TimerReset,
  Moon,
  ShieldCheck,
  Skull,
  UsersRound,
} from "lucide-react";
import {
  finishWerewolfRoomAction,
  leaveWerewolfSeatAction,
  startWerewolfRoomAction,
  updateWerewolfPlayerLifeAction,
  updateWerewolfReadyAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import type { WerewolfPrivatePayload } from "@/features/game-tools/werewolfConfig";
import type { WerewolfRoomState } from "@/features/game-tools/werewolfRoomState";

type WerewolfPrivateSeatCardProps = {
  allReady: boolean;
  isDead: boolean;
  isJudgeSeat: boolean;
  isReady: boolean;
  locale: string;
  payload: WerewolfPrivatePayload | null;
  privateToken: string;
  roleAlignment: string | null;
  roomHref: string;
  roomState: WerewolfRoomState;
  roomStatus: string;
  seatDisplayName: string;
  seatNumber: number;
  seats: Array<{
    displayName: string;
    isDead: boolean;
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
  alive: string;
  back: string;
  boundary: string;
  dead: string;
  deathBody: string;
  deathTitle: string;
  dealingSubtitle: string;
  dealingTitle: string;
  finishGame: string;
  finishGood: string;
  finishGoodConfirm: string;
  finishWerewolf: string;
  finishWerewolfConfirm: string;
  finished: string;
  hide: string;
  hiddenBody: string;
  hiddenTitle: string;
  judgeHelper: string;
  judgePrompts: string[];
  judgeStatus: string;
  leaveSeat: string;
  markDead: string;
  noRole: string;
  notReady: string;
  ready: string;
  reveal: string;
  resultDefeat: string;
  resultJudgeBody: string;
  resultOutcome: string;
  resultRole: string;
  resultTeam: string;
  resultVictory: string;
  revive: string;
  role: string;
  roleHidden: string;
  roleWaiting: string;
  seat: string;
  start: string;
  startConfirm: string;
  started: string;
  statusError: string;
  unready: string;
  visibleFor: string;
  waiting: string;
  winnerGood: string;
  winnerWerewolf: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    allReady: "可以发身份",
    alive: "存活",
    back: "返回房间",
    boundary: "听法官主持，手机只看身份。",
    dead: "死亡",
    deathBody: "你已出局，留在房间看结算。",
    deathTitle: "你已出局",
    dealingSubtitle: "身份已经放进你的座位页。",
    dealingTitle: "身份发好了",
    finishGame: "结束游戏",
    finishGood: "好人阵营获胜",
    finishGoodConfirm: "好人阵营获胜，结束本局？",
    finishWerewolf: "狼人阵营获胜",
    finishWerewolfConfirm: "狼人阵营获胜，结束本局？",
    finished: "本局已结束",
    hide: "盖回去",
    hiddenBody: "2 秒后自动盖回。",
    hiddenTitle: "盖住了",
    judgeHelper: "你坐法官席。人齐准备后，从这里发身份。",
    judgePrompts: [
      "天黑请闭眼",
      "狼人请睁眼",
      "预言家请睁眼",
      "女巫请睁眼",
      "天亮了",
      "进入发言",
      "进入投票",
      "宣布死亡",
    ],
    judgeStatus: "法官席",
    leaveSeat: "离座",
    markDead: "标记死亡",
    noRole: "等发身份",
    notReady: "等人齐",
    ready: "准备",
    reveal: "查看我的角色",
    resultDefeat: "失败",
    resultJudgeBody: "这局你坐法官席。",
    resultOutcome: "本局结果",
    resultRole: "本局角色",
    resultTeam: "所属阵营",
    resultVictory: "胜利",
    revive: "取消死亡",
    role: "角色",
    roleHidden: "只给自己看。",
    roleWaiting: "开局后显示身份。",
    seat: "座位",
    start: "发身份",
    startConfirm: "发身份后座位会锁定，确定开局？",
    started: "游戏已开始",
    statusError: "没改成功，再试一次。",
    unready: "取消准备",
    visibleFor: "剩余",
    waiting: "已准备",
    winnerGood: "好人阵营获胜",
    winnerWerewolf: "狼人阵营获胜",
  },
  en: {
    allReady: "The table is ready. Deal roles.",
    alive: "Alive",
    back: "Back to room",
    boundary:
      "Keep speeches, votes, and night calls at the table.",
    dead: "Dead",
    deathBody: "You are out. Stay in the room for the result.",
    deathTitle: "You are out",
    dealingSubtitle: "Your role is now on this seat page.",
    dealingTitle: "Roles are dealt",
    finishGame: "End game",
    finishGood: "Good team wins",
    finishGoodConfirm: "End the game and mark the good team as winner?",
    finishWerewolf: "Werewolf team wins",
    finishWerewolfConfirm: "End the game and mark the werewolf team as winner?",
    finished: "Game finished",
    hide: "Hide",
    hiddenBody: "Tap to reveal for 2 seconds.",
    hiddenTitle: "Role hidden",
    judgeHelper:
      "You are in the judge seat. Once the table is ready, deal roles here.",
    judgePrompts: [
      "Night falls",
      "Werewolves open eyes",
      "Seer opens eyes",
      "Witch opens eyes",
      "Day breaks",
      "Start speeches",
      "Start voting",
      "Announce deaths",
    ],
    judgeStatus: "Judge seat",
    leaveSeat: "Leave seat",
    markDead: "Mark dead",
    noRole: "Roles are not dealt yet.",
    notReady: "Waiting for the table.",
    ready: "I'm ready",
    reveal: "Reveal my role",
    resultDefeat: "Defeat",
    resultJudgeBody: "You sat in the judge seat this game.",
    resultOutcome: "Result",
    resultRole: "Role",
    resultTeam: "Team",
    resultVictory: "Victory",
    revive: "Revive",
    role: "Role",
    roleHidden: "Reveal to see your role and team.",
    roleWaiting: "Once the table starts, your role appears here.",
    seat: "Seat",
    start: "Deal roles",
    startConfirm:
      "Start the game and randomly deal roles? Seats lock after this.",
    started: "Game started",
    statusError: "That did not go through. Try again.",
    unready: "Cancel ready",
    visibleFor: "Left",
    waiting: "Ready. Waiting for the table.",
    winnerGood: "Good team wins",
    winnerWerewolf: "Werewolf team wins",
  },
  fr: {
    allReady: "La table est prête. Distribuez les rôles.",
    alive: "Vivant",
    back: "Retour salle",
    boundary:
      "La parole, les votes et la nuit restent autour de la table.",
    dead: "Mort",
    deathBody: "Vous êtes éliminé. Restez pour voir le résultat.",
    deathTitle: "Vous êtes éliminé",
    dealingSubtitle: "Votre rôle est maintenant sur cette page.",
    dealingTitle: "Rôles distribués",
    finishGame: "Terminer",
    finishGood: "Village gagnant",
    finishGoodConfirm: "Terminer la partie avec le village gagnant ?",
    finishWerewolf: "Loups gagnants",
    finishWerewolfConfirm: "Terminer la partie avec les loups gagnants ?",
    finished: "Partie terminée",
    hide: "Masquer",
    hiddenBody: "Touchez pour révéler 2 secondes.",
    hiddenTitle: "Rôle masqué",
    judgeHelper:
      "Vous êtes à la place du maître. Quand la table est prête, distribuez les rôles ici.",
    judgePrompts: [
      "La nuit tombe",
      "Les loups ouvrent les yeux",
      "La voyante ouvre les yeux",
      "La sorcière ouvre les yeux",
      "Le jour se lève",
      "Début des paroles",
      "Début du vote",
      "Annonce des morts",
    ],
    judgeStatus: "Place du maître",
    leaveSeat: "Quitter la place",
    markDead: "Marquer mort",
    noRole: "Les rôles ne sont pas encore distribués.",
    notReady: "En attente de la table.",
    ready: "Je suis prêt",
    reveal: "Voir mon rôle",
    resultDefeat: "Défaite",
    resultJudgeBody: "Vous étiez à la place du maître cette partie.",
    resultOutcome: "Résultat",
    resultRole: "Rôle",
    resultTeam: "Camp",
    resultVictory: "Victoire",
    revive: "Réanimer",
    role: "Rôle",
    roleHidden:
      "Révélez pour voir votre rôle et votre camp.",
    roleWaiting: "Quand la partie démarre, votre rôle apparaît ici.",
    seat: "Place",
    start: "Distribuer les rôles",
    startConfirm:
      "Démarrer la partie et distribuer les rôles ? Les places seront verrouillées.",
    started: "Partie commencée",
    statusError: "Ça n'a pas marché. Réessayez.",
    unready: "Annuler prêt",
    visibleFor: "Reste",
    waiting: "Prêt. En attente de la table.",
    winnerGood: "Village gagnant",
    winnerWerewolf: "Loups gagnants",
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

function getPrivateRoleIcon(payload: WerewolfPrivatePayload | null) {
  const text = `${payload?.roleLabel ?? ""} ${payload?.alignmentLabel ?? ""}`.toLowerCase();

  if (
    text.includes("狼") ||
    text.includes("werewolf") ||
    text.includes("loup")
  ) {
    return Moon;
  }

  if (
    text.includes("预言") ||
    text.includes("seer") ||
    text.includes("voyante")
  ) {
    return Eye;
  }

  if (
    text.includes("女巫") ||
    text.includes("witch") ||
    text.includes("sorci")
  ) {
    return Sparkles;
  }

  if (
    text.includes("猎") ||
    text.includes("hunter") ||
    text.includes("chasseur")
  ) {
    return Flag;
  }

  if (
    text.includes("白痴") ||
    text.includes("idiot")
  ) {
    return ShieldCheck;
  }

  return UsersRound;
}

export function WerewolfPrivateSeatCard({
  allReady,
  isDead,
  isJudgeSeat,
  isReady,
  locale,
  payload,
  privateToken,
  roleAlignment,
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
  const [lifeState, lifeAction] = useActionState(
    updateWerewolfPlayerLifeAction,
    initialState,
  );
  const [finishState, finishAction] = useActionState(
    finishWerewolfRoomAction,
    initialState,
  );
  const [revealed, setRevealed] = useState(false);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);
  const [showDealIntro, setShowDealIntro] = useState(false);
  const [showDeathIntro, setShowDeathIntro] = useState(false);
  const [showResultIntro, setShowResultIntro] = useState(false);
  const t = copies[locale] ?? copies.en;
  const canStart = isJudgeSeat && roomStatus === "LOBBY" && allReady;
  const winnerLabel =
    roomState.winner === "GOOD"
      ? t.winnerGood
      : roomState.winner === "WEREWOLF"
        ? t.winnerWerewolf
        : null;
  const resultKind =
    !isJudgeSeat && roomStatus === "FINISHED" && roomState.winner && roleAlignment
      ? (roomState.winner === "WEREWOLF" && roleAlignment === "werewolf") ||
        (roomState.winner === "GOOD" && roleAlignment === "good")
        ? "WIN"
        : "LOSE"
      : null;
  const readySeats = useMemo(
    () => seats.filter((seat) => Boolean(seat.readyAt)).length,
    [seats],
  );
  const RoleIcon = getPrivateRoleIcon(payload);

  useEffect(() => {
    if (!revealed) {
      setRevealSecondsLeft(0);
      return;
    }

    setRevealSecondsLeft(2);
    const tick = window.setInterval(() => {
      setRevealSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    const timer = window.setTimeout(() => {
      setRevealed(false);
    }, 2000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [revealed]);

  useEffect(() => {
    if (isJudgeSeat || roomStatus !== "IN_PROGRESS" || !payload) {
      return;
    }

    const storageKey = `friemi:werewolf:deal-intro:${privateToken}:${roomState.startedAt ?? "started"}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    setShowDealIntro(true);
    const timer = window.setTimeout(() => {
      setShowDealIntro(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [isJudgeSeat, payload, privateToken, roomState.startedAt, roomStatus]);

  useEffect(() => {
    if (isJudgeSeat || !isDead) {
      return;
    }

    const storageKey = `friemi:werewolf:death-intro:${privateToken}:${roomState.deadSeatNumbers.join("-")}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    setShowDeathIntro(true);
    const timer = window.setTimeout(() => {
      setShowDeathIntro(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isDead, isJudgeSeat, privateToken, roomState.deadSeatNumbers]);

  useEffect(() => {
    if (isJudgeSeat || roomStatus !== "FINISHED" || !resultKind) {
      return;
    }

    const storageKey = `friemi:werewolf:result-intro:${privateToken}:${roomState.finishedAt ?? roomState.winner ?? "finished"}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    setShowResultIntro(true);
    const timer = window.setTimeout(() => {
      setShowResultIntro(false);
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [
    isJudgeSeat,
    privateToken,
    resultKind,
    roomState.finishedAt,
    roomState.winner,
    roomStatus,
  ]);

  return (
    <div className="relative space-y-5">
      {showDealIntro ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E1718]/78 px-6 backdrop-blur-sm">
          <div className="grid w-full max-w-xs place-items-center rounded-[1.25rem] border border-white/14 bg-[#FFFDF7] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#7A1F2B] text-white shadow-[0_16px_34px_rgba(122,31,43,0.28)]">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-4 text-xl font-black text-[#1E1718]">
              {t.dealingTitle}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#7A1F2B]/72">
              {t.dealingSubtitle}
            </p>
          </div>
        </div>
      ) : null}
      {showDeathIntro ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E1718]/82 px-6 backdrop-blur-sm">
          <div className="grid w-full max-w-xs place-items-center rounded-[1.25rem] border border-white/14 bg-[#FFFDF7] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1E1718] text-white shadow-[0_16px_34px_rgba(30,23,24,0.28)]">
              <Skull className="h-7 w-7" />
            </span>
            <p className="mt-4 text-xl font-black text-[#1E1718]">
              {t.deathTitle}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#7A1F2B]/72">
              {t.deathBody}
            </p>
          </div>
        </div>
      ) : null}
      {showResultIntro ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E1718]/82 px-6 backdrop-blur-sm">
          <div className="grid w-full max-w-xs place-items-center overflow-hidden rounded-[1.25rem] border border-white/14 bg-[#FFFDF7] text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <div
              className={`grid w-full place-items-center px-6 py-7 text-white ${
                resultKind === "WIN" ? "bg-[#36624A]" : "bg-[#7A1F2B]"
              }`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#1E1718] shadow-[0_16px_34px_rgba(30,23,24,0.24)]">
                {resultKind === "WIN" ? (
                  <Crown className="h-7 w-7" />
                ) : (
                  <Skull className="h-7 w-7" />
                )}
              </span>
              <p className="mt-4 text-2xl font-black">
                {resultKind === "WIN" ? t.resultVictory : t.resultDefeat}
              </p>
            </div>
            <div className="p-5">
              <p className="text-sm font-black text-[#1E1718]">
                {payload?.roleLabel ?? "-"}
              </p>
              <p className="mt-1 text-xs font-bold text-[#7A1F2B]/72">
                {winnerLabel ?? t.finished}
              </p>
            </div>
          </div>
        </div>
      ) : null}

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

          <div className="mt-6 grid place-items-center text-center sm:mt-8">
            <div className="grid h-20 w-20 place-items-center rounded-full border border-white/30 bg-white/12 text-4xl font-black shadow-[0_22px_48px_rgba(0,0,0,0.22)] sm:h-24 sm:w-24 sm:text-5xl">
              {seatNumber}
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-normal sm:mt-5 sm:text-3xl">
              {seatDisplayName}
            </h1>
            {isJudgeSeat ? (
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/72">
                {t.judgeHelper}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          {roomStatus === "FINISHED" ? (
            <div
              className={`overflow-hidden rounded-[1.2rem] border p-4 ${
                resultKind === "WIN"
                  ? "border-[#8AB68E] bg-[#F4FFF2]"
                  : resultKind === "LOSE"
                    ? "border-[#D8A1A8] bg-[#FFF6F4]"
                    : "border-[#D9C7B4] bg-[#1E1718] text-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-black uppercase tracking-[0.14em] ${
                      resultKind ? "text-[#7A1F2B]/70" : "text-white/62"
                    }`}
                  >
                    {t.finished}
                  </p>
                  <p
                    className={`mt-1 text-2xl font-black ${
                      resultKind === "WIN"
                        ? "text-[#36624A]"
                        : resultKind === "LOSE"
                          ? "text-[#7A1F2B]"
                          : "text-[#F0C36A]"
                    }`}
                  >
                    {resultKind === "WIN"
                      ? t.resultVictory
                      : resultKind === "LOSE"
                        ? t.resultDefeat
                        : (winnerLabel ?? t.finished)}
                  </p>
                </div>
                <span
                  className={`grid h-12 w-12 place-items-center rounded-full ${
                    resultKind === "WIN"
                      ? "bg-[#36624A] text-white"
                      : resultKind === "LOSE"
                        ? "bg-[#7A1F2B] text-white"
                        : "bg-white text-[#1E1718]"
                  }`}
                >
                  {resultKind === "WIN" ? (
                    <Crown className="h-6 w-6" />
                  ) : resultKind === "LOSE" ? (
                    <Skull className="h-6 w-6" />
                  ) : (
                    <Flag className="h-6 w-6" />
                  )}
                </span>
              </div>
              <div
                className={`mt-4 grid gap-2 rounded-[1rem] p-3 text-sm font-bold ${
                  resultKind ? "bg-white text-[#1E1718]" : "bg-white/10 text-white"
                }`}
              >
                {winnerLabel ? (
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={resultKind ? "text-[#7A1F2B]" : "text-white/70"}
                    >
                      {t.resultOutcome}
                    </span>
                    <span className="text-right">{winnerLabel}</span>
                  </div>
                ) : null}
                {!isJudgeSeat ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#7A1F2B]">{t.resultRole}</span>
                      <span className="text-right">
                        {payload?.roleLabel ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#7A1F2B]">{t.resultTeam}</span>
                      <span className="text-right">
                        {payload?.alignmentLabel ?? "-"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="leading-6">{t.resultJudgeBody}</p>
                )}
                <Link
                  className={`mt-2 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-black ${
                    resultKind
                      ? "bg-[#1E1718] text-white hover:bg-[#3A2A2D]"
                      : "bg-white text-[#1E1718] hover:bg-[#F4ECE6]"
                  }`}
                  href={roomHref}
                >
                  {t.back}
                </Link>
              </div>
            </div>
          ) : null}

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-black text-[#7A1F2B]">
                  {t.role}
                </span>
                {isDead ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E1718] px-3 py-1 text-xs font-black text-white">
                    <Skull className="h-3.5 w-3.5" />
                    {t.deathTitle}
                  </span>
                ) : null}
              </div>
              <div
                className={`mt-3 grid place-items-center rounded-[1.1rem] bg-[#F7F3EC] p-4 text-center ${
                  roomStatus === "LOBBY" ? "min-h-32" : "min-h-64"
                }`}
              >
                {(roomStatus === "IN_PROGRESS" || roomStatus === "FINISHED") &&
                payload ? (
                  <div
                    className={`grid w-full max-w-sm place-items-center gap-4 transition ${
                      isDead ? "grayscale" : ""
                    }`}
                  >
                    <div className="h-52 w-36 [perspective:1000px]">
                      <div
                        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                          revealed ? "[transform:rotateY(180deg)]" : ""
                        }`}
                      >
                        <div
                          aria-hidden={revealed}
                        className="absolute inset-0 grid place-items-center rounded-[1rem] border border-[#D9C7B4] bg-gradient-to-br from-[#1E1718] to-[#3D2E31] p-3 text-white shadow-[0_22px_48px_rgba(30,23,24,0.22)] [backface-visibility:hidden]"
                      >
                        <div>
                          <EyeOff className="mx-auto h-10 w-10 text-white/76" />
                          <p className="mt-4 text-base font-black">
                              {t.hiddenTitle}
                            </p>
                            <p className="mt-2 text-xs font-bold leading-5 text-white/58">
                              {t.hiddenBody}
                            </p>
                          </div>
                        </div>
                        {revealed ? (
                          <div
                            aria-live="polite"
                        className={`absolute inset-0 grid place-items-center rounded-[1rem] border border-[#D9C7B4] bg-gradient-to-br ${getRoleTone(payload)} p-3 text-white shadow-[0_22px_48px_rgba(30,23,24,0.22)] [backface-visibility:hidden] [transform:rotateY(180deg)]`}
                      >
                        <div>
                          <RoleIcon className="mx-auto mb-4 h-12 w-12 text-white/86" />
                          <p className="text-2xl font-black">
                            {payload.roleLabel}
                          </p>
                              <p className="mt-2 text-xs font-bold text-white/72">
                                {payload.alignmentLabel}
                              </p>
                              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2 py-1 text-[11px] font-black text-white">
                                <TimerReset className="h-3.5 w-3.5" />
                                {t.visibleFor} {revealSecondsLeft}s
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
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
                    {revealed || isDead ? (
                      <div className="min-h-20 w-full rounded-[1rem] border border-[#D9C7B4] bg-white px-4 py-3 text-left">
                        {revealed ? (
                          <>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A1F2B]/62">
                              {payload.variantLabel}
                            </p>
                            <p className="mt-2 text-sm font-bold leading-6 text-[#1E1718]">
                              {payload.roleDescription}
                            </p>
                          </>
                        ) : null}
                      {isDead ? (
                        <p className="mt-2 rounded-2xl bg-[#F4ECE6] px-3 py-2 text-sm font-black text-[#1E1718]">
                          {t.deathBody}
                        </p>
                      ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="max-w-xs">
                    <Moon className="mx-auto h-10 w-10 text-[#7A1F2B]/38" />
                    <p className="mt-3 text-base font-black text-[#1E1718]">
                      {t.noRole}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-[#7A1F2B]">
                    <ShieldCheck className="h-4 w-4" />
                    {t.judgeStatus}
                  </span>
                  <span className="rounded-full bg-[#F4ECE6] px-3 py-1 text-xs font-black text-[#7A1F2B]">
                    {roomState.phase === "FINISHED" ? t.finished : t.started}
                  </span>
                </div>

                {lifeState.formError ? (
                  <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {lifeState.formError || t.statusError}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2">
                {seats
                  .filter((seat) => seat.isPlayerSeat)
                  .map((seat) => (
                    <div
                      className={`grid gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#1E1718] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                        seat.isDead ? "bg-[#E8E1D8] text-[#1E1718]/62" : "bg-[#F7F3EC]"
                      }`}
                      key={seat.seatNumber}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                            {seat.seatNumber}
                          </span>
                          <span className="min-w-0 truncate">
                            {seat.displayName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
                              seat.isDead
                                ? "bg-[#1E1718] text-white"
                                : "bg-white text-[#36624A]"
                            }`}
                          >
                            {seat.isDead ? (
                              <Skull className="h-3.5 w-3.5" />
                            ) : (
                              <HeartPulse className="h-3.5 w-3.5" />
                            )}
                            {seat.isDead ? t.dead : t.alive}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-black text-[#7A1F2B]">
                          {roomStatus === "IN_PROGRESS" ||
                          roomStatus === "FINISHED"
                            ? (seat.roleLabel ?? "-")
                            : seat.readyAt
                              ? t.ready
                              : "-"}
                        </p>
                      </div>

                      {roomStatus === "IN_PROGRESS" ? (
                        <form
                          action={lifeAction}
                          className="flex justify-start sm:justify-end"
                          onSubmit={(event) => {
                            const confirmed = window.confirm(
                              seat.isDead ? t.revive : t.markDead,
                            );

                            if (!confirmed) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="privateToken"
                            type="hidden"
                            value={privateToken}
                          />
                          <input
                            name="seatNumber"
                            type="hidden"
                            value={seat.seatNumber}
                          />
                          <input
                            name="operation"
                            type="hidden"
                            value={seat.isDead ? "revive" : "mark_dead"}
                          />
                          <SubmitButton
                            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-55 ${
                              seat.isDead
                                ? "bg-white text-[#1E1718] hover:bg-[#FFF7F1]"
                                : "bg-[#1E1718] text-white hover:bg-[#3A2A2D]"
                            }`}
                            label={seat.isDead ? t.revive : t.markDead}
                          />
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-[#FFFDF7] p-4">
                <span className="text-sm font-black text-[#7A1F2B]">
                  {t.judgeHelper}
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.judgePrompts.map((prompt) => (
                    <span
                      className="rounded-full border border-[#D9C7B4] bg-white px-3 py-1.5 text-xs font-black text-[#1E1718]"
                      key={prompt}
                    >
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>

              {roomStatus === "IN_PROGRESS" ? (
                <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-[#1E1718] p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-black">
                      <Flag className="h-4 w-4 text-[#F0C36A]" />
                      {t.finishGame}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <form
                      action={finishAction}
                      onSubmit={(event) => {
                        if (!window.confirm(t.finishGoodConfirm)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={privateToken}
                      />
                      <input name="winner" type="hidden" value="GOOD" />
                      <SubmitButton
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#1E1718] transition hover:bg-[#F4ECE6] disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.finishGood}
                      />
                    </form>
                    <form
                      action={finishAction}
                      onSubmit={(event) => {
                        if (!window.confirm(t.finishWerewolfConfirm)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={privateToken}
                      />
                      <input name="winner" type="hidden" value="WEREWOLF" />
                      <SubmitButton
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-4 text-sm font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.finishWerewolf}
                      />
                    </form>
                  </div>

                  {finishState.formError ? (
                    <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                      {finishState.formError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
