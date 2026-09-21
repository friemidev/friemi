import { NextRequest, NextResponse } from "next/server";
import { scheduleChatRealtimeChange } from "@/features/chat/chatRealtimeServer";
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
  context: { params: Promise<{ conversationId: string }> },
) {
  const profile = await getOptionalCurrentUserProfileSnapshot();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: profile.id }, { userBId: profile.id }],
    },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messageSelect = {
    id: true,
    senderId: true,
    body: true,
    imageUrls: true,
    replyToMessageId: true,
    replyToSenderName: true,
    replyToBody: true,
    replyToHasImage: true,
    recalledAt: true,
    readAt: true,
    createdAt: true,
  } as const;
  const beforeCreatedAt = parseDate(
    request.nextUrl.searchParams.get("beforeCreatedAt"),
  );
  const beforeId = request.nextUrl.searchParams.get("beforeId");
  const requestedLimit = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "50",
    10,
  );
  const historyLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 50;

  if (beforeCreatedAt && beforeId) {
    const olderMessages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        OR: [
          { createdAt: { lt: beforeCreatedAt } },
          { createdAt: beforeCreatedAt, id: { lt: beforeId } },
        ],
        deletions: { none: { profileId: profile.id } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: historyLimit + 1,
      select: messageSelect,
    });
    const hasMore = olderMessages.length > historyLimit;

    return NextResponse.json(
      {
        hasMore,
        messages: olderMessages
          .slice(0, historyLimit)
          .reverse()
          .map((message) => ({
            id: message.id,
            senderId: message.senderId,
            body: message.recalledAt ? "" : message.body,
            imageUrls: message.recalledAt ? [] : message.imageUrls,
            replyTo:
              !message.recalledAt &&
              message.replyToMessageId &&
              message.replyToSenderName
                ? {
                    body: message.replyToBody ?? "",
                    hasImage: message.replyToHasImage,
                    messageId: message.replyToMessageId,
                    senderName: message.replyToSenderName,
                  }
                : null,
            recalledAt: message.recalledAt?.toISOString() ?? null,
            createdAt: message.createdAt.toISOString(),
            isMine: message.senderId === profile.id,
            readAt: message.readAt?.toISOString() ?? null,
          })),
        serverTime: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const afterCreatedAt = parseDate(
    request.nextUrl.searchParams.get("afterCreatedAt"),
  );
  const afterId = request.nextUrl.searchParams.get("afterId");
  const since =
    parseDate(request.nextUrl.searchParams.get("since")) ?? new Date();
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
  const [createdMessages, changedMessages, deletions] = await Promise.all([
    prisma.directMessage.findMany({
      where: {
        conversationId,
        ...cursorWhere,
        deletions: { none: { profileId: profile.id } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 50,
      select: messageSelect,
    }),
    prisma.directMessage.findMany({
      where: {
        conversationId,
        updatedAt: { gt: since },
        deletions: { none: { profileId: profile.id } },
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: 50,
      select: messageSelect,
    }),
    prisma.directMessageDeletion.findMany({
      where: {
        profileId: profile.id,
        deletedAt: { gt: since },
        message: { conversationId },
      },
      orderBy: [{ deletedAt: "asc" }, { messageId: "asc" }],
      take: 50,
      select: { messageId: true },
    }),
  ]);
  const messages = [
    ...new Map(
      [...createdMessages, ...changedMessages].map((message) => [
        message.id,
        message,
      ]),
    ).values(),
  ].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const unreadIncomingIds = messages
    .filter((message) => message.senderId !== profile.id && !message.readAt)
    .map((message) => message.id);

  if (unreadIncomingIds.length > 0) {
    await prisma.directMessage.updateMany({
      where: { id: { in: unreadIncomingIds }, readAt: null },
      data: { readAt: serverTime },
    });
    scheduleChatRealtimeChange({
      profileIds: [profile.id],
      scope: "direct",
      subjectKey: conversation.id,
    });
  }

  return NextResponse.json(
    {
      deletedMessageIds: deletions.map((deletion) => deletion.messageId),
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.recalledAt ? "" : message.body,
        imageUrls: message.recalledAt ? [] : message.imageUrls,
        replyTo:
          !message.recalledAt &&
          message.replyToMessageId &&
          message.replyToSenderName
            ? {
                body: message.replyToBody ?? "",
                hasImage: message.replyToHasImage,
                messageId: message.replyToMessageId,
                senderName: message.replyToSenderName,
              }
            : null,
        recalledAt: message.recalledAt?.toISOString() ?? null,
        createdAt: message.createdAt.toISOString(),
        isMine: message.senderId === profile.id,
        readAt:
          message.readAt?.toISOString() ??
          (unreadIncomingIds.includes(message.id)
            ? serverTime.toISOString()
            : null),
      })),
      serverTime: serverTime.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
