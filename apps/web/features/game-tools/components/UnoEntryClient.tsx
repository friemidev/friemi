"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRight, Play, UsersRound } from "lucide-react";
import { getUnoCopy, unoErrorMessage } from "../unoCopy";
import { UnoCardFace } from "./UnoCard";
import { UnoHeader } from "./UnoChrome";
import s from "./UnoGame.module.css";

export function UnoEntryClient({ locale, preview = false, initialCode = "", onPreviewRoom }: { locale: string; preview?: boolean; initialCode?: string; onPreviewRoom?: (code?: string) => void }) {
  const t = getUnoCopy(locale), [code, setCode] = useState(initialCode), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function openRoom(join: boolean) {
    if (busy || join && !code.trim()) return;
    if (preview && onPreviewRoom) { onPreviewRoom(join ? code.trim().toUpperCase() : undefined); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/game-tools/uno/${join ? "join" : "rooms"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(join ? { code: code.trim().toUpperCase() } : { locale }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || !result.roomId) throw new Error(result.error ?? "UNKNOWN");
      window.location.assign(`/${locale}/game-tools/uno/rooms/${encodeURIComponent(result.roomId)}`);
    } catch (cause) { setError(unoErrorMessage(cause instanceof Error ? cause.message : "UNKNOWN", locale)); setBusy(false); }
  }
  return <div className={`${s.game} ${s.entryPage}`}><UnoHeader locale={locale}/><main className={s.entryMain}>
    <div className={s.entryArt} aria-hidden="true"><span className={s.artOrbit}/><span className={s.artStar}>✦</span><span className={s.artSquiggle}>〰</span>{(["blue", "yellow", "red"] as const).map((color, i) => <div key={color} className={s.heroCard} style={{ "--hero-i": i } as CSSProperties}><UnoCardFace card={{ id: color, color, value: ["2", "7", "5"][i] as "2" | "7" | "5" }}/></div>)}</div>
    <div className={s.entryCopy}><span className={s.earlyAccess}>{t.earlyAccess}</span><h1>UNO<span aria-hidden="true">!</span></h1><div className={s.entryTags}><span><UsersRound size={16}/>{t.players}</span><span>{t.ruleTag}</span></div></div>
    <div className={s.entryActions}><button type="button" disabled={busy} className={`${s.button} ${s.primary} ${s.createButton}`} onClick={() => void openRoom(false)}>{busy ? t.busy : t.create}<ArrowRight size={22}/></button>
      <form className={s.joinForm} onSubmit={event => { event.preventDefault(); void openRoom(true); }}><label htmlFor="uno-room-code">{t.joinLabel}</label><div><input id="uno-room-code" placeholder={t.code} value={code} onChange={e => setCode(e.target.value)} maxLength={8} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} required/><button type="submit" className={`${s.button} ${s.secondary}`} disabled={busy || !code.trim()}>{t.enter}<ArrowRight size={16}/></button></div></form>
      {error && <p role="alert" className={s.inlineError}>{error}</p>}
      {preview && <a className={`${s.button} ${s.quiet} ${s.practiceLink}`} href={`/${locale}/game-tools/uno/preview`}><Play size={18}/>{t.preview}<ArrowRight size={18}/></a>}
    </div>
  </main></div>;
}
