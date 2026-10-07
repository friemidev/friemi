import { randomUUID } from "node:crypto";
import { Prisma, type InventoryGiftMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeFriemiCode } from "../friemiCode";

export async function findActiveProfileByFriemiCode(value: string) {
  const friendCode = normalizeFriemiCode(value);
  if (!friendCode) return null;

  return prisma.userProfile.findFirst({
    where: { friendCode, status: "ACTIVE" },
    select: { avatarUrl: true, friendCode: true, id: true, nickname: true },
  });
}

export async function createTicketDefinition(input: {
  actorProfileId: string;
  description: string | null;
  isGiftable: boolean;
  title: string;
  totalSupply: number;
}) {
  return prisma.inventoryItemDefinition.create({
    data: {
      createdByProfileId: input.actorProfileId,
      description: input.description,
      isGiftable: input.isGiftable,
      kind: "EVENT_TICKET",
      title: input.title,
      totalSupply: input.totalSupply,
    },
    select: { id: true },
  });
}

export async function setTicketGiftable(input: {
  definitionId: string;
  isGiftable: boolean;
}) {
  const updated = await prisma.inventoryItemDefinition.updateMany({
    where: { id: input.definitionId, kind: "EVENT_TICKET" },
    data: { isGiftable: input.isGiftable },
  });
  return updated.count > 0;
}

export type IssueTicketResult =
  | { status: "ISSUED"; batchId: string; recipientName: string }
  | { status: "INVALID" | "NOT_FOUND" | "SOLD_OUT" };

export async function issueTicketBatch(input: {
  actorProfileId: string;
  definitionId: string;
  quantity: number;
  recipientCode: string;
  requestId: string;
}): Promise<IssueTicketResult> {
  const recipient = await findActiveProfileByFriemiCode(input.recipientCode);
  if (!recipient) return { status: "NOT_FOUND" };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.inventoryIssueBatch.findUnique({
          where: { requestId: input.requestId },
        });
        if (existing) {
          return existing.definitionId === input.definitionId &&
            existing.recipientProfileId === recipient.id &&
            existing.actorProfileId === input.actorProfileId &&
            existing.quantity === input.quantity
            ? {
                status: "ISSUED" as const,
                batchId: existing.id,
                recipientName: recipient.nickname,
              }
            : { status: "INVALID" as const };
        }

        const activeRecipient = await tx.userProfile.findFirst({
          where: { id: recipient.id, status: "ACTIVE" },
          select: { id: true },
        });
        if (!activeRecipient) return { status: "NOT_FOUND" as const };

        const definition = await tx.inventoryItemDefinition.findUnique({
          where: { id: input.definitionId },
          select: { id: true, kind: true },
        });
        if (!definition || definition.kind !== "EVENT_TICKET") {
          return { status: "INVALID" as const };
        }

        const reserved = await tx.$queryRaw<Array<{ issuedCount: number }>>`
          UPDATE "InventoryItemDefinition"
          SET "issuedCount" = "issuedCount" + ${input.quantity}, "updatedAt" = ${new Date()}
          WHERE "id" = ${definition.id}
            AND "issuedCount" + ${input.quantity} <= "totalSupply"
          RETURNING "issuedCount"
        `;
        if (reserved.length === 0) return { status: "SOLD_OUT" as const };

        const batch = await tx.inventoryIssueBatch.create({
          data: {
            actorProfileId: input.actorProfileId,
            definitionId: definition.id,
            quantity: input.quantity,
            recipientProfileId: recipient.id,
            requestId: input.requestId,
          },
          select: { id: true },
        });

        await tx.inventoryItem.createMany({
          data: Array.from({ length: input.quantity }, (_, index) => ({
            id: randomUUID(),
            definitionId: definition.id,
            issueBatchId: batch.id,
            ownerProfileId: recipient.id,
            serialNumber: reserved[0].issuedCount - input.quantity + index + 1,
          })),
        });

        return {
          status: "ISSUED" as const,
          batchId: batch.id,
          recipientName: recipient.nickname,
        };
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.inventoryIssueBatch.findUnique({
        where: { requestId: input.requestId },
      });
      if (
        existing?.definitionId === input.definitionId &&
        existing.recipientProfileId === recipient.id &&
        existing.actorProfileId === input.actorProfileId &&
        existing.quantity === input.quantity
      ) {
        return {
          status: "ISSUED",
          batchId: existing.id,
          recipientName: recipient.nickname,
        };
      }
    }
    throw error;
  }
}

export type GiftTicketResult =
  | {
      status: "GIFTED";
      giftId: string;
      recipientName: string;
      serialNumber: number;
    }
  | {
      status: "INVALID" | "NOT_FOUND" | "SELF" | "NOT_GIFTABLE" | "NO_TICKETS";
    };

class GiftRaceError extends Error {}

export async function giftTicketByFriemiCode(input: {
  definitionId: string;
  method: InventoryGiftMethod;
  recipientCode: string;
  requestId: string;
  senderProfileId: string;
}): Promise<GiftTicketResult> {
  const recipient = await findActiveProfileByFriemiCode(input.recipientCode);
  if (!recipient) return { status: "NOT_FOUND" };
  if (recipient.id === input.senderProfileId) return { status: "SELF" };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.inventoryItemGift.findUnique({
          where: { requestId: input.requestId },
          include: {
            item: { select: { definitionId: true, serialNumber: true } },
          },
        });
        if (existing) {
          return existing.senderProfileId === input.senderProfileId &&
            existing.recipientProfileId === recipient.id &&
            existing.item.definitionId === input.definitionId &&
            existing.method === input.method
            ? {
                status: "GIFTED" as const,
                giftId: existing.id,
                recipientName: recipient.nickname,
                serialNumber: existing.item.serialNumber,
              }
            : { status: "INVALID" as const };
        }

        const activeRecipient = await tx.userProfile.findFirst({
          where: { id: recipient.id, status: "ACTIVE" },
          select: { id: true },
        });
        if (!activeRecipient) return { status: "NOT_FOUND" as const };

        const definition = await tx.inventoryItemDefinition.findUnique({
          where: { id: input.definitionId },
          select: { isGiftable: true, kind: true },
        });
        if (!definition || definition.kind !== "EVENT_TICKET") {
          return { status: "INVALID" as const };
        }
        if (!definition.isGiftable) return { status: "NOT_GIFTABLE" as const };

        const item = await tx.inventoryItem.findFirst({
          where: {
            definitionId: input.definitionId,
            giftedAt: null,
            ownerProfileId: input.senderProfileId,
          },
          orderBy: { serialNumber: "asc" },
          select: { id: true, serialNumber: true },
        });
        if (!item) return { status: "NO_TICKETS" as const };

        const giftedAt = new Date();
        const updated = await tx.inventoryItem.updateMany({
          where: {
            id: item.id,
            giftedAt: null,
            ownerProfileId: input.senderProfileId,
          },
          data: { giftedAt, ownerProfileId: recipient.id },
        });
        if (updated.count === 0) throw new GiftRaceError();

        const gift = await tx.inventoryItemGift.create({
          data: {
            itemId: item.id,
            method: input.method,
            recipientProfileId: recipient.id,
            requestId: input.requestId,
            senderProfileId: input.senderProfileId,
          },
          select: { id: true },
        });

        return {
          status: "GIFTED" as const,
          giftId: gift.id,
          recipientName: recipient.nickname,
          serialNumber: item.serialNumber,
        };
      });
    } catch (error) {
      if (error instanceof GiftRaceError) continue;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.inventoryItemGift.findUnique({
          where: { requestId: input.requestId },
          include: {
            item: { select: { definitionId: true, serialNumber: true } },
          },
        });
        if (
          existing?.senderProfileId === input.senderProfileId &&
          existing.recipientProfileId === recipient.id &&
          existing.item.definitionId === input.definitionId &&
          existing.method === input.method
        ) {
          return {
            status: "GIFTED",
            giftId: existing.id,
            recipientName: recipient.nickname,
            serialNumber: existing.item.serialNumber,
          };
        }
      }
      throw error;
    }
  }

  return { status: "NO_TICKETS" };
}

export async function getInventoryBagSummary(profileId: string) {
  const definitions = await prisma.inventoryItemDefinition.findMany({
    where: {
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
          },
        }),
      ]);
      return {
        createdAt: definition.createdAt.toISOString(),
        description: definition.description,
        id: definition.id,
        isGiftable: definition.isGiftable,
        kind: definition.kind,
        quantity,
        title: definition.title,
        transferableCount: definition.isGiftable ? transferableCount : 0,
      };
    }),
  );
}

export async function getInventoryDefinitionForProfile(input: {
  definitionId: string;
  page: number;
  profileId: string;
}) {
  const definition = await prisma.inventoryItemDefinition.findUnique({
    where: { id: input.definitionId },
    select: {
      description: true,
      id: true,
      isGiftable: true,
      kind: true,
      title: true,
    },
  });
  if (!definition) return null;

  const [quantity, transferableCount, issueCount, giftCount] =
    await Promise.all([
      prisma.inventoryItem.count({
        where: {
          definitionId: input.definitionId,
          ownerProfileId: input.profileId,
        },
      }),
      prisma.inventoryItem.count({
        where: {
          definitionId: input.definitionId,
          giftedAt: null,
          ownerProfileId: input.profileId,
        },
      }),
      prisma.inventoryIssueBatch.count({
        where: {
          definitionId: input.definitionId,
          recipientProfileId: input.profileId,
        },
      }),
      prisma.inventoryItemGift.count({
        where: {
          item: { definitionId: input.definitionId },
          OR: [
            { senderProfileId: input.profileId },
            { recipientProfileId: input.profileId },
          ],
        },
      }),
    ]);
  if (quantity === 0 && issueCount === 0 && giftCount === 0) return null;

  const pageSize = 30;
  const [ownedItems, history] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        definitionId: input.definitionId,
        ownerProfileId: input.profileId,
      },
      orderBy: { serialNumber: "asc" },
      take: 20,
      select: { giftedAt: true, id: true, serialNumber: true },
    }),
    prisma.inventoryItemGift.findMany({
      where: {
        item: { definitionId: input.definitionId },
        OR: [
          { senderProfileId: input.profileId },
          { recipientProfileId: input.profileId },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      select: {
        createdAt: true,
        id: true,
        item: { select: { serialNumber: true } },
        method: true,
        recipient: { select: { friendCode: true, nickname: true } },
        recipientProfileId: true,
        sender: { select: { friendCode: true, nickname: true } },
      },
    }),
  ]);

  return {
    ...definition,
    giftCount,
    history: history.map((gift) => ({
      createdAt: gift.createdAt.toISOString(),
      id: gift.id,
      method: gift.method,
      recipient: gift.recipient,
      recipientProfileId: gift.recipientProfileId,
      sender: gift.sender,
      serialNumber: gift.item.serialNumber,
    })),
    page: input.page,
    pageSize,
    ownedItems: ownedItems.map((item) => ({
      giftedAt: item.giftedAt?.toISOString() ?? null,
      id: item.id,
      serialNumber: item.serialNumber,
    })),
    quantity,
    transferableCount: definition.isGiftable ? transferableCount : 0,
  };
}

export async function getAdminTicketDefinitions() {
  return prisma.inventoryItemDefinition.findMany({
    where: { kind: "EVENT_TICKET" },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      description: true,
      id: true,
      isGiftable: true,
      issuedCount: true,
      title: true,
      totalSupply: true,
    },
    take: 100,
  });
}

export async function getAdminTicketHistory(
  definitionId: string,
  page: number,
  issuePage: number,
) {
  const definition = await prisma.inventoryItemDefinition.findUnique({
    where: { id: definitionId },
    select: {
      id: true,
      kind: true,
      title: true,
      issuedCount: true,
      totalSupply: true,
    },
  });
  if (!definition || definition.kind !== "EVENT_TICKET") return null;

  const pageSize = 30;
  const [giftCount, issueCount, issueBatches, gifts] = await Promise.all([
    prisma.inventoryItemGift.count({ where: { item: { definitionId } } }),
    prisma.inventoryIssueBatch.count({ where: { definitionId } }),
    prisma.inventoryIssueBatch.findMany({
      where: { definitionId },
      orderBy: { createdAt: "desc" },
      skip: (issuePage - 1) * pageSize,
      take: pageSize,
      select: {
        actor: { select: { nickname: true } },
        createdAt: true,
        id: true,
        quantity: true,
        recipient: { select: { friendCode: true, nickname: true } },
      },
    }),
    prisma.inventoryItemGift.findMany({
      where: { item: { definitionId } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        createdAt: true,
        id: true,
        item: { select: { serialNumber: true } },
        method: true,
        recipient: { select: { friendCode: true, nickname: true } },
        sender: { select: { friendCode: true, nickname: true } },
      },
    }),
  ]);

  return {
    definition,
    giftCount,
    gifts,
    issueBatches,
    issueCount,
    issuePage,
    page,
    pageSize,
  };
}
