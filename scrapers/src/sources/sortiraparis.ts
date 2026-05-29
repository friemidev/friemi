import { fetchText } from "../http.js";
import { extractHrefValues, extractTextFromBody, parseJsonLdBlocks, stripHtml } from "../html.js";
import { parseChineseDate, parseDateTimeString } from "../dates.js";
import { guessPriceType } from "../mapping.js";
import { makeStableId } from "../id.js";
import type { NormalizedActivity, ScrapeSummary } from "../types.js";

const SOURCE = "sortiraparis" as const;
const LIST_URL = "https://www.sortiraparis.com/zh/zai-bali-wan-shenme/jiaoyi-hui-he-zhanlan";
const ARTICLE_PREFIX = `${LIST_URL}/articles/`;

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url, LIST_URL);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractArticleLinks(html: string, baseUrl: string) {
  const links = new Set<string>();
  for (const href of extractHrefValues(html)) {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const absolute = normalizeUrl(new URL(href, baseUrl).toString());
    if (!absolute.startsWith(ARTICLE_PREFIX)) continue;
    links.add(absolute);
  }
  return [...links];
}

function extractMetaContent(html: string, keys: string[]) {
  const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["'](?:${escaped})["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return match ? match[1] : null;
}

function parseArticlePage(html: string, sourceUrl: string): NormalizedActivity | null {
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

  const bodyText = extractTextFromBody(html);
  const pageTitle = (() => {
    const match = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    if (!match) return "未命名活动";
    return stripHtml(match.replace(/\s*-\s*Sortiraparis\.com.*/i, ""));
  })();
  const title = articleData && typeof articleData.headline === "string" ? stripHtml(articleData.headline) : pageTitle;
  const descriptionRaw = articleData && typeof articleData.description === "string"
    ? articleData.description
    : extractMetaContent(html, ["description", "og:description"]) ?? "";
  const description = stripHtml(descriptionRaw) || title;
  const explicitDateHint = parseChineseDate(`${title} ${description}`, new Date().getUTCFullYear());
  const fallbackDateHint = parseChineseDate(`${title} ${description} ${bodyText}`, new Date().getUTCFullYear());
  const datePublished = articleData && typeof articleData.datePublished === "string"
    ? parseDateTimeString(articleData.datePublished)
    : null;
  const dateHint = explicitDateHint ?? fallbackDateHint;
  const startAt = dateHint?.start ?? datePublished ?? new Date();
  const endAt = dateHint?.end ?? null;
  const image = articleData?.image;
  const coverImageUrl = typeof image === "string" ? image : Array.isArray(image) ? (typeof image[0] === "string" ? image[0] : null) : null;
  const priceText = /免费|gratuit|free/i.test(`${title} ${description} ${bodyText}`) ? "免费" : "查看原文";

  return {
    id: makeStableId(SOURCE, sourceUrl),
    source: SOURCE,
    sourceUrl,
    title,
    description,
    itinerary: null,
    type: "PUBLIC_EVENT",
    category: "EXHIBITION",
    city: "Paris",
    destination: null,
    address: "Paris, France",
    startAt,
    endAt,
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

export async function scrapeSortirAParis(limit = 24, timeoutMs = 30000, maxPages = 3): Promise<ScrapeSummary> {
  const found = new Map<string, NormalizedActivity>();

  for (let page = 1; page <= maxPages && found.size < limit; page += 1) {
    const pageUrl = page === 1 ? LIST_URL : `${LIST_URL}/page/${page}`;
    const html = await fetchText(pageUrl, { timeoutMs });
    const links = extractArticleLinks(html, pageUrl);
    for (const link of links) {
      if (found.size >= limit) break;
      if (found.has(link)) continue;
      const articleHtml = await fetchText(link, { timeoutMs });
      const article = parseArticlePage(articleHtml, link);
      if (!article) continue;
      found.set(link, article);
    }
  }

  const activities = [...found.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).slice(0, limit);
  return { source: SOURCE, count: activities.length, activities };
}