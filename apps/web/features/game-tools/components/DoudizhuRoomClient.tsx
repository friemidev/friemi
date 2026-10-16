"use client";
import {
  ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT,
  ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY,
} from "../activeGameToolRoomStorage";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DdzAction } from "../doudizhuTypes";
import type {
  DdzRoomCommand,
  DdzRoomView,
  DdzRoundSummary,
} from "../doudizhuRoomTypes";
import {
  DDZ_ROOM_EVENT,
  getDdzRealtimeBrowserConfig,
  getDdzRoomTopic,
} from "../doudizhuRealtime";
import { doudizhuErrorMessage, getDoudizhuCopy } from "../doudizhuCopy";
import { sendDdzRoomWrite, type DdzPendingWrite } from "../doudizhuRoomRequest";
import { DoudizhuOrientationGate } from "./DoudizhuOrientationGate";
import { DoudizhuAudioProvider } from "./DoudizhuAudioControls";
import { DoudizhuLobby } from "./DoudizhuLobby";
import { DoudizhuTable } from "./DoudizhuTable";
import { DoudizhuMotionLayer } from "./DoudizhuMotionLayer";
import { GameToolsMobileChrome } from "./GameToolsMobileChrome";
import s from "./DoudizhuGame.module.css";
export function DoudizhuRoomClient({
  initialRoom,
  locale,
  initialClerkUserId,
  initialProfileId,
}: {
  initialRoom: DdzRoomView;
  locale: string;
  initialClerkUserId: string;
  initialProfileId: string;
}) {
  const { session, isLoaded } = useSession();
  // Remove a private hand synchronously when the authenticated account changes.
  if (!isLoaded)
    return (
      <div className={s.game}>
        <p className={s.feedback}>{getDoudizhuCopy(locale).loading}</p>
      </div>
    );
  if (session?.user.id !== initialClerkUserId)
    return (
      <div className={s.game}>
        <p className={s.feedback}>{getDoudizhuCopy(locale).signInNote}</p>
        <a className={s.button} href={`/${locale}/game-tools/doudizhu`}>
          {getDoudizhuCopy(locale).returnEntry}
        </a>
      </div>
    );
  return (
    <DoudizhuRoomSession
      key={`${initialRoom.id}:${session.user.id}`}
      initialRoom={initialRoom}
      locale={locale}
      accountId={session.user.id}
      profileId={initialProfileId}
    />
  );
}
function DoudizhuRoomSession({
  initialRoom,
  locale,
  accountId,
  profileId,
}: {
  initialRoom: DdzRoomView;
  locale: string;
  accountId: string;
  profileId: string;
}) {
  const { session } = useSession(),
    sessionRef = useRef(session);
  sessionRef.current = session;
  const t = getDoudizhuCopy(locale),
    [room, setRoom] = useState(initialRoom),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [offline, setOffline] = useState(false),
    [unresolved, setUnresolved] = useState(false),
    [accessError, setAccessError] = useState(""),
    [subscribed, setSubscribed] = useState(false);
  const latest = useRef(initialRoom),
    motionRoot = useRef<HTMLDivElement>(null),
    pending = useRef<DdzPendingWrite | null>(null),
    inFlight = useRef(false),
    refreshing = useRef(false),
    mounted = useRef(true),
    controller = useRef<AbortController | null>(null);
  const endpoint = `/api/game-tools/doudizhu/rooms/${encodeURIComponent(initialRoom.id)}`,
    storageKey = `friemi:ddz:pending:${accountId}:${initialRoom.id}`;
  function savePending(write: DdzPendingWrite | null) {
    pending.current = write;
    try {
      if (write) sessionStorage.setItem(storageKey, JSON.stringify(write));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Recovery remains available in memory. */
    }
  }
  useEffect(() => {
    try {
      localStorage.setItem(
        `friemi:ddz:resume:${accountId}`,
        JSON.stringify({ id: room.id, code: room.code }),
      );
    } catch {}
  }, [accountId, room.id, room.code]);
  useEffect(() => {
    if (accessError) return;
    try {
      localStorage.setItem(
        ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY,
        JSON.stringify({
          code: room.code,
          href: `/${locale}/game-tools/doudizhu/rooms/${room.id}`,
          id: room.id,
          kind: "DOUDIZHU",
          locale,
          privateSeatHref: null,
          profileId,
          seatNumber: room.viewerSeat,
          title: t.title,
        }),
      );
      window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
    } catch {}
  }, [
    room.id,
    room.code,
    room.viewerSeat,
    profileId,
    locale,
    t.title,
    accessError,
  ]);
  const receive = useCallback(
    (next?: DdzRoomView) => {
      if (
        !mounted.current ||
        !next ||
        next.id !== latest.current.id ||
        next.viewerSeat !== initialRoom.viewerSeat ||
        next.revision < latest.current.revision ||
        (next.revision === latest.current.revision &&
          next.serverNow < latest.current.serverNow)
      )
        return;
      latest.current = next;
      setRoom(next);
    },
    [initialRoom.viewerSeat],
  );
  const refresh = useCallback(async () => {
    if (!mounted.current || refreshing.current) return;
    refreshing.current = true;
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 10_000);
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: request.signal,
      });
      if (response.status === 401 || response.status === 403) {
        if (mounted.current)
          setAccessError(
            response.status === 401 ? "SIGN_IN_REQUIRED" : "NOT_A_MEMBER",
          );
        return;
      }
      const data = await response.json();
      if (!mounted.current) return;
      if (
        ["SIGN_IN_REQUIRED", "NOT_A_MEMBER", "ROOM_NOT_FOUND"].includes(
          data.error,
        )
      ) {
        if (
          pending.current?.path === "/leave" &&
          data.error !== "SIGN_IN_REQUIRED"
        ) {
          window.location.assign(`/${locale}/game-tools/doudizhu`);
          return;
        }
        setAccessError(data.error);
        return;
      }
      if (!response.ok || !data.room) throw new Error();
      receive(data.room);
      setOffline(false);
    } catch {
      if (mounted.current) setOffline(true);
    } finally {
      clearTimeout(timer);
      refreshing.current = false;
    }
  }, [endpoint, locale, receive]);
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw);
        if (
          value &&
          typeof value.path === "string" &&
          ["POST", "PATCH"].includes(value.method) &&
          typeof value.body?.commandId === "string"
        ) {
          pending.current = value;
          setUnresolved(true);
        }
      }
    } catch {
      /* Ignore broken local cache. */
    }
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [storageKey]);
  useEffect(() => {
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(
      () => {
        if (!document.hidden) void refresh();
      },
      subscribed ? 12_000 : 3_000,
    );
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    document.addEventListener("visibilitychange", focus);
    void refresh();
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh, subscribed]);
  useEffect(() => {
    const config = getDdzRealtimeBrowserConfig();
    if (!config) return;
    let disposed = false;
    const client = createClient(config.url, config.publishableKey, {
      accessToken: async () => sessionRef.current?.getToken() ?? null,
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    let channel: ReturnType<typeof client.channel> | null = null;
    const timer = setInterval(() => {
      void sessionRef.current
        ?.getToken()
        .then((token) => {
          if (token && !disposed) return client.realtime.setAuth(token);
        })
        .catch(() => {});
    }, 30_000);
    void (async () => {
      const token = await sessionRef.current?.getToken();
      if (!token || disposed) return;
      await client.realtime.setAuth(token);
      if (disposed) return;
      channel = client
        .channel(getDdzRoomTopic(initialRoom.id), { config: { private: true } })
        .on("broadcast", { event: DDZ_ROOM_EVENT }, (message) => {
          const payload = message.payload;
          if (
            payload?.roomId === initialRoom.id &&
            Number.isSafeInteger(payload.revision) &&
            payload.revision > latest.current.revision
          )
            void refresh();
        })
        .subscribe((status) => {
          if (disposed) return;
          setSubscribed(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") void refresh();
        });
    })().catch(() => {
      if (!disposed) setSubscribed(false);
    });
    return () => {
      disposed = true;
      clearInterval(timer);
      if (channel)
        void client
          .removeChannel(channel)
          .finally(() => client.realtime.disconnect());
      else client.realtime.disconnect();
    };
  }, [initialRoom.id, accountId, refresh]);
  async function submit(write: DdzPendingWrite) {
    if (inFlight.current || !mounted.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    savePending(write);
    try {
      const result = await sendDdzRoomWrite(endpoint, write);
      if (!mounted.current || pending.current !== write) return false;
      if (result.status === "uncertain") {
        setUnresolved(true);
        return false;
      }
      savePending(null);
      setUnresolved(false);
      setOffline(false);
      if (
        write.path === "/leave" &&
        (result.status === "accepted" ||
          ["NOT_A_MEMBER", "ROOM_NOT_FOUND"].includes(result.error))
      ) {
        try {
          const active = JSON.parse(
            localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null",
          );
          if (active?.id === room.id) {
            localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
            window.dispatchEvent(
              new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT),
            );
          }
        } catch {}
        window.location.assign(`/${locale}/game-tools/doudizhu`);
        return true;
      }
      receive(result.room);
      if (result.status === "rejected") {
        setError(doudizhuErrorMessage(result.error, locale));
        if (
          ["SIGN_IN_REQUIRED", "NOT_A_MEMBER", "ROOM_NOT_FOUND"].includes(
            result.error,
          )
        )
          setAccessError(result.error);
        else await refresh();
        return false;
      }
      await refresh();
      return true;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function command(action: DdzAction | { type: "START" }) {
    if (pending.current || inFlight.current) return false;
    const state = latest.current.state;
    const body: DdzRoomCommand = {
      commandId: crypto.randomUUID(),
      gameNo: state.gameNo,
      dealNo: state.dealNo,
      turnId: state.turnId,
      expectedPhase: state.phase,
      ...(action.type === "START"
        ? { expectedRevision: latest.current.revision }
        : {}),
      ...(action.type === "PLAY" ? { handVersion: state.handVersion } : {}),
      action,
    };
    return submit({ path: "/actions", method: "POST", body });
  }
  function mutate(
    path: string,
    extra: Record<string, unknown> = {},
    method: "POST" | "PATCH" = "POST",
  ) {
    if (pending.current || inFlight.current) return false;
    return submit({
      path,
      method,
      body: {
        commandId: crypto.randomUUID(),
        expectedRevision: latest.current.revision,
        gameNo: latest.current.state.gameNo,
        expectedPhase: latest.current.state.phase,
        ...extra,
      },
    });
  }
  function retry() {
    if (pending.current) return submit(pending.current);
    return refresh();
  }
  async function history() {
    const response = await fetch(`${endpoint}/history`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.rounds)) throw new Error();
    return result.rounds as DdzRoundSummary[];
  }
  const feedback = unresolved
    ? t.uncertain
    : error || (offline ? t.reconnecting : "");
  return (
    <DoudizhuAudioProvider
      locale={locale}
      roomKey={room.id}
      state={accessError ? null : room.state}
      serverNow={room.serverNow}
      connected={!offline}
    >
      <div ref={motionRoot} className={s.game}>
        <GameToolsMobileChrome />
        {accessError ? (
          <div className={s.feedback} role="alert">
            <span>{doudizhuErrorMessage(accessError, locale)}</span>
            <a className={s.button} href={`/${locale}/game-tools/doudizhu`}>
              {t.returnEntry}
            </a>
          </div>
        ) : room.state.phase === "LOBBY" ? (
          <DoudizhuLobby
            room={room}
            locale={locale}
            busy={busy || offline || unresolved}
            error={feedback}
            onReady={(ready) => void mutate("/ready", { ready })}
            onSettings={(settings) => mutate("/settings", { settings }, "PATCH")}
            onStart={() => void command({ type: "START" })}
            onLeave={() => void mutate("/leave")}
            onCharacter={(catId) =>
              void mutate("/character", { catId }, "PATCH")
            }
            onReact={(kind) => {
              if (pending.current || inFlight.current) return;
              void submit({
                path: "/reactions",
                method: "POST",
                body: {
                  commandId: crypto.randomUUID(),
                  reactionId: crypto.randomUUID(),
                  gameNo: latest.current.state.gameNo,
                  expectedPhase: latest.current.state.phase,
                  kind,
                },
              });
            }}
            onRemove={(targetSeat) => void mutate("/remove", { targetSeat })}
            onRetry={() => void retry()}
          />
        ) : (
          <DoudizhuOrientationGate locale={locale}>
            <DoudizhuTable
              room={room}
              locale={locale}
              busy={busy || offline || unresolved}
              error={feedback}
              onAction={command}
              onLeave={() => void mutate("/leave")}
              onReturn={() => void mutate("/return")}
              onRetry={() => void retry()}
              onHistory={history}
              onReact={(kind) => {
                if (pending.current || inFlight.current) return;
                void submit({
                  path: "/reactions",
                  method: "POST",
                  body: {
                    commandId: crypto.randomUUID(),
                    reactionId: crypto.randomUUID(),
                    gameNo: latest.current.state.gameNo,
                    expectedPhase: latest.current.state.phase,
                    kind,
                  },
                });
              }}
            />
          </DoudizhuOrientationGate>
        )}
        {!accessError && (
          <DoudizhuMotionLayer
            rootRef={motionRoot}
            roomKey={room.id}
            state={room.state}
            serverNow={room.serverNow}
          />
        )}
      </div>
    </DoudizhuAudioProvider>
  );
}
