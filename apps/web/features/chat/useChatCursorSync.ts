"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getPerformanceRolloutMode } from "@/lib/performanceRollouts";
import {
  chatCursorWakeEvent,
  getLatestChatCursor,
  mergeChatCursorMessages,
  type ChatCursorMessage,
  type ChatCursorResponse,
} from "./chatCursorSync";

type UseChatCursorSyncInput<TMessage extends ChatCursorMessage> = {
  endpoint: string;
  messages: TMessage[];
  setMessages: (updater: (current: TMessage[]) => TMessage[]) => void;
  subjectKey: string;
};

const cursorPollIntervalMs = 1500;
const fullReconciliationIntervalMs = 60_000;

function isChatComposerBusy() {
  const activeComposer = document.activeElement?.closest(
    "[data-message-composer], [data-activity-room-composer], [data-planet-chat-composer]",
  );
  const draft = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "[data-message-composer] textarea, [data-activity-room-composer] textarea, [data-planet-chat-composer] input[name='content']",
  );

  return Boolean(activeComposer || draft?.value.trim());
}

export function useChatCursorSync<TMessage extends ChatCursorMessage>({
  endpoint,
  messages,
  setMessages,
  subjectKey,
}: UseChatCursorSyncInput<TMessage>) {
  const router = useRouter();
  const messagesRef = useRef(messages);
  const serverTimeRef = useRef(
    getLatestChatCursor(messages)?.createdAt ?? new Date().toISOString(),
  );
  const inFlightRef = useRef(false);
  const mode = getPerformanceRolloutMode("chatCursor", subjectKey);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (mode === "legacy") {
      return;
    }

    let stopped = false;
    let pollTimer: number | undefined;

    async function synchronize() {
      if (
        stopped ||
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

        if (mode === "canary") {
          setMessages((current) => {
            const merged = mergeChatCursorMessages(
              current,
              payload.messages,
              payload.deletedMessageIds,
            );
            messagesRef.current = merged;
            return merged;
          });
        }

        if (mode === "shadow" && payload.messages.length > 0) {
          console.info(
            `[perf-shadow] ${JSON.stringify({
              event: "b3_chat_cursor",
              incomingCount: payload.messages.length,
              subjectKey,
            })}`,
          );
        }

        serverTimeRef.current = payload.serverTime;
      } catch (error) {
        console.warn("Incremental chat synchronization failed", error);
      } finally {
        inFlightRef.current = false;
      }
    }

    function handleWake(event: Event) {
      const detail = (event as CustomEvent<{ subjectKey?: string }>).detail;

      if (!detail?.subjectKey || detail.subjectKey === subjectKey) {
        void synchronize();
      }
    }

    function schedulePoll() {
      pollTimer = window.setInterval(() => {
        void synchronize();
      }, cursorPollIntervalMs);
    }

    window.addEventListener(chatCursorWakeEvent, handleWake);
    window.addEventListener("focus", synchronize);
    window.addEventListener("online", synchronize);
    schedulePoll();
    void synchronize();

    return () => {
      stopped = true;
      inFlightRef.current = false;
      window.removeEventListener(chatCursorWakeEvent, handleWake);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("online", synchronize);
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [endpoint, mode, setMessages, subjectKey]);

  useEffect(() => {
    if (mode !== "canary") {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !isChatComposerBusy()) {
        router.refresh();
      }
    }, fullReconciliationIntervalMs);

    return () => window.clearInterval(timer);
  }, [mode, router, subjectKey]);

  return mode;
}
