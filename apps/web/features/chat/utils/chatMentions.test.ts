import assert from "node:assert/strict";
import test from "node:test";
import {
  getChatMentionEveryoneToken,
  getChatMentionMemberToken,
  hasChatMentionToken,
  normalizeChatMentionProfileIds,
  shouldOpenChatMentionPicker,
} from "./chatMentions";

test("chat mention profile ids are trimmed and deduplicated", () => {
  assert.deepEqual(
    normalizeChatMentionProfileIds([" alice ", "bob", "alice", ""]),
    ["alice", "bob"],
  );
});

test("typing @ opens the picker, including replacing selected text", () => {
  assert.equal(shouldOpenChatMentionPicker("", "@", 1), true);
  assert.equal(shouldOpenChatMentionPicker("Hi ", "Hi @", 4), true);
  assert.equal(shouldOpenChatMentionPicker("Hi Alice", "Hi @", 4), true);
  assert.equal(shouldOpenChatMentionPicker("Hello", "@Hello", 1), true);
});

test("editing around an existing @ does not reopen the picker", () => {
  assert.equal(shouldOpenChatMentionPicker("@", "@", 1), false);
  assert.equal(shouldOpenChatMentionPicker("@A", "@", 1), false);
  assert.equal(shouldOpenChatMentionPicker("A@", "@", 0), false);
  assert.equal(shouldOpenChatMentionPicker("@", "", 0), false);
  assert.equal(shouldOpenChatMentionPicker("Hi", "Hi there", 8), false);
});

test("chat mention tokens preserve localized labels", () => {
  assert.equal(getChatMentionEveryoneToken("zh-CN"), "@所有人");
  assert.equal(getChatMentionEveryoneToken("en"), "@everyone");
  assert.equal(getChatMentionEveryoneToken("fr"), "@tout le monde");
  assert.equal(
    getChatMentionMemberToken({
      avatarUrl: null,
      id: "alice",
      nickname: "Alice Smith",
    }),
    "@Alice Smith",
  );
  assert.equal(hasChatMentionToken("Hi @Alice Smith", "@Alice Smith"), true);
});
