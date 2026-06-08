import { prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachActivityFriendSignals } from "@/features/friends/queries/getActivityFriendSignals";
import {
  activityCardSelect,
  getActivityCardViewModel,
  publicActivityVisibility,
} from "@/features/activities/queries/getActivities";
import {
  getActivityDisplayStatus,
  getActivityTimeState,
} from "@/features/activities/utils/activityDisplay";
import type { ActivityCardViewModel } from "@/features/activities/types";
import type {
  PublicEventCardViewModel,
  PublicEventDetailViewModel,
} from "../types";
import type { ActivityStatus, Prisma } from "@prisma/client";

const publicEventTeamStatuses: ActivityStatus[] = [
  "OPEN",
  "RECRUITING",
  "CONFIRMED",
  "FULL",
  "ENDED",
];

export const publicEventSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  startAt: true,
  endAt: true,
  priceType: true,
  priceText: true,
  coverImageUrl: true,
  officialUrl: true,
  status: true,
  _count: {
    select: {
      favorites: true,
      teams: {
        where: {
          status: {
            in: publicEventTeamStatuses,
          },
          visibility: {
            in: publicActivityVisibility,
          },
          organizer: {
            status: "ACTIVE",
          },
        },
      },
    },
  },
} satisfies Prisma.PublicEventSelect;

const publicEventDetailSelect = {
  ...publicEventSelect,
  teams: {
    where: {
      status: {
        in: publicEventTeamStatuses,
      },
      visibility: {
        in: publicActivityVisibility,
      },
      organizer: {
        status: "ACTIVE",
      },
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: activityCardSelect,
  },
} satisfies Prisma.PublicEventSelect;

type PublicEventQueryResult = Prisma.PublicEventGetPayload<{
  select: typeof publicEventSelect;
}>;

type PublicEventDetailQueryResult = Prisma.PublicEventGetPayload<{
  select: typeof publicEventDetailSelect;
}>;

export function getUpcomingPublicEventWhere(
  now = new Date(),
): Prisma.PublicEventWhereInput {
  return {
    OR: [
      {
        startAt: {
          gte: now,
        },
      },
      {
        endAt: {
          gte: now,
        },
      },
    ],
    status: "SCHEDULED",
    visibility: "PUBLIC",
  };
}

export function getPublicEventCardViewModel(
  publicEvent: PublicEventQueryResult,
): PublicEventCardViewModel {
  return {
    id: publicEvent.id,
    title: publicEvent.title,
    description: publicEvent.description,
    category: publicEvent.category,
    city: publicEvent.city,
    address: publicEvent.address,
    latitude: publicEvent.latitude,
    longitude: publicEvent.longitude,
    startAt: publicEvent.startAt.toISOString(),
    endAt: publicEvent.endAt?.toISOString() ?? null,
    priceType: publicEvent.priceType,
    priceText: publicEvent.priceText,
    coverImageUrl: publicEvent.coverImageUrl,
    officialUrl: publicEvent.officialUrl,
    status: publicEvent.status,
    favoriteCount: publicEvent._count.favorites,
    teamCount: publicEvent._count.teams,
  };
}

async function attachTeamStates(
  teams: ActivityCardViewModel[],
  viewerProfileId: string | null | undefined,
) {
  return attachActivityFavoriteStates(
    await attachActivityFriendSignals(teams, viewerProfileId),
    viewerProfileId,
  );
}

function getPublicEventTeamPriority(team: ActivityCardViewModel, now: Date) {
  const displayStatus = getActivityDisplayStatus(team);

  if (displayStatus === "OPEN") {
    const timeState = getActivityTimeState(team, now);

    if (timeState === "ONGOING") {
      return 0;
    }

    if (timeState === "UPCOMING") {
      return 1;
    }

    return 3;
  }

  if (displayStatus === "FULL") {
    return 2;
  }

  if (displayStatus === "ENDED") {
    return 4;
  }

  if (displayStatus === "CANCELLED") {
    return 5;
  }

  return 6;
}

function sortPublicEventTeams(teams: ActivityCardViewModel[]) {
  const now = new Date();

  return [...teams].sort((left, right) => {
    const priorityDiff =
      getPublicEventTeamPriority(left, now) -
      getPublicEventTeamPriority(right, now);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      new Date(left.startAt).getTime() - new Date(right.startAt).getTime() ||
      left.id.localeCompare(right.id)
    );
  });
}

export async function getPublicEvents(
  options: { limit?: number; viewerProfileId?: string | null } = {},
): Promise<PublicEventCardViewModel[]> {
  const publicEvents = await prisma.publicEvent.findMany({
    where: getUpcomingPublicEventWhere(),
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: options.limit ?? 30,
    select: publicEventSelect,
  });

  return attachPublicEventFavoriteStates(
    publicEvents.map(getPublicEventCardViewModel),
    options.viewerProfileId,
  );
}

export async function getPublicEventById(
  publicEventId: string,
  viewerProfileId?: string | null,
): Promise<PublicEventDetailViewModel | null> {
  const publicEvent = await prisma.publicEvent.findFirst({
    where: {
      id: publicEventId,
      visibility: "PUBLIC",
    },
    select: publicEventDetailSelect,
  });

  if (!publicEvent) {
    return null;
  }

  const card = getPublicEventCardViewModel(publicEvent);
  const [favoriteState] = await attachPublicEventFavoriteStates(
    [card],
    viewerProfileId,
  );
  const teams = await attachTeamStates(
    sortPublicEventTeams(publicEvent.teams.map(getActivityCardViewModel)),
    viewerProfileId,
  );

  return {
    ...favoriteState,
    teams,
  };
}
