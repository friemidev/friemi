"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, LoaderCircle, Trophy } from "lucide-react";
import { DrawGuessArtwork, DrawGuessCanvas } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessPodium } from "@/features/game-tools/components/DrawGuessPodium";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { getDrawGuessRankings } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

export function DrawGuessSpectator({ initialRoom, locale }: { initialRoom: DrawGuessRoomView; locale: string }) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = locale === "zh-CN"
    ? { watch: "观战中", back: "离开观战", wait: "等待下一棒", draw: "正在作画", guess: "大家正在猜", answer: "答案", rank: "实时积分", story: "接龙作品", managed: "托管", seconds: "秒", lobby: "等待下一局", return: "返回房间", join: "加入下一局", full: "房间已满，继续观战", started: "已经开局，继续观战", retry: "请再试一次" }
    : locale === "fr"
      ? { watch: "Spectateur", back: "Quitter", wait: "En attendant", draw: "Dessin en cours", guess: "On devine", answer: "Réponse", rank: "Scores", story: "Dessins", managed: "Absent", seconds: "s", lobby: "Prochaine partie", return: "Retour à la salle", join: "Rejoindre la prochaine partie", full: "Salle complète, restez spectateur", started: "Partie commencée, restez spectateur", retry: "Réessayez" }
      : { watch: "Spectating", back: "Leave", wait: "Waiting for the next step", draw: "Drawing now", guess: "Everyone is guessing", answer: "Answer", rank: "Live scores", story: "Picture chain", managed: "Away", seconds: "s", lobby: "Waiting for the next game", return: "Back to room", join: "Join next game", full: "Room is full; keep spectating", started: "Game started; keep spectating", retry: "Please try again" };

  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/game-tools/draw-guess/rooms/${initialRoom.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { room?: DrawGuessRoomView };
        if (!disposed && result.room) setRoom((current) => result.room!.revision >= current.revision ? result.room! : current);
      } catch { /* The next poll retries. */ }
    };
    const interval = window.setInterval(() => { setNow(Date.now()); void poll(); }, 2_000);
    window.addEventListener("focus", poll);
    return () => { disposed = true; window.clearInterval(interval); window.removeEventListener("focus", poll); };
  }, [initialRoom.id]);

  async function returnToLobby() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/game-tools/draw-guess/rooms/${room.id}/return`, { method: "POST" });
      if (!response.ok) throw new Error("RETURN_FAILED");
      const viewResponse = await fetch(`/api/game-tools/draw-guess/rooms/${room.id}`, { cache: "no-store" });
      if (!viewResponse.ok) throw new Error("ROOM_UNAVAILABLE");
      const result = await viewResponse.json() as { room: DrawGuessRoomView };
      setRoom(result.room);
    } catch { setError(copy.retry); }
    finally { setBusy(false); }
  }

  async function joinNextGame() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/game-tools/draw-guess/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: room.code }) });
      if (!response.ok) throw new Error("JOIN_FAILED");
      const result = await response.json() as { spectator?: boolean };
      if (result.spectator) { setError(copy.started); setBusy(false); return; }
      router.refresh();
      setBusy(false);
    } catch { setError(copy.retry); setBusy(false); }
  }

  const seconds = room.view.deadlineAt ? Math.max(0, Math.ceil((Date.parse(room.view.deadlineAt) - now) / 1_000)) : null;
  const artist = room.seats.find((seat) => seat.number === room.view.turnIndex + 1);
  const classic = room.mode === "CLASSIC";
  const drawing = room.view.phase === "DRAW_GUESS" || room.view.phase === "TURN_REVEAL";
  const ranking = getDrawGuessRankings(room.view.scores).filter(({ seat }) => seat !== room.practiceBotSeat);
  const stage = room.view.phase === "LOBBY" ? copy.lobby : room.view.phase === "WORD_SELECT" ? copy.wait : drawing ? room.view.phase === "TURN_REVEAL" ? copy.answer : copy.guess : room.view.phase === "FINISHED" ? copy.rank : copy.wait;

  return <div className="draw-guess-theme mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
    <header className="flex items-center gap-3">
      <Link href={withLocale(locale, "/game-tools/draw-guess")} onClick={() => { void fetch(`/api/game-tools/draw-guess/rooms/${room.id}/leave`, { method: "POST", keepalive: true }); }} className="draw-guess-btn draw-guess-btn--milk grid h-11 min-h-11 w-11 shrink-0 place-items-center" aria-label={copy.back}><ArrowLeft className="h-5 w-5" /></Link>
      <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-xs font-bold text-[#3E70AA]"><Eye className="h-4 w-4" />{copy.watch} · {room.code}</p><h1 className="truncate text-xl font-black">{stage}</h1></div>
      {seconds !== null ? <span className="rounded-full bg-[#E8F2FB] px-3 py-2 font-mono text-sm font-black tabular-nums text-[#3E70AA]">{seconds} {copy.seconds}</span> : null}
    </header>

    {room.view.phase === "LOBBY" ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-5 shadow-[0_10px_30px_rgba(48,66,92,0.1)]"><div className="flex items-center gap-2"><DrawGuessCatSprite animated catId="cloud" mood="happy" size={58} /><div><h2 className="text-lg font-black">{copy.lobby}</h2><p className="text-sm font-bold text-[#63758D]">{room.code}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{room.seats.filter((seat) => !seat.isSystem).map((seat) => <div key={seat.number} className="flex min-w-0 flex-col items-center rounded-2xl bg-[#F3F8FC] p-2 text-center"><DrawGuessCatSprite catId={seat.catId} size={48} /><strong className="max-w-full truncate text-xs">{seat.name}</strong><span className="text-[11px] font-semibold text-[#63758D]">{seat.ready ? locale === "zh-CN" ? "已准备" : "Ready" : locale === "zh-CN" ? "准备" : "Waiting"}</span></div>)}</div>{room.seats.length < room.playerCount ? <button type="button" disabled={busy} onClick={() => void joinNextGame()} className="draw-guess-btn draw-guess-btn--candy mt-5 min-h-12 w-full px-4 text-sm">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{copy.join}</button> : <p className="mt-5 text-center text-sm font-bold text-[#63758D]">{copy.full}</p>}</section> : null}

    {room.view.phase === "FINISHED" ? <DrawGuessPodium busy={busy} finishLabel={copy.rank} locale={locale} onReturn={() => void returnToLobby()} returnLabel={copy.return} room={room} scoreLabel={locale === "zh-CN" ? "分" : "pts"} /> : null}

    {room.view.phase !== "LOBBY" && room.view.phase !== "FINISHED" && classic ? <section className="draw-guess-stage-card overflow-hidden rounded-[1.8rem] bg-[#FFFCF5] p-3 shadow-[0_10px_30px_rgba(48,66,92,0.1)] sm:p-5">
      <div className="mb-3 flex items-center gap-2"><DrawGuessCatSprite animated catId={artist?.catId} mood={drawing ? "happy" : "idle"} size={42} /><strong className="text-sm">{artist?.name ?? "—"} · {copy.draw}</strong></div>
      <DrawGuessCanvas compact disabled strokes={room.view.drawing ?? []} />
      {room.view.answer ? <div className="mt-3 rounded-2xl bg-[#E8F2FB] p-3 text-center"><span className="text-xs font-bold text-[#63758D]">{copy.answer}</span><strong className="ml-2 text-xl font-black">{room.view.answer}</strong></div> : null}
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-[#F3F8FC] p-3">
        {(room.view.chat ?? []).map((message) => <div key={message.id} className={`w-fit max-w-full rounded-2xl px-3 py-2 text-sm font-semibold ${message.correct ? "bg-[#C9EED5] text-[#205D40]" : "bg-white text-[#30425C]"}`}><strong>{room.seats[message.seat]?.name ?? `#${message.seat + 1}`}</strong> · {message.correct ? locale === "zh-CN" ? "已答对！" : "Correct!" : message.text}</div>)}
      </div>
    </section> : room.view.phase !== "LOBBY" && room.view.phase !== "FINISHED" ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-4 shadow-[0_10px_30px_rgba(48,66,92,0.1)]">
      <h2 className="mb-3 text-lg font-black">{copy.story}</h2>
      {room.view.chains ? <div className="space-y-3">{room.view.chains.map((chain, owner) => <div key={owner} className="rounded-2xl bg-[#F3F8FC] p-3"><strong className="text-sm">{room.seats[owner]?.name ?? `#${owner + 1}`}</strong><div className="mt-2 flex gap-2 overflow-x-auto">{chain.map((step, index) => <div key={index} className="w-36 shrink-0 rounded-xl bg-white p-2 text-center text-sm font-bold">{step.kind === "WORD" ? step.value : <div className="aspect-[10/7]"><DrawGuessArtwork strokes={step.value} /></div>}</div>)}</div></div>)}</div> : <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-[#63758D]"><DrawGuessCatSprite animated catId="cloud" mood="idle" size={54} />{copy.wait}</div>}
    </section> : null}

    {room.view.phase !== "LOBBY" && room.view.phase !== "FINISHED" ? <section className="draw-guess-stage-card rounded-[1.8rem] bg-[#FFFCF5] p-4 shadow-[0_10px_30px_rgba(48,66,92,0.1)]"><h2 className="mb-3 flex items-center gap-2 text-base font-black"><Trophy className="h-5 w-5 text-[#D8A14B]" />{copy.rank}</h2><ol className="space-y-2">{ranking.map(({ seat, score, rank }) => <li key={seat} className="flex items-center gap-2 rounded-2xl bg-[#F3F8FC] px-3 py-2"><span className="w-6 text-xs font-black text-[#3E70AA]">#{rank}</span><DrawGuessCatSprite catId={room.seats[seat]?.catId} size={32} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{room.seats[seat]?.name ?? `#${seat + 1}`}{room.seats[seat]?.managed ? ` · ${copy.managed}` : ""}</span><strong className="text-sm tabular-nums">{score}</strong></li>)}</ol></section> : null}
    {error ? <p role="alert" className="rounded-2xl bg-[#FFF0C9] px-4 py-3 text-sm font-bold text-[#765A35]">{error}</p> : null}
  </div>;
}
