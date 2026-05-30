import type { ActivityCategory, PriceType } from "@chill-club/shared";
import {
  activityLinkImportUserAgent,
  enrichSortirActivityAddress,
  extractSortirFrenchStreetAddress,
  findSortirFrenchArticleUrl,
  findSortirFrenchArticleUrls,
  parseEventbriteEventHtml,
  parseMeetupEventHtml,
  parsePlayInParisEventHtml,
  parseSortirAParisArticleHtml,
  type ScrapedActivity,
} from "@chill-club/scraper-core";
import { activityLinkImportSites } from "@/lib/activity-link-import-sites";
import { formatImportedAddressForForm } from "@/lib/place-search";
import { formatParisDateTimeInput } from "@/features/activities/actions/activityActionUtils";
import { buildActivityDescriptionWithSource } from "@/lib/activity-description";

const requestTimeoutMs = 12_000;
const maxHtmlLength = 600_000;

const supportedHosts: [string, string][] = [
  ["quefaire.paris.fr", "Que Faire a Paris"],
  ["opendata.paris.fr", "Paris OpenData"],
  ["sortiraparis.com", "Sortir a Paris"],
  ["playinparis.com", "Play in Paris"],
  ["eventbrite.fr", "Eventbrite"],
  ["billetweb.fr", "Billetweb"],
  ["meetup.com", "Meetup"],
  ["paris.fr", "Paris.fr"],
];

type ActivityLinkImportLocaleCopy = {
  externalPriceText: string;
  fallbackDescription: string;
  freePriceText: string;
  sourceLabel: string;
};

const localeCopy = {
  en: {
    externalPriceText: "Check the external page",
    fallbackDescription:
      "Activity details were imported from an external link. Please review them before publishing.",
    freePriceText: "Free",
    sourceLabel: "Source link",
  },
  fr: {
    externalPriceText: "Voir la page externe",
    fallbackDescription:
      "Les informations viennent d'un lien externe. Vérifiez-les avant publication.",
    freePriceText: "Gratuit",
    sourceLabel: "Lien source",
  },
  zh: {
    externalPriceText: "以外部页面为准",
    fallbackDescription: "活动信息来自外部链接，请在发布前补充和确认。",
    freePriceText: "免费",
    sourceLabel: "来源链接",
  },
} satisfies Record<string, ActivityLinkImportLocaleCopy>;

export type ActivityLinkPreviewValues = {
  address?: string;
  category?: ActivityCategory;
  city?: string;
  coverImageUrl?: string;
  description?: string;
  endAt?: string;
  itinerary?: string;
  latitude?: string;
  longitude?: string;
  priceText?: string;
  priceType?: PriceType;
  startAt?: string;
  title?: string;
  type?: "LOCAL";
};

export type ActivityLinkPreview = {
  missingFields: string[];
  siteName: string;
  sourceUrl: string;
  values: ActivityLinkPreviewValues;
};

type ParsedEvent = {
  address?: string;
  city?: string;
  description?: string;
  endAt?: string;
  image?: string;
  locationName?: string;
  priceText?: string;
  priceType?: PriceType;
  startAt?: string;
  title?: string;
};

type JsonLdObject = {
  [key: string]: unknown;
};

type ParisOpenDataRecord = {
  access_type?: string | null;
  address_city?: string | null;
  address_name?: string | null;
  address_street?: string | null;
  audience?: string | null;
  cover_url?: string | null;
  date_description?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  description?: string | null;
  lat_lon?:
    | {
        lat?: string | number | null;
        lng?: string | number | null;
        lon?: string | number | null;
      }
    | [string | number, string | number]
    | string
    | null;
  lead_text?: string | null;
  price_detail?: string | null;
  price_type?: string | null;
  tags?: string[] | string | null;
  title?: string | null;
  url?: string | null;
};

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function getSupportedSiteName(url: URL) {
  const normalizedHost = normalizeHost(url.hostname);

  for (const [host, siteName] of supportedHosts) {
    if (normalizedHost === host || normalizedHost.endsWith(`.${host}`)) {
      return siteName;
    }
  }

  return null;
}

function getLinkImportHostKey(url: URL) {
  const normalizedHost = normalizeHost(url.hostname);

  for (const [host] of supportedHosts) {
    if (normalizedHost === host || normalizedHost.endsWith(`.${host}`)) {
      return host;
    }
  }

  return null;
}

export function getSupportedActivityLinkHosts() {
  return supportedHosts.map(([host]) => host);
}

export function getSupportedActivityLinkSites() {
  return activityLinkImportSites;
}

function getLocaleCopy(
  locale: string | undefined,
): ActivityLinkImportLocaleCopy {
  if (locale?.toLowerCase().startsWith("fr")) {
    return localeCopy.fr;
  }

  if (locale?.toLowerCase().startsWith("en")) {
    return localeCopy.en;
  }

  return localeCopy.zh;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripHtml(value: string | undefined) {
  return decodeHtml(
    (value ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  ).trim();
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getAbsoluteUrl(value: unknown, baseUrl: URL) {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(rawValue, baseUrl);

    return ["http:", "https:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function getText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function normalizeNullableText(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

function getFirstText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(getText).find(Boolean) ?? "";
  }

  return getText(value);
}

function getTags(record: ParisOpenDataRecord) {
  if (Array.isArray(record.tags)) {
    return record.tags.map(String);
  }

  if (typeof record.tags === "string") {
    return record.tags.split(/[;,]/).map((tag) => tag.trim());
  }

  return [];
}

function normalizeDateInput(value: unknown) {
  const rawValue = getText(value);

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(rawValue);

  return Number.isNaN(date.getTime())
    ? undefined
    : formatParisDateTimeInput(date);
}

function getAttributes(tag: string) {
  const attrs: Record<string, string> = {};

  for (const match of tag.matchAll(
    /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g,
  )) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[3] ?? match[4] ?? "");
  }

  return attrs;
}

function extractMeta(html: string) {
  const meta = new Map<string, string>();

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = getAttributes(match[0]);
    const key = attrs.property || attrs.name;
    const content = attrs.content;

    if (key && content && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), content);
    }
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (titleMatch?.[1] && !meta.has("title")) {
    meta.set("title", stripHtml(titleMatch[1]));
  }

  return meta;
}

function extractTimeDatetime(html: string) {
  const match = html.match(/<time\b[^>]*datetime=(?:"([^"]+)"|'([^']+)')/i);

  return normalizeDateInput(match?.[1] ?? match?.[2]);
}

function extractJsonLdObjects(html: string): JsonLdObject[] {
  const objects: JsonLdObject[] = [];

  for (const match of html.matchAll(
    /<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      collectJsonLdObjects(parsed, objects);
    } catch {
      continue;
    }
  }

  return objects;
}

function collectJsonLdObjects(value: unknown, objects: JsonLdObject[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdObjects(item, objects));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const objectValue = value as JsonLdObject;
  objects.push(objectValue);

  collectJsonLdObjects(objectValue["@graph"], objects);
}

function isEventJsonLd(value: JsonLdObject) {
  const type = value["@type"];
  const typeValues = Array.isArray(type) ? type : [type];

  return typeValues.some((item) => {
    const normalized = String(item).toLowerCase();

    return (
      normalized === "event" ||
      normalized.endsWith("event") ||
      normalized === "festival" ||
      normalized.endsWith("festival")
    );
  });
}

function resolvePreviewImageUrl(value: unknown, baseUrl: URL) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    const url = new URL(value.trim(), baseUrl);

    if (url.pathname.includes("/_next/image")) {
      const embedded = url.searchParams.get("url");

      if (embedded) {
        const decoded = decodeURIComponent(embedded);

        return getAbsoluteUrl(decoded, baseUrl);
      }
    }
  } catch {
    return getAbsoluteUrl(value, baseUrl);
  }

  return getAbsoluteUrl(value, baseUrl);
}

function resolveJsonLdNodeImage(
  objects: JsonLdObject[],
  value: unknown,
  baseUrl: URL,
): string | undefined {
  if (typeof value === "object" && value !== null && "@id" in value) {
    const id = getText((value as JsonLdObject)["@id"]);

    if (id) {
      for (const node of objects.filter((item) => item["@id"] === id)) {
        const resolved = getJsonLdImage(node, baseUrl, objects);

        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return getJsonLdImage(value, baseUrl, objects);
}

function getJsonLdImage(
  value: unknown,
  baseUrl: URL,
  objects: JsonLdObject[] = [],
): string | undefined {
  if (Array.isArray(value)) {
    return value
      .map((item) => getJsonLdImage(item, baseUrl, objects))
      .find(Boolean);
  }

  if (typeof value === "object" && value !== null) {
    const imageObject = value as JsonLdObject;

    return (
      getAbsoluteUrl(
        imageObject.url ?? imageObject.contentUrl ?? imageObject.thumbnailUrl,
        baseUrl,
      ) ?? resolveJsonLdNodeImage(objects, imageObject, baseUrl)
    );
  }

  return getAbsoluteUrl(value, baseUrl);
}

function getJsonLdAddress(location: unknown) {
  if (!location || typeof location !== "object") {
    return {};
  }

  const locationObject = location as JsonLdObject;
  const address = locationObject.address;
  const locationName = getText(locationObject.name);

  if (!address || typeof address !== "object") {
    return {
      address: locationName,
      city: "",
      locationName,
    };
  }

  const addressObject = address as JsonLdObject;
  const street = getFirstText(addressObject.streetAddress);
  const postalCode = getFirstText(addressObject.postalCode);
  const city = getFirstText(addressObject.addressLocality);
  const name = getText(locationObject.name);
  const addressParts = [name, street, postalCode, city].filter(Boolean);

  return {
    address: addressParts.join(" · "),
    city,
    locationName: name,
  };
}

function getJsonLdOffer(
  offers: unknown,
  copy: ActivityLinkImportLocaleCopy,
): {
  priceText?: string;
  priceType?: PriceType;
} {
  const offer = Array.isArray(offers) ? offers[0] : offers;

  if (!offer || typeof offer !== "object") {
    return {};
  }

  const offerObject = offer as JsonLdObject;
  const price = getText(offerObject.price);
  const currency = getText(offerObject.priceCurrency);
  const availability = getText(offerObject.availability).toLowerCase();

  if (price === "0" || availability.includes("free")) {
    return {
      priceText: copy.freePriceText,
      priceType: "FREE",
    };
  }

  if (price) {
    return {
      priceText: currency ? `${price} ${currency}` : price,
      priceType: "FIXED",
    };
  }

  return {};
}

function getParisOpenDataRecord(payload: unknown): ParisOpenDataRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const payloadObject = payload as JsonLdObject;
  const results = payloadObject.results;

  if (Array.isArray(results) && results[0] && typeof results[0] === "object") {
    return results[0] as ParisOpenDataRecord;
  }

  const record = payloadObject.record;

  if (record && typeof record === "object") {
    const recordObject = record as JsonLdObject;

    if (recordObject.fields && typeof recordObject.fields === "object") {
      return recordObject.fields as ParisOpenDataRecord;
    }

    return recordObject as ParisOpenDataRecord;
  }

  if ("title" in payloadObject || "date_start" in payloadObject) {
    return payloadObject as ParisOpenDataRecord;
  }

  return null;
}

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function isValidCoordinate(latitude: number | null, longitude: number | null) {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getParisOpenDataCoordinates(record: ParisOpenDataRecord) {
  const rawCoordinates = record.lat_lon;

  if (Array.isArray(rawCoordinates)) {
    const latitude = parseCoordinate(rawCoordinates[0]);
    const longitude = parseCoordinate(rawCoordinates[1]);

    return isValidCoordinate(latitude, longitude)
      ? {
          latitude: String(latitude),
          longitude: String(longitude),
        }
      : {};
  }

  if (typeof rawCoordinates === "string") {
    const [latPart, lonPart] = rawCoordinates.split(",");
    const latitude = parseCoordinate(latPart);
    const longitude = parseCoordinate(lonPart);

    return isValidCoordinate(latitude, longitude)
      ? {
          latitude: String(latitude),
          longitude: String(longitude),
        }
      : {};
  }

  if (rawCoordinates && typeof rawCoordinates === "object") {
    const latitude = parseCoordinate(rawCoordinates.lat);
    const longitude = parseCoordinate(rawCoordinates.lon ?? rawCoordinates.lng);

    return isValidCoordinate(latitude, longitude)
      ? {
          latitude: String(latitude),
          longitude: String(longitude),
        }
      : {};
  }

  return {};
}

function getParisOpenDataAddress(record: ParisOpenDataRecord) {
  const addressParts = [
    normalizeNullableText(record.address_name),
    normalizeNullableText(record.address_street),
  ].filter(Boolean);

  return addressParts.join(" · ");
}

function getParisOpenDataPrice(
  record: ParisOpenDataRecord,
  copy: ActivityLinkImportLocaleCopy,
): {
  priceText: string;
  priceType: PriceType;
} {
  const priceType = normalizeNullableText(record.price_type).toLowerCase();
  const priceDetail = stripHtml(record.price_detail ?? undefined);

  if (
    /gratuit|free/.test(priceType) ||
    /gratuit|free/.test(priceDetail.toLowerCase())
  ) {
    return {
      priceText: copy.freePriceText,
      priceType: "FREE",
    };
  }

  return {
    priceText:
      priceDetail ||
      normalizeNullableText(record.price_type) ||
      copy.externalPriceText,
    priceType: priceDetail ? "FIXED" : "RANGE",
  };
}

function parseJsonLdEvent(
  html: string,
  baseUrl: URL,
  copy: ActivityLinkImportLocaleCopy,
): ParsedEvent {
  const objects = extractJsonLdObjects(html);
  const event = objects.find(isEventJsonLd);

  if (!event) {
    return {};
  }

  const location = getJsonLdAddress(event.location);
  const offer = getJsonLdOffer(event.offers, copy);

  return {
    address: location.address,
    city: location.city,
    description: stripHtml(getText(event.description)),
    endAt: normalizeDateInput(event.endDate),
    image: resolveJsonLdNodeImage(objects, event.image, baseUrl),
    locationName: location.locationName,
    priceText: offer.priceText,
    priceType: offer.priceType,
    startAt: normalizeDateInput(event.startDate),
    title: getText(event.name),
  };
}

function mapScrapedPriceText(
  priceText: string,
  copy: ActivityLinkImportLocaleCopy,
): { priceText: string; priceType: PriceType } {
  if (/免费|gratuit|free/i.test(priceText)) {
    return { priceText: copy.freePriceText, priceType: "FREE" };
  }

  if (/查看原文|check the external/i.test(priceText)) {
    return { priceText: copy.externalPriceText, priceType: "RANGE" };
  }

  return { priceText, priceType: "FIXED" };
}

function buildPreviewFromScrapedActivity(
  activity: ScrapedActivity,
  siteName: string,
  html: string,
  sourceUrl: URL,
  copy: ActivityLinkImportLocaleCopy,
): ActivityLinkPreview {
  const price = mapScrapedPriceText(activity.priceText, copy);
  const meta = extractMeta(html);
  const coverImageUrl =
    activity.coverImageUrl ??
    resolvePreviewImageUrl(meta.get("og:image") || meta.get("twitter:image"), sourceUrl);
  const values: ActivityLinkPreviewValues = {
    address: activity.address
      ? truncateText(formatImportedAddressForForm(activity.address), 120)
      : undefined,
    category: activity.category,
    city: activity.city,
    coverImageUrl,
    description: buildDescription(
      stripHtml(activity.description),
      activity.sourceUrl,
      copy,
    ),
    endAt: activity.endAt
      ? formatParisDateTimeInput(activity.endAt)
      : undefined,
    itinerary: activity.itinerary ?? "",
    priceText: price.priceText,
    priceType: price.priceType,
    startAt: formatParisDateTimeInput(activity.startAt),
    title: truncateText(stripHtml(activity.title), 80),
    type: "LOCAL",
  };

  return {
    missingFields: getMissingFields(values),
    siteName,
    sourceUrl: activity.sourceUrl,
    values,
  };
}

function buildSiteSpecificPreview(
  sourceUrl: URL,
  siteName: string,
  html: string,
  copy: ActivityLinkImportLocaleCopy,
): ActivityLinkPreview | null {
  const hostKey = getLinkImportHostKey(sourceUrl);

  if (hostKey === "sortiraparis.com") {
    const activity = parseSortirAParisArticleHtml(html, sourceUrl.toString());

    return activity
      ? buildPreviewFromScrapedActivity(
          activity,
          siteName,
          html,
          sourceUrl,
          copy,
        )
      : null;
  }

  if (
    hostKey === "playinparis.com" &&
    /\/event\//i.test(sourceUrl.pathname)
  ) {
    const activity = parsePlayInParisEventHtml(html, sourceUrl.toString());

    return activity
      ? buildPreviewFromScrapedActivity(
          activity,
          siteName,
          html,
          sourceUrl,
          copy,
        )
      : null;
  }

  if (hostKey === "meetup.com") {
    const activity = parseMeetupEventHtml(html, sourceUrl.toString());

    return activity
      ? buildPreviewFromScrapedActivity(
          activity,
          siteName,
          html,
          sourceUrl,
          copy,
        )
      : null;
  }

  if (hostKey === "eventbrite.fr") {
    const activity = parseEventbriteEventHtml(html, sourceUrl.toString());

    return activity
      ? buildPreviewFromScrapedActivity(
          activity,
          siteName,
          html,
          sourceUrl,
          copy,
        )
      : null;
  }

  return null;
}

function mapCategory(input: string): ActivityCategory {
  const searchable = input.toLowerCase();

  if (
    /桌游|board game|jeux? de soci[eé]t[eé]|ludique|jeu|game/.test(searchable)
  ) {
    return "BOARD_GAME";
  }

  if (/expo|exposition|mus[eé]e|museum|art|visite/.test(searchable)) {
    return "EXHIBITION";
  }

  if (/concert|musique|music|festival|danse|spectacle/.test(searchable)) {
    return "MUSIC";
  }

  if (/cin[eé]ma|film|movie|projection/.test(searchable)) {
    return "MOVIE";
  }

  if (/sport|course|running|yoga|fitness|v[eé]lo/.test(searchable)) {
    return "SPORTS";
  }

  if (
    /voyage|travel|trip|randonn[eé]e|balade|city walk|excursion/.test(
      searchable,
    )
  ) {
    return "TRAVEL";
  }

  if (
    /food|cuisine|repas|restaurant|march[eé]|d[eé]gustation/.test(searchable)
  ) {
    return "FOOD";
  }

  return "OTHER";
}

function getMissingFields(values: ActivityLinkPreviewValues) {
  const missingFields: string[] = [];

  if (!values.title) missingFields.push("title");
  if (!values.startAt) missingFields.push("startAt");
  if (!values.address) missingFields.push("address");
  if (!values.coverImageUrl) missingFields.push("coverImageUrl");

  return missingFields;
}

function buildDescription(
  description: string,
  sourceUrl: string,
  copy: ActivityLinkImportLocaleCopy,
) {
  return buildActivityDescriptionWithSource({
    body: description,
    fallbackDescription: copy.fallbackDescription,
    sourceLabel: copy.sourceLabel,
    sourceUrl,
  });
}

function buildPreview(
  sourceUrl: URL,
  siteName: string,
  html: string,
  copy: ActivityLinkImportLocaleCopy,
): ActivityLinkPreview {
  const meta = extractMeta(html);
  const jsonLdEvent = parseJsonLdEvent(html, sourceUrl, copy);
  const title =
    jsonLdEvent.title ||
    meta.get("og:title") ||
    meta.get("twitter:title") ||
    meta.get("title") ||
    "";
  const description =
    jsonLdEvent.description ||
    meta.get("og:description") ||
    meta.get("description") ||
    "";
  const image =
    jsonLdEvent.image ||
    resolvePreviewImageUrl(meta.get("og:image") || meta.get("twitter:image"), sourceUrl);
  const address = jsonLdEvent.address || jsonLdEvent.locationName || "";
  const city = jsonLdEvent.city || "Paris";
  const startAt =
    jsonLdEvent.startAt ||
    normalizeDateInput(meta.get("event:start_time")) ||
    extractTimeDatetime(html);
  const endAt =
    jsonLdEvent.endAt || normalizeDateInput(meta.get("event:end_time"));
  const category = mapCategory(
    [title, description, address, siteName].filter(Boolean).join(" "),
  );
  const priceText = jsonLdEvent.priceText || copy.externalPriceText;
  const priceType = jsonLdEvent.priceType || "RANGE";
  const values: ActivityLinkPreviewValues = {
    address: address ? truncateText(address, 120) : undefined,
    category,
    city,
    coverImageUrl: image,
    description: buildDescription(
      stripHtml(description),
      sourceUrl.toString(),
      copy,
    ),
    endAt,
    itinerary: "",
    priceText,
    priceType,
    startAt,
    title: truncateText(stripHtml(title), 80),
    type: "LOCAL",
  };

  return {
    missingFields: getMissingFields(values),
    siteName,
    sourceUrl: sourceUrl.toString(),
    values,
  };
}

function buildParisOpenDataPreview(
  sourceUrl: URL,
  siteName: string,
  payload: unknown,
  copy: ActivityLinkImportLocaleCopy,
): ActivityLinkPreview {
  const record = getParisOpenDataRecord(payload);

  if (!record) {
    throw new Error("UNSUPPORTED_CONTENT");
  }

  const title = normalizeNullableText(record.title);
  const leadText = stripHtml(record.lead_text ?? undefined);
  const description = stripHtml(record.description ?? undefined);
  const officialUrl =
    getAbsoluteUrl(record.url, sourceUrl)?.toString() || sourceUrl.toString();
  const price = getParisOpenDataPrice(record, copy);
  const coordinates = getParisOpenDataCoordinates(record);
  const address = getParisOpenDataAddress(record);
  const itinerary = [
    stripHtml(record.date_description ?? undefined),
    stripHtml(record.access_type ?? undefined),
    stripHtml(record.audience ?? undefined),
  ]
    .filter(Boolean)
    .join("\n");
  const category = mapCategory(
    [title, leadText, description, ...getTags(record)]
      .filter(Boolean)
      .join(" "),
  );
  const values: ActivityLinkPreviewValues = {
    address: address ? truncateText(address, 120) : undefined,
    category,
    city: normalizeNullableText(record.address_city) || "Paris",
    coverImageUrl: getAbsoluteUrl(record.cover_url, sourceUrl),
    description: buildDescription(leadText || description, officialUrl, copy),
    endAt: normalizeDateInput(record.date_end),
    itinerary,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    priceText: price.priceText,
    priceType: price.priceType,
    startAt: normalizeDateInput(record.date_start),
    title: truncateText(stripHtml(title), 80),
    type: "LOCAL",
  };

  return {
    missingFields: getMissingFields(values),
    siteName,
    sourceUrl: sourceUrl.toString(),
    values,
  };
}

export async function parseActivityLink(
  rawUrl: string,
  locale?: string,
): Promise<ActivityLinkPreview> {
  let sourceUrl: URL;
  const copy = getLocaleCopy(locale);

  try {
    sourceUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error("INVALID_URL");
  }

  if (sourceUrl.protocol !== "https:") {
    throw new Error("UNSUPPORTED_URL");
  }

  const siteName = getSupportedSiteName(sourceUrl);

  if (!siteName) {
    throw new Error("UNSUPPORTED_HOST");
  }

  const response = await fetch(sourceUrl, {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "User-Agent": activityLinkImportUserAgent,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error("FETCH_FAILED");
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    if (!normalizeHost(sourceUrl.hostname).endsWith("opendata.paris.fr")) {
      throw new Error("UNSUPPORTED_CONTENT");
    }

    return buildParisOpenDataPreview(
      sourceUrl,
      siteName,
      await response.json(),
      copy,
    );
  }

  if (!contentType.includes("text/html")) {
    throw new Error("UNSUPPORTED_CONTENT");
  }

  const html = (await response.text()).slice(0, maxHtmlLength);
  let siteSpecificPreview = buildSiteSpecificPreview(
    sourceUrl,
    siteName,
    html,
    copy,
  );

  if (siteSpecificPreview && getLinkImportHostKey(sourceUrl) === "sortiraparis.com") {
    siteSpecificPreview = await enrichSortirLinkPreview(
      siteSpecificPreview,
      html,
      sourceUrl,
    );
  }

  if (siteSpecificPreview) {
    return siteSpecificPreview;
  }

  return buildPreview(sourceUrl, siteName, html, copy);
}

async function enrichSortirLinkPreview(
  preview: ActivityLinkPreview,
  html: string,
  sourceUrl: URL,
): Promise<ActivityLinkPreview> {
  let frenchHtml: string | undefined;

  if (/\/zh\//i.test(sourceUrl.pathname)) {
    const frenchUrls = findSortirFrenchArticleUrls(html, sourceUrl.toString());

    for (const frenchUrl of frenchUrls) {
      try {
        const response = await fetch(frenchUrl, {
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "User-Agent": activityLinkImportUserAgent,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(requestTimeoutMs),
        });

        if (!response.ok) {
          continue;
        }

        const candidateHtml = (await response.text()).slice(0, maxHtmlLength);

        if (extractSortirFrenchStreetAddress(candidateHtml)) {
          frenchHtml = candidateHtml;
          break;
        }

        frenchHtml ??= candidateHtml;
      } catch {
        /* try next candidate */
      }
    }
  }

  const activity = enrichSortirActivityAddress(
    {
      id: "sortiraparis_preview",
      source: "sortiraparis",
      sourceUrl: preview.sourceUrl,
      title: preview.values.title ?? "",
      description: preview.values.description ?? "",
      itinerary: preview.values.itinerary ?? null,
      type: "PUBLIC_EVENT",
      category: preview.values.category ?? "OTHER",
      city: preview.values.city ?? "Paris",
      destination: null,
      address: preview.values.address ?? "Paris, France",
      startAt: preview.values.startAt ?? new Date().toISOString(),
      endAt: preview.values.endAt ?? null,
      capacity: 100,
      minParticipants: null,
      requiresApproval: false,
      priceType: preview.values.priceType ?? "RANGE",
      priceText: preview.values.priceText ?? "",
      coverImageUrl: preview.values.coverImageUrl ?? null,
      status: "RECRUITING",
      visibility: "PUBLIC",
    },
    html,
    sourceUrl.toString(),
    frenchHtml,
  );

  return {
    ...preview,
    values: {
      ...preview.values,
      address: truncateText(formatImportedAddressForForm(activity.address), 120),
      city: activity.city,
    },
  };
}
