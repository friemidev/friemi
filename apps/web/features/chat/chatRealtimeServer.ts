import "server-only";

import { after } from "next/server";
import {
  CHAT_INBOX_REALTIME_EVENT,
  CHAT_REALTIME_EVENT,
  getChatInboxRealtimeTopic,
  getChatRealtimeTopic,
  type ChatRealtimeScope,
} from "./chatRealtime";

const broadcastTimeoutMs = 1_000;

async function broadcastChatEvent({
  body,
  event,
  topic,
}: {
  body: Record<string, string>;
  event: string;
  topic: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) {
    return false;
  }

  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent(event)}`;

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(broadcastTimeoutMs),
    });

    if (!response.ok) {
      console.warn("Chat Realtime broadcast was rejected", {
        event,
        status: response.status,
        topic,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Chat Realtime broadcast failed", {
      event,
      message: error instanceof Error ? error.message : "Unknown error",
      topic,
    });
    return false;
  }
}

export async function broadcastChatChange({
  scope,
  subjectKey,
}: {
  scope: ChatRealtimeScope;
  subjectKey: string;
}) {
  return broadcastChatEvent({
    body: {
      changedAt: new Date().toISOString(),
      scope,
      subjectKey,
    },
    event: CHAT_REALTIME_EVENT,
    topic: getChatRealtimeTopic(scope, subjectKey),
  });
}

export async function broadcastChatInboxChange(profileId: string) {
  return broadcastChatEvent({
    body: {
      changedAt: new Date().toISOString(),
      profileId,
    },
    event: CHAT_INBOX_REALTIME_EVENT,
    topic: getChatInboxRealtimeTopic(profileId),
  });
}

export function scheduleChatRealtimeChange({
  profileIds = [],
  scope,
  subjectKey,
}: {
  profileIds?: string[];
  scope: ChatRealtimeScope;
  subjectKey: string;
}) {
  const uniqueProfileIds = [
    ...new Set(profileIds.map((id) => id.trim())),
  ].filter(Boolean);

  after(async () => {
    await Promise.allSettled([
      broadcastChatChange({ scope, subjectKey }),
      ...uniqueProfileIds.map((profileId) =>
        broadcastChatInboxChange(profileId),
      ),
    ]);
  });
}
