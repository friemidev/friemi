import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfficialMessageDetailHref,
  getOfficialMessageFallbackHref,
  normalizeOfficialMessageReturnHref,
} from "./officialMessageReturn";

test("official message detail link carries the current chat list state", () => {
  assert.equal(
    buildOfficialMessageDetailHref({
      detailPath: "/official-messages",
      locale: "zh-CN",
      returnHref:
        "/zh-CN/footprints?tab=message&chatFilter=rooms&chatQuery=board+game",
    }),
    "/zh-CN/official-messages?returnTo=%2Fzh-CN%2Ffootprints%3Ftab%3Dmessage%26chatFilter%3Drooms%26chatQuery%3Dboard%2Bgame",
  );
});

test("official message return restores the previous filter and query", () => {
  assert.equal(
    normalizeOfficialMessageReturnHref(
      "en",
      "/zh-CN/footprints?tab=message&chatFilter=strangers&chatQuery=Alice",
    ),
    "/en/footprints?tab=message&chatFilter=strangers&chatQuery=Alice",
  );
});

test("official message return falls back to the complete chat list", () => {
  assert.equal(
    normalizeOfficialMessageReturnHref("fr", undefined),
    getOfficialMessageFallbackHref("fr"),
  );
  assert.equal(
    normalizeOfficialMessageReturnHref(
      "zh-CN",
      "https://evil.example/footprints?chatFilter=official",
    ),
    getOfficialMessageFallbackHref("zh-CN"),
  );
  assert.equal(
    normalizeOfficialMessageReturnHref(
      "zh-CN",
      "/zh-CN/official-messages?chatFilter=official",
    ),
    getOfficialMessageFallbackHref("zh-CN"),
  );
});
