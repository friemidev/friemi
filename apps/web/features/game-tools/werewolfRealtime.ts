export const WEREWOLF_REALTIME_EVENT = "room-changed";
export const WEREWOLF_REALTIME_EVENT_THROTTLE_MS = 750;
export const WEREWOLF_REALTIME_INTEGRITY_POLL_MS = 30_000;

type ScheduleTimeout = (callback: () => void, delayMs: number) => () => void;

export function createWerewolfRealtimeEventScheduler(
  callback: () => void,
  {
    intervalMs = WEREWOLF_REALTIME_EVENT_THROTTLE_MS,
    now = Date.now,
    schedule = (scheduledCallback, delayMs) => {
      const timeout = setTimeout(scheduledCallback, delayMs);
      return () => clearTimeout(timeout);
    },
  }: {
    intervalMs?: number;
    now?: () => number;
    schedule?: ScheduleTimeout;
  } = {},
) {
  let lastEventAt = Number.NEGATIVE_INFINITY;
  let cancelTrailing: (() => void) | null = null;

  return {
    dispose() {
      cancelTrailing?.();
      cancelTrailing = null;
    },
    notify() {
      const currentTime = now();
      const elapsed = currentTime - lastEventAt;

      if (elapsed < intervalMs) {
        if (!cancelTrailing) {
          cancelTrailing = schedule(() => {
            cancelTrailing = null;
            lastEventAt = now();
            callback();
          }, intervalMs - elapsed);
        }
        return;
      }

      cancelTrailing?.();
      cancelTrailing = null;
      lastEventAt = currentTime;
      callback();
    },
  };
}

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
