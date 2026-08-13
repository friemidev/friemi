import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const planetChatMessageMaxLength = 1000;
export const defaultPlanetChatRosterLimit = 80;

export type PlanetChatRosterItemViewModel = {
  coverImageUrl: string | null;
  id: string;
  isMuted: boolean;
  isPinned: boolean;
  joinedAt: string;
  lastMessage: {
    body: string;
    createdAt: string;
    id: string;
    isMine: boolean;
    senderId: string;
    senderName: string;
  } | null;
  name: string;
  slug: string;
  tags: string[];
  unreadCount: number;
};

export type PlanetChatErrorCode =
  | "CHAT_ACCESS_DENIED"
  | "INVALID_MESSAGE";

export class PlanetChatDomainError extends Error {
  code: PlanetChatErrorCode;

  constructor(code: PlanetChatErrorCode) {
    super(code);
    this.name = "PlanetChatDomainError";
    this.code = code;
  }
}

export function isApprovedPlanetChatMember(
  status?: string | null,
) {
  return status === "APPROVED";
}

export function normalizePlanetChatMessage(content: string) {
  const normalized = content.trim();

  if (!normalized || normalized.length > planetChatMessageMaxLength) {
    throw new PlanetChatDomainError("INVALID_MESSAGE");
  }

  return normalized;
}

function normalizePlanetChatRosterLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return defaultPlanetChatRosterLimit;
  }

  return Math.max(1, Math.min(100, Math.floor(limit)));
}

export function getLocalizedPlanetChatName({
  fallbackName,
  locale,
  translations,
}: {
  fallbackName: string;
  locale: string;
  translations: Prisma.JsonValue | null;
}) {
  if (
    (locale === "en" || locale === "fr") &&
    translations &&
    typeof translations === "object" &&
    !Array.isArray(translations)
  ) {
    const translated = translations[locale];

    if (typeof translated === "string" && translated.trim()) {
      return translated.trim();
    }
  }

  return fallbackName;
}

export function getPlanetChatUnreadSince(
  joinedAt: Date,
  lastReadAt?: Date | null,
) {
  if (!lastReadAt || lastReadAt.getTime() < joinedAt.getTime()) {
    return joinedAt;
  }

  return lastReadAt;
}

export function resolvePlanetChatPreferenceTimestamp(
  enabled: boolean,
  now = new Date(),
) {
  return enabled ? now : null;
}

export function sortPlanetChatRosterItems(
  items: PlanetChatRosterItemViewModel[],
) {
  return [...items].sort((itemA, itemB) => {
    if (itemA.isPinned !== itemB.isPinned) {
      return itemA.isPinned ? -1 : 1;
    }

    const timeA = new Date(
      itemA.lastMessage?.createdAt ?? itemA.joinedAt,
    ).getTime();
    const timeB = new Date(
      itemB.lastMessage?.createdAt ?? itemB.joinedAt,
    ).getTime();

    return timeB - timeA || itemA.id.localeCompare(itemB.id);
  });
}

async function getPlanetChatUnreadCountMap(
  planets: Array<{
    chatReadStates: Array<{ lastReadAt: Date }>;
    id: string;
    joinedAt: Date;
  }>,
  viewerProfileId: string,
) {
  if (planets.length === 0) {
    return new Map<string, number>();
  }

  const groups = await prisma.planetMessage.groupBy({
    by: ["planetId"],
    where: {
      OR: planets.map((planet) => {
        const unreadSince = getPlanetChatUnreadSince(
          planet.joinedAt,
          planet.chatReadStates[0]?.lastReadAt,
        );

        return {
          authorId: {
            not: viewerProfileId,
          },
          createdAt: {
            gt: unreadSince,
          },
          planetId: planet.id,
        } satisfies Prisma.PlanetMessageWhereInput;
      }),
    },
    _count: {
      _all: true,
    },
  });

  return new Map(groups.map((group) => [group.planetId, group._count._all]));
}

async function requireApprovedMembership(
  tx: Prisma.TransactionClient,
  planetId: string,
  profileId: string,
) {
  const membership = await tx.planetMember.findUnique({
    where: {
      planetId_profileId: {
        planetId,
        profileId,
      },
    },
    select: {
      joinedAt: true,
      status: true,
    },
  });

  if (!isApprovedPlanetChatMember(membership?.status)) {
    throw new PlanetChatDomainError("CHAT_ACCESS_DENIED");
  }

  return membership;
}

export async function getPlanetChatUnreadState({
  planetId,
  profileId,
}: {
  planetId: string;
  profileId: string;
}) {
  const membership = await prisma.planetMember.findUnique({
    where: {
      planetId_profileId: {
        planetId,
        profileId,
      },
    },
    select: {
      joinedAt: true,
      status: true,
    },
  });

  if (!isApprovedPlanetChatMember(membership?.status)) {
    return {
      isMuted: false,
      isPinned: false,
      unreadCount: 0,
    };
  }

  const readState = await prisma.planetChatReadState.findUnique({
    where: {
      planetId_profileId: {
        planetId,
        profileId,
      },
    },
    select: {
      lastReadAt: true,
      mutedAt: true,
      pinnedAt: true,
    },
  });
  const unreadCount = await prisma.planetMessage.count({
    where: {
      planetId,
      authorId: {
        not: profileId,
      },
      createdAt: {
        gt: getPlanetChatUnreadSince(
          membership.joinedAt,
          readState?.lastReadAt,
        ),
      },
    },
  });

  return {
    isMuted: Boolean(readState?.mutedAt),
    isPinned: Boolean(readState?.pinnedAt),
    unreadCount,
  };
}

export async function markPlanetChatRead({
  planetId,
  profileId,
  readAt = new Date(),
}: {
  planetId: string;
  profileId: string;
  readAt?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    await requireApprovedMembership(tx, planetId, profileId);

    return tx.planetChatReadState.upsert({
      where: {
        planetId_profileId: {
          planetId,
          profileId,
        },
      },
      create: {
        lastReadAt: readAt,
        planetId,
        profileId,
      },
      update: {
        lastReadAt: readAt,
      },
    });
  });
}

export async function sendPlanetChatMessage({
  content,
  planetId,
  profileId,
}: {
  content: string;
  planetId: string;
  profileId: string;
}) {
  const normalizedContent = normalizePlanetChatMessage(content);

  return prisma.$transaction(async (tx) => {
    await requireApprovedMembership(tx, planetId, profileId);

    const message = await tx.planetMessage.create({
      data: {
        authorId: profileId,
        content: normalizedContent,
        planetId,
      },
      select: {
        createdAt: true,
        id: true,
      },
    });

    await tx.planetChatReadState.upsert({
      where: {
        planetId_profileId: {
          planetId,
          profileId,
        },
      },
      create: {
        lastReadAt: message.createdAt,
        planetId,
        profileId,
      },
      update: {
        lastReadAt: message.createdAt,
      },
    });

    return message;
  });
}

async function updatePlanetChatPreference({
  field,
  planetId,
  profileId,
  value,
}: {
  field: "mutedAt" | "pinnedAt";
  planetId: string;
  profileId: string;
  value: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const membership = await requireApprovedMembership(
      tx,
      planetId,
      profileId,
    );
    const preferenceAt = resolvePlanetChatPreferenceTimestamp(value);

    if (preferenceAt) {
      return tx.planetChatReadState.upsert({
        where: {
          planetId_profileId: {
            planetId,
            profileId,
          },
        },
        create: {
          [field]: preferenceAt,
          lastReadAt: membership.joinedAt,
          planetId,
          profileId,
        },
        update: {
          [field]: preferenceAt,
        },
      });
    }

    return tx.planetChatReadState.updateMany({
      where: {
        planetId,
        profileId,
      },
      data: {
        [field]: null,
      },
    });
  });
}

export function setPlanetChatMuted({
  muted,
  planetId,
  profileId,
}: {
  muted: boolean;
  planetId: string;
  profileId: string;
}) {
  return updatePlanetChatPreference({
    field: "mutedAt",
    planetId,
    profileId,
    value: muted,
  });
}

export function setPlanetChatPinned({
  pinned,
  planetId,
  profileId,
}: {
  pinned: boolean;
  planetId: string;
  profileId: string;
}) {
  return updatePlanetChatPreference({
    field: "pinnedAt",
    planetId,
    profileId,
    value: pinned,
  });
}

export async function getPlanetChatRoster(
  viewerProfileId: string,
  locale: string,
  limit = defaultPlanetChatRosterLimit,
): Promise<PlanetChatRosterItemViewModel[]> {
  const memberships = await prisma.planetMember.findMany({
    where: {
      profileId: viewerProfileId,
      status: "APPROVED",
    },
    orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
    take: normalizePlanetChatRosterLimit(limit),
    select: {
      joinedAt: true,
      planet: {
        select: {
          id: true,
          coverImageUrl: true,
          name: true,
          nameTranslations: true,
          slug: true,
          tags: true,
          chatReadStates: {
            where: {
              profileId: viewerProfileId,
            },
            select: {
              lastReadAt: true,
              mutedAt: true,
              pinnedAt: true,
            },
            take: 1,
          },
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              authorId: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  friendCode: true,
                  nickname: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const planets = memberships.map((membership) => ({
    ...membership.planet,
    joinedAt: membership.joinedAt,
  }));
  const unreadCountByPlanetId = await getPlanetChatUnreadCountMap(
    planets,
    viewerProfileId,
  );

  return sortPlanetChatRosterItems(
    memberships.map((membership) => {
      const planet = membership.planet;
      const lastMessage = planet.messages[0] ?? null;
      const readState = planet.chatReadStates[0] ?? null;

      return {
        coverImageUrl: planet.coverImageUrl,
        id: planet.id,
        isMuted: Boolean(readState?.mutedAt),
        isPinned: Boolean(readState?.pinnedAt),
        joinedAt: membership.joinedAt.toISOString(),
        lastMessage: lastMessage
          ? {
              body: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
              id: lastMessage.id,
              isMine: lastMessage.authorId === viewerProfileId,
              senderId: lastMessage.authorId,
              senderName:
                lastMessage.author.nickname.trim() ||
                lastMessage.author.friendCode ||
                "Friemi",
            }
          : null,
        name: getLocalizedPlanetChatName({
          fallbackName: planet.name,
          locale,
          translations: planet.nameTranslations,
        }),
        slug: planet.slug,
        tags: planet.tags,
        unreadCount: unreadCountByPlanetId.get(planet.id) ?? 0,
      };
    }),
  );
}

export async function getUnreadPlanetChatTotalMessageCount(
  viewerProfileId: string,
) {
  const memberships = await prisma.planetMember.findMany({
    where: {
      profileId: viewerProfileId,
      status: "APPROVED",
    },
    select: {
      joinedAt: true,
      planet: {
        select: {
          id: true,
          chatReadStates: {
            where: {
              profileId: viewerProfileId,
            },
            select: {
              lastReadAt: true,
              mutedAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });
  const unmutedPlanets = memberships
    .map((membership) => ({
      ...membership.planet,
      joinedAt: membership.joinedAt,
    }))
    .filter((planet) => !planet.chatReadStates[0]?.mutedAt);
  const unreadCountByPlanetId = await getPlanetChatUnreadCountMap(
    unmutedPlanets,
    viewerProfileId,
  );

  return [...unreadCountByPlanetId.values()].reduce(
    (total, unreadCount) => total + unreadCount,
    0,
  );
}
