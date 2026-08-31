import assert from "node:assert/strict";
import test from "node:test";
import {
  getGlobalSearchHref,
  isCanonicalGlobalSearchParams,
  normalizeGlobalSearchSource,
} from "./searchQuery";

test("message search source is preserved with and without a query", () => {
  assert.equal(
    getGlobalSearchHref("zh-CN", "", { source: "messages" }),
    "/zh-CN/search?source=messages",
  );
  assert.equal(
    getGlobalSearchHref("zh-CN", " Alice ", { source: "messages" }),
    "/zh-CN/search?q=Alice&source=messages",
  );
});

test("global search only accepts known scalar source values", () => {
  assert.equal(normalizeGlobalSearchSource("messages"), "messages");
  assert.equal(normalizeGlobalSearchSource("home"), null);
  assert.equal(isCanonicalGlobalSearchParams({ source: "messages" }), true);
  assert.equal(
    isCanonicalGlobalSearchParams({ q: "Alice", source: "messages" }),
    true,
  );
  assert.equal(isCanonicalGlobalSearchParams({ source: "home" }), false);
  assert.equal(
    isCanonicalGlobalSearchParams({ source: ["messages", "messages"] }),
    false,
  );
});
