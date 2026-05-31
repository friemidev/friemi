import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityDescriptionWithSource,
  clampActivityDescription,
} from "./activity-description";

test("buildActivityDescriptionWithSource keeps source suffix within max length", () => {
  const longBody = "活动内容。".repeat(900);
  const sourceUrl =
    "https://www.sortiraparis.com/zh/articles/329543-bonjour-vietnam-2026-zai-ba-li-ju-xing-de-mian-fei-yue-nan-wen-hua-zhou-mo";
  const result = buildActivityDescriptionWithSource({
    body: longBody,
    fallbackDescription: "fallback",
    maxLength: 3000,
    sourceLabel: "来源链接",
    sourceUrl,
  });

  assert.ok(result.length <= 3000);
  assert.match(result, /来源链接:\s*https:\/\/www\.sortiraparis\.com/i);
  assert.ok(result.endsWith(sourceUrl));
});

test("buildActivityDescriptionWithSource removes duplicate source suffix before rebuild", () => {
  const sourceUrl = "https://example.com/event/1";
  const first = buildActivityDescriptionWithSource({
    body: "正文",
    fallbackDescription: "fallback",
    maxLength: 3000,
    sourceLabel: "来源链接",
    sourceUrl,
  });
  const second = buildActivityDescriptionWithSource({
    body: first,
    fallbackDescription: "fallback",
    maxLength: 3000,
    sourceLabel: "来源链接",
    sourceUrl,
  });

  assert.equal(second.match(/来源链接:/g)?.length, 1);
  assert.ok(second.length <= 3000);
});

test("clampActivityDescription preserves trailing source suffix", () => {
  const sourceUrl = "https://example.com/event/2";
  const description = `${"描述".repeat(1200)}\n\n来源链接: ${sourceUrl}`;
  const clamped = clampActivityDescription(description, 3000);

  assert.ok(clamped.length <= 3000);
  assert.match(clamped, new RegExp(`来源链接: ${sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
});
