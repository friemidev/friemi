import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import type { ActivityCardViewModel } from "@/features/activities/types";
import type { PublicEventCardViewModel } from "@/features/public-events/types";
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

export async function getViewerPublicEventFavorite(
  publicEventId: string,
  viewerProfileId: string | null | undefined,
) {
  if (!viewerProfileId) {
    return false;
  }

  const publicEventFavorite = getPublicEventFavoriteDelegate();

  if (!publicEventFavorite) {
    return false;
  }

  try {
    const favorite = await publicEventFavorite.findUnique({
      where: {
        publicEventId_userProfileId: {
          publicEventId,
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

export async function attachPublicEventFavoriteStates(
  publicEvents: PublicEventCardViewModel[],
  viewerProfileId: string | null | undefined,
) {
  if (publicEvents.length === 0) {
    return publicEvents;
  }

  if (!viewerProfileId) {
    return publicEvents.map((publicEvent) => ({
      ...publicEvent,
      isFavorited: false,
    }));
  }

  const publicEventFavorite = getPublicEventFavoriteDelegate();

  if (!publicEventFavorite) {
    return publicEvents.map((publicEvent) => ({
      ...publicEvent,
      isFavorited: false,
    }));
  }

  try {
    const favorites = await publicEventFavorite.findMany({
      where: {
        userProfileId: viewerProfileId,
        publicEventId: {
          in: publicEvents.map((publicEvent) => publicEvent.id),
        },
      },
      select: {
        publicEventId: true,
      },
    });
    const favoritePublicEventIds = new Set(
      (favorites as { publicEventId: string }[]).map(
        (favorite) => favorite.publicEventId,
      ),
    );

    return publicEvents.map((publicEvent) => ({
      ...publicEvent,
      isFavorited: favoritePublicEventIds.has(publicEvent.id),
    }));
  } catch (error) {
    if (isMissingFavoriteTableError(error)) {
      return publicEvents.map((publicEvent) => ({
        ...publicEvent,
        isFavorited: false,
      }));
    }

    throw error;
  }
}
