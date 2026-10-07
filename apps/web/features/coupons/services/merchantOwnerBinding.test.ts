import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { bindProfileToExistingMerchantInTransaction } from "./merchantOwnerBinding";

type Profile = { ownedMerchant: { id: string } | null } | null;
type Merchant = { ownerProfileId: string | null } | null;

function fixture({
  profile = { ownedMerchant: null },
  merchant = { ownerProfileId: null },
  updated = 1,
}: {
  profile?: Profile;
  merchant?: Merchant;
  updated?: number;
} = {}) {
  const calls: string[] = [];
  const boundMerchant = { id: "store-1", owner: { id: "user-1" } };
  const tx = {
    userProfile: {
      findFirst: async () => {
        calls.push("find-profile");
        return profile;
      },
    },
    merchant: {
      findFirst: async () => {
        calls.push("find-merchant");
        return merchant;
      },
      updateMany: async (input: unknown) => {
        calls.push("bind-existing");
        assert.deepEqual(input, {
          where: {
            id: "store-1",
            isActive: true,
            ownerProfileId: null,
          },
          data: { ownerProfileId: "user-1" },
        });
        return { count: updated };
      },
      findUniqueOrThrow: async () => {
        calls.push("read-bound-merchant");
        return boundMerchant;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { boundMerchant, calls, tx };
}

test("binds the chosen account to the existing store without creating another", async () => {
  const { boundMerchant, calls, tx } = fixture();

  assert.equal(
    await bindProfileToExistingMerchantInTransaction(tx, "user-1", "store-1"),
    boundMerchant,
  );
  assert.deepEqual(calls, [
    "find-profile",
    "find-merchant",
    "bind-existing",
    "read-bound-merchant",
  ]);
});

test("rejects an account that already owns a store before changing data", async () => {
  const { calls, tx } = fixture({
    profile: { ownedMerchant: { id: "another-store" } },
  });

  await assert.rejects(
    bindProfileToExistingMerchantInTransaction(tx, "user-1", "store-1"),
    /PROFILE_ALREADY_OWNS_MERCHANT/,
  );
  assert.deepEqual(calls, ["find-profile"]);
});

test("rejects a store that already has an owner before changing data", async () => {
  const { calls, tx } = fixture({
    merchant: { ownerProfileId: "another-user" },
  });

  await assert.rejects(
    bindProfileToExistingMerchantInTransaction(tx, "user-1", "store-1"),
    /MERCHANT_ALREADY_OWNED/,
  );
  assert.deepEqual(calls, ["find-profile", "find-merchant"]);
});

test("rejects missing or inactive accounts and stores", async () => {
  const missingProfile = fixture({ profile: null });
  await assert.rejects(
    bindProfileToExistingMerchantInTransaction(
      missingProfile.tx,
      "user-1",
      "store-1",
    ),
    /PROFILE_NOT_FOUND/,
  );
  assert.deepEqual(missingProfile.calls, ["find-profile"]);

  const missingMerchant = fixture({ merchant: null });
  await assert.rejects(
    bindProfileToExistingMerchantInTransaction(
      missingMerchant.tx,
      "user-1",
      "store-1",
    ),
    /MERCHANT_NOT_FOUND/,
  );
  assert.deepEqual(missingMerchant.calls, ["find-profile", "find-merchant"]);
});

test("rejects a binding race when another admin claims the store", async () => {
  const { calls, tx } = fixture({ updated: 0 });

  await assert.rejects(
    bindProfileToExistingMerchantInTransaction(tx, "user-1", "store-1"),
    /MERCHANT_ALREADY_OWNED/,
  );
  assert.deepEqual(calls, ["find-profile", "find-merchant", "bind-existing"]);
});
