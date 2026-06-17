const deeplFreeEndpoint = "https://api-free.deepl.com/v2/translate";
const deeplRequestTimeoutMs = 8000;

const deeplTargetLanguages: Record<string, string> = {
  "zh-CN": "ZH",
  en: "EN-US",
  fr: "FR",
};

export function getDeepLTargetLanguage(locale: string) {
  return deeplTargetLanguages[locale] ?? deeplTargetLanguages["zh-CN"];
}

type DeepLTranslationResponse = {
  translations?: Array<{
    detected_source_language?: string;
    text?: string;
  }>;
};

export class DeepLConfigurationError extends Error {
  constructor() {
    super("DEEPL_API_KEY is not configured.");
    this.name = "DeepLConfigurationError";
  }
}

export class DeepLTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepLTranslationError";
  }
}

export async function translateTextWithDeepL({
  locale,
  text,
}: {
  locale: string;
  text: string;
}) {
  const apiKey = process.env.DEEPL_API_KEY?.trim();

  if (!apiKey) {
    throw new DeepLConfigurationError();
  }

  const body = new URLSearchParams();
  body.set("text", text);
  body.set("target_lang", getDeepLTargetLanguage(locale));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deeplRequestTimeoutMs);

  try {
    const response = await fetch(
      process.env.DEEPL_API_BASE_URL?.trim() || deeplFreeEndpoint,
      {
        body,
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new DeepLTranslationError(`DeepL returned ${response.status}.`);
    }

    const payload = (await response.json()) as DeepLTranslationResponse;
    const translation = payload.translations?.[0];
    const translatedText = translation?.text?.trim();

    if (!translatedText) {
      throw new DeepLTranslationError("DeepL returned an empty translation.");
    }

    return {
      detectedSourceLocale: translation?.detected_source_language ?? null,
      translatedText,
    };
  } finally {
    clearTimeout(timeout);
  }
}
