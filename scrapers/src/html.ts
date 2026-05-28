import { decodeHtmlEntities, normalizeWhitespace } from "./utils.js";

export function extractMetaContent(html: string, keys: string[]) {
  const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["'](?:${escaped})["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1]) : null;
}

export function extractJsonLdBlocks(html: string) {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = match[1].trim();
    if (raw) blocks.push(raw);
  }
  return blocks;
}

export function parseJsonLdBlocks(html: string) {
  const parsed: unknown[] = [];
  for (const block of extractJsonLdBlocks(html)) {
    try {
      parsed.push(JSON.parse(block));
    } catch {
      // Ignore malformed blocks.
    }
  }
  return parsed;
}

export function stripHtml(input: string) {
  const decoded = decodeHtmlEntities(input)
    .replace(/\\[rn]/g, " ")
    .replace(/\\t/g, " ");
  return normalizeWhitespace(
    decoded.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "),
  );
}

export function extractTextFromBody(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? stripHtml(bodyMatch[1]) : stripHtml(html);
}

export function extractHrefValues(html: string) {
  const hrefs: string[] = [];
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    hrefs.push(match[1]);
  }
  return hrefs;
}