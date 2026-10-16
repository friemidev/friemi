"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { createDdzAudioSession, DDZ_AUDIO_DEFAULTS, DDZ_AUDIO_OWNER, DDZ_AUDIO_STORAGE, freshDdzCue, normalizeDdzAudioPreferences, type DdzAudioPreferences } from "../doudizhuAudio";
import type { DdzViewerState } from "../doudizhuTypes";
import s from "./DoudizhuAudioControls.module.css";

type AudioProps = { roomKey: string; state?: DdzViewerState | null; serverNow?: number };
const AudioContext = createContext<{ preferences: DdzAudioPreferences; update: (next: DdzAudioPreferences) => void } | null>(null);

export function DoudizhuAudioProvider({ roomKey, state, serverNow, children }: AudioProps & { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DDZ_AUDIO_DEFAULTS);
  const session = useRef<ReturnType<typeof createDdzAudioSession> | null>(null);
  const seen = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const audio = createDdzAudioSession();
    session.current = audio;
    seen.current = stateRef.current?.eventSeq ?? null;
    const ownerId = crypto.randomUUID();
    const readPreferences = () => {
      let stored: unknown = null;
      try { stored = JSON.parse(localStorage.getItem(DDZ_AUDIO_STORAGE) ?? "null"); } catch { /* Session defaults. */ }
      const next = normalizeDdzAudioPreferences(stored);
      setPreferences(next); audio.setPreferences(next);
    };
    readPreferences();
    audio.setPhase(stateRef.current?.phase === "PLAYING" || stateRef.current?.phase === "BIDDING" ? "game" : "lobby");
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(DDZ_AUDIO_OWNER); } catch { /* Storage events provide the fallback. */ }
    if (channel) channel.onmessage = event => { if (event.data !== ownerId) audio.setOwner(false); };
    const claim = () => {
      if (stateRef.current === null) { audio.setOwner(false); return; }
      try { localStorage.setItem(DDZ_AUDIO_OWNER, ownerId); } catch { /* Current tab can still play. */ }
      channel?.postMessage(ownerId);
      audio.setOwner(true); audio.unlock();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === DDZ_AUDIO_OWNER && event.newValue !== ownerId) audio.setOwner(false);
      if (event.key === DDZ_AUDIO_STORAGE) readPreferences();
    };
    const visibility = () => audio.visibility();
    const selection = () => { void audio.play("select"); };
    document.addEventListener("pointerdown", claim, { passive: true });
    document.addEventListener("keydown", claim);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    window.addEventListener("friemi:doudizhu:select", selection);
    return () => {
      document.removeEventListener("pointerdown", claim);
      document.removeEventListener("keydown", claim);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
      window.removeEventListener("friemi:doudizhu:select", selection);
      channel?.close(); audio.dispose(); session.current = null;
    };
  }, [roomKey]);

  useEffect(() => {
    if (state === null) { seen.current = null; session.current?.setOwner(false); return; }
    if (!state) return;
    session.current?.setPhase(state.phase === "BIDDING" || state.phase === "PLAYING" ? "game" : "lobby");
    const after = seen.current;
    seen.current = Math.max(after ?? 0, state.eventSeq);
    if (after === null) return;
    const fresh = freshDdzCue(state.events, after, serverNow ?? Date.now());
    if (fresh) void session.current?.play(fresh.cue);
  }, [state, serverNow]);

  const update = (next: DdzAudioPreferences) => {
    setPreferences(next); session.current?.setPreferences(next);
    try { localStorage.setItem(DDZ_AUDIO_STORAGE, JSON.stringify(next)); } catch { /* Keep this session's preference. */ }
  };
  return <AudioContext.Provider value={{ preferences, update }}>{children}</AudioContext.Provider>;
}

export function DoudizhuAudioControls(props: AudioProps & { locale: string; viewerSeat?: number }) {
  const context = useContext(AudioContext);
  if (!context) return <DoudizhuAudioProvider {...props}><DoudizhuAudioPanel locale={props.locale}/></DoudizhuAudioProvider>;
  return <DoudizhuAudioPanel locale={props.locale}/>;
}

function DoudizhuAudioPanel({ locale }: { locale: string }) {
  const { preferences, update } = useContext(AudioContext)!;
  const t = locale === "zh-CN" ? { title: "声音", sound: "音效", music: "背景音乐", sv: "音效音量", mv: "音乐音量" } : locale === "fr" ? { title: "Son", sound: "Effets sonores", music: "Musique", sv: "Volume des effets", mv: "Volume de la musique" } : { title: "Sound", sound: "Sound effects", music: "Background music", sv: "Effects volume", mv: "Music volume" };
  return <details className={s.root}>
    <summary aria-label={t.title}><Volume2 size={19} aria-hidden="true"/><span>{t.title}</span></summary>
    <div className={s.panel}>
      <label className={s.toggle}><span>{t.sound}</span><input type="checkbox" checked={preferences.sound} onChange={event => update({ ...preferences, sound: event.target.checked })}/></label>
      <label className={s.range}><span>{t.sv} · {preferences.soundVolume}%</span><input type="range" min="0" max="100" value={preferences.soundVolume} onChange={event => update({ ...preferences, soundVolume: Number(event.target.value) })}/></label>
      <label className={s.toggle}><span>{t.music}</span><input type="checkbox" checked={preferences.music} onChange={event => update({ ...preferences, music: event.target.checked })}/></label>
      <label className={s.range}><span>{t.mv} · {preferences.musicVolume}%</span><input type="range" min="0" max="100" value={preferences.musicVolume} onChange={event => update({ ...preferences, musicVolume: Number(event.target.value) })}/></label>
    </div>
  </details>;
}
