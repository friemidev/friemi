import { prisma } from "@/lib/prisma";

export type FollowRelationshipKind =
  | "none"
  | "self"
  | "following"
  | "followed_by"
  | "mutual";

export type FollowRelationshipState = {
  kind: FollowRelationshipKind;
  isSelf: boolean;
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
  isMutualFollow: boolean;
};

export type FollowRelationshipBuckets = {
  followingOnlyIds: string[];
  followerOnlyIds: string[];
  mutualFollowIds: string[];
};

export type FollowEdge = {
  followerId: string;
  followingId: string;
};

function uniqueProfileIds(profileIds: string[]) {
  return [...new Set(profileIds.filter(Boolean))];
}

export function getFollowRelationshipKind({
  isSelf = false,
  targetFollowsViewer,
  viewerFollowsTarget,
}: {
  isSelf?: boolean;
  targetFollowsViewer: boolean;
  viewerFollowsTarget: boolean;
}): FollowRelationshipKind {
  if (isSelf) {
    return "self";
  }

  if (viewerFollowsTarget && targetFollowsViewer) {
    return "mutual";
  }

  if (viewerFollowsTarget) {
    return "following";
  }

  if (targetFollowsViewer) {
    return "followed_by";
  }

  return "none";
}

export function getFollowRelationshipStateFromFlags({
  isSelf = false,
  targetFollowsViewer,
  viewerFollowsTarget,
}: {
  isSelf?: boolean;
  targetFollowsViewer: boolean;
  viewerFollowsTarget: boolean;
}): FollowRelationshipState {
  const kind = getFollowRelationshipKind({
    isSelf,
    targetFollowsViewer,
    viewerFollowsTarget,
  });

  return {
    kind,
    isSelf,
    viewerFollowsTarget,
    targetFollowsViewer,
    isMutualFollow: kind === "mutual",
  };
}

export function getFollowRelationshipBucketsFromEdges(
  profileId: string,
  edges: FollowEdge[],
): FollowRelationshipBuckets {
  const followingIds = new Set<string>();
  const followerIds = new Set<string>();

  for (const edge of edges) {
    if (edge.followerId === profileId && edge.followingId !== profileId) {
      followingIds.add(edge.followingId);
    }

    if (edge.followingId === profileId && edge.followerId !== profileId) {
      followerIds.add(edge.followerId);
    }
  }

  const mutualFollowIds = [...followingIds].filter((id) => followerIds.has(id));
  const mutualFollowIdSet = new Set(mutualFollowIds);

  return {
    followingOnlyIds: [...followingIds].filter(
      (id) => !mutualFollowIdSet.has(id),
    ),
    followerOnlyIds: [...followerIds].filter(
      (id) => !mutualFollowIdSet.has(id),
    ),
    mutualFollowIds,
  };
}

export async function getFollowRelationState({
  targetProfileId,
  viewerProfileId,
}: {
  targetProfileId: string;
  viewerProfileId: string | null | undefined;
}): Promise<FollowRelationshipState> {
  if (!viewerProfileId || !targetProfileId) {
    return getFollowRelationshipStateFromFlags({
      targetFollowsViewer: false,
      viewerFollowsTarget: false,
    });
  }

  if (viewerProfileId === targetProfileId) {
    return getFollowRelationshipStateFromFlags({
      isSelf: true,
      targetFollowsViewer: false,
      viewerFollowsTarget: false,
    });
  }

  const follows = await prisma.userFollow.findMany({
    where: {
      OR: [
        {
          followerId: viewerProfileId,
          followingId: targetProfileId,
        },
        {
          followerId: targetProfileId,
          followingId: viewerProfileId,
        },
      ],
    },
    select: {
      followerId: true,
      followingId: true,
    },
  });

  return getFollowRelationshipStateFromFlags({
    viewerFollowsTarget: follows.some(
      (follow) =>
        follow.followerId === viewerProfileId &&
        follow.followingId === targetProfileId,
    ),
    targetFollowsViewer: follows.some(
      (follow) =>
        follow.followerId === targetProfileId &&
        follow.followingId === viewerProfileId,
    ),
  });
}

export async function getFollowRelationStateMap({
  targetProfileIds,
  viewerProfileId,
}: {
  targetProfileIds: string[];
  viewerProfileId: string | null | undefined;
}) {
  const uniqueTargetProfileIds = uniqueProfileIds(targetProfileIds);
  const relationMap = new Map<string, FollowRelationshipState>();

  for (const targetProfileId of uniqueTargetProfileIds) {
    relationMap.set(
      targetProfileId,
      getFollowRelationshipStateFromFlags({
        isSelf: Boolean(viewerProfileId && viewerProfileId === targetProfileId),
        targetFollowsViewer: false,
        viewerFollowsTarget: false,
      }),
    );
  }

  if (!viewerProfileId || uniqueTargetProfileIds.length === 0) {
    return relationMap;
  }

  const peerProfileIds = uniqueTargetProfileIds.filter(
    (targetProfileId) => targetProfileId !== viewerProfileId,
  );

  if (peerProfileIds.length === 0) {
    return relationMap;
  }

  const follows = await prisma.userFollow.findMany({
    where: {
      OR: [
        {
          followerId: viewerProfileId,
          followingId: {
            in: peerProfileIds,
          },
        },
        {
          followerId: {
            in: peerProfileIds,
          },
          followingId: viewerProfileId,
        },
      ],
    },
    select: {
      followerId: true,
      followingId: true,
    },
  });
  const viewerFollowingIds = new Set(
    follows
      .filter((follow) => follow.followerId === viewerProfileId)
      .map((follow) => follow.followingId),
  );
  const viewerFollowerIds = new Set(
    follows
      .filter((follow) => follow.followingId === viewerProfileId)
      .map((follow) => follow.followerId),
  );

  for (const targetProfileId of peerProfileIds) {
    relationMap.set(
      targetProfileId,
      getFollowRelationshipStateFromFlags({
        viewerFollowsTarget: viewerFollowingIds.has(targetProfileId),
        targetFollowsViewer: viewerFollowerIds.has(targetProfileId),
      }),
    );
  }

  return relationMap;
}

export async function getFollowRelationshipBuckets(
  profileId: string,
): Promise<FollowRelationshipBuckets> {
  const follows = await prisma.userFollow.findMany({
    where: {
      OR: [
        {
          followerId: profileId,
        },
        {
          followingId: profileId,
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      followerId: true,
      followingId: true,
    },
  });

  return getFollowRelationshipBucketsFromEdges(profileId, follows);
}

export async function getFollowingOnlyProfileIds(profileId: string) {
  const buckets = await getFollowRelationshipBuckets(profileId);

  return buckets.followingOnlyIds;
}

export async function getFollowerOnlyProfileIds(profileId: string) {
  const buckets = await getFollowRelationshipBuckets(profileId);

  return buckets.followerOnlyIds;
}

export async function getMutualFollowProfileIds(profileId: string) {
  const buckets = await getFollowRelationshipBuckets(profileId);

  return buckets.mutualFollowIds;
}
