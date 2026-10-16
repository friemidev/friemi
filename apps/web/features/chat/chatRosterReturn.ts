import { isChatRealtimeScope, type ChatRealtimeScope } from "./chatRealtime";

const storageKey = "friemi:chat-roster-return";
const pendingScopes = new Set<ChatRealtimeScope>();

function parseScopes(raw: string | null): ChatRealtimeScope[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(isChatRealtimeScope)
      ? [...new Set(value)]
      : [];
  } catch {
    return [];
  }
}

// Keep only visited partitions, never message content. Session storage also
// survives history/BFCache returns; memory covers blocked storage in WebViews.
export function rememberChatRosterVisit(scope: ChatRealtimeScope) {
  if (typeof window === "undefined") return;
  pendingScopes.add(scope);
  try {
    const scopes = new Set([
      ...parseScopes(window.sessionStorage.getItem(storageKey)),
      ...pendingScopes,
    ]);
    window.sessionStorage.setItem(storageKey, JSON.stringify([...scopes]));
  } catch {
    // The in-memory hint still works when browser storage is unavailable.
  }
}

export function consumeChatRosterVisits(): ChatRealtimeScope[] {
  if (typeof window === "undefined") return [];
  const scopes = new Set(pendingScopes);
  pendingScopes.clear();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    // Delete before using the persisted hint so a failed removal cannot cause
    // a refresh loop whenever React updates the roster callback.
    window.sessionStorage.removeItem(storageKey);
    for (const scope of parseScopes(raw)) scopes.add(scope);
  } catch {
    // Use the consumed memory hint without repeating failed storage reads.
  }
  return [...scopes];
}
