"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UnoRoomCommand, UnoRoomView } from "../unoRoomTypes";
import type { UnoAction } from "../unoTypes";
import type { UnoReactionKind } from "../unoReactions";
import { getUnoExperienceCopy } from "../unoExperienceCopy";
import { getUnoCopy, unoErrorMessage } from "../unoCopy";
import { getUnoRealtimeBrowserConfig, getUnoRoomTopic, UNO_ROOM_EVENT } from "../unoRealtime";
import { canRetryUnoRoomWrite, isUnoRoomAccessError, sendUnoRoomWrite, type UnoPendingWrite } from "../unoRoomRequest";
import { readUnoClock, sampleUnoClock, syncUnoClock } from "../unoClock";
import { UnoClockProvider } from "../hooks/useUnoClock";
import { UnoLobby } from "./UnoLobby";
import { UnoTable } from "./UnoTable";
import s from "./UnoGame.module.css";

export function UnoRoomClient(props: { initialRoom: UnoRoomView; locale: string }) {
  const clock = useRef(sampleUnoClock(props.initialRoom.serverNow));
  const clockNow = useCallback(() => readUnoClock(clock.current), []);
  const sampleClock = useCallback((serverNow: number | undefined) => {
    clock.current = syncUnoClock(clock.current, serverNow);
  }, []);
  return <UnoClockProvider value={clockNow}><UnoRoomSession {...props} sampleClock={sampleClock}/></UnoClockProvider>;
}

function UnoRoomSession({ initialRoom, locale, sampleClock }: { initialRoom: UnoRoomView; locale: string; sampleClock: (serverNow: number | undefined) => void }) {
  const [room, setRoom] = useState(initialRoom), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [offline, setOffline] = useState(false), [unresolved, setUnresolved] = useState(false);
  const [reactionError, setReactionError] = useState("");
  const [accessFailure, setAccessFailure] = useState("");
  const reactionInFlight = useRef(false);
  const latest = useRef(initialRoom), inFlight = useRef(false), refreshing = useRef(false), pending = useRef<UnoPendingWrite | null>(null);
  const pendingReaction = useRef<UnoPendingWrite | null>(null);
  const mounted = useRef(true), controller = useRef<AbortController | null>(null);
  const endpoint = `/api/game-tools/uno/rooms/${encodeURIComponent(initialRoom.id)}`;
  const t = getUnoCopy(locale);
  const receive = useCallback((next?: UnoRoomView) => {
    if (!mounted.current || !next || next.id !== latest.current.id || next.revision < latest.current.revision) return;
    if (next.revision === latest.current.revision && typeof next.serverNow === "number" && typeof latest.current.serverNow === "number" && next.serverNow < latest.current.serverNow) return;
    sampleClock(next.serverNow);
    latest.current = next; setRoom(next);
  }, [sampleClock]);
  const refresh = useCallback(async () => {
    if (refreshing.current || !mounted.current) return;
    refreshing.current = true;
    const activeController = new AbortController();
    controller.current = activeController;
    // A GET begun before a write finished cannot resolve its unknown outcome.
    const recovering = !inFlight.current ? pending.current : null;
    const timeout = setTimeout(() => activeController.abort(), 10_000);
    try {
      const response = await fetch(endpoint, { cache: "no-store", signal: activeController.signal });
      const data = await response.json();
      if (isUnoRoomAccessError(data.error)) {
        if (mounted.current) {
          // A lost leave response can be confirmed by the following snapshot.
          if (pending.current?.path === "/leave" && ["NOT_A_MEMBER", "ROOM_NOT_FOUND"].includes(data.error)) { window.location.assign(`/${locale}/game-tools/uno`); return; }
          pending.current = null; pendingReaction.current = null; setUnresolved(false); setReactionError("");
          setAccessFailure(data.error); setOffline(false); setError("");
        }
        return;
      }
      if (!response.ok || !data.room) throw new Error(data.error ?? "UNKNOWN");
      receive(data.room); if (mounted.current) {
        setAccessFailure(""); setOffline(false);
        if (recovering && pending.current === recovering && !canRetryUnoRoomWrite(recovering)) {
          // This restores the latest room, not proof of whether the write ran.
          // No old mutation is resent; a new click creates a fresh intent.
          pending.current = null; setUnresolved(false); setError("");
        }
      }
    } catch { if (mounted.current) setOffline(true); }
    finally { clearTimeout(timeout); refreshing.current = false; }
  }, [endpoint, locale, receive]);

  useEffect(() => {
    mounted.current = true;
    const focus = () => { if (!document.hidden) void refresh(); };
    const poll = setInterval(() => { if (!document.hidden) void refresh(); }, 2500 + Math.floor(Math.random() * 500));
    window.addEventListener("focus", focus); window.addEventListener("online", focus); document.addEventListener("visibilitychange", focus);
    void refresh();
    return () => { mounted.current = false; clearInterval(poll); controller.current?.abort(); window.removeEventListener("focus", focus); window.removeEventListener("online", focus); document.removeEventListener("visibilitychange", focus); };
  }, [refresh]);
  useEffect(() => {
    const config = getUnoRealtimeBrowserConfig();
    if (!config) return;
    const client = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
    const channel = client.channel(getUnoRoomTopic(initialRoom.id)).on("broadcast", { event: UNO_ROOM_EVENT }, () => { void refresh(); }).subscribe(status => { if (status === "SUBSCRIBED") void refresh(); });
    return () => { void client.removeChannel(channel); };
  }, [initialRoom.id, refresh]);

  async function submit(write: UnoPendingWrite) {
    if (inFlight.current || !mounted.current) return false;
    inFlight.current = true; setBusy(true); setError(""); pending.current = write;
    try {
      const outcome = await sendUnoRoomWrite(endpoint, write);
      // Access loss may retire this request while it was still in flight.
      if (!mounted.current || pending.current !== write) return false;
      if (outcome.status === "uncertain") { setUnresolved(true); setError(t.unconfirmed); return false; }
      pending.current = null; setUnresolved(false); setOffline(false);
      if (write.path === "/leave" && (outcome.status === "accepted" || ["NOT_A_MEMBER", "ROOM_NOT_FOUND"].includes(outcome.error))) { window.location.assign(`/${locale}/game-tools/uno`); return true; }
      receive(outcome.room);
      if (outcome.status === "rejected") {
        setError(unoErrorMessage(outcome.error, locale));
        if (isUnoRoomAccessError(outcome.error)) setAccessFailure(outcome.error);
        else await refresh();
        return false;
      }
      await refresh();
      return true;
    } catch { if (mounted.current) { setUnresolved(true); setError(t.unconfirmed); } return false; }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function command(action: UnoAction | { type: "START" }) {
    if (pending.current || inFlight.current) return;
    const state = latest.current.state;
    const payload: UnoRoomCommand = { commandId: crypto.randomUUID(), matchNumber: state.matchNumber, roundNumber: state.roundNumber, turnId: state.turnId, action };
    return submit({ path: "/actions", method: "POST", body: payload });
  }
  async function mutate(path: string, body: object = {}, method: "POST" | "PATCH" = "POST") {
    if (inFlight.current || pending.current) return false;
    return submit({ path, body: { ...body, expectedRevision: latest.current.revision }, method });
  }
  async function submitReaction(write: UnoPendingWrite) {
    if (reactionInFlight.current || !mounted.current) return false;
    reactionInFlight.current = true; setReactionError("");
    try {
      const outcome = await sendUnoRoomWrite(endpoint, write);
      if (!mounted.current || pendingReaction.current !== write) return false;
      if (outcome.status === "uncertain") { setReactionError(t.unconfirmed); return false; }
      pendingReaction.current = null;
      if (outcome.status === "rejected") {
        setReactionError(outcome.error === "REACTION_COOLDOWN" ? getUnoExperienceCopy(locale).reactionWait : unoErrorMessage(outcome.error, locale));
        if (isUnoRoomAccessError(outcome.error)) setAccessFailure(outcome.error);
        return false;
      }
      receive(outcome.room);
      return true;
    } catch {
      if (mounted.current) setReactionError(t.unconfirmed);
      return false;
    } finally { reactionInFlight.current = false; }
  }
  async function react(kind: UnoReactionKind) {
    if (reactionInFlight.current || offline || pendingReaction.current) return false;
    const write: UnoPendingWrite = { path: "/reactions", method: "POST", body: { reactionId: crypto.randomUUID(), kind } };
    pendingReaction.current = write;
    return submitReaction(write);
  }
  async function retry() {
    setReactionError("");
    if (pending.current) {
      if (canRetryUnoRoomWrite(pending.current)) await submit(pending.current);
      else await refresh();
      return;
    }
    if (pendingReaction.current) { await submitReaction(pendingReaction.current); return; }
    setError("");
    if (accessFailure !== "NOT_A_MEMBER") { await refresh(); return; }
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      // Explicit retry restores a pruned lobby membership; automatic polling
      // must never silently undo an intentional leave from another tab.
      const response = await fetch("/api/game-tools/uno/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: initialRoom.code, expectedRoomId: initialRoom.id }), signal: AbortSignal.timeout(12_000) });
      const data = await response.json();
      if (!response.ok || data.roomId !== initialRoom.id) throw new Error(data.error ?? "ROOM_NOT_FOUND");
      await refresh();
    } catch (cause) { if (mounted.current) setError(unoErrorMessage(cause instanceof Error ? cause.message : "UNKNOWN", locale)); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  if (accessFailure) return <main className={s.game}><div className={s.feedback} role="alert"><span>{error || unoErrorMessage(accessFailure, locale)}</span><button type="button" disabled={busy} onClick={() => void retry()}>{t.retry}</button><a className={`${s.button} ${s.secondary}`} href={`/${locale}/game-tools/uno`}>{t.leave}</a></div></main>;
  if (room.state.phase === "LOBBY") return <UnoLobby room={room} locale={locale} busy={busy || offline || unresolved} error={error || reactionError || (offline ? t.reconnecting : "")} onReady={ready => void mutate("/ready", { ready })} onStart={() => void command({ type: "START" })} onLeave={() => void mutate("/leave")} onSettings={settings => void mutate("", settings, "PATCH")} onCharacter={catId => mutate("/character", { catId }, "PATCH")} onReact={react} onRetry={retry}/>;
  return <UnoTable locale={locale} state={room.state} seats={room.seats} reactions={room.reactions} code={room.code} hostSeat={room.hostSeat} busy={busy || unresolved} error={error || reactionError} reconnecting={offline} onAction={command} onReact={react} onLeave={() => void mutate("/leave")} onReturn={() => void mutate("/return")} returning={room.returnedToLobby} onRetry={retry}/>;
}
