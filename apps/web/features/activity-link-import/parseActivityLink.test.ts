import assert from "node:assert/strict";
import test from "node:test";
import { extractJsonLdOfferPrice } from "@chill-club/scraper-core";
import { isEventbriteHost, parseActivityLink } from "./parseActivityLink";

test("isEventbriteHost accepts international Eventbrite domains", () => {
  assert.equal(isEventbriteHost("www.eventbrite.fr"), true);
  assert.equal(isEventbriteHost("www.eventbrite.co.uk"), true);
  assert.equal(isEventbriteHost("www.eventbrite.com"), true);
  assert.equal(isEventbriteHost("feverup.com"), false);
});

test("extractJsonLdOfferPrice maps AggregateOffer to import price range", () => {
  const offerPrice = extractJsonLdOfferPrice({
    "@type": "AggregateOffer",
    lowPrice: 58.86,
    highPrice: 116.52,
    priceCurrency: "EUR",
  });

  assert.equal(offerPrice?.priceType, "RANGE");
  assert.match(offerPrice?.priceText ?? "", /58\.86 – 116\.52 EUR/);
});

test("parseActivityLink falls back to generic HTTPS event pages", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      `<!doctype html>
      <html>
        <head>
          <meta property="og:site_name" content="Example Events" />
          <meta
            property="og:url"
            content="https://events.example.org/community-board-game-night"
          />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Event",
              "name": "Community Board Game Night",
              "description": "Meet new players and play light strategy games.",
              "startDate": "2026-08-12T18:30:00+02:00",
              "endDate": "2026-08-12T21:00:00+02:00",
              "image": "https://example.org/cover.jpg",
              "location": {
                "@type": "Place",
                "name": "Cafe Demo",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "12 Rue Demo",
                  "postalCode": "75010",
                  "addressLocality": "Paris"
                }
              }
            }
          </script>
        </head>
        <body></body>
      </html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
        status: 200,
      },
    );

  const preview = await parseActivityLink("https://example.org/events/1", "en");

  assert.equal(preview.siteName, "Example Events");
  assert.equal(
    preview.sourceUrl,
    "https://events.example.org/community-board-game-night",
  );
  assert.equal(preview.values.title, "Community Board Game Night");
  assert.equal(preview.values.category, "BOARD_GAME");
  assert.equal(preview.values.startAt, "2026-08-12T18:30");
  assert.equal(preview.values.endAt, "2026-08-12T21:00");
  assert.match(preview.values.address ?? "", /Cafe Demo/);
  assert.equal(preview.values.coverImageUrl, "https://example.org/cover.jpg");
});

test("parseActivityLink does not use article publish time as event time", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      `<!doctype html>
      <html>
        <head>
          <meta property="og:type" content="article" />
          <meta property="og:site_name" content="Example Magazine" />
          <meta property="og:title" content="A free cinema arrives in Paris" />
          <meta
            property="og:description"
            content="The event runs from 24 to 27 September 2026."
          />
          <meta
            property="og:image"
            content="https://example.org/article-cover.jpg"
          />
          <meta
            property="article:published_time"
            content="2026-07-08T12:00:00+02:00"
          />
        </head>
        <body>
          <time datetime="2026-07-08T12:00:00+02:00">8 July 2026</time>
        </body>
      </html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
        status: 200,
      },
    );

  const preview = await parseActivityLink("https://example.org/news/1", "en");

  assert.equal(preview.values.title, "A free cinema arrives in Paris");
  assert.equal(preview.values.startAt, undefined);
  assert.equal(preview.values.coverImageUrl, "https://example.org/article-cover.jpg");
  assert.ok(preview.missingFields.includes("startAt"));
});
