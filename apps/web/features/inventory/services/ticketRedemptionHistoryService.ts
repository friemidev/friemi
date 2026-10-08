import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canManageTicketDefinition,
  hasTicketRedeemerAccessInDatabase,
} from "./ticketAccessService";

export async function getTicketRedemptionHistory(input: {
  actorProfileId: string;
  definitionId: string;
  isAdmin: boolean;
  page: number;
  scope?: "all" | "mine";
}) {
  const scope = input.scope ?? "all";
  if (scope === "all") {
    if (!(await canManageTicketDefinition(input))) return null;
  } else {
    const [currentAccess, ownHistoricalEvent] = await Promise.all([
      hasTicketRedeemerAccessInDatabase(prisma, input),
      prisma.ticketRedemptionEvent.findFirst({
        where: {
          definitionId: input.definitionId,
          redeemerProfileId: input.actorProfileId,
        },
        select: { id: true },
      }),
    ]);
    if (!currentAccess && !ownHistoricalEvent) return null;
  }
  const where: Prisma.TicketRedemptionEventWhereInput = {
    definitionId: input.definitionId,
    ...(scope === "mine" ? { redeemerProfileId: input.actorProfileId } : {}),
  };
  const pageSize = 30;
  const total = await prisma.ticketRedemptionEvent.count({ where });
  const page = Math.min(
    Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1,
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const records = await prisma.ticketRedemptionEvent.findMany({
    where,
    orderBy: [{ redeemedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      itemId: true,
      definitionId: true,
      redeemedAt: true,
      method: true,
      holder: { select: { id: true, nickname: true, friendCode: true } },
      redeemer: { select: { id: true, nickname: true, friendCode: true } },
    },
  });
  return {
    records: records.map((record) => ({
      ...record,
      redeemedAt: record.redeemedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
