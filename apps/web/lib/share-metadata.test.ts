import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildPageShareMetadata,
  getRequestBaseUrl,
  getShareDescription,
  getShareLocationLabel,
  resolveShareImageUrl,
  truncateShareText,
} from "./share-metadata";

function createHeaders(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

test("getRequestBaseUrl prefers forwarded preview host", () => {
  const baseUrl = getRequestBaseUrl(
    createHeaders({
      "x-forwarded-host": "preview.example.com",
      "x-forwarded-proto": "https",
    }),
  );

  assert.equal(baseUrl, "https://preview.example.com");
});

test("buildCanonicalUrl preserves private activity access token", () => {
  const url = buildCanonicalUrl(
    "https://nextfunclub.example",
    "/zh-CN/activities/activity_1",
    { access: "token value" },
  );

  assert.equal(
    url,
    "https://nextfunclub.example/zh-CN/activities/activity_1?access=token+value",
  );
});

test("buildPageShareMetadata creates rich metadata for public entry pages", () => {
  const metadata = buildPageShareMetadata({
    baseUrl: "https://nextfunclub.example",
    description: "Discover activities and crews with friends.",
    path: "/en/home",
    title: "Next Fun · What's next? Fun begins.",
  });

  assert.equal(metadata.title, "Next Fun · What's next? Fun begins.");
  assert.equal(metadata.description, "Discover activities and crews with friends.");
  assert.equal(metadata.openGraph?.url, "https://nextfunclub.example/en/home");
  assert.equal(metadata.openGraph?.siteName, "Next Fun");
  assert.deepEqual(metadata.twitter?.images, [
    "https://nextfunclub.example/logo.png",
  ]);
});

test("getShareDescription removes raw URLs and keeps useful event context", () => {
  const description = getShareDescription({
    dateLabel: "6月20日 18:00-20:00",
    description:
      "官方链接：https://example.com/very/long/url\n一起去看展，然后找地方吃饭。",
    locationLabel: "Paris · 12 rue Exemple",
    priceLabel: "免费",
  });

  assert.equal(description.includes("https://"), false);
  assert.equal(description.includes("6月20日"), true);
  assert.equal(description.includes("Paris"), true);
});

test("getShareLocationLabel avoids duplicating city names", () => {
  assert.equal(
    getShareLocationLabel({
      address: "Paris Expo Porte de Versailles",
      city: "Paris",
    }),
    "Paris Expo Porte de Versailles",
  );
  assert.equal(
    getShareLocationLabel({
      address: "12 rue Exemple",
      city: "Paris",
    }),
    "Paris · 12 rue Exemple",
  );
});

test("resolveShareImageUrl falls back when a remote image is not HTTPS", () => {
  assert.equal(
    resolveShareImageUrl(
      "http://images.example.com/event.jpg",
      "https://nextfunclub.example",
    ),
    "https://nextfunclub.example/logo.png",
  );
  assert.equal(
    resolveShareImageUrl(
      "https://images.example.com/event.jpg",
      "https://nextfunclub.example",
    ),
    "https://images.example.com/event.jpg",
  );
});

test("resolveShareImageUrl proxies known hotlink-protected HTTPS covers", () => {
  assert.equal(
    resolveShareImageUrl(
      "https://cdn.sortiraparis.com/images/80/66131/1121860-event.jpg",
      "https://nextfunclub.example",
    ),
    "https://nextfunclub.example/api/activity-cover-proxy?url=https%3A%2F%2Fcdn.sortiraparis.com%2Fimages%2F80%2F66131%2F1121860-event.jpg",
  );
});

test("truncateShareText keeps metadata fields bounded", () => {
  assert.equal(truncateShareText("abcdef", 6), "abcdef");
  assert.equal(truncateShareText("abcdef", 5), "ab...");
});
