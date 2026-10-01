"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawGuessLobby } from "@/features/game-tools/components/DrawGuessLobby";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import type { DrawGuessMode, DrawGuessWordBankSnapshot } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

const WORD_BANKS: DrawGuessWordBankSnapshot[] = [
  { id: "daily", category: "趣味生活", title: "日常离谱瞬间", description: "生活里那些好笑的画面", words: ["雨天忘带伞", "猫咪开会", "奶茶洒了", "迟到冲刺", "袜子失踪", "冰箱里的西瓜"] },
  { id: "animals", category: "动物", title: "动物打工记", description: "把动物放进上班日常", words: ["企鹅送外卖", "浣熊修电脑", "兔子开出租", "河马做美甲", "狐狸当厨师", "熊猫直播"] },
  { id: "party", category: "派对", title: "朋友的奇葩操作", description: "一起玩时的搞笑瞬间", words: ["抢最后一块蛋糕", "假装没听见", "合照闭眼", "唱歌跑调", "反向许愿", "跳舞踩脚"] },
];

const PLAYERS = [
  { id: "host", name: "你 · 小鱼", catId: "scholar", isHost: true },
  { id: "momo", name: "桃桃", catId: "dreamer", isHost: false },
  { id: "bao", name: "阿包", catId: "captain", isHost: false },
  { id: "xing", name: "星星", catId: "inventor", isHost: false },
  { id: "kiki", name: "琪琪", catId: "mango", isHost: false },
  { id: "hao", name: "好好", catId: "disco", isHost: false },
];

function makeRoom(count: number, mode: DrawGuessMode, allReady: boolean): DrawGuessRoomView {
  const seats = PLAYERS.slice(0, count).map((player, index) => ({ ...player, number: index + 1, ready: allReady || index !== count - 1, avatarUrl: null }));
  return {
    id: "room-preview", code: "CAT888", isHost: true, autoSize: true, canStart: allReady, mode, playerCount: count, requiredPlayers: 2,
    revision: 1, seats, status: "WAITING", viewerSeat: 0, wordBank: WORD_BANKS[0],
    view: { chainStage: 0, deadlineAt: null, gameNumber: 1, roundCount: 2, roundIndex: 0, mode, phase: "LOBBY", scores: Array(count).fill(0), timing: { drawSeconds: 60, guessSeconds: 40 }, turnIndex: 0 },
  };
}

export function DrawGuessLobbyPreviewClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [room, setRoom] = useState(() => makeRoom(4, "CLASSIC", false));
  const count = room.seats.length;
  const allReady = room.seats.every((seat) => seat.ready);
  return <div className="mx-auto max-w-3xl pb-10">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#E8F2FB] px-3 py-2.5 text-xs font-bold text-[#405875]">
      <span>{locale === "zh-CN" ? "房间准备页预览 · 演示数据" : locale === "fr" ? "Aperçu de la salle · Démo" : "Waiting room preview · Demo"}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {([2, 4, 6] as const).map((value) => <button key={value} type="button" aria-pressed={count === value} onClick={() => setRoom(makeRoom(value, room.mode, false))} className={`rounded-full px-3 py-1.5 transition-colors ${count === value ? "bg-[#3E70AA] text-white" : "bg-white hover:bg-[#D7E9F8]"}`}>{value}人</button>)}
        <button type="button" aria-pressed={allReady} onClick={() => setRoom((current) => ({ ...current, seats: current.seats.map((seat) => ({ ...seat, ready: !allReady })), canStart: !allReady }))} className={`rounded-full px-3 py-1.5 transition-colors ${allReady ? "bg-[#3E70AA] text-white" : "bg-white hover:bg-[#D7E9F8]"}`}>全员准备</button>
        <button type="button" onClick={() => setRoom((current) => ({ ...current, mode: current.mode === "CLASSIC" ? "CHAIN" : "CLASSIC", view: { ...current.view, mode: current.mode === "CLASSIC" ? "CHAIN" : "CLASSIC" } }))} className="rounded-full bg-white px-3 py-1.5 hover:bg-[#D7E9F8]">切换模式</button>
      </div>
    </div>
    <DrawGuessLobby locale={locale} room={room} onRefresh={async () => {}} onLeave={async () => router.push(withLocale(locale, "/game-tools/draw-guess"))} preview={{ wordBanks: WORD_BANKS, onChange: setRoom }} />
  </div>;
}
