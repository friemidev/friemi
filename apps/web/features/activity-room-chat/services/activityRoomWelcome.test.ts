import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  sendActivityRoomWelcome,
  updateActivityRoomWelcomeTemplate,
} from "./activityRoomWelcome";

function welcomeDb() {
  const messages = new Map<
    string,
    { id: string; body: string; senderId: null; activityId: string }
  >();
  const activity = {
    title: "周日桌游",
    type: "USER_HOSTED",
    roomWelcomeTemplate: null as string | null,
    organizerId: "host",
    coManagers: [{ managerProfileId: "admin" }],
    participants: [{ userProfileId: "member" }, { userProfileId: "host" }],
  };
  const db = {
    activity: { findUnique: async () => activity },
    userProfile: {
      findUnique: async () => ({ nickname: "小明", friendCode: "123456" }),
    },
    activityRoomMessage: {
      upsert: async ({
        where,
        create,
      }: {
        where: { assistantWelcomeKey: string };
        create: { body: string; senderId: null; activityId: string };
      }) => {
        if (!messages.has(where.assistantWelcomeKey)) {
          messages.set(where.assistantWelcomeKey, {
            ...create,
            id: `message-${messages.size}`,
          });
        }
        return messages.get(where.assistantWelcomeKey)!;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, messages, activity };
}

const participant = {
  id: "participation-1",
  activityId: "group-1",
  userProfileId: "member",
  status: "APPROVED",
  joinedAt: new Date("2026-10-13T10:00:00Z"),
};

test("saves one welcome per join event and keeps historical messages when settings change", async () => {
  const { db, messages, activity } = welcomeDb();
  const first = await sendActivityRoomWelcome({
    db,
    participant,
    previousStatus: "PENDING",
  });
  assert.deepEqual(first?.profileIds.sort(), ["admin", "host", "member"]);
  assert.equal(
    [...messages.values()][0].body,
    "欢迎 小明 进入 周日桌游 Friemi群！",
  );
  activity.roomWelcomeTemplate = "你好 {nickname}！";
  await sendActivityRoomWelcome({ db, participant, previousStatus: "PENDING" });
  assert.equal(messages.size, 1);
  assert.equal(
    [...messages.values()][0].body,
    "欢迎 小明 进入 周日桌游 Friemi群！",
  );
  await sendActivityRoomWelcome({
    db,
    participant: { ...participant, joinedAt: new Date("2026-10-13T11:00:00Z") },
    previousStatus: "CANCELLED",
  });
  assert.equal(messages.size, 2);
  assert.equal([...messages.values()][1].body, "你好 小明！");
  assert.equal([...messages.values()][1].senderId, null);
});

test("does not welcome pending applicants, existing members or public-event signups", async () => {
  const { db, messages, activity } = welcomeDb();
  assert.equal(
    await sendActivityRoomWelcome({
      db,
      participant: { ...participant, status: "PENDING" },
    }),
    null,
  );
  assert.equal(
    await sendActivityRoomWelcome({
      db,
      participant,
      previousStatus: "JOINED",
    }),
    null,
  );
  activity.type = "PUBLIC_EVENT";
  assert.equal(await sendActivityRoomWelcome({ db, participant }), null);
  assert.equal(messages.size, 0);
});

test("saving checks the acting group organizer or admin in the database update", async () => {
  let template = "old";
  let logs = 0;
  const db = {
    activity: {
      updateMany: async ({ where, data }: Prisma.ActivityUpdateManyArgs) => {
        const choices = where?.OR ?? [];
        const allowed = choices.some(
          (rule) =>
            rule.organizerId === "host" ||
            rule.coManagers?.some?.managerProfileId === "admin",
        );
        if (!allowed) return { count: 0 };
        template = String(data.roomWelcomeTemplate);
        return { count: 1 };
      },
    },
    activityManagementLog: {
      create: async () => {
        logs++;
      },
    },
  } as unknown as Prisma.TransactionClient;
  for (const actorId of ["member", "stranger"]) {
    assert.equal(
      await updateActivityRoomWelcomeTemplate({
        db,
        activityId: "group",
        actorId,
        template: "new",
      }),
      false,
    );
  }
  assert.equal(template, "old");
  assert.equal(logs, 0);
  for (const actorId of ["host", "admin"]) {
    assert.equal(
      await updateActivityRoomWelcomeTemplate({
        db,
        activityId: "group",
        actorId,
        template: "你好 {nickname}",
      }),
      true,
    );
  }
  assert.equal(logs, 2);
});
