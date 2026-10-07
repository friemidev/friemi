import assert from "node:assert/strict";
import test from "node:test";
import { CoverFailureCache } from "./coverFailureCache";

test("failed covers are temporarily suppressed but can recover", () => {
  const cache = new CoverFailureCache(2, 100);
  cache.fail("primary", 10);
  assert.equal(cache.has("primary", 20), true);
  assert.equal(cache.has("recovery", 20), false);
  assert.equal(cache.has("primary", 111), false);
  cache.fail("primary", 200);
  cache.clear("primary");
  assert.equal(cache.has("primary", 201), false);
});

test("failure cache has bounded memory and treats exact URLs independently", () => {
  const cache = new CoverFailureCache(2);
  cache.fail("one", 1);
  cache.fail("two", 2);
  cache.fail("three", 3);
  assert.equal(cache.has("one", 4), false);
  assert.equal(cache.has("two", 4), true);
  assert.equal(cache.has("two?v=2", 4), false);
  assert.equal(cache.has(null), false);
});
