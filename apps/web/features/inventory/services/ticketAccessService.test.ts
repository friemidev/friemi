import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  acceptTicketAccessInvitationInDatabase,
  canManageTicketDefinitionInDatabase,
  grantTicketManagerInTransaction,
  hasTicketRedeemerAccessInDatabase,
  revokeTicketAccessInTransaction,
  setTicketMerchantInTransaction,
} from "./ticketAccessService";
import { ensureAllocationRedeemerGrantInTransaction } from "./inventoryService";

test("a merchant owner can manage only tickets bound to their active store", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const db = {
    inventoryItemDefinition: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push(where);
        const serialized = JSON.stringify(where);
        return serialized.includes('"ownerProfileId":"owner-a"')
          ? { id: "ticket-a" }
          : null;
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    await canManageTicketDefinitionInDatabase(db, {
      definitionId: "ticket-a",
      actorProfileId: "owner-a",
      isAdmin: false,
    }),
    true,
  );
  assert.equal(
    await canManageTicketDefinitionInDatabase(db, {
      definitionId: "ticket-a",
      actorProfileId: "owner-b",
      isAdmin: false,
    }),
    false,
  );
  assert.match(JSON.stringify(calls[0]), /"isActive":true/);
  assert.match(JSON.stringify(calls[0]), /"role":"MANAGER"/);
});

test("redeemer policy requires an active ticket grant or current store ownership", async () => {
  const queries: Array<Record<string, unknown>> = [];
  const db = {
    inventoryItemDefinition: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        queries.push(where);
        return null;
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    await hasTicketRedeemerAccessInDatabase(db, {
      actorProfileId: "gifted-holder",
      definitionId: "ticket-a",
      isAdmin: false,
    }),
    false,
  );
  const query = JSON.stringify(queries[0]);
  assert.match(query, /"profileId":"gifted-holder"/);
  assert.match(query, /"status":"ACTIVE"/);
  assert.match(query, /"REDEEMER"/);
  assert.doesNotMatch(query, /inventoryIssueBatch/);
});

test("only the invited account can accept a pending ticket role", async () => {
  const grant = { id: "grant-1", profileId: "staff-1", status: "PENDING" };
  const db = {
    ticketAccess: {
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        if (
          where.id !== grant.id ||
          where.profileId !== grant.profileId ||
          where.status !== grant.status
        ) {
          return { count: 0 };
        }
        assert.equal(where.role, "REDEEMER");
        grant.status = "ACTIVE";
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await acceptTicketAccessInvitationInDatabase(db, {
      accessId: grant.id,
      actorProfileId: "stranger",
    }),
    { status: "NOT_FOUND" },
  );
  assert.equal(grant.status, "PENDING");
  assert.deepEqual(
    await acceptTicketAccessInvitationInDatabase(db, {
      accessId: grant.id,
      actorProfileId: "staff-1",
    }),
    { status: "ACCEPTED" },
  );
});

test("merchant rebinding revokes grants but leaves redemption history intact", async () => {
  const state = { merchantId: "store-a", revocations: 0, history: 1 };
  const tx = {
    inventoryItemDefinition: {
      findUnique: async () => ({ kind: "EVENT_TICKET", merchantId: state.merchantId }),
      update: async ({ data }: { data: { merchantId: string | null } }) => {
        state.merchantId = data.merchantId ?? "";
      },
    },
    merchant: { findFirst: async () => ({ id: "store-b" }) },
    ticketAccess: {
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.definitionId, "ticket-1");
        state.revocations += 1;
        return { count: 2 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  const input = {
    actorProfileId: "admin",
    definitionId: "ticket-1",
    isAdmin: true,
    merchantId: "store-b",
  };
  assert.deepEqual(await setTicketMerchantInTransaction(tx, input), {
    status: "UPDATED",
  });
  assert.equal(state.merchantId, "store-b");
  assert.equal(state.revocations, 1);
  assert.equal(state.history, 1);
  assert.deepEqual(await setTicketMerchantInTransaction(tx, input), {
    status: "UPDATED",
  });
  assert.equal(state.revocations, 1);
  assert.deepEqual(
    await setTicketMerchantInTransaction(tx, { ...input, isAdmin: false }),
    { status: "FORBIDDEN" },
  );
});

test("manager grant holds the definition lock before reading or writing access", async () => {
  const calls: string[] = [];
  let releaseLock!: () => void;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  const tx = {
    $queryRaw: async (parts: TemplateStringsArray, definitionId: string) => {
      assert.match(parts.join("?"), /InventoryItemDefinition.*FOR SHARE/s);
      assert.equal(definitionId, "ticket-1");
      calls.push("lock-definition");
      await lock;
    },
    inventoryItemDefinition: {
      findFirst: async () => {
        calls.push("read-definition");
        return { id: "ticket-1" };
      },
    },
    userProfile: {
      findFirst: async () => {
        calls.push("read-recipient");
        return { id: "manager-1", nickname: "Manager" };
      },
    },
    ticketAccess: {
      findUnique: async () => {
        calls.push("read-access");
        return null;
      },
      upsert: async ({ create }: { create: { status: string } }) => {
        assert.equal(create.status, "ACTIVE");
        calls.push("grant-access");
        return { id: "grant-1" };
      },
    },
  } as unknown as Prisma.TransactionClient;

  const result = grantTicketManagerInTransaction(
    tx,
    { actorProfileId: "admin-1", definitionId: "ticket-1", isAdmin: true },
    "123456",
  );
  assert.deepEqual(calls, ["lock-definition"]);
  releaseLock();
  assert.deepEqual(await result, {
    status: "GRANTED",
    accessId: "grant-1",
    recipientName: "Manager",
  });
  assert.equal(calls[0], "lock-definition");
  assert.ok(calls.indexOf("read-access") > 0);
  assert.ok(calls.indexOf("grant-access") > calls.indexOf("read-access"));
});

test("merchant staff cannot revoke allocation or manager grants", async () => {
  let wrote = false;
  const tx = {
    ticketAccess: {
      findUnique: async () => ({
        definitionId: "ticket-1",
        role: "REDEEMER",
        source: "ALLOCATION",
        status: "ACTIVE",
      }),
      updateMany: async () => {
        wrote = true;
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await revokeTicketAccessInTransaction(tx, {
      accessId: "allocation-grant",
      actorProfileId: "store-owner",
      isAdmin: false,
    }),
    { status: "FORBIDDEN" },
  );
  assert.equal(wrote, false);
});

test("new allocations activate pending grants and never resurrect revoked grants", async () => {
  for (const originalStatus of ["PENDING", "REVOKED"] as const) {
    let status: string = originalStatus;
    const tx = {
      ticketAccess: {
        updateMany: async ({ where }: { where: { status: string } }) => {
          assert.equal(where.status, "PENDING");
          if (status !== "PENDING") return { count: 0 };
          status = "ACTIVE";
          return { count: 1 };
        },
        createMany: async ({ skipDuplicates }: { skipDuplicates: boolean }) => {
          assert.equal(skipDuplicates, true);
          return { count: 0 };
        },
      },
    } as unknown as Prisma.TransactionClient;
    await ensureAllocationRedeemerGrantInTransaction(tx, {
      actorProfileId: "admin",
      definitionId: "ticket-1",
      recipientProfileId: "distributor",
    });
    assert.equal(status, originalStatus === "PENDING" ? "ACTIVE" : "REVOKED");
  }
});
