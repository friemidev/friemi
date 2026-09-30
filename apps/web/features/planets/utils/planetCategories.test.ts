import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetCategoryLabel,
  isPlanetCategory,
  planetCategoryValues,
  resolvePlanetCategory,
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

test("legacy localized labels resolve to their canonical category", () => {
  assert.equal(resolvePlanetCategory("桌游"), "BOARD_GAME");
  assert.equal(resolvePlanetCategory("Board games"), "BOARD_GAME");
  assert.equal(resolvePlanetCategory("Jeux de société"), "BOARD_GAME");
  assert.equal(resolvePlanetCategory(" BOARD_GAME "), "BOARD_GAME");
  assert.equal(resolvePlanetCategory("周末"), null);
});
