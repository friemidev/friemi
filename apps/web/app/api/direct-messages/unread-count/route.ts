import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUnreadDirectMessageConversationCount } from "@/features/direct-messages/queries/getDirectMessages";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasClerkKeys()) {
      const localProfile = await getOptionalCurrentUserProfileSnapshot();

      if (!localProfile) {
        return NextResponse.json({ unreadCount: 0 });
      }

      const unreadCount = await getUnreadDirectMessageConversationCount(
        localProfile.id,
      );

      return NextResponse.json({
        unreadCount,
        updatedAt: new Date().toISOString(),
      });
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ unreadCount: 0 }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!profile || profile.status !== "ACTIVE") {
      return NextResponse.json({ unreadCount: 0 }, { status: 401 });
    }

    const unreadCount = await getUnreadDirectMessageConversationCount(
      profile.id,
    );

    return NextResponse.json({
      unreadCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load unread direct message count", error);

    return NextResponse.json({
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
