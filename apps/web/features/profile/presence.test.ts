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
  const onlinePresence = getUserPresenceState({
    lastActiveAt: minutesAgo(4),
    now,
    status: "ONLINE",
  });

  assert.equal(onlinePresence.displayStatus, "ONLINE");
  assert.equal(onlinePresence.isOnline, true);
  assert.equal(
    getUserPresenceState({
      lastActiveAt: new Date(now.getTime() - presenceOnlineWindowMs - 1),
      now,
      status: "ONLINE",
    }).isOnline,
    false,
  );
});

test("presence shows away as a visible yellow status", () => {
  const presence = getUserPresenceState({
    lastActiveAt: minutesAgo(1),
    now,
    status: "AWAY" satisfies UserPresenceStatusValue,
  });

  assert.equal(presence.status, "AWAY");
  assert.equal(presence.displayStatus, "AWAY");
  assert.equal(presence.isOnline, false);
});

test("presence hides invisible status", () => {
  const presence = getUserPresenceState({
    lastActiveAt: minutesAgo(1),
    now,
    status: "INVISIBLE" satisfies UserPresenceStatusValue,
  });

  assert.equal(presence.status, "INVISIBLE");
  assert.equal(presence.displayStatus, null);
  assert.equal(presence.isOnline, false);
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
