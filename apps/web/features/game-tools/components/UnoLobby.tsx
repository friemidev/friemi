"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Crown, Pencil, Plus, RotateCcw } from "lucide-react";
import type { UnoRoomView } from "../unoRoomTypes";
import type { UnoRoomSettings } from "../unoTypes";
import type { UnoReactionKind } from "../unoReactions";
import { getUnoCopy } from "../unoCopy";
import { getUnoExperienceCopy } from "../unoExperienceCopy";
import { useUnoReactions } from "../hooks/useUnoReactions";
import { getDrawGuessCatName, type DrawGuessCatId } from "../drawGuessCats";
import { UnoAvatar, UnoHeader } from "./UnoChrome";
import { UnoReactionBubble, UnoReactionControls } from "./UnoReactionControls";
import { UnoCharacterPicker } from "./UnoCharacterPicker";
import { UnoCardFace } from "./UnoCard";
import s from "./UnoGame.module.css";

export function UnoLobby({ room, locale, busy, error, onReady, onStart, onLeave, onSettings, onCharacter, onReact, onRetry, invitationUrl }: { room: UnoRoomView; locale: string; busy: boolean; error?: string; onReady: (ready: boolean) => void; onStart: () => void; onLeave: () => void; onSettings: (settings: UnoRoomSettings) => void; onCharacter: (catId: DrawGuessCatId) => Promise<boolean>; onReact?: (kind: UnoReactionKind) => Promise<boolean>; onRetry?: () => void; invitationUrl?: string }) {
  const t = getUnoCopy(locale), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState("");
  const ux = getUnoExperienceCopy(locale), reactions = useUnoReactions(room.reactions);
  const [choosingCharacter, setChoosingCharacter] = useState(false);
  const me = room.seats.find(p => p.seat === room.viewerSeat), host = room.hostSeat === room.viewerSeat;
  const readyCount = room.seats.filter(p => p.ready && p.connected).length;
  const everyoneReady = room.seats.length >= 2 && readyCount === room.seats.length;
  async function invite() {
    setCopyError("");
    try { await navigator.clipboard.writeText(new URL(invitationUrl ?? `/${locale}/game-tools/uno/join/${room.code}`, window.location.origin).href); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setCopyError(t.linkError); }
  }
  return <div className={`${s.game} ${s.lobbyPage}`}><UnoHeader locale={locale} code={room.code} rulesetVersion={room.state.rulesetVersion} settings={room.state} onBack={onLeave}/><main>
    <div className={s.lobbyIntro}><h1>{t.waiting}</h1><div className={s.lobbyCards} aria-hidden="true"><UnoCardFace back/><UnoCardFace card={{ id: "lobby", color: "yellow", value: "7" }}/></div></div>
    <div className={s.invitation}><div><span>{t.code}</span><strong>{room.code}</strong></div><button type="button" className={`${s.button} ${s.secondary}`} onClick={() => void invite()}>{copied ? <Check size={18}/> : <Copy size={18}/>}<span>{copied ? t.copied : t.invitation}</span></button></div>
    <section className={s.lobbyTable} aria-label={t.seats}><div className={s.lobbySeatGrid}>
      {Array.from({ length: Math.max(6, room.seats.length + (room.seats.length < 10 ? 1 : 0)) }, (_, i) => {
        const player = room.seats[i];
        const reaction = player ? reactions.get(player.seat) : undefined;
        const readyToStart = player?.ready && player.connected;
        return player ? <div key={player.seat} className={`${s.lobbySeat} ${readyToStart ? s.seatReady : ""}`}><span className={s.avatar}><UnoAvatar seat={player.seat} catId={player.catId} pose={readyToStart ? "ready" : "idle"} reaction={reaction?.kind} animated={!choosingCharacter}/>{reaction && <UnoReactionBubble reaction={reaction} locale={locale}/>}{!player.connected && <span className={s.awayDot} aria-label={t.offline}/>}{readyToStart && <span className={s.readyTick}><Check size={13}/></span>}</span><strong>{player.name}{player.seat === room.viewerSeat && <small> · {t.you}</small>}</strong><span className={s.seatRole}>{player.seat === room.hostSeat && <><Crown size={12}/>{t.host}</>}{readyToStart && <span>{t.ready}</span>}</span></div> : <button type="button" key={`empty-${i}`} className={s.emptySeat} onClick={() => void invite()} aria-label={t.invitation}><span><Plus size={21}/></span></button>;
      })}
    </div></section>
    <div className={s.lobbySelfTools}>{me && <button type="button" className={`${s.button} ${s.secondary} ${s.changeCharacter}`} disabled={busy} onClick={() => setChoosingCharacter(true)}><span>{getDrawGuessCatName(me.catId, locale)}</span><Pencil size={18}/>{t.changeCharacter}</button>}{onReact && <UnoReactionControls locale={locale} disabled={busy} onReact={onReact}/>}</div>
    <fieldset className={s.matchSettings} disabled={!host || busy}><legend>{ux.format}</legend><div className={s.modeChoices}>{(["single", "score"] as const).map(mode => <button type="button" key={mode} aria-pressed={room.state.matchMode === mode} onClick={() => onSettings({ matchMode: mode })}><strong>{mode === "single" ? ux.singleMode : ux.scoreMode}</strong><small>{mode === "single" ? ux.singleHint : ux.scoreHint}</small>{room.state.matchMode === mode && <Check size={16}/>}</button>)}</div>
      <div className={s.lobbySettings}><label htmlFor="uno-turn-time">{t.turnTime}</label><select id="uno-turn-time" value={room.state.turnSeconds} onChange={e => onSettings({ turnSeconds: Number(e.target.value) as 30 | 60 | 90 })}>{[30, 60, 90].map(seconds => <option value={seconds} key={seconds}>{seconds} s</option>)}</select></div>
    </fieldset>
    <fieldset className={s.matchSettings} disabled={!host || busy}><legend>{t.settings}</legend><div className={s.ruleToggles}>
      {(["stackDraws", "challengeDrawFour", "allowActionFinish"] as const).map(key => <button type="button" key={key} role="switch" aria-checked={room.state[key]} aria-label={t[key]} className={s.ruleToggle} onClick={() => onSettings({ [key]: !room.state[key] })}><span><strong>{t[key]}</strong>{key === "stackDraws" && <small>{t.stackDrawsHint}</small>}</span><span className={s.switchTrack} aria-hidden="true"><span/></span></button>)}
    </div></fieldset>
    <div className={s.lobbyBottom}><p>{room.seats.length < 2 ? t.needPlayers : `${readyCount} / ${room.seats.length} ${t.readyCount}`}</p><div className={s.lobbyActions}><button type="button" disabled={busy} className={`${s.button} ${me?.ready ? s.secondary : s.primary}`} onClick={() => onReady(!me?.ready)}>{me?.ready ? <Check size={18}/> : null}{me?.ready ? t.unready : t.ready}</button>{host && <button type="button" disabled={!everyoneReady || busy} className={`${s.button} ${s.primary}`} onClick={onStart}>{t.start}<ArrowRight size={18}/></button>}</div></div>
    {!choosingCharacter && (error || copyError) && <div role="alert" className={s.inlineError}>{error || copyError}{onRetry && error && <button type="button" className={`${s.button} ${s.quiet} ${s.compactButton}`} onClick={onRetry}><RotateCcw size={18}/>{t.retry}</button>}</div>}
  </main>{choosingCharacter && me && <UnoCharacterPicker catId={me.catId} locale={locale} busy={busy} error={error} onSelect={onCharacter} onClose={() => setChoosingCharacter(false)} onRetry={onRetry}/>}</div>;
}
