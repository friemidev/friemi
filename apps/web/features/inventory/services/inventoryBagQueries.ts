import { prisma } from "@/lib/prisma";

export type BagTicketFilter = "all" | "available" | "used";

export const bagTicketPageSize = 24;

export async function getGeneralInventoryBagSummary(profileId: string) {
  const definitions = await prisma.inventoryItemDefinition.findMany({
    where: {
      kind: "GENERAL",
      OR: [
        { items: { some: { ownerProfileId: profileId } } },
        { issueBatches: { some: { recipientProfileId: profileId } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      description: true,
      id: true,
      imageUrl: true,
      isGiftable: true,
      kind: true,
      title: true,
    },
    take: 100,
  });

  return Promise.all(
    definitions.map(async (definition) => {
      const [quantity, transferableCount] = await Promise.all([
        prisma.inventoryItem.count({
          where: { definitionId: definition.id, ownerProfileId: profileId },
        }),
        prisma.inventoryItem.count({
          where: {
            definitionId: definition.id,
            giftedAt: null,
            ownerProfileId: profileId,
            redeemedAt: null,
          },
        }),
      ]);

      return {
        createdAt: definition.createdAt.toISOString(),
        description: definition.description,
        id: definition.id,
        imageUrl: definition.imageUrl,
        isGiftable: definition.isGiftable,
        kind: definition.kind,
        quantity,
        title: definition.title,
        transferableCount: definition.isGiftable ? transferableCount : 0,
      };
    }),
  );
}

export async function getTicketBagPage(input: {
  filter: BagTicketFilter;
  page: number;
  profileId: string;
}) {
  return getTicketBagPageInDatabase(prisma, input);
}

export async function getTicketBagPageInDatabase(
  db: Pick<typeof prisma, "inventoryItem">,
  input: { filter: BagTicketFilter; page: number; profileId: string },
) {
  const where = {
    ownerProfileId: input.profileId,
    definition: { kind: "EVENT_TICKET" as const },
    ...(input.filter === "available"
      ? { redeemedAt: null }
      : input.filter === "used"
        ? { redeemedAt: { not: null } }
        : {}),
  };
  const total = await db.inventoryItem.count({ where });
  const requestedPage =
    Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1;
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(total / bagTicketPageSize)),
  );
  const items = await db.inventoryItem.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * bagTicketPageSize,
    take: bagTicketPageSize,
    select: {
      createdAt: true,
      definition: {
        select: {
          id: true,
          imageUrl: true,
          title: true,
        },
      },
      giftedAt: true,
      id: true,
      redeemedAt: true,
      updatedAt: true,
    },
  });

  return {
    items: items.map((item) => ({
      createdAt: item.createdAt.toISOString(),
      definitionId: item.definition.id,
      giftedAt: item.giftedAt?.toISOString() ?? null,
      id: item.id,
      imageUrl: item.definition.imageUrl,
      redeemedAt: item.redeemedAt?.toISOString() ?? null,
      title: item.definition.title,
      updatedAt: item.updatedAt.toISOString(),
    })),
    page,
    pageSize: bagTicketPageSize,
    total,
  };
}
