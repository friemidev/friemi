import { getMerchantTicketOverview } from "@/features/inventory/services/ticketAccessService";
import { prisma } from "@/lib/prisma";

export async function getMerchantOwnedTickets(profileId: string) {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true, ownerProfileId: profileId },
    select: { id: true },
  });
  if (!merchant) return null;

  return getMerchantTicketOverview({
    actorProfileId: profileId,
    isAdmin: false,
    merchantId: merchant.id,
  });
}
