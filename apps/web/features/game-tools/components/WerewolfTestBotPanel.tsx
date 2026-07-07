"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  Bot,
  CheckCircle2,
  FastForward,
  HeartPulse,
  Skull,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  runWerewolfTestBotAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";

type WerewolfTestBotPanelProps = {
  locale: string;
  room: {
    id: string;
    seats: Array<{
      isClaimed: boolean;
      isDead: boolean;
      isPlayerSeat: boolean;
      readyAt: string | null;
    }>;
    status: string;
    variant: {
      totalSeats: number;
    };
  };
};

type TestBotOperation =
  | "fill"
  | "ready"
  | "fill_ready_start"
  | "random_death"
  | "random_revive"
  | "finish_good"
  | "finish_werewolf";

const initialState: WerewolfRoomActionState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      alive: "vivants",
      dead: "sortis",
      fill: "Remplir",
      finishGood: "Village",
      finishGoodConfirm: "Terminer cette partie de test avec le village gagnant ?",
      finishWerewolf: "Loups",
      finishWerewolfConfirm: "Terminer cette partie de test avec les loups gagnants ?",
      help: "Outil visible seulement en test.",
      out: "Avancer",
      ready: "Prêts",
      revive: "Retour",
      start: "Remplir et lancer",
      title: "Assistant test",
    };
  }

  if (locale === "en") {
    return {
      alive: "alive",
      dead: "out",
      fill: "Fill seats",
      finishGood: "Good wins",
      finishGoodConfirm: "Finish this test game with the good team winning?",
      finishWerewolf: "Wolves win",
      finishWerewolfConfirm:
        "Finish this test game with the werewolf team winning?",
      help: "Only visible while testing.",
      out: "Advance",
      ready: "Ready all",
      revive: "Bring back",
      start: "Fill and start",
      title: "Test assistant",
    };
  }

  return {
    alive: "存活",
    dead: "出局",
    fill: "补满座位",
    finishGood: "好人胜",
    finishGoodConfirm: "将这局测试结算为好人阵营获胜？",
    finishWerewolf: "狼人胜",
    finishWerewolfConfirm: "将这局测试结算为狼人阵营获胜？",
    help: "只在测试环境显示。",
    out: "按规则推进",
    ready: "全员准备",
    revive: "随机复活",
    start: "补满并开局",
    title: "测试助手",
  };
}

function TestBotButton({
  children,
  className,
  confirmMessage,
  operation,
}: {
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  operation: TestBotOperation;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        className ??
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D] disabled:cursor-not-allowed disabled:opacity-55"
      }
      disabled={pending}
      name="operation"
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
      value={operation}
    >
      {children}
    </button>
  );
}

export function WerewolfTestBotPanel({
  locale,
  room,
}: WerewolfTestBotPanelProps) {
  const [state, action] = useActionState(
    runWerewolfTestBotAction,
    initialState,
  );
  const t = getCopy(locale);
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const claimedSeats = room.seats.filter((seat) => seat.isClaimed).length;
  const readySeats = room.seats.filter(
    (seat) => seat.isClaimed && seat.readyAt,
  ).length;
  const deadSeats = playerSeats.filter((seat) => seat.isDead).length;
  const aliveSeats = playerSeats.filter(
    (seat) => seat.isClaimed && !seat.isDead,
  ).length;

  return (
    <form
      action={action}
      className="overflow-hidden rounded-[1.4rem] border border-[#E0C27E] bg-[#19181A] p-4 text-white shadow-[0_16px_44px_rgba(30,23,24,0.16)]"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={room.id} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F0C36A] px-2.5 py-1 text-[11px] font-black text-[#1E1718]">
            <Bot className="h-3.5 w-3.5" />
            {t.title}
          </span>
          <p className="mt-2 text-xs font-bold text-white/58">{t.help}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/8 text-[#F0C36A]">
          <FastForward className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[0.9rem] bg-white/8 px-3 py-2">
          <UsersRound className="h-4 w-4 text-[#F0C36A]" />
          <p className="mt-1 text-sm font-black">
            {claimedSeats}/{room.variant.totalSeats}
          </p>
        </div>
        <div className="rounded-[0.9rem] bg-white/8 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-[#8AB68E]" />
          <p className="mt-1 text-sm font-black">{readySeats}</p>
        </div>
        <div className="rounded-[0.9rem] bg-white/8 px-3 py-2">
          <Skull className="h-4 w-4 text-[#F09182]" />
          <p className="mt-1 text-sm font-black">
            {deadSeats}/{playerSeats.length}
          </p>
        </div>
      </div>

      {room.status === "LOBBY" ? (
        <div className="mt-4 grid gap-2">
          <TestBotButton
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F0C36A] px-4 text-sm font-black text-[#1E1718] transition hover:bg-[#FFD77E] disabled:cursor-not-allowed disabled:opacity-55"
            operation="fill_ready_start"
          >
            <FastForward className="h-4 w-4" />
            {t.start}
          </TestBotButton>
          <div className="grid grid-cols-2 gap-2">
            <TestBotButton operation="fill">
              <UsersRound className="h-3.5 w-3.5" />
              {t.fill}
            </TestBotButton>
            <TestBotButton operation="ready">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.ready}
            </TestBotButton>
          </div>
        </div>
      ) : room.status === "IN_PROGRESS" ? (
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <TestBotButton operation="random_death">
              <FastForward className="h-3.5 w-3.5" />
              {t.out}
            </TestBotButton>
            <TestBotButton operation="random_revive">
              <HeartPulse className="h-3.5 w-3.5" />
              {t.revive}
            </TestBotButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TestBotButton
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#36624A] px-3 text-xs font-black text-white transition hover:bg-[#467B5D] disabled:cursor-not-allowed disabled:opacity-55"
              confirmMessage={t.finishGoodConfirm}
              operation="finish_good"
            >
              <Trophy className="h-3.5 w-3.5" />
              {t.finishGood}
            </TestBotButton>
            <TestBotButton
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#7A1F2B] px-3 text-xs font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
              confirmMessage={t.finishWerewolfConfirm}
              operation="finish_werewolf"
            >
              <Trophy className="h-3.5 w-3.5" />
              {t.finishWerewolf}
            </TestBotButton>
          </div>
          <p className="text-center text-[11px] font-bold text-white/48">
            {aliveSeats} {t.alive} · {deadSeats} {t.dead}
          </p>
        </div>
      ) : null}

      {state.formError ? (
        <p className="mt-3 rounded-[0.9rem] border border-[#F09182]/45 bg-[#F09182]/14 px-3 py-2 text-xs font-black text-[#FFE8E4]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
