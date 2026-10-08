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

test("ticket gift notification dedupes by gift and recipient", () => {
  const input = {
    inventoryItemDefinitionId: "definition-1",
    occurrenceId: "gift-1",
    recipientId: "recipient-1",
    type: "INVENTORY_TICKET_RECEIVED" as const,
  };
  assert.equal(getNotificationDedupeKey(input), getNotificationDedupeKey(input));
  assert.notEqual(
    getNotificationDedupeKey(input),
    getNotificationDedupeKey({ ...input, occurrenceId: "gift-2" }),
  );
  assert.notEqual(
    getNotificationDedupeKey(input),
    getNotificationDedupeKey({ ...input, recipientId: "recipient-2" }),
  );
});

test("ticket allocation notification dedupes by batch rather than ticket", () => {
  const batch = {
    actorId: "admin-1",
    inventoryItemDefinitionId: "definition-1",
    occurrenceId: "issue-batch-1",
    recipientId: "recipient-1",
    type: "INVENTORY_TICKET_RECEIVED" as const,
  };

  assert.equal(getNotificationDedupeKey(batch), getNotificationDedupeKey(batch));
  assert.notEqual(
    getNotificationDedupeKey(batch),
    getNotificationDedupeKey({ ...batch, occurrenceId: "issue-batch-2" }),
  );
});
