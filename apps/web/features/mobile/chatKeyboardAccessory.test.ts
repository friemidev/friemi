import assert from "node:assert/strict";
import test from "node:test";
import { isChatConversationPath } from "./chatKeyboardAccessory";

test("only conversation pages hide the iPhone keyboard accessory bar", () => {
  for (const locale of ["", "/zh-CN", "/en", "/fr"]) {
    for (const route of [
      "/messages/chat-id",
      "/lobby/activity-id/room",
      "/planets/planet-slug/chat",
    ]) {
      assert.equal(isChatConversationPath(`${locale}${route}`), true);
      assert.equal(isChatConversationPath(`${locale}${route}/`), true);
    }
  }
});

test("login, management and other forms retain keyboard navigation", () => {
  for (const route of [
    "/zh-CN/sign-in",
    "/fr/activities/new",
    "/en/lobby/a/room/manage",
    "/zh-CN/messages",
    "/fr/planets/a",
    "/en/profile",
    "/zh-CN/footprints",
  ]) {
    assert.equal(isChatConversationPath(route), false);
  }
});
