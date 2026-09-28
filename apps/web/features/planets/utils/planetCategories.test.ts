import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetCategoryLabel,
  isPlanetCategory,
  planetCategoryValues,
} from "./planetCategories";

test("planet categories preserve the configured product order", () => {
  assert.deepEqual(planetCategoryValues, [
    "FOOD",
    "BOARD_GAME",
    "ART",
    "SPORTS",
    "WANDER",
    "AUDIO_VISUAL",
    "GROWTH",
    "TRAVEL",
    "MUSIC",
  ]);
  assert.deepEqual(
    planetCategoryValues.map((category) =>
      getPlanetCategoryLabel(category, "zh-CN"),
    ),
    ["饭局", "桌游", "艺术", "运动", "闲逛", "视听", "进步", "旅行", "音乐"],
  );
});

test("unknown legacy tags remain readable", () => {
  assert.equal(isPlanetCategory("OTHER"), false);
  assert.equal(getPlanetCategoryLabel("周末", "zh-CN"), "周末");
});
