import { createHash } from "node:crypto";

const entityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
};

export function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(input: string) {
  return input
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
      }
      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
      }
      return entityMap[entity] ?? _;
    })
    .replace(/\u00a0/g, " ");
}

export function stripHtmlTags(input: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(input.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")),
  );
}

export function sha1(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

export function resolveRelativeUrl(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

export function cleanHtmlText(input: string) {
  return normalizeWhitespace(decodeHtmlEntities(input));
}
