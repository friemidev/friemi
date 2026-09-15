import assert from "node:assert/strict";
import test from "node:test";
import { getMobileHomeTopNewsConfigItems } from "./topNewsConfig";

test("mobile home top news uses fixed story routes and preview images", () => {
  assert.deepEqual(getMobileHomeTopNewsConfigItems("zh-CN"), [
    {
      href: "/top-news/werewolf",
      id: "werewolf-guide",
      image:
        "https://xyavgkupjnoumlzwkzoq.supabase.co/storage/v1/object/public/activity-covers/top-news/user_3FXtMqINQEiVVZMBm7Ypi2rgx7Q/09464e14-8214-45d0-ad9b-916cfacaf64d.png",
      title: "狼人杀线下开局指南",
    },
    {
      href: "/top-news/host-recruitment",
      id: "founding-host-recruitment",
      image:
        "https://xyavgkupjnoumlzwkzoq.supabase.co/storage/v1/object/public/activity-covers/top-news/user_3FXtMqINQEiVVZMBm7Ypi2rgx7Q/c5550d08-54d0-4c63-9232-99cca7fb832e.jpg",
      title: "Friemi 共创主理人招募",
    },
    {
      href: "/top-news/friemi",
      id: "friemi-intro",
      image:
        "https://xyavgkupjnoumlzwkzoq.supabase.co/storage/v1/object/public/activity-covers/top-news/user_3FXtMqINQEiVVZMBm7Ypi2rgx7Q/ab4ce5ac-1ac3-44a2-aab2-e648492b3e94.png",
      title: "发现活动，约朋友，一起出发",
    },
  ]);
});

test("mobile home top news localizes fixed story titles", () => {
  const englishItems = getMobileHomeTopNewsConfigItems("en");
  const frenchItems = getMobileHomeTopNewsConfigItems("fr");

  assert.equal(englishItems[0]?.title, "Werewolf game setup guide");
  assert.equal(englishItems[1]?.title, "Become a Friemi Founding Host");
  assert.equal(englishItems[2]?.title, "Discover Friemi");
  assert.equal(frenchItems[0]?.title, "Guide de lancement Loups-garous");
  assert.equal(frenchItems[1]?.title, "Devenez hôte fondateur Friemi");
  assert.equal(frenchItems[2]?.title, "Découvrez Friemi");
});
