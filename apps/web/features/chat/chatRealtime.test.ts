import assert from "node:assert/strict";
import test from "node:test";

import {
  getChatInboxRealtimeTopic,
  getChatRealtimeBrowserConfig,
  getChatRealtimeTopic,
} from "./chatRealtime";

test("chat realtime topics are stable and scoped", () => {
  assert.equal(
    getChatRealtimeTopic("direct", " conversation_123 "),
    "friemi:chat:direct:conversation_123",
  );
  assert.equal(
    getChatRealtimeTopic("activity", "activity_123"),
    "friemi:chat:activity:activity_123",
  );
  assert.equal(
    getChatInboxRealtimeTopic(" profile_123 "),
    "friemi:chat:inbox:profile_123",
  );
});

test("chat realtime browser config requires a URL and public key", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(getChatRealtimeBrowserConfig(), null);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    assert.deepEqual(getChatRealtimeBrowserConfig(), {
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
