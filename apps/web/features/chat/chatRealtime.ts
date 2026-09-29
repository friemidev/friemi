export const CHAT_REALTIME_EVENT = "messages-changed";
export const CHAT_INBOX_REALTIME_EVENT = "inbox-changed";
export const CHAT_REALTIME_FALLBACK_POLL_MS = 3_000;
export const CHAT_REALTIME_INTEGRITY_POLL_MS = 30_000;
export const chatRosterWakeEvent = "friemi:chat-roster-wake";

export type ChatRealtimeScope = "activity" | "direct" | "official" | "planet";

export type ChatRealtimePayload = {
  changedAt: string;
  scope: ChatRealtimeScope;
  subjectKey: string;
};

export type ChatRosterWakeDetail = Pick<
  ChatRealtimePayload,
  "scope" | "subjectKey"
>;

export function isChatRealtimeScope(
  value: unknown,
): value is ChatRealtimeScope {
  return (
    value === "activity" ||
    value === "direct" ||
    value === "official" ||
    value === "planet"
  );
}

export function parseChatRealtimePayload(
  value: unknown,
): ChatRealtimePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const envelope = value as Record<string, unknown>;
  const candidate =
    envelope.payload && typeof envelope.payload === "object"
      ? (envelope.payload as Record<string, unknown>)
      : envelope;

  if (
    typeof candidate.changedAt !== "string" ||
    !isChatRealtimeScope(candidate.scope) ||
    typeof candidate.subjectKey !== "string" ||
    candidate.subjectKey.trim().length === 0
  ) {
    return null;
  }

  return {
    changedAt: candidate.changedAt,
    scope: candidate.scope,
    subjectKey: candidate.subjectKey,
  };
}

export function getChatRealtimeTopic(
  scope: ChatRealtimeScope,
  subjectKey: string,
) {
  return `friemi:chat:${scope}:${subjectKey.trim()}`;
}

export function getChatInboxRealtimeTopic(profileId: string) {
  return `friemi:chat:inbox:${profileId.trim()}`;
}

export function getChatRealtimeBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}
