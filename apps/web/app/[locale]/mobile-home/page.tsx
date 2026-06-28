import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { CalendarPlus, Compass, Search } from "lucide-react";
import { LazyLobbySwipeDiscovery } from "@/features/activities/components/ActivityLobbyView";
import { getLobbySwipePublicEventActivities } from "@/features/activities/queries/getActivityLobby";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { HomeLuxuryMotion } from "@/features/home/components/HomeLuxuryMotion";
import { brand } from "@/lib/brand";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getGeneralPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";
import { cn } from "@/lib/utils";

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
  quickLinks: {
    href: string;
    label: string;
    tone: "coral" | "green";
  }[];
};

type MobileHomeExperienceProps = {
  locale: string;
  swipeActivities: ActivityCardViewModel[];
};

const mobileHomeIllustrationPath = "/illustrations/png";
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
    featureDescription: "把正在发生的活动放在最前面，看到心动的再进入详情。",
    featureKicker: "Friemi Hall",
    searchPlaceholder: "搜索活动、组局或朋友",
    categoriesTitle: "按心情找活动",
    categoriesDescription: "从饭局、展览、音乐到运动，用插画先找到今天的方向。",
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
    quickLinks: [
      { href: "/activities", label: "发现活动", tone: "green" },
      { href: "/activities/new", label: "发起组局", tone: "coral" },
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
    quickLinks: [
      { href: "/activities", label: "Activities", tone: "green" },
      { href: "/activities/new", label: "Start a plan", tone: "coral" },
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
    quickLinks: [
      { href: "/activities", label: "Activités", tone: "green" },
      { href: "/activities/new", label: "Lancer", tone: "coral" },
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
      <main className="overflow-hidden bg-[#FEFFF9] text-[#1D1D1B]">
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
    <>
      <div className="md:hidden">
        <section className="relative isolate flex h-[calc(100svh-9.15rem-env(safe-area-inset-bottom))] min-h-[31rem] overflow-hidden bg-[linear-gradient(180deg,#FEFFF9_0%,rgba(241,242,227,0.34)_52%,#FEFFF9_100%)] px-4 py-3">
          <div
            className="absolute -right-24 top-0 z-0 h-[21rem] w-[15rem] rounded-[4rem] bg-[linear-gradient(180deg,rgba(54,151,88,0.18),rgba(222,235,255,0.18)_58%,rgba(254,255,249,0.1))] opacity-80 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute -right-16 top-40 z-0 h-44 w-44 rounded-full bg-coral/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -left-20 bottom-10 z-0 h-48 w-48 rounded-full bg-ice/55 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-md min-w-0 flex-col gap-2.5">
            <section className="relative shrink-0" data-home-reveal="up">
              <LazyLobbySwipeDiscovery
                className="border-transparent bg-transparent p-0"
                favoriteRedirectPath="/mobile-home"
                initialActivities={swipeActivities}
                isAuthenticated={false}
                locale={locale}
                variant="home"
              />
            </section>

            <div
              className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5"
              data-home-reveal="up"
              style={
                {
                  "--home-reveal-delay": "80ms",
                } as CSSProperties
              }
            >
              <Link
                href={withLocale(locale, "/activities")}
                className="mobile-home-search flex h-10 min-w-0 items-center gap-2 rounded-full px-3 text-xs font-semibold text-forest"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  {mobile.searchPlaceholder}
                </span>
              </Link>

              {mobile.quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={withLocale(locale, item.href)}
                  className={cn(
                    "mobile-home-quick-action inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[11px] font-bold transition active:scale-[0.94]",
                    item.tone === "coral"
                      ? "bg-coral text-white"
                      : "bg-ice text-forest",
                  )}
                  title={item.label}
                >
                  {item.tone === "coral" ? (
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">{item.label}</span>
                </Link>
              ))}
            </div>

            <section
              className="min-h-0 flex-1 px-1 pt-2.5"
              data-home-reveal="up"
              style={
                {
                  "--home-reveal-delay": "150ms",
                } as CSSProperties
              }
            >
              <div className="grid h-full min-h-0 grid-cols-3 grid-rows-3 gap-x-2 gap-y-0">
                {mobile.categories.map((category, index) => (
                  <Link
                    key={`${category.category}-${category.label}-${index}`}
                    href={withLocale(
                      locale,
                      `/lobby?category=${category.category}`,
                    )}
                    className="mobile-home-category group flex min-h-0 min-w-0 flex-col items-center justify-center text-center"
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
                    <span className="mobile-home-category__art relative mx-auto flex aspect-square h-[clamp(3.4rem,9.8svh,6.05rem)] max-h-full items-center justify-center rounded-[1.55rem] p-1 transition-transform duration-300 ease-out group-active:scale-90">
                      <Image
                        src={`${mobileHomeIllustrationPath}/${category.image}`}
                        alt=""
                        width={96}
                        height={96}
                        className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(21,98,64,0.15)] transition duration-300 ease-out group-active:scale-95"
                      />
                    </span>
                    <span className="mt-0.5 block max-w-full truncate rounded-full bg-[#FEFFF9]/44 px-1.5 text-[10.5px] font-extrabold leading-tight text-forest drop-shadow-[0_1px_0_rgba(254,255,249,0.8)]">
                      {category.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#156240]">
            Friemi Hall
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-[#1D1D1B]">
            {mobile.featureBadge}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#156240]">
            {mobile.featureDescription}
          </p>
          <Link
            href={withLocale(locale, "/home")}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-semibold text-white transition hover:bg-[#369758]"
          >
            {brand.name}
          </Link>
        </section>
      </div>
    </>
  );
}
