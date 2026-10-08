import { randomBytes, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeFriemiCode } from "../friemiCode";
import { allowTicketManualCodeLookup } from "./ticketRedemptionRateLimit";

export const ticketRedemptionTokenLifetimeMinutes = 10;

type TicketDetails = {
  itemId: string;
  definitionId: string;
  title: string;
  imageUrl: string | null;
  ownerNickname: string;
};

type TicketRedemptionError = {
  status:
    | "INVALID"
    | "NOT_FOUND"
    | "EXPIRED"
    | "FORBIDDEN"
    | "MISMATCH"
    | "RATE_LIMITED";
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
      token: string;
      code: string;
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
let lastExpiredCodeCleanupAt = 0;

function getTicketCredential(value: string) {
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) {
    return { kind: "token" as const, value };
  }
  // Ten-digit codes issued before the six-digit switch remain usable only
  // until their original ten-minute expiry.
  if (/^(?:\d{6}|\d{10})$/.test(value)) {
    return { kind: "code" as const, value };
  }
  return null;
}

function getCredentialLookupWhere(
  credential: NonNullable<ReturnType<typeof getTicketCredential>>,
) {
  return credential.kind === "code"
    ? { redemptionCode: credential.value }
    : { redemptionToken: credential.value };
}

function getManualCodeContext(input: {
  expectedDefinitionId?: string;
  holderFriendCode?: string;
}) {
  if (
    typeof input.expectedDefinitionId !== "string" ||
    !input.expectedDefinitionId ||
    typeof input.holderFriendCode !== "string"
  ) {
    return null;
  }
  const holderFriendCode = normalizeFriemiCode(input.holderFriendCode);
  return holderFriendCode
    ? { definitionId: input.expectedDefinitionId, holderFriendCode }
    : null;
}

async function findTicketByCredential(
  db: TicketDatabase,
  credential: NonNullable<ReturnType<typeof getTicketCredential>>,
  manualContext: NonNullable<ReturnType<typeof getManualCodeContext>> | null,
) {
  if (credential.kind === "code") {
    if (!manualContext) return null;
    return db.inventoryItem.findFirst({
      where: {
        redemptionCode: credential.value,
        definitionId: manualContext.definitionId,
        owner: { friendCode: manualContext.holderFriendCode },
      },
      select: ticketForRedemptionSelect,
    });
  }
  return db.inventoryItem.findUnique({
    where: getCredentialLookupWhere(credential),
    select: ticketForRedemptionSelect,
  });
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
      updatedAt: true,
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
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(
    input.now.getTime() + ticketRedemptionTokenLifetimeMinutes * 60_000,
  );
  const updated = await tx.inventoryItem.updateMany({
    where: {
      id: item.id,
      ownerProfileId: input.ownerProfileId,
      redeemedAt: null,
      updatedAt: item.updatedAt,
    },
    data: {
      redemptionToken: token,
      redemptionCode: code,
      redemptionTokenExpiresAt: expiresAt,
      updatedAt: item.updatedAt,
    },
  });
  if (updated.count === 0) return { status: "NOT_FOUND" };

  return {
    status: "READY",
    itemId: item.id,
    definitionId: item.definitionId,
    title: item.definition.title,
    token,
    code,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function generateTicketRedemptionToken(input: {
  itemId: string;
  ownerProfileId: string;
}): Promise<GenerateTicketRedemptionTokenResult> {
  if (!input.itemId.trim()) return { status: "INVALID" };
  const eligibleItem = await prisma.inventoryItem.findUnique({
    where: { id: input.itemId },
    select: {
      definition: { select: { kind: true } },
      ownerProfileId: true,
      redeemedAt: true,
    },
  });
  if (!eligibleItem || eligibleItem.definition.kind !== "EVENT_TICKET") {
    return { status: "NOT_FOUND" };
  }
  if (eligibleItem.ownerProfileId !== input.ownerProfileId) {
    return { status: "FORBIDDEN" };
  }
  if (eligibleItem.redeemedAt) return { status: "ALREADY_REDEEMED" };

  // Old codes remain reserved through their original validity window, even if
  // the ticket was checked in. Release them afterwards so six digits suffice
  // over the lifetime of many events. Run at most once per process per minute.
  const cleanupNow = Date.now();
  if (cleanupNow - lastExpiredCodeCleanupAt >= 60_000) {
    lastExpiredCodeCleanupAt = cleanupNow;
    try {
      await prisma.$executeRaw`
        UPDATE "InventoryItem"
        SET "redemptionCode" = NULL
        WHERE "redemptionCode" IS NOT NULL
          AND "redemptionTokenExpiresAt" <= ${new Date(cleanupNow)}
      `;
    } catch (error) {
      lastExpiredCodeCleanupAt = 0;
      throw error;
    }
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) =>
        generateTicketTokenInTransaction(tx, { ...input, now: new Date() }),
      );
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
    }
  }
  throw new Error("Could not allocate a unique ticket check-in code");
}

const ticketForRedemptionSelect = {
  definition: { select: { imageUrl: true, kind: true, title: true } },
  definitionId: true,
  id: true,
  owner: { select: { nickname: true } },
  ownerProfileId: true,
  redeemedAt: true,
  redemptionTokenExpiresAt: true,
} as const;

function ticketDetails(item: {
  id: string;
  definitionId: string;
  definition: { imageUrl: string | null; title: string };
  owner: { nickname: string };
}): TicketDetails {
  return {
    itemId: item.id,
    definitionId: item.definitionId,
    title: item.definition.title,
    imageUrl: item.definition.imageUrl,
    ownerNickname: item.owner.nickname,
  };
}

export async function previewTicketRedemption(input: {
  actorProfileId: string;
  expectedDefinitionId?: string;
  holderFriendCode?: string;
  isAdmin: boolean;
  token: string;
}): Promise<TicketRedemptionPreviewResult> {
  const token = input.token.trim();
  const credential = getTicketCredential(token);
  if (!credential) return { status: "INVALID" };
  const manualContext =
    credential.kind === "code" ? getManualCodeContext(input) : null;
  if (credential.kind === "code" && !manualContext)
    return { status: "INVALID" };
  if (
    credential.kind === "code" &&
    !(await allowTicketManualCodeLookup(
      input.actorProfileId,
      manualContext!.definitionId,
      manualContext!.holderFriendCode,
    ))
  ) {
    return { status: "RATE_LIMITED" };
  }

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
    holderFriendCode?: string;
    isAdmin: boolean;
    now: Date;
    token: string;
  },
): Promise<TicketRedemptionPreviewResult> {
  const credential = getTicketCredential(input.token);
  if (!credential) return { status: "INVALID" };
  const manualContext =
    credential.kind === "code" ? getManualCodeContext(input) : null;
  if (credential.kind === "code" && !manualContext)
    return { status: "INVALID" };
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

  const item = await findTicketByCredential(db, credential, manualContext);
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
    holderFriendCode?: string;
    isAdmin: boolean;
    now: Date;
    token: string;
  },
): Promise<RedeemTicketByTokenResult> {
  const credential = getTicketCredential(input.token);
  if (!credential) return { status: "INVALID" };
  const manualContext =
    credential.kind === "code" ? getManualCodeContext(input) : null;
  if (credential.kind === "code" && !manualContext)
    return { status: "INVALID" };
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

  const item = await findTicketByCredential(tx, credential, manualContext);
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
      definitionId: item.definitionId,
      ownerProfileId: item.ownerProfileId,
      redeemedAt: null,
      ...getCredentialLookupWhere(credential),
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
      select: { redeemedAt: true, redemptionToken: true, redemptionCode: true },
    });
    if (current?.redeemedAt) {
      return {
        ...details,
        status: "ALREADY_REDEEMED",
        redeemedAt: current.redeemedAt.toISOString(),
      };
    }
    return {
      status:
        (credential.kind === "code"
          ? current?.redemptionCode
          : current?.redemptionToken) === input.token
          ? "EXPIRED"
          : "NOT_FOUND",
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
  holderFriendCode?: string;
  isAdmin: boolean;
  token: string;
}): Promise<RedeemTicketByTokenResult> {
  const token = input.token.trim();
  const credential = getTicketCredential(token);
  if (!credential) return { status: "INVALID" };
  const manualContext =
    credential.kind === "code" ? getManualCodeContext(input) : null;
  if (credential.kind === "code" && !manualContext)
    return { status: "INVALID" };
  if (
    credential.kind === "code" &&
    !(await allowTicketManualCodeLookup(
      input.actorProfileId,
      manualContext!.definitionId,
      manualContext!.holderFriendCode,
    ))
  ) {
    return { status: "RATE_LIMITED" };
  }
  return prisma.$transaction(
    (tx) => redeemTicketInTransaction(tx, { ...input, token, now: new Date() }),
    { timeout: 10_000 },
  );
}
