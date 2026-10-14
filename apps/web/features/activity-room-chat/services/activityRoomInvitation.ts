import type { ParticipantStatus, Prisma } from "@prisma/client";

export async function approveInvitedActivityRoomParticipant({
  db,
  activityId,
  profileId,
  previous,
}: {
  db: Prisma.TransactionClient;
  activityId: string;
  profileId: string;
  previous: { id: string; status: ParticipantStatus } | null;
}) {
  if (!previous) {
    return db.activityParticipant.create({
      data: { activityId, userProfileId: profileId, status: "APPROVED" },
    });
  }
  if (previous.status !== "CANCELLED" && previous.status !== "REJECTED") {
    return null;
  }
  // The status predicate is rechecked after a competing invitation commits.
  const updated = await db.activityParticipant.updateMany({
    where: {
      id: previous.id,
      activityId,
      userProfileId: profileId,
      status: previous.status,
    },
    data: {
      cancelledAt: null,
      joinedAt: new Date(),
      message: null,
      status: "APPROVED",
    },
  });
  if (updated.count !== 1) return null;
  return db.activityParticipant.findUniqueOrThrow({
    where: { id: previous.id },
  });
}
