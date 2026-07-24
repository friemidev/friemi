import { prisma } from "@/lib/prisma";
import {
  getFriendshipPair,
  getFriendshipPairKey,
} from "@/features/friends/utils/friendship";

export type ProfileVisitRecordResult =
  | {
      recorded: true;
      visitId: string;
      viewCount: number;
    }
  | {
      recorded: false;
      reason: "GUEST" | "SELF_VISIT" | "TARGET_NOT_FOUND";
    };

export type ProfileVisitorViewModel = {
  id: string;
  isFriend: boolean;
  lastVisitedAt: string;
  viewCount: number;
  visitor: {
    id: string;
    avatarUrl: string | null;
    friendCode: string | null;
    nickname: string;
  };
};

type RecentProfileVisitRow = {
  id: string;
  lastVisitedAt: Date;
  viewCount: number;
  visitorId: string;
  visitor: {
    id: string;
    avatarUrl: string | null;
    friendCode: string | null;
    nickname: string;
  };
};

type FriendshipPairRow = {
  userAId: string;
  userBId: string;
};

export function getProfileVisitDate(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function normalizeProfileVisitLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 30;
  }

  return Math.max(1, Math.min(80, Math.floor(limit)));
}

function mapProfileVisitor(
  row: RecentProfileVisitRow & { isFriend: boolean },
): ProfileVisitorViewModel {
  return {
    id: row.id,
    isFriend: row.isFriend,
    lastVisitedAt: row.lastVisitedAt.toISOString(),
    viewCount: row.viewCount,
    visitor: {
      id: row.visitor.id,
      avatarUrl: row.visitor.avatarUrl,
      friendCode: row.visitor.friendCode,
      nickname: row.visitor.nickname.trim() || row.visitor.friendCode || "NF",
    },
  };
}

export function selectRecentProfileVisitRows(
  rows: RecentProfileVisitRow[],
  limit = 30,
) {
  const normalizedLimit = normalizeProfileVisitLimit(limit);
  const seenVisitorIds = new Set<string>();
  const visitors: RecentProfileVisitRow[] = [];

  for (const row of rows) {
    if (seenVisitorIds.has(row.visitorId)) {
      continue;
    }

    seenVisitorIds.add(row.visitorId);
    visitors.push(row);

    if (visitors.length >= normalizedLimit) {
      break;
    }
  }

  return visitors;
}

export function buildProfileVisitorViewModels({
  friendships,
  profileId,
  visitors,
}: {
  friendships: FriendshipPairRow[];
  profileId: string;
  visitors: RecentProfileVisitRow[];
}) {
  const friendshipPairKeys = new Set(
    friendships.map((friendship) =>
      getFriendshipPairKey(friendship.userAId, friendship.userBId),
    ),
  );

  return visitors.map((visit) =>
    mapProfileVisitor({
      ...visit,
      isFriend: friendshipPairKeys.has(
        getFriendshipPairKey(profileId, visit.visitorId),
      ),
    }),
  );
}

export async function recordProfileVisit({
  now = new Date(),
  profileId,
  visitorId,
}: {
  now?: Date;
  profileId: string;
  visitorId: string | null | undefined;
}): Promise<ProfileVisitRecordResult> {
  if (!visitorId) {
    return {
      recorded: false,
      reason: "GUEST",
    };
  }

  if (profileId === visitorId) {
    return {
      recorded: false,
      reason: "SELF_VISIT",
    };
  }

  const targetProfile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!targetProfile) {
    return {
      recorded: false,
      reason: "TARGET_NOT_FOUND",
    };
  }

  const visitDate = getProfileVisitDate(now);
  const visit = await prisma.profileVisit.upsert({
    where: {
      profileId_visitorId_visitDate: {
        profileId,
        visitDate,
        visitorId,
      },
    },
    create: {
      lastVisitedAt: now,
      profileId,
      visitDate,
      visitorId,
    },
    update: {
      lastVisitedAt: now,
      viewCount: {
        increment: 1,
      },
    },
    select: {
      id: true,
      viewCount: true,
    },
  });

  return {
    recorded: true,
    visitId: visit.id,
    viewCount: visit.viewCount,
  };
}

export async function getRecentProfileVisitors(profileId: string, limit = 30) {
  const normalizedLimit = normalizeProfileVisitLimit(limit);
  const rows = await prisma.profileVisit.findMany({
    where: {
      profileId,
      visitor: {
        status: "ACTIVE",
      },
    },
    orderBy: {
      lastVisitedAt: "desc",
    },
    take: normalizedLimit * 3,
    select: {
      id: true,
      lastVisitedAt: true,
      viewCount: true,
      visitorId: true,
      visitor: {
        select: {
          id: true,
          avatarUrl: true,
          friendCode: true,
          nickname: true,
        },
      },
    },
  });
  const visitors = selectRecentProfileVisitRows(rows, normalizedLimit);

  if (visitors.length === 0) {
    return [];
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: visitors.map((visit) =>
        getFriendshipPair(profileId, visit.visitorId),
      ),
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });
  return buildProfileVisitorViewModels({
    friendships,
    profileId,
    visitors,
  });
}

export async function getProfileVisitSummary(
  profileId: string,
  now = new Date(),
) {
  const [summary] = await prisma.$queryRaw<
    {
      todayViewCount: bigint | number | null;
      totalViewCount: bigint | number | null;
      uniqueVisitorCount: bigint | number | null;
    }[]
  >`
    SELECT
      COALESCE(SUM("viewCount"), 0) AS "totalViewCount",
      COUNT(DISTINCT "visitorId") AS "uniqueVisitorCount",
      COALESCE(
        SUM("viewCount") FILTER (WHERE "visitDate" = ${getProfileVisitDate(
          now,
        )}::date),
        0
      ) AS "todayViewCount"
    FROM "ProfileVisit"
    WHERE "profileId" = ${profileId}
  `;

  return {
    todayViewCount: Number(summary?.todayViewCount ?? 0),
    totalViewCount: Number(summary?.totalViewCount ?? 0),
    uniqueVisitorCount: Number(summary?.uniqueVisitorCount ?? 0),
  };
}
