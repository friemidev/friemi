import assert from "node:assert/strict";
import test from "node:test";
import { getNotificationDedupeKey } from "./createNotification";

test("notification dedupe keys are stable per occurrence and recipient", () => {
  const input = {
    occurrenceId: "announcement-123",
    recipientId: "profile-123",
    type: "ACTIVITY_ANNOUNCEMENT" as const,
  };

  assert.equal(
    getNotificationDedupeKey(input),
    getNotificationDedupeKey(input),
  );
  assert.notEqual(
    getNotificationDedupeKey(input),
    getNotificationDedupeKey({ ...input, recipientId: "profile-456" }),
  );
});

test("notification dedupe keys cover the business identity", () => {
  const base = {
    occurrenceId: "event-123",
    recipientId: "profile-123",
    type: "ACTIVITY_UPDATED" as const,
  };

  assert.notEqual(
    getNotificationDedupeKey({ ...base, activityId: "activity-a" }),
    getNotificationDedupeKey({ ...base, activityId: "activity-b" }),
  );
});

test("notification dedupe keys require an explicit occurrence", () => {
  assert.equal(
    getNotificationDedupeKey({
      recipientId: "profile-123",
      type: "ACTIVITY_UPDATED",
    }),
    null,
  );
});
