import assert from "node:assert/strict";
import test from "node:test";
import { getMobileViewportProfile } from "./mobile-viewport-profile";

test("classifies classic iPhone viewport sizes without model detection", () => {
  assert.deepEqual(getMobileViewportProfile({ height: 568, width: 320 }), {
    heightClass: "short",
    widthClass: "compact",
  });
  assert.deepEqual(getMobileViewportProfile({ height: 667, width: 375 }), {
    heightClass: "compact",
    widthClass: "narrow",
  });
  assert.deepEqual(getMobileViewportProfile({ height: 812, width: 375 }), {
    heightClass: "standard",
    widthClass: "narrow",
  });
});

test("classifies current compact and large phones", () => {
  assert.deepEqual(getMobileViewportProfile({ height: 844, width: 390 }), {
    heightClass: "standard",
    widthClass: "standard",
  });
  assert.deepEqual(getMobileViewportProfile({ height: 932, width: 430 }), {
    heightClass: "tall",
    widthClass: "standard",
  });
});
