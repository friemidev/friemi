import assert from "node:assert/strict";
import test from "node:test";

import {
  createWerewolfRealtimeEventScheduler,
  getWerewolfRealtimeBrowserConfig,
  getWerewolfRealtimeTopic,
} from "./werewolfRealtime";

test("werewolf realtime topics are stable and room scoped", () => {
  assert.equal(
    getWerewolfRealtimeTopic("  room_123  "),
    "friemi:werewolf:room_123",
  );
});

test("werewolf realtime browser config requires a URL and public key", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(getWerewolfRealtimeBrowserConfig(), null);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    assert.deepEqual(getWerewolfRealtimeBrowserConfig(), {
      publishableKey: "publishable-key",
      url: "https://example.supabase.co",
    });
  } finally {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousPublishableKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousPublishableKey;
    }

    if (previousAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
    }
  }
});

test("werewolf realtime scheduler keeps a trailing event during bursts", () => {
  let currentTime = 1_000;
  let calls = 0;
  let scheduled: (() => void) | null = null;
  let cancelled = false;
  const scheduler = createWerewolfRealtimeEventScheduler(
    () => {
      calls += 1;
    },
    {
      intervalMs: 750,
      now: () => currentTime,
      schedule: (callback) => {
        scheduled = callback;
        return () => {
          cancelled = true;
          scheduled = null;
        };
      },
    },
  );

  scheduler.notify();
  assert.equal(calls, 1);

  currentTime = 1_100;
  scheduler.notify();
  currentTime = 1_200;
  scheduler.notify();
  assert.equal(calls, 1);
  assert.ok(scheduled);

  currentTime = 1_750;
  const trailing = scheduled as unknown as () => void;
  trailing();
  assert.equal(calls, 2);
  assert.equal(cancelled, false);

  scheduler.dispose();
});
