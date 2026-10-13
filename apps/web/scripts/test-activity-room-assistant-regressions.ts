import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { approveInvitedActivityRoomParticipant } from "../features/activity-room-chat/services/activityRoomInvitation";
import { sendActivityRoomWelcome } from "../features/activity-room-chat/services/activityRoomWelcome";
import { runScheduledGuestLink } from "../features/guest-participants/services/guestLinkScheduler";
import { broadcastChatRealtimeChange } from "../features/chat/chatRealtimeServer";

const url = new URL(process.env.WELCOME_TEST_DATABASE_URL ?? "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  process.env.DATABASE_URL !== url.toString()
)
  throw new Error("An explicit isolated local test database is required.");

const db = new PrismaClient();
const prefix = `assistant-regression-${Date.now()}`;
const activityId = `${prefix}-group`;
const id = (name: string) => `${prefix}-${name}`;
const requests: { url: string; body: Record<string, string> }[] = [];
const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.SUPABASE_SECRET_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55433";
process.env.SUPABASE_SECRET_KEY = "isolated-test-key";
globalThis.fetch = async (input, init) => {
  requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
  return new Response(null, { status: 200 });
};

try {
  for (const name of ["host", "admin", "member", "guest"]) {
    await db.userProfile.create({
      data: { id: id(name), clerkUserId: id(name), nickname: name },
    });
  }
  await db.activity.create({
    data: {
      id: activityId,
      title: "Assistant regression group",
      description: "Disposable local data",
      type: "USER_HOSTED",
      category: "BOARD_GAME",
      address: "Paris",
      capacity: 20,
      priceText: "Free",
      startAt: new Date(Date.now() + 86400000),
      organizerId: id("host"),
      coManagers: { create: { managerProfileId: id("admin") } },
    },
  });
  const participant = await db.activityParticipant.create({
    data: { activityId, userProfileId: id("member"), status: "CANCELLED" },
  });
  let arrivals = 0;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => (release = resolve));
  const outcomes = await Promise.all(
    [0, 20].map((delay) =>
      db.$transaction(async (tx) => {
        const previous = await tx.activityParticipant.findUniqueOrThrow({
          where: { id: participant.id },
          select: { id: true, status: true },
        });
        if (++arrivals === 2) release();
        await barrier;
        await new Promise((resolve) => setTimeout(resolve, delay));
        const updated = await approveInvitedActivityRoomParticipant({
          db: tx,
          activityId,
          profileId: id("member"),
          previous,
        });
        return updated
          ? sendActivityRoomWelcome({
              db: tx,
              participant: updated,
              previousStatus: previous.status,
            })
          : null;
      }),
    ),
  );
  assert.equal(outcomes.filter(Boolean).length, 1);
  assert.equal(
    await db.activityRoomMessage.count({ where: { activityId } }),
    1,
  );
  assert.equal(
    await db.activityParticipant.count({
      where: { activityId, status: "APPROVED" },
    }),
    1,
  );

  const guestEmail = `${prefix}@example.test`;
  await db.guestActivityParticipant.create({
    data: {
      activityId,
      displayName: "guest",
      normalizedEmail: guestEmail,
      status: "APPROVED",
    },
  });
  await db.activityParticipant.create({
    data: { activityId, userProfileId: id("guest"), status: "CANCELLED" },
  });
  const links = await Promise.all(
    [1, 2].map(() =>
      runScheduledGuestLink({
        prisma: db,
        profile: { id: id("guest"), verifiedEmail: guestEmail },
        trigger: "contact_binding",
        force: true,
      }),
    ),
  );
  assert.equal(
    links.reduce((count, result) => count + result.linked, 0),
    1,
  );
  assert.equal(
    await db.activityRoomMessage.count({ where: { activityId } }),
    2,
  );
  const inbox = requests.filter(({ url }) => url.includes("inbox-changed"));
  assert.deepEqual(
    new Set(inbox.map(({ body }) => body.profileId)),
    new Set([id("host"), id("admin"), id("member"), id("guest")]),
  );
  assert.ok(
    requests.some(
      ({ url, body }) =>
        url.includes("messages-changed") && body.subjectKey === activityId,
    ),
  );

  requests.length = 0;
  await broadcastChatRealtimeChange({
    scope: "activity",
    subjectKey: activityId,
    profileIds: [id("host"), ` ${id("host")} `, "", id("admin")],
  });
  assert.equal(requests.length, 3);
  assert.equal(
    requests.filter(({ url }) => url.includes("inbox-changed")).length,
    2,
  );
  console.log(
    "PASS: concurrent invitations produce one welcome; guest linking broadcasts the room and every member inbox; recipient IDs are deduplicated.",
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalKey;
  await db.activity.deleteMany({ where: { id: activityId } });
  await db.userProfile.deleteMany({
    where: { id: { in: ["host", "admin", "member", "guest"].map(id) } },
  });
  await db.$disconnect();
}
