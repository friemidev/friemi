import assert from "node:assert/strict";
import test from "node:test";
import { getEnteringChatMessageIds } from "./chatMessageMotion";

const message = (id: string, second: number) => ({
  id,
  createdAt: new Date(2026, 0, 1, 0, 0, second).toISOString(),
});

test("initial messages and realtime updates to existing messages do not animate", () => {
  const messages = [message("one", 1), message("two", 2)];
  assert.deepEqual(getEnteringChatMessageIds(messages, [...messages]), []);
});

test("only new messages animate, not prepended history or removed messages", () => {
  const previous = [message("two", 2)];
  assert.deepEqual(
    getEnteringChatMessageIds(previous, [message("one", 1), ...previous]),
    [],
  );
  assert.deepEqual(
    getEnteringChatMessageIds(previous, [...previous, message("three", 3)]),
    ["three"],
  );
  assert.deepEqual(getEnteringChatMessageIds(previous, []), []);
});

test("first live message and simultaneous messages animate", () => {
  assert.deepEqual(getEnteringChatMessageIds([], [message("one", 1)]), ["one"]);
  assert.deepEqual(
    getEnteringChatMessageIds(
      [message("a", 1)],
      [message("a", 1), message("b", 1)],
    ),
    ["b"],
  );
});

test("optimistic confirmation does not replay the send animation", () => {
  assert.deepEqual(
    getEnteringChatMessageIds(
      [message("client-one", 1)],
      [message("server-one", 2)],
    ),
    [],
  );
});

test("reconnection batches have a bounded animation cost", () => {
  assert.equal(
    getEnteringChatMessageIds(
      [],
      Array.from({ length: 40 }, (_, i) => message(String(i), i)),
    ).length,
    12,
  );
});
