"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Flag, House, Info, LogOut, RotateCcw, Trophy, X } from "lucide-react";
import { isUnoCardPlayable } from "../unoEngine";
import { getUnoCopy, unoCardLabel, unoCardUnit, unoEventLabel } from "../unoCopy";
import { UNO_COLORS, type UnoAction, type UnoColor, type UnoViewerState } from "../unoTypes";
import type { DrawGuessCatId } from "../drawGuessCats";
import type { UnoReaction, UnoReactionKind } from "../unoReactions";
import { getUnoExperienceCopy, unoVerdictExplanation } from "../unoExperienceCopy";
import { useUnoReactions } from "../hooks/useUnoReactions";
import { useUnoNow } from "../hooks/useUnoClock";
import { UnoReactionBubble, UnoReactionControls } from "./UnoReactionControls";
import { UnoCardFace } from "./UnoCard";
import { UnoAvatar, UnoDialog, UnoHeader } from "./UnoChrome";
import s from "./UnoGame.module.css";

export type UnoSeatView = { seat: number; name: string; catId?: DrawGuessCatId; avatarUrl?: string | null; connected?: boolean; ready?: boolean };
export type UnoTableProps = { locale: string; state: UnoViewerState; seats: UnoSeatView[]; code: string; hostSeat: number; busy?: boolean; error?: string; reconnecting?: boolean; returning?: boolean; reactions?: UnoReaction[]; onReact?: (kind: UnoReactionKind) => Promise<boolean>; onAction: (action: UnoAction) => Promise<unknown> | void; onLeave: () => void; onReturn?: () => void; onRetry?: () => void };

export function UnoTable({ locale, state, seats, code, hostSeat, busy = false, error, reconnecting, returning, reactions, onReact, onAction, onLeave, onReturn, onRetry }: UnoTableProps) {
  const t = getUnoCopy(locale, state.rulesetVersion), ux = getUnoExperienceCopy(locale, state.rulesetVersion), liveReactions = useUnoReactions(reactions);
  const clockNow = useUnoNow();
  const [selection, setSelection] = useState<{ matchNumber: number; roundNumber: number; cardId: string } | null>(null);
  const [wildCard, setWildCard] = useState<string | null>(null);
  const [menuSeat, setMenuSeat] = useState<number | null>(null);
  const [menuAlign, setMenuAlign] = useState<"start" | "center" | "end">("center");
  const [leave, setLeave] = useState(false);
  const [now, setNow] = useState(clockNow);
  const [unoBubble, setUnoBubble] = useState<number | null>(null);
  const [showVerdict, setShowVerdict] = useState(false);
  const eventCursor = useRef(state.events.at(-1)?.id ?? 0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const playerMenuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedId = selection?.matchNumber === state.matchNumber && selection.roundNumber === state.roundNumber ? selection.cardId : null;
  const selected = state.hand.find(card => card.id === selectedId);
  const active = state.phase === "PLAYING" && state.turnSeat === state.selfSeat && state.colorChoiceSeat === null;
  const ended = state.phase === "ROUND_END" || state.phase === "FINISHED";
  const canPlay = Boolean(selected && active && isUnoCardPlayable(state, selected));
  const opponents = state.players.filter(p => p.seat !== state.selfSeat);
  const current = state.players.find(p => p.seat === state.turnSeat);
  const lastEvent = [...state.events].reverse().find(e => e.kind !== "UNO");
  const lastVerdict = [...state.events].reverse().find(e => ["CHALLENGE_WON", "CHALLENGE_LOST", "ACCEPT_DRAW_FOUR"].includes(e.kind));
  const selfReaction = liveReactions.get(state.selfSeat);
  const totalSeconds = state.phase === "CHALLENGE" ? 15 : state.turnSeconds;
  const seconds = Math.min(totalSeconds, Math.max(0, Math.ceil(((state.deadlineAt ?? now) - now) / 1000)));
  const self = state.players.find(p => p.seat === state.selfSeat);
  const winner = state.players.find(p => p.seat === state.roundResult?.winnerSeat);
  const chooseInitial = state.colorChoiceSeat === state.selfSeat;
  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>(".app-desktop-navigation");
    if (!navigation) return;
    // The app navigation remains above the game when a short screen scrolls.
    // Observe its actual height so rotation, zoom and hidden native chrome work.
    const update = () => tableRef.current?.style.setProperty("--uno-navigation-height", `${navigation.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setNow(clockNow()); const timer = setInterval(() => setNow(clockNow()), 250); return () => clearInterval(timer); }, [clockNow]);
  useEffect(() => {
    if (selection && (selection.matchNumber !== state.matchNumber || selection.roundNumber !== state.roundNumber || !state.hand.some(card => card.id === selection.cardId))) setSelection(null);
  }, [selection, state.matchNumber, state.roundNumber, state.hand]);
  useEffect(() => { setWildCard(null); }, [state.handVersion, state.turnId, state.phase]);
  useEffect(() => { setShowVerdict(false); }, [state.roundNumber, state.matchNumber, state.phase]);
  useEffect(() => {
    const fresh = state.events.filter(e => e.id > eventCursor.current);
    eventCursor.current = state.events.at(-1)?.id ?? 0;
    const call = fresh.find(e => e.kind === "UNO");
    if (!call) return;
    setUnoBubble(call.seat);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setUnoBubble(null), 1700);
  }, [state.events]);
  useEffect(() => () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); }, []);
  useEffect(() => {
    if (menuSeat === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuSeat(null); menuTriggerRef.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !playerMenuRef.current?.contains(event.target) && !menuTriggerRef.current?.contains(event.target)) setMenuSeat(null);
    };
    window.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [menuSeat]);

  function play() {
    if (!selected || !canPlay || busy) return;
    if (!selected.color) { setWildCard(selected.id); return; }
    void onAction({ type: "PLAY", cardId: selected.id, handVersion: state.handVersion });
  }
  function choose(color: UnoColor) {
    if (chooseInitial) void onAction({ type: "CHOOSE_COLOR", color });
    else if (wildCard) void onAction({ type: "PLAY", cardId: wildCard, color, handVersion: state.handVersion });
    setWildCard(null);
  }
  let handHint = state.drawnCardId ? t.drawnOnly : "";
  if (selected && !canPlay && active) handHint = state.rulesetVersion === 1 && state.hand.length === 1 && !/^\d$/.test(selected.value) ? t.lastNumber : state.drawnCardId && selected.id !== state.drawnCardId ? t.drawnOnly : t.notPlayable;
  const feedback = (error || reconnecting) && <div className={s.feedback} role={error ? "alert" : "status"}><span>{reconnecting ? t.reconnecting : error}</span>{onRetry && <button type="button" className={`${s.button} ${s.quiet} ${s.compactButton}`} onClick={onRetry}><RotateCcw size={18}/>{t.retry}</button>}</div>;

  return <div ref={tableRef} className={`${s.game} ${s.tablePage}`} data-uno-phase={state.phase}>
    <UnoHeader locale={locale} code={code} round={state.roundNumber} events={state.events} rulesetVersion={state.rulesetVersion} onBack={() => setLeave(true)}/>
    <div className={s.toolbar} aria-label={t.hand}>
      <button type="button" className={`${s.button} ${s.drawButton}`} disabled={!active || busy || !!reconnecting} onClick={() => void onAction({ type: state.drawnCardId ? "PASS" : "DRAW" })}><ArrowDown size={19}/><span>{t.draw}<small>{state.drawnCardId ? ux.keepAndEnd : t.drawHint}</small></span></button>
      <button type="button" className={`${s.button} ${s.unoButton} ${state.declared ? s.unoDeclared : ""}`} disabled={busy || !!reconnecting || ended} aria-pressed={state.declared} onClick={() => { if (self) void onAction({ type: "CALL_UNO", episodeId: self.episodeId, handVersion: state.handVersion }); }}>UNO<span aria-hidden="true">!</span>{state.declared && <Check size={16}/>}</button>
      <button type="button" className={`${s.button} ${s.primary}`} disabled={!canPlay || busy || !!reconnecting} onClick={play}><span>{t.play}</span><ArrowUpRight size={21}/></button>
    </div>

    <section className={s.arena} aria-label={t.seats}>
      <div className={s.opponents} data-many={opponents.length > 5}>
        {opponents.map((player, i) => {
          const seat = seats.find(p => p.seat === player.seat), isCurrent = player.seat === state.turnSeat && !ended;
          const reaction = liveReactions.get(player.seat);
          return <div className={`${s.opponent} ${isCurrent ? s.activeOpponent : ""}`} key={player.seat} style={{ "--seat-i": i } as CSSProperties}>
            <button type="button" className={s.opponentButton} aria-current={isCurrent ? "true" : undefined} aria-label={`${player.name} · ${player.cardCount} ${unoCardUnit(player.cardCount, locale)} · ${t.menu}`} aria-expanded={menuSeat === player.seat} onClick={event => {
              menuTriggerRef.current = event.currentTarget;
              const bounds = event.currentTarget.getBoundingClientRect();
              setMenuAlign(window.innerWidth - bounds.right < 120 ? "end" : bounds.left < 120 ? "start" : "center");
              setMenuSeat(menuSeat === player.seat ? null : player.seat);
            }}>
              <span className={s.avatar}><UnoAvatar seat={player.seat} catId={seat?.catId} pose={unoBubble === player.seat ? "uno" : isCurrent ? "playing" : "idle"} reaction={unoBubble === player.seat ? undefined : reaction?.kind} animated={!ended && !wildCard && !chooseInitial && !leave}/>{reaction && unoBubble !== player.seat && <UnoReactionBubble reaction={reaction} locale={locale}/>}{seat?.connected === false && <span className={s.awayDot} aria-label={t.offline}/>}</span>
              <span className={s.opponentName}><span>{player.name}</span><ChevronDown size={12}/></span>
              <span className={s.cardCount} key={player.cardCount}><span className={s.miniCardBack} aria-hidden="true"/>{player.cardCount}<small>{unoCardUnit(player.cardCount, locale)}</small></span>
            </button>
            {unoBubble === player.seat && <span className={s.unoBubble}>UNO!</span>}
            {menuSeat === player.seat && <div ref={playerMenuRef} className={s.playerMenu} style={{ left: menuAlign === "end" ? "auto" : menuAlign === "start" ? 0 : "50%", right: menuAlign === "end" ? 0 : "auto", transform: menuAlign === "center" ? "translateX(-50%)" : "none" }}><button type="button" className={`${s.button} ${s.secondary} ${s.compactButton}`} autoFocus disabled={busy || !!reconnecting || ended} onClick={() => { setMenuSeat(null); menuTriggerRef.current?.focus(); void onAction({ type: "CATCH_UNO", targetSeat: player.seat, episodeId: player.episodeId, roundNumber: state.roundNumber }); }}><Flag size={18}/>{t.report}</button><button type="button" className={`${s.button} ${s.quiet} ${s.compactButton}`} onClick={() => { setMenuSeat(null); menuTriggerRef.current?.focus(); }}><X size={18}/>{t.close}</button></div>}
          </div>;
        })}
      </div>

      <div className={s.felt}>
        <span className={s.tableStamp} aria-hidden="true">friemi.</span>
        <svg className={s.tableDoodle} viewBox="0 0 60 60" aria-hidden="true"><path d="m30 5 5 17 18 7-18 7-5 18-6-18-18-7 18-7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
        <span className={`${s.direction} ${state.direction === -1 ? s.directionReverse : ""}`} aria-label={`${t.direction} · ${state.direction === 1 ? ux.clockwise : ux.counterclockwise}`} key={`direction-${state.direction}`}><RotateCcw size={28}/><small>{state.direction === 1 ? ux.clockwise : ux.counterclockwise}</small></span>
        <div className={s.piles}>
          <div className={s.pileGroup}><div className={s.deckStack} key={`deck-${state.events.filter(e => ["DRAW", "CAUGHT", "FALSE_CATCH"].includes(e.kind)).at(-1)?.id ?? 0}`}><UnoCardFace back/><span className={s.deckCount}>{state.drawPileCount}</span></div><span className={s.pileCaption}>{t.pile}</span></div>
          <span className={s.pileArrow} aria-hidden="true">↝</span>
          <div className={s.pileGroup}><div className={s.discardStack} key={state.topCard?.id ?? "empty"} aria-label={state.topCard ? unoCardLabel(state.topCard, locale) : t.discard}>{state.topCard ? <UnoCardFace card={state.topCard}/> : <UnoCardFace back/>}</div><span className={s.pileCaption}>{t.discard}</span></div>
        </div>
        <div className={s.currentColor} data-color={state.currentColor ?? "blue"}><span aria-hidden="true">{({ red: "●", yellow: "▲", green: "■", blue: "◆" } as const)[state.currentColor ?? "blue"]}</span>{state.currentColor ? t[state.currentColor] : t.choose}</div>
      </div>

      <div className={`${s.turnBanner} ${active ? s.yourTurn : ""}`}>
        <span>{ended ? `${winner?.name ?? ""} ${t.roundWin}` : state.phase === "CHALLENGE" ? `${state.players.find(p => p.seat === state.challenge?.targetSeat)?.name ?? ""} ${t.challengeWaiting}` : active ? t.turn : `${current?.name ?? ""} ${t.theirTurn}`}</span>
        {!ended && state.deadlineAt !== null && <span className={s.timer} aria-label={`${seconds} s`} style={{ "--remaining": `${Math.min(100, seconds / totalSeconds * 100)}%` } as CSSProperties}>{seconds}<small>s</small></span>}
      </div>
      <div className={s.actionLog} aria-live="polite" aria-atomic="true"><p>{lastEvent ? unoEventLabel(lastEvent, state, locale) : t.dealt}</p></div>
      {lastVerdict && !ended && <button type="button" className={`${s.button} ${s.quiet} ${s.compactButton} ${s.verdictButton}`} onClick={() => setShowVerdict(true)}><Info size={18}/>{ux.lastJudgement}</button>}
      {state.phase === "CHALLENGE" && state.challenge?.targetSeat === state.selfSeat && <section className={s.challengePanel} aria-label={t.challengeTitle}>
        <div><strong>{t.challengeTitle}</strong><p>{t.challengeBody}</p></div>
        <div className={s.challengeActions}><button type="button" disabled={busy || !!reconnecting} className={`${s.button} ${s.primary}`} onClick={() => void onAction({ type: "ACCEPT_DRAW_FOUR" })}>{t.accept}</button><button type="button" disabled={busy || !!reconnecting} className={`${s.button} ${s.secondary}`} onClick={() => void onAction({ type: "CHALLENGE_DRAW_FOUR" })}>{t.challenge}</button></div>
      </section>}
    </section>

    <section className={s.handSection} aria-label={t.hand}>
      <div className={s.handHeading}><div className={s.selfAvatar}><UnoAvatar seat={state.selfSeat} catId={seats.find(p => p.seat === state.selfSeat)?.catId} pose={unoBubble === state.selfSeat ? "uno" : active ? "playing" : "idle"} reaction={unoBubble === state.selfSeat ? undefined : selfReaction?.kind} animated={!ended && !wildCard && !chooseInitial && !leave}/>{selfReaction && unoBubble !== state.selfSeat && <UnoReactionBubble reaction={selfReaction} locale={locale}/>}</div><span className={s.handDescription}><strong>{t.hand}<small>{state.hand.length} {unoCardUnit(state.hand.length, locale)}</small></strong>{(selected || handHint) && <span className={s.handHint} id="uno-hand-hint">{[selected ? unoCardLabel(selected, locale) : "", handHint].filter(Boolean).join(" · ")}</span>}</span>{onReact && <UnoReactionControls locale={locale} disabled={!!reconnecting || ended} onReact={onReact}/>}<span className={s.selfScore}>{self?.score ?? 0}<small>{t.points}</small></span>{unoBubble === state.selfSeat && <span className={s.selfUno}>UNO!</span>}</div>
      {state.hand.length > 9 && <p className={s.handScrollHint}>{ux.scrollHand}</p>}
      <div className={s.handScroll} ref={handRef}><div className={s.handFan} data-count={state.hand.length} data-many={state.hand.length > 9}>
        {state.hand.map((card, i) => {
          const chosen = selectedId === card.id, playable = active && isUnoCardPlayable(state, card);
          const rotation = state.hand.length <= 9 ? (i - (state.hand.length - 1) / 2) * 2.4 : 0;
          return <button type="button" key={`${state.matchNumber}-${state.roundNumber}-${card.id}`} className={`${s.handCard} ${chosen ? s.selectedCard : ""} ${playable ? s.playableCard : ""}`} style={{ "--tilt": `${rotation}deg`, "--card-i": i, "--fan-lift": `${state.hand.length <= 9 ? Math.abs(i - (state.hand.length - 1) / 2) * 3 : 0}px` } as CSSProperties} aria-label={unoCardLabel(card, locale)} aria-pressed={chosen} aria-describedby={chosen ? "uno-hand-hint" : undefined} onClick={() => setSelection(chosen ? null : { matchNumber: state.matchNumber, roundNumber: state.roundNumber, cardId: card.id })} onKeyDown={e => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault(); const siblings = handRef.current?.querySelectorAll<HTMLButtonElement>("button");
            siblings?.[(i + (e.key === "ArrowRight" ? 1 : -1) + state.hand.length) % state.hand.length]?.focus();
          }}><UnoCardFace card={card}/>{chosen && <span className={s.selectionTick} aria-hidden="true"><Check size={14}/></span>}</button>;
        })}
        {!state.hand.length && <p className={s.emptyHand}>{t.handEmpty}</p>}
      </div></div>
    </section>

    {!ended && !wildCard && !chooseInitial && feedback}
    {showVerdict && lastVerdict && !ended && <UnoDialog title={ux.judgement} onClose={() => setShowVerdict(false)}><p>{unoEventLabel(lastVerdict, state, locale)}</p><p>{unoVerdictExplanation(lastVerdict, locale)}</p><button type="button" className={`${s.button} ${s.primary}`} onClick={() => setShowVerdict(false)}>{t.close}</button></UnoDialog>}
    {(wildCard || chooseInitial) && <UnoDialog title={t.choose} onClose={chooseInitial ? undefined : () => setWildCard(null)} fallbackFocus={() => handRef.current?.querySelector<HTMLButtonElement>("button") ?? null}><div className={s.colorChoices}>{UNO_COLORS.map((color, i) => <button type="button" key={color} data-color={color} disabled={busy || !!reconnecting} onClick={() => choose(color)}><span aria-hidden="true">{["●", "▲", "■", "◆"][i]}</span>{t[color]}</button>)}</div>{feedback}{!chooseInitial && <button className={`${s.button} ${s.quiet}`} type="button" onClick={() => setWildCard(null)}><X size={18}/>{t.close}</button>}</UnoDialog>}
    {ended && <UnoDialog title={`${winner?.name ?? ""} ${state.phase === "FINISHED" && state.matchMode !== "single" ? t.matchWin : t.roundWin}`}>
      <div className={s.winnerArt}><span className={s.winnerConfetti} aria-hidden="true">✦</span><UnoAvatar seat={winner?.seat ?? 0} catId={seats.find(p => p.seat === winner?.seat)?.catId} pose="winner"/><Trophy size={40}/></div>
      <p className={s.winPoints}>+{state.roundResult?.points ?? 0} <small>{t.points}</small></p>
      <div className={s.scoreboard} aria-label={t.scores}>{[...state.players].sort((a, b) => (state.matchMode === "single" ? Number(b.seat === winner?.seat) - Number(a.seat === winner?.seat) : 0) || b.score - a.score).map((player, i) => <div key={player.seat}><span>{i + 1}</span><b>{player.name}{player.seat === state.selfSeat ? ` · ${t.you}` : ""}</b><strong>{player.score}</strong></div>)}</div>
      <div className={s.resultActions}>
        {returning ? <p role="status">{locale === "zh-CN" ? "等待其他玩家返回" : locale === "fr" ? "En attente des autres joueurs" : "Waiting for other players"}</p> : state.phase === "ROUND_END" ? hostSeat === state.selfSeat ? <button type="button" disabled={busy} className={`${s.button} ${s.primary}`} onClick={() => void onAction({ type: "NEXT_ROUND" })}>{t.next}<ArrowRight size={18}/></button> : <p>{t.waitHost}</p> : null}
        {onReturn && <button type="button" className={`${s.button} ${state.phase === "FINISHED" ? s.primary : s.secondary}`} disabled={busy || returning} onClick={onReturn}><House size={18}/>{t.lobby}</button>}
        <button type="button" className={`${s.button} ${s.quiet}`} disabled={busy} onClick={onLeave}><LogOut size={18}/>{t.leave}</button>
      </div>
      {feedback}
    </UnoDialog>}
    {leave && !ended && <UnoDialog title={t.leaveTitle} onClose={() => setLeave(false)}><p>{t.leaveBody}</p><div className={s.dialogActions}><button type="button" className={`${s.button} ${s.primary}`} onClick={() => setLeave(false)}>{t.stay}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={onLeave}>{t.confirmLeave}</button></div></UnoDialog>}
  </div>;
}
