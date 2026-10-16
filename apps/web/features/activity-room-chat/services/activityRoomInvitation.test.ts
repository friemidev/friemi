import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, ParticipantStatus } from "@prisma/client";
import { approveInvitedActivityRoomParticipant } from "./activityRoomInvitation";

test("only the invitation that changes the inactive status can welcome a returning member", async () => {
  let status: ParticipantStatus = "CANCELLED";
  const db = {
    activityParticipant: {
      updateMany: async ({
        where,
      }: Prisma.ActivityParticipantUpdateManyArgs) => {
        assert.equal(where?.activityId, "group");
        assert.equal(where?.userProfileId, "member");
        if (where?.status !== status) return { count: 0 };
        status = "APPROVED";
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ id: "participant", status }),
    },
  } as unknown as Prisma.TransactionClient;
  const input = {
    db,
    activityId: "group",
    profileId: "member",
    previous: { id: "participant", status: "CANCELLED" as const },
  };
  const results = await Promise.all([
    approveInvitedActivityRoomParticipant(input),
    approveInvitedActivityRoomParticipant(input),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("does not overwrite an existing member or bypass an application", async () => {
  const db = {} as Prisma.TransactionClient;
  for (const status of ["PENDING", "JOINED", "APPROVED"] as const) {
    assert.equal(
      await approveInvitedActivityRoomParticipant({
        db,
        activityId: "group",
        profileId: "member",
        previous: { id: "participant", status },
      }),
      null,
    );
  }
});

test("creates a new approved membership without changing another user's record", async () => {
  const db = {
    activityParticipant: {
      create: async ({ data }: Prisma.ActivityParticipantCreateArgs) => {
        assert.deepEqual(data, {
          activityId: "group",
          userProfileId: "new-member",
          status: "APPROVED",
        });
        return { id: "new-participant", ...data };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.ok(
    await approveInvitedActivityRoomParticipant({
      db,
      activityId: "group",
      profileId: "new-member",
      previous: null,
    }),
  );
});
