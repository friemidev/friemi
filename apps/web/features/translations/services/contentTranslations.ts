import type {
  ActivityVisibility,
  ParticipantStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasClerkKeys } from "@/lib/clerk";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { buildPrivateActivityFriendAccessWhere } from "@/features/activities/utils/activityShareAccess";
import { isLegacyActivityInfoSource } from "@/features/activities/utils/activityInfoSource";
import {
  createSourceHash,
  isContentLocale,
  reusableTranslationProviders,
} from "./translationPolicy";
import {
  enqueueTranslations,
  processTranslationQueue,
} from "./translationQueue";
import { TranslationProviderError } from "./cloudflare";
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
const maxTranslationSourceLength = 100_000;

export class TranslationRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TranslationRequestError";
    this.status = status;
  }
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
    const { auth } = await import("@clerk/nextjs/server");
    const authState = await auth();
    userId = authState.userId;
  } catch (error) {
    console.warn(
      "Translation request continuing without Clerk auth context",
      error,
    );
    return null;
  }

  if (!userId) {
    return null;
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: userId,
      status: "ACTIVE",
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
  viewerFriendIds = [],
}: {
  accessToken?: string | null;
  viewerProfileId?: string | null;
  viewerFriendIds?: string[];
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
            { coManagers: { some: { managerProfileId: viewerProfileId } } },
            ...buildPrivateActivityFriendAccessWhere(viewerFriendIds),
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

export async function getTranslationSource({
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

  // Chat content is read from the database only after checking the viewer's
  // existing chat permissions, including deletions and recalled messages.
  if (
    ["direct_message", "activity_room_message", "planet_message"].includes(
      entityType,
    )
  ) {
    if (!viewerProfileId)
      throw new TranslationRequestError("AUTH_REQUIRED", 401);
    if (entityType === "direct_message") {
      const message = await prisma.directMessage.findFirst({
        where: {
          id: entityId,
          recalledAt: null,
          deletions: { none: { profileId: viewerProfileId } },
          conversation: {
            OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
          },
        },
        select: { body: true },
      });
      if (!message) throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
      return getNormalizedSourceText(message.body);
    }
    if (entityType === "activity_room_message") {
      const message = await prisma.activityRoomMessage.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { activityId: true, body: true },
      });
      const { canViewActivityRoomChat } =
        await import("@/features/activity-room-chat/services/activityRoomChat");
      if (
        !message ||
        !(await canViewActivityRoomChat(viewerProfileId, message.activityId))
      )
        throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
      return getNormalizedSourceText(message.body);
    }
    const message = await prisma.planetMessage.findFirst({
      where: {
        id: entityId,
        planet: {
          members: { some: { profileId: viewerProfileId, status: "APPROVED" } },
        },
      },
      select: { content: true },
    });
    if (!message) throw new TranslationRequestError("ENTITY_NOT_FOUND", 404);
    return getNormalizedSourceText(message.content);
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
          viewerFriendIds: viewerProfileId
            ? await getViewerFriendIds(viewerProfileId)
            : [],
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

    return getNormalizedSourceText(
      getPublicEventFieldValue(publicEvent, field),
    );
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
          viewerFriendIds: viewerProfileId
            ? await getViewerFriendIds(viewerProfileId)
            : [],
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
      provider: { in: reusableTranslationProviders },
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

  if (!isContentLocale(locale))
    throw new TranslationRequestError("UNSUPPORTED_LOCALE");
  await enqueueTranslations({
    entityId,
    entityType,
    fields: { [field]: originalText },
    locales: [locale],
  });
  const result = await processTranslationQueue({
    entityId,
    entityType,
    locale,
    field,
    limit: 1,
  });
  const createdTranslation = await prisma.contentTranslation.findUnique({
    where: {
      provider: { in: reusableTranslationProviders },
      entityType_entityId_field_locale_sourceHash: {
        entityId,
        entityType,
        field,
        locale,
        sourceHash,
      },
    },
  });
  if (!createdTranslation)
    throw new TranslationProviderError(result.paused ?? "TRANSLATION_PENDING");

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

// Read and authorize the ORIGINAL fields before enqueueing. Never trust content
// supplied by the browser, even when it is displayed on the current page.
export async function warmupViewedContent({
  entityId,
  entityType,
  locale,
  accessToken,
}: {
  entityId: string;
  entityType: "activity" | "public_event";
  locale: string;
  accessToken?: string | null;
}) {
  if (!isContentLocale(locale))
    throw new TranslationRequestError("UNSUPPORTED_LOCALE");
  const viewerProfileId = await getViewerProfileId();
  const fields: Record<string, string | null> = {};
  for (const field of ["title", "description"]) {
    fields[field] = await getTranslationSource({
      entityId,
      entityType,
      field,
      accessToken,
      viewerProfileId,
    });
  }
  const activitySource =
    entityType === "activity"
      ? await prisma.activity.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            type: true,
            publicEventId: true,
            source: true,
            sourceUrl: true,
            externalSource: true,
            externalId: true,
            externalUrl: true,
            importedAt: true,
            sourcePayload: true,
          },
        })
      : null;
  const isGathering =
    activitySource &&
    activitySource.type !== "PUBLIC_EVENT" &&
    !isLegacyActivityInfoSource(activitySource);
  await enqueueTranslations({
    entityId,
    entityType,
    fields,
    locales: isGathering ? ["zh-CN", "en", "fr"] : [locale],
  });
  const result = await processTranslationQueue({
    entityId,
    entityType,
    locale,
    limit: 2,
  });
  const keys = Object.entries(fields)
    .filter(([, text]) => text)
    .map(([field, text]) => ({ field, sourceHash: createSourceHash(text!) }));
  const cached = await prisma.contentTranslation.count({
    where: {
      entityId,
      entityType,
      locale,
      OR: keys,
      provider: { in: reusableTranslationProviders },
    },
  });
  return {
    ready: cached === keys.length,
    paused: result.paused,
    retryAfterSeconds: 60,
  };
}
