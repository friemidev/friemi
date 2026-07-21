import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  CalendarPlus,
  ChevronDown,
  Clock3,
  Heart,
  MapPin,
  UsersRound,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { LazyLobbySwipeDiscovery } from "@/features/activities/components/ActivityLobbyView";
import { getLobbySwipePublicEventActivities } from "@/features/activities/queries/getActivityLobby";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { getActivityDateLabel } from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { HomeActivityCarousel } from "@/features/home/components/HomeActivityCarousel";
import { HomeLuxuryMotion } from "@/features/home/components/HomeLuxuryMotion";
import { GlobalSearchForm } from "@/features/search/components/GlobalSearchForm";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { getCategoryLabel } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getCanonicalMetadataBaseUrl,
  getGeneralPageShareDescription,
} from "@/lib/share-metadata";
import { cn } from "@/lib/utils";
import { MobileHomeV23CategoryCarousel } from "./MobileHomeV23CategoryCarousel";
import { MobileHomeV23NotificationLink } from "./MobileHomeV23NotificationLink";

type MobileHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type MobileHomeCopy = {
  featureBadge: string;
  featureStatus: string;
  featureTitle: string;
  featureDescription: string;
  featureKicker: string;
  searchPlaceholder: string;
  categoriesTitle: string;
  categoriesDescription: string;
  categories: {
    category: string;
    image: string;
    label: string;
  }[];
  createPlanLabel: string;
  activityDescription: string;
  activityEyebrow: string;
  activityTitle: string;
  activityCta: string;
  carousel: {
    ariaLabel: string;
    emptyDescription: string;
    emptyTitle: string;
    next: string;
    previous: string;
    viewActivity: string;
  };
  tabletHighlights: {
    label: string;
    text: string;
  }[];
};

type MobileHomeExperienceProps = {
  locale: string;
  swipeActivities: ActivityCardViewModel[];
};

type MobileHomeV23ExperienceProps = MobileHomeExperienceProps & {
  viewerName: string | null;
};

const mobileHomeIllustrationPath = "/illustrations/vector";

function getMobileHomeIllustrationSrc(image: string) {
  return `${mobileHomeIllustrationPath}/${image.replace(/\.png$/u, ".svg")}`;
}
const mobileHomeCategoryAccents = [
  { glow: "rgba(245, 133, 118, 0.2)", tilt: "-2.5deg" },
  { glow: "rgba(54, 151, 88, 0.18)", tilt: "1.5deg" },
  { glow: "rgba(143, 185, 255, 0.2)", tilt: "-1deg" },
  { glow: "rgba(246, 204, 112, 0.2)", tilt: "2deg" },
  { glow: "rgba(245, 133, 118, 0.18)", tilt: "-1.5deg" },
  { glow: "rgba(54, 151, 88, 0.16)", tilt: "2.5deg" },
  { glow: "rgba(143, 185, 255, 0.18)", tilt: "-2deg" },
  { glow: "rgba(246, 204, 112, 0.18)", tilt: "1deg" },
  { glow: "rgba(54, 151, 88, 0.2)", tilt: "-0.5deg" },
];

const mobileHomeCopy: Record<string, MobileHomeCopy> = {
  "zh-CN": {
    featureBadge: "大厅",
    featureStatus: "今日入口",
    featureTitle: "今天先滑一张。",
    featureDescription: "先翻一张推荐活动。心动就约，不来电就继续滑。",
    featureKicker: "Friemi Hall",
    searchPlaceholder: "搜索活动、组局或朋友",
    categoriesTitle: "按心情找活动",
    categoriesDescription: "从饭局、展览、音乐到运动，找到今日份心动。",
    categories: [
      { category: "FOOD", image: "dining.png", label: "饭局" },
      { category: "WANDER", image: "wandering.png", label: "闲逛" },
      { category: "AUDIO_VISUAL", image: "movies.png", label: "视听" },
      { category: "ART", image: "art.png", label: "艺术" },
      { category: "BOARD_GAME", image: "board-games.png", label: "桌游" },
      { category: "GROWTH", image: "growth.png", label: "进步" },
      { category: "TRAVEL", image: "travel.png", label: "旅行" },
      { category: "MUSIC", image: "music.png", label: "音乐" },
      { category: "SPORTS", image: "sports.png", label: "运动" },
    ],
    createPlanLabel: "我要组局",
    activityEyebrow: "Live from Friemi",
    activityTitle: "从一次小局开始",
    activityDescription:
      "先看看大家正在约什么。卡片轻轻滑，今天的出门理由可能就在下一张。",
    activityCta: "先看看活动",
    carousel: {
      ariaLabel: "大厅精选活动轮播",
      emptyTitle: "近期活动正在整理中",
      emptyDescription: "有新的未开始活动后会显示在这里。",
      next: "下一组活动",
      previous: "上一组活动",
      viewActivity: "查看详情",
    },
    tabletHighlights: [
      { label: "滑一张", text: "先看今天最有感觉的那一局。" },
      { label: "按心情", text: "饭局、闲逛、视听，直接按状态选。" },
      { label: "约起来", text: "看到合适的，就把人聚起来。" },
    ],
  },
  en: {
    featureBadge: "Hall",
    featureStatus: "Today",
    featureTitle: "Start with one swipe.",
    featureDescription:
      "A quick way to see what is happening before opening the details.",
    featureKicker: "Friemi Hall",
    searchPlaceholder: "Search activities, crews, or friends",
    categoriesTitle: "Browse by mood",
    categoriesDescription:
      "Food, galleries, music, sports, and small city plans.",
    categories: [
      { category: "FOOD", image: "dining.png", label: "Food" },
      { category: "WANDER", image: "wandering.png", label: "Wander" },
      { category: "AUDIO_VISUAL", image: "movies.png", label: "Watch" },
      { category: "ART", image: "art.png", label: "Art" },
      { category: "BOARD_GAME", image: "board-games.png", label: "Games" },
      { category: "GROWTH", image: "growth.png", label: "Grow" },
      { category: "TRAVEL", image: "travel.png", label: "Trips" },
      { category: "MUSIC", image: "music.png", label: "Music" },
      { category: "SPORTS", image: "sports.png", label: "Sports" },
    ],
    createPlanLabel: "Start",
    activityEyebrow: "Live from Friemi",
    activityTitle: "Start with one small plan",
    activityDescription:
      "Swipe through what people are already making. The next card might be your reason to go out.",
    activityCta: "Browse activities",
    carousel: {
      ariaLabel: "Hall featured activities carousel",
      emptyTitle: "Fresh activities are being arranged",
      emptyDescription: "New upcoming activities will appear here.",
      next: "Next activities",
      previous: "Previous activities",
      viewActivity: "View details",
    },
    tabletHighlights: [
      { label: "Swipe", text: "Start from one plan that feels close." },
      { label: "Mood", text: "Food, walks, screens, and small rituals." },
      { label: "Gather", text: "When it clicks, bring people in." },
    ],
  },
  fr: {
    featureBadge: "Hall",
    featureStatus: "Aujourd'hui",
    featureTitle: "Commencez par swiper.",
    featureDescription:
      "Voyez les sorties en cours de préparation avant d'ouvrir le détail.",
    featureKicker: "Friemi Hall",
    searchPlaceholder: "Rechercher activités, groupes ou amis",
    categoriesTitle: "Explorer par envie",
    categoriesDescription:
      "Repas, expos, musique, sport et petites sorties en ville.",
    categories: [
      { category: "FOOD", image: "dining.png", label: "Repas" },
      { category: "WANDER", image: "wandering.png", label: "Balade" },
      { category: "AUDIO_VISUAL", image: "movies.png", label: "Écran" },
      { category: "ART", image: "art.png", label: "Art" },
      { category: "BOARD_GAME", image: "board-games.png", label: "Jeux" },
      { category: "GROWTH", image: "growth.png", label: "Progrès" },
      { category: "TRAVEL", image: "travel.png", label: "Voyage" },
      { category: "MUSIC", image: "music.png", label: "Musique" },
      { category: "SPORTS", image: "sports.png", label: "Sport" },
    ],
    createPlanLabel: "Lancer",
    activityEyebrow: "Live from Friemi",
    activityTitle: "Commencer par une petite sortie",
    activityDescription:
      "Faites défiler les idées déjà lancées. La prochaine carte peut devenir votre prétexte pour sortir.",
    activityCta: "Voir les activités",
    carousel: {
      ariaLabel: "Carrousel des activités du hall",
      emptyTitle: "Les prochaines activités arrivent",
      emptyDescription: "Les nouvelles activités à venir apparaîtront ici.",
      next: "Activités suivantes",
      previous: "Activités précédentes",
      viewActivity: "Voir le détail",
    },
    tabletHighlights: [
      { label: "Swiper", text: "Commencez par une sortie qui donne envie." },
      { label: "Envie", text: "Repas, balade, écran ou petit rituel." },
      { label: "Réunir", text: "Si ça vous parle, lancez le groupe." },
    ],
  },
};

export const dynamic = "force-dynamic";

function getMobileHomeCopy(locale: string) {
  return mobileHomeCopy[locale] ?? mobileHomeCopy["zh-CN"];
}

function getMobileHomeV23Copy(locale: string, viewerName: string | null) {
  if (locale === "fr") {
    return {
      greeting: viewerName ? `Bonsoir, ${viewerName}` : "Bonsoir",
      subtitle: "Qu'avez-vous envie de faire aujourd'hui ?",
      searchPlaceholder: "Rechercher activités ou personnes...",
      location: "Paris",
      cityOptions: [
        { label: "Paris", href: "/activities?city=Paris" },
        { label: "Pekin", href: "/activities?city=Beijing" },
        { label: "Shanghai", href: "/activities?city=Shanghai" },
      ],
      filters: [
        { href: "/activities", label: "Activités" },
        { href: "/lobby?tab=nearby", label: "Groupes proches" },
        { href: "/lobby?tab=today", label: "Aujourd'hui" },
        { href: "/lobby?tab=friends", label: "Groupes d'amis" },
      ],
      categoriesTitle: "Catégories populaires",
      topNewsTitle: "🔥 Top News",
      trendingTitle: "Tendance aujourd'hui",
      seeAll: "Voir tout",
      participantsLabel: "personnes",
      distanceFallback: "800m",
      newsCards: [
        {
          href: "/game-tools/werewolf",
          image: "/game-tools/werewolf/werewolf.jpeg",
          title: "Soirée loup-garou",
        },
        {
          href: "/game-tools",
          image: "/home/v2_1/friemi-home-v21-events-mood.jpg",
          title: "Outils de table",
        },
      ],
      fallbackCards: [
        {
          category: "BOARD_GAME",
          coverImageUrl: "/home/v2_1/friemi-home-v21-events-mood.jpg",
          href: "/lobby?tab=nearby&category=BOARD_GAME",
          meta: "6 / 8 personnes",
          title: "Soirée jeux",
        },
        {
          category: "MUSIC",
          coverImageUrl: "/home/v2_1/friemi-home-v21-friends-arrival.jpg",
          href: "/activities?category=MUSIC",
          meta: "2 amis y vont",
          title: "Jazz au parc",
        },
        {
          category: "FOOD",
          coverImageUrl: "/home/v2_1/friemi-home-v21-creator-hosting.jpg",
          href: "/lobby?tab=nearby&category=FOOD",
          meta: "4 / 6 personnes",
          title: "Café & discussion",
        },
      ],
      bottomNav: {
        home: "Accueil",
        hangout: "Groupes",
        create: "Créer",
        moment: "Activités",
        profile: "Profil",
      },
    };
  }

  if (locale === "en") {
    return {
      greeting: viewerName ? `Good evening, ${viewerName}!` : "Good evening!",
      subtitle: "What are you up to today?",
      searchPlaceholder: "Search activities or people...",
      location: "Paris",
      cityOptions: [
        { label: "Paris", href: "/activities?city=Paris" },
        { label: "Beijing", href: "/activities?city=Beijing" },
        { label: "Shanghai", href: "/activities?city=Shanghai" },
      ],
      filters: [
        { href: "/activities", label: "Activities" },
        { href: "/lobby?tab=nearby", label: "Nearby Hangouts" },
        { href: "/lobby?tab=today", label: "Today" },
        { href: "/lobby?tab=friends", label: "Friend Hangouts" },
      ],
      categoriesTitle: "Popular Categories",
      topNewsTitle: "🔥 Top News",
      trendingTitle: "Trending Today",
      seeAll: "See all",
      participantsLabel: "people",
      distanceFallback: "800m",
      newsCards: [
        {
          href: "/game-tools/werewolf",
          image: "/game-tools/werewolf/werewolf.jpeg",
          title: "Werewolf Night",
        },
        {
          href: "/game-tools",
          image: "/home/v2_1/friemi-home-v21-events-mood.jpg",
          title: "Board Game Tools",
        },
      ],
      fallbackCards: [
        {
          category: "BOARD_GAME",
          coverImageUrl: "/home/v2_1/friemi-home-v21-events-mood.jpg",
          href: "/lobby?tab=nearby&category=BOARD_GAME",
          meta: "6 / 8 people",
          title: "Board Game Night",
        },
        {
          category: "MUSIC",
          coverImageUrl: "/home/v2_1/friemi-home-v21-friends-arrival.jpg",
          href: "/activities?category=MUSIC",
          meta: "2 friends going",
          title: "Jazz in the Park",
        },
        {
          category: "FOOD",
          coverImageUrl: "/home/v2_1/friemi-home-v21-creator-hosting.jpg",
          href: "/lobby?tab=nearby&category=FOOD",
          meta: "4 / 6 people",
          title: "Cafe & Talk",
        },
      ],
      bottomNav: {
        home: "Home",
        hangout: "Hangout",
        create: "Create",
        moment: "Activity",
        profile: "Profile",
      },
    };
  }

  return {
    greeting: viewerName ? `晚上好，${viewerName}` : "晚上好",
    subtitle: "今天想做点什么？",
    searchPlaceholder: "搜索活动或用户...",
    location: "巴黎",
    cityOptions: [
      { label: "巴黎", href: "/activities?city=Paris" },
      { label: "北京", href: "/activities?city=Beijing" },
      { label: "上海", href: "/activities?city=Shanghai" },
    ],
    filters: [
      { href: "/activities", label: "发现活动" },
      { href: "/lobby?tab=nearby", label: "附近组局" },
      { href: "/lobby?tab=today", label: "今日组局" },
      { href: "/lobby?tab=friends", label: "好友组局" },
    ],
    categoriesTitle: "热门分类",
    topNewsTitle: "🔥 Top News",
    trendingTitle: "今日热门",
    seeAll: "查看全部",
    participantsLabel: "人",
    distanceFallback: "800m",
    newsCards: [
      {
        href: "/game-tools/werewolf",
        image: "/game-tools/werewolf/werewolf.jpeg",
        title: "今晚狼人杀",
      },
      {
        href: "/game-tools",
        image: "/home/v2_1/friemi-home-v21-events-mood.jpg",
        title: "桌游工具",
      },
    ],
    fallbackCards: [
      {
        category: "BOARD_GAME",
        coverImageUrl: "/home/v2_1/friemi-home-v21-events-mood.jpg",
        href: "/lobby?tab=nearby&category=BOARD_GAME",
        meta: "6 / 8 人",
        title: "今晚桌游局",
      },
      {
        category: "MUSIC",
        coverImageUrl: "/home/v2_1/friemi-home-v21-friends-arrival.jpg",
        href: "/activities?category=MUSIC",
        meta: "2 位好友参加",
        title: "公园爵士",
      },
      {
        category: "FOOD",
        coverImageUrl: "/home/v2_1/friemi-home-v21-creator-hosting.jpg",
        href: "/lobby?tab=nearby&category=FOOD",
        meta: "4 / 6 人",
        title: "咖啡聊天",
      },
    ],
    bottomNav: {
      home: "大厅",
      hangout: "组局",
      create: "发布",
      moment: "活动",
      profile: "主页",
    },
  };
}

export async function generateMetadata({
  params,
}: MobileHomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const mobile = getMobileHomeCopy(locale);
  const baseUrl = getCanonicalMetadataBaseUrl();

  return {
    ...buildPageShareMetadata({
      baseUrl,
      description: getGeneralPageShareDescription(locale),
      path: withLocale(locale, "/home"),
      title: `${brand.name} · ${mobile.featureBadge}`,
    }),
    robots: {
      follow: true,
      index: false,
    },
  };
}

export default async function MobileHomePage({ params }: MobileHomePageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/mobile-home",
  });
  const [activitiesResult, viewerProfile] = await perf.measure(
    "mobileHome.bootstrap",
    () =>
      Promise.all([
        getLobbySwipePublicEventActivities(null, { limit: 8 })
          .then((swipeActivities) => ({
            error: null,
            swipeActivities,
          }))
          .catch((error: unknown) => {
            console.error("Failed to load mobile home activities", error);
            return { error, swipeActivities: [] };
          }),
        getOptionalCurrentUserProfileSnapshot().catch((error: unknown) => {
          console.error("Failed to load mobile home viewer profile", error);
          return null;
        }),
      ]),
  );

  perf.finish({
    hasActivityError: Boolean(activitiesResult.error),
    hasViewer: Boolean(viewerProfile),
    swipeCount: activitiesResult.swipeActivities.length,
  });

  return (
    <>
      <HomeLuxuryMotion />
      <main className="overflow-x-hidden bg-[#FEFFF9] text-[#1D1D1B]">
        <MobileHomeV23Experience
          locale={locale}
          swipeActivities={activitiesResult.swipeActivities}
          viewerName={viewerProfile?.nickname ?? null}
        />
        <div className="hidden md:block">
          <MobileHomeExperience
            locale={locale}
            swipeActivities={activitiesResult.swipeActivities}
          />
        </div>
      </main>
    </>
  );
}

function getMobileHomeActivityHref(
  activity: ActivityCardViewModel,
  locale: string,
) {
  if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function MobileHomeV23Experience({
  locale,
  swipeActivities,
  viewerName,
}: MobileHomeV23ExperienceProps) {
  const copy = getMobileHomeV23Copy(locale, viewerName);
  const categories = getMobileHomeCopy(locale).categories;
  const newsActivities = swipeActivities.slice(0, 2);
  const trendingActivities = swipeActivities.slice(2, 8);

  return (
    <section className="mobile-v23-home min-h-[100svh] bg-[#FEFFF9] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.15rem)] text-[#111210] md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col px-5">
        <header className="flex min-h-[6.75rem] items-start justify-between gap-4 pt-2">
          <Link
            href={withLocale(locale, "/home?view=desktop")}
            className="mt-2 inline-flex shrink-0"
            aria-label="Friemi"
          >
            <BrandLockup className="h-10 w-[8.4rem]" priority size="md" />
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1.5 pt-4">
            <MobileHomeV23CitySelector
              cityOptions={copy.cityOptions}
              currentCity={copy.location}
              locale={locale}
            />
            <MobileHomeV23NotificationLink locale={locale} />
          </div>
        </header>

        <section className="pt-2">
          <h1 className="text-[26px] font-black leading-tight tracking-normal text-[#111210]">
            {copy.greeting}
          </h1>
          <p className="mt-1 text-[15px] font-medium leading-6 text-[#111210]/72">
            {copy.subtitle}
          </p>

          <GlobalSearchForm
            inputId="mobile-home-v23-search"
            locale={locale}
            placeholder={copy.searchPlaceholder}
            variant="page"
            className="mt-6 w-full [&_button]:right-2 [&_button]:h-10 [&_button]:w-10 [&_input]:h-[3.55rem] [&_input]:rounded-[1.05rem] [&_input]:border-[#D7D5C8] [&_input]:bg-white [&_input]:pr-14 [&_input]:text-[15px] [&_input]:font-semibold [&_input]:shadow-[0_18px_38px_rgba(23,36,28,0.06)] [&_input]:placeholder:text-[#111210]/46 [&_svg]:left-4 [&_svg]:text-[#111210]/44"
          />

          <div className="mt-5 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {copy.filters.map((filter, index) => (
              <Link
                key={filter.label}
                href={withLocale(locale, filter.href)}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-[14px] font-extrabold shadow-[0_10px_22px_rgba(21,98,64,0.07)] ring-1 transition active:scale-[0.96]",
                  index === 0
                    ? "bg-[#096B45] text-white ring-[#096B45]"
                    : "bg-white text-[#123D31] ring-[#D7D5C8]",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-[17px] font-black tracking-normal text-[#111210]">
            {copy.categoriesTitle}
          </h2>
          <MobileHomeV23CategoryCarousel
            categories={categories}
            locale={locale}
          />
        </section>

        <section className="mt-4">
          <h2 className="text-[19px] font-black tracking-normal text-[#064133]">
            {copy.topNewsTitle}
          </h2>
          <div className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newsActivities.length > 0
              ? newsActivities.map((activity, index) => (
                  <MobileHomeV23NewsActivityCard
                    activity={activity}
                    key={`${activity.type}:${activity.id}:news`}
                    locale={locale}
                    priority={index === 0}
                  />
                ))
              : copy.newsCards.map((card) => (
                  <MobileHomeV23NewsCard
                    href={withLocale(locale, card.href)}
                    image={card.image}
                    key={card.href}
                    title={card.title}
                  />
                ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-black tracking-normal text-[#111210]">
              {copy.trendingTitle}
            </h2>
            <Link
              href={withLocale(locale, "/lobby")}
              className="text-[13px] font-extrabold text-[#096B45]"
            >
              {copy.seeAll}
            </Link>
          </div>

          <div className="-mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trendingActivities.length > 0
              ? trendingActivities
                  .slice(0, 5)
                  .map((activity) => (
                    <MobileHomeV23ActivityCard
                      activity={activity}
                      key={`${activity.type}:${activity.id}`}
                      locale={locale}
                      participantsLabel={copy.participantsLabel}
                    />
                  ))
              : copy.fallbackCards.map((card) => (
                  <MobileHomeV23FallbackCard
                    card={card}
                    key={card.title}
                    locale={locale}
                  />
                ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MobileHomeV23NewsCard({
  href,
  image,
  title,
}: {
  href: string;
  image: string;
  title: string;
}) {
  return (
    <IntentPrefetchLink
      href={href}
      prefetchOnVisible
      className="group relative h-[10.55rem] min-w-[19.7rem] snap-start overflow-hidden rounded-[1.18rem] bg-[#123D31] shadow-[0_18px_34px_rgba(18,61,49,0.12)]"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="320px"
        className="object-cover transition duration-500 group-active:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/34 via-transparent to-black/8" />
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#123D31] shadow-sm">
        {title}
      </span>
    </IntentPrefetchLink>
  );
}

function MobileHomeV23NewsActivityCard({
  activity,
  locale,
  priority = false,
}: {
  activity: ActivityCardViewModel;
  locale: string;
  priority?: boolean;
}) {
  return (
    <IntentPrefetchLink
      href={getMobileHomeActivityHref(activity, locale)}
      prefetchOnVisible
      className="group relative h-[10.55rem] min-w-[19.7rem] snap-start overflow-hidden rounded-[1.18rem] bg-[#123D31] shadow-[0_18px_34px_rgba(18,61,49,0.12)]"
    >
      <ActivityCoverImage
        alt={activity.title}
        src={activity.coverImageUrl}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        overlayClassName="bg-gradient-to-t from-black/54 via-black/12 to-black/4"
      />
      <div className="absolute bottom-3 left-3 right-3">
        <span className="inline-flex max-w-full rounded-full bg-white/92 px-3 py-1 text-[11px] font-extrabold text-[#123D31] shadow-sm">
          <span className="truncate">
            {getCategoryLabel(activity.category, locale)}
          </span>
        </span>
        <h3 className="mt-2 line-clamp-2 text-[17px] font-black leading-5 tracking-normal text-white drop-shadow-sm">
          {activity.title}
        </h3>
      </div>
    </IntentPrefetchLink>
  );
}

function MobileHomeV23CitySelector({
  cityOptions,
  currentCity,
  locale,
}: {
  cityOptions: ReturnType<typeof getMobileHomeV23Copy>["cityOptions"];
  currentCity: string;
  locale: string;
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 min-w-0 cursor-pointer list-none items-center gap-1 rounded-full bg-white/78 px-2.5 text-[13px] font-extrabold text-[#123D31] shadow-[0_10px_24px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]/62 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35 [&::-webkit-details-marker]:hidden">
        <MapPin className="h-3.5 w-3.5 shrink-0 fill-[#F56D62] text-[#F56D62]" />
        <span className="max-w-[4.4rem] truncate">{currentCity}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-[#123D31]/72 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-11 z-[60] grid min-w-[8.5rem] gap-1 rounded-[1rem] border border-[#D7D5C8] bg-white p-1.5 shadow-[0_18px_36px_rgba(17,18,16,0.12)]">
        {cityOptions.map((city) => (
          <Link
            key={city.label}
            href={withLocale(locale, city.href)}
            className="rounded-[0.75rem] px-3 py-2 text-[13px] font-extrabold text-[#123D31] transition hover:bg-[#F5F4EC]"
          >
            {city.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function MobileHomeV23ActivityCard({
  activity,
  locale,
  participantsLabel,
}: {
  activity: ActivityCardViewModel;
  locale: string;
  participantsLabel: string;
}) {
  const participantLabel =
    activity.capacity > 0
      ? `${activity.participantCount}/${activity.capacity}`
      : `${activity.participantCount}`;

  return (
    <IntentPrefetchLink
      href={getMobileHomeActivityHref(activity, locale)}
      prefetchOnVisible
      className="group w-[9.35rem] shrink-0 snap-start overflow-hidden rounded-[0.72rem] border border-[#D7D5C8] bg-white shadow-[0_12px_24px_rgba(23,36,28,0.06)]"
    >
      <div className="relative h-[5.15rem] overflow-hidden bg-[#F1F2EC]">
        <ActivityCoverImage
          alt={activity.title}
          src={activity.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/28 to-transparent"
        />
        <span className="absolute right-2 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur-sm">
          <Heart className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-h-[5.1rem] px-2.5 pb-2.5 pt-2">
        <h3 className="line-clamp-2 text-[12px] font-black leading-4 text-[#111210]">
          {activity.title}
        </h3>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#096B45]">
          <UsersRound className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {participantLabel} {participantsLabel}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#111210]/62">
          <Clock3 className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {getActivityDateLabel(activity, locale)}
          </span>
        </p>
      </div>
    </IntentPrefetchLink>
  );
}

function MobileHomeV23FallbackCard({
  card,
  locale,
}: {
  card: ReturnType<typeof getMobileHomeV23Copy>["fallbackCards"][number];
  locale: string;
}) {
  return (
    <IntentPrefetchLink
      href={withLocale(locale, card.href)}
      prefetchOnVisible
      className="group w-[9.35rem] shrink-0 snap-start overflow-hidden rounded-[0.72rem] border border-[#D7D5C8] bg-white shadow-[0_12px_24px_rgba(23,36,28,0.06)]"
    >
      <div className="relative h-[5.15rem] overflow-hidden bg-[#F1F2EC]">
        <Image
          src={card.coverImageUrl}
          alt=""
          fill
          sizes="150px"
          className="object-cover transition duration-500 group-active:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/24 to-transparent" />
        <span className="absolute right-2 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur-sm">
          <Heart className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="min-h-[5.1rem] px-2.5 pb-2.5 pt-2">
        <h3 className="line-clamp-2 text-[12px] font-black leading-4 text-[#111210]">
          {card.title}
        </h3>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#096B45]">
          <UsersRound className="h-3 w-3 shrink-0" />
          <span className="truncate">{card.meta}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#111210]/62">
          <Clock3 className="h-3 w-3 shrink-0" />
          <span>
            {getCategoryLabel(
              card.category as ActivityCardViewModel["category"],
              locale,
            )}
          </span>
        </p>
      </div>
    </IntentPrefetchLink>
  );
}

function MobileHomeExperience({
  locale,
  swipeActivities,
}: MobileHomeExperienceProps) {
  const mobile = getMobileHomeCopy(locale);

  return (
    <section className="mobile-home-viewport relative isolate flex min-h-[calc(100svh-10.85rem-env(safe-area-inset-bottom))] overflow-visible bg-[#FEFFF9] px-3.5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-1.5 min-[390px]:px-4 min-[390px]:pt-2.5 md:min-h-[calc(100svh-4rem)] md:items-start md:px-6 md:pb-8 md:pt-[clamp(1.25rem,3.4svh,2.75rem)] lg:pb-10 lg:pt-[clamp(1.75rem,4.4svh,3.5rem)]">
      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-11.35rem-env(safe-area-inset-bottom))] w-full max-w-md min-w-0 grid-cols-1 gap-1.5 min-[390px]:gap-2 md:min-h-0 md:max-w-6xl md:grid-cols-[minmax(0,1.02fr)_minmax(20rem,0.82fr)] md:items-start md:gap-x-8 md:gap-y-5 lg:max-w-7xl lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.78fr)] lg:gap-x-12 xl:gap-x-16">
        <div className="contents md:flex md:min-w-0 md:flex-col md:justify-start md:gap-5 lg:gap-7">
          <div
            className="hidden md:block"
            data-home-reveal="up"
            style={
              {
                "--home-reveal-delay": "40ms",
              } as CSSProperties
            }
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.42em] text-forest">
              {mobile.featureKicker}
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-[clamp(3.3rem,7vw,6.7rem)] leading-[0.9] text-[#0E2A66]">
              {mobile.featureBadge}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#156240] lg:text-lg">
              {mobile.featureDescription}
            </p>
          </div>

          <div
            className="order-2 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:order-none md:max-w-2xl lg:gap-3"
            data-home-reveal="up"
            style={
              {
                "--home-reveal-delay": "80ms",
              } as CSSProperties
            }
          >
            <GlobalSearchForm
              inputId="mobile-home-global-search"
              locale={locale}
              variant="header"
              className="w-full [&_button]:right-1 [&_input]:h-10 [&_input]:border-[#D6D5B2] [&_input]:bg-[#FEFFF9]/90 [&_input]:text-xs [&_input]:font-semibold [&_input]:text-forest [&_input]:shadow-[0_12px_28px_rgba(21,98,64,0.1)] [&_input]:placeholder:text-[#156240]/80 md:[&_input]:h-12 md:[&_input]:text-sm"
            />

            <Link
              href={withLocale(locale, "/activities/new")}
              className="mobile-home-quick-action inline-flex h-10 min-w-[5.35rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-coral px-3 text-[11px] font-extrabold leading-none text-white transition hover:-translate-y-0.5 active:scale-[0.94] md:h-12 md:min-w-[7.2rem] md:px-4 md:text-sm"
              title={mobile.createPlanLabel}
            >
              <CalendarPlus
                className="h-4 w-4 shrink-0 md:h-5 md:w-5"
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {mobile.createPlanLabel}
              </span>
            </Link>
          </div>

          <section
            className="order-3 min-h-[var(--mobile-home-category-area-height)] flex-1 px-0 pb-0 pt-0 min-[390px]:px-0.5 min-[390px]:pb-0.5 min-[390px]:pt-0.5 md:order-none md:min-h-0 md:px-0 md:pb-0 md:pt-0"
            data-home-reveal="up"
            style={
              {
                "--home-reveal-delay": "150ms",
              } as CSSProperties
            }
          >
            <div className="mobile-home-category-grid grid h-full min-h-[var(--mobile-home-category-area-height)] grid-cols-3 grid-rows-[repeat(3,minmax(0,max-content))] content-start gap-x-0 pt-[var(--mobile-home-category-offset)] min-[390px]:gap-x-1 md:min-h-0 md:grid-cols-3 md:gap-x-3 md:gap-y-3 md:pt-0 lg:grid-cols-5 lg:gap-4">
              {mobile.categories.map((category, index) => (
                <Link
                  key={`${category.category}-${category.label}-${index}`}
                  href={withLocale(
                    locale,
                    `/lobby?tab=nearby&category=${category.category}`,
                  )}
                  className="mobile-home-category group flex min-h-0 min-w-0 flex-col items-center justify-center text-center md:rounded-[1.45rem] md:bg-[#FEFFF9]/68 md:px-3 md:py-3 md:shadow-[0_16px_34px_rgba(21,98,64,0.08)] md:ring-1 md:ring-[#D6D5B2]/65 md:backdrop-blur-sm md:transition md:hover:-translate-y-1 md:hover:bg-white/88 md:hover:shadow-[0_22px_44px_rgba(21,98,64,0.13)]"
                  style={
                    {
                      "--mobile-home-accent":
                        mobileHomeCategoryAccents[index]?.glow ??
                        "rgba(54, 151, 88, 0.18)",
                      "--mobile-home-delay": `${150 + index * 42}ms`,
                      "--mobile-home-tilt":
                        mobileHomeCategoryAccents[index]?.tilt ?? "0deg",
                    } as CSSProperties & {
                      "--mobile-home-accent": string;
                      "--mobile-home-delay": string;
                      "--mobile-home-tilt": string;
                    }
                  }
                >
                  <span className="mobile-home-category__art relative mx-auto flex aspect-square h-[var(--mobile-home-category-art-size)] max-h-full items-center justify-center rounded-[1.55rem] p-1 transition-transform duration-300 ease-out group-hover:scale-[1.04] group-active:scale-90">
                    <Image
                      src={getMobileHomeIllustrationSrc(category.image)}
                      alt=""
                      width={96}
                      height={96}
                      className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(21,98,64,0.15)] transition duration-300 ease-out group-active:scale-95"
                    />
                  </span>
                  <span className="mobile-home-category__label">
                    {category.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div
            className="mobile-home-tablet-highlights grid-cols-3 gap-2"
            data-home-reveal="up"
            style={
              {
                "--home-reveal-delay": "210ms",
              } as CSSProperties
            }
          >
            {mobile.tabletHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.25rem] border border-[#D6D5B2]/70 bg-[#FEFFF9]/72 px-3 py-3 shadow-[0_14px_28px_rgba(21,98,64,0.08)] backdrop-blur-sm"
              >
                <p className="text-xs font-extrabold text-[#156240]">
                  {item.label}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#156240]/78">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <section
          className="mobile-home-recommendation relative order-1 shrink-0 pt-1 md:order-none md:col-start-2 md:self-start md:pt-6 lg:pt-7"
          data-home-reveal="up"
        >
          <LazyLobbySwipeDiscovery
            className="border-transparent bg-transparent p-0"
            favoriteRedirectPath="/mobile-home"
            initialActivities={swipeActivities}
            isAuthenticated={false}
            locale={locale}
            variant="home"
          />
        </section>

        <section
          className="mobile-home-tall-tablet-fill md:col-span-2"
          data-home-reveal="up"
          style={
            {
              "--home-reveal-delay": "260ms",
            } as CSSProperties
          }
        >
          <div className="relative grid min-h-[clamp(18.5rem,34svh,29rem)] overflow-hidden rounded-[2rem] border border-[#D6D5B2]/72 bg-[#F1F2EC] p-5 shadow-[0_18px_46px_rgba(21,98,64,0.1)] backdrop-blur-sm md:grid-cols-[minmax(13rem,0.42fr)_minmax(0,1fr)] md:items-center md:gap-5">
            <div
              className="absolute inset-0 bg-[linear-gradient(90deg,rgba(254,255,249,0.82),rgba(254,255,249,0.42)_42%,rgba(214,213,178,0.32))]"
              aria-hidden="true"
            />
            <div
              className="absolute inset-y-0 left-0 w-[45%] bg-[linear-gradient(90deg,rgba(254,255,249,0.92),rgba(254,255,249,0.22))]"
              aria-hidden="true"
            />
            <div className="absolute inset-0 opacity-[0.13]" aria-hidden="true">
              <Image
                src="/home/v2_1/friemi-home-v21-events-mood.jpg"
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <div className="relative min-w-0 self-center">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#156240]">
                {mobile.activityEyebrow}
              </p>
              <h2 className="mt-3 max-w-[15rem] font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[0.95] text-[#1D1D1B]">
                {mobile.activityTitle}
              </h2>
              <p className="mt-4 max-w-[16rem] text-[12px] leading-6 text-[#156240]">
                {mobile.activityDescription}
              </p>
              <Link
                href={withLocale(locale, "/activities")}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#8AB68E] bg-[#FFF5E6]/82 px-3 text-xs font-semibold text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/40"
              >
                {mobile.activityCta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="relative min-w-0 self-center">
              <HomeActivityCarousel
                activities={swipeActivities}
                density="desktop"
                labels={mobile.carousel}
                locale={locale}
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
