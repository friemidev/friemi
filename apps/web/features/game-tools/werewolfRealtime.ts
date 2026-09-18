export const WEREWOLF_REALTIME_EVENT = "room-changed";
export const WEREWOLF_REALTIME_INTEGRITY_POLL_MS = 30_000;

export function getWerewolfRealtimeTopic(roomId: string) {
  return `friemi:werewolf:${roomId.trim()}`;
}

export function getWerewolfRealtimeBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}
