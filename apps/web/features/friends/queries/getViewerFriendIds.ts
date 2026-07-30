import { cache } from "react";
import {
  getFollowRelationshipBuckets,
  getMutualFollowProfileIds,
} from "@/features/follow/queries/followRelations";

export const getViewerFriendIds = cache(async (viewerProfileId: string) => {
  return getMutualFollowProfileIds(viewerProfileId);
});

export const getViewerFollowedProfileIds = cache(
  async (viewerProfileId: string) => {
    const buckets = await getFollowRelationshipBuckets(viewerProfileId);

    return [...buckets.followingOnlyIds, ...buckets.mutualFollowIds];
  },
);
