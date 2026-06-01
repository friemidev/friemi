import { prisma } from "@/lib/prisma";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { Prisma } from "@prisma/client";

function isMissingFavoriteTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export async function getViewerActivityFavorite(
  activityId: string,
  viewerProfileId: string | null | undefined,
) {
  if (!viewerProfileId) {
    return false;
  }

  try {
    const favorite = await prisma.activityFavorite.findUnique({
      where: {
        activityId_userProfileId: {
          activityId,
          userProfileId: viewerProfileId,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(favorite);
  } catch (error) {
    if (isMissingFavoriteTableError(error)) {
      return false;
    }

    throw error;
  }
}

export async function attachActivityFavoriteStates(
  activities: ActivityCardViewModel[],
  viewerProfileId: string | null | undefined,
) {
  if (activities.length === 0) {
    return activities;
  }

  if (!viewerProfileId) {
    return activities.map((activity) => ({
      ...activity,
      isFavorited: false,
    }));
  }

  try {
    const favorites = await prisma.activityFavorite.findMany({
      where: {
        userProfileId: viewerProfileId,
        activityId: {
          in: activities.map((activity) => activity.id),
        },
      },
      select: {
        activityId: true,
      },
    });
    const favoriteActivityIds = new Set(
      favorites.map((favorite) => favorite.activityId),
    );

    return activities.map((activity) => ({
      ...activity,
      isFavorited: favoriteActivityIds.has(activity.id),
    }));
  } catch (error) {
    if (isMissingFavoriteTableError(error)) {
      return activities.map((activity) => ({
        ...activity,
        isFavorited: false,
      }));
    }

    throw error;
  }
}
