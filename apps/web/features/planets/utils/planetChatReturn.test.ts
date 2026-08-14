import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetChatFallbackHref,
  normalizePlanetChatReturnHref,
} from "./planetChatReturn";

test("planet chat return keeps safe planet and world list state", () => {
  assert.equal(
    normalizePlanetChatReturnHref(
      "zh-CN",
      "/zh-CN/planets/board-game?moment=moment-1#planet-moment",
    ),
    "/zh-CN/planets/board-game?moment=moment-1#planet-moment",
  );
  assert.equal(
    normalizePlanetChatReturnHref("en", "/footprints?tab=message&filter=group"),
    "/en/footprints?tab=message&filter=group",
  );
});

test("planet chat return rejects external and recursive destinations", () => {
  assert.equal(
    normalizePlanetChatReturnHref("zh-CN", "https://evil.example/chat"),
    getPlanetChatFallbackHref("zh-CN"),
  );
  assert.equal(
    normalizePlanetChatReturnHref("zh-CN", "/zh-CN/planets/demo/chat"),
    getPlanetChatFallbackHref("zh-CN"),
  );
});
