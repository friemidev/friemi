import assert from "node:assert/strict";
import test from "node:test";
import { getChatTextareaSize } from "./chatTextareaSize";

const metrics = { lineHeight: 22, padding: 14, border: 2 };

test("chat input starts compact and grows to eight lines", () => {
  assert.deepEqual(getChatTextareaSize({ ...metrics, scrollHeight: 0 }), {
    height: 38,
    overflow: false,
  });
  assert.deepEqual(getChatTextareaSize({ ...metrics, scrollHeight: 58 }), {
    height: 60,
    overflow: false,
  });
  assert.deepEqual(getChatTextareaSize({ ...metrics, scrollHeight: 190 }), {
    height: 192,
    overflow: false,
  });
});

test("long drafts scroll inside the eight-line limit and shrink when cleared", () => {
  assert.deepEqual(getChatTextareaSize({ ...metrics, scrollHeight: 520 }), {
    height: 192,
    overflow: true,
  });
  assert.deepEqual(getChatTextareaSize({ ...metrics, scrollHeight: 36 }), {
    height: 38,
    overflow: false,
  });
});

test("chat input height follows line metrics rather than a fixed pixel limit", () => {
  assert.deepEqual(
    getChatTextareaSize({
      lineHeight: 24,
      padding: 12,
      border: 2,
      scrollHeight: 204,
    }),
    { height: 206, overflow: false },
  );
});
