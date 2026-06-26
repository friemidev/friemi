import { NextResponse } from "next/server";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFriendshipPair,
  getFriendshipPairKey,
} from "@/features/friends/utils/friendship";

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
      nickname: displayProfile.nickname,
      avatarUrl: displayProfile.avatarUrl,
      relationship: {
        friendshipId: null,
        isFriend: false,
        isFollowing: false,
        pendingFriendRequest: null,
      },
    });
  }

  const [friendship, follow, pendingRequest] = await Promise.all([
    prisma.friendship.findUnique({
      where: {
        userAId_userBId: getFriendshipPair(viewerProfile.id, profile.id),
      },
      select: {
        id: true,
      },
    }),
    prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerProfile.id,
          followingId: profile.id,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.friendRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          {
            pendingPairKey: getFriendshipPairKey(viewerProfile.id, profile.id),
          },
          {
            requesterId: viewerProfile.id,
            receiverId: profile.id,
          },
          {
            requesterId: profile.id,
            receiverId: viewerProfile.id,
          },
        ],
      },
      select: {
        requesterId: true,
      },
    }),
  ]);

  return NextResponse.json({
    bio: profile.bio,
    followerCount: profile._count.followers,
    followingCount: profile._count.following,
    id: profile.id,
    isSelf: false,
    nickname: displayProfile.nickname,
    avatarUrl: displayProfile.avatarUrl,
    relationship: {
      friendshipId: friendship?.id ?? null,
      isFriend: Boolean(friendship),
      isFollowing: Boolean(follow),
      pendingFriendRequest: pendingRequest
        ? pendingRequest.requesterId === viewerProfile.id
          ? "sent"
          : "received"
        : null,
    },
  });
}
