import { NextResponse } from "next/server";
import { z } from "zod";
import {
  warmupViewedContent,
  TranslationRequestError,
} from "@/features/translations/services/contentTranslations";
import { isKnownCrawler } from "@/features/translations/services/translationPolicy";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  entityId: z.string().trim().min(1).max(128),
  entityType: z.enum(["activity", "public_event"]),
  locale: z.enum(["zh-CN", "en", "fr"]),
  accessToken: z.string().trim().max(256).nullish(),
});

export async function POST(request: Request) {
  // Search engines may execute client effects while rendering. Index cached
  // text without turning that crawl into bulk translation of API activities.
  if (isKnownCrawler(request.headers.get("user-agent"))) {
    return NextResponse.json(
      {
        ready: false,
        paused: "TRANSLATION_CRAWLER_SKIPPED",
        retryAfterSeconds: 60,
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "INVALID_TRANSLATION_REQUEST" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await warmupViewedContent(input.data), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof TranslationRequestError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "Viewed content translation failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "TRANSLATION_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
