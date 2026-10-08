import { prisma } from "@/lib/prisma";

const ticketPageSize = 20;

export async function getOwnedTicketPage(input: {
  definitionId: string;
  page: number;
  profileId: string;
}) {
  const where = {
    definitionId: input.definitionId,
    ownerProfileId: input.profileId,
  };
  const [total, redeemedCount] = await Promise.all([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.count({
      where: { ...where, redeemedAt: { not: null } },
    }),
  ]);
  const page = Math.min(
    Math.max(1, input.page),
    Math.max(1, Math.ceil(total / ticketPageSize)),
  );
  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { serialNumber: "asc" },
    skip: (page - 1) * ticketPageSize,
    take: ticketPageSize,
    select: {
      giftedAt: true,
      id: true,
      redeemedAt: true,
    },
  });

  return {
    items: items.map((item) => ({
      giftedAt: item.giftedAt?.toISOString() ?? null,
      id: item.id,
      redeemedAt: item.redeemedAt?.toISOString() ?? null,
    })),
    page,
    pageSize: ticketPageSize,
    redeemedCount,
    total,
  };
}

export async function getOwnedTicketForProfile(input: {
  itemId: string;
  profileId: string;
}) {
  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: input.itemId,
      ownerProfileId: input.profileId,
      definition: { kind: "EVENT_TICKET" },
    },
    select: {
      definition: {
        select: {
          description: true,
          id: true,
          imageUrl: true,
          title: true,
        },
      },
      giftedAt: true,
      id: true,
      redeemedAt: true,
    },
  });

  return item
    ? {
        definition: item.definition,
        giftedAt: item.giftedAt?.toISOString() ?? null,
        id: item.id,
        redeemedAt: item.redeemedAt?.toISOString() ?? null,
      }
    : null;
}
