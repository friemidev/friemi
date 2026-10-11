"use client";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Crown, LoaderCircle, Radio, RefreshCw, Trophy } from "lucide-react";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { DICE_ROOM_EVENT, getDiceRealtimeBrowserConfig, getDiceRoomTopic } from "../diceRealtime";
import type { DiceBid, DiceResult, DicePhase } from "../diceRoomEngine";
import { withLocale } from "@/lib/routes";

type Room = {
  id: string; code: string; revision: number; status: string; maxPlayers: number; viewerSeat: number; isHost: boolean;
  seats: { number: number; name: string; ready: boolean; isHost: boolean; catId: string }[];
  view: { phase: DicePhase; round: number; seatNumbers: number[]; scores: Record<string, number>; turnSeat: number | null;
    bid: DiceBid | null; history: DiceBid[]; myHand: number[] | null; revealedHands: Record<string, number[]> | null; result: DiceResult | null };
};
const texts = {
  "zh-CN": { back: "返回", title: "吹牛", code: "房间号", copy: "复制邀请", copied: "已复制", waiting: "等朋友入座", ready: "已准备", unready: "待准备", prepare: "准备", cancelReady: "取消准备", start: "开局摇骰", turn: "轮到你叫点", otherTurn: "轮到", bid: "叫点", challenge: "开盅", count: "数量", face: "点数", wild: "1 点百搭", myDice: "我的骰子", hidden: "骰子盖住了", total: "实际", winner: "本轮赢了", next: "下一轮", rematch: "再来一局", finished: "本局结束", leave: "离开房间", close: "结束房间", syncing: "重连中", live: "实时已连接", polling: "正在刷新", error: "操作没成功，再试一次。", stale: "桌面已更新，请再试。", signIn: "登录已失效。", score: "分", round: "第", roundUnit: "轮", point: "点", diceUnit: "颗", min: "至少 2 人且全部准备后开局", invite: "分享房间号，请朋友加入", rules: "先叫至少当前人数的骰子；同数量要加点。1 点百搭，开盅后实际数量达到叫数，叫点的人赢。先得 3 分获胜。", reveal: "开盅啦", you: "你" },
  en: { back: "Back", title: "Liar’s Dice", code: "Room code", copy: "Copy invite", copied: "Copied", waiting: "Waiting for friends", ready: "Ready", unready: "Not ready", prepare: "Ready up", cancelReady: "Cancel ready", start: "Roll and start", turn: "Your turn", otherTurn: "Turn:", bid: "Bid", challenge: "Challenge", count: "Count", face: "Face", wild: "Ones are wild", myDice: "My dice", hidden: "Dice are covered", total: "Actual", winner: "wins this round", next: "Next round", rematch: "Play again", finished: "Game over", leave: "Leave room", close: "Close room", syncing: "Reconnecting", live: "Live", polling: "Refreshing", error: "That didn't work. Try again.", stale: "Table changed. Try again.", signIn: "Sign-in expired.", score: "pts", round: "Round ", roundUnit: "", point: "", diceUnit: " dice", min: "Start with 2+ players, all ready", invite: "Share the code to invite friends", rules: "First bid at least one die per player. Raise the count or face. Ones are wild. A true bid wins for its caller. First to 3 points wins.", reveal: "Reveal", you: "You" },
  fr: { back: "Retour", title: "Perudo", code: "Code de salle", copy: "Copier l’invitation", copied: "Copié", waiting: "En attente des amis", ready: "Prêt", unready: "Pas prêt", prepare: "Je suis prêt", cancelReady: "Annuler", start: "Lancer et jouer", turn: "À vous", otherTurn: "Tour de", bid: "Annoncer", challenge: "Douter", count: "Nombre", face: "Face", wild: "Les 1 sont jokers", myDice: "Mes dés", hidden: "Dés cachés", total: "Réel", winner: "gagne la manche", next: "Manche suivante", rematch: "Rejouer", finished: "Partie terminée", leave: "Quitter", close: "Fermer la salle", syncing: "Reconnexion", live: "En direct", polling: "Actualisation", error: "Action impossible. Réessayez.", stale: "La table a changé. Réessayez.", signIn: "Connexion expirée.", score: "pts", round: "Manche ", roundUnit: "", point: "", diceUnit: " dés", min: "Au moins 2 joueurs, tous prêts", invite: "Partagez le code pour inviter", rules: "Première annonce : au moins un dé par joueur. Augmentez le nombre ou la face. Les 1 sont jokers. Une annonce vraie donne le point à son auteur. Premier à 3 points.", reveal: "Révélation", you: "Vous" },
} as const;
function DiceSprite({ value, cue, label }: { value: number; cue: string; label: string }) {
  const [frame, setFrame] = useState(31);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setFrame(31); return; }
    let handle = 0; const start = performance.now();
    const tick = (now: number) => { const next = Math.min(31, Math.floor((now - start) / 900 * 32)); setFrame(next); if (next < 31) handle = requestAnimationFrame(tick); };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [cue]);
  return <span className="dice-online-die" role="img" aria-label={`${value} ${label}`} style={{ backgroundImage: `url(/game-tools/dice/assets/dice-3d/roll-${value}.webp)`, backgroundPosition: `${(frame % 8) * 100 / 7}% ${Math.floor(frame / 8) * 100 / 3}%` }} />;
}
function Hand({ values, cue, label }: { values: number[]; cue: string; label: string }) {
  return <div className="dice-online-hand">{values.map((value, index) => <DiceSprite key={`${index}-${value}`} value={value} cue={cue} label={label} />)}</div>;
}
export function DiceOnlineRoom({ initialRoom, locale }: { initialRoom: Room; locale: string }) {
  const t = texts[locale as keyof typeof texts] ?? texts.en;
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const roomRef = useRef(room); roomRef.current = room;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"CONNECTED" | "RECONNECTING" | "POLLING">("POLLING");
  const [count, setCount] = useState(Math.max(2, initialRoom.seats.length));
  const [face, setFace] = useState(3);
  const [covered, setCovered] = useState(false);
  const entry = withLocale(locale, "/game-tools/dice/online");
  const refresh = useCallback(async () => {
    const current = roomRef.current;
    try {
      const response = await fetch(`/api/game-tools/dice/rooms/${current.id}`, { cache: "no-store", headers: { "if-none-match": `W/"dice-${current.revision}"` } });
      if (response.status === 304) return;
      if (response.status === 401) { setError(t.signIn); return; }
      if (!response.ok) { if (response.status === 404 || response.status === 403) router.replace(entry); return; }
      const data = await response.json();
      if (data.room && data.room.revision >= roomRef.current.revision) setRoom(data.room);
    } catch { setSyncStatus("POLLING"); }
  }, [entry, router, t.signIn]);
  useEffect(() => {
    const config = getDiceRealtimeBrowserConfig();
    if (!config) return;
    setSyncStatus("RECONNECTING");
    const client = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
    const channel = client.channel(getDiceRoomTopic(initialRoom.id)).on("broadcast", { event: DICE_ROOM_EVENT }, () => { void refresh(); }).subscribe((status) => {
      setSyncStatus(status === "SUBSCRIBED" ? "CONNECTED" : "RECONNECTING");
      if (status === "SUBSCRIBED") void refresh();
    });
    return () => { void client.removeChannel(channel).finally(() => client.realtime.disconnect()); };
  }, [initialRoom.id, refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(); }, syncStatus === "CONNECTED" ? 12000 : 2500);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh, syncStatus]);
  useEffect(() => {
    const bid = room.view.bid;
    setCount(bid ? Math.min(room.seats.length * 5, bid.count + (bid.face === 6 ? 1 : 0)) : room.seats.length);
    setFace(bid && bid.face < 6 ? bid.face + 1 : 2);
    setCovered(false);
  }, [room.view.round, room.view.bid?.count, room.view.bid?.face, room.seats.length]);
  async function act(action: { type: string; [key: string]: unknown }) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/game-tools/dice/rooms/${room.id}`, { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ commandId: crypto.randomUUID(), expectedRound: roomRef.current.view.round, action }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error === "STALE_ROUND" || data.error === "NOT_YOUR_TURN" ? t.stale : t.error); await refresh(); return; }
      if (action.type === "LEAVE" || action.type === "CLOSE") { router.replace(entry); return; }
      if (data.room) setRoom((previous) => data.room.revision >= previous.revision ? data.room : previous);
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }
  async function copyInvite() {
    const url = `${window.location.origin}${entry}?code=${room.code}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError(room.code); }
  }
  const view = room.view;
  const own = room.seats.find((seat) => seat.number === room.viewerSeat)!;
  const current = room.seats.find((seat) => seat.number === view.turnSeat);
  const leader = room.seats.find((seat) => seat.number === view.result?.winnerSeat);
  const allReady = room.seats.length >= 2 && room.seats.every((seat) => seat.ready);
  const myTurn = view.phase === "BIDDING" && view.turnSeat === room.viewerSeat;
  const validBid = count >= room.seats.length && count <= room.seats.length * 5 && (!view.bid || count > view.bid.count || count === view.bid.count && face > view.bid.face);
  return <main className="dice-online dice-online-room">
    <div className="dice-online-room-nav"><Link className="dice-online-back" href={entry}><ArrowLeft size={17} />{t.back}</Link><span className="dice-online-sync"><Radio size={14} />{syncStatus === "CONNECTED" ? t.live : syncStatus === "RECONNECTING" ? t.syncing : t.polling}</span></div>
    <header className="dice-online-room-heading"><div><span className="dice-online-kicker">FRIEMI DICE · {t.round}{Math.max(1, view.round)}{t.roundUnit}</span><h1>{t.title}</h1></div><div className="dice-online-room-code"><span>{t.code}</span><strong>{room.code}</strong><button onClick={() => void copyInvite()} type="button" aria-label={t.copy}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div></header>
    <section className="dice-online-table" aria-label={t.title}>
      <div className="dice-online-table-inner">
        <div className="dice-online-roster">{room.seats.map((seat) => <div className={`dice-online-player ${seat.number === view.turnSeat ? "is-turn" : ""}`} key={seat.number}>
          <DrawGuessCatSprite catId={seat.catId as "scholar"} mood={view.result?.winnerSeat === seat.number ? "happy" : "idle"} size={54} />
          <div><strong>{seat.number === room.viewerSeat ? t.you : seat.name}</strong><span>{view.phase === "LOBBY" ? seat.ready ? t.ready : t.unready : `${view.scores[String(seat.number)] ?? 0} ${t.score}`}</span></div>
          {seat.isHost ? <Crown size={15} aria-label="Host" /> : null}
        </div>)}</div>
        <div className="dice-online-table-center" aria-live="polite">
          {view.phase === "LOBBY" ? <><div className="dice-online-cup" aria-hidden="true">⚄</div><h2>{t.waiting}</h2><p>{t.invite}</p></> : null}
          {view.phase === "BIDDING" ? <><div className="dice-online-cup dice-online-cup--shaking" aria-hidden="true">⚄</div><h2>{view.bid ? `${view.bid.count} ${t.diceUnit} · ${view.bid.face} ${t.point}` : myTurn ? t.turn : current ? `${t.otherTurn} ${current.name}` : t.waiting}</h2><p>{t.wild}</p></> : null}
          {view.phase === "REVEAL" || view.phase === "FINISHED" ? <><Trophy className="dice-online-trophy" size={37} /><h2>{leader ? `${leader.name} ${t.winner}` : t.finished}</h2><p>{view.result ? `${t.total} ${view.result.total} ${t.diceUnit} · ${view.result.bid.face} ${t.point}` : ""}</p></> : null}
        </div>
      </div>
    </section>
    {view.phase === "LOBBY" ? <section className="dice-online-paper dice-online-controls"><p>{t.min}</p><div className="dice-online-actions"><button className="dice-online-secondary" disabled={busy} onClick={() => void act({ type: "READY", ready: !own.ready })}>{own.ready ? t.cancelReady : t.prepare}</button>{room.isHost ? <button className="dice-online-primary" disabled={busy || !allReady} onClick={() => void act({ type: "START" })}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{t.start}</button> : null}</div></section> : null}
    {view.phase === "BIDDING" ? <section className="dice-online-paper dice-online-controls"><div className="dice-online-hand-heading"><strong>{t.myDice}</strong><button type="button" onClick={() => setCovered(!covered)}>{covered ? t.hidden : "◉"}</button></div>{covered ? <div className="dice-online-covered">{t.hidden}</div> : view.myHand ? <Hand values={view.myHand} cue={`${view.round}:mine`} label={t.point} /> : null}
      {myTurn ? <div className="dice-online-bid"><label>{t.count}<input type="number" min={room.seats.length} max={room.seats.length * 5} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label><label>{t.face}<select value={face} onChange={(event) => setFace(Number(event.target.value))}>{[2,3,4,5,6].map((number) => <option value={number} key={number}>{number}</option>)}</select></label><button className="dice-online-primary" disabled={busy || !validBid} onClick={() => void act({ type: "BID", count, face })}>{t.bid}</button>{view.bid ? <button className="dice-online-challenge" disabled={busy} onClick={() => void act({ type: "CHALLENGE" })}>{t.challenge}</button> : null}</div> : null}</section> : null}
    {(view.phase === "REVEAL" || view.phase === "FINISHED") ? <section className="dice-online-paper dice-online-controls"><div className="dice-online-reveal">{room.seats.map((seat) => view.revealedHands?.[String(seat.number)] ? <div key={seat.number}><strong>{seat.name}</strong><Hand values={view.revealedHands[String(seat.number)]} cue={`${view.round}:reveal`} label={t.point} /></div> : null)}</div>{room.isHost ? <button className="dice-online-primary" disabled={busy} onClick={() => void act({ type: view.phase === "FINISHED" ? "REMATCH" : "NEXT_ROUND" })}>{view.phase === "FINISHED" ? t.rematch : t.next}</button> : null}</section> : null}
    <div className="dice-online-footer"><p>{t.rules}</p><div>{room.isHost ? <button onClick={() => void act({ type: "CLOSE" })} disabled={busy}>{t.close}</button> : null}<button onClick={() => void act({ type: "LEAVE" })} disabled={busy}>{t.leave}</button></div></div>
    {error ? <p className="dice-online-error" role="alert">{error}</p> : null}
  </main>;
}
