import { getFollowRelationState } from "./followRelations";

export async function getViewerFollowState(
  followerId: string | null | undefined,
  followingId: string,
): Promise<boolean> {
  const relation = await getFollowRelationState({
    viewerProfileId: followerId,
    targetProfileId: followingId,
  });

  return relation.viewerFollowsTarget;
}
