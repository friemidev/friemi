"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import {
  CHAT_INBOX_REALTIME_EVENT,
  CHAT_REALTIME_EVENT,
  getChatInboxRealtimeTopic,
  getChatRealtimeBrowserConfig,
  getChatRealtimeTopic,
  parseChatRealtimePayload,
  type ChatRealtimePayload,
  type ChatRealtimeScope,
} from "./chatRealtime";

const realtimeEventThrottleMs = 250;

type ChatRealtimeClient = ReturnType<typeof createClient>;

let sharedClient: ChatRealtimeClient | null = null;
let sharedClientKey = "";

function getSharedChatRealtimeClient() {
  const config = getChatRealtimeBrowserConfig();

  if (!config) {
    return null;
  }

  const clientKey = `${config.url}:${config.publishableKey}`;

  if (!sharedClient || sharedClientKey !== clientKey) {
    sharedClient = createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    sharedClientKey = clientKey;
  }

  return sharedClient;
}

function useChatRealtimeChannel({
  enabled = true,
  event,
  onChanged,
  topic,
}: {
  enabled?: boolean;
  event: string;
  onChanged: (payload: ChatRealtimePayload | null) => void;
  topic: string | null;
}) {
  const callbackRef = useRef(onChanged);
  const lastEventAtRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    const client = enabled && topic ? getSharedChatRealtimeClient() : null;

    if (!client || !topic) {
      setIsConnected(false);
      return;
    }

    let channel: RealtimeChannel | null = client
      .channel(topic)
      .on("broadcast", { event }, (message) => {
        const now = Date.now();

        if (now - lastEventAtRef.current < realtimeEventThrottleMs) {
          return;
        }

        lastEventAtRef.current = now;
        callbackRef.current(parseChatRealtimePayload(message));
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsConnected(false);
      const currentChannel = channel;
      channel = null;

      if (currentChannel) {
        void client.removeChannel(currentChannel);
      }
    };
  }, [enabled, event, topic]);

  return isConnected;
}

export function useChatRealtime({
  onChanged,
  scope,
  subjectKey,
}: {
  onChanged: (payload: ChatRealtimePayload | null) => void;
  scope: ChatRealtimeScope;
  subjectKey: string;
}) {
  return useChatRealtimeChannel({
    event: CHAT_REALTIME_EVENT,
    onChanged,
    topic: subjectKey ? getChatRealtimeTopic(scope, subjectKey) : null,
  });
}

export function useChatInboxRealtime({
  onChanged,
  profileId,
}: {
  onChanged: (payload: ChatRealtimePayload | null) => void;
  profileId: string | null;
}) {
  return useChatRealtimeChannel({
    enabled: Boolean(profileId),
    event: CHAT_INBOX_REALTIME_EVENT,
    onChanged,
    topic: profileId ? getChatInboxRealtimeTopic(profileId) : null,
  });
}
