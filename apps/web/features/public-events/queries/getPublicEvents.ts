import { prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { getActivityFriendSignalMap } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
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

const publicEventTeamWhere = {
  status: {
    in: publicEventTeamStatuses,
  },
  visibility: {
    in: publicActivityVisibility,
  },
  type: {
    not: "PUBLIC_EVENT" as const,
  },
  organizer: {
    status: "ACTIVE" as const,
  },
} satisfies Prisma.ActivityWhereInput;

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
  ticketUrl: true,
  ticketLabel: true,
  status: true,
  _count: {
    select: {
      favorites: true,
      teams: {
        where: publicEventTeamWhere,
      },
    },
  },
} satisfies Prisma.PublicEventSelect;

const publicEventDetailSelect = {
  ...publicEventSelect,
  teams: {
    where: publicEventTeamWhere,
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

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

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
    startAt: toIsoString(publicEvent.startAt) ?? new Date().toISOString(),
    endAt: toIsoString(publicEvent.endAt),
    priceType: publicEvent.priceType,
    priceText: publicEvent.priceText,
    coverImageUrl: publicEvent.coverImageUrl,
    officialUrl: publicEvent.officialUrl,
    ticketUrl: publicEvent.ticketUrl,
    ticketLabel: publicEvent.ticketLabel,
    status: publicEvent.status,
    favoriteCount: publicEvent._count.favorites,
    teamCount: publicEvent._count.teams,
  };
}

async function attachTeamStates(
  teams: ActivityCardViewModel[],
  viewerProfileId: string | null | undefined,
) {
  if (teams.length === 0) {
    return teams;
  }

  const viewerFriendIds = viewerProfileId
    ? await getViewerFriendIds(viewerProfileId)
    : [];
  const [teamsWithFavoriteState, friendSignalMap] = await Promise.all([
    attachActivityFavoriteStates(teams, viewerProfileId),
    getActivityFriendSignalMap(
      teams.map((team) => team.id),
      viewerProfileId,
      viewerFriendIds,
    ),
  ]);

  return teamsWithFavoriteState.map((team) => ({
    ...team,
    friendSignal: friendSignalMap.get(team.id) ?? null,
  }));
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
