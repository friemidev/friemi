import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  extractSortirChineseStreetAddress,
  extractSortirFrenchStreetAddress,
  parseChineseDate,
  parseEventbriteEventHtml,
  parseEventbriteStructuredModules,
  parseFeverupEventHtml,
  parseMeetupEventHtml,
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
  assert.match(activity.description, /约十五位知名作家/);
  assert.doesNotMatch(activity.description, /^2026年6月6日与7日/);
});

test("extractSortirChineseStreetAddress parses Albert street in Paris 13e", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "sortir-chinese-vietnam-address-snippet.html"),
    "utf8",
  );
  const address = extractSortirChineseStreetAddress(html);

  assert.equal(address, "19 Rue Albert, 75013 Paris");
});

test("extractSortirFrenchStreetAddress maps arrondissement to postal code", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "sortir-french-street-snippet.html"),
    "utf8",
  );
  const address = extractSortirFrenchStreetAddress(html);

  assert.equal(address, "Rue Albert, 75013 Paris");
});

test("parseSortirAParisArticleHtml prefers article body over short NewsArticle summary", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "sortiraparis-article-snippet.html"),
    "utf8",
  );
  const activity = parseSortirAParisArticleHtml(
    html,
    "https://www.sortiraparis.com/zh/articles/346020-sample",
  );

  assert.ok(activity);
  assert.ok(activity.description.length > 80);
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

test("parseMeetupEventHtml reads full description from __NEXT_DATA__", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "meetup-nextdata-snippet.html"),
    "utf8",
  );
  const sourceUrl =
    "https://www.meetup.com/fr-fr/speakenglishtoulouse/events/314770849/";
  const activity = parseMeetupEventHtml(html, sourceUrl);

  assert.ok(activity);
  assert.match(activity.description, /Please note:/);
  assert.match(activity.description, /This event is free/);
  assert.doesNotMatch(activity.description, /practice your E$/);
  assert.equal(activity.city, "Toulouse");
  assert.match(activity.address, /Baraka Jeux/);
});

test("parseEventbriteStructuredModules splits programme into itinerary lines", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const modules = JSON.parse(
    readFileSync(join(fixtureDir, "eventbrite-nuit-blanche-modules.json"), "utf8"),
  );
  const parsed = parseEventbriteStructuredModules(modules);

  assert.ok(parsed);
  assert.match(parsed?.description ?? "", /étoiles/i);
  assert.match(parsed?.itinerary ?? "", /19h.*marche/i);
  assert.match(parsed?.itinerary ?? "", /20h/i);
  assert.match(parsed?.itinerary ?? "", /Entracte/i);
  assert.equal((parsed?.itinerary?.split("\n") ?? []).length, 4);
});

test("parseEventbriteEventHtml merges structuredContent modules into description", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "eventbrite-nextdata-snippet.html"),
    "utf8",
  );
  const sourceUrl =
    "https://www.eventbrite.fr/e/nuit-blanche-des-etoiles-tickets-1983356647122";
  const activity = parseEventbriteEventHtml(html, sourceUrl);

  assert.ok(activity);
  assert.match(activity.description, /Le programme/);
  assert.match(activity.description, /Dominique Leglu/);
  assert.doesNotMatch(
    activity.description,
    /^Les étoiles, témoins silencieux/,
  );
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

test("parseFeverupEventHtml builds ticket price range and venue address", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "feverup-renaissance-snippet.html"),
    "utf8",
  );
  const activity = parseFeverupEventHtml(
    html,
    "https://feverup.com/m/569949",
  );

  assert.ok(activity);
  assert.equal(activity.source, "feverup");
  assert.equal(activity.category, "EXHIBITION");
  assert.equal(activity.capacity, 99);
  assert.match(activity.title, /Renaissance/i);
  assert.match(activity.address, /Atelier des Lumières/);
  assert.match(activity.address, /38 Rue Saint-Maur/);
  assert.equal(activity.priceType, "RANGE");
  assert.match(activity.priceText, /12,50\s*€/);
  assert.match(activity.priceText, /19,50\s*€/);
  assert.match(activity.description, /Renaissance italienne/);
});

test("parseFeverupEventHtml ignores add-ons when computing zone price range", () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const html = readFileSync(
    join(fixtureDir, "feverup-candlelight-snippet.html"),
    "utf8",
  );
  const activity = parseFeverupEventHtml(
    html,
    "https://feverup.com/m/619306",
  );

  assert.ok(activity);
  assert.equal(activity.category, "MUSIC");
  assert.equal(activity.capacity, 99);
  assert.match(activity.title, /Seigneur des Anneaux/i);
  assert.match(activity.address, /Maison de l'Océan/);
  assert.match(activity.address, /195 Rue Saint-Jacques/);
  assert.equal(activity.priceType, "RANGE");
  assert.match(activity.priceText, /25\s*€/);
  assert.match(activity.priceText, /58,50\s*€/);
  assert.doesNotMatch(activity.priceText, /10\s*€/);
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
