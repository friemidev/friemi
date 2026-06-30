import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { LazyLobbySwipeDiscovery } from "@/features/activities/components/ActivityLobbyView";
import { getLobbySwipePublicEventActivities } from "@/features/activities/queries/getActivityLobby";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { HomeActivityCarousel } from "@/features/home/components/HomeActivityCarousel";
import { HomeLuxuryMotion } from "@/features/home/components/HomeLuxuryMotion";
import { GlobalSearchForm } from "@/features/search/components/GlobalSearchForm";
import { brand } from "@/lib/brand";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getGeneralPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

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

export async function generateMetadata({
  params,
}: MobileHomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const mobile = getMobileHomeCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: getGeneralPageShareDescription(locale),
    path: withLocale(locale, "/mobile-home"),
    title: `${brand.name} · ${mobile.featureBadge}`,
  });
}

export default async function MobileHomePage({ params }: MobileHomePageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/mobile-home",
  });
  const activitiesResult = await perf.measure("mobileHome.activities", () =>
    getLobbySwipePublicEventActivities(null, { limit: 8 })
      .then((swipeActivities) => ({
        error: null,
        swipeActivities,
      }))
      .catch((error: unknown) => {
        console.error("Failed to load mobile home activities", error);
        return { error, swipeActivities: [] };
      }),
  );

  perf.finish({
    hasActivityError: Boolean(activitiesResult.error),
    swipeCount: activitiesResult.swipeActivities.length,
  });

  return (
    <>
      <HomeLuxuryMotion />
      <main className="overflow-x-hidden bg-[#FEFFF9] text-[#1D1D1B]">
        <MobileHomeExperience
          locale={locale}
          swipeActivities={activitiesResult.swipeActivities}
        />
      </main>
    </>
  );
}

function MobileHomeExperience({
  locale,
  swipeActivities,
}: MobileHomeExperienceProps) {
  const mobile = getMobileHomeCopy(locale);

  return (
    <section className="mobile-home-viewport relative isolate flex min-h-[calc(100svh-10.85rem-env(safe-area-inset-bottom))] overflow-visible bg-[#FEFFF9] px-3.5 pb-3 pt-1.5 min-[390px]:px-4 min-[390px]:pt-2.5 md:min-h-[calc(100svh-4rem)] md:items-start md:px-6 md:pb-8 md:pt-[clamp(1.25rem,3.4svh,2.75rem)] lg:pb-10 lg:pt-[clamp(1.75rem,4.4svh,3.5rem)]">
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
            className="order-1 min-h-[var(--mobile-home-category-area-height)] flex-1 px-0 pb-0 pt-0 min-[390px]:px-0.5 min-[390px]:pb-0.5 min-[390px]:pt-0.5 md:order-none md:min-h-0 md:px-0 md:pb-0 md:pt-0"
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
                    `/lobby?category=${category.category}`,
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
                    <span className="mobile-home-category__label">
                      {category.label}
                    </span>
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
          className="relative order-3 shrink-0 pt-1 md:order-none md:col-start-2 md:self-start md:pt-6 lg:pt-7"
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
