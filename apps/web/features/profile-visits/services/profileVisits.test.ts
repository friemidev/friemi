import assert from "node:assert/strict";
import test from "node:test";
import { getProfileVisitDate, recordProfileVisit } from "./profileVisits";

test("profile visit date is normalized to a UTC day", () => {
  assert.equal(
    getProfileVisitDate(new Date("2026-07-24T23:59:59Z")).toISOString(),
    "2026-07-24T00:00:00.000Z",
  );
});

test("profile visit recording no-ops for guests and self visits", async () => {
  assert.deepEqual(
    await recordProfileVisit({ profileId: "p1", visitorId: null }),
    {
      recorded: false,
      reason: "GUEST",
    },
  );
  assert.deepEqual(
    await recordProfileVisit({ profileId: "p1", visitorId: "p1" }),
    {
      recorded: false,
      reason: "SELF_VISIT",
    },
  );
});
