import { prisma } from "@/lib/prisma";
import { getPlanetChatUnreadState } from "@/features/planets/services/planetChat";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";

const approvedMemberFilter = { status: "APPROVED" as const };

export async function getPlanetSquarePage(
  viewerProfileId: string | null,
  options: { cursor?: string | null; limit?: number } = {},
) {
  const limit = Math.min(Math.max(Math.floor(options.limit ?? 12), 1), 24);
  const planets = await prisma.planet.findMany({
    where: viewerProfileId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            { members: { some: { profileId: viewerProfileId } } },
          ],
        }
      : { visibility: "PUBLIC" },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      name: true,
      nameTranslations: true,
      description: true,
      tags: true,
      visibility: true,
      _count: { select: { members: { where: approvedMemberFilter } } },
      members: viewerProfileId
        ? {
            where: { profileId: viewerProfileId },
            select: { role: true, status: true },
          }
        : false,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(options.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1,
        }
      : {}),
    take: limit + 1,
  });
  const hasMore = planets.length > limit;
  const items = planets.slice(0, limit);

  return {
    hasMore,
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function getPlanetSquare(viewerProfileId: string | null) {
  return (await getPlanetSquarePage(viewerProfileId, { limit: 24 })).items;
}

export async function getPlanetRoom(
  planetSlug: string,
  viewerProfileId: string | null,
) {
  const viewerFriendIds = viewerProfileId
    ? await getViewerFriendIds(viewerProfileId)
    : [];
  const visibleLinkedMomentWhere = {
    deletedAt: null,
    OR: viewerProfileId
      ? [
          { visibility: "PUBLIC" as const },
          { authorId: viewerProfileId },
          {
            visibility: "FRIENDS" as const,
            authorId: { in: viewerFriendIds },
          },
        ]
      : [{ visibility: "PUBLIC" as const }],
  };
  const planet = await prisma.planet.findFirst({
    where: {
      slug: planetSlug,
      ...(viewerProfileId
        ? {
            OR: [
              { visibility: "PUBLIC" },
              { members: { some: { profileId: viewerProfileId } } },
            ],
          }
        : { visibility: "PUBLIC" }),
    },
    select: {
      id: true,
      slug: true,
      inviteCode: true,
      coverImageUrl: true,
      name: true,
      nameTranslations: true,
      description: true,
      announcement: true,
      tags: true,
      visibility: true,
      owner: { select: { nickname: true } },
      _count: { select: { members: { where: approvedMemberFilter } } },
      members: {
        where: approvedMemberFilter,
        take: 6,
        orderBy: { joinedAt: "asc" },
        select: {
          profileId: true,
          role: true,
          profile: { select: { nickname: true, avatarUrl: true } },
        },
      },
      moments: {
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          imageUrls: true,
          videoUrls: true,
          createdAt: true,
          author: { select: { nickname: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
      },
      activityLinks: {
        take: 12,
        orderBy: { addedAt: "desc" },
        select: {
          addedAt: true,
          activity: {
            select: {
              id: true,
              title: true,
              category: true,
              city: true,
              coverImageUrl: true,
              startAt: true,
              status: true,
              moments: {
                where: visibleLinkedMomentWhere,
                take: 3,
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  author: {
                    select: { nickname: true, avatarUrl: true },
                  },
                  images: {
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!planet) return null;

  const viewerMembership = viewerProfileId
    ? await prisma.planetMember.findFirst({
        where: { planetId: planet.id, profileId: viewerProfileId },
        select: { role: true, status: true },
      })
    : null;

  const chatState = await (viewerProfileId &&
  viewerMembership?.status === "APPROVED"
    ? getPlanetChatUnreadState({
        planetId: planet.id,
        profileId: viewerProfileId,
      })
    : Promise.resolve({
        isMuted: false,
        isPinned: false,
        unreadCount: 0,
      }));

  return {
    ...planet,
    viewerMembership,
    canViewChat: viewerMembership?.status === "APPROVED",
    chatUnreadCount: chatState.unreadCount,
    isChatMuted: chatState.isMuted,
    isChatPinned: chatState.isPinned,
  };
}

export async function getPlanetChatPageData(
  planetSlug: string,
  viewerProfileId: string | null,
) {
  const planet = await prisma.planet.findFirst({
    where: {
      slug: planetSlug,
      ...(viewerProfileId
        ? {
            OR: [
              { visibility: "PUBLIC" },
              { members: { some: { profileId: viewerProfileId } } },
            ],
          }
        : { visibility: "PUBLIC" }),
    },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      name: true,
      nameTranslations: true,
      announcement: true,
      inviteCode: true,
      activityLinks: {
        orderBy: { addedAt: "desc" },
        select: {
          activityId: true,
          activity: {
            select: {
              id: true,
              title: true,
              startAt: true,
            },
          },
        },
      },
    },
  });

  if (!planet) return null;

  const viewerMembership = viewerProfileId
    ? await prisma.planetMember.findFirst({
        where: { planetId: planet.id, profileId: viewerProfileId },
        select: { role: true, status: true },
      })
    : null;
  const canViewChat = viewerMembership?.status === "APPROVED";
  const canManage =
    canViewChat &&
    (viewerMembership?.role === "OWNER" || viewerMembership?.role === "ADMIN");
  const [messages, readState] = canViewChat
    ? await Promise.all([
        prisma.planetMessage.findMany({
          where: { planetId: planet.id },
          take: 40,
          orderBy: { createdAt: "desc" },
          select: {
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
          },
        }),
        prisma.planetChatReadState.findUnique({
          where: {
            planetId_profileId: {
              planetId: planet.id,
              profileId: viewerProfileId!,
            },
          },
          select: {
            mutedAt: true,
            pinnedAt: true,
          },
        }),
      ])
    : [[], null];

  const [pendingMembers, approvedMembers, availableActivities] =
    canManage && viewerProfileId
      ? await Promise.all([
          prisma.planetMember.findMany({
            where: { planetId: planet.id, status: "PENDING" },
            orderBy: { joinedAt: "asc" },
            select: {
              profileId: true,
              joinedAt: true,
              profile: { select: { nickname: true, avatarUrl: true } },
            },
          }),
          prisma.planetMember.findMany({
            where: { planetId: planet.id, status: "APPROVED" },
            orderBy: { joinedAt: "asc" },
            select: {
              profileId: true,
              role: true,
              profile: { select: { nickname: true, avatarUrl: true } },
            },
          }),
          prisma.activity.findMany({
            where: {
              visibility: "PUBLIC",
              status: { notIn: ["DRAFT", "CANCELLED"] },
              OR: [
                { organizerId: viewerProfileId },
                { coManagers: { some: { managerProfileId: viewerProfileId } } },
              ],
            },
            orderBy: [{ startAt: "desc" }, { id: "desc" }],
            take: 30,
            select: { id: true, title: true, startAt: true },
          }),
        ])
      : [[], [], []];

  return {
    ...planet,
    viewerMembership,
    canViewChat,
    canManage,
    pendingMembers,
    approvedMembers,
    availableActivities,
    isMuted: Boolean(readState?.mutedAt),
    isPinned: Boolean(readState?.pinnedAt),
    messages: [...messages].reverse(),
  };
}

export async function getPlanetMomentRedirectTarget(
  momentId: string,
  planetSlug: string,
  viewerProfileId: string | null,
) {
  return prisma.planetMoment.findFirst({
    where: {
      id: momentId,
      planet: {
        slug: planetSlug,
        ...(viewerProfileId
          ? {
              OR: [
                { visibility: "PUBLIC" },
                { members: { some: { profileId: viewerProfileId } } },
              ],
            }
          : { visibility: "PUBLIC" }),
      },
    },
    select: {
      id: true,
    },
  });
}

export async function getPlanetMoment(
  momentId: string,
  planetSlug: string,
  viewerProfileId: string | null,
) {
  const moment = await prisma.planetMoment.findFirst({
    where: {
      id: momentId,
      planet: {
        slug: planetSlug,
        ...(viewerProfileId
          ? {
              OR: [
                { visibility: "PUBLIC" },
                { members: { some: { profileId: viewerProfileId } } },
              ],
            }
          : { visibility: "PUBLIC" }),
      },
    },
    select: {
      id: true,
      authorId: true,
      content: true,
      imageUrls: true,
      videoUrls: true,
      createdAt: true,
      author: { select: { nickname: true, avatarUrl: true } },
      _count: { select: { likes: true } },
      likes: viewerProfileId
        ? { where: { profileId: viewerProfileId }, select: { id: true } }
        : false,
      planet: {
        select: { id: true, slug: true, name: true, nameTranslations: true },
      },
      comments: {
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { nickname: true, avatarUrl: true } },
          _count: { select: { likes: true } },
          likes: viewerProfileId
            ? { where: { profileId: viewerProfileId }, select: { id: true } }
            : false,
        },
      },
    },
  });

  if (!moment) return null;
  const viewerMembership = viewerProfileId
    ? await prisma.planetMember.findFirst({
        where: { planetId: moment.planet.id, profileId: viewerProfileId },
        select: { role: true, status: true },
      })
    : null;

  return {
    ...moment,
    comments: [...moment.comments].reverse(),
    viewerMembership,
    isViewerAuthor: Boolean(
      viewerProfileId && moment.authorId === viewerProfileId,
    ),
  };
}
