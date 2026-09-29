import assert from "node:assert/strict";
import test from "node:test";
import { splitChatMessageSubmissions } from "./chatMessageSubmissions";

test("keeps a text-only chat message as one submission", () => {
  assert.deepEqual(splitChatMessageSubmissions(" hello ", []), [
    { body: "hello", imageUrls: [] },
  ]);
});

test("sends every selected image as its own message", () => {
  assert.deepEqual(
    splitChatMessageSubmissions("caption", ["one.jpg", "two.jpg"]),
    [
      { body: "caption", imageUrls: ["one.jpg"] },
      { body: "", imageUrls: ["two.jpg"] },
    ],
  );
});

test("does not create an empty chat message", () => {
  assert.deepEqual(splitChatMessageSubmissions("   ", []), []);
});
