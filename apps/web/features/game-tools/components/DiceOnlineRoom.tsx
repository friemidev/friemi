"use client";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Crown, Eye, EyeOff, LoaderCircle, Pencil, Plus, Radio, Trophy, X } from "lucide-react";
import { GameToolBrand } from "./GameToolBrand";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { DRAW_GUESS_CATS, getDrawGuessCatName, type DrawGuessCatId } from "../drawGuessCats";
import { DICE_ROOM_EVENT, getDiceRealtimeBrowserConfig, getDiceRoomTopic } from "../diceRealtime";
import type { DiceBid, DiceResult, DicePhase } from "../diceRoomEngine";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY, DISMISSED_ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "../activeGameToolRoomStorage";
import { withLocale } from "@/lib/routes";

type Room = {
  id: string; code: string; revision: number; status: string; maxPlayers: number; viewerSeat: number; isHost: boolean;
  seats: { number: number; name: string; ready: boolean; isHost: boolean; catId: string }[];
  view: { phase: DicePhase; round: number; seatNumbers: number[]; scores: Record<string, number>; turnSeat: number | null;
    bid: DiceBid | null; history: DiceBid[]; myHand: number[] | null; revealedHands: Record<string, number[]> | null; result: DiceResult | null };
};
const texts = {
  "zh-CN": { back: "返回", title: "吹牛", code: "房间号", copy: "复制邀请", copied: "已复制", waiting: "等朋友入座", ready: "已准备", unready: "待准备", prepare: "准备", cancelReady: "取消准备", start: "开局摇骰", turn: "轮到你叫点", otherTurn: "轮到", bid: "叫点", challenge: "开盅", count: "数量", face: "点数", wild: "1 点百搭", myDice: "我的骰子", hidden: "骰子盖住了", cover: "盖住骰子", uncover: "查看骰子", total: "实际", winner: "本轮赢了", next: "下一轮", rematch: "再来一局", finished: "本局结束", leave: "离开房间", close: "结束房间", syncing: "重连中", live: "实时已连接", polling: "正在刷新", error: "操作没成功，再试一次。", stale: "桌面已更新，请再试。", signIn: "登录已失效。", score: "分", round: "第", roundUnit: "轮", point: "点", diceUnit: "颗", min: "至少 2 人且全部准备后开局", invite: "发房间号，叫朋友来", rules: "先叫至少当前人数的骰子；同数量要加点。1 点百搭，开盅后实际数量达到叫数，叫点的人赢。先得 3 分获胜。", reveal: "开盅啦", you: "你", players: "已入座", empty: "叫朋友来", changeCat: "换猫咪", chooseCat: "选一只猫咪", useCat: "就选这只", closePicker: "关闭", readyCount: "人已准备", allSet: "人齐啦", gettingReady: "等大家准备" },
  en: { back: "Back", title: "Liar’s Dice", code: "Room code", copy: "Copy invite", copied: "Copied", waiting: "Waiting for friends", ready: "Ready", unready: "Not ready", prepare: "Ready up", cancelReady: "Cancel ready", start: "Roll and start", turn: "Your turn", otherTurn: "Turn:", bid: "Bid", challenge: "Challenge", count: "Count", face: "Face", wild: "Ones are wild", myDice: "My dice", hidden: "Dice are covered", cover: "Cover dice", uncover: "Show dice", total: "Actual", winner: "wins this round", next: "Next round", rematch: "Play again", finished: "Game over", leave: "Leave room", close: "Close room", syncing: "Reconnecting", live: "Live", polling: "Refreshing", error: "That didn't work. Try again.", stale: "Table changed. Try again.", signIn: "Sign-in expired.", score: "pts", round: "Round ", roundUnit: "", point: "", diceUnit: " dice", min: "Start with 2+ players, all ready", invite: "Send the code to a friend", rules: "First bid at least one die per player. Raise the count or face. Ones are wild. A true bid wins for its caller. First to 3 points wins.", reveal: "Reveal", you: "You", players: "seated", empty: "Invite a friend", changeCat: "Change cat", chooseCat: "Pick a cat", useCat: "Choose this cat", closePicker: "Close", readyCount: "ready", allSet: "All set!", gettingReady: "Getting ready" },
  fr: { back: "Retour", title: "Perudo", code: "Code de salle", copy: "Copier l’invitation", copied: "Copié", waiting: "En attente des amis", ready: "Prêt", unready: "Pas prêt", prepare: "Je suis prêt", cancelReady: "Annuler", start: "Lancer et jouer", turn: "À vous", otherTurn: "Tour de", bid: "Annoncer", challenge: "Douter", count: "Nombre", face: "Face", wild: "Les 1 sont jokers", myDice: "Mes dés", hidden: "Dés cachés", cover: "Cacher les dés", uncover: "Voir les dés", total: "Réel", winner: "gagne la manche", next: "Manche suivante", rematch: "Rejouer", finished: "Partie terminée", leave: "Quitter", close: "Fermer la salle", syncing: "Reconnexion", live: "En direct", polling: "Actualisation", error: "Action impossible. Réessayez.", stale: "La table a changé. Réessayez.", signIn: "Connexion expirée.", score: "pts", round: "Manche ", roundUnit: "", point: "", diceUnit: " dés", min: "Au moins 2 joueurs, tous prêts", invite: "Envoyez le code à un ami", rules: "Première annonce : au moins un dé par joueur. Augmentez le nombre ou la face. Les 1 sont jokers. Une annonce vraie donne le point à son auteur. Premier à 3 points.", reveal: "Révélation", you: "Vous", players: "installés", empty: "Inviter un ami", changeCat: "Changer de chat", chooseCat: "Choisir un chat", useCat: "Choisir ce chat", closePicker: "Fermer", readyCount: "prêts", allSet: "Tout le monde est prêt !", gettingReady: "En attente des autres" },
} as const;
function DiceSprite({ value, cue, label, locale }: { value: number; cue: string; label: string; locale: string }) {
  const [frame, setFrame] = useState(31);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setFrame(31); return; }
    let handle = 0; const start = performance.now();
    const tick = (now: number) => { const next = Math.min(31, Math.floor((now - start) / 900 * 32)); setFrame(next); if (next < 31) handle = requestAnimationFrame(tick); };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [cue]);
  return <span className="dice-online-die" role="img" aria-label={`${value} ${label}`} style={{ backgroundImage: `url(${withLocale(locale, `/game-tools/dice/assets/dice-3d/roll-${value}.webp?v=white-resin-v3`)})`, backgroundPosition: `${(frame % 8) * 100 / 7}% ${Math.floor(frame / 8) * 100 / 3}%` }} />;
}
function Hand({ values, cue, label, locale }: { values: number[]; cue: string; label: string; locale: string }) {
  return <div className="dice-online-hand">{values.map((value, index) => <DiceSprite key={`${index}-${value}`} value={value} cue={cue} label={label} locale={locale} />)}</div>;
}
function dismissDiceShortcut(roomId: string) {
  try { window.sessionStorage.setItem(DISMISSED_ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY, roomId); } catch { /* Ignore storage restrictions. */ }
  try {
    const stored = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null") as { id?: string } | null;
    if (stored?.id === roomId) window.localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
  } catch { /* Ignore a blocked or malformed stored shortcut. */ }
  window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
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
  const [characterOpen, setCharacterOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<DrawGuessCatId>(DRAW_GUESS_CATS[0].id);
  const pickerCloseRef = useRef<HTMLButtonElement>(null);
  const pickerReturnFocusRef = useRef<HTMLElement | null>(null);
  const entry = withLocale(locale, "/game-tools/dice/online");
  const refresh = useCallback(async () => {
    const current = roomRef.current;
    try {
      const response = await fetch(`/api/game-tools/dice/rooms/${current.id}`, { cache: "no-store", headers: { "if-none-match": `W/"dice-${current.viewerSeat}-${current.revision}"` } });
      if (response.status === 304) return;
      if (response.status === 401) { setError(t.signIn); return; }
      if (!response.ok) { if (response.status === 404 || response.status === 403) { dismissDiceShortcut(current.id); router.replace(entry); router.refresh(); } return; }
      const data = await response.json();
      if (data.room) setRoom((previous) => data.room.revision >= previous.revision ? data.room : previous);
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
  }, [room.view.round, room.view.bid?.count, room.view.bid?.face, room.seats.length]);
  useEffect(() => {
    if (!characterOpen) return;
    pickerCloseRef.current?.focus();
  }, [characterOpen]);
  useEffect(() => {
    if (characterOpen) return;
    pickerReturnFocusRef.current?.focus();
  }, [characterOpen]);
  useEffect(() => {
    if (!characterOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setCharacterOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [characterOpen, busy]);
  async function act(action: { type: string; [key: string]: unknown }): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/game-tools/dice/rooms/${room.id}`, { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ commandId: crypto.randomUUID(), expectedRound: roomRef.current.view.round, action }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error === "STALE_ROUND" || data.error === "NOT_YOUR_TURN" ? t.stale : t.error); await refresh(); return false; }
      if (action.type === "LEAVE" || action.type === "CLOSE") { dismissDiceShortcut(room.id); router.replace(entry); router.refresh(); return true; }
      if (data.room) setRoom((previous) => data.room.revision >= previous.revision ? data.room : previous);
      return true;
    } catch { setError(t.error); await refresh(); return false; }
    finally { setBusy(false); }
  }
  function openCharacter() {
    pickerReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const catId = room.seats.find((seat) => seat.number === room.viewerSeat)?.catId;
    setSelectedCat((DRAW_GUESS_CATS.find((cat) => cat.id === catId) ?? DRAW_GUESS_CATS[0]).id);
    setError("");
    setCharacterOpen(true);
  }
  async function saveCharacter() {
    if (selectedCat === room.seats.find((seat) => seat.number === room.viewerSeat)?.catId) { setCharacterOpen(false); return; }
    if (await act({ type: "SET_CAT", catId: selectedCat })) setCharacterOpen(false);
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
  const readyCount = room.seats.filter((seat) => seat.ready).length;
  const myTurn = view.phase === "BIDDING" && view.turnSeat === room.viewerSeat;
  const validBid = count >= room.seats.length && count <= room.seats.length * 5 && (!view.bid || count > view.bid.count || count === view.bid.count && face > view.bid.face);
  return <main className="dice-online dice-online-room">
    <div className="dice-online-room-nav"><div className="dice-online-nav"><Link className="dice-online-back" href={entry} aria-label={t.back}><ArrowLeft size={20} /></Link><GameToolBrand game={locale === "zh-CN" ? "骰子" : locale === "fr" ? "Dés" : "Dice"} /></div><span className="dice-online-sync"><Radio size={14} />{syncStatus === "CONNECTED" ? t.live : syncStatus === "RECONNECTING" ? t.syncing : t.polling}</span></div>
    <header className="dice-online-room-heading"><div>{view.phase !== "LOBBY" ? <span className="dice-online-kicker">{t.round}{view.round}{t.roundUnit}</span> : null}<h1>{t.title}</h1></div><div className="dice-online-room-code"><span>{t.code}</span><strong>{room.code}</strong><button onClick={() => void copyInvite()} type="button" aria-label={t.copy}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div></header>
    <section className={`dice-online-table ${view.phase === "LOBBY" ? "dice-online-table--lobby" : ""}`} aria-label={t.title}>
      <div className={`dice-online-table-inner ${view.phase === "LOBBY" ? "dice-online-table-inner--lobby" : ""}`}>
        {view.phase === "LOBBY" ? <div className="dice-online-lobby-scene">
          <span className="dice-online-lobby-count">{room.seats.length} / {room.maxPlayers} {t.players}</span>
          <div className="dice-online-lobby-art" aria-hidden="true"><span className="dice-online-lobby-spark">✦</span><div className="dice-online-cup" /><DiceSprite value={5} cue="lobby-five" label={t.point} locale={locale} /><DiceSprite value={3} cue="lobby-three" label={t.point} locale={locale} /></div>
          <h2>{room.seats.length < 2 ? t.waiting : allReady ? t.allSet : t.gettingReady}</h2>
        </div> : null}
        <div className="dice-online-roster">{room.seats.map((seat) => <div className={`dice-online-player ${seat.number === view.turnSeat ? "is-turn" : ""}`} key={seat.number}>
          {view.phase === "LOBBY" && seat.number === room.viewerSeat ? <button type="button" className="dice-online-player-avatar-button" onClick={openCharacter} aria-label={`${t.changeCat} · ${getDrawGuessCatName(seat.catId, locale)}`}><DrawGuessCatSprite catId={seat.catId as DrawGuessCatId} animated mood="idle" size={58} /><Pencil size={13} /></button> : <DrawGuessCatSprite catId={seat.catId as DrawGuessCatId} mood={view.result?.winnerSeat === seat.number ? "happy" : "idle"} size={54} />}
          <div><strong>{seat.number === room.viewerSeat ? t.you : seat.name}</strong><span>{view.phase === "LOBBY" ? seat.ready ? t.ready : t.unready : `${view.scores[String(seat.number)] ?? 0} ${t.score}`}</span></div>
          {seat.isHost ? <Crown size={15} aria-label="Host" /> : null}
        </div>)}{view.phase === "LOBBY" && room.seats.length < room.maxPlayers ? <button type="button" className="dice-online-empty-seat" onClick={() => void copyInvite()} aria-label={t.copy}><Plus size={22} /><span>{t.empty}</span></button> : null}</div>
        <div className="dice-online-table-center" aria-live="polite">
          {view.phase === "BIDDING" ? <><div className="dice-online-cup dice-online-cup--shaking" aria-hidden="true" /><h2>{view.bid ? `${view.bid.count} ${t.diceUnit} · ${view.bid.face} ${t.point}` : myTurn ? t.turn : current ? `${t.otherTurn} ${current.name}` : t.waiting}</h2><p>{t.wild}</p></> : null}
          {view.phase === "REVEAL" || view.phase === "FINISHED" ? <><Trophy className="dice-online-trophy" size={37} /><h2>{leader ? `${leader.name} ${t.winner}` : t.finished}</h2><p>{view.result ? `${t.total} ${view.result.total} ${t.diceUnit} · ${view.result.bid.face} ${t.point}` : ""}</p></> : null}
        </div>
      </div>
    </section>
    {view.phase === "LOBBY" ? <section className="dice-online-paper dice-online-controls dice-online-lobby-controls"><div className="dice-online-lobby-status"><span className="dice-online-ready-dots" aria-hidden="true">{room.seats.map((seat) => <i key={seat.number} className={seat.ready ? "is-ready" : ""} />)}</span><p>{room.seats.length < 2 ? t.min : `${readyCount} / ${room.seats.length} ${t.readyCount}`}</p><button type="button" className="dice-online-change-cat" onClick={openCharacter}><Pencil size={14} />{t.changeCat}</button></div><div className="dice-online-actions"><button className="dice-online-secondary" disabled={busy} onClick={() => void act({ type: "READY", ready: !own.ready })}>{own.ready ? <Check size={16} /> : null}{own.ready ? t.cancelReady : t.prepare}</button>{room.isHost ? <button className="dice-online-primary" disabled={busy || !allReady} onClick={() => void act({ type: "START" })}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{t.start}</button> : null}</div></section> : null}
    {view.phase === "BIDDING" ? <section className="dice-online-paper dice-online-controls"><div className="dice-online-hand-heading"><strong>{t.myDice}</strong><button type="button" aria-label={covered ? t.uncover : t.cover} aria-pressed={covered} onClick={() => setCovered(!covered)}>{covered ? <Eye size={20} /> : <EyeOff size={20} />}</button></div>{covered ? <div className="dice-online-covered">{t.hidden}</div> : view.myHand ? <Hand values={view.myHand} cue={`${view.round}:mine`} label={t.point} locale={locale} /> : null}
      {myTurn ? <div className="dice-online-bid"><label>{t.count}<input type="number" min={room.seats.length} max={room.seats.length * 5} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label><label>{t.face}<select value={face} onChange={(event) => setFace(Number(event.target.value))}>{[2,3,4,5,6].map((number) => <option value={number} key={number}>{number}</option>)}</select></label><button className="dice-online-primary" disabled={busy || !validBid} onClick={() => void act({ type: "BID", count, face })}>{t.bid}</button>{view.bid ? <button className="dice-online-challenge" disabled={busy} onClick={() => void act({ type: "CHALLENGE" })}>{t.challenge}</button> : null}</div> : null}</section> : null}
    {(view.phase === "REVEAL" || view.phase === "FINISHED") ? <section className="dice-online-paper dice-online-controls"><div className="dice-online-reveal">{room.seats.map((seat) => view.revealedHands?.[String(seat.number)] ? <div key={seat.number}><strong>{seat.name}</strong><Hand values={view.revealedHands[String(seat.number)]} cue={`${view.round}:reveal`} label={t.point} locale={locale} /></div> : null)}</div>{room.isHost ? <button className="dice-online-primary" disabled={busy} onClick={() => void act({ type: view.phase === "FINISHED" ? "REMATCH" : "NEXT_ROUND" })}>{view.phase === "FINISHED" ? t.rematch : t.next}</button> : null}</section> : null}
    <div className="dice-online-footer">{view.phase !== "LOBBY" ? <p>{t.rules}</p> : <span /> }<div>{room.isHost ? <button onClick={() => void act({ type: "CLOSE" })} disabled={busy}>{t.close}</button> : null}<button onClick={() => void act({ type: "LEAVE" })} disabled={busy}>{t.leave}</button></div></div>
    {error ? <p className="dice-online-error" role="alert">{error}</p> : null}
    {characterOpen && view.phase === "LOBBY" ? <div className="dice-online-character-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCharacterOpen(false); }}><section className="dice-online-character-dialog" role="dialog" aria-modal="true" aria-label={t.chooseCat} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="dice-online-character-heading"><div><span className="dice-online-kicker">{t.changeCat}</span><h2>{t.chooseCat}</h2></div><button ref={pickerCloseRef} type="button" disabled={busy} onClick={() => setCharacterOpen(false)} aria-label={t.closePicker}><X size={20} /></button></div>
      <div className="dice-online-character-preview"><DrawGuessCatSprite catId={selectedCat} animated mood="happy" performance="wave" size={108} /><strong>{getDrawGuessCatName(selectedCat, locale)}</strong></div>
      <div className="dice-online-character-grid">{DRAW_GUESS_CATS.map((cat) => <button type="button" key={cat.id} disabled={busy} aria-pressed={selectedCat === cat.id} onClick={() => setSelectedCat(cat.id)}><DrawGuessCatSprite catId={cat.id} size={58} /><span>{getDrawGuessCatName(cat.id, locale)}</span>{selectedCat === cat.id ? <Check size={15} /> : null}</button>)}</div>
      {error ? <p className="dice-online-error" role="alert">{error}</p> : null}
      <button type="button" className="dice-online-primary dice-online-character-confirm" disabled={busy} onClick={() => void saveCharacter()}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{t.useCat}</button>
    </section></div> : null}
  </main>;
}
