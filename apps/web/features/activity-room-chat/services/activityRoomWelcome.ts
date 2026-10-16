import type { Prisma } from "@prisma/client";
import {
  normalizeActivityRoomWelcomeTemplate,
  renderActivityRoomWelcome,
  shouldWelcomeActivityRoomParticipant,
} from "../assistant";

export async function updateActivityRoomWelcomeTemplate({
  db,
  activityId,
  actorId,
  template,
}: {
  db: Prisma.TransactionClient;
  activityId: string;
  actorId: string;
  template: string;
}) {
  const normalized = normalizeActivityRoomWelcomeTemplate(template);
  if (!normalized) return false;
  const result = await db.activity.updateMany({
    where: {
      id: activityId,
      type: { not: "PUBLIC_EVENT" },
      OR: [
        { organizerId: actorId },
        { coManagers: { some: { managerProfileId: actorId } } },
      ],
    },
    data: { roomWelcomeTemplate: normalized },
  });
  if (result.count === 0) return false;
  await db.activityManagementLog.create({
    data: { activityId, actorId, action: "ROOM_WELCOME_UPDATED" },
  });
  return true;
}

export async function sendActivityRoomWelcome({
  db,
  participant,
  previousStatus,
}: {
  db: Prisma.TransactionClient;
  participant: {
    id: string;
    activityId: string;
    userProfileId: string;
    status: string;
    joinedAt: Date;
  };
  previousStatus?: string | null;
}) {
  if (
    !shouldWelcomeActivityRoomParticipant(previousStatus, participant.status)
  ) {
    return null;
  }
  const activity = await db.activity.findUnique({
    where: { id: participant.activityId },
    select: {
      title: true,
      type: true,
      roomWelcomeTemplate: true,
      organizerId: true,
      coManagers: { select: { managerProfileId: true } },
      participants: {
        where: { status: { in: ["JOINED", "APPROVED"] } },
        select: { userProfileId: true },
      },
    },
  });
  if (!activity || activity.type === "PUBLIC_EVENT") return null;
  const profile = await db.userProfile.findUnique({
    where: { id: participant.userProfileId },
    select: { nickname: true, friendCode: true },
  });
  if (!profile) return null;

  const message = await db.activityRoomMessage.upsert({
    where: {
      assistantWelcomeKey: `${participant.id}:${participant.joinedAt.toISOString()}`,
    },
    create: {
      activityId: participant.activityId,
      senderId: null,
      assistantWelcomeKey: `${participant.id}:${participant.joinedAt.toISOString()}`,
      body: renderActivityRoomWelcome(
        activity.roomWelcomeTemplate,
        profile.nickname.trim() || profile.friendCode || "Friemi",
        activity.title,
      ),
    },
    update: {},
    select: { id: true },
  });

  return {
    messageId: message.id,
    profileIds: [
      ...new Set([
        activity.organizerId,
        participant.userProfileId,
        ...activity.coManagers.map((manager) => manager.managerProfileId),
        ...activity.participants.map((member) => member.userProfileId),
      ]),
    ],
  };
}
