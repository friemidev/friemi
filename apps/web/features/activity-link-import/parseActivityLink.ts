import type { ActivityCategory, PriceType } from "@chill-club/shared";
import { formatParisDateTimeInput } from "@/features/activities/actions/activityActionUtils";

const requestTimeoutMs = 8_000;
const maxHtmlLength = 600_000;

const supportedHosts = new Map<string, string>([
  ["paris.fr", "Paris.fr"],
  ["quefaire.paris.fr", "Que Faire a Paris"],
  ["opendata.paris.fr", "Paris OpenData"],
  ["sortiraparis.com", "Sortir a Paris"],
  ["playinparis.com", "Play in Paris"],
  ["eventbrite.fr", "Eventbrite"],
  ["billetweb.fr", "Billetweb"],
  ["meetup.com", "Meetup"],
]);

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

export function getSupportedActivityLinkHosts() {
  return Array.from(supportedHosts.keys());
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

  return typeValues.some((item) => String(item).toLowerCase() === "event");
}

function getJsonLdImage(value: unknown, baseUrl: URL): string | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => getJsonLdImage(item, baseUrl)).find(Boolean);
  }

  if (typeof value === "object" && value !== null) {
    const imageObject = value as JsonLdObject;

    return getAbsoluteUrl(imageObject.url ?? imageObject.contentUrl, baseUrl);
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
  const event = extractJsonLdObjects(html).find(isEventJsonLd);

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
    image: getJsonLdImage(event.image, baseUrl),
    locationName: location.locationName,
    priceText: offer.priceText,
    priceType: offer.priceType,
    startAt: normalizeDateInput(event.startDate),
    title: getText(event.name),
  };
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
  const body = description || copy.fallbackDescription;

  return truncateText(`${body}\n\n${copy.sourceLabel}: ${sourceUrl}`, 2000);
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
    getAbsoluteUrl(
      meta.get("og:image") || meta.get("twitter:image"),
      sourceUrl,
    );
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
      Accept: "text/html,application/xhtml+xml,application/json",
      "User-Agent": "NextFunClub/1.0 activity-link-import",
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

  return buildPreview(sourceUrl, siteName, html, copy);
}
