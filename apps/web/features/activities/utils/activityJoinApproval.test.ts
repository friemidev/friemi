import assert from "node:assert/strict";
import test from "node:test";
import { resolveJoinParticipantStatus } from "./activityJoinApproval";

test("joins immediately when the organizer did not enable approval", () => {
  assert.equal(
    resolveJoinParticipantStatus({ requiresApproval: false }),
    "APPROVED",
  );
});

test("waits for review only when the organizer enabled approval", () => {
  assert.equal(
    resolveJoinParticipantStatus({ requiresApproval: true }),
    "PENDING",
  );
});
