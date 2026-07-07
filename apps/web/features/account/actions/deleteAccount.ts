"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type DeleteAccountResult =
  | {
      ok: true;
    }
  | {
      error: "DELETE_FAILED" | "INVALID_LOCALE";
      ok: false;
    };

type DeleteAccountInput = {
  locale?: string;
};

function normalizeLocale(value: string | undefined) {
  const locale = value?.trim() || "zh-CN";

  return /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) ? locale : null;
}

async function deleteClerkUser(clerkUserId: string) {
  if (!hasClerkKeys() || !process.env.CLERK_SECRET_KEY) {
    return false;
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
      method: "DELETE",
    },
  );

  if (response.ok || response.status === 404) {
    return true;
  }

  console.error("Failed to delete Clerk user", {
    clerkUserId,
    status: response.status,
    statusText: response.statusText,
  });

  return false;
}

export async function deleteCurrentAccountAction(
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  const locale = normalizeLocale(input.locale);

  if (!locale) {
    return {
      error: "INVALID_LOCALE",
      ok: false,
    };
  }

  const profile = await getCurrentUserProfileForMutation(
    locale,
    "/account/security",
  );
  const deletedNickname = `Deleted user ${profile.id.slice(-6)}`;
  const deletedAt = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.activityFavorite.deleteMany({
          where: {
            userProfileId: profile.id,
          },
        });

        await tx.publicEventFavorite.deleteMany({
          where: {
            userProfileId: profile.id,
          },
        });

        await tx.userFollow.deleteMany({
          where: {
            OR: [{ followerId: profile.id }, { followingId: profile.id }],
          },
        });

        await tx.friendRequest.deleteMany({
          where: {
            OR: [{ requesterId: profile.id }, { receiverId: profile.id }],
          },
        });

        await tx.friendship.deleteMany({
          where: {
            OR: [{ userAId: profile.id }, { userBId: profile.id }],
          },
        });

        await tx.notification.deleteMany({
          where: {
            recipientId: profile.id,
          },
        });

        await tx.notification.updateMany({
          where: {
            actorId: profile.id,
          },
          data: {
            actorId: null,
          },
        });

        await tx.activityParticipant.updateMany({
          where: {
            userProfileId: profile.id,
          },
          data: {
            cancelledAt: deletedAt,
            message: null,
            status: "CANCELLED",
          },
        });

        await tx.guestActivityParticipant.updateMany({
          where: {
            linkedUserProfileId: profile.id,
          },
          data: {
            linkedUserProfileId: null,
          },
        });

        await tx.comment.updateMany({
          where: {
            authorId: profile.id,
          },
          data: {
            content: "[deleted]",
            deletedAt,
            pinnedByOrganizer: false,
          },
        });

        await tx.directMessage.updateMany({
          where: {
            senderId: profile.id,
          },
          data: {
            body: "[deleted]",
            readAt: deletedAt,
          },
        });

        await tx.activityAnnouncement.updateMany({
          where: {
            authorId: profile.id,
          },
          data: {
            content: "[deleted]",
          },
        });

        await tx.activityManagementLog.updateMany({
          where: {
            actorId: profile.id,
          },
          data: {
            actorId: null,
          },
        });

        await tx.mobileDevice.deleteMany({
          where: {
            userProfileId: profile.id,
          },
        });

        await tx.userProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            avatarUrl: null,
            bio: null,
            contactEmail: null,
            email: null,
            emailVerifiedAt: null,
            firstName: null,
            friendCode: null,
            interests: [],
            isCoCreator: false,
            lastName: null,
            nickname: deletedNickname,
            normalizedContactEmail: null,
            normalizedPhone: null,
            normalizedWechatId: null,
            phone: null,
            role: "USER",
            status: "DELETED",
            syncedAt: deletedAt,
            username: null,
            wechatId: null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    console.error("Failed to delete current account", error);

    return {
      error: "DELETE_FAILED",
      ok: false,
    };
  }

  const clerkDeleted = await deleteClerkUser(profile.clerkUserId).catch(
    (error) => {
      console.error("Failed to delete Clerk user", error);

      return false;
    },
  );

  if (clerkDeleted) {
    await prisma.userProfile.updateMany({
      where: {
        id: profile.id,
        status: "DELETED",
      },
      data: {
        clerkDeletedAt: deletedAt,
        syncedAt: deletedAt,
      },
    });
  }

  revalidatePath(withLocale(locale, "/"), "layout");
  revalidatePath(withLocale(locale, "/account/security"));
  revalidatePath(withLocale(locale, "/profile"));

  return {
    ok: true,
  };
}
