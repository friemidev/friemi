import { NextResponse } from "next/server";
import { getFollowRelationState } from "@/features/follow/queries/followRelations";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getDisplayProfile(profile: {
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
}) {
  const hasPublicNickname = profile.nickname.trim().length > 0;

  return {
    avatarUrl: hasPublicNickname ? profile.avatarUrl : null,
    nickname: hasPublicNickname
      ? profile.nickname
      : profile.friendCode
        ? `NF ${profile.friendCode}`
        : "NF",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await context.params;
  const viewerProfile = await getOptionalCurrentUserProfile();

  const profile = await prisma.userProfile.findFirst({
    where: {
      id: profileId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      nickname: true,
      friendCode: true,
      avatarUrl: true,
      bio: true,
      isCoCreator: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      {
        status: 404,
      },
    );
  }

  const displayProfile = getDisplayProfile(profile);

  if (!viewerProfile || viewerProfile.id === profile.id) {
    return NextResponse.json({
      bio: profile.bio,
      followerCount: profile._count.followers,
      followingCount: profile._count.following,
      id: profile.id,
      isSelf: Boolean(viewerProfile?.id === profile.id),
      isCoCreator: profile.isCoCreator,
      nickname: displayProfile.nickname,
      avatarUrl: displayProfile.avatarUrl,
      relationship: {
        friendshipId: null,
        isFriend: false,
        isFollowing: false,
        isMutualFollow: false,
        pendingFriendRequest: null,
        targetFollowsViewer: false,
      },
    });
  }

  const relation = await getFollowRelationState({
    targetProfileId: profile.id,
    viewerProfileId: viewerProfile.id,
  });

  return NextResponse.json({
    bio: profile.bio,
    followerCount: profile._count.followers,
    followingCount: profile._count.following,
    id: profile.id,
    isSelf: false,
    isCoCreator: profile.isCoCreator,
    nickname: displayProfile.nickname,
    avatarUrl: displayProfile.avatarUrl,
    relationship: {
      friendshipId: null,
      isFriend: relation.isMutualFollow,
      isFollowing: relation.viewerFollowsTarget,
      isMutualFollow: relation.isMutualFollow,
      pendingFriendRequest: null,
      targetFollowsViewer: relation.targetFollowsViewer,
    },
  });
}
