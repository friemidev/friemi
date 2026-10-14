import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  sendActivityRoomWelcome,
  updateActivityRoomWelcomeTemplate,
} from "../features/activity-room-chat/services/activityRoomWelcome";
import {
  deleteActivityRoomMessage,
  getActivityRoomChatPageData,
  getActivityRoomChatRoster,
  getActivityRoomUnreadState,
  sendActivityRoomMessage,
} from "../features/activity-room-chat/services/activityRoomChat";

const url = new URL(process.env.WELCOME_TEST_DATABASE_URL ?? "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  process.env.DATABASE_URL !== url.toString()
) {
  throw new Error(
    "This fixture requires an explicit local WELCOME_TEST_DATABASE_URL matching DATABASE_URL.",
  );
}
const activityId = "welcome-preview-group";
const id = (name: string) => `welcome-preview-${name}`;

try {
  await prisma.activity.deleteMany({ where: { id: activityId } });
  for (const [key, nickname] of [
    ["host", "今天一起出门"],
    ["admin", "一鸣"],
    ["member", "小明"],
    ["applicant", "小雨"],
    ["outsider", "未入群用户"],
  ]) {
    await prisma.userProfile.upsert({
      where: { id: id(key) },
      create: { id: id(key), clerkUserId: id(key), nickname },
      update: { nickname },
    });
  }
  await prisma.activity.create({
    data: {
      id: activityId,
      title: "周日巴黎桌游",
      description: "Local welcome assistant fixture",
      type: "USER_HOSTED",
      category: "BOARD_GAME",
      address: "Paris",
      capacity: 20,
      priceText: "免费",
      startAt: new Date(Date.now() + 7 * 86400000),
      organizerId: id("host"),
      coManagers: { create: { managerProfileId: id("admin") } },
    },
  });

  const participant = await prisma.$transaction(async (db) => {
    const participant = await db.activityParticipant.create({
      data: { activityId, userProfileId: id("member"), status: "APPROVED" },
    });
    await sendActivityRoomWelcome({ db, participant });
    return participant;
  });
  const initial = await prisma.activityRoomMessage.findFirstOrThrow({
    where: { activityId },
  });
  assert.equal(initial.body, "欢迎 小明 进入 周日巴黎桌游 Friemi群！");
  await Promise.all(
    [1, 2].map(() =>
      prisma.$transaction((db) => sendActivityRoomWelcome({ db, participant })),
    ),
  );
  assert.equal(
    await prisma.activityRoomMessage.count({ where: { activityId } }),
    1,
  );

  const applicant = await prisma.$transaction(async (db) => {
    const participant = await db.activityParticipant.create({
      data: { activityId, userProfileId: id("applicant"), status: "PENDING" },
    });
    assert.equal(await sendActivityRoomWelcome({ db, participant }), null);
    return participant;
  });
  assert.equal(
    await prisma.activityRoomMessage.count({ where: { activityId } }),
    1,
  );
  await prisma.$transaction(async (db) => {
    const approved = await db.activityParticipant.update({
      where: { id: applicant.id },
      data: { status: "APPROVED" },
    });
    await sendActivityRoomWelcome({
      db,
      participant: approved,
      previousStatus: "PENDING",
    });
  });
  assert.equal(
    await prisma.activityRoomMessage.count({ where: { activityId } }),
    2,
  );

  for (const actor of ["member", "outsider"]) {
    assert.equal(
      await prisma.$transaction((db) =>
        updateActivityRoomWelcomeTemplate({
          db,
          activityId,
          actorId: id(actor),
          template: "unauthorized",
        }),
      ),
      false,
    );
  }
  for (const actor of ["host", "admin"]) {
    assert.equal(
      await prisma.$transaction((db) =>
        updateActivityRoomWelcomeTemplate({
          db,
          activityId,
          actorId: id(actor),
          template: "欢迎 {nickname}！很高兴在 {activityName} 见到你。",
        }),
      ),
      true,
    );
  }
  assert.equal(
    (
      await prisma.activityRoomMessage.findUniqueOrThrow({
        where: { id: initial.id },
      })
    ).body,
    initial.body,
  );
  await prisma.$transaction(async (db) => {
    await db.activityParticipant.update({
      where: { id: participant.id },
      data: { status: "CANCELLED" },
    });
    const rejoined = await db.activityParticipant.update({
      where: { id: participant.id },
      data: {
        status: "APPROVED",
        joinedAt: new Date(participant.joinedAt.getTime() + 5000),
      },
    });
    await sendActivityRoomWelcome({
      db,
      participant: rejoined,
      previousStatus: "CANCELLED",
    });
  });
  assert.equal(
    await prisma.activityRoomMessage.count({ where: { activityId } }),
    3,
  );

  const page = await getActivityRoomChatPageData({
    activityId,
    viewerProfileId: id("host"),
  });
  assert.ok(
    page.messages.every(
      (message) =>
        message.isAssistant &&
        !message.isMine &&
        message.sender.id === "friemi-group-assistant",
    ),
  );
  assert.equal(
    (
      await getActivityRoomChatPageData({
        activityId,
        viewerProfileId: id("member"),
      })
    ).activity?.welcomeTemplate,
    undefined,
  );
  assert.ok(page.activity?.welcomeTemplate);
  assert.equal(
    (await getActivityRoomUnreadState(id("host"), activityId)).unreadCount,
    3,
  );
  const roster = await getActivityRoomChatRoster(id("host"));
  assert.equal(
    roster.find((room) => room.id === activityId)?.lastMessage?.senderId,
    "friemi-group-assistant",
  );
  // Suppress push scheduling when testing chat outside Next's request scope.
  for (const key of ["host", "admin", "member", "applicant"]) {
    await prisma.activityRoomReadState.upsert({
      where: { activityId_profileId: { activityId, profileId: id(key) } },
      create: { activityId, profileId: id(key), mutedAt: new Date() },
      update: { mutedAt: new Date() },
    });
  }
  await sendActivityRoomMessage({
    activityId,
    senderId: id("member"),
    body: "谢谢！周日见。",
    replyToMessageId: initial.id,
  });
  await sendActivityRoomMessage({
    activityId,
    senderId: id("admin"),
    body: "欢迎大家，周日一起玩！",
  });
  await assert.rejects(() =>
    deleteActivityRoomMessage({
      activityId,
      actorId: id("member"),
      messageId: initial.id,
    }),
  );
  await prisma.activityRoomReadState.updateMany({
    where: { activityId },
    data: { mutedAt: null },
  });
  console.log(
    "PASS: database migration, concurrent welcome dedupe, approval, rejoining, organizer/admin permissions, history, assistant roster, unread count, replies and delete permissions.",
  );
  console.log(`Local preview fixture: ${activityId}`);
} finally {
  await prisma.$disconnect();
}
