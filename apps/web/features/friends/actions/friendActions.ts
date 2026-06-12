"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  normalizeAnalyticsLocale,
  type AnalyticsSourceSurface,
} from "@/features/analytics/events";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { createNotification } from "@/features/notifications/utils/createNotification";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getFriendsCopy } from "../copy";
import {
  findFriendRequestTargets,
  normalizeFriendRequestSearchTerm,
} from "../queries/findFriendRequestTarget";
import { getFriendshipPair, getFriendshipPairKey } from "../utils/friendship";

export type FriendActionState = {
  ok?: boolean;
  formError?: string;
};

type FriendRequestLookupType = "friend_code" | "nickname" | "profile";
type FriendActionReturnTo = "friends" | "messages";

const sendFriendRequestSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  searchTerm: z.string().trim().min(1).max(120),
  message: z.string().trim().max(240).optional(),
  returnTo: z.enum(["friends", "messages"]).default("friends"),
});

const sendFriendRequestToProfileSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  targetProfileId: z.string().trim().min(1),
  message: z.string().trim().max(240).optional(),
  returnTo: z.enum(["friends", "messages"]).default("friends"),
});

const requestActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  requestId: z.string().min(1),
  returnTo: z.enum(["friends", "messages"]).default("friends"),
});

const friendshipActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  friendshipId: z.string().min(1),
  redirectPath: z.string().trim().min(1).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function refreshFriends(locale: string) {
  revalidatePath(withLocale(locale, "/friends"));
  revalidatePath(withLocale(locale, "/messages"));
  revalidatePath(withLocale(locale, "/profile"));
}

function redirectAfterFriendAction(
  locale: string,
  returnTo: FriendActionReturnTo = "friends",
): never {
  redirect(
    withLocale(locale, returnTo === "messages" ? "/messages" : "/friends"),
  );
}

function getFriendAnalyticsSourceSurface(
  returnTo: FriendActionReturnTo,
): AnalyticsSourceSurface {
  return returnTo === "messages" ? "messages" : "profile";
}

function getFriendActionRoute(locale: string, returnTo: FriendActionReturnTo) {
  return `/${locale}${returnTo === "messages" ? "/messages" : "/friends"}`;
}

function trackFriendRequestSent({
  hasMessage,
  locale,
  lookupType,
  requestOrigin,
  route,
  sourceSurface,
  targetProfileId,
  viewerProfileId,
}: {
  hasMessage: boolean;
  locale: string;
  lookupType: FriendRequestLookupType;
  requestOrigin: "lookup_form" | "profile_action";
  route: string;
  sourceSurface: AnalyticsSourceSurface;
  targetProfileId: string;
  viewerProfileId: string;
}) {
  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "friend_request_sent",
      route,
      entityId: targetProfileId,
      entityType: "user",
      sourceSurface,
      properties: {
        has_message: hasMessage,
        lookup_type: lookupType,
        request_origin: requestOrigin,
      },
    },
    {
      userProfileId: viewerProfileId,
    },
  );
}

function recordFriendRequestLatency({
  durationMs,
  locale,
  route,
  sourceSurface,
  status,
  statusReason,
  targetProfileId,
  viewerProfileId,
}: {
  durationMs: number;
  locale: string;
  route: string;
  sourceSurface: AnalyticsSourceSurface;
  status: "failed" | "success";
  statusReason?: string | null;
  targetProfileId?: string | null;
  viewerProfileId?: string | null;
}) {
  recordOperationLatency({
    durationMs,
    entityId: targetProfileId || undefined,
    entityType: targetProfileId ? "user" : undefined,
    locale,
    operationKey: "friend_request",
    route,
    sourceSurface,
    status,
    statusReason,
    userProfileId: viewerProfileId,
  });
}

function trackFriendRequestAccepted({
  locale,
  requesterId,
  returnTo,
  viewerProfileId,
}: {
  locale: string;
  requesterId: string;
  returnTo: FriendActionReturnTo;
  viewerProfileId: string;
}) {
  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "friend_request_accepted",
      route: getFriendActionRoute(locale, returnTo),
      entityId: requesterId,
      entityType: "user",
      sourceSurface: getFriendAnalyticsSourceSurface(returnTo),
      properties: {
        accepted_from: returnTo,
      },
    },
    {
      userProfileId: viewerProfileId,
    },
  );
}

async function getExistingFriendship(userId: string, otherUserId: string) {
  const pair = getFriendshipPair(userId, otherUserId);

  return prisma.friendship.findUnique({
    where: {
      userAId_userBId: pair,
    },
    select: {
      id: true,
    },
  });
}

async function hasPendingFriendRequest(userId: string, otherUserId: string) {
  const pendingPairKey = getFriendshipPairKey(userId, otherUserId);
  const pendingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        {
          pendingPairKey,
        },
        {
          status: "PENDING",
          OR: [
            {
              requesterId: userId,
              receiverId: otherUserId,
            },
            {
              requesterId: otherUserId,
              receiverId: userId,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(pendingRequest);
}

async function createPendingFriendRequest({
  analytics,
  getDurationMs,
  locale,
  logContext,
  message,
  targetProfileId,
  t,
  viewerProfileId,
}: {
  analytics: {
    lookupType: FriendRequestLookupType;
    requestOrigin: "lookup_form" | "profile_action";
    route: string;
    sourceSurface: AnalyticsSourceSurface;
  };
  getDurationMs: () => number;
  locale: string;
  logContext: string;
  message?: string;
  targetProfileId: string;
  t: ReturnType<typeof getFriendsCopy>;
  viewerProfileId: string;
}): Promise<FriendActionState> {
  if (targetProfileId === viewerProfileId) {
    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale,
      route: analytics.route,
      sourceSurface: analytics.sourceSurface,
      status: "failed",
      statusReason: "self_request",
      targetProfileId,
      viewerProfileId,
    });

    return {
      formError: t.cannotAddSelf,
    };
  }

  try {
    const [existingFriendship, pendingRequestExists] = await Promise.all([
      getExistingFriendship(viewerProfileId, targetProfileId),
      hasPendingFriendRequest(viewerProfileId, targetProfileId),
    ]);

    if (existingFriendship) {
      recordFriendRequestLatency({
        durationMs: getDurationMs(),
        locale,
        route: analytics.route,
        sourceSurface: analytics.sourceSurface,
        status: "failed",
        statusReason: "already_friends",
        targetProfileId,
        viewerProfileId,
      });

      return {
        formError: t.alreadyFriends,
      };
    }

    if (pendingRequestExists) {
      recordFriendRequestLatency({
        durationMs: getDurationMs(),
        locale,
        route: analytics.route,
        sourceSurface: analytics.sourceSurface,
        status: "failed",
        statusReason: "pending_exists",
        targetProfileId,
        viewerProfileId,
      });

      return {
        formError: t.pendingExists,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.friendRequest.create({
        data: {
          requesterId: viewerProfileId,
          receiverId: targetProfileId,
          pendingPairKey: getFriendshipPairKey(
            viewerProfileId,
            targetProfileId,
          ),
          message: message || null,
        },
      });

      await createNotification(tx, {
        actorId: viewerProfileId,
        recipientId: targetProfileId,
        type: "FRIEND_REQUEST",
      });
    });
  } catch (error) {
    console.error(logContext, error);
    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale,
      route: analytics.route,
      sourceSurface: analytics.sourceSurface,
      status: "failed",
      statusReason:
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? "pending_exists"
          : "request_failed",
      targetProfileId,
      viewerProfileId,
    });

    return {
      formError:
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? t.pendingExists
          : t.failed,
    };
  }

  refreshFriends(locale);
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
  trackFriendRequestSent({
    hasMessage: Boolean(message?.trim()),
    locale,
    lookupType: analytics.lookupType,
    requestOrigin: analytics.requestOrigin,
    route: analytics.route,
    sourceSurface: analytics.sourceSurface,
    targetProfileId,
    viewerProfileId,
  });
  recordFriendRequestLatency({
    durationMs: getDurationMs(),
    locale,
    route: analytics.route,
    sourceSurface: analytics.sourceSurface,
    status: "success",
    targetProfileId,
    viewerProfileId,
  });

  return {
    ok: true,
  };
}

export async function sendFriendRequestAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const getDurationMs = createLatencyTimer();
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const rawReturnTo = getString(formData, "returnTo") || "friends";
  const result = sendFriendRequestSchema.safeParse({
    locale: fallbackLocale,
    searchTerm: getString(formData, "searchTerm"),
    message: getString(formData, "message") || undefined,
    returnTo: rawReturnTo,
  });

  if (!result.success) {
    const route = getFriendActionRoute(
      fallbackLocale,
      rawReturnTo === "messages" ? "messages" : "friends",
    );

    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale: fallbackLocale,
      route,
      sourceSurface: getFriendAnalyticsSourceSurface(
        rawReturnTo === "messages" ? "messages" : "friends",
      ),
      status: "failed",
      statusReason: "invalid_request",
    });

    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, message, returnTo } = result.data;
  const { friendCode, searchTerm } = normalizeFriendRequestSearchTerm(
    result.data.searchTerm,
  );
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  const targetUsers = await findFriendRequestTargets(searchTerm);
  const targetUser = targetUsers[0];

  if (!targetUser) {
    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale,
      route: getFriendActionRoute(locale, returnTo),
      sourceSurface: getFriendAnalyticsSourceSurface(returnTo),
      status: "failed",
      statusReason: "target_not_found",
      viewerProfileId: viewerProfile.id,
    });

    return {
      formError: t.targetNotFound,
    };
  }

  if (targetUsers.length > 1) {
    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale,
      route: getFriendActionRoute(locale, returnTo),
      sourceSurface: getFriendAnalyticsSourceSurface(returnTo),
      status: "failed",
      statusReason: "ambiguous_target",
      viewerProfileId: viewerProfile.id,
    });

    return {
      formError: t.ambiguousTarget,
    };
  }

  return createPendingFriendRequest({
    analytics: {
      lookupType: friendCode ? "friend_code" : "nickname",
      requestOrigin: "lookup_form",
      route: getFriendActionRoute(locale, returnTo),
      sourceSurface: getFriendAnalyticsSourceSurface(returnTo),
    },
    getDurationMs,
    locale,
    logContext: "Failed to send friend request",
    message,
    targetProfileId: targetUser.id,
    t,
    viewerProfileId: viewerProfile.id,
  });
}

export async function sendFriendRequestToProfileAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const getDurationMs = createLatencyTimer();
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const rawReturnTo = getString(formData, "returnTo") || "friends";
  const result = sendFriendRequestToProfileSchema.safeParse({
    locale: fallbackLocale,
    targetProfileId: getString(formData, "targetProfileId"),
    message: getString(formData, "message") || undefined,
    returnTo: rawReturnTo,
  });

  if (!result.success) {
    const route = getFriendActionRoute(
      fallbackLocale,
      rawReturnTo === "messages" ? "messages" : "friends",
    );

    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale: fallbackLocale,
      route,
      sourceSurface: getFriendAnalyticsSourceSurface(
        rawReturnTo === "messages" ? "messages" : "friends",
      ),
      status: "failed",
      statusReason: "invalid_request",
    });

    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, message } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  const targetUser = await prisma.userProfile.findFirst({
    where: {
      id: result.data.targetProfileId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!targetUser) {
    recordFriendRequestLatency({
      durationMs: getDurationMs(),
      locale,
      route: `/${locale}/profile/${result.data.targetProfileId}`,
      sourceSurface: "profile",
      status: "failed",
      statusReason: "target_not_found",
      viewerProfileId: viewerProfile.id,
    });

    return {
      formError: t.targetNotFound,
    };
  }

  return createPendingFriendRequest({
    analytics: {
      lookupType: "profile",
      requestOrigin: "profile_action",
      route: `/${locale}/profile/${targetUser.id}`,
      sourceSurface: "profile",
    },
    getDurationMs,
    locale,
    logContext: "Failed to send friend request to profile",
    message,
    targetProfileId: targetUser.id,
    t,
    viewerProfileId: viewerProfile.id,
  });
}

export async function acceptFriendRequestAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const result = requestActionSchema.safeParse({
    locale: fallbackLocale,
    requestId: getString(formData, "requestId"),
    returnTo: getString(formData, "returnTo") || "friends",
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId, returnTo } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  try {
    const request = await prisma.friendRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    if (
      !request ||
      request.receiverId !== viewerProfile.id ||
      request.status !== "PENDING"
    ) {
      return {
        formError: t.requestUnavailable,
      };
    }

    const pair = getFriendshipPair(request.requesterId, request.receiverId);

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: "ACCEPTED",
          pendingPairKey: null,
          respondedAt: new Date(),
        },
      }),
      prisma.friendship.upsert({
        where: {
          userAId_userBId: pair,
        },
        create: pair,
        update: {},
      }),
      prisma.notification.updateMany({
        where: {
          recipientId: viewerProfile.id,
          actorId: request.requesterId,
          type: "FRIEND_REQUEST",
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      }),
    ]);

    trackFriendRequestAccepted({
      locale,
      requesterId: request.requesterId,
      returnTo,
      viewerProfileId: viewerProfile.id,
    });
  } catch (error) {
    console.error("Failed to accept friend request", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
  redirectAfterFriendAction(locale, returnTo);
}

export async function rejectFriendRequestAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const result = requestActionSchema.safeParse({
    locale: fallbackLocale,
    requestId: getString(formData, "requestId"),
    returnTo: getString(formData, "returnTo") || "friends",
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId, returnTo } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  try {
    const request = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: viewerProfile.id,
        status: "PENDING",
      },
      select: {
        requesterId: true,
      },
    });

    if (!request) {
      return {
        formError: t.requestUnavailable,
      };
    }

    const updatedRequest = await prisma.friendRequest.updateMany({
      where: {
        id: requestId,
        receiverId: viewerProfile.id,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        pendingPairKey: null,
        respondedAt: new Date(),
      },
    });

    if (updatedRequest.count === 0) {
      return {
        formError: t.requestUnavailable,
      };
    }

    await prisma.notification.updateMany({
      where: {
        recipientId: viewerProfile.id,
        type: "FRIEND_REQUEST",
        readAt: null,
        actorId: request.requesterId,
      },
      data: {
        readAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to reject friend request", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
  redirectAfterFriendAction(locale, returnTo);
}

export async function cancelFriendRequestAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const result = requestActionSchema.safeParse({
    locale: fallbackLocale,
    requestId: getString(formData, "requestId"),
    returnTo: getString(formData, "returnTo") || "friends",
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId, returnTo } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  try {
    const updatedRequest = await prisma.friendRequest.updateMany({
      where: {
        id: requestId,
        requesterId: viewerProfile.id,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        pendingPairKey: null,
        cancelledAt: new Date(),
      },
    });

    if (updatedRequest.count === 0) {
      return {
        formError: t.requestUnavailable,
      };
    }
  } catch (error) {
    console.error("Failed to cancel friend request", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  redirectAfterFriendAction(locale, returnTo);
}

export async function removeFriendshipAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const result = friendshipActionSchema.safeParse({
    locale: fallbackLocale,
    friendshipId: getString(formData, "friendshipId"),
    redirectPath: getString(formData, "redirectPath") || undefined,
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, friendshipId, redirectPath } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  try {
    const deletedFriendship = await prisma.friendship.deleteMany({
      where: {
        id: friendshipId,
        OR: [{ userAId: viewerProfile.id }, { userBId: viewerProfile.id }],
      },
    });

    if (deletedFriendship.count === 0) {
      return {
        formError: t.friendshipUnavailable,
      };
    }
  } catch (error) {
    console.error("Failed to remove friendship", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  if (redirectPath) {
    revalidatePath(withLocale(locale, redirectPath));
    redirect(withLocale(locale, redirectPath));
  }
  redirectAfterFriendAction(locale);
}
