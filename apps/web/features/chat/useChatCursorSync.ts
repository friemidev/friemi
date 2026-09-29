"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CHAT_REALTIME_FALLBACK_POLL_MS,
  CHAT_REALTIME_INTEGRITY_POLL_MS,
  type ChatRealtimeScope,
} from "./chatRealtime";
import {
  chatCursorWakeEvent,
  getLatestChatCursor,
  mergeChatCursorMessages,
  type ChatCursorMessage,
  type ChatCursorResponse,
} from "./chatCursorSync";
import { useChatRealtime } from "./useChatRealtime";

type UseChatCursorSyncInput<TMessage extends ChatCursorMessage> = {
  endpoint: string;
  messages: TMessage[];
  scope: ChatRealtimeScope;
  setMessages: (updater: (current: TMessage[]) => TMessage[]) => void;
  subjectKey: string;
};

const initialCursorOverlapMs = 10_000;

export function useChatCursorSync<TMessage extends ChatCursorMessage>({
  endpoint,
  messages,
  scope,
  setMessages,
  subjectKey,
}: UseChatCursorSyncInput<TMessage>) {
  const messagesRef = useRef(messages);
  const serverTimeRef = useRef(
    new Date(Date.now() - initialCursorOverlapMs).toISOString(),
  );
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const synchronize = useCallback(async () => {
    if (
      stoppedRef.current ||
      inFlightRef.current ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    inFlightRef.current = true;

    try {
      const cursor = getLatestChatCursor(messagesRef.current);
      const query = new URLSearchParams({ since: serverTimeRef.current });

      if (cursor) {
        query.set("afterCreatedAt", cursor.createdAt);
        query.set("afterId", cursor.id);
      }

      const response = await fetch(`${endpoint}?${query.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ChatCursorResponse<TMessage>;
      const hasChanges =
        payload.messages.length > 0 ||
        Boolean(payload.deletedMessageIds?.length);

      if (hasChanges) {
        setMessages((current) => {
          const merged = mergeChatCursorMessages(
            current,
            payload.messages,
            payload.deletedMessageIds,
          );
          messagesRef.current = merged;
          return merged;
        });

        window.dispatchEvent(new Event("friemi:notifications-refresh"));
      }

      serverTimeRef.current = payload.serverTime;
    } catch (error) {
      console.warn("Incremental chat synchronization failed", error);
    } finally {
      inFlightRef.current = false;
    }
  }, [endpoint, setMessages]);

  const isRealtimeConnected = useChatRealtime({
    onChanged: synchronize,
    scope,
    subjectKey,
  });

  useEffect(() => {
    stoppedRef.current = false;

    function handleWake(event: Event) {
      const detail = (event as CustomEvent<{ subjectKey?: string }>).detail;

      if (!detail?.subjectKey || detail.subjectKey === subjectKey) {
        void synchronize();
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void synchronize();
      }
    };
    const pollIntervalMs = isRealtimeConnected
      ? CHAT_REALTIME_INTEGRITY_POLL_MS
      : CHAT_REALTIME_FALLBACK_POLL_MS;
    const pollTimer = window.setInterval(() => {
      void synchronize();
    }, pollIntervalMs);

    window.addEventListener(chatCursorWakeEvent, handleWake);
    window.addEventListener("focus", synchronize);
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void synchronize();

    return () => {
      stoppedRef.current = true;
      inFlightRef.current = false;
      window.removeEventListener(chatCursorWakeEvent, handleWake);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(pollTimer);
    };
  }, [isRealtimeConnected, subjectKey, synchronize]);

  // Preserve the existing optimistic-update contract while Realtime replaces
  // the former rollout-gated polling implementation.
  return "canary" as const;
}
