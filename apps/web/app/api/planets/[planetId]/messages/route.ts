import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markPlanetChatRead } from "@/features/planets/services/planetChat";

export const dynamic = "force-dynamic";

const messageSelect = {
  id: true,
  content: true,
  imageUrls: true,
  mentionedProfileIds: true,
  mentionLabels: true,
  mentionsEveryone: true,
  replyToMessageId: true,
  replyToSenderName: true,
  replyToBody: true,
  replyToHasImage: true,
  createdAt: true,
  authorId: true,
  author: { select: { nickname: true, avatarUrl: true } },
} satisfies Prisma.PlanetMessageSelect;

type PlanetMessageApiRow = Prisma.PlanetMessageGetPayload<{
  select: typeof messageSelect;
}>;

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

  const serializeMessage = (message: PlanetMessageApiRow) => ({
    id: message.id,
    author: message.author,
    authorId: message.authorId,
    content: message.content,
    imageUrls: message.imageUrls,
    mentionedProfileIds: message.mentionedProfileIds,
    mentionLabels: message.mentionLabels,
    mentionsEveryone: message.mentionsEveryone,
    replyTo:
      message.replyToMessageId && message.replyToSenderName
        ? {
            body: message.replyToBody ?? "",
            hasImage: message.replyToHasImage,
            messageId: message.replyToMessageId,
            senderName: message.replyToSenderName,
          }
        : null,
    createdAt: message.createdAt.toISOString(),
  });
  const beforeCreatedAt = parseDate(
    request.nextUrl.searchParams.get("beforeCreatedAt"),
  );
  const beforeId = request.nextUrl.searchParams.get("beforeId");
  const requestedLimit = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "40",
    10,
  );
  const historyLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 40;

  if (beforeCreatedAt && beforeId) {
    const olderMessages = await prisma.planetMessage.findMany({
      where: {
        planetId,
        OR: [
          { createdAt: { lt: beforeCreatedAt } },
          { createdAt: beforeCreatedAt, id: { lt: beforeId } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: historyLimit + 1,
      select: messageSelect,
    });

    return NextResponse.json(
      {
        hasMore: olderMessages.length > historyLimit,
        messages: olderMessages
          .slice(0, historyLimit)
          .reverse()
          .map(serializeMessage),
        serverTime: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
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
    select: messageSelect,
  });

  if (messages.length > 0) {
    await markPlanetChatRead({
      planetId,
      profileId: profile.id,
      readAt: serverTime,
    });
  }

  return NextResponse.json(
    {
      messages: messages.map(serializeMessage),
      serverTime: serverTime.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
