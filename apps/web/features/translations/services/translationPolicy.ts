import { createHash } from "node:crypto";

export const contentLocales = ["zh-CN", "en", "fr"] as const;
export type ContentLocale = (typeof contentLocales)[number];
export const cloudflareTranslationProvider =
  "cloudflare:llama-3.3-70b-instruct-fp8-fast:v1";
export const translationChunkVersion = "llama-3.3-70b-v1";
export const reusableTranslationProviders = [
  "deepl",
  "original",
  "cloudflare:llama-3.1-8b-instruct:v1",
  cloudflareTranslationProvider,
];
export const automaticTranslationFields = ["title", "description"] as const;
export const contentLanguages: Record<ContentLocale, string> = {
  "zh-CN": "zh",
  en: "en",
  fr: "fr",
};

export function normalizeSourceText(text: string | null | undefined) {
  return text?.trim() ?? "";
}

export function createSourceHash(text: string) {
  return createHash("sha256").update(normalizeSourceText(text)).digest("hex");
}

export function isContentLocale(locale: string): locale is ContentLocale {
  return contentLocales.includes(locale as ContentLocale);
}

export function isKnownCrawler(userAgent: string | null) {
  return /bot\b|crawler|spider|facebookexternalhit|bingpreview|slurp/i.test(
    userAgent ?? "",
  );
}

export function sourceMatchesLocale(
  source: string | null,
  locale: ContentLocale,
) {
  if (!source) return false;
  const language = source.toLowerCase();
  return locale === "zh-CN"
    ? ["zh", "zh-hans", "zh-cn"].includes(language)
    : language.split("-")[0] === locale;
}

export function normalizeSourceLocale(source: string) {
  const code = source.toLowerCase();
  if (["zh", "zh-cn", "zh-hans"].includes(code)) return "zh-Hans";
  if (["zh-tw", "zh-hant"].includes(code)) return "zh-Hant";
  if (code.startsWith("en-")) return "en";
  return code;
}

// Extra application guard in characters. Cloudflare independently enforces its
// daily 10,000-Neuron allowance; characters are NOT equivalent to Neurons.
export function getDailyCharacterLimit(
  value = process.env.CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT,
) {
  const limit = Number(value ?? 100_000);
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100_000) {
    throw new Error(
      "CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT must be between 1 and 100000.",
    );
  }
  return limit;
}

export function getBudgetPeriod(now: Date) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 86_400_000);
  return { id: start.toISOString().slice(0, 10), start, end };
}

// Keep enough context for Llama, with a bounded output budget. Prefer complete
// paragraphs/sentences; preserve whitespace and Unicode surrogate pairs.
export function splitTranslationText(text: string, maxLength = 1200) {
  if (!Number.isInteger(maxLength) || maxLength < 2)
    throw new Error("Invalid chunk size.");
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let boundary = remaining.lastIndexOf("\n", maxLength);
    if (boundary < maxLength / 2) {
      const sentences = [
        ...remaining
          .slice(0, maxLength)
          .matchAll(/[.!?](?:["'”’)]*)(?=\s|$)|[。！？](?:["'”’」』）)]*)/g),
      ];
      const lastSentence = sentences.at(-1);
      boundary = lastSentence
        ? lastSentence.index + lastSentence[0].length
        : -1;
    }
    if (boundary < maxLength / 2)
      boundary = remaining.lastIndexOf(" ", maxLength);
    if (boundary < maxLength / 2) boundary = maxLength;
    if (/^[\uDC00-\uDFFF]$/.test(remaining[boundary])) boundary -= 1;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
