import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  parseChineseDate,
  parseEventbriteEventHtml,
  parsePlayInParisEventHtml,
  parseSortirAParisArticleHtml,
} from "./link-import";

test("parseChineseDate supports 与 between dates", () => {
  const parsed = parseChineseDate("2026年6月6日与7日");

  assert.equal(parsed?.start.getUTCFullYear(), 2026);
  assert.equal(parsed?.start.getUTCMonth(), 5);
  assert.equal(parsed?.start.getUTCDate(), 6);
  assert.equal(parsed?.end?.getUTCDate(), 7);
});

test("parseSortirAParisArticleHtml reads microdata dates and address", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "sortiraparis-article-snippet.html"),
    "utf8",
  );
  const sourceUrl =
    "https://www.sortiraparis.com/zh/zai-bali-canguan-shenme/sanbu/articles/346020-sample";
  const activity = parseSortirAParisArticleHtml(html, sourceUrl);

  assert.ok(activity);
  assert.match(activity.title, /夏多布里昂|Chateaubriand/i);
  assert.equal(
    activity.startAt,
    new Date("2026-06-06T00:00:00+02:00").toISOString(),
  );
  assert.match(activity.address, /87 Rue de Chateaubriand/);
  assert.match(activity.address, /Chatenay Malabry/i);
  assert.match(
    activity.coverImageUrl ?? "",
    /cdn\.sortiraparis\.com\/images\/1001\//,
  );
});

test("parsePlayInParisEventHtml reads Event JSON-LD from event page", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "playinparis-event-snippet.html"),
    "utf8",
  );
  const sourceUrl = "https://playinparis.com/event/vincennes-en-anciennes/";
  const activity = parsePlayInParisEventHtml(html, sourceUrl);

  assert.ok(activity);
  assert.match(activity.title, /老爷车|Vincennes/i);
  assert.equal(activity.priceType, "FREE");
  assert.match(activity.address, /Vincennes/i);
  assert.ok(activity.coverImageUrl?.includes("vincennes-en-anciennes"));
});

test("parseEventbriteEventHtml reads Festival JSON-LD and decodes Next image URLs", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "eventbrite-festival-snippet.html"),
    "utf8",
  );
  const sourceUrl =
    "https://www.eventbrite.fr/e/nuit-blanche-des-etoiles-tickets-1983356647122";
  const activity = parseEventbriteEventHtml(html, sourceUrl);

  assert.ok(activity);
  assert.match(activity.title, /Nuit blanche/i);
  assert.equal(activity.source, "eventbrite");
  assert.equal(
    activity.coverImageUrl,
    "https://img.evbuc.com/images/123456789/123456789/1/original.jpg",
  );
});

test("parsePlayInParisEventHtml falls back to og:image when JSON-LD image is unresolved", () => {
  const html = `<!DOCTYPE html><html><head>
    <meta property="og:image" content="https://playinparis.com/wp-content/uploads/2025/10/fallback.webp" />
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Event","name":"Test","startDate":"2025-10-05T08:00:00+02:00","image":{"@id":"https://playinparis.com/event/test/#primaryimage"}}]}</script>
  </head><body></body></html>`;
  const activity = parsePlayInParisEventHtml(
    html,
    "https://playinparis.com/event/test/",
  );

  assert.equal(
    activity?.coverImageUrl,
    "https://playinparis.com/wp-content/uploads/2025/10/fallback.webp",
  );
});
