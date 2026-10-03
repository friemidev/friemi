import { prisma } from "@/lib/prisma";
import { getNowPriority, getNowVisitJitter, isNowVisible } from "./now";

const nowInviteListInclude = {
  organizer: { select: { id: true, nickname: true, avatarUrl: true } },
  interests: {
    where: { withdrawnAt: null },
    orderBy: { createdAt: "asc" as const },
    take: 3,
    select: {
      profileId: true,
      profile: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  },
  _count: { select: { interests: { where: { withdrawnAt: null } } } },
} as const;

export async function getNowBrowseFeed(
  city: string,
  now = new Date(),
  viewerId?: string,
) {
  const invites = await prisma.nowInvite.findMany({
    where: {
      city: { equals: city, mode: "insensitive" },
      expiresAt: { gt: now },
    },
    include: nowInviteListInclude,
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const interestedInviteIds =
    viewerId && invites.length
      ? new Set(
          (
            await prisma.nowInterest.findMany({
              where: {
                profileId: viewerId,
                withdrawnAt: null,
                inviteId: { in: invites.map((invite) => invite.id) },
              },
              select: { inviteId: true },
            })
          ).map((interest) => interest.inviteId),
        )
      : new Set<string>();

  return invites
    .map((invite) => ({
      ...invite,
      viewerInterested: interestedInviteIds.has(invite.id),
      priority: getNowPriority({
        id: invite.id,
        interestCount: invite._count.interests,
        createdAt: invite.createdAt,
        now,
      }),
    }))
    .sort((a, b) => b.priority.score - a.priority.score);
}

export async function getNowHomeFeed(city: string, now = new Date()) {
  const ranked = await getNowBrowseFeed(city, now);
  const visitSeed = Math.random().toString(36).slice(2);

  // Keep the first viewport varied without breaking score-based prioritization.
  const selected: typeof ranked = [];
  const remaining = ranked
    .slice(0, 24)
    .sort(
      (a, b) =>
        b.priority.score +
        getNowVisitJitter(b.id, visitSeed) -
        a.priority.score -
        getNowVisitJitter(a.id, visitSeed),
    );
  while (selected.length < 7 && remaining.length) {
    const next = remaining.findIndex(
      (item) => !selected.some((shown) => shown.category === item.category),
    );
    selected.push(remaining.splice(next < 0 ? 0 : next, 1)[0]);
  }
  return selected;
}

export async function getNowInviteDetail(
  inviteId: string,
  viewerId?: string | null,
) {
  const invite = await prisma.nowInvite.findUnique({
    where: { id: inviteId },
    include: {
      organizer: { select: { id: true, nickname: true, avatarUrl: true } },
      interests: {
        where: { withdrawnAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          profileId: true,
          note: true,
          selectedAt: true,
          createdAt: true,
          profile: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      },
      linkedActivity: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          author: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!invite) return null;
  const isOrganizer = invite.organizerId === viewerId;
  const isInterested = invite.interests.some(
    (interest) => interest.profileId === viewerId,
  );
  if (!isNowVisible(invite.expiresAt) && !isOrganizer && !isInterested)
    return null;
  return {
    ...invite,
    isOrganizer,
    isInterested,
    messages: isOrganizer || isInterested ? invite.messages : [],
    interests:
      isOrganizer || isInterested
        ? invite.interests
        : invite.interests.map((interest) => ({
            ...interest,
            note: null,
            selectedAt: null,
          })),
  };
}

export async function getMyNowInvites(profileId: string) {
  const [created, interested] = await Promise.all([
    prisma.nowInvite.findMany({
      where: { organizerId: profileId },
      include: nowInviteListInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.nowInvite.findMany({
      where: { interests: { some: { profileId, withdrawnAt: null } } },
      include: nowInviteListInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return { created, interested };
}

export async function getNowConversationContext({
  inviteId,
  currentUserProfileId,
  peerProfileId,
}: {
  inviteId: string;
  currentUserProfileId: string;
  peerProfileId: string;
}) {
  return prisma.nowInvite.findFirst({
    where: {
      id: inviteId,
      OR: [
        {
          organizerId: currentUserProfileId,
          interests: { some: { profileId: peerProfileId, withdrawnAt: null } },
        },
        {
          organizerId: peerProfileId,
          interests: {
            some: { profileId: currentUserProfileId, withdrawnAt: null },
          },
        },
      ],
    },
    select: {
      id: true,
      category: true,
      title: true,
      area: true,
      intentWindow: true,
    },
  });
}
