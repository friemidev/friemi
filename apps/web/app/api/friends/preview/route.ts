import { NextResponse } from "next/server";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findFriendRequestTargets } from "@/features/friends/queries/findFriendRequestTarget";
import { getFriendshipPair, getFriendshipPairKey } from "@/features/friends/utils/friendship";

type FriendPreviewStatus =
  | "AVAILABLE"
  | "SELF"
  | "FRIENDS"
  | "PENDING"
  | "AMBIGUOUS"
  | "NOT_FOUND";

function mapPreviewUser(user: {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
}) {
  const hasPublicNickname = user.nickname.trim().length > 0;

  return {
    id: user.id,
    nickname: hasPublicNickname
      ? user.nickname
      : user.friendCode
        ? `NF ${user.friendCode}`
        : "NF",
    friendCode: user.friendCode,
    avatarUrl: hasPublicNickname ? user.avatarUrl : null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({
      ok: true,
      user: null,
      status: null,
    });
  }

  const viewerProfile = await getOptionalCurrentUserProfile();

  if (!viewerProfile) {
    return NextResponse.json(
      {
        ok: false,
        user: null,
        status: null,
      },
      { status: 401 },
    );
  }

  const targetUsers = await findFriendRequestTargets(query);
  const targetUser = targetUsers[0];

  if (!targetUser) {
    return NextResponse.json({
      ok: true,
      user: null,
      status: "NOT_FOUND" satisfies FriendPreviewStatus,
    });
  }

  if (targetUsers.length > 1) {
    return NextResponse.json({
      ok: true,
      user: null,
      status: "AMBIGUOUS" satisfies FriendPreviewStatus,
    });
  }

  let status: FriendPreviewStatus = "AVAILABLE";

  if (targetUser.id === viewerProfile.id) {
    status = "SELF";
  } else {
    const [existingFriendship, pendingRequest] = await Promise.all([
      prisma.friendship.findUnique({
        where: {
          userAId_userBId: getFriendshipPair(viewerProfile.id, targetUser.id),
        },
        select: {
          id: true,
        },
      }),
      prisma.friendRequest.findFirst({
        where: {
          pendingPairKey: getFriendshipPairKey(viewerProfile.id, targetUser.id),
          status: "PENDING",
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (existingFriendship) {
      status = "FRIENDS";
    } else if (pendingRequest) {
      status = "PENDING";
    }
  }

  return NextResponse.json({
    ok: true,
    user: mapPreviewUser(targetUser),
    status,
  });
}
