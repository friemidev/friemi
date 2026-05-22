import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organizer = await prisma.userProfile.upsert({
    where: { clerkUserId: "seed_user_next_fun_club" },
    update: {},
    create: {
      clerkUserId: "seed_user_next_fun_club",
      nickname: "Next Fun Club",
      bio: "巴黎首批活动运营账号",
      interests: ["桌游", "展览", "City walk"]
    }
  });

  await prisma.activity.createMany({
    data: [
      {
        title: "周五下班后桌游局",
        description: "轻松认识新朋友，适合第一次参加活动的人。",
        category: "BOARD_GAME",
        city: "Paris",
        address: "République, Paris",
        startAt: new Date("2026-06-05T18:30:00.000Z"),
        capacity: 8,
        priceType: "AA",
        priceText: "AA 预计 8-12 欧",
        organizerId: organizer.id
      },
      {
        title: "奥赛博物馆周末看展",
        description: "一起看展，结束后附近喝咖啡。",
        category: "EXHIBITION",
        city: "Paris",
        address: "Musée d'Orsay",
        startAt: new Date("2026-06-07T13:00:00.000Z"),
        capacity: 6,
        priceType: "FIXED",
        priceText: "门票自理",
        organizerId: organizer.id
      },
      {
        title: "巴黎 City Walk 摄影小队",
        description: "从玛黑区走到塞纳河边，适合拍照和聊天。",
        category: "TRAVEL",
        city: "Paris",
        address: "Le Marais",
        startAt: new Date("2026-06-14T09:00:00.000Z"),
        capacity: 10,
        priceType: "FREE",
        priceText: "免费",
        organizerId: organizer.id
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
