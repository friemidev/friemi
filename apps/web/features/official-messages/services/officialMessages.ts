import { prisma } from "@/lib/prisma";
import { invalidateUnreadBadgeCache } from "@/features/notifications/unreadBadgeRedisCache";

export const officialFeedbackAccountEmail = "friemi.dev@gmail.com";

export type OfficialMessageViewModel = {
  content: string;
  id: string;
  isWelcome: boolean;
  publishedAt: string;
  title: string;
};

export type OfficialMessageRosterViewModel = {
  id: "friemi-official";
  preview: string;
  publishedAt: string;
  title: string;
  unreadCount: number;
};

export type OfficialFeedbackRosterViewModel = {
  id: "friemi-feedback-inbox";
  preview: string;
  publishedAt: string;
  title: string;
  unreadCount: number;
};

export type OfficialFeedbackViewModel = {
  content: string;
  createdAt: string;
  id: string;
  readAt: string | null;
  sender: {
    avatarUrl: string | null;
    bio: string | null;
    friendCode: string | null;
    id: string;
    nickname: string;
  };
};

function getOfficialCopy(locale: string) {
  if (locale === "fr") {
    return {
      feedbackEmpty: "Aucun retour utilisateur pour le moment.",
      feedbackTitle: "Retours utilisateurs",
      title: "Friemi officiel",
      welcomeContent:
        "Bienvenue sur Friemi. Vous trouverez ici les annonces officielles et les informations importantes de la plateforme.",
      welcomeTitle: "Bienvenue sur Friemi",
    };
  }

  if (locale === "en") {
    return {
      feedbackEmpty: "No user feedback yet.",
      feedbackTitle: "User feedback",
      title: "Friemi Official",
      welcomeContent:
        "Welcome to Friemi. Official announcements and important platform updates will appear here.",
      welcomeTitle: "Welcome to Friemi",
    };
  }

  return {
    feedbackEmpty: "暂时还没有用户反馈。",
    feedbackTitle: "用户问题反馈",
    title: "Friemi 官方",
    welcomeContent:
      "欢迎来到 Friemi。后续官方通知、平台更新和重要提醒都会在这里发送给你。",
    welcomeTitle: "欢迎来到 Friemi",
  };
}

function serializeOfficialMessage(message: {
  content: string;
  id: string;
  publishedAt: Date;
  title: string;
}): OfficialMessageViewModel {
  return {
    content: message.content,
    id: message.id,
    isWelcome: false,
    publishedAt: message.publishedAt.toISOString(),
    title: message.title,
  };
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isOfficialFeedbackAccount({
  contactEmail,
  email,
}: {
  contactEmail?: string | null;
  email?: string | null;
}) {
  return [email, contactEmail]
    .map(normalizeEmail)
    .includes(officialFeedbackAccountEmail);
}

async function getFeedbackOperatorProfile(profileId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    select: {
      contactEmail: true,
      createdAt: true,
      email: true,
      id: true,
    },
  });

  if (!profile || !isOfficialFeedbackAccount(profile)) {
    return null;
  }

  return profile;
}

async function getUnreadBroadcastMessageCount(profileId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    select: {
      createdAt: true,
      officialReadState: {
        select: { lastReadAt: true },
      },
    },
  });

  if (!profile) return 0;

  const lastReadAt = profile.officialReadState?.lastReadAt ?? null;
  const [broadcastCount, welcomeCount] = await Promise.all([
    prisma.officialMessage.count({
      where: {
        publishedAt: {
          gte: profile.createdAt,
          ...(lastReadAt ? { gt: lastReadAt } : {}),
        },
      },
    }),
    Promise.resolve(
      !lastReadAt || profile.createdAt.getTime() > lastReadAt.getTime() ? 1 : 0,
    ),
  ]);

  return broadcastCount + welcomeCount;
}

export async function getOfficialMessageRoster(
  profileId: string,
  locale: string,
): Promise<OfficialMessageRosterViewModel | null> {
  const [latestMessage, profile, unreadCount] = await Promise.all([
    prisma.officialMessage.findFirst({
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { content: true, publishedAt: true, title: true },
    }),
    prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { createdAt: true },
    }),
    getUnreadBroadcastMessageCount(profileId),
  ]);

  if (!profile) return null;

  const copy = getOfficialCopy(locale);
  const showLatestBroadcast =
    latestMessage && latestMessage.publishedAt >= profile.createdAt;

  return {
    id: "friemi-official",
    title: copy.title,
    preview: showLatestBroadcast
      ? latestMessage.title || latestMessage.content
      : copy.welcomeTitle,
    publishedAt: showLatestBroadcast
      ? latestMessage.publishedAt.toISOString()
      : profile.createdAt.toISOString(),
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

export async function getOfficialMessagesForProfile(
  profileId: string,
  locale: string,
) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    select: { createdAt: true },
  });

  if (!profile) return [];

  const messages = await prisma.officialMessage.findMany({
    where: { publishedAt: { gte: profile.createdAt } },
    orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      publishedAt: true,
    },
  });

  const copy = getOfficialCopy(locale);
  const welcomeMessage: OfficialMessageViewModel = {
    content: copy.welcomeContent,
    id: `welcome:${profileId}`,
    isWelcome: true,
    publishedAt: profile.createdAt.toISOString(),
    title: copy.welcomeTitle,
  };

  return [welcomeMessage, ...messages.map(serializeOfficialMessage)].sort(
    (left, right) =>
      new Date(left.publishedAt).getTime() -
      new Date(right.publishedAt).getTime(),
  );
}

export async function getUnreadOfficialFeedbackCount(profileId: string) {
  if (!(await getFeedbackOperatorProfile(profileId))) return 0;

  return prisma.officialFeedback.count({ where: { readAt: null } });
}

export async function getUnreadOfficialMessageCount(profileId: string) {
  const [broadcastCount, feedbackCount] = await Promise.all([
    getUnreadBroadcastMessageCount(profileId),
    getUnreadOfficialFeedbackCount(profileId),
  ]);

  return broadcastCount + feedbackCount;
}

export async function getOfficialFeedbackRoster(
  profileId: string,
  locale: string,
): Promise<OfficialFeedbackRosterViewModel | null> {
  const operator = await getFeedbackOperatorProfile(profileId);
  if (!operator) return null;

  const [latestFeedback, unreadCount] = await Promise.all([
    prisma.officialFeedback.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { content: true, createdAt: true },
    }),
    prisma.officialFeedback.count({ where: { readAt: null } }),
  ]);
  const copy = getOfficialCopy(locale);

  return {
    id: "friemi-feedback-inbox",
    preview: latestFeedback?.content ?? copy.feedbackEmpty,
    publishedAt:
      latestFeedback?.createdAt.toISOString() ?? operator.createdAt.toISOString(),
    title: copy.feedbackTitle,
    unreadCount,
  };
}

export async function getOfficialFeedbackInbox(profileId: string) {
  if (!(await getFeedbackOperatorProfile(profileId))) return null;

  const feedback = await prisma.officialFeedback.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 500,
    select: {
      content: true,
      createdAt: true,
      id: true,
      readAt: true,
      sender: {
        select: {
          avatarUrl: true,
          bio: true,
          friendCode: true,
          id: true,
          nickname: true,
        },
      },
    },
  });

  return feedback.map(
    (item): OfficialFeedbackViewModel => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
    }),
  );
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
  await invalidateUnreadBadgeCache([profileId]);
}

export async function markOfficialFeedbackRead(profileId: string) {
  if (!(await getFeedbackOperatorProfile(profileId))) return false;

  await prisma.officialFeedback.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  await invalidateUnreadBadgeCache([profileId]);
  return true;
}

export async function createOfficialFeedback({
  content,
  senderProfileId,
}: {
  content: string;
  senderProfileId: string;
}) {
  const [feedback, operators] = await Promise.all([
    prisma.officialFeedback.create({
      data: { content, senderProfileId },
      select: { id: true },
    }),
    prisma.userProfile.findMany({
      where: {
        OR: [
          {
            email: {
              equals: officialFeedbackAccountEmail,
              mode: "insensitive",
            },
          },
          {
            contactEmail: {
              equals: officialFeedbackAccountEmail,
              mode: "insensitive",
            },
          },
        ],
      },
      select: { id: true },
    }),
  ]);

  await invalidateUnreadBadgeCache(operators.map((operator) => operator.id));

  return feedback;
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
