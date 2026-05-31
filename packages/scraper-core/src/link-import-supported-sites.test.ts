import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  extractJsonLdOfferPrice,
  linkImportDefaultCapacity,
  parseEventbriteEventHtml,
  parseFeverupEventHtml,
  parseMeetupEventHtml,
  parsePlayInParisEventHtml,
  parseSortirAParisArticleHtml,
} from "./link-import";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function readFixture(name: string) {
  return readFileSync(join(fixtureDir, name), "utf8");
}

type SiteParserCase = {
  fixture: string;
  id: string;
  parse: (html: string, sourceUrl: string) => ReturnType<typeof parseFeverupEventHtml>;
  sourceUrl: string;
  expect: {
    address?: RegExp;
    category?: string;
    capacity?: number;
    priceText?: RegExp;
    priceType?: "FIXED" | "FREE" | "RANGE";
    title?: RegExp;
  };
};

const siteParserCases: SiteParserCase[] = [
  {
    id: "feverup-renaissance",
    fixture: "feverup-renaissance-snippet.html",
    sourceUrl: "https://feverup.com/m/569949",
    parse: parseFeverupEventHtml,
    expect: {
      title: /Renaissance/i,
      category: "EXHIBITION",
      capacity: linkImportDefaultCapacity,
      priceType: "RANGE",
      priceText: /12,50\s*€.*19,50\s*€/,
      address: /38 Rue Saint-Maur/,
    },
  },
  {
    id: "feverup-candlelight",
    fixture: "feverup-candlelight-snippet.html",
    sourceUrl: "https://feverup.com/m/619306",
    parse: parseFeverupEventHtml,
    expect: {
      title: /Seigneur des Anneaux/i,
      category: "MUSIC",
      priceType: "RANGE",
      priceText: /25\s*€.*58,50\s*€/,
      address: /195 Rue Saint-Jacques/,
    },
  },
  {
    id: "eventbrite-fr",
    fixture: "eventbrite-festival-snippet.html",
    sourceUrl:
      "https://www.eventbrite.fr/e/nuit-blanche-des-etoiles-tickets-1983356647122",
    parse: parseEventbriteEventHtml,
    expect: {
      title: /Nuit blanche/i,
      priceType: "FREE",
    },
  },
  {
    id: "eventbrite-uk-hololive",
    fixture: "eventbrite-hololive-aggregate-offer-snippet.html",
    sourceUrl:
      "https://www.eventbrite.co.uk/e/paris-hololive-english-3rd-concert-all-for-one-screening-tickets-1988723487486",
    parse: parseEventbriteEventHtml,
    expect: {
      title: /hololive/i,
      category: "MUSIC",
      priceType: "RANGE",
      priceText: /58\.86.*116\.52.*EUR/i,
      address: /UGC Ciné Cité Bercy/,
    },
  },
  {
    id: "meetup",
    fixture: "meetup-nextdata-snippet.html",
    sourceUrl:
      "https://www.meetup.com/fr-fr/speakenglishtoulouse/events/314770849/",
    parse: parseMeetupEventHtml,
    expect: {
      title: /.+/,
      address: /Baraka Jeux/,
    },
  },
  {
    id: "playinparis",
    fixture: "playinparis-event-snippet.html",
    sourceUrl: "https://playinparis.com/event/vincennes-en-anciennes/",
    parse: parsePlayInParisEventHtml,
    expect: {
      title: /Vincennes|老爷车/i,
      priceType: "FREE",
      address: /Vincennes/i,
    },
  },
  {
    id: "sortiraparis",
    fixture: "sortiraparis-article-snippet.html",
    sourceUrl:
      "https://www.sortiraparis.com/zh/articles/346020-sample",
    parse: parseSortirAParisArticleHtml,
    expect: {
      title: /Chateaubriand|夏多布里昂/i,
      address: /Chateaubriand/,
    },
  },
];

for (const siteCase of siteParserCases) {
  test(`supported site parser: ${siteCase.id}`, () => {
    const html = readFixture(siteCase.fixture);
    const activity = siteCase.parse(html, siteCase.sourceUrl);

    assert.ok(activity, `${siteCase.id} should parse`);

    if (siteCase.expect.title) {
      assert.match(activity.title, siteCase.expect.title);
    }

    if (siteCase.expect.address) {
      assert.match(activity.address, siteCase.expect.address);
    }

    if (siteCase.expect.category) {
      assert.equal(activity.category, siteCase.expect.category);
    }

    if (siteCase.expect.capacity !== undefined) {
      assert.equal(activity.capacity, siteCase.expect.capacity);
    }

    if (siteCase.expect.priceType) {
      assert.equal(activity.priceType, siteCase.expect.priceType);
    }

    if (siteCase.expect.priceText) {
      assert.match(activity.priceText, siteCase.expect.priceText);
    }
  });
}

test("extractJsonLdOfferPrice reads AggregateOffer low/high range", () => {
  const offerPrice = extractJsonLdOfferPrice({
    "@type": "AggregateOffer",
    lowPrice: "58.86",
    highPrice: "116.52",
    priceCurrency: "EUR",
  });

  assert.ok(offerPrice);
  assert.equal(offerPrice?.priceType, "RANGE");
  assert.match(offerPrice?.priceText ?? "", /58\.86.*116\.52.*EUR/);
});

test("extractJsonLdOfferPrice returns null when offer data is missing", () => {
  assert.equal(extractJsonLdOfferPrice(undefined), null);
  assert.equal(extractJsonLdOfferPrice({}), null);
});

test("parseFeverupEventHtml falls back when ticket-selector-config is missing", () => {
  const url = "https://feverup.com/m/619306";
  const html = readFixture("feverup-candlelight-snippet.html").replace(
    '"ticket-selector-config"',
    '"ticket-selector-config-removed"',
  );
  const activity = parseFeverupEventHtml(html, url);

  assert.ok(activity);
  assert.equal(activity.priceType, "FIXED");
  assert.match(activity.priceText, /25/);
});
