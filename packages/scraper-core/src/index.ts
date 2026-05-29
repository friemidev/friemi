import { createHash } from "node:crypto";

export type ScraperSource = "sortiraparis" | "playinparis";
export type ScraperMode = "recent" | "range" | "database";

export type ScrapedActivity = {
  id: string;
  source: ScraperSource;
  sourceUrl: string;
  title: string;
  description: string;
  itinerary: string | null;
  type: "PUBLIC_EVENT";
  category: "BOARD_GAME" | "MOVIE" | "MUSIC" | "SPORTS" | "TRAVEL" | "FOOD" | "EXHIBITION" | "OTHER";
  city: string;
  destination: string | null;
  address: string;
  startAt: string;
  endAt: string | null;
  capacity: number;
  minParticipants: number | null;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  coverImageUrl: string | null;
  status: "RECRUITING";
  visibility: "PUBLIC";
};

export type ScrapePreviewItem = ScrapedActivity & {
  fingerprint: string;
  duplicateStatus: "new" | "existing" | "duplicate";
  duplicateOfId: string | null;
  duplicateOfTitle: string | null;
};

export type ScrapeRequest = {
  sources: ScraperSource[];
  limit: number;
  timeoutMs?: number;
  maxPages?: number;
  from?: Date | null;
  to?: Date | null;
};

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

  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return entityMap[entity] ?? _;
  });
}

function stripHtml(input: string) {
  const decoded = decodeHtmlEntities(input).replace(/\\[rn]/g, " ").replace(/\\t/g, " ");
  return normalizeWhitespace(decoded.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function extractMetaContent(html: string, keys: string[]) {
  const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["'](?:${escaped})["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1]) : null;
}

function parseJsonLdBlocks(html: string) {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
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

function parseDateTimeString(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function guessCategory(text: string): ScrapedActivity["category"] {
  const value = text.toLowerCase();
  if (/(桌游|board\s*game|jenga|狼人杀|卡牌)/i.test(value)) return "BOARD_GAME";
  if (/(电影|cinema|movie|film)/i.test(value)) return "MOVIE";
  if (/(音乐|concert|live|dj|k-pop|kpop|festival|show|opera)/i.test(value)) return "MUSIC";
  if (/(运动|sport|run|fitness|yoga|tennis|足球|篮球|游泳)/i.test(value)) return "SPORTS";
  if (/(旅行|walk|city\s*walk|tour|travel|hike|voyage|漫步|散步)/i.test(value)) return "TRAVEL";
  if (/(美食|food|wine|drink|restaurant|café|cafe|brunch|dinner|cooking|餐|吃)/i.test(value)) return "FOOD";
  if (/(展|exhibition|museum|gallery|art|博物馆|艺术)/i.test(value)) return "EXHIBITION";
  return "OTHER";
}

function guessPriceType(priceText: string): ScrapedActivity["priceType"] {
  const value = priceText.toLowerCase();
  if (!value || /free|免费|0\s*€|0\s*eur|gratuit/.test(value)) return "FREE";
  if (/aa|split|各自|均摊/.test(value)) return "AA";
  if (/\d+\s*[-~至到]\s*\d+/.test(value)) return "RANGE";
  return "FIXED";
}

function clean(text: unknown) {
  return typeof text === "string" ? stripHtml(text) : "";
}

function fingerprintOf(item: Pick<ScrapedActivity, "title" | "startAt" | "address" | "source">) {
  return sha1(`${item.source}|${item.title.toLowerCase()}|${item.startAt}|${item.address.toLowerCase()}`);
}

async function fetchText(url: string, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseChineseDate(text: string, referenceYear = new Date().getFullYear()) {
  const normalized = text.replace(/\s+/g, "").replace(/\uFF0F/g, "/").replace(/\u2013|\u2014|\u2212/g, "-");
  const rangeMatch = normalized.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:至|到|-)(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日/);
  if (rangeMatch) {
    const [, yearA, monthA, dayA, yearB, monthB, dayB] = rangeMatch;
    const startYear = Number(yearA ?? yearB ?? referenceYear);
    const endYear = Number(yearB ?? yearA ?? startYear);
    const endMonth = Number(monthB ?? monthA) - 1;
    const start = new Date(Date.UTC(startYear, Number(monthA) - 1, Number(dayA), 9, 0, 0));
    const end = new Date(Date.UTC(endYear, endMonth, Number(dayB), 18, 0, 0));
    return { start, end };
  }
  const singleMatch = normalized.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (singleMatch) {
    const [, year, month, day] = singleMatch;
    return { start: new Date(Date.UTC(Number(year ?? referenceYear), Number(month) - 1, Number(day), 9, 0, 0)), end: null };
  }
  return null;
}

async function scrapePlayInParis(limit: number, timeoutMs = 30000): Promise<ScrapedActivity[]> {
  const html = await fetchText("https://playinparis.com/events/", timeoutMs);
  const events: Record<string, unknown>[] = [];
  for (const block of parseJsonLdBlocks(html)) {
    const collect = (node: unknown) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(collect);
      if (typeof node !== "object") return;
      const value = node as Record<string, unknown>;
      if (value["@type"] === "Event") events.push(value);
      if (value["@graph"]) collect(value["@graph"]);
      for (const child of Object.values(value)) collect(child);
    };
    collect(block);
  }

  return events
    .map<ScrapedActivity | null>((event) => {
      const url = typeof event.url === "string" ? event.url : "https://playinparis.com/events/";
      const title = typeof event.name === "string" ? clean(event.name) : "未命名活动";
      const description = clean(event.description) || title;
      const startAt = typeof event.startDate === "string" ? parseDateTimeString(event.startDate) : null;
      const endAt = typeof event.endDate === "string" ? parseDateTimeString(event.endDate) : null;
      if (!startAt) return null;
      const location = event.location as Record<string, unknown> | undefined;
      const address = location?.address && typeof location.address === "object"
        ? [
            (location.address as Record<string, unknown>).streetAddress,
            (location.address as Record<string, unknown>).addressLocality,
            (location.address as Record<string, unknown>).postalCode,
            (location.address as Record<string, unknown>).addressCountry,
          ].filter(Boolean).join(", ")
        : [location?.name, location?.description].filter(Boolean).join(" - ");
      const offer = Array.isArray(event.offers) ? event.offers[0] : event.offers;
      const price = offer && typeof offer === "object" ? (offer as Record<string, unknown>).price : undefined;
      const currency = offer && typeof offer === "object" ? (offer as Record<string, unknown>).priceCurrency : undefined;
      const priceText = price === undefined || price === null || price === "" ? "查看原文" : String(price) === "0" ? "免费" : currency ? `${price} ${currency}` : String(price);
      return {
        id: makeStableId("playinparis", url),
        source: "playinparis",
        sourceUrl: url,
        title,
        description,
        itinerary: null,
        type: "PUBLIC_EVENT",
        category: guessCategory(`${title} ${description}`),
        city: "Paris",
        destination: null,
        address: stripHtml(String(address || "Paris")),
        startAt: startAt.toISOString(),
        endAt: endAt?.toISOString() ?? null,
        capacity: 100,
        minParticipants: null,
        requiresApproval: false,
        priceType: guessPriceType(priceText),
        priceText,
        coverImageUrl: typeof event.image === "string" ? event.image : null,
        status: "RECRUITING",
        visibility: "PUBLIC",
      } satisfies ScrapedActivity;
    })
    .filter((item): item is ScrapedActivity => item !== null)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, limit);
}

async function scrapeSortirAParis(limit: number, timeoutMs = 30000, maxPages = 3): Promise<ScrapedActivity[]> {
  const listUrl = "https://www.sortiraparis.com/zh/zai-bali-wan-shenme/jiaoyi-hui-he-zhanlan";
  const prefix = `${listUrl}/articles/`;
  const found = new Map<string, ScrapedActivity>();

  const normalizeUrl = (url: string) => {
    try {
      const parsed = new URL(url, listUrl);
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return url;
    }
  };

  const extractArticleLinks = (html: string, baseUrl: string) => {
    const links = new Set<string>();
    for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
      const href = match[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
      const absolute = normalizeUrl(new URL(href, baseUrl).toString());
      if (absolute.startsWith(prefix)) links.add(absolute);
    }
    return [...links];
  };

  const parseArticlePage = (html: string, sourceUrl: string): ScrapedActivity | null => {
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

    const bodyText = stripHtml(html);
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
      id: makeStableId("sortiraparis", sourceUrl),
      source: "sortiraparis",
      sourceUrl,
      title,
      description,
      itinerary: null,
      type: "PUBLIC_EVENT",
      category: "EXHIBITION",
      city: "Paris",
      destination: null,
      address: "Paris, France",
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
  };

  for (let page = 1; page <= maxPages && found.size < limit; page += 1) {
    const pageUrl = page === 1 ? listUrl : `${listUrl}/page/${page}`;
    const html = await fetchText(pageUrl, timeoutMs);
    for (const link of extractArticleLinks(html, pageUrl)) {
      if (found.size >= limit) break;
      if (found.has(link)) continue;
      const article = parseArticlePage(await fetchText(link, timeoutMs), link);
      if (article) found.set(link, article);
    }
  }

  return [...found.values()].sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, limit);
}

export async function scrapeActivities(request: ScrapeRequest): Promise<ScrapedActivity[]> {
  const { sources, limit, timeoutMs = 30000, maxPages = 3, from, to } = request;
  const perSourceLimit = Math.max(Math.ceil(limit / Math.max(sources.length, 1)) + 4, limit);
  const [play, sortir] = await Promise.all([
    sources.includes("playinparis") ? scrapePlayInParis(perSourceLimit, timeoutMs) : Promise.resolve([]),
    sources.includes("sortiraparis") ? scrapeSortirAParis(perSourceLimit, timeoutMs, maxPages) : Promise.resolve([]),
  ]);

  const merged = [...play, ...sortir]
    .filter((item) => {
      const start = new Date(item.startAt);
      if (from && start < from) return false;
      if (to && start > to) return false;
      return true;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, limit);

  return merged;
}

export function buildFingerprint(activity: Pick<ScrapedActivity, "source" | "title" | "startAt" | "address">) {
  return fingerprintOf(activity);
}

export function buildStableActivityId(source: string, url: string) {
  return makeStableId(source, url);
}

