import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { updatePlanetCategoryInDatabase } from "./planetSettings";

function database(
  membership: { role: string; status: string } | null,
  fail = false,
) {
  const reads: unknown[] = [];
  const writes: unknown[] = [];
  const db = {
    planetMember: {
      findFirst: async (query: unknown) => {
        reads.push(query);
        return membership;
      },
    },
    planet: {
      update: async (query: unknown) => {
        if (fail) throw new Error("Database unavailable");
        writes.push(query);
        return { slug: "test-planet" };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, reads, writes };
}

const input = {
  planetId: "planet-a",
  profileId: "profile-a",
  category: "BOARD_GAME",
};

test("approved owners and admins can replace the planet category", async () => {
  for (const role of ["OWNER", "ADMIN"]) {
    const { db, reads, writes } = database({ role, status: "APPROVED" });
    assert.deepEqual(await updatePlanetCategoryInDatabase(db, input), {
      status: "saved",
      category: "BOARD_GAME",
      slug: "test-planet",
    });
    assert.deepEqual(reads, [
      {
        where: { planetId: "planet-a", profileId: "profile-a" },
        select: { role: true, status: true },
      },
    ]);
    assert.deepEqual(writes, [
      {
        where: {
          id: "planet-a",
          members: {
            some: {
              profileId: "profile-a",
              status: "APPROVED",
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
        data: { tags: ["BOARD_GAME"] },
        select: { slug: true },
      },
    ]);
  }
});

test("members, pending admins and nonmembers cannot change a planet category", async () => {
  for (const membership of [
    null,
    { role: "MEMBER", status: "APPROVED" },
    { role: "ADMIN", status: "PENDING" },
    { role: "OWNER", status: "PENDING" },
  ]) {
    const { db, writes } = database(membership);
    assert.deepEqual(await updatePlanetCategoryInDatabase(db, input), {
      status: "forbidden",
    });
    assert.equal(writes.length, 0);
  }
});

test("unknown or empty categories never reach the database", async () => {
  for (const category of ["", "OTHER", "饭局"]) {
    const { db, reads, writes } = database({
      role: "OWNER",
      status: "APPROVED",
    });
    assert.deepEqual(
      await updatePlanetCategoryInDatabase(db, { ...input, category }),
      { status: "invalid" },
    );
    assert.equal(reads.length, 0);
    assert.equal(writes.length, 0);
  }
});

test("database failures do not produce a successful category update", async () => {
  const { db } = database({ role: "OWNER", status: "APPROVED" }, true);
  await assert.rejects(
    updatePlanetCategoryInDatabase(db, input),
    /Database unavailable/,
  );
});
