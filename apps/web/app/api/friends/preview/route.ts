import { NextResponse } from "next/server";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFriendshipPair, getFriendshipPairKey } from "@/features/friends/utils/friendship";

type FriendPreviewStatus = "AVAILABLE" | "SELF" | "FRIENDS" | "PENDING";

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
  const locale = url.searchParams.get("locale") ?? "zh-CN";

  if (!/^\d{6}$/.test(query)) {
    return NextResponse.json({
      ok: true,
      user: null,
      status: null,
    });
  }

  const viewerProfile = await ensureCurrentUserProfile(locale);
  const targetUser = await prisma.userProfile.findFirst({
    where: {
      friendCode: query,
      status: "ACTIVE",
    },
    select: {
      id: true,
      nickname: true,
      friendCode: true,
      avatarUrl: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({
      ok: true,
      user: null,
      status: null,
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
