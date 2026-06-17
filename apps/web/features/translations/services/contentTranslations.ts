import { createHash } from "node:crypto";
import type { ActivityVisibility, ParticipantStatus, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { hasClerkKeys } from "@/lib/clerk";
import { translateTextWithDeepL } from "./deepl";
import {
  translatableFieldsByEntity,
  type TranslationEntityType,
  type TranslationResult,
} from "../types";

const participantAccessStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const publicVisibility: ActivityVisibility[] = ["PUBLIC"];
const maxTranslationSourceLength = 4000;

export class TranslationRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TranslationRequestError";
    this.status = status;
  }
}

function createSourceHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function isAllowedField(entityType: TranslationEntityType, field: string) {
  return (translatableFieldsByEntity[entityType] as readonly string[]).includes(
    field,
  );
}

function getNormalizedSourceText(value: string | null | undefined) {
  const text = value?.trim() ?? "";

  if (!text) {
    return null;
  }

  if (text.length > maxTranslationSourceLength) {
    throw new TranslationRequestError("SOURCE_TEXT_TOO_LONG", 413);
  }

  return text;
}

async function getViewerProfileId() {
  if (!hasClerkKeys()) {
    return null;
  }

  let userId: string | null = null;

  try {
    const authState = await auth();
    userId = authState.userId;
  } catch (error) {
    console.warn("Translation request continuing without Clerk auth context", error);
    return null;
  }

  if (!userId) {
    return null;
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
    },
  });

  return profile?.id ?? null;
}

function buildActivityTranslationAccessWhere({
  accessToken,
  viewerProfileId,
}: {
  accessToken?: string | null;
  viewerProfileId?: string | null;
}): Prisma.ActivityWhereInput {
  return {
    OR: [
      {
        visibility: {
          in: publicVisibility,
        },
      },
      ...(viewerProfileId
        ? [
            {
              organizerId: viewerProfileId,
            },
            {
              participants: {
                some: {
                  status: {
                    in: participantAccessStatuses,
                  },
                  userProfileId: viewerProfileId,
                },
              },
            },
          ]
        : []),
      ...(accessToken
        ? [
            {
              shareEnabled: true,
              shareToken: accessToken,
            },
          ]
        : []),
    ],
  };
}

function getActivityFieldValue(
  activity: {
    address: string;
    description: string;
    itinerary: string | null;
    priceText: string;
    title: string;
  },
  field: string,
) {
  switch (field) {
    case "title":
      return activity.title;
    case "description":
      return activity.description;
    case "address":
      return activity.address;
    case "priceText":
      return activity.priceText;
    case "itinerary":
      return activity.itinerary;
    default:
      return null;
  }
}

function getPublicEventFieldValue(
  publicEvent: {
    address: string;
    description: string;
    priceText: string | null;
    title: string;
  },
  field: string,
) {
  switch (field) {
    case "title":
      return publicEvent.title;
    case "description":
      return publicEvent.description;
    case "address":
      return publicEvent.address;
    case "priceText":
      return publicEvent.priceText;
    default:
      return null;
  }
}

async function getTranslationSource({
  accessToken,
  entityId,
  entityType,
  field,
  viewerProfileId,
}: {
  accessToken?: string | null;
  entityId: string;
  entityType: TranslationEntityType;
  field: string;
  viewerProfileId?: string | null;
}) {
  if (!isAllowedField(entityType, field)) {
    throw new TranslationRequestError("UNSUPPORTED_FIELD", 400);
  }

  if (entityType === "activity") {
    const activity = await prisma.activity.findFirst({
      where: {
        id: entityId,
        organizer: {
          status: "ACTIVE",
        },
        ...buildActivityTranslationAccessWhere({
          accessToken,
          viewerProfileId,
        }),
      },
      select: {
        address: true,
        description: true,
        itinerary: true,
        priceText: true,
        title: true,
      },
    });

    if (!activity) {
      throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
    }

    return getNormalizedSourceText(getActivityFieldValue(activity, field));
  }

  if (entityType === "public_event") {
    const publicEvent = await prisma.publicEvent.findFirst({
      where: {
        id: entityId,
        visibility: "PUBLIC",
      },
      select: {
        address: true,
        description: true,
        priceText: true,
        title: true,
      },
    });

    if (!publicEvent) {
      throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
    }

    return getNormalizedSourceText(getPublicEventFieldValue(publicEvent, field));
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: entityId,
      deletedAt: null,
      author: {
        status: "ACTIVE",
      },
      activity: {
        organizer: {
          status: "ACTIVE",
        },
        ...buildActivityTranslationAccessWhere({
          accessToken,
          viewerProfileId,
        }),
      },
    },
    select: {
      content: true,
    },
  });

  if (!comment) {
    throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
  }

  return getNormalizedSourceText(comment.content);
}

export async function getOrCreateContentTranslation({
  accessToken,
  entityId,
  entityType,
  field,
  locale,
}: {
  accessToken?: string | null;
  entityId: string;
  entityType: TranslationEntityType;
  field: string;
  locale: string;
}): Promise<TranslationResult> {
  const viewerProfileId = await getViewerProfileId();
  const originalText = await getTranslationSource({
    accessToken,
    entityId,
    entityType,
    field,
    viewerProfileId,
  });

  if (!originalText) {
    throw new TranslationRequestError("EMPTY_SOURCE_TEXT", 400);
  }

  const sourceHash = createSourceHash(originalText);
  const cachedTranslation = await prisma.contentTranslation.findUnique({
    where: {
      entityType_entityId_field_locale_sourceHash: {
        entityId,
        entityType,
        field,
        locale,
        sourceHash,
      },
    },
  });

  if (cachedTranslation) {
    return {
      cached: true,
      detectedSourceLocale: cachedTranslation.detectedSourceLocale,
      entityId,
      entityType,
      field,
      locale,
      originalText,
      translatedText: cachedTranslation.translatedText,
    };
  }

  const translated = await translateTextWithDeepL({
    locale,
    text: originalText,
  });
  const createdTranslation = await prisma.contentTranslation.upsert({
    create: {
      detectedSourceLocale: translated.detectedSourceLocale,
      entityId,
      entityType,
      field,
      locale,
      provider: "deepl",
      sourceHash,
      sourceText: originalText,
      translatedText: translated.translatedText,
    },
    update: {
      detectedSourceLocale: translated.detectedSourceLocale,
      provider: "deepl",
      sourceText: originalText,
      translatedText: translated.translatedText,
    },
    where: {
      entityType_entityId_field_locale_sourceHash: {
        entityId,
        entityType,
        field,
        locale,
        sourceHash,
      },
    },
  });

  return {
    cached: false,
    detectedSourceLocale: createdTranslation.detectedSourceLocale,
    entityId,
    entityType,
    field,
    locale,
    originalText,
    translatedText: createdTranslation.translatedText,
  };
}
