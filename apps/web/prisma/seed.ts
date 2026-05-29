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
      interests: ["桌游", "展览", "City walk"],
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { slug: "paris-community-cafe" },
    update: {
      name: "Paris Community Café",
      description: "适合小型聚会、语言交换和桌游活动的巴黎本地合作空间。",
      city: "Paris",
      address: "République, Paris",
      latitude: 48.8674,
      longitude: 2.363,
      websiteUrl: "https://example.com",
      isActive: true,
    },
    create: {
      slug: "paris-community-cafe",
      name: "Paris Community Café",
      description: "适合小型聚会、语言交换和桌游活动的巴黎本地合作空间。",
      city: "Paris",
      address: "République, Paris",
      latitude: 48.8674,
      longitude: 2.363,
      websiteUrl: "https://example.com",
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        title: "周五下班后桌游局",
        description: "轻松认识新朋友，适合第一次参加活动的人。",
        itinerary: "18:30 集合\n19:00 开始桌游\n21:30 自由交流",
        type: "LOCAL",
        category: "BOARD_GAME",
        city: "Paris",
        address: "République, Paris",
        startAt: new Date("2026-06-05T18:30:00.000Z"),
        endAt: new Date("2026-06-05T21:30:00.000Z"),
        capacity: 8,
        minParticipants: 4,
        requiresApproval: false,
        priceType: "AA",
        priceText: "AA 预计 8-12 欧",
        organizerId: organizer.id,
        merchantId: merchant.id,
      },
      {
        title: "奥赛博物馆周末看展",
        description: "一起看展，结束后附近喝咖啡。",
        itinerary: "13:00 门口集合\n13:15 入场看展\n16:00 附近咖啡聊天",
        type: "LOCAL",
        category: "EXHIBITION",
        city: "Paris",
        address: "Musée d'Orsay",
        startAt: new Date("2026-06-07T13:00:00.000Z"),
        endAt: new Date("2026-06-07T16:30:00.000Z"),
        capacity: 6,
        minParticipants: 2,
        requiresApproval: false,
        priceType: "FIXED",
        priceText: "门票自理",
        organizerId: organizer.id,
      },
      {
        title: "巴黎 City Walk 摄影小队",
        description: "从玛黑区走到塞纳河边，适合拍照和聊天。",
        itinerary: "09:00 玛黑区集合\n10:30 塞纳河边拍照\n12:00 自由午餐",
        type: "TRIP",
        category: "TRAVEL",
        city: "Paris",
        destination: "Paris",
        address: "Le Marais",
        startAt: new Date("2026-06-14T09:00:00.000Z"),
        endAt: new Date("2026-06-14T12:30:00.000Z"),
        capacity: 10,
        minParticipants: 3,
        requiresApproval: true,
        priceType: "FREE",
        priceText: "免费",
        organizerId: organizer.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.activity.updateMany({
    where: {
      organizerId: organizer.id,
      title: "周五下班后桌游局",
    },
    data: {
      merchantId: merchant.id,
    },
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
