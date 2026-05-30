import { createHash } from "node:crypto";
import type { ScrapedActivity } from "./types";

function sha1(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

function makeStableId(source: string, url: string) {
  return `${source}_${sha1(url).slice(0, 16)}`;
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(input: string) {
  const entityMap: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (_, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return entityMap[entity] ?? _;
    },
  );
}

function stripHtml(input: string) {
  const decoded = decodeHtmlEntities(input)
    .replace(/\\[rn]/g, " ")
    .replace(/\\t/g, " ");
  return normalizeWhitespace(
    decoded
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractMetaContent(html: string, keys: string[]) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};

    for (const attrMatch of match[0].matchAll(
      /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g,
    )) {
      attrs[attrMatch[1].toLowerCase()] = decodeHtmlEntities(
        attrMatch[3] ?? attrMatch[4] ?? "",
      );
    }

    const key = (attrs.property || attrs.name || "").toLowerCase();
    const content = attrs.content;

    if (key && content && normalizedKeys.has(key)) {
      return content;
    }
  }

  return null;
}

function extractSortirArticleImage(
  html: string,
  articleImage: unknown,
  baseUrl: string,
) {
  const carouselMatch = html.match(
    /data-src="(https:\/\/cdn\.sortiraparis\.com\/images\/\d+\/[^"]+)"/i,
  );

  return (
    normalizeExternalImageUrl(carouselMatch?.[1]) ??
    resolvePageImageUrl(extractItempropMetaContent(html, "image"), baseUrl) ??
    normalizeExternalImageUrl(articleImage) ??
    extractPageImageUrl(html, baseUrl)
  );
}

function parseJsonLdBlocks(html: string) {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // ignore
    }
  }
  return blocks;
}

function collectJsonLdNodes(node: unknown, output: Record<string, unknown>[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLdNodes(item, output));
    return;
  }
  if (typeof node !== "object") return;
  const value = node as Record<string, unknown>;
  output.push(value);
  collectJsonLdNodes(value["@graph"], output);
  for (const child of Object.values(value)) {
    if (child !== value["@graph"]) {
      collectJsonLdNodes(child, output);
    }
  }
}

function flattenJsonLd(html: string) {
  const nodes: Record<string, unknown>[] = [];
  for (const block of parseJsonLdBlocks(html)) {
    collectJsonLdNodes(block, nodes);
  }
  return nodes;
}

function hasJsonLdType(value: Record<string, unknown>, typeName: string) {
  const type = value["@type"];
  const values = Array.isArray(type) ? type : [type];
  return values.some(
    (item) => String(item).toLowerCase() === typeName.toLowerCase(),
  );
}

function hasImportableEventJsonLdType(value: Record<string, unknown>) {
  const type = value["@type"];
  const values = Array.isArray(type) ? type : [type];

  return values.some((item) => {
    const normalized = String(item).toLowerCase();

    return (
      normalized === "event" ||
      normalized.endsWith("event") ||
      normalized === "festival" ||
      normalized.endsWith("festival")
    );
  });
}

function resolvePageImageUrl(rawUrl: string | null | undefined, baseUrl: string) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl, baseUrl);

    if (url.pathname.includes("/_next/image")) {
      const embedded = url.searchParams.get("url");

      if (embedded) {
        return normalizeExternalImageUrl(decodeURIComponent(embedded));
      }
    }

    return normalizeExternalImageUrl(url.toString());
  } catch {
    return normalizeExternalImageUrl(rawUrl);
  }
}

function extractPageImageUrl(html: string, baseUrl: string) {
  const metaImage =
    extractMetaContent(html, ["og:image", "twitter:image"]) ??
    extractItempropMetaContent(html, "image");

  return resolvePageImageUrl(metaImage, baseUrl);
}

function buildScrapedActivityFromJsonLdEvent(
  event: Record<string, unknown>,
  nodes: Record<string, unknown>[],
  html: string,
  sourceUrl: string,
  source: ScrapedActivity["source"],
): ScrapedActivity | null {
  const title =
    typeof event.name === "string" ? stripHtml(event.name) : "未命名活动";
  const description = cleanPromoText(
    typeof event.description === "string" ? stripHtml(event.description) : "",
  );
  const startAt =
    typeof event.startDate === "string"
      ? parseDateTimeString(event.startDate)
      : null;
  const endAt =
    typeof event.endDate === "string"
      ? parseDateTimeString(event.endDate)
      : null;

  if (!startAt) {
    return null;
  }

  const location = event.location as Record<string, unknown> | undefined;
  const locationName =
    location && typeof location.name === "string"
      ? stripHtml(location.name)
      : typeof location === "string"
        ? stripHtml(location)
        : "";
  const address =
    location?.address && typeof location.address === "object"
      ? [
          locationName,
          (location.address as Record<string, unknown>).streetAddress,
          (location.address as Record<string, unknown>).postalCode,
          (location.address as Record<string, unknown>).addressLocality,
          (location.address as Record<string, unknown>).addressCountry,
        ]
          .filter(Boolean)
          .map((part) => stripHtml(String(part)))
          .join(" · ")
      : locationName || "Paris";
  const offer = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  const price =
    offer && typeof offer === "object"
      ? (offer as Record<string, unknown>).price
      : undefined;
  const currency =
    offer && typeof offer === "object"
      ? (offer as Record<string, unknown>).priceCurrency
      : undefined;
  const priceText =
    price === undefined || price === null || price === ""
      ? "查看原文"
      : String(price) === "0"
        ? "免费"
        : currency
          ? `${price} ${currency}`
          : String(price);

  return {
    id: makeStableId(source, sourceUrl),
    source,
    sourceUrl,
    title,
    description: description || title,
    itinerary: null,
    type: "PUBLIC_EVENT",
    category: guessCategory(`${title} ${description}`),
    city: "Paris",
    destination: null,
    address,
    startAt: startAt.toISOString(),
    endAt: endAt?.toISOString() ?? null,
    capacity: 100,
    minParticipants: null,
    requiresApproval: false,
    priceType: guessPriceType(priceText),
    priceText,
    coverImageUrl:
      resolveJsonLdImage(nodes, event.image) ?? extractPageImageUrl(html, sourceUrl),
    status: "RECRUITING",
    visibility: "PUBLIC",
  };
}

export function parseStructuredEventHtml(
  html: string,
  sourceUrl: string,
  source: ScrapedActivity["source"],
): ScrapedActivity | null {
  const nodes = flattenJsonLd(html);
  const event = nodes.find((node) => hasImportableEventJsonLdType(node));

  if (!event) {
    return null;
  }

  return buildScrapedActivityFromJsonLdEvent(
    event,
    nodes,
    html,
    sourceUrl,
    source,
  );
}

type MeetupNextVenue = {
  address?: string;
  city?: string;
  country?: string;
  name?: string;
  state?: string;
};

type MeetupNextPhoto = {
  source?: string;
};

type MeetupNextEvent = {
  dateTime?: string;
  description?: string;
  displayPhoto?: MeetupNextPhoto;
  endTime?: string;
  featuredEventPhoto?: MeetupNextPhoto;
  title?: string;
  venue?: MeetupNextVenue;
};

function normalizePlainTextDescription(input: string) {
  return decodeHtmlEntities(input)
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMeetupNextDataEvent(html: string): MeetupNextEvent | null {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match) {
    return null;
  }

  try {
    const data = JSON.parse(match[1]) as {
      props?: { pageProps?: { event?: MeetupNextEvent } };
    };
    const event = data.props?.pageProps?.event;

    return event && typeof event === "object" ? event : null;
  } catch {
    return null;
  }
}

function formatMeetupVenueAddress(venue: MeetupNextVenue | undefined) {
  if (!venue) {
    return "Paris";
  }

  return [venue.name, venue.address, venue.city, venue.state, venue.country]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => stripHtml(String(part)))
    .join(" · ");
}

function parseMeetupEventFromNextData(
  event: MeetupNextEvent,
  html: string,
  sourceUrl: string,
): ScrapedActivity | null {
  const startAt = event.dateTime
    ? parseDateTimeString(event.dateTime)
    : null;

  if (!startAt) {
    return null;
  }

  const endAt = event.endTime ? parseDateTimeString(event.endTime) : null;
  const title =
    typeof event.title === "string"
      ? stripHtml(event.title)
      : "未命名活动";
  const description =
    typeof event.description === "string"
      ? cleanPromoTextMultiline(normalizePlainTextDescription(event.description))
      : "";
  const venue = event.venue;
  const city =
    venue && typeof venue.city === "string" && venue.city.trim()
      ? stripHtml(venue.city)
      : "Paris";
  const coverImageUrl =
    (typeof event.featuredEventPhoto?.source === "string"
      ? event.featuredEventPhoto.source
      : null) ||
    (typeof event.displayPhoto?.source === "string"
      ? event.displayPhoto.source
      : null) ||
    extractPageImageUrl(html, sourceUrl);
  const priceText = "查看原文";

  return {
    id: makeStableId("meetup", sourceUrl),
    source: "meetup",
    sourceUrl,
    title,
    description: description || title,
    itinerary: null,
    type: "PUBLIC_EVENT",
    category: guessCategory(`${title} ${description}`),
    city,
    destination: null,
    address: formatMeetupVenueAddress(venue),
    startAt: startAt.toISOString(),
    endAt: endAt?.toISOString() ?? null,
    capacity: 100,
    minParticipants: null,
    requiresApproval: false,
    priceType: guessPriceType(priceText),
    priceText,
    coverImageUrl,
    status: "RECRUITING",
    visibility: "PUBLIC",
  };
}

export function parseMeetupEventHtml(
  html: string,
  sourceUrl: string,
): ScrapedActivity | null {
  const nextEvent = extractMeetupNextDataEvent(html);

  if (nextEvent) {
    const activity = parseMeetupEventFromNextData(nextEvent, html, sourceUrl);

    if (activity) {
      return activity;
    }
  }

  const structured = parseStructuredEventHtml(html, sourceUrl, "meetup");

  if (!structured) {
    return null;
  }

  if (typeof nextEvent?.description === "string" && nextEvent.description.trim()) {
    const description = cleanPromoTextMultiline(
      normalizePlainTextDescription(nextEvent.description),
    );

    return {
      ...structured,
      description: description || structured.description,
      category: guessCategory(`${structured.title} ${description}`),
    };
  }

  return structured;
}

export function parseEventbriteEventHtml(
  html: string,
  sourceUrl: string,
): ScrapedActivity | null {
  const activity = parseStructuredEventHtml(html, sourceUrl, "eventbrite");
  const fullDescription = extractEventbriteStructuredDescription(html);

  if (activity && fullDescription) {
    return {
      ...activity,
      description: fullDescription,
      category: guessCategory(`${activity.title} ${fullDescription}`),
    };
  }

  return activity;
}

function parseDateTimeString(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseChineseDate(
  text: string,
  referenceYear = new Date().getFullYear(),
) {
  const normalized = text
    .replace(/\s+/g, "")
    .replace(/\uFF0F/g, "/")
    .replace(/\u2013|\u2014|\u2212/g, "-");
  const rangeMatch = normalized.match(
    /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:至|到|-|与)(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日/,
  );
  if (rangeMatch) {
    const [, yearA, monthA, dayA, yearB, monthB, dayB] = rangeMatch;
    const startYear = Number(yearA ?? yearB ?? referenceYear);
    const endYear = Number(yearB ?? yearA ?? startYear);
    const endMonth = Number(monthB ?? monthA) - 1;
    const start = new Date(
      Date.UTC(startYear, Number(monthA) - 1, Number(dayA), 9, 0, 0),
    );
    const end = new Date(Date.UTC(endYear, endMonth, Number(dayB), 18, 0, 0));
    return { start, end };
  }
  const singleMatch = normalized.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (singleMatch) {
    const [, year, month, day] = singleMatch;
    return {
      start: new Date(
        Date.UTC(
          Number(year ?? referenceYear),
          Number(month) - 1,
          Number(day),
          9,
          0,
          0,
        ),
      ),
      end: null,
    };
  }
  return null;
}

function extractItempropMetaContent(html: string, prop: string) {
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*itemprop=["']${prop}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function extractItempropText(html: string, prop: string) {
  const match = html.match(
    new RegExp(
      `<[^>]+itemprop=["']${prop}["'][^>]*>([^<]+)<`,
      "i",
    ),
  );
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

const PARIS_ARRONDISSEMENT_POSTAL: Record<number, string> = {
  1: "75001",
  2: "75002",
  3: "75003",
  4: "75004",
  5: "75005",
  6: "75006",
  7: "75007",
  8: "75008",
  9: "75009",
  10: "75010",
  11: "75011",
  12: "75012",
  13: "75013",
  14: "75014",
  15: "75015",
  16: "75016",
  17: "75017",
  18: "75018",
  19: "75019",
  20: "75020",
};

function capitalizeFrenchStreetPhrase(value: string) {
  return value.replace(
    /\b(rue|avenue|boulevard|bd\.?|place|quai|allée|allee|impasse|passage|square|cours|route)\b/gi,
    (token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
  );
}

function normalizeSortirArticleUrl(href: string, sourceUrl: string) {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

export function findSortirFrenchArticleUrls(
  html: string,
  sourceUrl: string,
): string[] {
  const articleId = sourceUrl.match(/\/articles\/(\d+)-/)?.[1];

  if (!articleId) {
    return [];
  }

  const found = new Set<string>();
  const addCandidate = (href: string | undefined) => {
    if (!href) {
      return;
    }

    const normalized = normalizeSortirArticleUrl(href, sourceUrl);

    if (
      normalized &&
      normalized.includes(`/articles/${articleId}-`) &&
      !/\/zh\//i.test(normalized)
    ) {
      found.add(normalized);
    }
  };

  const hreflang =
    html.match(
      /<link[^>]+hreflang=["']fr(?:-FR)?["'][^>]+href=["']([^"']+)"/i,
    ) ??
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+hreflang=["']fr(?:-FR)?["']/i,
    );
  addCandidate(hreflang?.[1]);

  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)"/i,
  );
  addCandidate(canonical?.[1]);

  for (const match of html.matchAll(
    new RegExp(
      `href=["']([^"']*/articles/${articleId}-[^"'#]+)["']`,
      "gi",
    ),
  )) {
    addCandidate(match[1]);
  }

  return [...found].sort((left, right) => {
    const score = (value: string) => {
      if (/\/scenes\/|\/spectacle\//i.test(value)) {
        return 0;
      }

      if (/\/loisirs\/|\/culture\//i.test(value)) {
        return 1;
      }

      return 2;
    };

    return score(left) - score(right);
  });
}

export function findSortirFrenchArticleUrl(
  html: string,
  sourceUrl: string,
): string | null {
  return findSortirFrenchArticleUrls(html, sourceUrl)[0] ?? null;
}

function formatParisStreetAddress({
  streetName,
  streetNumber,
  arrondissement,
}: {
  streetName: string;
  streetNumber?: string | null;
  arrondissement: number;
}) {
  const postal = PARIS_ARRONDISSEMENT_POSTAL[arrondissement];
  const street = capitalizeFrenchStreetPhrase(
    streetNumber ? `${streetNumber} rue ${streetName}` : `rue ${streetName}`,
  );

  if (postal) {
    return `${street}, ${postal} Paris`;
  }

  return `${street}, ${arrondissement}e arrondissement, Paris`;
}

export function extractSortirChineseStreetAddress(html: string): string | null {
  const body = extractSortirArticleBody(html) ?? stripHtml(html);
  const labeledAddress = body.match(
    /地址[：:]\s*巴黎\s*(\d{1,2})\s*区\s*(?:Albert|阿尔贝尔)\s*街\s*(\d+)?/i,
  );

  if (labeledAddress) {
    return formatParisStreetAddress({
      streetName: "Albert",
      streetNumber: labeledAddress[2],
      arrondissement: Number(labeledAddress[1]),
    });
  }

  const districtFirst = body.match(
    /巴黎\s*(\d{1,2})\s*区\s*(?:Albert|阿尔贝尔)\s*街\s*(\d+)?/i,
  );

  if (districtFirst) {
    return formatParisStreetAddress({
      streetName: "Albert",
      streetNumber: districtFirst[2],
      arrondissement: Number(districtFirst[1]),
    });
  }

  const streetWithNumber = body.match(
    /(?:Albert|阿尔贝尔)\s*街\s*(\d+)?[^。\n]{0,40}?巴黎\s*(\d{1,2})\s*区/i,
  );

  if (streetWithNumber) {
    return formatParisStreetAddress({
      streetName: "Albert",
      streetNumber: streetWithNumber[1],
      arrondissement: Number(streetWithNumber[2]),
    });
  }

  const reverseDistrict = body.match(
    /(?:Albert|阿尔贝尔)\s*街[的]?\s*(?:巴黎)?\s*(\d{1,2})\s*区/i,
  );

  if (reverseDistrict) {
    return formatParisStreetAddress({
      streetName: "Albert",
      streetNumber: null,
      arrondissement: Number(reverseDistrict[1]),
    });
  }

  return null;
}

export function extractSortirFrenchStreetAddress(html: string): string | null {
  const body = extractSortirArticleBody(html) ?? stripHtml(html);
  const arrondissementMatch = body.match(
    /\b((?:rue|avenue|boulevard|bd\.?|place|quai|allée|allee|impasse|passage|square|cours|route)\s+[^,.\n]{2,120}?)\s+(?:dans\s+le\s+)?(\d{1,2})(?:e|er|ème|th)?\s+arrondissement(?:\s+de\s+Paris)?/i,
  );

  if (arrondissementMatch) {
    const street = capitalizeFrenchStreetPhrase(
      arrondissementMatch[1].replace(/\s+/g, " ").trim(),
    );
    const arrondissement = Number(arrondissementMatch[2]);
    const postal = PARIS_ARRONDISSEMENT_POSTAL[arrondissement];

    if (postal) {
      return `${street}, ${postal} Paris`;
    }

    return `${street}, ${arrondissement}e arrondissement, Paris`;
  }

  const inlinePostalMatch = body.match(
    /\b((?:rue|avenue|boulevard|bd\.?|place|quai|allée|allee|impasse|passage|square|cours|route)\s+[^,.\n]{2,80}?),\s*(\d{5})\s+Paris\b/i,
  );

  if (inlinePostalMatch) {
    const street = capitalizeFrenchStreetPhrase(inlinePostalMatch[1].trim());

    return `${street}, ${inlinePostalMatch[2]} Paris`;
  }

  const simpleParisMatch = body.match(
    /\b((?:rue|avenue|boulevard|bd\.?|place|quai|allée|allee|impasse|passage|square|cours|route)\s+[^,.\n]{2,80}?)(?:\s+à\s+Paris|\s*,\s*Paris)\b/i,
  );

  if (simpleParisMatch) {
    return `${capitalizeFrenchStreetPhrase(simpleParisMatch[1].trim())}, Paris`;
  }

  return null;
}

export function extractSortirLocationHint(html: string): string | null {
  return (
    extractSortirFrenchStreetAddress(html) ??
    extractSortirChineseStreetAddress(html)
  );
}

function resolveSortirAddress(
  html: string,
  microdataAddress: string | null,
  frenchHtml?: string,
) {
  if (frenchHtml) {
    const frenchStreet = extractSortirFrenchStreetAddress(frenchHtml);

    if (frenchStreet) {
      return frenchStreet;
    }
  }

  const frenchStreet = extractSortirFrenchStreetAddress(html);

  if (frenchStreet) {
    return frenchStreet;
  }

  const chineseStreet = extractSortirChineseStreetAddress(html);

  if (chineseStreet) {
    return chineseStreet;
  }

  if (microdataAddress && microdataAddress !== "Paris, France") {
    return microdataAddress;
  }

  return microdataAddress ?? "Paris, France";
}

function extractSortirMicrodata(html: string) {
  const startDate = extractItempropMetaContent(html, "startDate");
  const endDate = extractItempropMetaContent(html, "endDate");
  const placeName = extractItempropText(html, "name");
  const street = extractItempropText(html, "streetAddress");
  const postalCode = extractItempropText(html, "postalCode");
  const locality = extractItempropText(html, "addressLocality");
  const addressParts = [placeName, street, postalCode, locality].filter(
    Boolean,
  );

  return {
    startAt: startDate ? parseDateTimeString(startDate) : null,
    endAt: endDate ? parseDateTimeString(endDate) : null,
    address: addressParts.length > 0 ? addressParts.join(" · ") : null,
  };
}

function normalizeExternalImageUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const rawUrl = value.trim();
    if (!rawUrl) return null;
    try {
      const url = new URL(rawUrl);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = normalizeExternalImageUrl(item);
      if (url) return url;
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      normalizeExternalImageUrl(record.url) ??
      normalizeExternalImageUrl(record.contentUrl) ??
      normalizeExternalImageUrl(record.thumbnailUrl)
    );
  }

  return null;
}

function resolveJsonLdImage(
  nodes: Record<string, unknown>[],
  image: unknown,
): string | null {
  if (typeof image === "object" && image !== null && "@id" in image) {
    const id = String((image as Record<string, unknown>)["@id"] ?? "").trim();

    if (id) {
      for (const node of nodes.filter((item) => item["@id"] === id)) {
        const resolved = normalizeExternalImageUrl(node);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return normalizeExternalImageUrl(image);
}

function guessCategory(text: string): ScrapedActivity["category"] {
  const value = text.toLowerCase();
  if (/(桌游|board\s*game|jenga|狼人杀|卡牌)/i.test(value)) return "BOARD_GAME";
  if (/(电影|cinema|movie|film)/i.test(value)) return "MOVIE";
  if (/(音乐|concert|live|dj|k-pop|kpop|festival|show|opera)/i.test(value))
    return "MUSIC";
  if (/(运动|sport|run|fitness|yoga|tennis|足球|篮球|游泳)/i.test(value))
    return "SPORTS";
  if (/(旅行|walk|city\s*walk|tour|travel|hike|voyage|漫步|散步)/i.test(value))
    return "TRAVEL";
  if (
    /(美食|food|wine|drink|restaurant|café|cafe|brunch|dinner|cooking|餐|吃)/i.test(
      value,
    )
  )
    return "FOOD";
  if (/(展|exhibition|museum|gallery|art|博物馆|艺术)/i.test(value))
    return "EXHIBITION";
  return "OTHER";
}

function guessPriceType(priceText: string): ScrapedActivity["priceType"] {
  const value = priceText.toLowerCase();
  if (!value || /free|免费|0\s*€|0\s*eur|gratuit/.test(value)) return "FREE";
  if (/aa|split|各自|均摊/.test(value)) return "AA";
  if (/\d+\s*[-~至到]\s*\d+/.test(value)) return "RANGE";
  return "FIXED";
}

function cleanPromoText(value: string) {
  return value
    .replace(/微信|wechat|playinparis1|交流群/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPromoTextMultiline(value: string) {
  return value
    .replace(/微信|wechat|playinparis1|交流群/gi, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function htmlFragmentToPlainText(htmlFragment: string) {
  return decodeHtmlEntities(htmlFragment)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractParagraphTextsFromHtml(
  htmlFragment: string,
  minLength = 40,
) {
  const paragraphs: string[] = [];

  for (const match of htmlFragment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = htmlFragmentToPlainText(match[1]);

    if (text.length >= minLength) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

function parseNextDataPayload(html: string) {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractEventbriteStructuredDescription(html: string) {
  const data = parseNextDataPayload(html);

  if (!data) {
    return null;
  }

  const pageProps = (data.props as Record<string, unknown> | undefined)
    ?.pageProps as Record<string, unknown> | undefined;
  const context = pageProps?.context as Record<string, unknown> | undefined;
  const structuredContent = context?.structuredContent as
    | Record<string, unknown>
    | undefined;
  const modules = structuredContent?.modules;

  if (!Array.isArray(modules)) {
    return null;
  }

  const parts = modules
    .map((module) => {
      if (!module || typeof module !== "object") {
        return "";
      }

      const text = (module as Record<string, unknown>).text;

      return typeof text === "string" ? htmlFragmentToPlainText(text) : "";
    })
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  return cleanPromoTextMultiline(parts.join("\n\n"));
}

function extractSortirArticleBody(html: string) {
  const articleBodyMatch = html.match(
    /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i,
  );

  if (articleBodyMatch?.[1]) {
    const paragraphs = extractParagraphTextsFromHtml(articleBodyMatch[1], 30);

    if (paragraphs.length > 0) {
      return cleanPromoTextMultiline(paragraphs.join("\n\n"));
    }

    const text = htmlFragmentToPlainText(articleBodyMatch[1]);

    if (text.length > 120) {
      return cleanPromoTextMultiline(text);
    }
  }

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

  if (articleMatch?.[1]) {
    const paragraphs = extractParagraphTextsFromHtml(articleMatch[1]);

    if (paragraphs.length >= 2) {
      return cleanPromoTextMultiline(paragraphs.join("\n\n"));
    }
  }

  const contentMatchers = [
    /class="[^"]*\barticle[_-]?content\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*\beditorial\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*\bcontent-body\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of contentMatchers) {
    const match = html.match(pattern);

    if (match?.[1]) {
      const paragraphs = extractParagraphTextsFromHtml(match[1]);

      if (paragraphs.length >= 2) {
        return cleanPromoTextMultiline(paragraphs.join("\n\n"));
      }
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const paragraphs = extractParagraphTextsFromHtml(bodyMatch?.[1] ?? html);

  if (paragraphs.length >= 3) {
    return cleanPromoTextMultiline(paragraphs.join("\n\n"));
  }

  return null;
}

export function parseSortirAParisArticleHtml(
  html: string,
  sourceUrl: string,
): ScrapedActivity | null {
  const jsonLdBlocks = parseJsonLdBlocks(html);
  let articleData: Record<string, unknown> | null = null;
  for (const block of jsonLdBlocks) {
    if (block && typeof block === "object" && !Array.isArray(block)) {
      const value = block as Record<string, unknown>;
      if (value["@type"] === "NewsArticle") {
        articleData = value;
        break;
      }
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = bodyMatch ? stripHtml(bodyMatch[1]) : stripHtml(html);
  const pageTitle = (() => {
    const match = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    if (!match) return "未命名活动";
    return stripHtml(match.replace(/\s*-\s*Sortiraparis\.com.*/i, ""));
  })();
  const title =
    articleData && typeof articleData.headline === "string"
      ? stripHtml(articleData.headline)
      : pageTitle;
  const descriptionRaw =
    articleData && typeof articleData.description === "string"
      ? articleData.description
      : (extractMetaContent(html, ["description", "og:description"]) ?? "");
  const summary = stripHtml(descriptionRaw) || title;
  const articleBody = extractSortirArticleBody(html);
  const description = articleBody || summary;
  const microdata = extractSortirMicrodata(html);
  const explicitDateHint = parseChineseDate(
    `${title} ${description}`,
    new Date().getUTCFullYear(),
  );
  const fallbackDateHint = parseChineseDate(
    `${title} ${description} ${bodyText}`,
    new Date().getUTCFullYear(),
  );
  const datePublished =
    articleData && typeof articleData.datePublished === "string"
      ? parseDateTimeString(articleData.datePublished)
      : null;
  const dateHint = explicitDateHint ?? fallbackDateHint;
  const startAt =
    microdata.startAt ?? dateHint?.start ?? datePublished ?? new Date();
  const endAt = microdata.endAt ?? dateHint?.end ?? null;
  const coverImageUrl = extractSortirArticleImage(
    html,
    articleData?.image,
    sourceUrl,
  );
  const priceText = /免费|gratuit|free/i.test(
    `${title} ${description} ${bodyText}`,
  )
    ? "免费"
    : "查看原文";
  const address = resolveSortirAddress(html, microdata.address, undefined);
  const city =
    /\bToulouse\b/i.test(address) || /\bToulouse\b/i.test(bodyText)
      ? "Toulouse"
      : "Paris";

  return {
    id: makeStableId("sortiraparis", sourceUrl),
    source: "sortiraparis",
    sourceUrl,
    title,
    description,
    itinerary: null,
    type: "PUBLIC_EVENT",
    category: guessCategory(`${title} ${description}`),
    city,
    destination: null,
    address,
    startAt: startAt.toISOString(),
    endAt: endAt?.toISOString() ?? null,
    capacity: 100,
    minParticipants: null,
    requiresApproval: false,
    priceType: guessPriceType(priceText),
    priceText,
    coverImageUrl,
    status: "RECRUITING",
    visibility: "PUBLIC",
  };
}

export function enrichSortirActivityAddress(
  activity: ScrapedActivity,
  html: string,
  sourceUrl: string,
  frenchHtml?: string,
): ScrapedActivity {
  const resolvedAddress = resolveSortirAddress(
    html,
    activity.address,
    frenchHtml,
  );

  return {
    ...activity,
    address: resolvedAddress,
    city: /\bToulouse\b/i.test(resolvedAddress)
      ? "Toulouse"
      : /Paris|750\d{2}/i.test(resolvedAddress)
        ? "Paris"
        : activity.city,
  };
}

export function parsePlayInParisEventHtml(
  html: string,
  sourceUrl: string,
): ScrapedActivity | null {
  return parseStructuredEventHtml(html, sourceUrl, "playinparis");
}

export const activityLinkImportUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 NextFunClub/1.0 activity-link-import";
