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
    allReady: "全员已准备，法官可以开始。",
    alive: "存活",
    back: "返回房间",
    boundary: "发言、投票、计时和夜晚行动继续由线下法官主持。",
    dead: "死亡",
    deathBody: "法官已将你标记为死亡。你仍可以留在房间观看公开状态。",
    deathTitle: "你已出局",
    dealingSubtitle: "请把屏幕拿稳，身份默认不会展示。",
    dealingTitle: "身份已发放",
    finishGame: "结束游戏",
    finishGood: "好人阵营获胜",
    finishGoodConfirm: "确认结束游戏并判定好人阵营获胜？",
    finishWerewolf: "狼人阵营获胜",
    finishWerewolfConfirm: "确认结束游戏并判定狼人阵营获胜？",
    finished: "本局已结束",
    hide: "盖回去",
    hiddenBody: "点击查看后只显示 2 秒。不要把屏幕朝向其他玩家。",
    hiddenTitle: "身份已隐藏",
    judgeHelper: "你是法官。所有玩家和法官准备后，可以从这里开始游戏并发身份。",
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
    judgeStatus: "法官管理台",
    leaveSeat: "离开座位",
    markDead: "标记死亡",
    noRole: "法官还没有开始发身份。",
    notReady: "等待所有座位准备。",
    ready: "我准备好了",
    reveal: "查看我的角色",
    resultDefeat: "失败",
    resultJudgeBody: "法官不参与阵营胜负，本局会记录为担任法官。",
    resultOutcome: "本局结果",
    resultRole: "本局角色",
    resultTeam: "所属阵营",
    resultVictory: "胜利",
    revive: "取消死亡",
    role: "角色",
    roleHidden: "角色、阵营和说明将在翻牌时短暂显示。",
    seat: "座位",
    start: "开始游戏并发身份",
    startConfirm: "确认开始游戏并随机发身份？开始后不能换座或加入本局。",
    started: "游戏已开始",
    statusError: "状态操作失败。",
    unready: "取消准备",
    visibleFor: "剩余",
    waiting: "已准备，等待其他人。",
    winnerGood: "好人阵营获胜",
    winnerWerewolf: "狼人阵营获胜",
  },
  en: {
    allReady: "Everyone is ready. The judge can start.",
    alive: "Alive",
    back: "Back to room",
    boundary:
      "Speaking, votes, timing, and night actions stay with the offline judge.",
    dead: "Dead",
    deathBody:
      "The judge marked you dead. You can still stay and watch the public room state.",
    deathTitle: "You are out",
    dealingSubtitle: "Keep the screen steady. Your role stays hidden by default.",
    dealingTitle: "Roles dealt",
    finishGame: "End game",
    finishGood: "Good team wins",
    finishGoodConfirm: "End the game and mark the good team as winner?",
    finishWerewolf: "Werewolf team wins",
    finishWerewolfConfirm: "End the game and mark the werewolf team as winner?",
    finished: "Game finished",
    hide: "Hide",
    hiddenBody: "Reveal shows for 2 seconds only. Keep the screen away from others.",
    hiddenTitle: "Role hidden",
    judgeHelper:
      "You are the judge. Once everyone is ready, start the game and deal roles here.",
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
    judgeStatus: "Judge board",
    leaveSeat: "Leave seat",
    markDead: "Mark dead",
    noRole: "The judge has not dealt roles yet.",
    notReady: "Waiting for every seat to be ready.",
    ready: "I'm ready",
    reveal: "Reveal my role",
    resultDefeat: "Defeat",
    resultJudgeBody:
      "The judge is not part of team victory and is recorded as judge.",
    resultOutcome: "Result",
    resultRole: "Role",
    resultTeam: "Team",
    resultVictory: "Victory",
    revive: "Revive",
    role: "Role",
    roleHidden: "Role, team, and notes appear only during the reveal window.",
    seat: "Seat",
    start: "Start and deal roles",
    startConfirm:
      "Start the game and randomly deal roles? Seats lock after this.",
    started: "Game started",
    statusError: "Could not update status.",
    unready: "Cancel ready",
    visibleFor: "Left",
    waiting: "Ready. Waiting for the table.",
    winnerGood: "Good team wins",
    winnerWerewolf: "Werewolf team wins",
  },
  fr: {
    allReady: "Tout le monde est prêt. Le maître peut commencer.",
    alive: "Vivant",
    back: "Retour salle",
    boundary:
      "Parole, votes, rythme et nuit restent gérés par le maître du jeu.",
    dead: "Mort",
    deathBody:
      "Le maître du jeu vous a marqué mort. Vous pouvez rester et regarder l'état public.",
    deathTitle: "Vous êtes éliminé",
    dealingSubtitle:
      "Gardez l'écran stable. Le rôle reste masqué par défaut.",
    dealingTitle: "Rôles distribués",
    finishGame: "Terminer",
    finishGood: "Village gagnant",
    finishGoodConfirm: "Terminer la partie avec le village gagnant ?",
    finishWerewolf: "Loups gagnants",
    finishWerewolfConfirm: "Terminer la partie avec les loups gagnants ?",
    finished: "Partie terminée",
    hide: "Masquer",
    hiddenBody:
      "La révélation dure 2 secondes. Ne tournez pas l'écran vers les autres.",
    hiddenTitle: "Rôle masqué",
    judgeHelper:
      "Vous êtes le maître du jeu. Quand tout le monde est prêt, démarrez et distribuez les rôles ici.",
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
    judgeStatus: "Table du maître",
    leaveSeat: "Quitter la place",
    markDead: "Marquer mort",
    noRole: "Le maître du jeu n'a pas encore distribué les rôles.",
    notReady: "En attente de toutes les places.",
    ready: "Je suis prêt",
    reveal: "Voir mon rôle",
    resultDefeat: "Défaite",
    resultJudgeBody:
      "Le maître ne participe pas à la victoire des camps et sera enregistré comme maître.",
    resultOutcome: "Résultat",
    resultRole: "Rôle",
    resultTeam: "Camp",
    resultVictory: "Victoire",
    revive: "Réanimer",
    role: "Rôle",
    roleHidden:
      "Rôle, camp et notes apparaissent seulement pendant la révélation.",
    seat: "Place",
    start: "Démarrer et distribuer",
    startConfirm:
      "Démarrer la partie et distribuer les rôles ? Les places seront verrouillées.",
    started: "Partie commencée",
    statusError: "Impossible de modifier l'état.",
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
              <div className="mt-3 grid min-h-64 place-items-center rounded-[1.1rem] bg-[#F7F3EC] p-4 text-center">
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
                    <div className="min-h-20 w-full rounded-[1rem] border border-[#D9C7B4] bg-white px-4 py-3 text-left">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A1F2B]/62">
                        {revealed ? payload.variantLabel : variantLabel}
                      </p>
                      <p className="mt-2 text-sm font-bold leading-6 text-[#1E1718]">
                        {revealed ? payload.roleDescription : t.roleHidden}
                      </p>
                      {isDead ? (
                        <p className="mt-2 rounded-2xl bg-[#F4ECE6] px-3 py-2 text-sm font-black text-[#1E1718]">
                          {t.deathBody}
                        </p>
                      ) : null}
                    </div>
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
                              ? "ready"
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
