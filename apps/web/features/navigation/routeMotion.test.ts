import assert from "node:assert/strict";
import test from "node:test";
import {
  getRouteMotionDirection,
  readRouteMotionIndex,
  routeMotionHistoryKey,
} from "./routeMotion";

test("detail pages slide in forwards and links back to their parent slide backwards", () => {
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/lobby",
      toPath: "/zh-CN/lobby/example",
    }),
    "forward",
  );
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/fr/lobby/example/room",
      toPath: "/fr/lobby/example",
    }),
    "back",
  );
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/en/messages/example",
      toPath: "/en/footprints",
    }),
    "back",
  );
});

test("primary navigation switches directly without page motion", () => {
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/mobile-home",
      toPath: "/zh-CN/footprints",
    }),
    null,
  );
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/profile",
      toPath: "/zh-CN/lobby",
    }),
    null,
  );
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/profile",
      toPath: "/zh-CN/lobby",
      historyDirection: "back",
    }),
    null,
  );
});

test("browser back and forward take precedence over route depth", () => {
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/lobby/first",
      toPath: "/zh-CN/lobby/second",
      historyDirection: "back",
    }),
    "back",
  );
  assert.equal(
    getRouteMotionDirection({
      fromPath: "/zh-CN/lobby/first/room",
      toPath: "/zh-CN/lobby/first",
      historyDirection: "forward",
    }),
    "forward",
  );
});

test("filters, hashes, refreshes and locale-only changes do not replay page motion", () => {
  for (const toPath of [
    "/zh-CN/lobby",
    "/zh-CN/lobby?filter=nearby",
    "/zh-CN/lobby#top",
    "/fr/lobby",
  ]) {
    assert.equal(
      getRouteMotionDirection({ fromPath: "/zh-CN/lobby", toPath }),
      null,
    );
  }
});

test("game and authentication routes retain their own transitions in both directions", () => {
  for (const path of [
    "/zh-CN/game-tools/draw-guess",
    "/fr/game-tools/werewolf/rooms/example",
    "/en/sign-in",
    "/zh-CN/android-auth-return",
    "/en/admin",
  ]) {
    assert.equal(
      getRouteMotionDirection({ fromPath: "/zh-CN/mobile-home", toPath: path }),
      null,
    );
    assert.equal(
      getRouteMotionDirection({ fromPath: path, toPath: "/zh-CN/mobile-home" }),
      null,
    );
  }
});

test("history direction only uses finite integer markers", () => {
  for (const state of [
    null,
    {},
    "invalid",
    { [routeMotionHistoryKey]: NaN },
    { [routeMotionHistoryKey]: "1" },
  ]) {
    assert.equal(readRouteMotionIndex(state), null);
  }
  assert.equal(
    readRouteMotionIndex({ __NA: true, [routeMotionHistoryKey]: 2 }),
    2,
  );
});
