import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  generateTicketTokenInTransaction,
  previewTicketRedemptionInDatabase,
  redeemTicketInTransaction,
  ticketRedemptionTokenLifetimeMinutes,
} from "./ticketRedemptionService";

const token = "A".repeat(43);
const now = new Date("2026-10-07T12:00:00.000Z");

function redemptionFixture(input: {
  assigned?: boolean;
  expiresAt?: Date | null;
  redeemedAt?: Date | null;
  updated?: number;
} = {}) {
  const calls: string[] = [];
  const item = {
    id: "ticket-1",
    definitionId: "definition-1",
    definition: {
      kind: "EVENT_TICKET",
      imageUrl: "https://example.com/ticket.webp",
      title: "Wine evening",
    },
    owner: { nickname: "Guest" },
    ownerProfileId: "holder-1",
    redeemedAt: input.redeemedAt ?? null,
    redemptionTokenExpiresAt:
      input.expiresAt === undefined
        ? new Date(now.getTime() + 60_000)
        : input.expiresAt,
    serialNumber: 42,
  };
  const currentToken = token;
  const tx = {
    inventoryItem: {
      findUnique: async ({ where }: { where: { id?: string; redemptionToken?: string } }) => {
        calls.push(where.id ? "read-current" : "read-token");
        if (where.id) {
          return { redeemedAt: item.redeemedAt, redemptionToken: currentToken };
        }
        return currentToken === where.redemptionToken ? item : null;
      },
      updateMany: async ({ where, data }: {
        where: Record<string, unknown>;
        data: { redeemedAt: Date; redeemedByProfileId: string };
      }) => {
        calls.push("atomic-redeem");
        assert.deepEqual(where, {
          id: "ticket-1",
          ownerProfileId: "holder-1",
          redeemedAt: null,
          redemptionToken: token,
          redemptionTokenExpiresAt: { gt: now },
        });
        assert.equal(data.redeemedByProfileId, "organizer-1");
        if (input.updated === 0) return { count: 0 };
        item.redeemedAt = data.redeemedAt;
        return { count: 1 };
      },
    },
    inventoryIssueBatch: {
      findFirst: async ({ where }: {
        where: { definitionId: string; recipientProfileId: string };
      }) => {
        calls.push("check-assignment");
        assert.deepEqual(where, {
          definitionId: "definition-1",
          recipientProfileId: "organizer-1",
        });
        return input.assigned ? { id: "batch-1" } : null;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { calls, tx };
}

test("assigned organizer redeems once with an owner and token guarded update", async () => {
  const { calls, tx } = redemptionFixture({ assigned: true });
  const first = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.equal(first.status, "REDEEMED");
  if (first.status === "REDEEMED") {
    assert.equal(first.serialNumber, 42);
    assert.equal(first.ownerNickname, "Guest");
    assert.equal(first.redeemedAt, now.toISOString());
  }
  assert.deepEqual(calls, ["read-token", "check-assignment", "atomic-redeem"]);

  const second = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.equal(second.status, "ALREADY_REDEEMED");
  assert.equal(calls.filter((call) => call === "atomic-redeem").length, 1);
});

test("unassigned accounts cannot inspect or redeem the ticket", async () => {
  const { calls, tx } = redemptionFixture();
  const result = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.deepEqual(result, { status: "FORBIDDEN" });
  assert.deepEqual(calls, ["read-token", "check-assignment"]);
});

test("a ticket from another event is rejected in preview and before the redeem write", async () => {
  const calls: string[] = [];
  const tx = {
    inventoryIssueBatch: {
      findFirst: async ({ where }: {
        where: { definitionId: string; recipientProfileId: string };
      }) => {
        calls.push("check-current-event");
        assert.equal(where.definitionId, "definition-2");
        assert.equal(where.recipientProfileId, "organizer-1");
        return { id: "batch-2" };
      },
    },
    inventoryItem: {
      findUnique: async () => {
        calls.push("read-ticket");
        return {
          id: "ticket-1",
          definitionId: "definition-1",
          definition: { kind: "EVENT_TICKET", imageUrl: null, title: "Other event" },
          owner: { nickname: "Guest" },
          ownerProfileId: "holder-1",
          redeemedAt: null,
          redemptionTokenExpiresAt: new Date(now.getTime() + 60_000),
          serialNumber: 42,
        };
      },
      updateMany: async () => {
        throw new Error("A mismatched event must not be redeemed");
      },
    },
  } as unknown as Prisma.TransactionClient;
  const input = {
    actorProfileId: "organizer-1",
    expectedDefinitionId: "definition-2",
    isAdmin: false,
    now,
    token,
  };

  assert.deepEqual(await previewTicketRedemptionInDatabase(tx, input), {
    status: "MISMATCH",
  });
  assert.deepEqual(await redeemTicketInTransaction(tx, input), {
    status: "MISMATCH",
  });
  assert.deepEqual(calls, [
    "check-current-event",
    "read-ticket",
    "check-current-event",
    "read-ticket",
  ]);
});

test("site administrators can redeem without an allocation batch", async () => {
  const { calls, tx } = redemptionFixture();
  const result = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: true,
    now,
    token,
  });
  assert.equal(result.status, "REDEEMED");
  assert.deepEqual(calls, ["read-token", "atomic-redeem"]);
});

test("expired tokens do not perform a redeem write", async () => {
  const { calls, tx } = redemptionFixture({ assigned: true, expiresAt: now });
  const result = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.deepEqual(result, { status: "EXPIRED" });
  assert.deepEqual(calls, ["read-token", "check-assignment"]);
});

test("a token removed by a concurrent gift cannot redeem the new holder's ticket", async () => {
  const fixture = redemptionFixture({ assigned: true, updated: 0 });
  // The read began before the gift committed; the guarded write loses the race.
  const tx = {
    ...fixture.tx,
    inventoryItem: {
      findUnique: async ({ where }: { where: { id?: string } }) =>
        where.id
          ? { redeemedAt: null, redemptionToken: null }
          : {
              id: "ticket-1",
              definitionId: "definition-1",
              definition: { kind: "EVENT_TICKET", imageUrl: null, title: "Wine evening" },
              owner: { nickname: "Guest" },
              ownerProfileId: "holder-1",
              redeemedAt: null,
              redemptionTokenExpiresAt: new Date(now.getTime() + 60_000),
              serialNumber: 42,
            },
      updateMany: async () => ({ count: 0 }),
    },
  } as unknown as Prisma.TransactionClient;
  const result = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.deepEqual(result, { status: "NOT_FOUND" });
});

test("holder generates a ten-minute token only for their unredeemed ticket", async () => {
  const calls: string[] = [];
  const tx = {
    inventoryItem: {
      findUnique: async () => ({
        id: "ticket-1",
        definitionId: "definition-1",
        definition: { kind: "EVENT_TICKET", title: "Wine evening" },
        ownerProfileId: "holder-1",
        redeemedAt: null,
        serialNumber: 42,
      }),
      updateMany: async ({ where, data }: {
        where: Record<string, unknown>;
        data: { redemptionToken: string; redemptionTokenExpiresAt: Date };
      }) => {
        calls.push("write-token");
        assert.deepEqual(where, {
          id: "ticket-1",
          ownerProfileId: "holder-1",
          redeemedAt: null,
        });
        assert.match(data.redemptionToken, /^[A-Za-z0-9_-]{43}$/);
        assert.equal(
          data.redemptionTokenExpiresAt.getTime(),
          now.getTime() + ticketRedemptionTokenLifetimeMinutes * 60_000,
        );
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  const result = await generateTicketTokenInTransaction(tx, {
    itemId: "ticket-1",
    ownerProfileId: "holder-1",
    now,
  });
  assert.equal(result.status, "READY");
  assert.deepEqual(calls, ["write-token"]);
});
