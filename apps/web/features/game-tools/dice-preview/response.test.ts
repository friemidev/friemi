import assert from "node:assert/strict";
import test from "node:test";
import { createDicePreviewResponse } from "./response";

const gameAssets = [
  "app.js", "bluff-engine.js", "dice-sprites.js", "style.css", "dice-sprites.css",
  ...Array.from({ length: 6 }, (_, index) => `assets/dice-3d/roll-${index + 1}.webp`),
  ...["idle", "thinking", "happy", "sad"].flatMap((mood) => [
    `assets/cats/cloud-${mood}.svg`,
    ...["baker", "scholar", "captain", "cloud"].map((cat) => `assets/cats/players/${cat}-${mood}.svg`),
  ]),
];

test("production shows the localized waiting page without a playable document", async () => {
  for (const [locale, label] of [["zh-CN", "敬请期待"], ["en", "Coming soon"], ["fr", "Bientôt disponible"]]) {
    for (const entry of [undefined, ["index.html"]]) {
      const response = await createDicePreviewResponse(locale, entry, false);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes(label));
      assert.ok(html.includes(`href="/${locale}/game-tools"`));
      assert.ok(!html.includes("<script"));
      assert.ok(!html.includes('id="game-table"'));
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
  }
});

test("every shipped game asset works in preview and is denied in production", async () => {
  for (const asset of gameAssets) {
    const preview = await createDicePreviewResponse("zh-CN", asset.split("/"), true);
    assert.equal(preview.status, 200, asset);
    assert.ok((await preview.arrayBuffer()).byteLength > 0, asset);
    assert.equal(preview.headers.get("X-Content-Type-Options"), "nosniff");
    const production = await createDicePreviewResponse("zh-CN", asset.split("/"), false);
    assert.equal(production.status, 404, asset);
  }
});

test("preview documents resolve all locales to the guarded asset path and matching hub", async () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const response = await createDicePreviewResponse(locale, undefined, true);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(`<base href="/${locale}/game-tools/dice/"`));
    assert.ok(html.includes(`data-hub-href="/${locale}/game-tools"`));
    assert.ok(!html.includes("__DICE_"));
  }
});

test("unlisted files, traversal and unsupported locales are never served", async () => {
  for (const asset of ["../response.ts", "assets/../../app.js", "README.md", "app.js/extra", "%2e%2e/response.ts"]) {
    assert.equal((await createDicePreviewResponse("zh-CN", asset.split("/"), true)).status, 404, asset);
  }
  assert.equal((await createDicePreviewResponse("xx", undefined, true)).status, 404);
});
