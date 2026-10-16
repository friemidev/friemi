import assert from "node:assert/strict";
import test from "node:test";
import {
  activityRoomAssistantId,
  getActivityRoomMessageSenderName,
  defaultActivityRoomWelcomeTemplate,
  normalizeActivityRoomWelcomeTemplate,
  renderActivityRoomWelcome,
  shouldWelcomeActivityRoomParticipant,
} from "./assistant";

test("localizes the assistant in cached chat rosters without changing real user names", () => {
  const assistant = {
    senderId: activityRoomAssistantId,
    senderName: "Friemi 群助手",
  };
  assert.equal(
    getActivityRoomMessageSenderName(assistant, "zh-CN"),
    "Friemi 群助手",
  );
  assert.equal(
    getActivityRoomMessageSenderName(assistant, "en"),
    "Friemi Assistant",
  );
  assert.equal(
    getActivityRoomMessageSenderName(assistant, "fr"),
    "Assistant Friemi",
  );
  for (const locale of ["zh-CN", "en", "fr"]) {
    assert.equal(
      getActivityRoomMessageSenderName(
        { senderId: "member", senderName: "小明" },
        locale,
      ),
      "小明",
    );
  }
});

test("welcomes only a new active membership, including approvals and rejoining", () => {
  for (const previous of [null, "PENDING", "REJECTED", "CANCELLED"]) {
    assert.equal(
      shouldWelcomeActivityRoomParticipant(previous, "APPROVED"),
      true,
    );
    assert.equal(
      shouldWelcomeActivityRoomParticipant(previous, "JOINED"),
      true,
    );
  }
  for (const previous of ["JOINED", "APPROVED"]) {
    assert.equal(
      shouldWelcomeActivityRoomParticipant(previous, "APPROVED"),
      false,
    );
  }
  for (const next of ["PENDING", "REJECTED", "CANCELLED"]) {
    assert.equal(shouldWelcomeActivityRoomParticipant(null, next), false);
  }
});

test("renders the requested default and substitutes names literally in one pass", () => {
  assert.equal(
    renderActivityRoomWelcome(null, "小明", "周日桌游"),
    "欢迎 小明 进入 周日桌游 Friemi群！",
  );
  assert.equal(
    renderActivityRoomWelcome(
      "{nickname} / {activityName}",
      "{activityName} $&",
      "游戏群",
    ),
    "{activityName} $& / 游戏群",
  );
  assert.equal(
    renderActivityRoomWelcome(
      "{nickname}\n欢迎来到 {activityName}",
      "Alice",
      "Paris",
    ),
    "Alice\n欢迎来到 Paris",
  );
});

test("validates saved welcome templates without accepting unknown or malformed variables", () => {
  assert.equal(
    normalizeActivityRoomWelcomeTemplate(defaultActivityRoomWelcomeTemplate),
    defaultActivityRoomWelcomeTemplate,
  );
  assert.equal(normalizeActivityRoomWelcomeTemplate("  你好  "), "你好");
  for (const template of [
    "",
    "  ",
    "a".repeat(301),
    "欢迎 {name}",
    "{nickname",
    "nickname}",
  ]) {
    assert.equal(normalizeActivityRoomWelcomeTemplate(template), null);
  }
});
