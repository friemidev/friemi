import assert from "node:assert/strict";
import test from "node:test";
import {
  getUserPresenceState,
  presenceOnlineWindowMs,
  type UserPresenceStatusValue,
} from "./presence";

const now = new Date("2026-07-29T12:00:00.000Z");

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

test("presence shows online only inside the active heartbeat window", () => {
  assert.equal(
    getUserPresenceState({
      lastActiveAt: minutesAgo(4),
      now,
      status: "ONLINE",
    }).isOnline,
    true,
  );
  assert.equal(
    getUserPresenceState({
      lastActiveAt: new Date(now.getTime() - presenceOnlineWindowMs - 1),
      now,
      status: "ONLINE",
    }).isOnline,
    false,
  );
});

test("presence hides the green dot for away and invisible statuses", () => {
  for (const status of ["AWAY", "INVISIBLE"] satisfies UserPresenceStatusValue[]) {
    const presence = getUserPresenceState({
      lastActiveAt: minutesAgo(1),
      now,
      status,
    });

    assert.equal(presence.status, status);
    assert.equal(presence.isOnline, false);
  }
});

test("presence does not treat missing or future heartbeats as online", () => {
  assert.equal(
    getUserPresenceState({
      lastActiveAt: null,
      now,
      status: "ONLINE",
    }).isOnline,
    false,
  );
  assert.equal(
    getUserPresenceState({
      lastActiveAt: new Date(now.getTime() + 60 * 1000),
      now,
      status: "ONLINE",
    }).isOnline,
    false,
  );
});
