import {
  sourceMatchesLocale,
  normalizeSourceLocale,
  splitTranslationText,
  cloudflareTranslationProvider,
  type ContentLocale,
} from "./translationPolicy";

export type FieldTranslationInput = {
  text: string;
  locale: ContentLocale;
  sourceLocale?: string | null;
};

export type FieldTranslationDependencies = {
  detect(text: string): Promise<string>;
  translate(
    text: string,
    locale: ContentLocale,
    sourceLocale: string,
  ): Promise<string>;
};

// Pure orchestration so quota failures and partial requests can be tested without
// calling the provider or touching the project's database.
export async function translateField(
  input: FieldTranslationInput,
  dependencies: FieldTranslationDependencies,
) {
  // Unicode letters include Chinese, Japanese and Korean. Numbers, emoji,
  // punctuation and URLs alone have no linguistic content to translate.
  if (!/\p{L}/u.test(input.text.replace(/https?:\/\/[^\s<>"']+/g, ""))) {
    return {
      translatedText: input.text,
      detectedSourceLocale: "und",
      provider: "original",
    };
  }
  const sourceLocale = normalizeSourceLocale(
    input.sourceLocale ??
      (await dependencies.detect(input.text.slice(0, 1000))),
  );
  if (sourceMatchesLocale(sourceLocale, input.locale)) {
    return {
      translatedText: input.text,
      detectedSourceLocale: sourceLocale,
      provider: "original",
    };
  }
  const translated: string[] = [];
  // Preserve URLs exactly; ActivityRichDescription turns these into real links.
  const parts = input.text.split(/(https?:\/\/[^\s<>"']+)/g);
  for (const part of parts) {
    if (/^https?:\/\//.test(part) || !part.trim()) {
      translated.push(part);
      continue;
    }
    for (const chunk of splitTranslationText(part)) {
      const leading = chunk.match(/^\s*/)?.[0] ?? "";
      const trailing = chunk.match(/\s*$/)?.[0] ?? "";
      const text = chunk.trim();
      translated.push(
        text
          ? `${leading}${await dependencies.translate(text, input.locale, sourceLocale)}${trailing}`
          : chunk,
      );
    }
  }
  return {
    translatedText: translated.join(""),
    detectedSourceLocale: sourceLocale,
    provider: cloudflareTranslationProvider,
  };
}
