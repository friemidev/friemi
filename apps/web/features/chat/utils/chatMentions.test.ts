import assert from "node:assert/strict";
import test from "node:test";
import {
  getChatMentionEveryoneToken,
  getChatMentionMemberToken,
  hasChatMentionToken,
  normalizeChatMentionProfileIds,
} from "./chatMentions";

test("chat mention profile ids are trimmed and deduplicated", () => {
  assert.deepEqual(
    normalizeChatMentionProfileIds([" alice ", "bob", "alice", ""]),
    ["alice", "bob"],
  );
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
