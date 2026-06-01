import assert from "node:assert/strict";
import test from "node:test";
import { extractJsonLdOfferPrice } from "@chill-club/scraper-core";
import { isEventbriteHost } from "./parseActivityLink";

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
