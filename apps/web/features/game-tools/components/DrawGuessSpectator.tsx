"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, LoaderCircle, Trophy } from "lucide-react";
import { DrawGuessArtwork, DrawGuessCanvas } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessPodium } from "@/features/game-tools/components/DrawGuessPodium";
import { DrawGuessRoundBreak } from "@/features/game-tools/components/DrawGuessRoundBreak";
import { DrawGuessPostgameWaiting } from "@/features/game-tools/components/DrawGuessPostgameWaiting";
import { DrawGuessChainReveal } from "@/features/game-tools/components/DrawGuessChainReveal";
import { DrawGuessMatchVote } from "@/features/game-tools/components/DrawGuessMatchVote";
import { DrawGuessArtworkVote } from "@/features/game-tools/components/DrawGuessArtworkVote";
import { DrawGuessChainResult } from "@/features/game-tools/components/DrawGuessChainResult";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { getDrawGuessRankings } from "@/features/game-tools/drawGuessEngine";
import { fetchDrawGuessRoomWithRecovery } from "@/features/game-tools/drawGuessRoomRecovery";
import { fetchDrawGuessResponse } from "@/features/game-tools/drawGuessRequest";
import { useDrawGuessRoomPresence } from "@/features/game-tools/hooks/useDrawGuessRoomPresence";
import { forgetDrawGuessRecentRoom, rememberDrawGuessRecentRoom } from "@/features/game-tools/drawGuessRecentRoom";
import { DrawGuessRoomCodeButton } from "@/features/game-tools/components/DrawGuessRoomCodeButton";
import { DrawGuessKickedNotice } from "@/features/game-tools/components/DrawGuessKickedNotice";
import { DrawGuessRoomClosedNotice } from "@/features/game-tools/components/DrawGuessRoomClosedNotice";
import { withLocale } from "@/lib/routes";

export function DrawGuessSpectator({ initialRoom, locale }: { initialRoom: DrawGuessRoomView; locale: string }) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState(Date.now());
  const [serverOffset, setServerOffset] = useState(initialRoom.view.serverNow ? Date.parse(initialRoom.view.serverNow) - Date.now() : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState(false);
  const [closed, setClosed] = useState(false);
  const leaving = useRef(false);
  const unavailable = useRef(false);
  const active = useRef(true);
  const latestRoom = useRef(room);
  latestRoom.current = room;
  const pollRunning = useRef<Promise<void> | null>(null);
  const actionRunning = useRef<Promise<void> | null>(null);
  useDrawGuessRoomPresence(initialRoom.id, () => !leaving.current && !unavailable.current);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    rememberDrawGuessRecentRoom(room.viewerProfileId, { id: room.id, code: room.code, mode: room.mode });
  }, [room.code, room.id, room.mode, room.viewerProfileId]);
  const copy = locale === "zh-CN"
    ? { watch: "观战中", back: "离开观战", wait: "等待下一棒", draw: "正在作画", guess: "大家正在猜", answer: "答案", rank: "实时积分", story: "接龙作品", managed: "托管", seconds: "秒", lobby: "等待下一局", return: "返回房间", join: "加入下一局", full: "房间已满，继续观战", started: "已经开局，继续观战", retry: "请再试一次" }
    : locale === "fr"
      ? { watch: "Spectateur", back: "Quitter", wait: "En attendant", draw: "Dessin en cours", guess: "On devine", answer: "Réponse", rank: "Scores", story: "Dessins", managed: "Absent", seconds: "s", lobby: "Prochaine partie", return: "Retour à la salle", join: "Rejoindre la prochaine partie", full: "Salle complète, restez spectateur", started: "Partie commencée, restez spectateur", retry: "Réessayez" }
      : { watch: "Spectating", back: "Leave", wait: "Waiting for the next step", draw: "Drawing now", guess: "Everyone is guessing", answer: "Answer", rank: "Live scores", story: "Picture chain", managed: "Away", seconds: "s", lobby: "Waiting for the next game", return: "Back to room", join: "Join next game", full: "Room is full; keep spectating", started: "Game started; keep spectating", retry: "Please try again" };

  const refresh = useCallback(async (afterMutation = false) => {
    const canRecover = () => active.current && !leaving.current && !unavailable.current && document.visibilityState !== "hidden";
    if (!canRecover()) return;
    if (pollRunning.current) {
      await pollRunning.current;
      if (!afterMutation || !canRecover()) return;
    }
    const running = (async () => {
      try {
        const { response, data: result, requestedAt } = await fetchDrawGuessRoomWithRecovery(initialRoom.id, initialRoom.code, { shouldRecover: canRecover });
        if (!canRecover()) return;
        if (!response.ok) {
          if (result?.error === "KICKED" || result?.error === "ROOM_NOT_FOUND") {
            unavailable.current = true;
            forgetDrawGuessRecentRoom(initialRoom.viewerProfileId, { id: initialRoom.id });
            if (result.error === "KICKED") setRemoved(true);
            else setClosed(true);
          }
          return;
        }
        if (result?.room) {
          if (result.room.view.serverNow) setServerOffset(Date.parse(result.room.view.serverNow) - (requestedAt + Date.now()) / 2);
          setNow(Date.now());
          if (result.room.revision >= latestRoom.current.revision) {
            if (result.room.viewerSeat >= 0) router.refresh();
            setRoom(result.room);
          }
        }
      } catch { /* The next poll retries. */ }
    })();
    pollRunning.current = running;
    try { await running; }
    finally { if (pollRunning.current === running) pollRunning.current = null; }
  }, [initialRoom.code, initialRoom.id, initialRoom.viewerProfileId, router]);

  useEffect(() => {
    const poll = () => { setNow(Date.now()); void refresh(); };
    const interval = window.setInterval(poll, 2_000);
    window.addEventListener("focus", poll);
    window.addEventListener("online", poll);
    window.addEventListener("pageshow", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval); window.removeEventListener("focus", poll);
      window.removeEventListener("online", poll); window.removeEventListener("pageshow", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), room.view.phase === "CHAIN_REVEAL" ? 250 : 1_000);
    return () => window.clearInterval(interval);
  }, [room.view.phase]);

  async function runRoomAction(join: boolean) {
    if (actionRunning.current || leaving.current || unavailable.current || !active.current) return;
    setBusy(true); setError("");
    const running = (async () => {
      try {
        await pollRunning.current;
        if (leaving.current || unavailable.current || !active.current) return;
        const current = latestRoom.current;
        const { response, data: result } = await fetchDrawGuessResponse<{ spectator?: boolean }>(join ? "/api/game-tools/draw-guess/join" : `/api/game-tools/draw-guess/rooms/${current.id}/return`, {
          method: "POST", ...(join ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ code: current.code, expectedRoomId: current.id }) } : {}),
        });
        if (leaving.current || unavailable.current || !active.current) return;
        if (!response.ok) throw new Error("ROOM_ACTION_FAILED");
        if (join && result?.spectator) setError(copy.started);
        await refresh(true);
      } catch {
        if (active.current && !leaving.current && !unavailable.current) { setError(copy.retry); void refresh(); }
      } finally { if (active.current) setBusy(false); }
    })();
    actionRunning.current = running;
    try { await running; }
    finally { if (actionRunning.current === running) actionRunning.current = null; }
  }

  async function leaveRoom() {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await actionRunning.current;
      await pollRunning.current;
      const { response } = await fetchDrawGuessResponse(`/api/game-tools/draw-guess/rooms/${room.id}/leave`, { method: "POST" });
      if (!response.ok) throw new Error("LEAVE_FAILED");
      if (active.current) router.push(withLocale(locale, "/game-tools/draw-guess"));
    } catch (cause) { leaving.current = false; throw cause; }
  }

  if (removed) return <DrawGuessKickedNotice locale={locale} roomId={room.id} profileId={room.viewerProfileId} />;
  if (closed) return <DrawGuessRoomClosedNotice locale={locale} roomId={room.id} profileId={room.viewerProfileId} />;
  if (room.view.phase === "FINISHED" && room.returnedToLobby) return <DrawGuessPostgameWaiting locale={locale} room={room} onLeave={leaveRoom} />;

  const seconds = room.view.deadlineAt ? Math.max(0, Math.ceil((Date.parse(room.view.deadlineAt) - now - serverOffset) / 1_000)) : null;
  const artist = room.seats.find((seat) => seat.number === room.view.turnIndex + 1);
  const classic = room.mode === "CLASSIC";
  const drawing = room.view.phase === "DRAW_GUESS" || room.view.phase === "TURN_REVEAL";
  const ranking = getDrawGuessRankings(room.view.scores).filter(({ seat }) => seat !== room.practiceBotSeat);
  const chainStageTitle = locale === "zh-CN"
    ? { MATCH_VOTE: "首尾投票", MATCH_RESULT: "投票结果", CHAIN_REVEAL: "接龙回顾", ARTWORK_VOTE: "选最佳画", ARTWORK_RESULT: "最佳画揭晓" }
    : locale === "fr" ? { MATCH_VOTE: "Vote des mots", MATCH_RESULT: "Résultat", CHAIN_REVEAL: "Découverte", ARTWORK_VOTE: "Meilleur dessin", ARTWORK_RESULT: "Dessin gagnant" }
      : { MATCH_VOTE: "Word vote", MATCH_RESULT: "Vote result", CHAIN_REVEAL: "Story reveal", ARTWORK_VOTE: "Best drawing", ARTWORK_RESULT: "Winning drawing" };
  const stage = room.view.phase === "LOBBY" ? copy.lobby : room.view.phase === "ROUND_BREAK" ? locale === "zh-CN" ? "下一轮即将开始" : locale === "fr" ? "Prochaine manche" : "Next round soon" : room.view.phase in chainStageTitle ? chainStageTitle[room.view.phase as keyof typeof chainStageTitle] : room.view.phase === "WORD_SELECT" ? copy.wait : drawing ? room.view.phase === "TURN_REVEAL" ? copy.answer : copy.guess : room.view.phase === "FINISHED" ? copy.rank : copy.wait;

  return <div className="draw-guess-theme mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
    <header className="flex items-center gap-3">
      <button type="button" onClick={() => { void leaveRoom().catch(() => setError(copy.retry)); }} className="draw-guess-btn draw-guess-btn--milk grid h-11 min-h-11 w-11 shrink-0 place-items-center" aria-label={copy.back}><ArrowLeft className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-xs font-bold text-[#3E70AA]"><Eye className="h-4 w-4" />{copy.watch} · {room.view.roundIndex ?? 1}/{room.view.roundCount ?? 1}</p><h1 className="truncate text-xl font-black">{stage}</h1></div>
      {seconds !== null ? <span className="rounded-full bg-[#E8F2FB] px-3 py-2 font-mono text-sm font-black tabular-nums text-[#3E70AA]">{seconds} {copy.seconds}</span> : null}
    </header>
    <div className="flex justify-end"><DrawGuessRoomCodeButton code={room.code} compact locale={locale} /></div>

    {room.view.phase === "LOBBY" ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-5 shadow-[0_10px_30px_rgba(48,66,92,0.1)]"><div className="flex items-center gap-2"><DrawGuessCatSprite animated catId="cloud" mood="happy" size={58} /><div><h2 className="text-lg font-black">{copy.lobby}</h2><p className="text-sm font-bold text-[#63758D]">{room.code}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{room.seats.filter((seat) => !seat.isSystem).map((seat) => <div key={seat.number} className="flex min-w-0 flex-col items-center rounded-2xl bg-[#F3F8FC] p-2 text-center"><DrawGuessCatSprite catId={seat.catId} size={48} /><strong className="max-w-full truncate text-xs">{seat.name}</strong><span className="text-[11px] font-semibold text-[#63758D]">{seat.ready ? locale === "zh-CN" ? "已准备" : "Ready" : locale === "zh-CN" ? "准备" : "Waiting"}</span></div>)}</div>{room.seats.length < room.playerCount ? <button type="button" disabled={busy} onClick={() => void runRoomAction(true)} className="draw-guess-btn draw-guess-btn--candy mt-5 min-h-12 w-full px-4 text-sm">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{copy.join}</button> : <p className="mt-5 text-center text-sm font-bold text-[#63758D]">{copy.full}</p>}</section> : null}

    {room.view.phase === "FINISHED" ? room.mode === "CHAIN" ? <DrawGuessChainResult busy={busy} locale={locale} onReturn={() => void runRoomAction(false)} room={room} /> : <DrawGuessPodium busy={busy} finishLabel={copy.rank} locale={locale} onReturn={() => void runRoomAction(false)} returnLabel={copy.return} room={room} scoreLabel={locale === "zh-CN" ? "分" : "pts"} /> : null}
    {room.view.phase === "ROUND_BREAK" ? <DrawGuessRoundBreak locale={locale} now={now + serverOffset} room={room} /> : null}
    {room.mode === "CHAIN" && (room.view.phase === "MATCH_VOTE" || room.view.phase === "MATCH_RESULT") ? <DrawGuessMatchVote busy={false} locale={locale} room={room} onVote={async () => null} /> : null}
    {room.mode === "CHAIN" && room.view.phase === "CHAIN_REVEAL" ? <DrawGuessChainReveal busy={false} locale={locale} now={now + serverOffset} room={room} onControl={async () => null} onReact={async () => false} /> : null}
    {room.mode === "CHAIN" && (room.view.phase === "ARTWORK_VOTE" || room.view.phase === "ARTWORK_RESULT") ? <DrawGuessArtworkVote busy={false} locale={locale} room={room} onVote={async () => null} /> : null}

    {room.view.phase !== "LOBBY" && room.view.phase !== "FINISHED" && room.view.phase !== "ROUND_BREAK" && classic ? <section className="draw-guess-stage-card overflow-hidden rounded-[1.8rem] bg-[#FFFCF5] p-3 shadow-[0_10px_30px_rgba(48,66,92,0.1)] sm:p-5">
      <div className="mb-3 flex items-center gap-2"><DrawGuessCatSprite animated catId={artist?.catId} mood={drawing ? "happy" : "idle"} size={42} /><strong className="text-sm">{artist?.name ?? "—"} · {copy.draw}</strong></div>
      <DrawGuessCanvas compact disabled strokes={room.view.drawing ?? []} />
      {room.view.answer ? <div className="mt-3 rounded-2xl bg-[#E8F2FB] p-3 text-center"><span className="text-xs font-bold text-[#63758D]">{copy.answer}</span><strong className="ml-2 text-xl font-black">{room.view.answer}</strong></div> : null}
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-[#F3F8FC] p-3">
        {(room.view.chat ?? []).map((message) => <div key={message.id} className={`w-fit max-w-full rounded-2xl px-3 py-2 text-sm font-semibold ${message.correct ? "bg-[#C9EED5] text-[#205D40]" : "bg-white text-[#30425C]"}`}><strong>{room.seats[message.seat]?.name ?? `#${message.seat + 1}`}</strong> · {message.correct ? locale === "zh-CN" ? "已答对！" : "Correct!" : message.text}</div>)}
      </div>
    </section> : room.mode === "CHAIN" && (room.view.phase === "CHAIN_WORD" || room.view.phase === "CHAIN_STEP") ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-4 shadow-[0_10px_30px_rgba(48,66,92,0.1)]">
      <h2 className="mb-3 text-lg font-black">{copy.story}</h2>
      {room.view.chains ? <div className="space-y-3">{room.view.chains.map((chain, owner) => <div key={owner} className="rounded-2xl bg-[#F3F8FC] p-3"><strong className="text-sm">{room.seats[owner]?.name ?? `#${owner + 1}`}</strong><div className="mt-2 flex gap-2 overflow-x-auto">{chain.map((step, index) => <div key={index} className="w-36 shrink-0 rounded-xl bg-white p-2 text-center text-sm font-bold">{step.kind === "WORD" ? step.value : <div className="aspect-[10/7]"><DrawGuessArtwork strokes={step.value} /></div>}</div>)}</div></div>)}</div> : <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-[#63758D]"><DrawGuessCatSprite animated catId="cloud" mood="idle" size={54} />{copy.wait}</div>}
    </section> : null}

    {room.view.phase !== "LOBBY" && room.view.phase !== "FINISHED" && room.view.phase !== "ROUND_BREAK" ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-4 shadow-[0_10px_30px_rgba(48,66,92,0.1)]"><h2 className="mb-3 flex items-center gap-2 text-base font-black"><Trophy className="h-5 w-5 text-[#D8A14B]" />{copy.rank}</h2><ol className="space-y-2">{ranking.map(({ seat, score, rank }) => <li key={seat} className="flex items-center gap-2 rounded-2xl bg-[#F3F8FC] px-3 py-2"><span className="w-6 text-xs font-black text-[#3E70AA]">#{rank}</span><DrawGuessCatSprite catId={room.seats[seat]?.catId} size={32} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{room.seats[seat]?.name ?? `#${seat + 1}`}{room.seats[seat]?.managed ? ` · ${copy.managed}` : ""}</span><strong className="text-sm tabular-nums">{score}</strong></li>)}</ol></section> : null}
    {error ? <p role="alert" className="rounded-2xl bg-[#FFF0C9] px-4 py-3 text-sm font-bold text-[#765A35]">{error}</p> : null}
  </div>;
}
