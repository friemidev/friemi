import assert from "node:assert/strict";
import test from "node:test";
import { getTicketBagPageInDatabase } from "./inventoryBagQueries";

function ticket(id: string, redeemedAt: Date | null = null) {
  const date = new Date("2026-10-08T10:00:00.000Z");
  return {
    createdAt: date,
    definition: { id: "wine-evening", imageUrl: null, title: "Wine evening" },
    giftedAt: null,
    id,
    redeemedAt,
    updatedAt: date,
  };
}

test("bag reads owned event tickets individually and limits the first page", async () => {
  const first = ticket("ticket-1");
  const second = ticket("ticket-2");
  const calls: Array<{ operation: string; args: unknown }> = [];
  const db = {
    inventoryItem: {
      count: async (args: unknown) => {
        calls.push({ operation: "count", args });
        return 1000;
      },
      findMany: async (args: unknown) => {
        calls.push({ operation: "findMany", args });
        return [first, second];
      },
    },
  } as unknown as Parameters<typeof getTicketBagPageInDatabase>[0];

  const result = await getTicketBagPageInDatabase(db, {
    filter: "available",
    page: 1,
    profileId: "holder-1",
  });

  assert.equal(result.total, 1000);
  assert.equal(result.pageSize, 24);
  assert.deepEqual(result.items.map((item) => item.id), ["ticket-1", "ticket-2"]);
  assert.deepEqual(result.items.map((item) => item.definitionId), [
    "wine-evening",
    "wine-evening",
  ]);
  assert.deepEqual(calls[0], {
    operation: "count",
    args: {
      where: {
        ownerProfileId: "holder-1",
        definition: { kind: "EVENT_TICKET" },
        redeemedAt: null,
      },
    },
  });
  assert.deepEqual(calls[1], {
    operation: "findMany",
    args: {
      where: {
        ownerProfileId: "holder-1",
        definition: { kind: "EVENT_TICKET" },
        redeemedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: 0,
      take: 24,
      select: {
        createdAt: true,
        definition: { select: { id: true, imageUrl: true, title: true } },
        giftedAt: true,
        id: true,
        redeemedAt: true,
        updatedAt: true,
      },
    },
  });
});

test("used ticket page clamps to the last page", async () => {
  const db = {
    inventoryItem: {
      count: async () => 25,
      findMany: async ({ where, skip, take }: {
        where: unknown;
        skip: number;
        take: number;
      }) => {
        assert.deepEqual(where, {
          ownerProfileId: "holder-1",
          definition: { kind: "EVENT_TICKET" },
          redeemedAt: { not: null },
        });
        assert.equal(skip, 24);
        assert.equal(take, 24);
        return [ticket("ticket-25", new Date("2026-10-08T11:00:00.000Z"))];
      },
    },
  } as unknown as Parameters<typeof getTicketBagPageInDatabase>[0];

  const result = await getTicketBagPageInDatabase(db, {
    filter: "used",
    page: 999,
    profileId: "holder-1",
  });

  assert.equal(result.page, 2);
  assert.equal(result.items[0]?.redeemedAt, "2026-10-08T11:00:00.000Z");
});
