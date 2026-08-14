import { prisma } from "@/lib/prisma";
import { getPlanetChatUnreadState } from "@/features/planets/services/planetChat";

const approvedMemberFilter = { status: "APPROVED" as const };

export async function getPlanetSquare(viewerProfileId: string | null) {
  return prisma.planet.findMany({
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
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlanetRoom(
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
      inviteCode: true,
      coverImageUrl: true,
      name: true,
      nameTranslations: true,
      description: true,
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
          createdAt: true,
          author: { select: { nickname: true, avatarUrl: true } },
          _count: { select: { comments: true } },
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

  const [pendingMembers, chatState] = await Promise.all([
    viewerMembership?.role === "OWNER" || viewerMembership?.role === "ADMIN"
      ? prisma.planetMember.findMany({
          where: { planetId: planet.id, status: "PENDING" },
          orderBy: { joinedAt: "asc" },
          select: {
            profileId: true,
            joinedAt: true,
            profile: { select: { nickname: true, avatarUrl: true } },
          },
        })
      : Promise.resolve([]),
    viewerProfileId && viewerMembership?.status === "APPROVED"
      ? getPlanetChatUnreadState({
          planetId: planet.id,
          profileId: viewerProfileId,
        })
      : Promise.resolve({
          isMuted: false,
          isPinned: false,
          unreadCount: 0,
        }),
  ]);

  return {
    ...planet,
    viewerMembership,
    canViewChat: viewerMembership?.status === "APPROVED",
    chatUnreadCount: chatState.unreadCount,
    isChatMuted: chatState.isMuted,
    isChatPinned: chatState.isPinned,
    pendingMembers,
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

  return {
    ...planet,
    viewerMembership,
    canViewChat,
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
