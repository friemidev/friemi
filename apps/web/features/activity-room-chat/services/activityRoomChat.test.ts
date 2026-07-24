import assert from "node:assert/strict";
import test from "node:test";
import {
  ActivityRoomChatDomainError,
  activityRoomMessageMaxLength,
  normalizeActivityRoomMessageBody,
  resolveActivityRoomChatPolicy,
} from "./activityRoomChat";

test("activity room chat allows organizer, co-manager, joined and approved members", () => {
  const base = {
    activityType: "USER_HOSTED" as const,
    status: "RECRUITING" as const,
  };

  assert.deepEqual(
    resolveActivityRoomChatPolicy({ ...base, isOrganizer: true }),
    {
      canSend: true,
      canView: true,
      reason: "ALLOWED",
      role: "ORGANIZER",
    },
  );
  assert.deepEqual(
    resolveActivityRoomChatPolicy({ ...base, isCoManager: true }),
    {
      canSend: true,
      canView: true,
      reason: "ALLOWED",
      role: "CO_MANAGER",
    },
  );
  assert.equal(
    resolveActivityRoomChatPolicy({
      ...base,
      participantStatus: "JOINED",
    }).canSend,
    true,
  );
  assert.equal(
    resolveActivityRoomChatPolicy({
      ...base,
      participantStatus: "APPROVED",
    }).canView,
    true,
  );
});

test("activity room chat rejects pending, rejected, cancelled and guest access", () => {
  const base = {
    activityType: "USER_HOSTED" as const,
    status: "RECRUITING" as const,
  };

  for (const participantStatus of [
    "PENDING",
    "REJECTED",
    "CANCELLED",
  ] as const) {
    const policy = resolveActivityRoomChatPolicy({
      ...base,
      participantStatus,
    });

    assert.equal(policy.canView, false);
    assert.equal(policy.reason, "NOT_ROOM_MEMBER");
  }

  assert.equal(resolveActivityRoomChatPolicy(base).canView, false);
});

test("activity room chat rejects public events and makes ended groups read-only", () => {
  assert.equal(
    resolveActivityRoomChatPolicy({
      activityType: "PUBLIC_EVENT",
      isOrganizer: true,
      status: "RECRUITING",
    }).reason,
    "PUBLIC_EVENT_UNAVAILABLE",
  );

  const cancelled = resolveActivityRoomChatPolicy({
    activityType: "USER_HOSTED",
    isOrganizer: true,
    status: "CANCELLED",
  });

  assert.equal(cancelled.canView, true);
  assert.equal(cancelled.canSend, false);
  assert.equal(cancelled.reason, "ACTIVITY_CANCELLED");

  const ended = resolveActivityRoomChatPolicy({
    activityType: "USER_HOSTED",
    endAt: new Date("2026-07-23T10:00:00Z"),
    isOrganizer: true,
    now: new Date("2026-07-24T10:00:00Z"),
    status: "CONFIRMED",
  });

  assert.equal(ended.canView, true);
  assert.equal(ended.canSend, false);
  assert.equal(ended.reason, "ACTIVITY_ENDED");
});

test("activity room message body is trimmed and bounded", () => {
  assert.equal(normalizeActivityRoomMessageBody("  hello  "), "hello");
  assert.throws(
    () => normalizeActivityRoomMessageBody(" "),
    (error) =>
      error instanceof ActivityRoomChatDomainError &&
      error.code === "EMPTY_BODY",
  );
  assert.throws(
    () =>
      normalizeActivityRoomMessageBody(
        "a".repeat(activityRoomMessageMaxLength + 1),
      ),
    (error) =>
      error instanceof ActivityRoomChatDomainError &&
      error.code === "BODY_TOO_LONG",
  );
});
