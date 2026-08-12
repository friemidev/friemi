import assert from "node:assert/strict";
import test from "node:test";
import { buildProfilePresenceUpdate } from "./profilePresenceWrite";

test("presence update targets an active Clerk profile in one conditional write", () => {
  const now = new Date("2026-08-12T12:00:00.000Z");

  assert.deepEqual(
    buildProfilePresenceUpdate({
      event: "online",
      identity: { clerkUserId: "clerk-user" },
      now,
    }),
    {
      where: {
        clerkUserId: "clerk-user",
        status: "ACTIVE",
      },
      data: {
        lastActiveAt: now,
      },
    },
  );
});

test("offline presence clears the heartbeat for the local profile", () => {
  assert.deepEqual(
    buildProfilePresenceUpdate({
      event: "offline",
      identity: { profileId: "local-profile" },
    }),
    {
      where: {
        id: "local-profile",
        status: "ACTIVE",
      },
      data: {
        lastActiveAt: null,
      },
    },
  );
});
