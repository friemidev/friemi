"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { isValidDrawGuessInkCursor, isValidStroke, type DrawGuessInkCursor, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { createDrawGuessInkBuffer, getDrawGuessInkDrawing, mergeDrawGuessInkBatch, mergeDrawGuessInkSnapshot } from "@/features/game-tools/drawGuessInkBuffer";
import { fetchDrawGuessResponse } from "@/features/game-tools/drawGuessRequest";
import { DRAW_GUESS_INK_EVENT, getDrawGuessInkTopic, getDrawGuessRealtimeBrowserConfig } from "@/features/game-tools/drawGuessRealtime";

type InkEvent = { gameNumber: number; inkCursor?: DrawGuessInkCursor; roomId: string; seq: number; stroke: DrawStroke; strokeIndex: number; turnIndex: number };

function isInkEvent(value: unknown): value is InkEvent {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InkEvent>;
  return typeof item.roomId === "string" && Number.isSafeInteger(item.gameNumber) && Number.isSafeInteger(item.turnIndex) &&
    Number.isSafeInteger(item.seq) && (item.seq ?? 0) > 0 && Number.isSafeInteger(item.strokeIndex) &&
    (item.strokeIndex ?? -1) >= 0 && (item.strokeIndex ?? 120) < 120 && isValidStroke(item.stroke) &&
    (item.inkCursor === undefined || isValidDrawGuessInkCursor(item.inkCursor));
}

function inkSnapshot(room: DrawGuessRoomView) {
  return { drawing: room.view.drawing ?? [], inkCursor: room.view.inkCursor, revision: room.revision, seq: room.view.inkSeq ?? 0 };
}

export function useDrawGuessInk(room: DrawGuessRoomView, onSnapshot: (room: DrawGuessRoomView) => void, enabled = true) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const [drawing, setDrawing] = useState<DrawStroke[]>(room.view.drawing ?? []);
  const [connected, setConnected] = useState(false);
  const channelReadyRef = useRef(false);
  const publisherId = useRef<string | null>(null);
  const publishSequence = useRef(0);
  const publishedCursor = useRef<{ topic: string; cursor: DrawGuessInkCursor } | null>(null);
  const bufferRef = useRef(createDrawGuessInkBuffer(inkSnapshot(room)));
  const roomRef = useRef(room);
  roomRef.current = room;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const active = enabled && room.mode === "CLASSIC" && room.view.phase === "DRAW_GUESS";
  const topicKey = active ? getDrawGuessInkTopic(room.id, room.view.gameNumber, room.view.turnIndex) : "";

  const rebuild = useCallback(() => {
    setDrawing(getDrawGuessInkDrawing(bufferRef.current));
  }, []);

  useEffect(() => {
    bufferRef.current = createDrawGuessInkBuffer(inkSnapshot(roomRef.current));
    channelReadyRef.current = false;
    setDrawing(bufferRef.current.drawing);
    setConnected(false);
  }, [topicKey]);

  useEffect(() => {
    if (!active) { setDrawing(room.view.drawing ?? []); return; }
    bufferRef.current = mergeDrawGuessInkSnapshot(bufferRef.current, inkSnapshot(room));
    rebuild();
  }, [active, rebuild, room.revision, room.view.drawing, room.view.inkCursor, room.view.inkSeq]);

  useEffect(() => {
    const config = getDrawGuessRealtimeBrowserConfig();
    if (!topicKey || !config || !sessionRef.current) return;
    let disposed = false;
    let ready = false;
    let channelSubscribed = false;
    let connectionVersion = 0;
    let snapshotVersion: number | null = null;
    let snapshotRetry: number | null = null;
    const client = createClient(config.url, config.publishableKey, {
      accessToken: async () => sessionRef.current?.getToken() ?? null,
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    let channel: ReturnType<typeof client.channel> | null = null;
    const syncSnapshot = async () => {
      if (snapshotVersion === connectionVersion || disposed || !channelSubscribed) return;
      if (snapshotRetry !== null) { window.clearTimeout(snapshotRetry); snapshotRetry = null; }
      const requestedVersion = connectionVersion;
      snapshotVersion = requestedVersion;
      try {
        const { response, data: result } = await fetchDrawGuessResponse<{ room?: DrawGuessRoomView }>(`/api/game-tools/draw-guess/rooms/${roomRef.current.id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("SNAPSHOT_UNAVAILABLE");
        const current = roomRef.current;
        if (!result?.room || disposed || !channelSubscribed || requestedVersion !== connectionVersion || result.room.view.phase !== "DRAW_GUESS" ||
            current.mode !== "CLASSIC" || current.view.phase !== "DRAW_GUESS" ||
            getDrawGuessInkTopic(current.id, current.view.gameNumber, current.view.turnIndex) !== topicKey ||
            getDrawGuessInkTopic(result.room.id, result.room.view.gameNumber, result.room.view.turnIndex) !== topicKey) return;
        // Room polling or a clear/undo response can already be newer than this
        // request. Check before updating the private ink base, not only in the
        // room callback, which cannot undo a stale local buffer mutation.
        bufferRef.current = mergeDrawGuessInkSnapshot(bufferRef.current, inkSnapshot(current));
        const next = mergeDrawGuessInkSnapshot(bufferRef.current, inkSnapshot(result.room));
        if (next !== bufferRef.current) {
          bufferRef.current = next;
          onSnapshotRef.current(result.room);
        }
        ready = true;
        channelReadyRef.current = true;
        rebuild();
        setConnected(true);
      } catch {
        if (!disposed && channelSubscribed && requestedVersion === connectionVersion) {
          ready = false;
          channelReadyRef.current = false;
          setConnected(false);
          snapshotRetry = window.setTimeout(() => { snapshotRetry = null; void syncSnapshot(); }, 2_000);
        }
      } finally {
        if (snapshotVersion === requestedVersion) snapshotVersion = null;
      }
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
          if (disposed || !isInkEvent(event) || event.roomId !== current.id || event.gameNumber !== current.view.gameNumber ||
              event.turnIndex !== current.view.turnIndex || current.view.phase !== "DRAW_GUESS") return;
          bufferRef.current = mergeDrawGuessInkBatch(bufferRef.current, event);
          if (ready) rebuild();
        })
        .subscribe((status) => {
          if (disposed) return;
          // Rejoins start a fresh request immediately, even if the previous
          // connection's snapshot is still pending.
          connectionVersion += 1;
          channelSubscribed = status === "SUBSCRIBED";
          ready = false;
          channelReadyRef.current = false;
          setConnected(false);
          if (!channelSubscribed) {
            if (snapshotRetry !== null) window.clearTimeout(snapshotRetry);
            snapshotRetry = null;
            return;
          }
          void syncSnapshot();
        });
    })().catch(() => { if (!disposed) setConnected(false); });
    return () => { disposed = true; channelReadyRef.current = false; if (snapshotRetry !== null) window.clearTimeout(snapshotRetry); window.clearInterval(authTimer); setConnected(false); if (channel) void client.removeChannel(channel).finally(() => client.realtime.disconnect()); else client.realtime.disconnect(); };
  }, [rebuild, session?.id, topicKey]);

  const publishStroke = useCallback(async (stroke: DrawStroke, strokeIndex: number) => {
    const current = roomRef.current;
    if (!enabledRef.current || current.mode !== "CLASSIC" || current.view.phase !== "DRAW_GUESS" || current.viewerSeat !== current.view.turnIndex) return null;
    const isCurrentTurn = () => {
      const latest = roomRef.current;
      return enabledRef.current && latest.id === current.id && latest.mode === "CLASSIC" && latest.view.phase === "DRAW_GUESS" &&
        latest.view.gameNumber === current.view.gameNumber && latest.view.turnIndex === current.view.turnIndex &&
        latest.viewerSeat === latest.view.turnIndex;
    };
    try {
      publisherId.current ??= crypto.randomUUID();
      const inkCursor = { clientId: publisherId.current, seq: ++publishSequence.current };
      // Record dispatch, not acknowledgement: a timed-out POST may still be
      // broadcast by the server after a clear/undo snapshot has been saved.
      publishedCursor.current = { topic: getDrawGuessInkTopic(current.id, current.view.gameNumber, current.view.turnIndex), cursor: inkCursor };
      const { response, data: result } = await fetchDrawGuessResponse<{ seq?: number }>(`/api/game-tools/draw-guess/rooms/${current.id}/ink`, {
        body: JSON.stringify({ gameNumber: current.view.gameNumber, inkCursor, stroke, strokeIndex, turnIndex: current.view.turnIndex }),
        headers: { "content-type": "application/json" }, method: "POST",
      });
      if (!isCurrentTurn()) return null;
      if (!response.ok) { setConnected(false); return null; }
      if (Number.isSafeInteger(result?.seq) && (result?.seq ?? 0) > 0) {
        if (channelReadyRef.current) setConnected(true);
        return result!.seq!;
      }
      setConnected(false);
      return null;
    } catch { if (isCurrentTurn()) setConnected(false); return null; }
  }, []);

  const getPublishedInkCursor = useCallback(() => {
    const current = roomRef.current;
    if (current.mode !== "CLASSIC" || current.view.phase !== "DRAW_GUESS") return undefined;
    const published = publishedCursor.current;
    return published?.topic === getDrawGuessInkTopic(current.id, current.view.gameNumber, current.view.turnIndex)
      ? published.cursor : undefined;
  }, []);

  return { connected, drawing, getPublishedInkCursor, publishStroke };
}
