import { prisma } from "@/lib/prisma";

export type OfficialMessageViewModel = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
};

export type OfficialMessageRosterViewModel = {
  id: "friemi-official";
  title: string;
  preview: string;
  publishedAt: string;
  unreadCount: number;
};

function getOfficialTitle(locale: string) {
  return locale === "fr"
    ? "Friemi officiel"
    : locale === "en"
      ? "Friemi Official"
      : "Friemi 官方";
}

function serializeOfficialMessage(message: {
  id: string;
  title: string;
  content: string;
  publishedAt: Date;
}): OfficialMessageViewModel {
  return {
    id: message.id,
    title: message.title,
    content: message.content,
    publishedAt: message.publishedAt.toISOString(),
  };
}

export async function getOfficialMessageRoster(
  profileId: string,
  locale: string,
): Promise<OfficialMessageRosterViewModel | null> {
  const [latestMessage, unreadCount] = await Promise.all([
    prisma.officialMessage.findFirst({
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { content: true, publishedAt: true, title: true },
    }),
    getUnreadOfficialMessageCount(profileId),
  ]);

  if (!latestMessage) return null;

  return {
    id: "friemi-official",
    title: getOfficialTitle(locale),
    preview: latestMessage.title || latestMessage.content,
    publishedAt: latestMessage.publishedAt.toISOString(),
    unreadCount,
  };
}

export async function getOfficialMessages() {
  const messages = await prisma.officialMessage.findMany({
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      publishedAt: true,
    },
  });

  return messages.map(serializeOfficialMessage);
}

export async function getUnreadOfficialMessageCount(profileId: string) {
  const [result] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "OfficialMessage"
    WHERE "publishedAt" > COALESCE(
      (
        SELECT "lastReadAt"
        FROM "OfficialMessageReadState"
        WHERE "profileId" = ${profileId}
      ),
      '-infinity'::timestamp
    )
  `;

  return Number(result?.count ?? 0n);
}

export async function markOfficialMessagesRead(
  profileId: string,
  lastVisiblePublishedAt: string | null,
) {
  if (!lastVisiblePublishedAt) return;

  const lastReadAt = new Date(lastVisiblePublishedAt);
  if (!Number.isFinite(lastReadAt.getTime())) return;

  await prisma.officialMessageReadState.upsert({
    where: { profileId },
    create: { profileId, lastReadAt },
    update: { lastReadAt },
  });
}

export async function createOfficialMessage({
  authorProfileId,
  content,
  title,
}: {
  authorProfileId: string;
  content: string;
  title: string;
}) {
  return prisma.officialMessage.create({
    data: {
      authorProfileId,
      content,
      title,
    },
    select: {
      id: true,
      title: true,
      content: true,
      publishedAt: true,
    },
  });
}
