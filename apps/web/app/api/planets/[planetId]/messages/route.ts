import { NextRequest, NextResponse } from "next/server";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ planetId: string }> },
) {
  const profile = await getOptionalCurrentUserProfileSnapshot();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planetId } = await context.params;
  const membership = await prisma.planetMember.findUnique({
    where: {
      planetId_profileId: { planetId, profileId: profile.id },
    },
    select: { status: true },
  });

  if (membership?.status !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const afterCreatedAt = parseDate(
    request.nextUrl.searchParams.get("afterCreatedAt"),
  );
  const afterId = request.nextUrl.searchParams.get("afterId");
  const serverTime = new Date();
  const cursorWhere =
    afterCreatedAt && afterId
      ? {
          OR: [
            { createdAt: { gt: afterCreatedAt } },
            { createdAt: afterCreatedAt, id: { gt: afterId } },
          ],
        }
      : {};
  const messages = await prisma.planetMessage.findMany({
    where: { planetId, ...cursorWhere },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      content: true,
      imageUrls: true,
      mentionedProfileIds: true,
      mentionLabels: true,
      mentionsEveryone: true,
      createdAt: true,
      authorId: true,
      author: { select: { nickname: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(
    {
      messages: messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
      serverTime: serverTime.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
