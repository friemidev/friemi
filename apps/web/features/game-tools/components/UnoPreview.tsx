"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { advanceUnoDeadline, applyUnoAction, createUnoState, getUnoViewerState, isUnoCardPlayable, startUnoGame } from "../unoEngine";
import { getUnoCopy, unoErrorMessage } from "../unoCopy";
import { DRAW_GUESS_CATS, type DrawGuessCatId } from "../drawGuessCats";
import { UNO_COLORS, type UnoAction, type UnoColor, type UnoMatchMode, type UnoState, type UnoViewerState } from "../unoTypes";
import { UNO_REACTION_COOLDOWN_MS, UNO_REACTION_DURATION_MS, type UnoReaction, type UnoReactionKind } from "../unoReactions";
import type { UnoRoomView } from "../unoRoomTypes";
import { UnoEntryClient } from "./UnoEntryClient";
import { UnoLobby } from "./UnoLobby";
import { UnoTable } from "./UnoTable";
import s from "./UnoGame.module.css";

type Scene = "entry" | "lobby" | "table";
export type UnoPreviewScenario = "one-card" | "two-cards" | "function-last" | "report" | "challenge" | "result" | "many-cards";

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function createPractice(locale: string, count: number, seconds: 30 | 60 | 90 = 60, matchMode: UnoMatchMode = "score") {
  const names = locale === "zh-CN" ? ["米粒", "桃桃", "小蓝", "阿栗", "圆圆", "豆豆", "团子", "星星", "小满", "布丁"] : locale === "fr" ? ["Camille", "Lou", "Milo", "Lili", "Noé", "Jules", "Alma", "Léon", "Zoé", "Rose"] : ["Jamie", "Peach", "Milo", "Lumi", "Bean", "Pip", "Sunny", "Clover", "Finn", "Coco"];
  return createUnoState(names.slice(0, count).map((name, seat) => ({ seat, name })), { turnSeconds: seconds, matchMode });
}

function dealPractice(lobby: UnoState, seed: number) {
  // Pick a deterministic real deal with an immediately playable opening for the guest.
  for (let offset = 0; offset < 160; offset += 1) {
    const dealt = startUnoGame(lobby, Date.now(), seededRandom(seed + offset)).state;
    const view = getUnoViewerState(dealt, 0);
    if (view.turnSeat === 0 && view.colorChoiceSeat === null && view.hand.filter(card => isUnoCardPlayable(view, card)).length >= 2) return dealt;
  }
  return startUnoGame(lobby, Date.now(), seededRandom(seed)).state;
}

function scenarioPractice(dealt: UnoState, scenario?: UnoPreviewScenario): UnoState {
  if (!scenario) return dealt;
  const state = structuredClone(dealt);
  if (scenario === "many-cards") {
    const self = state.players.find(player => player.seat === 0)!;
    self.hand.push(...state.drawPile.splice(-(18 - self.hand.length)));
    self.handVersion += 1;
    return state;
  }
  const deck = [...state.drawPile, ...state.discard, ...state.players.flatMap(player => player.hand)];
  const take = (id: string) => deck.splice(deck.findIndex(card => card.id === id), 1)[0];
  state.discard = [take(scenario === "challenge" ? "wild4-0" : "red-5-0")];
  const fewSeat = scenario === "report" ? 1 : 0;
  for (const player of state.players) {
    player.hand = player.seat === fewSeat && scenario !== "challenge" ? [take(scenario === "function-last" ? "red-skip-0" : "red-7-0")] : [];
    if (player.seat === fewSeat && scenario === "two-cards") player.hand.push(take("blue-7-0"));
  }
  for (const player of state.players) {
    if (!player.hand.length) player.hand = deck.splice(0, 7);
    player.handVersion += 1;
    player.episodeId += 1;
    player.declared = false;
    player.grace = false;
    player.unoReportOpen = scenario === "report" && player.seat === fewSeat;
  }
  state.drawPile = deck;
  state.currentColor = scenario === "challenge" ? "blue" : "red";
  state.phase = scenario === "challenge" ? "CHALLENGE" : "PLAYING";
  state.challenge = scenario === "challenge" ? { offenderSeat: 1, targetSeat: 0, illegal: false } : null;
  state.turnSeat = 0;
  state.colorChoiceSeat = null;
  state.drawnCardId = null;
  state.deadlineAt = Date.now() + (scenario === "challenge" ? 15 : state.turnSeconds) * 1000;
  state.events = [];
  if (scenario === "result") {
    const self = state.players[0];
    return applyUnoAction(state, 0, { type: "PLAY", cardId: self.hand[0].id, handVersion: self.handVersion }, Date.now()).state;
  }
  return state;
}

function preferredColor(view: UnoViewerState): UnoColor {
  return [...UNO_COLORS].sort((a, b) => view.hand.filter(card => card.color === b).length - view.hand.filter(card => card.color === a).length)[0];
}

function botAction(state: UnoState): { seat: number; action: UnoAction } | null {
  const current = state.players.find(player => player.seat === state.turnSeat);
  if (!current || current.seat === 0 || !["PLAYING", "CHALLENGE"].includes(state.phase)) return null;
  const view = getUnoViewerState(state, current.seat);
  if (view.phase === "CHALLENGE") return { seat: current.seat, action: { type: "ACCEPT_DRAW_FOUR" } };
  if (view.colorChoiceSeat === current.seat) return { seat: current.seat, action: { type: "CHOOSE_COLOR", color: preferredColor(view) } };
  const playable = view.hand.filter(card => isUnoCardPlayable(view, card)).filter(card => card.value !== "wild4" || !view.hand.some(other => other.color === view.currentColor));
  // A bot keeps a newly drawn number if playing it would strand its last action card.
  if (view.rulesetVersion === 1 && view.drawnCardId && view.hand.length === 2 && view.hand.some(card => card.id !== view.drawnCardId && !/^\d$/.test(card.value))) return { seat: current.seat, action: { type: "PASS" } };
  const card = playable.sort((a, b) => Number(a.color === null) - Number(b.color === null) || Number(/^\d$/.test(a.value)) - Number(/^\d$/.test(b.value)))[0];
  if (card && view.hand.length === (view.rulesetVersion === 2 ? 2 : 1) && !view.declared) return { seat: current.seat, action: { type: "CALL_UNO", episodeId: current.episodeId, handVersion: view.handVersion } };
  if (card) return { seat: current.seat, action: { type: "PLAY", cardId: card.id, handVersion: view.handVersion, ...(card.color === null ? { color: preferredColor(view) } : {}) } };
  return { seat: current.seat, action: { type: view.drawnCardId ? "PASS" : "DRAW" } };
}

export function UnoPreview({ locale, initialScene = "table", autoplay = true, playerCount = 4, scenario }: { locale: string; initialScene?: Scene; autoplay?: boolean; playerCount?: number; scenario?: UnoPreviewScenario }) {
  const count = Math.max(2, Math.min(10, Number.isFinite(playerCount) ? Math.floor(playerCount) : 4));
  const t = getUnoCopy(locale);
  const [scene, setScene] = useState<Scene>(initialScene);
  const [state, setState] = useState(() => {
    const lobby = createPractice(locale, count);
    return initialScene === "table" ? scenarioPractice(dealPractice(lobby, 36), scenario) : lobby;
  });
  const [ready, setReady] = useState(false);
  const [selfCatId, setSelfCatId] = useState<DrawGuessCatId>(DRAW_GUESS_CATS[0].id);
  const [error, setError] = useState("");
  const [dealSeed, setDealSeed] = useState(36);
  const [roomCode, setRoomCode] = useState("FRIEMI");
  const [session, setSession] = useState(0);
  const [reactions, setReactions] = useState<UnoReaction[]>([]);
  const lastReactionAt = useRef(0);
  const view = useMemo(() => getUnoViewerState(state, 0), [state]);
  const room: UnoRoomView = {
    id: "practice", code: roomCode, revision: state.eventId, hostSeat: 0, viewerSeat: 0, returnedToLobby: false, reactions,
    seats: state.players.map(player => ({ seat: player.seat, name: player.name, avatarUrl: null, catId: player.seat === 0 ? selfCatId : DRAW_GUESS_CATS[player.seat % DRAW_GUESS_CATS.length].id, connected: true, returned: false, ready: player.seat === 0 ? ready : true })), state: view,
  };

  useEffect(() => {
    if (!reactions.length) return;
    const nextExpiry = Math.min(...reactions.map(reaction => reaction.expiresAt));
    const timer = setTimeout(() => setReactions(previous => previous.filter(reaction => reaction.expiresAt > Date.now())), Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timer);
  }, [reactions]);

  useEffect(() => {
    if (!autoplay || scene !== "table") return;
    const timer = setInterval(() => setState(previous => advanceUnoDeadline(previous, Date.now())), 500);
    return () => clearInterval(timer);
  }, [autoplay, scene]);

  useEffect(() => {
    if (!autoplay || scene !== "table") return;
    const next = botAction(state);
    if (!next) return;
    const timer = setTimeout(() => setState(previous => {
      const choice = botAction(previous);
      return choice ? applyUnoAction(previous, choice.seat, choice.action, Date.now()).state : previous;
    }), next.action.type === "CALL_UNO" ? 650 : 1150);
    return () => clearTimeout(timer);
  }, [autoplay, scene, state]);

  function act(action: UnoAction) {
    // Snapshot mode pauses computer turns and deadlines for repeatable UI inspection.
    const now = autoplay ? Date.now() : Math.min(Date.now(), (state.deadlineAt ?? Date.now() + 1) - 1);
    const result = applyUnoAction(state, 0, action, now);
    setError(result.error ? unoErrorMessage(result.error, locale) : "");
    setState(result.state);
  }

  function clearSession() {
    setError("");
    setReady(false);
    setReactions([]);
    lastReactionAt.current = 0;
    // Reset table selections, dialogs and the reaction control's local cooldown.
    setSession(previous => previous + 1);
  }

  function reset() {
    const seed = dealSeed + 997;
    setDealSeed(seed);
    clearSession();
    setState(scenarioPractice(dealPractice(createPractice(locale, count, state.turnSeconds, state.matchMode), seed), scenario));
    setScene("table");
  }

  function lobby() {
    clearSession();
    setState(createPractice(locale, count, state.turnSeconds, state.matchMode));
    setScene("lobby");
  }

  function openRoom(code?: string) {
    setRoomCode(code ?? "FRIEMI");
    lobby();
  }

  function leave() {
    clearSession();
    setScene("entry");
  }

  function start() {
    if (!ready || state.phase !== "LOBBY") return;
    clearSession();
    setState(scenarioPractice(dealPractice(state, dealSeed), scenario));
    setScene("table");
  }

  async function react(kind: UnoReactionKind) {
    const now = Date.now();
    if (now - lastReactionAt.current < UNO_REACTION_COOLDOWN_MS) return false;
    lastReactionAt.current = now;
    const reaction: UnoReaction = { id: crypto.randomUUID(), seat: 0, kind, createdAt: now, expiresAt: now + UNO_REACTION_DURATION_MS };
    setReactions(previous => [...previous.filter(entry => entry.expiresAt > now && entry.seat !== 0), reaction]);
    return true;
  }

  function settings(patch: { turnSeconds?: 30 | 60 | 90; matchMode?: UnoMatchMode }) {
    if (state.phase !== "LOBBY") return;
    const turnSeconds = patch.turnSeconds ?? state.turnSeconds;
    const matchMode = patch.matchMode ?? state.matchMode ?? "score";
    if (turnSeconds === state.turnSeconds && matchMode === (state.matchMode ?? "score")) return;
    setState(previous => ({ ...previous, turnSeconds, matchMode }));
    setReady(false);
  }

  return <>
    <aside aria-label={t.localPreview} className={s.previewBar}>
      <span>{t.localPreview}</span><button type="button" className={`${s.button} ${s.quiet} ${s.compactButton}`} onClick={reset}><RotateCcw size={18}/>{t.practiseAgain}</button>
    </aside>
    {scene === "entry" ? <UnoEntryClient locale={locale} preview onPreviewRoom={openRoom}/> : scene === "lobby" ? <UnoLobby key={session} locale={locale} room={room} busy={false} error={error} invitationUrl={`/${locale}/game-tools/uno/preview?scene=lobby`} onReady={setReady} onCharacter={async catId => { setSelfCatId(catId); return true; }} onStart={start} onLeave={leave} onSettings={settings} onReact={react}/> : <UnoTable key={session} locale={locale} state={view} seats={room.seats} code={roomCode} hostSeat={0} onAction={act} onLeave={leave} onReturn={lobby} onReact={react} reactions={reactions} error={error}/>}
  </>;
}
