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
  parseParisFrEventHtml,
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
    id: "eventbrite-yoga-fixed",
    fixture: "eventbrite-yoga-fixed-snippet.html",
    sourceUrl:
      "https://www.eventbrite.com/e/paris-yoga-club-may-31-with-lucy-tickets-1990485031311",
    parse: parseEventbriteEventHtml,
    expect: {
      title: /Paris Yoga Club/i,
      category: "SPORTS",
      priceType: "FIXED",
      priceText: /7\.58.*EUR/i,
      address: /Jivamukti/i,
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
    id: "paris-fr-ogrelet",
    fixture: "paris-fr-ogrelet-snippet.html",
    sourceUrl: "https://www.paris.fr/evenements/l-ogrelet-110475",
    parse: parseParisFrEventHtml,
    expect: {
      title: /Ogrelet/i,
      category: "THEATER",
      priceType: "RANGE",
      priceText: /12\.95.*16\.5/i,
      address: /Théâtre Essaïon/i,
    },
  },
  {
    id: "paris-fr-passions-expo",
    fixture: "paris-fr-passions-expo-snippet.html",
    sourceUrl:
      "https://www.paris.fr/evenements/passions-l-expo-poetico-drole-de-guillaume-blot-108919",
    parse: parseParisFrEventHtml,
    expect: {
      title: /PASSIONS/i,
      category: "EXHIBITION",
      priceType: "FREE",
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
