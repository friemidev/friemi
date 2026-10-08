import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { normalizeFriemiCode } from "../friemiCode";

type TicketDatabase = Prisma.TransactionClient | typeof prisma;
type AccessContext = {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
};

async function lockTicketManagementScope(
  tx: Prisma.TransactionClient,
  definitionId: string,
  actorProfileId: string,
) {
  await lockTicketDefinition(tx, definitionId);
  await tx.$queryRaw`
    SELECT merchant."id" FROM "Merchant" merchant
    JOIN "InventoryItemDefinition" definition
      ON definition."merchantId" = merchant."id"
    WHERE definition."id" = ${definitionId}
    FOR SHARE OF merchant
  `;
  await tx.$queryRaw`
    SELECT "id" FROM "TicketAccess"
    WHERE "definitionId" = ${definitionId}
      AND "profileId" = ${actorProfileId}
    FOR SHARE
  `;
}

async function lockTicketDefinition(
  tx: Prisma.TransactionClient,
  definitionId: string,
) {
  await tx.$queryRaw`
    SELECT "id" FROM "InventoryItemDefinition"
    WHERE "id" = ${definitionId} FOR SHARE
  `;
}

export async function canManageTicketDefinitionInDatabase(
  db: TicketDatabase,
  input: AccessContext,
) {
  const definition = await db.inventoryItemDefinition.findFirst({
    where: {
      id: input.definitionId,
      kind: "EVENT_TICKET",
      ...(input.isAdmin
        ? {}
        : {
            AND: [
              { OR: [{ merchantId: null }, { merchant: { isActive: true } }] },
              {
                OR: [
                  {
                    merchant: {
                      isActive: true,
                      ownerProfileId: input.actorProfileId,
                    },
                  },
                  {
                    accesses: {
                      some: {
                        profileId: input.actorProfileId,
                        role: "MANAGER",
                        status: "ACTIVE",
                      },
                    },
                  },
                ],
              },
            ],
          }),
    },
    select: { id: true },
  });
  return Boolean(definition);
}

export async function canManageTicketDefinition(input: AccessContext) {
  return canManageTicketDefinitionInDatabase(prisma, input);
}

export async function hasTicketRedeemerAccessInDatabase(
  db: TicketDatabase,
  input: AccessContext,
) {
  if (input.isAdmin) return true;
  const definition = await db.inventoryItemDefinition.findFirst({
    where: {
      id: input.definitionId,
      kind: "EVENT_TICKET",
      AND: [
        { OR: [{ merchantId: null }, { merchant: { isActive: true } }] },
        {
          OR: [
            {
              merchant: {
                isActive: true,
                ownerProfileId: input.actorProfileId,
              },
            },
            {
              accesses: {
                some: {
                  profileId: input.actorProfileId,
                  role: { in: ["MANAGER", "REDEEMER"] },
                  status: "ACTIVE",
                },
              },
            },
          ],
        },
      ],
    },
    select: { id: true },
  });
  return Boolean(definition);
}

export type SetTicketMerchantResult = {
  status: "UPDATED" | "NOT_FOUND" | "INVALID" | "FORBIDDEN";
};

export async function setTicketMerchant(input: {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
  merchantId: string | null;
}): Promise<SetTicketMerchantResult> {
  return prisma.$transaction(
    (tx) => setTicketMerchantInTransaction(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function setTicketMerchantInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    actorProfileId: string;
    definitionId: string;
    isAdmin: boolean;
    merchantId: string | null;
  },
): Promise<SetTicketMerchantResult> {
  if (!input.isAdmin) return { status: "FORBIDDEN" };
  if (!input.actorProfileId || !input.definitionId.trim()) {
    return { status: "INVALID" };
  }
  const merchantId = input.merchantId?.trim() || null;
  if (input.merchantId !== null && !merchantId) {
    return { status: "INVALID" };
  }
  const definition = await tx.inventoryItemDefinition.findUnique({
    where: { id: input.definitionId },
    select: { kind: true, merchantId: true },
  });
  if (!definition || definition.kind !== "EVENT_TICKET") {
    return { status: "NOT_FOUND" };
  }
  if (definition.merchantId === merchantId) {
    return { status: "UPDATED" };
  }
  if (merchantId) {
    const merchant = await tx.merchant.findFirst({
      where: { id: merchantId, isActive: true },
      select: { id: true },
    });
    if (!merchant) return { status: "INVALID" };
  }
  // A binding change must not carry the former store's staff into the new
  // store. This also intentionally resets allocation-based check-in access;
  // ticket ownership and gifting are unaffected.
  // Lock the definition first. Redemption takes a share lock on this row
  // before checking authority, so a rebinding cannot slip between the check
  // and the successful check-in write.
  await tx.inventoryItemDefinition.update({
    where: { id: input.definitionId },
    data: { merchantId },
  });
  await tx.ticketAccess.updateMany({
    where: {
      definitionId: input.definitionId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByProfileId: input.actorProfileId,
    },
  });
  return { status: "UPDATED" };
}

export async function getMerchantTicketOverview(input: {
  actorProfileId: string;
  isAdmin: boolean;
  merchantId: string;
}) {
  const merchant = await prisma.merchant.findFirst({
    where: {
      id: input.merchantId,
      ...(input.isAdmin
        ? {}
        : { isActive: true, ownerProfileId: input.actorProfileId }),
    },
    select: { id: true, name: true },
  });
  if (!merchant) return null;

  const definitions = await prisma.inventoryItemDefinition.findMany({
    where: { merchantId: merchant.id, kind: "EVENT_TICKET" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      totalSupply: true,
      issuedCount: true,
    },
  });
  const ids = definitions.map((definition) => definition.id);
  if (ids.length === 0) return { merchant, tickets: [] };

  const [redemptions, staff] = await Promise.all([
    prisma.ticketRedemptionEvent.groupBy({
      by: ["definitionId"],
      where: { definitionId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.ticketAccess.groupBy({
      by: ["definitionId", "status"],
      where: {
        definitionId: { in: ids },
        role: "REDEEMER",
        status: { in: ["ACTIVE", "PENDING"] },
      },
      _count: { _all: true },
    }),
  ]);
  const redemptionCounts = new Map(
    redemptions.map((group) => [group.definitionId, group._count._all]),
  );
  const staffCounts = new Map(
    staff.map((group) => [
      `${group.definitionId}:${group.status}`,
      group._count._all,
    ]),
  );
  return {
    merchant,
    tickets: definitions.map((definition) => ({
      ...definition,
      redeemedCount: redemptionCounts.get(definition.id) ?? 0,
      activeStaffCount: staffCounts.get(`${definition.id}:ACTIVE`) ?? 0,
      pendingStaffCount: staffCounts.get(`${definition.id}:PENDING`) ?? 0,
    })),
  };
}

export async function getTicketAccessDetail(input: AccessContext) {
  if (!(await canManageTicketDefinition(input))) return null;
  const [definition, redeemedCount, staff] = await Promise.all([
    prisma.inventoryItemDefinition.findUnique({
      where: { id: input.definitionId },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        totalSupply: true,
        issuedCount: true,
        merchantId: true,
        merchant: { select: { id: true, name: true } },
      },
    }),
    prisma.ticketRedemptionEvent.count({
      where: { definitionId: input.definitionId },
    }),
    prisma.ticketAccess.findMany({
      where: { definitionId: input.definitionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        role: true,
        status: true,
        source: true,
        profile: { select: { id: true, nickname: true, friendCode: true } },
        invitedBy: { select: { nickname: true } },
        invitedAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    }),
  ]);
  if (!definition) return null;
  return {
    definition,
    redeemedCount,
    staff: staff.map((grant) => ({
      ...grant,
      invitedAt: grant.invitedAt.toISOString(),
      acceptedAt: grant.acceptedAt?.toISOString() ?? null,
      revokedAt: grant.revokedAt?.toISOString() ?? null,
      createdAt: grant.createdAt.toISOString(),
    })),
  };
}

type InviteResult =
  | { status: "INVITED"; accessId: string; recipientName: string }
  | {
      status:
        | "INVALID"
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "SELF"
        | "ALREADY_ACTIVE"
        | "ALREADY_PENDING";
    };

export async function inviteTicketRedeemer(input: {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
  recipientCode: string;
}): Promise<InviteResult> {
  const code = normalizeFriemiCode(input.recipientCode);
  if (!code || !input.definitionId.trim()) return { status: "INVALID" };
  if (!(await canManageTicketDefinition(input))) {
    return { status: "FORBIDDEN" };
  }
  const recipient = await prisma.userProfile.findFirst({
    where: { friendCode: code, status: "ACTIVE" },
    select: { id: true, nickname: true },
  });
  if (!recipient) return { status: "NOT_FOUND" };
  if (recipient.id === input.actorProfileId) return { status: "SELF" };

  try {
    return await prisma.$transaction(async (tx) => {
      // Recheck inside the mutation transaction after a possible merchant
      // binding or manager access change.
      await lockTicketManagementScope(
        tx,
        input.definitionId,
        input.actorProfileId,
      );
      if (!(await canManageTicketDefinitionInDatabase(tx, input))) {
        return { status: "FORBIDDEN" as const };
      }
      const now = new Date();
      const key = {
        definitionId_profileId_role: {
          definitionId: input.definitionId,
          profileId: recipient.id,
          role: "REDEEMER" as const,
        },
      };
      const existing = await tx.ticketAccess.findUnique({ where: key });
      if (existing?.status === "ACTIVE") {
        return { status: "ALREADY_ACTIVE" as const };
      }
      if (existing?.status === "PENDING") {
        return { status: "ALREADY_PENDING" as const };
      }
      const access = existing
        ? await tx.ticketAccess.update({
            where: { id: existing.id },
            data: {
              status: "PENDING",
              source: "INVITATION",
              invitedByProfileId: input.actorProfileId,
              invitedAt: now,
              acceptedAt: null,
              revokedAt: null,
              revokedByProfileId: null,
            },
            select: { id: true },
          })
        : await tx.ticketAccess.create({
            data: {
              definitionId: input.definitionId,
              profileId: recipient.id,
              role: "REDEEMER",
              status: "PENDING",
              source: "INVITATION",
              invitedByProfileId: input.actorProfileId,
              invitedAt: now,
            },
            select: { id: true },
          });
      await createNotifications(tx, [
        {
          type: "INVENTORY_TICKET_ACCESS_INVITED",
          actorId: input.actorProfileId,
          inventoryItemDefinitionId: input.definitionId,
          recipientId: recipient.id,
          occurrenceId: `${access.id}:${now.toISOString()}`,
        },
      ]);
      return {
        status: "INVITED" as const,
        accessId: access.id,
        recipientName: recipient.nickname,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const current = await prisma.ticketAccess.findUnique({
        where: {
          definitionId_profileId_role: {
            definitionId: input.definitionId,
            profileId: recipient.id,
            role: "REDEEMER",
          },
        },
        select: { status: true },
      });
      if (current?.status === "ACTIVE") return { status: "ALREADY_ACTIVE" };
      if (current?.status === "PENDING") return { status: "ALREADY_PENDING" };
    }
    throw error;
  }
}

export async function grantTicketManager(input: {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
  recipientCode: string;
}) {
  if (!input.isAdmin) return { status: "FORBIDDEN" as const };
  const code = normalizeFriemiCode(input.recipientCode);
  if (!code || !input.definitionId.trim()) return { status: "INVALID" as const };
  return prisma.$transaction((tx) =>
    grantTicketManagerInTransaction(tx, input, code),
  );
}

export async function grantTicketManagerInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    actorProfileId: string;
    definitionId: string;
    isAdmin: boolean;
  },
  code: string,
) {
  if (!input.isAdmin) return { status: "FORBIDDEN" as const };
  // Rebinding locks this definition before revoking its grants. Take the
  // matching share lock before reading or writing a manager grant so either
  // the grant is revoked by rebinding or it starts after rebinding completes.
  await lockTicketDefinition(tx, input.definitionId);
  const [definition, recipient] = await Promise.all([
    tx.inventoryItemDefinition.findFirst({
      where: { id: input.definitionId, kind: "EVENT_TICKET" },
      select: { id: true },
    }),
    tx.userProfile.findFirst({
      where: { friendCode: code, status: "ACTIVE" },
      select: { id: true, nickname: true },
    }),
  ]);
  if (!definition) return { status: "INVALID" as const };
  if (!recipient) return { status: "NOT_FOUND" as const };
  const existing = await tx.ticketAccess.findUnique({
    where: {
      definitionId_profileId_role: {
        definitionId: input.definitionId,
        profileId: recipient.id,
        role: "MANAGER",
      },
    },
  });
  if (existing?.status === "ACTIVE") {
    return { status: "ALREADY_ACTIVE" as const };
  }
  const now = new Date();
  const grant = await tx.ticketAccess.upsert({
    where: {
      definitionId_profileId_role: {
        definitionId: input.definitionId,
        profileId: recipient.id,
        role: "MANAGER",
      },
    },
    create: {
      definitionId: input.definitionId,
      profileId: recipient.id,
      role: "MANAGER",
      status: "ACTIVE",
      source: "ADMIN",
      invitedByProfileId: input.actorProfileId,
      invitedAt: now,
      acceptedAt: now,
    },
    update: {
      status: "ACTIVE",
      source: "ADMIN",
      invitedByProfileId: input.actorProfileId,
      invitedAt: now,
      acceptedAt: now,
      revokedAt: null,
      revokedByProfileId: null,
    },
    select: { id: true },
  });
  return {
    status: "GRANTED" as const,
    accessId: grant.id,
    recipientName: recipient.nickname,
  };
}

export async function acceptTicketAccessInvitation(input: {
  accessId: string;
  actorProfileId: string;
}) {
  return acceptTicketAccessInvitationInDatabase(prisma, input);
}

export async function acceptTicketAccessInvitationInDatabase(
  db: TicketDatabase,
  input: { accessId: string; actorProfileId: string },
) {
  const updated = await db.ticketAccess.updateMany({
    where: {
      id: input.accessId,
      profileId: input.actorProfileId,
      role: "REDEEMER",
      status: "PENDING",
      definition: {
        kind: "EVENT_TICKET",
        OR: [{ merchantId: null }, { merchant: { isActive: true } }],
      },
    },
    data: { status: "ACTIVE", acceptedAt: new Date() },
  });
  return { status: updated.count ? ("ACCEPTED" as const) : ("NOT_FOUND" as const) };
}

export async function declineTicketAccessInvitation(input: {
  accessId: string;
  actorProfileId: string;
}) {
  return declineTicketAccessInvitationInDatabase(prisma, input);
}

export async function declineTicketAccessInvitationInDatabase(
  db: TicketDatabase,
  input: { accessId: string; actorProfileId: string },
) {
  const updated = await db.ticketAccess.updateMany({
    where: {
      id: input.accessId,
      profileId: input.actorProfileId,
      role: "REDEEMER",
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByProfileId: input.actorProfileId,
    },
  });
  return { status: updated.count ? ("DECLINED" as const) : ("NOT_FOUND" as const) };
}

export async function revokeTicketAccess(input: {
  accessId: string;
  actorProfileId: string;
  isAdmin: boolean;
}) {
  return prisma.$transaction((tx) => revokeTicketAccessInTransaction(tx, input));
}

export async function revokeTicketAccessInTransaction(
  tx: Prisma.TransactionClient,
  input: { accessId: string; actorProfileId: string; isAdmin: boolean },
) {
  const access = await tx.ticketAccess.findUnique({
    where: { id: input.accessId },
    select: { definitionId: true, role: true, source: true, status: true },
  });
  if (!access) return { status: "NOT_FOUND" as const };
  if (!input.isAdmin && (access.role === "MANAGER" || access.source !== "INVITATION")) {
    return { status: "FORBIDDEN" as const };
  }
  await lockTicketManagementScope(
    tx,
    access.definitionId,
    input.actorProfileId,
  );
  if (
    !(await canManageTicketDefinitionInDatabase(tx, {
      actorProfileId: input.actorProfileId,
      definitionId: access.definitionId,
      isAdmin: input.isAdmin,
    }))
  ) {
    return { status: "FORBIDDEN" as const };
  }
  if (access.status === "REVOKED") {
    return { status: "ALREADY_REVOKED" as const };
  }
  const updated = await tx.ticketAccess.updateMany({
    where: { id: input.accessId, status: { in: ["ACTIVE", "PENDING"] } },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByProfileId: input.actorProfileId,
    },
  });
  return {
    status: updated.count ? ("REVOKED" as const) : ("ALREADY_REVOKED" as const),
  };
}

export async function hasTicketWorkbenchAccess(input: {
  actorProfileId: string;
  isAdmin: boolean;
}) {
  if (input.isAdmin) return true;
  const [merchant, access, pastEvent] = await Promise.all([
    prisma.merchant.findFirst({
      where: {
        isActive: true,
        ownerProfileId: input.actorProfileId,
        ticketDefinitions: { some: { kind: "EVENT_TICKET" } },
      },
      select: { id: true },
    }),
    prisma.ticketAccess.findFirst({
      where: {
        profileId: input.actorProfileId,
        status: { in: ["ACTIVE", "PENDING"] },
        definition: {
          kind: "EVENT_TICKET",
          OR: [{ merchantId: null }, { merchant: { isActive: true } }],
        },
      },
      select: { id: true },
    }),
    prisma.ticketRedemptionEvent.findFirst({
      where: { redeemerProfileId: input.actorProfileId },
      select: { id: true },
    }),
  ]);
  return Boolean(merchant || access || pastEvent);
}

function getWorkbenchAuthorizationWhere(input: {
  actorProfileId: string;
  isAdmin: boolean;
}): Prisma.InventoryItemDefinitionWhereInput {
  return {
    kind: "EVENT_TICKET",
    ...(input.isAdmin
      ? {}
      : {
          AND: [
            { OR: [{ merchantId: null }, { merchant: { isActive: true } }] },
            {
              OR: [
                {
                  merchant: {
                    isActive: true,
                    ownerProfileId: input.actorProfileId,
                  },
                },
                {
                  accesses: {
                    some: {
                      profileId: input.actorProfileId,
                      status: "ACTIVE",
                      role: { in: ["MANAGER", "REDEEMER"] },
                    },
                  },
                },
              ],
            },
          ],
        }),
  };
}

export async function getTicketWorkbench(input: {
  actorProfileId: string;
  isAdmin: boolean;
  page?: number;
}) {
  const where = getWorkbenchAuthorizationWhere(input);
  const pageSize = 20;
  const requestedPage =
    Number.isSafeInteger(input.page) && (input.page ?? 0) > 0
      ? input.page!
      : 1;
  const total = await prisma.inventoryItemDefinition.count({ where });
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const [definitions, pending, ownCounts] = await Promise.all([
    prisma.inventoryItemDefinition.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        merchant: { select: { name: true } },
      },
    }),
    prisma.ticketAccess.findMany({
      where: {
        profileId: input.actorProfileId,
        role: "REDEEMER",
        status: "PENDING",
        definition: {
          kind: "EVENT_TICKET",
          OR: [{ merchantId: null }, { merchant: { isActive: true } }],
        },
      },
      orderBy: [{ invitedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        definitionId: true,
        definition: {
          select: {
            title: true,
            imageUrl: true,
            merchant: { select: { name: true } },
          },
        },
        invitedBy: { select: { nickname: true } },
      },
    }),
    prisma.ticketRedemptionEvent.groupBy({
      by: ["definitionId"],
      where: { redeemerProfileId: input.actorProfileId },
      _count: { _all: true },
    }),
  ]);
  const countByDefinition = new Map(
    ownCounts.map((group) => [group.definitionId, group._count._all]),
  );
  const pastIds = ownCounts.map((group) => group.definitionId);
  const [pastDefinitions, currentlyAuthorizedPastIds] = pastIds.length
    ? await Promise.all([
        prisma.inventoryItemDefinition.findMany({
          where: { id: { in: pastIds }, kind: "EVENT_TICKET" },
          select: {
            id: true,
            title: true,
            merchant: { select: { name: true } },
          },
        }),
        prisma.inventoryItemDefinition.findMany({
          where: { AND: [where, { id: { in: pastIds } }] },
          select: { id: true },
        }),
      ])
    : [[], []];
  const currentlyAuthorized = new Set(
    currentlyAuthorizedPastIds.map((definition) => definition.id),
  );
  return {
    total,
    page,
    pageSize,
    tickets: definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      imageUrl: definition.imageUrl,
      merchantName: definition.merchant?.name ?? null,
      ownRedemptionCount: countByDefinition.get(definition.id) ?? 0,
    })),
    pastTickets: pastDefinitions
      .filter((definition) => !currentlyAuthorized.has(definition.id))
      .map((definition) => ({
        id: definition.id,
        title: definition.title,
        merchantName: definition.merchant?.name ?? null,
        ownRedemptionCount: countByDefinition.get(definition.id) ?? 0,
      })),
    invitations: pending.map((access) => ({
      id: access.id,
      definitionId: access.definitionId,
      title: access.definition.title,
      imageUrl: access.definition.imageUrl,
      merchantName: access.definition.merchant?.name ?? null,
      invitedByNickname: access.invitedBy?.nickname ?? null,
    })),
  };
}

export async function getTicketWorkbenchTicket(input: {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
}) {
  if (!(await hasTicketRedeemerAccessInDatabase(prisma, input))) return null;
  const definition = await prisma.inventoryItemDefinition.findFirst({
    where: { id: input.definitionId, kind: "EVENT_TICKET" },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      merchant: { select: { name: true } },
    },
  });
  if (!definition) return null;
  const ownRedemptionCount = await prisma.ticketRedemptionEvent.count({
    where: {
      definitionId: definition.id,
      redeemerProfileId: input.actorProfileId,
    },
  });
  return {
    id: definition.id,
    title: definition.title,
    imageUrl: definition.imageUrl,
    merchantName: definition.merchant?.name ?? null,
    ownRedemptionCount,
  };
}
