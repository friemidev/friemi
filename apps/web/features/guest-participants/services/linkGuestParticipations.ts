import type { ParticipantStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  normalizeGuestEmail,
  normalizeGuestPhone,
  normalizeGuestWechatId,
} from "../utils/contactIdentity";

type PrismaTx = Prisma.TransactionClient;

const linkableGuestStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const existingParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];

function getGuestMatchWhere(profile: {
  contactEmail?: string | null;
  email?: string | null;
  emailVerifiedAt?: Date | string | null;
  normalizedContactEmail?: string | null;
  normalizedPhone?: string | null;
  normalizedWechatId?: string | null;
  phone?: string | null;
  verifiedEmail?: string | null;
  wechatId?: string | null;
}): Prisma.GuestActivityParticipantWhereInput[] {
  const normalizedEmails = new Set(
    [
      profile.normalizedContactEmail,
      normalizeGuestEmail(profile.contactEmail),
      normalizeGuestEmail(
        profile.verifiedEmail ??
          (profile.emailVerifiedAt ? profile.email : null),
      ),
    ].filter(Boolean) as string[],
  );
  const normalizedPhone =
    profile.normalizedPhone ?? normalizeGuestPhone(profile.phone);
  const normalizedWechatId =
    profile.normalizedWechatId ?? normalizeGuestWechatId(profile.wechatId);
  const matches: Prisma.GuestActivityParticipantWhereInput[] = [];

  for (const normalizedEmail of normalizedEmails) {
    matches.push({ normalizedEmail });
  }

  if (normalizedPhone) {
    matches.push({ normalizedPhone });
  }

  if (normalizedWechatId) {
    matches.push({
      normalizedWechatId,
    });
  }

  return matches;
}

async function linkGuestParticipation(
  tx: PrismaTx,
  guest: {
    activityId: string;
    id: string;
    linkedParticipantId: string | null;
    status: ParticipantStatus;
    message: string | null;
  },
  profileId: string,
) {
  if (guest.linkedParticipantId) {
    return null;
  }

  const existingParticipation = await tx.activityParticipant.findUnique({
    where: {
      activityId_userProfileId: {
        activityId: guest.activityId,
        userProfileId: profileId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  const participant =
    existingParticipation &&
    existingParticipantStatuses.includes(existingParticipation.status)
      ? existingParticipation
      : existingParticipation
        ? await tx.activityParticipant.update({
            where: {
              id: existingParticipation.id,
            },
            data: {
              cancelledAt: null,
              joinedAt: new Date(),
              message: guest.message,
              status: guest.status,
            },
            select: {
              id: true,
              status: true,
            },
          })
        : await tx.activityParticipant.create({
            data: {
              activityId: guest.activityId,
              message: guest.message,
              status: guest.status,
              userProfileId: profileId,
            },
            select: {
              id: true,
              status: true,
            },
          });

  const alreadyLinkedGuest = await tx.guestActivityParticipant.findUnique({
    where: {
      linkedParticipantId: participant.id,
    },
    select: {
      id: true,
    },
  });

  if (alreadyLinkedGuest && alreadyLinkedGuest.id !== guest.id) {
    await tx.guestActivityParticipant.update({
      where: {
        id: guest.id,
      },
      data: {
        linkedAt: new Date(),
        linkedUserProfileId: profileId,
        status: "CANCELLED",
      },
    });

    return null;
  }

  await tx.guestActivityParticipant.update({
    where: {
      id: guest.id,
    },
    data: {
      linkedAt: new Date(),
      linkedParticipantId: participant.id,
      linkedUserProfileId: profileId,
    },
  });

  return participant.id;
}

export async function linkGuestParticipationsForProfile(
  prismaClient: PrismaClient,
  profile: {
    contactEmail?: string | null;
    email?: string | null;
    emailVerifiedAt?: Date | string | null;
    id: string;
    normalizedContactEmail?: string | null;
    normalizedPhone?: string | null;
    normalizedWechatId?: string | null;
    phone?: string | null;
    verifiedEmail?: string | null;
    wechatId?: string | null;
  },
) {
  const matchWhere = getGuestMatchWhere(profile);

  if (matchWhere.length === 0) {
    return { linked: 0 };
  }

  return prismaClient.$transaction(async (tx) => {
    const guestParticipations = await tx.guestActivityParticipant.findMany({
      where: {
        linkedParticipantId: null,
        status: {
          in: linkableGuestStatuses,
        },
        OR: matchWhere,
      },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      select: {
        activityId: true,
        id: true,
        linkedParticipantId: true,
        message: true,
        status: true,
      },
    });

    let linked = 0;

    for (const guest of guestParticipations) {
      const participantId = await linkGuestParticipation(tx, guest, profile.id);

      if (participantId) {
        linked += 1;
      }
    }

    return { linked };
  });
}
