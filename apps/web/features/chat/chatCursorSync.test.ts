import assert from "node:assert/strict";
import test from "node:test";
import { getLatestChatCursor, mergeChatCursorMessages } from "./chatCursorSync";

test("chat cursor synchronization merges and orders messages", () => {
  const result = mergeChatCursorMessages(
    [
      { id: "b", createdAt: "2026-08-14T10:00:00.000Z", value: 1 },
      { id: "a", createdAt: "2026-08-14T10:00:00.000Z", value: 1 },
    ],
    [
      { id: "b", createdAt: "2026-08-14T10:00:00.000Z", value: 2 },
      { id: "c", createdAt: "2026-08-14T10:00:01.000Z", value: 1 },
    ],
  );

  assert.deepEqual(
    result.map((message) => `${message.id}:${message.value}`),
    ["a:1", "b:2", "c:1"],
  );
  assert.equal(getLatestChatCursor(result)?.id, "c");
});

test("chat cursor synchronization removes locally deleted message ids", () => {
  assert.deepEqual(
    mergeChatCursorMessages(
      [{ id: "a", createdAt: "2026-08-14T10:00:00.000Z" }],
      [],
      ["a"],
    ),
    [],
  );
});
