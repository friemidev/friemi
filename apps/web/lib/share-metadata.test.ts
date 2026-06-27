import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildPageShareMetadata,
  buildTeamShareImageUrl,
  buildTeamShareMetadata,
  getRequestBaseUrl,
  getShareDescription,
  getShareLocationLabel,
  getTeamShareDescription,
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
    "https://friemi.example",
    "/zh-CN/activities/activity_1",
    { access: "token value" },
  );

  assert.equal(
    url,
    "https://friemi.example/zh-CN/activities/activity_1?access=token+value",
  );
});

test("buildPageShareMetadata creates rich metadata for public entry pages", () => {
  const metadata = buildPageShareMetadata({
    baseUrl: "https://friemi.example",
    description: "Discover activities and crews with friends.",
    path: "/en/home",
    title: "Friemi · What's next? Fun begins.",
  });

  assert.equal(metadata.title, "Friemi · What's next? Fun begins.");
  assert.equal(
    metadata.description,
    "Discover activities and crews with friends.",
  );
  assert.equal(metadata.openGraph?.url, "https://friemi.example/en/home");
  assert.equal(metadata.openGraph?.siteName, "Friemi");
  assert.deepEqual(metadata.twitter?.images, [
    "https://friemi.example/brand/v2_1/friemi-og-default-1200x630.png",
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

test("getTeamShareDescription uses compact team status context", () => {
  const description = getTeamShareDescription({
    capacity: 8,
    dateLabel: "6月20日 18:00-20:00",
    locale: "zh-CN",
    locationLabel: "Paris · 12 rue Exemple",
    participantCount: 3,
    priceLabel: "免费",
  });

  assert.equal(description.includes("3/8 人已加入"), true);
  assert.equal(description.includes("6月20日"), true);
  assert.equal(description.includes("Paris"), true);
  assert.equal(description.includes("搭子"), false);
});

test("buildTeamShareImageUrl preserves private activity access token", () => {
  const imageUrl = buildTeamShareImageUrl({
    accessToken: "private token",
    activityId: "activity_1",
    baseUrl: "https://friemi.example",
    locale: "zh-CN",
  });

  assert.equal(
    imageUrl,
    "https://friemi.example/api/share/team-card?activityId=activity_1&locale=zh-CN&access=private+token",
  );
});

test("buildTeamShareImageUrl supports WeChat thumbnail variant", () => {
  const imageUrl = buildTeamShareImageUrl({
    activityId: "activity_1",
    baseUrl: "https://friemi.example",
    locale: "zh-CN",
    variant: "wechat",
  });

  assert.equal(
    imageUrl,
    "https://friemi.example/api/share/team-card?activityId=activity_1&locale=zh-CN&variant=wechat",
  );
});

test("buildTeamShareMetadata puts WeChat cover image first for group pages", () => {
  const metadata = buildTeamShareMetadata({
    canonicalUrl: "https://friemi.example/zh-CN/activities/activity_1",
    capacity: 8,
    coverImageUrl: "https://images.example.com/team-cover.jpg",
    dateLabel: "6月20日 18:00",
    locale: "zh-CN",
    locationLabel: "Paris",
    participantCount: 3,
    shareImageUrl:
      "https://friemi.example/api/share/team-card?activityId=activity_1&locale=zh-CN",
    title: "周末野餐组局",
    wechatShareImageUrl: "https://images.example.com/team-cover.jpg",
  });
  const images = metadata.openGraph?.images;

  assert.ok(Array.isArray(images));
  const imageObjects = images as Array<{ url: string; width: number }>;

  assert.equal(
    imageObjects[0]?.url,
    "https://images.example.com/team-cover.jpg",
  );
  assert.equal(imageObjects[0]?.width, 1200);
  assert.equal(imageObjects[1]?.width, 1200);
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
      "https://friemi.example",
    ),
    "https://friemi.example/brand/v2_1/friemi-og-default-1200x630.png",
  );
  assert.equal(
    resolveShareImageUrl(
      "https://images.example.com/event.jpg",
      "https://friemi.example",
    ),
    "https://images.example.com/event.jpg",
  );
});

test("resolveShareImageUrl proxies known hotlink-protected HTTPS covers", () => {
  assert.equal(
    resolveShareImageUrl(
      "https://cdn.sortiraparis.com/images/80/66131/1121860-event.jpg",
      "https://friemi.example",
    ),
    "https://friemi.example/api/activity-cover-proxy?url=https%3A%2F%2Fcdn.sortiraparis.com%2Fimages%2F80%2F66131%2F1121860-event.jpg",
  );
});

test("truncateShareText keeps metadata fields bounded", () => {
  assert.equal(truncateShareText("abcdef", 6), "abcdef");
  assert.equal(truncateShareText("abcdef", 5), "ab...");
});
