import { PrismaClient } from "@prisma/client";

const databaseUrl = new URL(
  process.env.DATABASE_URL || "postgresql://ubuntu23@127.0.0.1:55433/postgres",
);
if (databaseUrl.hostname !== "127.0.0.1" || databaseUrl.port !== "55433") {
  throw new Error(
    "This fixture can only use the dedicated local preview database on port 55433.",
  );
}
const db = new PrismaClient({ datasources: { db: { url: databaseUrl.href } } });

try {
  const [organizer, viewer] = await Promise.all([
    db.userProfile.findUnique({ where: { id: "welcome-preview-host" } }),
    db.userProfile.findUnique({ where: { clerkUserId: "local-dev-user" } }),
  ]);
  if (!organizer || !viewer)
    throw new Error(
      "Start the existing local preview and create its demo profiles first.",
    );
  const data = {
    title: "青年人乒乓球赛 | Ping Pong Tournament",
    description: "周末一起打乒乓球，比赛规则和分组信息由主理人提供。",
    type: "USER_HOSTED",
    category: "SPORTS",
    city: "Paris",
    address: "2 Rue Suchet, 94700 Maisons-Alfort",
    startAt: new Date("2026-11-21T12:00:00Z"),
    endAt: new Date("2026-11-21T17:30:00Z"),
    capacity: 20,
    organizerId: organizer.id,
    status: "RECRUITING",
    visibility: "PUBLIC",
    priceType: "FREE",
    priceText: "",
    ticketUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSd-WcQJh7ipjcx6WPWiaWa1cgQW3AyMrGb8cK3cvwmQPxlaOA/viewform",
    ticketLabel: "SUPPLEMENTARY_FORM",
  };
  const activity = await db.activity.upsert({
    where: { id: "host-link-preview-plan" },
    create: { id: "host-link-preview-plan", ...data },
    update: data,
  });
  await db.activityParticipant.upsert({
    where: {
      activityId_userProfileId: {
        activityId: activity.id,
        userProfileId: viewer.id,
      },
    },
    create: {
      activityId: activity.id,
      userProfileId: viewer.id,
      status: "JOINED",
    },
    update: { status: "JOINED" },
  });
  console.log(
    "Local preview: http://localhost:3035/zh-CN/lobby/host-link-preview-plan",
  );
} finally {
  await db.$disconnect();
}
