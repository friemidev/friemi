import assert from "node:assert/strict";
import test from "node:test";
import {
  createSourceHash,
  isKnownCrawler,
  getBudgetPeriod,
  getDailyCharacterLimit,
  sourceMatchesLocale,
  splitTranslationText,
} from "./translationPolicy";

test("search engine rendering must not warm up unvisited API activity pages", () => {
  assert.equal(isKnownCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isKnownCrawler("facebookexternalhit/1.1"), true);
  assert.equal(isKnownCrawler("Mozilla/5.0 Chrome/130.0 Safari/537.36"), false);
});
import {
  getCloudflareConfiguration,
  requestCloudflare,
  TranslationProviderError,
} from "./cloudflare";
import { translateField } from "./translationProcessor";

test("changed content invalidates the cache; outer whitespace does not", () => {
  assert.equal(createSourceHash(" hello "), createSourceHash("hello"));
  assert.notEqual(createSourceHash("hello"), createSourceHash("hello again"));
});

test("daily budget resets at UTC midnight and stays within the application cap", () => {
  assert.equal(getDailyCharacterLimit("100000"), 100_000);
  for (const value of ["100001", "0", "-1", "abc", "2.5"])
    assert.throws(() => getDailyCharacterLimit(value));
  const before = getBudgetPeriod(new Date("2026-12-31T23:59:59Z"));
  assert.equal(before.id, "2026-12-31");
  assert.equal(before.end.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(getBudgetPeriod(before.end).id, "2027-01-01");
});

const config = { accountId: "0".repeat(32), token: "test" };
test("Cloudflare configuration requires explicit FREE plan and backend credentials", () => {
  const env = {
    CLOUDFLARE_TRANSLATOR_ENABLED: "true",
    CLOUDFLARE_WORKERS_PLAN: "FREE",
    CLOUDFLARE_ACCOUNT_ID: config.accountId,
    CLOUDFLARE_API_TOKEN: config.token,
  };
  assert.deepEqual(getCloudflareConfiguration(env), config);
  assert.throws(() =>
    getCloudflareConfiguration({ ...env, CLOUDFLARE_WORKERS_PLAN: "PAID" }),
  );
  assert.throws(() =>
    getCloudflareConfiguration({ ...env, CLOUDFLARE_API_TOKEN: "" }),
  );
  assert.throws(() =>
    getCloudflareConfiguration({ ...env, CLOUDFLARE_ACCOUNT_ID: "bad/id" }),
  );
  assert.throws(() =>
    getCloudflareConfiguration({
      ...env,
      CLOUDFLARE_TRANSLATOR_ENABLED: "false",
    }),
  );
});

test("Cloudflare free quota and paid model errors stop; transient throttling retains retry time", async () => {
  for (const [code, expected] of [
    [3036, "TRANSLATION_FREE_QUOTA_EXHAUSTED"],
    [5035, "TRANSLATION_PAID_MODEL_BLOCKED"],
  ] as const) {
    let calls = 0;
    await assert.rejects(
      requestCloudflare("translate", "hello", {
        locale: "fr",
        sourceLocale: "en",
        config,
        fetcher: async () => {
          calls++;
          return Response.json(
            { success: false, errors: [{ code }] },
            { status: code === 3036 ? 429 : 403 },
          );
        },
      }),
      (error: unknown) =>
        error instanceof TranslationProviderError && error.code === expected,
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    requestCloudflare("detect", "hello", {
      config,
      now: new Date("2026-10-13T12:00:00Z"),
      fetcher: async () =>
        Response.json(
          { success: false, errors: [{ code: 3040 }] },
          { status: 429, headers: { "retry-after": "120" } },
        ),
    }),
    (error: unknown) =>
      error instanceof TranslationProviderError &&
      error.retryAt?.toISOString() === "2026-10-13T12:02:00.000Z",
  );
});

test("Llama translation constrains target language and keeps untrusted source in JSON", async () => {
  const result = await requestCloudflare("translate", "你好", {
    config,
    locale: "fr",
    sourceLocale: "zh-Hans",
    fetcher: async (url, init) => {
      assert.equal(new URL(String(url)).hostname, "api.cloudflare.com");
      assert.ok(String(url).endsWith("@cf/meta/llama-3.1-8b-instruct"));
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(JSON.parse(body.messages[1].content), { text: "你好" });
      assert.match(
        body.messages[0].content,
        /Chinese text into natural French/,
      );
      assert.equal(
        body.response_format.json_schema.required[0],
        "translated_text",
      );
      assert.equal(body.max_tokens, 2048);
      return Response.json({
        success: true,
        result: { response: { translated_text: "Bonjour" } },
      });
    },
  });
  assert.equal(result[0]?.translations?.[0].text, "Bonjour");
  await assert.rejects(
    requestCloudflare("translate", "hello", {
      config,
      locale: "fr",
      sourceLocale: "en",
      fetcher: async () =>
        Response.json({
          success: true,
          result: { response: { translated_text: "" } },
        }),
    }),
    /TRANSLATION_EMPTY_RESPONSE/,
  );
});

test("Llama never accepts truncated or malformed translations as complete cache entries", async () => {
  for (const result of [
    { response: { translated_text: "Partial" }, finish_reason: "length" },
    {
      response: { translated_text: "Partial" },
      usage: { completion_tokens: 2048 },
    },
    {
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"translated_text":"Partial"}' },
        },
      ],
    },
    { response: '{"translated_text":"unfinished' },
    { response: { translated_text: 123 } },
  ]) {
    await assert.rejects(
      requestCloudflare("translate", "Bonjour", {
        config,
        locale: "en",
        sourceLocale: "fr",
        fetcher: async () => Response.json({ success: true, result }),
      }),
      /TRANSLATION_(INVALID|EMPTY)_RESPONSE/,
    );
  }
});

test("language detection handles structured JSON and rejects invalid or truncated output", async () => {
  for (const response of [{ language: "fr" }, '{"language":"FR"}']) {
    assert.equal(
      (
        await requestCloudflare("detect", "Bonjour", {
          config,
          fetcher: async () =>
            Response.json({ success: true, result: { response } }),
        })
      )[0]?.language,
      "fr",
    );
  }
  await assert.rejects(
    requestCloudflare("detect", "Bonjour", {
      config,
      fetcher: async () =>
        Response.json({
          success: true,
          result: { response: "The language is French" },
        }),
    }),
    /TRANSLATION_UNSUPPORTED_SOURCE/,
  );
  await assert.rejects(
    requestCloudflare("detect", "Bonjour", {
      config,
      fetcher: async () =>
        Response.json({
          success: true,
          result: {
            choices: [
              {
                finish_reason: "length",
                message: { content: '{"language":"fr"}' },
              },
            ],
          },
        }),
    }),
    /TRANSLATION_INVALID_RESPONSE/,
  );
});

test("source language stays original without sending it to Translate", async () => {
  assert.equal(sourceMatchesLocale("zh-Hans", "zh-CN"), true);
  assert.equal(sourceMatchesLocale("zh-Hant", "zh-CN"), false);
  let calls = 0;
  const result = await translateField(
    { text: "Bonjour", locale: "fr", sourceLocale: "fr" },
    {
      detect: async () => {
        throw new Error("Unexpected detect");
      },
      translate: async () => {
        calls += 1;
        return "Unexpected";
      },
    },
  );
  assert.equal(result.translatedText, "Bonjour");
  assert.equal(result.provider, "original");
  assert.equal(calls, 0);
});

test("real Workers AI three-letter detection responses normalize to ISO 639-1", async () => {
  for (const [language, expected] of [
    ["fra", "fr"],
    ["fre", "fr"],
    ["eng", "en"],
    ["zho", "zh"],
    ["chi", "zh"],
    ["cmn", "zh"],
    [" FRA ", "fr"],
    ["deu", "de"],
    ["spa", "es"],
  ]) {
    for (const response of [{ language }, JSON.stringify({ language })]) {
      const detected = await requestCloudflare(
        "detect",
        "Bonjour, retrouvons-nous samedi pour un café.",
        {
          config,
          fetcher: async () =>
            Response.json({ success: true, result: { response } }),
        },
      );
      assert.equal(detected[0]?.language, expected);
    }
  }
  for (const language of ["und", "xyz", "French", "", null, 123, {}]) {
    await assert.rejects(
      requestCloudflare("detect", "?", {
        config,
        fetcher: async () =>
          Response.json({ success: true, result: { response: { language } } }),
      }),
      /TRANSLATION_UNSUPPORTED_SOURCE/,
    );
  }
});

test("long content is chunked losslessly and URLs/newlines are preserved", async () => {
  const long = "😀".repeat(8_500);
  const chunks = splitTranslationText(long);
  assert.equal(chunks.join(""), long);
  assert.ok(
    chunks.every(
      (chunk) => chunk.length <= 1200 && !/^[\uDC00-\uDFFF]/.test(chunk),
    ),
  );
  const url = "https://example.com/reserve?date=2026-10-13&lang=fr";
  const input = `Bonjour\n\n${url}\nAu revoir`;
  const sent: string[] = [];
  const result = await translateField(
    { text: input, locale: "en", sourceLocale: "fr" },
    {
      detect: async () => "fr",
      translate: async (text) => {
        sent.push(text);
        return `EN:${text}`;
      },
    },
  );
  assert.equal(result.translatedText, `EN:Bonjour\n\n${url}\nEN:Au revoir`);
  assert.ok(sent.every((text) => !text.includes("https://")));
});

test("long translation chunks prefer complete sentences instead of splitting a condition", () => {
  const first = `${"A pleasant walk through the city. ".repeat(20)}\n`;
  const second =
    "If heavy rain is forecast, the organizer will notify everyone the evening before. ".repeat(
      20,
    );
  const input = first + second;
  const chunks = splitTranslationText(input);
  assert.equal(chunks.join(""), input);
  assert.ok(chunks.length > 1);
  assert.ok(
    chunks.slice(0, -1).every((chunk) => /[.!?。！？]\s*$/.test(chunk)),
  );
});

test("a provider failure never produces a partial field result", async () => {
  let calls = 0;
  await assert.rejects(
    translateField(
      { text: "a".repeat(16_100), locale: "en", sourceLocale: "fr" },
      {
        detect: async () => "fr",
        translate: async () => {
          if (++calls === 2)
            throw new TranslationProviderError(
              "TRANSLATION_FREE_QUOTA_EXHAUSTED",
            );
          return "translated";
        },
      },
    ),
    /TRANSLATION_FREE_QUOTA_EXHAUSTED/,
  );
  assert.equal(calls, 2);
});

test("legacy DeepL detection codes can be reused by Cloudflare", async () => {
  let source: string | undefined;
  const result = await translateField(
    { text: "Bonjour", locale: "en", sourceLocale: "FR" },
    {
      detect: async () => {
        throw new Error("Cached language should be reused");
      },
      translate: async (_text, _locale, sourceLocale) => {
        source = sourceLocale;
        return "Hello";
      },
    },
  );
  assert.equal(source, "fr");
  assert.equal(result.translatedText, "Hello");
});
