import assert from "node:assert/strict";
import test from "node:test";
import { prioritizeLatestVersionTopNewsItem } from "./topNewsConfig";

test("mobile home replaces a stale release item with v2.7", () => {
  const items = prioritizeLatestVersionTopNewsItem(
    [
      {
        href: "/updates/v2_4",
        id: "topnews-v2-4-release",
        image: "/custom-release.jpg",
        title: "Friemi v2.4 更新",
      },
      {
        href: "/game-tools/werewolf",
        id: "werewolf",
        image: "/werewolf.jpg",
        title: "狼人杀",
      },
    ],
    "zh-CN",
  );

  assert.deepEqual(items[0], {
    href: "/updates/v2_7",
    id: "v2-7-release",
    image: "/custom-release.jpg",
    title: "Friemi v2.7 更新",
  });
  assert.equal(items[1]?.id, "werewolf");
});

test("mobile home inserts v2.7 when configured news has no release item", () => {
  const items = prioritizeLatestVersionTopNewsItem(
    [
      {
        href: "/game-tools/werewolf",
        id: "werewolf",
        image: "/werewolf.jpg",
        title: "Werewolf",
      },
    ],
    "en",
  );

  assert.equal(items[0]?.href, "/updates/v2_7");
  assert.equal(items[0]?.title, "Friemi v2.7 updates");
  assert.equal(items[1]?.id, "werewolf");
});
