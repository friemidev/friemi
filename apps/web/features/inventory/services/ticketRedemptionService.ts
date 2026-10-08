import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ticketRedemptionTokenLifetimeMinutes = 10;

type TicketDetails = {
  itemId: string;
  definitionId: string;
  title: string;
  imageUrl: string | null;
  serialNumber: number;
  ownerNickname: string;
};

type TicketRedemptionError = {
  status: "INVALID" | "NOT_FOUND" | "EXPIRED" | "FORBIDDEN" | "MISMATCH";
};

type TicketGenerationError = {
  status: "INVALID" | "NOT_FOUND" | "FORBIDDEN";
};

type AlreadyRedeemedTicket = TicketDetails & {
  status: "ALREADY_REDEEMED";
  redeemedAt: string;
};

export type GenerateTicketRedemptionTokenResult =
  | {
      status: "READY";
      itemId: string;
      definitionId: string;
      title: string;
      serialNumber: number;
      token: string;
      expiresAt: string;
    }
  | TicketGenerationError
  | { status: "ALREADY_REDEEMED" };

export type TicketRedemptionPreviewResult =
  | (TicketDetails & { status: "READY"; expiresAt: string })
  | AlreadyRedeemedTicket
  | TicketRedemptionError;

export type RedeemTicketByTokenResult =
  | (TicketDetails & { status: "REDEEMED"; redeemedAt: string })
  | AlreadyRedeemedTicket
  | TicketRedemptionError;

type RedeemerAccessInput = {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
};

type TicketDatabase = Prisma.TransactionClient | typeof prisma;

function isValidToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

async function hasTicketRedeemerAccess(
  db: TicketDatabase,
  input: RedeemerAccessInput,
) {
  if (input.isAdmin) return true;
  const assigned = await db.inventoryIssueBatch.findFirst({
    where: {
      definitionId: input.definitionId,
      recipientProfileId: input.actorProfileId,
    },
    select: { id: true },
  });
  return Boolean(assigned);
}

export async function canRedeemTicketDefinition(input: RedeemerAccessInput) {
  const definition = await prisma.inventoryItemDefinition.findUnique({
    where: { id: input.definitionId },
    select: { kind: true },
  });
  if (definition?.kind !== "EVENT_TICKET") return false;
  return hasTicketRedeemerAccess(prisma, input);
}

export async function generateTicketTokenInTransaction(
  tx: Prisma.TransactionClient,
  input: { itemId: string; ownerProfileId: string; now: Date },
): Promise<GenerateTicketRedemptionTokenResult> {
  const item = await tx.inventoryItem.findUnique({
    where: { id: input.itemId },
    select: {
      definition: { select: { kind: true, title: true } },
      definitionId: true,
      id: true,
      ownerProfileId: true,
      redeemedAt: true,
      serialNumber: true,
    },
  });
  if (!item || item.definition.kind !== "EVENT_TICKET") {
    return { status: "NOT_FOUND" };
  }
  if (item.ownerProfileId !== input.ownerProfileId) {
    return { status: "FORBIDDEN" };
  }
  if (item.redeemedAt) return { status: "ALREADY_REDEEMED" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    input.now.getTime() + ticketRedemptionTokenLifetimeMinutes * 60_000,
  );
  const updated = await tx.inventoryItem.updateMany({
    where: {
      id: item.id,
      ownerProfileId: input.ownerProfileId,
      redeemedAt: null,
    },
    data: {
      redemptionToken: token,
      redemptionTokenExpiresAt: expiresAt,
    },
  });
  if (updated.count === 0) return { status: "NOT_FOUND" };

  return {
    status: "READY",
    itemId: item.id,
    definitionId: item.definitionId,
    title: item.definition.title,
    serialNumber: item.serialNumber,
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function generateTicketRedemptionToken(input: {
  itemId: string;
  ownerProfileId: string;
}): Promise<GenerateTicketRedemptionTokenResult> {
  if (!input.itemId.trim()) return { status: "INVALID" };
  return prisma.$transaction((tx) =>
    generateTicketTokenInTransaction(tx, { ...input, now: new Date() }),
  );
}

const ticketForRedemptionSelect = {
  definition: { select: { imageUrl: true, kind: true, title: true } },
  definitionId: true,
  id: true,
  owner: { select: { nickname: true } },
  ownerProfileId: true,
  redeemedAt: true,
  redemptionTokenExpiresAt: true,
  serialNumber: true,
} as const;

function ticketDetails(item: {
  id: string;
  definitionId: string;
  definition: { imageUrl: string | null; title: string };
  owner: { nickname: string };
  serialNumber: number;
}): TicketDetails {
  return {
    itemId: item.id,
    definitionId: item.definitionId,
    title: item.definition.title,
    imageUrl: item.definition.imageUrl,
    serialNumber: item.serialNumber,
    ownerNickname: item.owner.nickname,
  };
}

export async function previewTicketRedemption(input: {
  actorProfileId: string;
  expectedDefinitionId?: string;
  isAdmin: boolean;
  token: string;
}): Promise<TicketRedemptionPreviewResult> {
  const token = input.token.trim();
  if (!isValidToken(token)) return { status: "INVALID" };

  return previewTicketRedemptionInDatabase(prisma, {
    ...input,
    now: new Date(),
    token,
  });
}

export async function previewTicketRedemptionInDatabase(
  db: TicketDatabase,
  input: {
    actorProfileId: string;
    expectedDefinitionId?: string;
    isAdmin: boolean;
    now: Date;
    token: string;
  },
): Promise<TicketRedemptionPreviewResult> {
  if (
    input.expectedDefinitionId &&
    !(await hasTicketRedeemerAccess(db, {
      actorProfileId: input.actorProfileId,
      definitionId: input.expectedDefinitionId,
      isAdmin: input.isAdmin,
    }))
  ) {
    return { status: "FORBIDDEN" };
  }

  const item = await db.inventoryItem.findUnique({
    where: { redemptionToken: input.token },
    select: ticketForRedemptionSelect,
  });
  if (!item || item.definition.kind !== "EVENT_TICKET") {
    return { status: "NOT_FOUND" };
  }
  if (
    input.expectedDefinitionId &&
    item.definitionId !== input.expectedDefinitionId
  ) {
    return { status: "MISMATCH" };
  }
  if (
    !input.expectedDefinitionId &&
    !(await hasTicketRedeemerAccess(db, {
      actorProfileId: input.actorProfileId,
      definitionId: item.definitionId,
      isAdmin: input.isAdmin,
    }))
  ) {
    return { status: "FORBIDDEN" };
  }

  const details = ticketDetails(item);
  if (item.redeemedAt) {
    return {
      ...details,
      status: "ALREADY_REDEEMED",
      redeemedAt: item.redeemedAt.toISOString(),
    };
  }
  if (
    !item.redemptionTokenExpiresAt ||
    item.redemptionTokenExpiresAt <= input.now
  ) {
    return { status: "EXPIRED" };
  }

  return {
    ...details,
    status: "READY",
    expiresAt: item.redemptionTokenExpiresAt.toISOString(),
  };
}

export async function redeemTicketInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    actorProfileId: string;
    expectedDefinitionId?: string;
    isAdmin: boolean;
    now: Date;
    token: string;
  },
): Promise<RedeemTicketByTokenResult> {
  if (
    input.expectedDefinitionId &&
    !(await hasTicketRedeemerAccess(tx, {
      actorProfileId: input.actorProfileId,
      definitionId: input.expectedDefinitionId,
      isAdmin: input.isAdmin,
    }))
  ) {
    return { status: "FORBIDDEN" };
  }

  const item = await tx.inventoryItem.findUnique({
    where: { redemptionToken: input.token },
    select: ticketForRedemptionSelect,
  });
  if (!item || item.definition.kind !== "EVENT_TICKET") {
    return { status: "NOT_FOUND" };
  }
  if (
    input.expectedDefinitionId &&
    item.definitionId !== input.expectedDefinitionId
  ) {
    return { status: "MISMATCH" };
  }
  if (
    !input.expectedDefinitionId &&
    !(await hasTicketRedeemerAccess(tx, {
      actorProfileId: input.actorProfileId,
      definitionId: item.definitionId,
      isAdmin: input.isAdmin,
    }))
  ) {
    return { status: "FORBIDDEN" };
  }

  const details = ticketDetails(item);
  if (item.redeemedAt) {
    return {
      ...details,
      status: "ALREADY_REDEEMED",
      redeemedAt: item.redeemedAt.toISOString(),
    };
  }
  if (
    !item.redemptionTokenExpiresAt ||
    item.redemptionTokenExpiresAt <= input.now
  ) {
    return { status: "EXPIRED" };
  }

  const updated = await tx.inventoryItem.updateMany({
    where: {
      id: item.id,
      ownerProfileId: item.ownerProfileId,
      redeemedAt: null,
      redemptionToken: input.token,
      redemptionTokenExpiresAt: { gt: input.now },
    },
    data: {
      redeemedAt: input.now,
      redeemedByProfileId: input.actorProfileId,
    },
  });
  if (updated.count === 0) {
    const current = await tx.inventoryItem.findUnique({
      where: { id: item.id },
      select: { redeemedAt: true, redemptionToken: true },
    });
    if (current?.redeemedAt) {
      return {
        ...details,
        status: "ALREADY_REDEEMED",
        redeemedAt: current.redeemedAt.toISOString(),
      };
    }
    return {
      status: current?.redemptionToken === input.token ? "EXPIRED" : "NOT_FOUND",
    };
  }

  return {
    ...details,
    status: "REDEEMED",
    redeemedAt: input.now.toISOString(),
  };
}

export async function redeemTicketByToken(input: {
  actorProfileId: string;
  expectedDefinitionId?: string;
  isAdmin: boolean;
  token: string;
}): Promise<RedeemTicketByTokenResult> {
  const token = input.token.trim();
  if (!isValidToken(token)) return { status: "INVALID" };
  return prisma.$transaction(
    (tx) => redeemTicketInTransaction(tx, { ...input, token, now: new Date() }),
    { timeout: 10_000 },
  );
}
