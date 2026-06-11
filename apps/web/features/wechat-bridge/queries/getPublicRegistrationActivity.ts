import type { ActivityCategory as SharedActivityCategory } from "@chill-club/shared";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPublicRegistrationToken } from "../utils/token";

const publicRegistrationActivityStatuses: ActivityStatus[] = [
  "RECRUITING",
  "CONFIRMED",
  "OPEN",
  "FULL",
];
const publicRegistrationVisibility: ActivityVisibility[] = [
  "PUBLIC",
  "LINK_ONLY",
];
const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const participantPreviewLimit = 6;

export type PublicRegistrationParticipantPreview = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  kind: "guest" | "user";
};

export type PublicRegistrationActivity = {
  address: string;
  attendeeCount: number;
  capacity: number;
  category: SharedActivityCategory;
  city: string;
  coverImageUrl: string | null;
  description: string;
  endAt: string | null;
  id: string;
  isClosed: boolean;
  isFull: boolean;
  organizer: {
    id: string;
    nickname: string;
  };
  participantPreview: PublicRegistrationParticipantPreview[];
  participantPreviewRemaining: number;
  priceText: string;
  remainingSeats: number | null;
  startAt: string;
  status: string;
  title: string;
};

type ActivityForPublicRegistration = NonNullable<
  Awaited<ReturnType<typeof getPublicRegistrationActivityRaw>>
>;

async function getPublicRegistrationActivityRaw(activityId: string) {
  return prisma.activity.findFirst({
    where: {
      id: activityId,
      organizer: {
        status: "ACTIVE",
      },
      status: {
        in: publicRegistrationActivityStatuses,
      },
      visibility: {
        in: publicRegistrationVisibility,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      city: true,
      address: true,
      startAt: true,
      endAt: true,
      capacity: true,
      priceText: true,
      coverImageUrl: true,
      status: true,
      organizer: {
        select: {
          id: true,
          nickname: true,
        },
      },
      participants: {
        where: {
          status: {
            in: activeParticipantStatuses,
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
        take: participantPreviewLimit,
        select: {
          id: true,
          joinedAt: true,
          userProfile: {
            select: {
              avatarUrl: true,
              nickname: true,
            },
          },
        },
      },
      _count: {
        select: {
          participants: {
            where: {
              status: {
                in: activeParticipantStatuses,
              },
            },
          },
        },
      },
    },
  });
}

async function getGuestRegistrationStats(activityId: string) {
  const [guestAttendeeAggregate, guestPreview] = await Promise.all([
    prisma.activityGuestRegistration.aggregate({
      where: {
        activityId,
        status: "ACTIVE",
      },
      _sum: {
        attendeeCount: true,
      },
    }),
    prisma.activityGuestRegistration.findMany({
      where: {
        activityId,
        status: "ACTIVE",
      },
      orderBy: {
        joinedAt: "asc",
      },
      take: participantPreviewLimit,
      select: {
        id: true,
        displayName: true,
        joinedAt: true,
      },
    }),
  ]);

  return {
    attendeeCount: guestAttendeeAggregate._sum.attendeeCount ?? 0,
    preview: guestPreview,
  };
}

function toPublicRegistrationActivity(
  activity: ActivityForPublicRegistration,
  guestStats: Awaited<ReturnType<typeof getGuestRegistrationStats>>,
): PublicRegistrationActivity {
  const userPreview = activity.participants.map((participant) => ({
    avatarUrl: participant.userProfile.avatarUrl,
    displayName: participant.userProfile.nickname,
    id: participant.id,
    joinedAt: participant.joinedAt,
    kind: "user" as const,
  }));
  const guestPreview = guestStats.preview.map((registration) => ({
    avatarUrl: null,
    displayName: registration.displayName,
    id: registration.id,
    joinedAt: registration.joinedAt,
    kind: "guest" as const,
  }));
  const attendeeCount = activity._count.participants + guestStats.attendeeCount;
  const participantPreview = [...userPreview, ...guestPreview]
    .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime())
    .slice(0, participantPreviewLimit)
    .map(({ joinedAt: _joinedAt, ...participant }) => participant);
  const participantPreviewRemaining = Math.max(
    attendeeCount - participantPreview.length,
    0,
  );
  const endBoundary = activity.endAt ?? activity.startAt;
  const isClosed =
    activity.status === "CANCELLED" ||
    activity.status === "ENDED" ||
    endBoundary <= new Date();
  const isFull = activity.capacity > 0 && attendeeCount >= activity.capacity;
  const remainingSeats =
    activity.capacity > 0
      ? Math.max(activity.capacity - attendeeCount, 0)
      : null;

  return {
    address: activity.address,
    attendeeCount,
    capacity: activity.capacity,
    category: activity.category as SharedActivityCategory,
    city: activity.city,
    coverImageUrl: activity.coverImageUrl,
    description: activity.description,
    endAt: activity.endAt?.toISOString() ?? null,
    id: activity.id,
    isClosed,
    isFull,
    organizer: activity.organizer,
    participantPreview,
    participantPreviewRemaining,
    priceText: activity.priceText,
    remainingSeats,
    startAt: activity.startAt.toISOString(),
    status: activity.status,
    title: activity.title,
  };
}

export async function getPublicRegistrationActivity(activityId: string) {
  const activity = await getPublicRegistrationActivityRaw(activityId);

  if (!activity) {
    return null;
  }

  return toPublicRegistrationActivity(
    activity,
    await getGuestRegistrationStats(activity.id),
  );
}

export async function getPublicRegistrationReceipt(token: string) {
  const tokenHash = hashPublicRegistrationToken(token);
  const registration = await prisma.activityGuestRegistration.findUnique({
    where: {
      registrationTokenHash: tokenHash,
    },
    select: {
      id: true,
      attendeeCount: true,
      displayName: true,
      joinedAt: true,
      note: true,
      status: true,
      activity: {
        select: {
          id: true,
          title: true,
          address: true,
          startAt: true,
          endAt: true,
          priceText: true,
          organizer: {
            select: {
              nickname: true,
            },
          },
        },
      },
    },
  });

  if (!registration) {
    return null;
  }

  return {
    ...registration,
    activity: {
      ...registration.activity,
      endAt: registration.activity.endAt?.toISOString() ?? null,
      startAt: registration.activity.startAt.toISOString(),
    },
    joinedAt: registration.joinedAt.toISOString(),
  };
}

export async function getGuestRegistrationsForOrganizer({
  activityId,
  organizerId,
}: {
  activityId: string;
  organizerId: string;
}) {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      organizerId,
    },
    select: {
      id: true,
      title: true,
      capacity: true,
      guestRegistrations: {
        orderBy: {
          joinedAt: "desc",
        },
        select: {
          id: true,
          attendeeCount: true,
          contactEncrypted: true,
          displayName: true,
          joinedAt: true,
          note: true,
          status: true,
        },
      },
    },
  });

  if (!activity) {
    return null;
  }

  return {
    ...activity,
    guestRegistrations: activity.guestRegistrations.map((registration) => ({
      ...registration,
      joinedAt: registration.joinedAt.toISOString(),
    })),
  };
}
