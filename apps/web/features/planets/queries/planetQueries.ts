import { prisma } from "@/lib/prisma";

export async function getPlanetSquare(viewerProfileId: string | null) {
  return prisma.planet.findMany({
    where: viewerProfileId
      ? { OR: [{ visibility: "PUBLIC" }, { members: { some: { profileId: viewerProfileId } } }] }
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
      _count: { select: { members: true } },
      members: viewerProfileId ? { where: { profileId: viewerProfileId }, select: { role: true } } : false,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlanetRoom(planetSlug: string, viewerProfileId: string | null) {
  const planet = await prisma.planet.findFirst({
    where: {
      slug: planetSlug,
      ...(viewerProfileId
        ? { OR: [{ visibility: "PUBLIC" }, { members: { some: { profileId: viewerProfileId } } }] }
        : { visibility: "PUBLIC" }),
    },
    select: {
      id: true,
      slug: true,
      inviteCode: true,
      name: true,
      nameTranslations: true,
      description: true,
      tags: true,
      visibility: true,
      owner: { select: { nickname: true } },
      _count: { select: { members: true } },
      members: {
        take: 5,
        orderBy: { joinedAt: "asc" },
        select: { profileId: true, role: true, profile: { select: { nickname: true, avatarUrl: true } } },
      },
      messages: {
        take: 40,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true, authorId: true, author: { select: { nickname: true, avatarUrl: true } } },
      },
      moments: {
        take: 8,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, imageUrls: true, createdAt: true, author: { select: { nickname: true, avatarUrl: true } }, _count: { select: { comments: true } } },
      },
    },
  });

  if (!planet) return null;

  const viewerMembership = viewerProfileId
    ? await prisma.planetMember.findUnique({
        where: {
          planetId_profileId: { planetId: planet.id, profileId: viewerProfileId },
        },
        select: { role: true },
      })
    : null;

  return {
    ...planet,
    viewerMembership,
    messages: [...planet.messages].reverse(),
  };
}

export async function getPlanetMoment(momentId: string, planetSlug: string, viewerProfileId: string | null) {
  const moment = await prisma.planetMoment.findFirst({
    where: {
      id: momentId,
      planet: {
        slug: planetSlug,
        ...(viewerProfileId
          ? { OR: [{ visibility: "PUBLIC" }, { members: { some: { profileId: viewerProfileId } } }] }
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
      likes: viewerProfileId ? { where: { profileId: viewerProfileId }, select: { id: true } } : false,
      planet: { select: { id: true, slug: true, name: true, nameTranslations: true } },
      comments: { orderBy: { createdAt: "asc" }, select: { id: true, content: true, createdAt: true, author: { select: { nickname: true, avatarUrl: true } }, _count: { select: { likes: true } }, likes: viewerProfileId ? { where: { profileId: viewerProfileId }, select: { id: true } } : false } },
    },
  });

  if (!moment) return null;
  const viewerMembership = viewerProfileId
    ? await prisma.planetMember.findUnique({
        where: {
          planetId_profileId: { planetId: moment.planet.id, profileId: viewerProfileId },
        },
        select: { role: true },
      })
    : null;

  return { ...moment, viewerMembership, isViewerAuthor: Boolean(viewerProfileId && moment.authorId === viewerProfileId) };
}
