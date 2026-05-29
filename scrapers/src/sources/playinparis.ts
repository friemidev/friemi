import { fetchText } from "../http.js";
import { parseJsonLdBlocks, stripHtml } from "../html.js";
import { parseDateTimeString } from "../dates.js";
import { guessCategory, guessPriceType } from "../mapping.js";
import { makeStableId } from "../id.js";
import type { NormalizedActivity, ScrapeSummary } from "../types.js";

const SOURCE = "playinparis" as const;
const LIST_URL = "https://playinparis.com/events/";

function collectEvents(node: unknown, output: Record<string, unknown>[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectEvents(item, output);
    return;
  }
  if (typeof node !== "object") return;
  const value = node as Record<string, unknown>;
  if (value["@type"] === "Event") output.push(value);
  if (value["@graph"]) collectEvents(value["@graph"], output);
  for (const child of Object.values(value)) collectEvents(child, output);
}

function toAddress(location: unknown) {
  if (!location || typeof location !== "object") return "Paris";
  const value = location as Record<string, unknown>;
  const address = value.address;
  if (address && typeof address === "object") {
    const addr = address as Record<string, unknown>;
    const street = [addr.streetAddress, addr.addressLocality, addr.postalCode, addr.addressCountry]
      .filter(Boolean)
      .join(", ");
    if (street) return stripHtml(String(street));
  }
  return stripHtml([value.name, value.description].filter(Boolean).join(" - ")) || "Paris";
}

function toPriceText(offers: unknown) {
  if (!offers) return "查看原文";
  const value = Array.isArray(offers) ? offers[0] : offers;
  if (!value || typeof value !== "object") return "查看原文";
  const offer = value as Record<string, unknown>;
  const price = offer.price;
  const currency = typeof offer.priceCurrency === "string" ? offer.priceCurrency : "";
  if (price === undefined || price === null || price === "") return "查看原文";
  if (String(price) === "0") return "免费";
  return currency ? `${price} ${currency}` : String(price);
}

function normalizeDescription(description: unknown) {
  if (typeof description !== "string") return "";
  return stripHtml(description);
}

export async function scrapePlayInParis(limit = 30, timeoutMs = 30000): Promise<ScrapeSummary> {
  const html = await fetchText(LIST_URL, { timeoutMs });
  const events: Record<string, unknown>[] = [];
  for (const block of parseJsonLdBlocks(html)) {
    collectEvents(block, events);
  }

  const activities = events
    .map<NormalizedActivity | null>((event) => {
      const url = typeof event.url === "string" ? event.url : LIST_URL;
      const title = typeof event.name === "string" ? stripHtml(event.name) : "未命名活动";
      const description = normalizeDescription(event.description) || title;
      const startAt = typeof event.startDate === "string" ? parseDateTimeString(event.startDate) : null;
      const endAt = typeof event.endDate === "string" ? parseDateTimeString(event.endDate) : null;
      if (!startAt) return null;

      const location = event.location;
      const textForGuess = `${title} ${description}`;
      return {
        id: makeStableId(SOURCE, url),
        source: SOURCE,
        sourceUrl: url,
        title,
        description,
        itinerary: null,
        type: "PUBLIC_EVENT",
        category: guessCategory(textForGuess),
        city: "Paris",
        destination: null,
        address: toAddress(location),
        startAt,
        endAt,
        capacity: 100,
        minParticipants: null,
        requiresApproval: false,
        priceType: guessPriceType(toPriceText(event.offers)),
        priceText: toPriceText(event.offers),
        coverImageUrl: typeof event.image === "string" ? event.image : null,
        status: "RECRUITING",
        visibility: "PUBLIC",
      };
    })
    .filter((item): item is NormalizedActivity => item !== null)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .slice(0, limit);

  return { source: SOURCE, count: activities.length, activities };
}