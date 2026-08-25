import assert from "node:assert/strict";
import test from "node:test";
import { getSequentialMobilePrefetchTargets } from "./mobile-route-prefetch";

test("home prefetches the other four bottom navigation pages in order", () => {
  assert.deepEqual(
    getSequentialMobilePrefetchTargets({
      locale: "zh-CN",
      pathname: "/zh-CN/mobile-home",
    }),
    [
      "/zh-CN/lobby",
      "/zh-CN/activities/new",
      "/zh-CN/footprints?tab=moment",
      "/zh-CN/profile",
    ],
  );
});

test("a bottom navigation page is not prefetched again", () => {
  assert.deepEqual(
    getSequentialMobilePrefetchTargets({
      locale: "fr",
      pathname: "/fr/lobby",
    }),
    [
      "/fr/mobile-home",
      "/fr/activities/new",
      "/fr/footprints?tab=moment",
      "/fr/profile",
    ],
  );
});

test("world prioritizes its other tabs before the other bottom pages", () => {
  assert.deepEqual(
    getSequentialMobilePrefetchTargets({
      locale: "en",
      pathname: "/en/footprints",
      search: "tab=moment",
    }),
    [
      "/en/footprints?tab=message",
      "/en/footprints?tab=planet",
      "/en/mobile-home",
      "/en/lobby",
      "/en/activities/new",
      "/en/profile",
    ],
  );
});

test("world keeps the selected moment scope while prefetching that tab", () => {
  assert.deepEqual(
    getSequentialMobilePrefetchTargets({
      locale: "zh-CN",
      pathname: "/zh-CN/footprints",
      search: "tab=message&scope=following",
    }).slice(0, 2),
    [
      "/zh-CN/footprints?tab=moment&scope=following",
      "/zh-CN/footprints?tab=planet",
    ],
  );
});
