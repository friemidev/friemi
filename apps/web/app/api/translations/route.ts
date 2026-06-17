import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrCreateContentTranslation,
  TranslationRequestError,
} from "@/features/translations/services/contentTranslations";
import { translationEntityTypes } from "@/features/translations/types";

export const runtime = "nodejs";

const translationRequestSchema = z.object({
  accessToken: z.string().trim().max(256).optional().nullable(),
  entityId: z.string().trim().min(1).max(128),
  entityType: z.enum(translationEntityTypes),
  field: z.string().trim().min(1).max(64),
  locale: z.enum(["zh-CN", "en", "fr"]),
});

function getErrorStatus(error: unknown) {
  if (error instanceof TranslationRequestError) {
    return error.status;
  }

  return 500;
}

function getErrorCode(error: unknown) {
  if (error instanceof TranslationRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.name === "DeepLConfigurationError") {
    return "TRANSLATION_NOT_CONFIGURED";
  }

  if (error instanceof Error && error.name === "DeepLTranslationError") {
    return "TRANSLATION_PROVIDER_FAILED";
  }

  return "TRANSLATION_FAILED";
}

export async function POST(request: Request) {
  const payload = translationRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "INVALID_TRANSLATION_REQUEST",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const translation = await getOrCreateContentTranslation(payload.data);

    return NextResponse.json(translation);
  } catch (error) {
    const code = getErrorCode(error);

    if (code === "TRANSLATION_FAILED") {
      console.error("Failed to translate content", error);
    }

    return NextResponse.json(
      {
        error: code,
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
