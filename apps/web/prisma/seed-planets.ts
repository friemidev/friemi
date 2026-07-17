import { PrismaClient, type PlanetMemberRole } from "@prisma/client";

const prisma = new PrismaClient();

const profiles = [
  { clerkUserId: "demo-planet-kevin", nickname: "Kevin", isCoCreator: true },
  { clerkUserId: "demo-planet-chloe", nickname: "Chloe", isCoCreator: false },
  { clerkUserId: "demo-planet-tom", nickname: "Tom", isCoCreator: false },
  { clerkUserId: "demo-planet-amy", nickname: "Amy", isCoCreator: false },
] as const;

const planets = [
  { slug: "board-game-planet", inviteCode: "PLANETBG01", name: "桌游星球", nameTranslations: { en: "Board Game Planet", fr: "Planète jeux de société" }, description: "周末桌游、新手教学和线下聚会。", coverImageUrl: "/images/planets/board-game-night.png", tags: ["桌游", "周末", "新手友好"] },
  { slug: "music-vibes", inviteCode: "PLANETMV02", name: "音乐共振", nameTranslations: { en: "Music Vibes", fr: "Vibrations musicales" }, description: "一起听歌、分享现场和发现新的声音。", coverImageUrl: "/images/planets/music-vibes-night.png", tags: ["音乐", "现场", "分享"] },
  { slug: "outdoor-club", inviteCode: "PLANETOC03", name: "户外俱乐部", nameTranslations: { en: "Outdoor Club", fr: "Club plein air" }, description: "徒步、骑行和每一次出发。", coverImageUrl: "/images/planets/outdoor-club-ride.png", tags: ["户外", "徒步", "骑行"] },
  { slug: "food-lovers", inviteCode: "PLANETFL04", name: "饭局星球", nameTranslations: { en: "Food Lovers", fr: "Planète gourmande" }, description: "寻找城市里的好味道。", tags: ["美食", "饭局", "探店"] },
  { slug: "study-planet", inviteCode: "PLANETSP05", name: "学习星球", nameTranslations: { en: "Study Planet", fr: "Planète étude" }, description: "一起专注，也一起成长。", tags: ["学习", "共学", "成长"] },
  { slug: "anime-world", inviteCode: "PLANETAW06", name: "二次元世界", nameTranslations: { en: "Anime World", fr: "Monde anime" }, description: "动画、漫画与热爱的同频伙伴。", tags: ["动漫", "漫画", "同好"] },
];

async function main() {
  const seededProfiles = await Promise.all(
    profiles.map((profile) =>
      prisma.userProfile.upsert({
        where: { clerkUserId: profile.clerkUserId },
        update: { isCoCreator: profile.isCoCreator, nickname: profile.nickname },
        create: profile,
      }),
    ),
  );

  const profileByName = new Map(seededProfiles.map((profile) => [profile.nickname, profile]));
  const owner = await prisma.userProfile.upsert({
    where: { clerkUserId: "seed_user_next_fun_club" },
    update: { isCoCreator: true, nickname: "Friemi" },
    create: {
      clerkUserId: "seed_user_next_fun_club",
      nickname: "Friemi",
      isCoCreator: true,
    },
  });

  for (const planetInput of planets) {
    const planet = await prisma.planet.upsert({
      where: { slug: planetInput.slug },
      update: { ...planetInput, ownerId: owner.id, visibility: "PUBLIC" },
      create: { ...planetInput, ownerId: owner.id, visibility: "PUBLIC" },
    });

    await Promise.all(
      [owner, ...seededProfiles].map((profile) =>
        prisma.planetMember.upsert({
          where: { planetId_profileId: { planetId: planet.id, profileId: profile.id } },
          update: {},
          create: {
            planetId: planet.id,
            profileId: profile.id,
            role: (profile.id === owner.id ? "OWNER" : "MEMBER") as PlanetMemberRole,
          },
        }),
      ),
    );

    const messageCount = await prisma.planetMessage.count({ where: { planetId: planet.id } });
    if (messageCount === 0) {
      await prisma.planetMessage.createMany({
        data: [
          { planetId: planet.id, authorId: owner.id, content: "大家周末要不要来一场轻松的聚会？" },
          { planetId: planet.id, authorId: profileByName.get("Chloe")!.id, content: "好呀，我已经开始期待了！" },
          { planetId: planet.id, authorId: profileByName.get("Amy")!.id, content: "我也来，欢迎新朋友一起加入。" },
        ],
      });
    }
  }

  const boardGamePlanet = await prisma.planet.findUniqueOrThrow({ where: { slug: "board-game-planet" } });
  const boardGameMoments = [
    { authorId: profileByName.get("Chloe")!.id, content: "桌游之夜回顾：认识了很多新朋友，下次再约！", imageUrls: ["/images/planets/board-game-night.png", "/images/planets/board-game-night.png", "/images/planets/board-game-night.png"] },
    { authorId: owner.id, content: "新手局开箱：今天的规则十分钟就学会了。", imageUrls: ["/images/planets/board-game-night.png"] },
    { authorId: profileByName.get("Amy")!.id, content: "周末聚会：一桌好游戏和好心情。", imageUrls: ["/images/planets/board-game-night.png"] },
    { authorId: profileByName.get("Tom")!.id, content: "策略对决：下一局我要换一套打法。", imageUrls: ["/images/planets/board-game-night.png"] },
    { authorId: profileByName.get("Chloe")!.id, content: "生日桌游局：谢谢大家带来的惊喜。", imageUrls: ["/images/planets/board-game-night.png"] },
  ];

  const createdMoments = await Promise.all(
    boardGameMoments.map(async (momentInput) => {
      const existingMoment = await prisma.planetMoment.findFirst({
        where: { planetId: boardGamePlanet.id, content: momentInput.content },
        select: { id: true },
      });
      return existingMoment
        ? prisma.planetMoment.update({
            where: { id: existingMoment.id },
            data: { imageUrls: momentInput.imageUrls },
            select: { id: true },
          })
        : prisma.planetMoment.create({
            data: { planetId: boardGamePlanet.id, ...momentInput },
            select: { id: true },
          });
    }),
  );
  const moment = createdMoments[0];

  const featuredPlanetMoments = [
    { slug: "music-vibes", authorId: profileByName.get("Amy")!.id, content: "音乐现场回顾：这首安可值得再听一百遍。", imageUrls: ["/images/planets/music-vibes-night.png", "/images/planets/music-vibes-night.png"] },
    { slug: "music-vibes", authorId: owner.id, content: "本周歌单已经整理好，欢迎补充你的宝藏歌曲。", imageUrls: ["/images/planets/music-vibes-night.png"] },
    { slug: "outdoor-club", authorId: profileByName.get("Tom")!.id, content: "河边骑行记录：晚风和落日都刚刚好。", imageUrls: ["/images/planets/outdoor-club-ride.png", "/images/planets/outdoor-club-ride.png"] },
    { slug: "outdoor-club", authorId: profileByName.get("Chloe")!.id, content: "下一次徒步路线投票开始啦。", imageUrls: ["/images/planets/outdoor-club-ride.png"] },
  ];

  for (const momentInput of featuredPlanetMoments) {
    const planet = await prisma.planet.findUniqueOrThrow({ where: { slug: momentInput.slug } });
    const existing = await prisma.planetMoment.findFirst({ where: { planetId: planet.id, content: momentInput.content }, select: { id: true } });
    if (existing) {
      await prisma.planetMoment.update({ where: { id: existing.id }, data: { imageUrls: momentInput.imageUrls } });
    } else {
      await prisma.planetMoment.create({ data: { planetId: planet.id, authorId: momentInput.authorId, content: momentInput.content, imageUrls: momentInput.imageUrls } });
    }
  }

  const commentCount = await prisma.planetMomentComment.count({ where: { momentId: moment.id } });
  if (commentCount === 0) {
    await prisma.planetMomentComment.createMany({
      data: [
        { momentId: moment.id, authorId: owner.id, content: "太开心了，下一次我带新游戏！" },
        { momentId: moment.id, authorId: profileByName.get("Amy")!.id, content: "期待下一次，氛围真的很好。" },
      ],
    });
  }

  console.log(`Seeded ${planets.length} demo planets and the Board Game Planet moment.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
