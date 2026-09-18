import assert from "node:assert/strict";
import test from "node:test";
import { getPollCopy } from "./copy";

test("anonymous voter labels follow the current viewer locale", () => {
  assert.equal(getPollCopy("zh-CN").anonymous, "匿名");
  assert.equal(getPollCopy("en").anonymous, "Anonymous");
  assert.equal(getPollCopy("fr").anonymous, "Anonyme");
});
