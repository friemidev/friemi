"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getFriendsCopy } from "../copy";
import { getFriendshipPair, getFriendshipPairKey } from "../utils/friendship";

export type FriendActionState = {
  formError?: string;
};

const sendFriendRequestSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  searchTerm: z.string().trim().min(1).max(120),
  message: z.string().trim().max(240).optional(),
  returnTo: z.enum(["friends", "messages"]).default("friends"),
});

const requestActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  requestId: z.string().min(1),
});

const friendshipActionSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  friendshipId: z.string().min(1),
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
  returnTo: "friends" | "messages" = "friends",
): never {
  redirect(
    withLocale(locale, returnTo === "messages" ? "/messages" : "/friends"),
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

export async function sendFriendRequestAction(
  _previousState: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFriendsCopy(fallbackLocale);
  const result = sendFriendRequestSchema.safeParse({
    locale: fallbackLocale,
    searchTerm: getString(formData, "searchTerm"),
    message: getString(formData, "message") || undefined,
    returnTo: getString(formData, "returnTo") || "friends",
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, searchTerm, message, returnTo } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);
  const friendCodeQuery = /^\d{6}$/.test(searchTerm)
    ? [
        {
          friendCode: searchTerm,
        },
      ]
    : [];

  try {
    const targetUsers = await prisma.userProfile.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          {
            email: {
              equals: searchTerm,
              mode: "insensitive",
            },
          },
          {
            nickname: {
              equals: searchTerm,
              mode: "insensitive",
            },
          },
          ...friendCodeQuery,
        ],
      },
      select: {
        id: true,
      },
      take: 2,
    });
    const targetUser = targetUsers[0];

    if (!targetUser) {
      return {
        formError: t.targetNotFound,
      };
    }

    if (targetUsers.length > 1) {
      return {
        formError: t.ambiguousTarget,
      };
    }

    if (targetUser.id === viewerProfile.id) {
      return {
        formError: t.cannotAddSelf,
      };
    }

    const [existingFriendship, pendingRequestExists] = await Promise.all([
      getExistingFriendship(viewerProfile.id, targetUser.id),
      hasPendingFriendRequest(viewerProfile.id, targetUser.id),
    ]);

    if (existingFriendship) {
      return {
        formError: t.alreadyFriends,
      };
    }

    if (pendingRequestExists) {
      return {
        formError: t.pendingExists,
      };
    }

    await prisma.friendRequest.create({
      data: {
        requesterId: viewerProfile.id,
        receiverId: targetUser.id,
        pendingPairKey: getFriendshipPairKey(viewerProfile.id, targetUser.id),
        message: message || null,
      },
    });
  } catch (error) {
    console.error("Failed to send friend request", error);
    return {
      formError:
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? t.pendingExists
          : t.failed,
    };
  }

  refreshFriends(locale);
  redirectAfterFriendAction(locale, returnTo);
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
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId } = result.data;
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
    ]);
  } catch (error) {
    console.error("Failed to accept friend request", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  redirectAfterFriendAction(locale);
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
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId } = result.data;
  const t = getFriendsCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  try {
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
  } catch (error) {
    console.error("Failed to reject friend request", error);
    return {
      formError: t.failed,
    };
  }

  refreshFriends(locale);
  redirectAfterFriendAction(locale);
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
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, requestId } = result.data;
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
  redirectAfterFriendAction(locale);
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
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, friendshipId } = result.data;
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
  redirectAfterFriendAction(locale);
}
