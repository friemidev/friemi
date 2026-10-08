import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import { getActivityTimeState } from "./activityDisplay";
import {
  getLobbyRetentionWhere,
  isArchivedLobbyActivity,
} from "./lobbyActivityRetention";

const reference = new Date("2026-10-08T12:00:00Z");
function activity(overrides: Partial<ActivityCardViewModel> = {}) {
  return {
    type: "USER_HOSTED",
    status: "ENDED",
    startAt: "2026-10-05T10:00:00Z",
    endAt: "2026-10-05T15:00:00Z",
    ...overrides,
  } as ActivityCardViewModel;
}

test("ended plans stay visible for three days without becoming ongoing", () => {
  const recent = activity();
  assert.equal(getActivityTimeState(recent, reference), "ENDED");
  assert.equal(isArchivedLobbyActivity(recent, reference), false);
  assert.equal(
    isArchivedLobbyActivity(
      activity({ endAt: "2026-10-05T14:00:00Z" }),
      reference,
    ),
    true,
  );
  assert.equal(
    isArchivedLobbyActivity(
      activity({ endAt: "2026-10-05T14:00:01Z" }),
      reference,
    ),
    false,
  );
});

test("plans without an end time use the end of their scheduled day", () => {
  assert.equal(
    isArchivedLobbyActivity(activity({ endAt: null }), reference),
    false,
  );
  assert.equal(
    isArchivedLobbyActivity(
      activity({ startAt: "2026-10-04T10:00:00Z", endAt: null }),
      reference,
    ),
    true,
  );
});

test("expired recruiting plans also fold while future plans stay visible", () => {
  assert.equal(
    isArchivedLobbyActivity(
      activity({ status: "RECRUITING", endAt: "2026-10-04T15:00:00Z" }),
      reference,
    ),
    true,
  );
  assert.equal(
    isArchivedLobbyActivity(
      activity({
        status: "RECRUITING",
        startAt: "2026-10-10T10:00:00Z",
        endAt: null,
      }),
      reference,
    ),
    false,
  );
  assert.equal(
    isArchivedLobbyActivity(activity({ status: "CANCELLED" }), reference),
    true,
  );
});

test("database buckets share the Paris floating-time cutoff and do not overlap", () => {
  const cutoff = new Date("2026-10-05T14:00:00Z");
  const day = new Date("2026-10-05T00:00:00Z");
  assert.deepEqual(getLobbyRetentionWhere(false, reference), {
    status: { not: "CANCELLED" },
    OR: [{ endAt: { gt: cutoff } }, { endAt: null, startAt: { gte: day } }],
  });
  assert.deepEqual(getLobbyRetentionWhere(true, reference), {
    OR: [
      { status: "CANCELLED" },
      { endAt: { lte: cutoff } },
      { endAt: null, startAt: { lt: day } },
    ],
  });
});
