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
const code = "123456";
const mixedCode = "A7B9C2";
const legacyCode = "1234567890";
const now = new Date("2026-10-07T12:00:00.000Z");

function redemptionFixture(
  input: {
    assigned?: boolean;
    expiresAt?: Date | null;
    redeemedAt?: Date | null;
    updated?: number;
    credential?: string;
  } = {},
) {
  const calls: string[] = [];
  const history: Array<{ itemId: string; method: string }> = [];
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
  const currentCode =
    input.credential && input.credential !== token ? input.credential : code;
  const credential = input.credential ?? token;
  const credentialWhere =
    credential !== token
      ? { redemptionCode: credential }
      : { redemptionToken: token };
  const tx = {
    $queryRaw: async () => [],
    inventoryItem: {
      findUnique: async ({
        where,
      }: {
        where: {
          id?: string;
          redemptionToken?: string;
          redemptionCode?: string;
        };
      }) => {
        calls.push(
          where.id
            ? "read-current"
            : where.redemptionCode
              ? "read-code"
              : "read-token",
        );
        if (where.id) {
          return {
            redeemedAt: item.redeemedAt,
            redemptionToken: currentToken,
            redemptionCode: currentCode,
          };
        }
        return (
          where.redemptionCode
            ? currentCode === where.redemptionCode
            : currentToken === where.redemptionToken
        )
          ? item
          : null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: { redeemedAt: Date; redeemedByProfileId: string };
      }) => {
        calls.push("atomic-redeem");
        assert.deepEqual(where, {
          id: "ticket-1",
          definitionId: "definition-1",
          ownerProfileId: "holder-1",
          redeemedAt: null,
          ...credentialWhere,
          redemptionTokenExpiresAt: { gt: now },
        });
        assert.equal(data.redeemedByProfileId, "organizer-1");
        if (input.updated === 0) return { count: 0 };
        item.redeemedAt = data.redeemedAt;
        return { count: 1 };
      },
    },
    inventoryItemDefinition: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; AND: Array<Record<string, unknown>> };
      }) => {
        calls.push("check-assignment");
        assert.equal(where.id, "definition-1");
        assert.match(JSON.stringify(where.AND), /"status":"ACTIVE"/);
        assert.match(JSON.stringify(where.AND), /"profileId":"organizer-1"/);
        return input.assigned ? { id: "definition-1" } : null;
      },
    },
    ticketRedemptionEvent: {
      create: async ({
        data,
      }: {
        data: { itemId: string; method: string };
      }) => {
        calls.push("write-history");
        history.push({ itemId: data.itemId, method: data.method });
        return { id: "history-1" };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { calls, history, tx };
}

test("assigned organizer redeems once with an owner and token guarded update", async () => {
  const { calls, history, tx } = redemptionFixture({ assigned: true });
  const first = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.equal(first.status, "REDEEMED");
  if (first.status === "REDEEMED") {
    assert.equal(first.title, "Wine evening");
    assert.equal(first.ownerNickname, "Guest");
    assert.equal(first.redeemedAt, now.toISOString());
  }
  assert.deepEqual(calls, [
    "read-token",
    "check-assignment",
    "atomic-redeem",
    "write-history",
  ]);

  const second = await redeemTicketInTransaction(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token,
  });
  assert.equal(second.status, "ALREADY_REDEEMED");
  assert.equal(calls.filter((call) => call === "atomic-redeem").length, 1);
  assert.deepEqual(history, [{ itemId: "ticket-1", method: "QR" }]);
});

test("a mixed six-character code previews and redeems without holder or event input", async () => {
  const { calls, history, tx } = redemptionFixture({
    assigned: true,
    credential: mixedCode,
  });
  const input = {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token: mixedCode.toLowerCase(),
  };
  const preview = await previewTicketRedemptionInDatabase(tx, input);
  assert.equal(preview.status, "READY");
  const result = await redeemTicketInTransaction(tx, input);
  assert.equal(result.status, "REDEEMED");
  assert.deepEqual(calls, [
    "read-code",
    "check-assignment",
    "read-code",
    "check-assignment",
    "atomic-redeem",
    "write-history",
  ]);
  assert.deepEqual(history, [{ itemId: "ticket-1", method: "MANUAL" }]);
});

test("a scoped manual code still checks the selected event before lookup", async () => {
  const { calls, tx } = redemptionFixture({ assigned: true, credential: code });
  const input = {
    actorProfileId: "organizer-1",
    expectedDefinitionId: "definition-1",
    isAdmin: false,
    now,
    token: code,
  };
  assert.equal(
    (await previewTicketRedemptionInDatabase(tx, input)).status,
    "READY",
  );
  assert.equal((await redeemTicketInTransaction(tx, input)).status, "REDEEMED");
  assert.deepEqual(calls, [
    "check-assignment",
    "read-code",
    "check-assignment",
    "read-code",
    "atomic-redeem",
    "write-history",
  ]);
});

test("a wrong manual code cannot reveal or redeem a ticket", async () => {
  const { calls, tx } = redemptionFixture({
    assigned: true,
    credential: mixedCode,
  });
  const input = {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token: "Z9Z9Z9",
  };
  assert.deepEqual(await previewTicketRedemptionInDatabase(tx, input), {
    status: "NOT_FOUND",
  });
  assert.deepEqual(await redeemTicketInTransaction(tx, input), {
    status: "NOT_FOUND",
  });
  assert.deepEqual(calls, ["read-code", "read-code"]);
});

test("an unauthorized manual lookup looks the same as an unknown code", async () => {
  const { calls, tx } = redemptionFixture({ credential: mixedCode });
  const input = {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token: mixedCode,
  };
  assert.deepEqual(await previewTicketRedemptionInDatabase(tx, input), {
    status: "NOT_FOUND",
  });
  assert.deepEqual(await redeemTicketInTransaction(tx, input), {
    status: "NOT_FOUND",
  });
  assert.deepEqual(calls, [
    "read-code",
    "check-assignment",
    "read-code",
    "check-assignment",
  ]);
});

test("an unexpired legacy ten-digit code remains valid without extra fields", async () => {
  const { tx } = redemptionFixture({ assigned: true, credential: legacyCode });
  const result = await previewTicketRedemptionInDatabase(tx, {
    actorProfileId: "organizer-1",
    isAdmin: false,
    now,
    token: legacyCode,
  });
  assert.equal(result.status, "READY");
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
    $queryRaw: async () => [],
    inventoryItemDefinition: {
      findFirst: async ({ where }: { where: { id: string } }) => {
        calls.push("check-current-event");
        assert.equal(where.id, "definition-2");
        return { id: "definition-2" };
      },
    },
    inventoryItem: {
      findUnique: async () => {
        calls.push("read-ticket");
        return {
          id: "ticket-1",
          definitionId: "definition-1",
          definition: {
            kind: "EVENT_TICKET",
            imageUrl: null,
            title: "Other event",
          },
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
  assert.deepEqual(calls, ["read-token", "atomic-redeem", "write-history"]);
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
              definition: {
                kind: "EVENT_TICKET",
                imageUrl: null,
                title: "Wine evening",
              },
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
        updatedAt: now,
      }),
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: {
          redemptionToken: string;
          redemptionCode: string;
          redemptionTokenExpiresAt: Date;
          updatedAt: Date;
        };
      }) => {
        calls.push("write-token");
        assert.deepEqual(where, {
          id: "ticket-1",
          ownerProfileId: "holder-1",
          redeemedAt: null,
          updatedAt: now,
        });
        assert.match(data.redemptionToken, /^[A-Za-z0-9_-]{43}$/);
        assert.match(
          data.redemptionCode,
          /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/,
        );
        assert.equal(data.updatedAt, now);
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
  if (result.status === "READY")
    assert.match(result.code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  assert.deepEqual(calls, ["write-token"]);
});
