"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { isValidStroke, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { DRAW_GUESS_INK_EVENT, getDrawGuessInkTopic, getDrawGuessRealtimeBrowserConfig } from "@/features/game-tools/drawGuessRealtime";

type InkEvent = { gameNumber: number; roomId: string; seq: number; stroke: DrawStroke; strokeIndex: number; turnIndex: number };

function isInkEvent(value: unknown): value is InkEvent {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InkEvent>;
  return typeof item.roomId === "string" && Number.isSafeInteger(item.gameNumber) && Number.isSafeInteger(item.turnIndex) &&
    Number.isSafeInteger(item.seq) && (item.seq ?? 0) > 0 && Number.isSafeInteger(item.strokeIndex) &&
    (item.strokeIndex ?? -1) >= 0 && (item.strokeIndex ?? 120) < 120 && isValidStroke(item.stroke);
}

export function useDrawGuessInk(room: DrawGuessRoomView, onSnapshot: (room: DrawGuessRoomView) => void) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const [drawing, setDrawing] = useState<DrawStroke[]>(room.view.drawing ?? []);
  const [connected, setConnected] = useState(false);
  const channelReadyRef = useRef(false);
  const eventsRef = useRef<InkEvent[]>([]);
  const baseRef = useRef<DrawStroke[]>(room.view.drawing ?? []);
  const baseSeqRef = useRef(room.view.inkSeq ?? 0);
  const roomRef = useRef(room);
  roomRef.current = room;
  const active = room.mode === "CLASSIC" && room.view.phase === "DRAW_GUESS";
  const topicKey = active ? getDrawGuessInkTopic(room.id, room.view.gameNumber, room.view.turnIndex) : "";

  const rebuild = useCallback(() => {
    const next = [...baseRef.current];
    for (const event of eventsRef.current) {
      if (event.seq <= baseSeqRef.current) continue;
      if (event.strokeIndex > next.length) continue;
      next[event.strokeIndex] = event.stroke;
    }
    setDrawing(next);
  }, []);

  useEffect(() => {
    eventsRef.current = [];
    baseRef.current = roomRef.current.view.drawing ?? [];
    baseSeqRef.current = roomRef.current.view.inkSeq ?? 0;
    channelReadyRef.current = false;
    setDrawing(baseRef.current);
    setConnected(false);
  }, [topicKey]);

  useEffect(() => {
    if (!active) { setDrawing(room.view.drawing ?? []); return; }
    baseRef.current = room.view.drawing ?? [];
    baseSeqRef.current = room.view.inkSeq ?? 0;
    eventsRef.current = eventsRef.current.filter((event) => event.seq > baseSeqRef.current);
    rebuild();
  }, [active, rebuild, room.revision, room.view.drawing, room.view.inkSeq]);

  useEffect(() => {
    const config = getDrawGuessRealtimeBrowserConfig();
    if (!topicKey || !config || !sessionRef.current) return;
    let disposed = false;
    let ready = false;
    let channelSubscribed = false;
    let snapshotRunning = false;
    let snapshotRetry: number | null = null;
    const client = createClient(config.url, config.publishableKey, {
      accessToken: async () => sessionRef.current?.getToken() ?? null,
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    let channel: ReturnType<typeof client.channel> | null = null;
    const syncSnapshot = async () => {
      if (snapshotRunning || disposed || !channelSubscribed) return;
      if (snapshotRetry !== null) { window.clearTimeout(snapshotRetry); snapshotRetry = null; }
      snapshotRunning = true;
      try {
        const response = await fetch(`/api/game-tools/draw-guess/rooms/${roomRef.current.id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("SNAPSHOT_UNAVAILABLE");
        const result = await response.json() as { room?: DrawGuessRoomView };
        if (!result.room || disposed || !channelSubscribed || result.room.view.phase !== "DRAW_GUESS" ||
            getDrawGuessInkTopic(result.room.id, result.room.view.gameNumber, result.room.view.turnIndex) !== topicKey) return;
        baseRef.current = result.room.view.drawing ?? [];
        baseSeqRef.current = result.room.view.inkSeq ?? 0;
        eventsRef.current = eventsRef.current.filter((event) => event.seq > baseSeqRef.current);
        onSnapshotRef.current(result.room);
        ready = true;
        channelReadyRef.current = true;
        rebuild();
        setConnected(true);
      } catch {
        if (!disposed && channelSubscribed) {
          ready = false;
          channelReadyRef.current = false;
          setConnected(false);
          snapshotRetry = window.setTimeout(() => { snapshotRetry = null; void syncSnapshot(); }, 2_000);
        }
      } finally { snapshotRunning = false; }
    };
    const authTimer = window.setInterval(() => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      void currentSession.getToken().then((token) => {
        if (token && !disposed) return client.realtime.setAuth(token);
      }).catch(() => { /* The subscribed channel remains usable until Realtime reports a disconnect. */ });
    }, 30_000);
    void (async () => {
      const token = await sessionRef.current?.getToken();
      if (!token || disposed) return;
      await client.realtime.setAuth(token);
      if (disposed) return;
      channel = client.channel(topicKey, { config: { private: true } })
        .on("broadcast", { event: DRAW_GUESS_INK_EVENT }, (message) => {
          const event = message.payload;
          const current = roomRef.current;
          if (!isInkEvent(event) || event.roomId !== current.id || event.gameNumber !== current.view.gameNumber ||
              event.turnIndex !== current.view.turnIndex || current.view.phase !== "DRAW_GUESS") return;
          if (eventsRef.current.some((item) => item.seq === event.seq)) return;
          eventsRef.current.push(event);
          eventsRef.current.sort((a, b) => a.seq - b.seq);
          if (eventsRef.current.length > 128) eventsRef.current = eventsRef.current.slice(-128);
          if (ready) rebuild();
        })
        .subscribe((status) => {
          if (disposed) return;
          channelSubscribed = status === "SUBSCRIBED";
          if (!channelSubscribed) {
            if (snapshotRetry !== null) window.clearTimeout(snapshotRetry);
            snapshotRetry = null;
            ready = false;
            channelReadyRef.current = false;
            setConnected(false);
            return;
          }
          void syncSnapshot();
        });
    })().catch(() => { if (!disposed) setConnected(false); });
    return () => { disposed = true; channelReadyRef.current = false; if (snapshotRetry !== null) window.clearTimeout(snapshotRetry); window.clearInterval(authTimer); setConnected(false); if (channel) void client.removeChannel(channel).finally(() => client.realtime.disconnect()); else client.realtime.disconnect(); };
  }, [rebuild, session?.id, topicKey]);

  const publishStroke = useCallback(async (stroke: DrawStroke, strokeIndex: number) => {
    const current = roomRef.current;
    if (current.mode !== "CLASSIC" || current.view.phase !== "DRAW_GUESS" || current.viewerSeat !== current.view.turnIndex) return null;
    try {
      const response = await fetch(`/api/game-tools/draw-guess/rooms/${current.id}/ink`, {
        body: JSON.stringify({ gameNumber: current.view.gameNumber, stroke, strokeIndex, turnIndex: current.view.turnIndex }),
        headers: { "content-type": "application/json" }, method: "POST",
      });
      if (!response.ok) { setConnected(false); return null; }
      const result = await response.json() as { seq?: number };
      if (Number.isSafeInteger(result.seq) && (result.seq ?? 0) > 0) {
        if (channelReadyRef.current) setConnected(true);
        return result.seq!;
      }
      setConnected(false);
      return null;
    } catch { setConnected(false); return null; }
  }, []);

  return { connected, drawing, publishStroke };
}
