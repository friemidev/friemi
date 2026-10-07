import assert from "node:assert/strict";
import test from "node:test";
import { PrimaryTabState, primaryTabKey } from "./primaryTabState";

test("primary tabs restore their filter URL and exact position independently", () => {
  const state = new PrimaryTabState();
  state.save("/zh-CN/lobby?tab=popular&category=ART", 400, 100);
  state.save("/zh-CN/profile", 120, 100);
  assert.deepEqual(state.get("/zh-CN/lobby", 200), {
    href: "/zh-CN/lobby?tab=popular&category=ART",
    scrollY: 400,
    savedAt: 100,
  });
  assert.equal(state.get("/zh-CN/profile", 200)?.scrollY, 120);
  assert.equal(state.get("/fr/lobby", 200), null);
});

test("details, creation, auth and external paths are not retained as primary tabs", () => {
  for (const href of [
    "/zh-CN/lobby/123",
    "/zh-CN/activities/new",
    "/zh-CN/sign-in",
    "//evil.test/profile",
    "https://evil.test/profile",
  ]) {
    assert.equal(primaryTabKey(href), null);
  }
});

test("invalid positions, stale state and a new viewer shell do not restore", () => {
  const state = new PrimaryTabState();
  for (const y of [-1, NaN, Infinity]) state.save("/en/lobby", y, 0);
  assert.equal(state.get("/en/lobby", 10), null);
  state.save("/en/lobby", 0, 0);
  assert.equal(state.get("/en/lobby", 1)?.scrollY, 0);
  assert.equal(state.get("/en/lobby", 30 * 60 * 1000 + 1), null);
  assert.equal(new PrimaryTabState().get("/en/lobby", 1), null);
});
