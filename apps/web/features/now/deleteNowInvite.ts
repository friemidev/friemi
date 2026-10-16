import type { Prisma } from "@prisma/client";

type DeleteNowInviteStore = Pick<
  Prisma.TransactionClient,
  "nowInvite" | "notification"
>;

// Run inside a transaction: remove notifications before their invite reference
// is cleared. Existing private chats and linked activities survive via SetNull.
export async function deleteNowInviteForOrganizer(
  tx: DeleteNowInviteStore,
  inviteId: string,
  organizerId: string,
) {
  const invite = await tx.nowInvite.findFirst({
    where: { id: inviteId, organizerId },
    select: {
      id: true,
      notifications: { select: { recipientId: true } },
      conversations: { select: { id: true } },
    },
  });
  if (!invite) return null;

  await tx.notification.deleteMany({ where: { nowInviteId: invite.id } });
  const deleted = await tx.nowInvite.deleteMany({
    where: { id: invite.id, organizerId },
  });
  if (!deleted.count) return null;

  return {
    recipientIds: [
      ...new Set(invite.notifications.map((item) => item.recipientId)),
    ],
    conversationIds: invite.conversations.map((item) => item.id),
  };
}
