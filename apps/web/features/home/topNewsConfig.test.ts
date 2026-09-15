import assert from "node:assert/strict";
import test from "node:test";
import { getMobileHomeTopNewsConfigItems } from "./topNewsConfig";

test("mobile home top news uses fixed story routes and local images", () => {
  assert.deepEqual(getMobileHomeTopNewsConfigItems("zh-CN"), [
    {
      href: "/top-news/werewolf",
      id: "werewolf-guide",
      image: "/game-tools/werewolf/recto/werewolf-promo-landscape.png",
      title: "狼人杀线下开局指南",
    },
    {
      href: "/top-news/friemi",
      id: "friemi-intro",
      image: "/home/friemi_intro.png",
      title: "发现活动，约朋友，一起出发",
    },
  ]);
});

test("mobile home top news localizes fixed story titles", () => {
  const englishItems = getMobileHomeTopNewsConfigItems("en");
  const frenchItems = getMobileHomeTopNewsConfigItems("fr");

  assert.equal(englishItems[0]?.title, "Werewolf game setup guide");
  assert.equal(englishItems[1]?.title, "Discover Friemi");
  assert.equal(frenchItems[0]?.title, "Guide de lancement Loups-garous");
  assert.equal(frenchItems[1]?.title, "Découvrez Friemi");
});
