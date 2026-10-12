import assert from "node:assert/strict";
import test from "node:test";
import { createDiceGameResponse } from "./response";

const gameAssets = [
  "app.js", "bluff-engine.js", "dice-sprites.js", "style.css", "dice-sprites.css",
  ...Array.from({ length: 6 }, (_, index) => `assets/dice-3d/roll-${index + 1}.webp`),
  ...["idle", "thinking", "happy", "sad"].flatMap((mood) => [
    `assets/cats/cloud-${mood}.svg`,
    ...["baker", "scholar", "captain", "cloud"].map((cat) => `assets/cats/players/${cat}-${mood}.svg`),
  ]),
];

test("production serves the playable game with localized search metadata", async () => {
  for (const [locale, title, single, online] of [["zh-CN", "在线骰子游戏网页版", "单人模式", "多人模式"], ["en", "Online Dice Game for Web", "Single player", "Multiplayer"], ["fr", "Jeu de dés en ligne sur navigateur", "Solo", "Multijoueur"]]) {
    for (const entry of [undefined, ["index.html"]]) {
      const response = await createDiceGameResponse(locale, entry, true, true);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes(title));
      assert.ok(html.includes('id="game-table"'));
      assert.ok(html.includes('<script src="app.js"'));
      assert.ok(html.includes(`href="/${locale}/game-tools/dice/online"`));
      assert.ok(html.includes(`data-single-label="${single}"`));
      assert.ok(html.includes(online));
      assert.ok(!html.includes("本机练习") && !html.includes("和朋友玩"));
      assert.ok(html.includes('data-preview-label=""'));
      assert.ok(!/敬请期待|Coming soon|Bientôt disponible/.test(html));
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal(response.headers.get("X-Robots-Tag"), null);
      assert.ok(html.includes('rel="canonical"'));
      assert.ok(html.includes(`/${locale}/game-tools/dice`));
      assert.ok(html.includes('name="description"'));
      assert.ok(html.includes('hreflang="x-default"'));
      assert.ok(html.includes('property="og:url"'));
      assert.ok(!html.includes('name="keywords"'));
      assert.ok(!html.includes("__DICE_"));
    }
  }
});

test("every shipped game asset works in production and preview", async () => {
  for (const production of [false, true]) {
    for (const asset of gameAssets) {
      const response = await createDiceGameResponse("zh-CN", asset.split("/"), true, production);
      assert.equal(response.status, 200, asset);
      assert.ok((await response.arrayBuffer()).byteLength > 0, asset);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
    }
  }
});

test("preview documents resolve all locales to the guarded asset path and matching hub", async () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const response = await createDiceGameResponse(locale, undefined, true);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(`<base href="/${locale}/game-tools/dice/"`));
    assert.ok(html.includes(`data-hub-href="/${locale}/game-tools"`));
    assert.ok(html.includes(`href="/${locale}/game-tools/dice/online"`));
    assert.ok(html.includes('name="description"'));
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.ok(!html.includes("__DICE_"));
  }
});

test("unlisted files, traversal and unsupported locales are never served", async () => {
  for (const asset of ["../response.ts", "assets/../../app.js", "README.md", "app.js/extra", "%2e%2e/response.ts"]) {
    assert.equal((await createDiceGameResponse("zh-CN", asset.split("/"), true)).status, 404, asset);
  }
  assert.equal((await createDiceGameResponse("xx", undefined, true)).status, 404);
  assert.equal((await createDiceGameResponse("zh-CN", undefined, false)).status, 404);
  assert.equal((await createDiceGameResponse("zh-CN", ["app.js"], false)).status, 404);
});
