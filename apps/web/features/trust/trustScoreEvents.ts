import type { Prisma, TrustScoreEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateTrustScore } from "./trustScore";

type DbClient = typeof prisma | Prisma.TransactionClient;

type TrustScoreEventInput = {
  activityId?: string | null;
  note?: string | null;
  profileId: string;
};

type ApplyTrustScoreEventInput = TrustScoreEventInput & {
  delta: number;
  type: TrustScoreEventType;
};

const trustScoreEventDeltaByType = {
  ACTIVITY_CHECK_IN: 1,
  CLEAN_HALF_YEAR: 5,
  HARASSMENT_DM: -20,
  INVITE_FRIEND: 2,
  MASS_REPORT: -10,
  NO_SHOW: -2,
  ORGANIZER_REPORT: -5,
  PHONE_VERIFIED: 2,
  USER_REPORT: -2,
} satisfies Record<TrustScoreEventType, number>;

export function getTrustScoreEventDelta(type: TrustScoreEventType) {
  return trustScoreEventDeltaByType[type];
}

export async function getTrustScore(db: DbClient, profileId: string) {
  const aggregate = await db.trustScoreEvent.aggregate({
    where: { profileId },
    _sum: { delta: true },
  });

  return calculateTrustScore(aggregate._sum.delta);
}

export async function applyTrustScoreEvent(
  db: DbClient,
  {
    activityId = null,
    delta,
    note = null,
    profileId,
    type,
  }: ApplyTrustScoreEventInput,
) {
  if (!activityId) {
    const existingEvent = await db.trustScoreEvent.findFirst({
      where: {
        activityId: null,
        profileId,
        type,
      },
      select: {
        id: true,
      },
    });

    if (existingEvent) {
      return db.trustScoreEvent.update({
        where: {
          id: existingEvent.id,
        },
        data: {
          delta,
          note,
        },
      });
    }

    return db.trustScoreEvent.create({
      data: {
        activityId: null,
        delta,
        note,
        profileId,
        type,
      },
    });
  }

  return db.trustScoreEvent.upsert({
    where: {
      profileId_type_activityId: {
        activityId,
        profileId,
        type,
      },
    },
    create: {
      activityId,
      delta,
      note,
      profileId,
      type,
    },
    update: {
      delta,
      note,
    },
  });
}

export async function applyStandardTrustScoreEvent(
  db: DbClient,
  input: TrustScoreEventInput & { type: TrustScoreEventType },
) {
  return applyTrustScoreEvent(db, {
    ...input,
    delta: getTrustScoreEventDelta(input.type),
  });
}

export async function removeTrustScoreEvent(
  db: DbClient,
  {
    activityId = null,
    profileId,
    type,
  }: TrustScoreEventInput & { type: TrustScoreEventType },
) {
  return db.trustScoreEvent.deleteMany({
    where: {
      activityId,
      profileId,
      type,
    },
  });
}

export async function applyPhoneVerifiedTrustScore(profileId: string) {
  return applyStandardTrustScoreEvent(prisma, {
    note: "Phone number connected to profile",
    profileId,
    type: "PHONE_VERIFIED",
  });
}

export async function applyInviteFriendTrustScore(profileId: string) {
  return applyStandardTrustScoreEvent(prisma, {
    note: "Friend invite accepted",
    profileId,
    type: "INVITE_FRIEND",
  });
}

export async function applyManualModerationTrustScoreEvent(
  input: TrustScoreEventInput & {
    type: Extract<
      TrustScoreEventType,
      "HARASSMENT_DM" | "MASS_REPORT" | "ORGANIZER_REPORT" | "USER_REPORT"
    >;
  },
) {
  return applyStandardTrustScoreEvent(prisma, input);
}

export async function applyResolvedUserReportTrustScoreEvent({
  profileId,
  reportId,
}: {
  profileId: string;
  reportId: string;
}) {
  const note = `Admin resolved report ${reportId}`;
  const existingEvent = await prisma.trustScoreEvent.findFirst({
    where: {
      note,
      profileId,
      type: "USER_REPORT",
    },
    select: {
      id: true,
    },
  });

  if (existingEvent) {
    return prisma.trustScoreEvent.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        delta: getTrustScoreEventDelta("USER_REPORT"),
        note,
      },
    });
  }

  return prisma.trustScoreEvent.create({
    data: {
      delta: getTrustScoreEventDelta("USER_REPORT"),
      note,
      profileId,
      type: "USER_REPORT",
    },
  });
}

export async function syncActivityNoShowTrustScoreEvents({
  activityId,
  now = new Date(),
}: {
  activityId?: string;
  now?: Date;
} = {}) {
  const noShowBoundary = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const participations = await prisma.activityParticipant.findMany({
    where: {
      activityId,
      checkedInAt: null,
      status: {
        in: ["JOINED", "APPROVED"],
      },
      activity: {
        OR: [
          { endAt: { lte: noShowBoundary } },
          {
            endAt: null,
            startAt: { lte: noShowBoundary },
          },
        ],
        status: {
          not: "CANCELLED",
        },
      },
    },
    select: {
      activityId: true,
      userProfileId: true,
    },
  });

  await Promise.all(
    participations.map((participation) =>
      applyStandardTrustScoreEvent(prisma, {
        activityId: participation.activityId,
        note: "Approved hangout participant did not check in after the event",
        profileId: participation.userProfileId,
        type: "NO_SHOW",
      }),
    ),
  );

  return { appliedCount: participations.length };
}

export async function syncCleanHalfYearTrustScoreEvents({
  now = new Date(),
}: {
  now?: Date;
} = {}) {
  const cleanBoundary = new Date(now);
  cleanBoundary.setMonth(cleanBoundary.getMonth() - 6);

  const eligibleProfiles = await prisma.userProfile.findMany({
    where: {
      status: "ACTIVE",
      trustScoreEvents: {
        none: {
          delta: {
            lt: 0,
          },
          createdAt: {
            gte: cleanBoundary,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    eligibleProfiles.map((profile) =>
      applyStandardTrustScoreEvent(prisma, {
        note: "No trust violations for six months",
        profileId: profile.id,
        type: "CLEAN_HALF_YEAR",
      }),
    ),
  );

  return { appliedCount: eligibleProfiles.length };
}
