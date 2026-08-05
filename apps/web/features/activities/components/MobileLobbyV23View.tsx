"use client";

import Image from "next/image";
import Link from "next/link";
import type { ActivityCategory } from "@chill-club/shared";
import type { CSSProperties } from "react";
import {
  ChevronRight,
  Clock3,
  CircleEllipsis,
  Dice5,
  Dumbbell,
  Film,
  Footprints,
  LayoutGrid,
  MapPin,
  Music2,
  Palette,
  Plane,
  Rows3,
  Sprout,
  Utensils,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { ActivitySwipeDiscovery } from "@/features/activities/components/ActivitySwipeDiscovery";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { getActivityDateLabel } from "@/features/activities/utils/activityDisplay";
import { activityCategoryOptions } from "@/features/activities/utils/activityFilters";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { activityCategoryIllustrationImages } from "@/features/activities/utils/activityCategoryVisuals";
import { getCategoryLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type MobileLobbyV23TabId =
  | "nearby"
  | "friends"
  | "today"
  | "popular"
  | "mine";

type MobileLobbyV23ViewProps = {
  activeTab: MobileLobbyV23TabId;
  activities: ActivityCardViewModel[];
  friendActivities?: ActivityCardViewModel[];
  initialCategoryFilter?: ActivityCategory | null;
  initialFreeOnly?: boolean;
  isSignedIn: boolean;
  locale: string;
  mineActivities?: ActivityCardViewModel[];
  swipeActivities?: ActivityCardViewModel[];
  viewerProfileId?: string | null;
};

type MobileLobbyV23CategoryFilterId = ActivityCategory | "all";

type MobileLobbyV23CategoryFilterOption = {
  Icon: LucideIcon;
  id: MobileLobbyV23CategoryFilterId;
  image?: string;
  label: string;
};

type MobileLobbyV23Copy = {
  emptyDescription: string;
  emptyTitle: string;
  friendEmptyTitle: string;
  friendEmptyDescription: string;
  friendGoing: (count: number) => string;
  loadingLabel: string;
  loadFailedTitle: string;
  mineEmptyTitle: string;
  mineEmptyDescription: string;
  hostedBadge: string;
  participants: string;
  retryLabel: string;
  tabs: Record<MobileLobbyV23TabId, string>;
  title: string;
};

const mobileLobbyV23Tabs: MobileLobbyV23TabId[] = [
  "nearby",
  "mine",
  "friends",
  "today",
  "popular",
];
const publicMobileLobbyV23Tabs = mobileLobbyV23Tabs.filter(
  (tab) => tab !== "mine" && tab !== "friends",
);
const mobileLobbySparseResultThreshold = 3;
const mobileLobbySwipePreviewLimit = 8;
const mobileLobbyFriendPrefetchDelayMs = 1200;
const mobileLobbyFriendSectionIds = ["friendJoined", "friendHosted"] as const;

type MobileLobbyFriendSectionId = (typeof mobileLobbyFriendSectionIds)[number];

type MobileLobbySectionResponse = {
  activities?: ActivityCardViewModel[];
  ok: boolean;
};

const mobileLobbyV23CategoryIcons = {
  FOOD: Utensils,
  WANDER: Footprints,
  AUDIO_VISUAL: Film,
  ART: Palette,
  BOARD_GAME: Dice5,
  GROWTH: Sprout,
  TRAVEL: Plane,
  MUSIC: Music2,
  SPORTS: Dumbbell,
  OTHER: CircleEllipsis,
} satisfies Record<ActivityCategory, LucideIcon>;

function getMobileLobbyAllLabel(locale: string) {
  if (locale === "fr") {
    return "Tout";
  }

  if (locale === "en") {
    return "All";
  }

  return "全部";
}

function getMobileLobbyCategoryFilterLabel(locale: string) {
  if (locale === "fr") {
    return "Types";
  }

  if (locale === "en") {
    return "Types";
  }

  return "分类";
}

function syncMobileLobbyTabSearchParam({
  category,
  freeOnly,
  tab,
}: {
  category: MobileLobbyV23CategoryFilterId;
  freeOnly?: boolean;
  tab: MobileLobbyV23TabId;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  url.searchParams.set("tab", tab);

  if (freeOnly) {
    url.searchParams.set("price", "free");
  } else {
    url.searchParams.delete("price");
  }

  if (category !== "all") {
    url.searchParams.set("category", category);
  } else {
    url.searchParams.delete("category");
  }

  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextHref !== currentHref) {
    window.history.replaceState(window.history.state, "", nextHref);
  }
}

function syncMobileLobbyCategorySearchParam(
  typeFilter: MobileLobbyV23CategoryFilterId,
) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (typeFilter === "all") {
    url.searchParams.delete("category");
  } else {
    url.searchParams.set("category", typeFilter);
  }

  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextHref !== currentHref) {
    window.history.replaceState(window.history.state, "", nextHref);
  }
}

function isFreeMobileLobbyActivity(activity: ActivityCardViewModel) {
  const priceText = activity.priceText.trim().toLowerCase();

  return (
    priceText.length === 0 ||
    priceText === "0" ||
    priceText === "free" ||
    priceText === "gratuit" ||
    priceText === "免费" ||
    priceText.includes("gratuit") ||
    priceText.includes("free")
  );
}

function getMobileLobbyV23Copy(locale: string): MobileLobbyV23Copy {
  if (locale === "fr") {
    return {
      emptyDescription: "Les nouvelles sorties apparaîtront ici.",
      emptyTitle: "Aucun groupe pour le moment",
      friendEmptyTitle: "Aucune sortie suivie",
      friendEmptyDescription:
        "Connectez-vous pour voir les sorties des personnes que vous suivez.",
      friendGoing: (count) => `${count} suivi${count > 1 ? "s" : ""}`,
      loadingLabel: "Chargement...",
      loadFailedTitle: "Chargement impossible",
      mineEmptyTitle: "Aucune de vos sorties",
      mineEmptyDescription:
        "Connectez-vous pour voir les sorties que vous organisez ou rejoignez.",
      hostedBadge: "Créé",
      participants: "pers.",
      retryLabel: "Réessayer",
      tabs: {
        nearby: "Proche",
        friends: "Suivis",
        today: "Aujourd'hui",
        popular: "Populaire",
        mine: "Les miens",
      },
      title: "Groupes",
    };
  }

  if (locale === "en") {
    return {
      emptyDescription: "Fresh plans will appear here.",
      emptyTitle: "No plans yet",
      friendEmptyTitle: "Nothing from people you follow",
      friendEmptyDescription:
        "Sign in to see plans joined by people you follow.",
      friendGoing: (count) =>
        `${count} ${count === 1 ? "followed person" : "followed people"}`,
      loadingLabel: "Loading...",
      loadFailedTitle: "Could not load",
      mineEmptyTitle: "No personal plans yet",
      mineEmptyDescription: "Sign in to see plans you're hosting or joining.",
      hostedBadge: "Host",
      participants: "people",
      retryLabel: "Retry",
      tabs: {
        nearby: "Nearby",
        friends: "Following",
        today: "Today",
        popular: "Popular",
        mine: "Mine",
      },
      title: "Plans",
    };
  }

  return {
    emptyDescription: "新的聚吧会显示在这里。",
    emptyTitle: "暂时没有聚吧",
    friendEmptyTitle: "暂无关注动态",
    friendEmptyDescription: "登录后可以看到你关注的人参加的聚吧。",
    friendGoing: (count) => `${count} 位关注的人`,
    loadingLabel: "加载中...",
    loadFailedTitle: "加载失败",
    mineEmptyTitle: "暂无我的聚吧",
    mineEmptyDescription: "登录后可以看到你发起和参加的聚吧。",
    hostedBadge: "我发起的",
    participants: "人",
    retryLabel: "重试",
    tabs: {
      nearby: "附近",
      friends: "关注",
      today: "今天",
      popular: "热门",
      mine: "我的",
    },
    title: "聚吧",
  };
}

function getActivityHref(activity: ActivityCardViewModel, locale: string) {
  if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function getActivityKey(activity: ActivityCardViewModel) {
  return `${activity.type}:${activity.id}`;
}

function dedupeActivities(activities: ActivityCardViewModel[]) {
  const seen = new Set<string>();

  return activities.filter((activity) => {
    const key = getActivityKey(activity);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

async function fetchMobileLobbySection(
  section: MobileLobbyFriendSectionId,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    section,
  });
  const response = await fetch(`/api/lobby/section?${params.toString()}`, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mobile lobby section request failed: ${response.status}`);
  }

  const payload = (await response.json()) as MobileLobbySectionResponse;

  if (!payload.ok) {
    throw new Error("Mobile lobby section payload was not ok.");
  }

  return payload.activities ?? [];
}

function getPrioritizedMobileLobbySwipeActivities({
  activities,
  category,
  excludedActivities,
}: {
  activities: ActivityCardViewModel[];
  category: MobileLobbyV23CategoryFilterId;
  excludedActivities: ActivityCardViewModel[];
}) {
  const seen = new Set(excludedActivities.map(getActivityKey));
  const matchingCategoryActivities: ActivityCardViewModel[] = [];
  const fallbackActivities: ActivityCardViewModel[] = [];

  for (const activity of activities) {
    const key = getActivityKey(activity);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (category !== "all" && activity.category === category) {
      matchingCategoryActivities.push(activity);
    } else {
      fallbackActivities.push(activity);
    }
  }

  return [...matchingCategoryActivities, ...fallbackActivities].slice(
    0,
    mobileLobbySwipePreviewLimit,
  );
}

function getParisDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function getTodayActivities(activities: ActivityCardViewModel[]) {
  const todayKey = getParisDateKey(new Date());

  return activities.filter(
    (activity) => getParisDateKey(activity.startAt) === todayKey,
  );
}

function getMobileLobbyDateOnly(value: string, locale: string) {
  const date = new Date(value);

  if (locale === "zh-CN") {
    const parts = new Intl.DateTimeFormat("zh-CN", {
      day: "numeric",
      month: "numeric",
      timeZone: "Europe/Paris",
    }).formatToParts(date);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return month && day ? `${month}月${day}日` : "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: locale === "zh-CN" ? "numeric" : "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function getMobileLobbyDateLabel(
  activity: ActivityCardViewModel,
  locale: string,
) {
  if (
    activity.endAt &&
    getParisDateKey(activity.startAt) !== getParisDateKey(activity.endAt)
  ) {
    return `${getMobileLobbyDateOnly(activity.startAt, locale)} - ${getMobileLobbyDateOnly(
      activity.endAt,
      locale,
    )}`;
  }

  return getActivityDateLabel(activity, locale);
}

function getPopularActivities(activities: ActivityCardViewModel[]) {
  return [...activities].sort((left, right) => {
    const leftScore =
      left.participantCount * 2 +
      left.favoriteCount +
      (left.friendSignal?.count ?? 0) * 3;
    const rightScore =
      right.participantCount * 2 +
      right.favoriteCount +
      (right.friendSignal?.count ?? 0) * 3;

    return rightScore - leftScore;
  });
}

function getVisibleActivities({
  activeTab,
  activities,
  friendActivities = [],
  mineActivities = [],
}: {
  activeTab: MobileLobbyV23TabId;
  activities: ActivityCardViewModel[];
  friendActivities?: ActivityCardViewModel[];
  mineActivities?: ActivityCardViewModel[];
}) {
  const dedupedActivities = dedupeActivities(activities);

  if (activeTab === "friends") {
    return dedupeActivities(friendActivities);
  }

  if (activeTab === "mine") {
    return dedupeActivities(mineActivities);
  }

  if (activeTab === "today") {
    return getTodayActivities(dedupedActivities);
  }

  if (activeTab === "popular") {
    return getPopularActivities(dedupedActivities);
  }

  return dedupedActivities;
}

function filterMobileLobbyActivitiesByCategory(
  activities: ActivityCardViewModel[],
  category: MobileLobbyV23CategoryFilterId,
) {
  if (category === "all") {
    return activities;
  }

  return activities.filter((activity) => activity.category === category);
}

function filterMobileLobbyActivitiesByPrice(
  activities: ActivityCardViewModel[],
  freeOnly: boolean,
) {
  if (!freeOnly) {
    return activities;
  }

  return activities.filter(isFreeMobileLobbyActivity);
}

function MobileLobbyV23CategoryRail({
  activeCategory,
  isOpen,
  locale,
  onClose,
  onSelectCategory,
  options,
}: {
  activeCategory: MobileLobbyV23CategoryFilterId;
  isOpen: boolean;
  locale: string;
  onClose: () => void;
  onSelectCategory: (category: MobileLobbyV23CategoryFilterId) => void;
  options: MobileLobbyV23CategoryFilterOption[];
}) {
  const title = getMobileLobbyCategoryFilterLabel(locale);
  const closeLabel =
    locale === "fr" ? "Fermer" : locale === "en" ? "Close" : "关闭";

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      aria-labelledby="mobile-lobby-category-rail-title"
      className="mobile-lobby-category-drawer fixed inset-0 z-50 md:hidden"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="mobile-lobby-category-drawer__backdrop absolute inset-0 bg-[#111210]/22 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <aside className="mobile-lobby-category-drawer__panel absolute inset-y-0 right-0 flex w-[min(68vw,15.75rem)] flex-col overflow-hidden border-l border-[#D6D5B2] bg-white pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-[-18px_0_34px_rgba(17,18,16,0.12)]">
        <div className="flex items-center justify-between gap-3 px-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#096B45]/62">
              Friemi
            </p>
            <p
              id="mobile-lobby-category-rail-title"
              className="mt-1 truncate text-[22px] font-black leading-none text-[#111210]"
            >
              {title}
            </p>
          </div>
          <button
            aria-label={closeLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#111210] shadow-[0_10px_24px_rgba(17,18,16,0.08)] transition active:scale-95"
            type="button"
            onClick={onClose}
          >
            <X className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-2">
            {options.map(({ Icon, id, image, label }, index) => {
              const active = id === activeCategory;
              const isAll = id === "all";

              return (
                <button
                  key={id}
                  aria-pressed={active}
                  className={cn(
                    "mobile-lobby-category-drawer__item group relative flex items-center overflow-hidden rounded-[1rem] text-left transition active:scale-[0.98]",
                    isAll
                      ? "min-h-[3.05rem] gap-2 px-3 py-1.5"
                      : "min-h-[4.7rem] gap-4 px-1 py-1",
                    active
                      ? "bg-[#096B45] text-white"
                      : "bg-transparent text-[#111210] hover:bg-[#F7F4EA]",
                  )}
                  style={
                    {
                      animationDelay: `${70 + index * 34}ms`,
                    } as CSSProperties
                  }
                  type="button"
                  onClick={() => onSelectCategory(id)}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                      active
                        ? "bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.18),transparent_38%)] opacity-100"
                        : "group-active:opacity-100 group-active:bg-[#F8F2E4]",
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem]",
                      isAll
                        ? "h-10 w-10 items-center"
                        : "h-[4.15rem] w-[5.35rem]",
                      active ? "bg-white/14" : "bg-[#F7F4EA]",
                    )}
                  >
                    {image ? (
                      <Image
                        alt=""
                        className={cn(
                          "h-full w-full object-contain object-center p-0 transition duration-300 group-active:scale-95",
                          !isAll && "scale-[1.1]",
                        )}
                        height={124}
                        src={`/illustrations/png/${image}`}
                        width={148}
                      />
                    ) : (
                      <Icon
                        className={cn(
                          isAll ? "h-7 w-7" : "h-8 w-8",
                          active ? "text-white" : "text-[#096B45]",
                        )}
                        strokeWidth={2.35}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex min-w-0 items-center gap-2",
                      !isAll && "flex-1 justify-between",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 truncate text-[15px] font-black leading-tight",
                        isAll && "text-[15px]",
                      )}
                    >
                      {label}
                    </span>
                    {isAll ? null : (
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white/82" : "text-[#096B45]/70",
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function MobileLobbyV23ActivityRow({
  activity,
  copy,
  locale,
  showHostedBadge = false,
}: {
  activity: ActivityCardViewModel;
  copy: MobileLobbyV23Copy;
  locale: string;
  showHostedBadge?: boolean;
}) {
  const participantText =
    activity.capacity > 0
      ? `${activity.participantCount} / ${activity.capacity}`
      : `${activity.participantCount}`;
  const friendCount = activity.friendSignal?.count ?? 0;

  return (
    <Link
      className="group grid grid-cols-[clamp(5.15rem,23.5vw,5.75rem)_minmax(0,1fr)_auto] items-stretch gap-x-3.5 rounded-[1.1rem] bg-white px-2.5 py-2.5 transition active:scale-[0.985]"
      href={getActivityHref(activity, locale)}
    >
      <div className="relative aspect-square overflow-hidden rounded-[0.95rem] bg-[#F1F2EC] shadow-[0_10px_22px_rgba(17,18,16,0.075)]">
        <ActivityCoverImage
          alt={activity.title}
          overlayClassName="bg-gradient-to-t from-black/10 to-transparent"
          src={activity.coverImageUrl}
        />
      </div>

      <div className="flex min-w-0 flex-col justify-center py-0.5 pr-0.5">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-[1.18] tracking-normal text-[#111210]">
          {activity.title}
        </h2>
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-[#111210]/58">
          <UsersRound className="h-3.5 w-3.5 shrink-0" />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate">
              {participantText} · {activity.city || copy.participants}
            </span>
            {showHostedBadge ? (
              <span className="shrink-0 rounded-full bg-[#EAF5E8] px-1.5 py-0.5 text-[9.5px] font-black leading-none text-[#096B45] ring-1 ring-[#BFD8B9]">
                {copy.hostedBadge}
              </span>
            ) : null}
          </span>
        </p>
        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-[#111210]/54">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {getMobileLobbyDateLabel(activity, locale)}
          </span>
        </p>
      </div>

      <div className="flex h-full flex-col items-end justify-between py-1">
        <ChevronRight className="mt-0.5 h-4 w-4 text-[#111210]/70 transition group-active:translate-x-0.5" />
        {friendCount > 0 ? (
          <span className="max-w-[5.9rem] truncate rounded-full bg-[#EAF7EA] px-2 py-1 text-[10px] font-extrabold leading-none text-[#138456]">
            {copy.friendGoing(friendCount)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function MobileLobbyV23View({
  activeTab,
  activities,
  friendActivities,
  initialCategoryFilter = null,
  initialFreeOnly = false,
  isSignedIn,
  locale,
  mineActivities,
  swipeActivities = [],
  viewerProfileId = null,
}: MobileLobbyV23ViewProps) {
  const copy = getMobileLobbyV23Copy(locale);
  const [selectedTab, setSelectedTab] =
    useState<MobileLobbyV23TabId>(activeTab);
  const [activeCategory, setActiveCategory] =
    useState<MobileLobbyV23CategoryFilterId>(initialCategoryFilter ?? "all");
  const [categoryRailOpen, setCategoryRailOpen] = useState(false);
  const [lazyFriendActivities, setLazyFriendActivities] = useState<
    ActivityCardViewModel[] | null
  >(friendActivities ? dedupeActivities(friendActivities) : null);
  const [friendActivitiesLoading, setFriendActivitiesLoading] = useState(false);
  const [friendActivitiesFailed, setFriendActivitiesFailed] = useState(false);
  const friendActivitiesInFlightRef = useRef(false);
  const categoryFilterOptions = useMemo<MobileLobbyV23CategoryFilterOption[]>(
    () => [
      {
        Icon: LayoutGrid,
        id: "all",
        label: getMobileLobbyAllLabel(locale),
      },
      ...activityCategoryOptions.map((category) => ({
        Icon: mobileLobbyV23CategoryIcons[category],
        id: category,
        image: activityCategoryIllustrationImages[category],
        label: getCategoryLabel(category, locale),
      })),
    ],
    [locale],
  );
  const activeCategoryLabel =
    categoryFilterOptions.find((option) => option.id === activeCategory)
      ?.label ?? getMobileLobbyAllLabel(locale);
  const visibleTabs = isSignedIn
    ? mobileLobbyV23Tabs
    : publicMobileLobbyV23Tabs;
  const displayedActiveTab = visibleTabs.includes(selectedTab)
    ? selectedTab
    : "nearby";
  const hasLoadedFriendActivities =
    lazyFriendActivities !== null || typeof friendActivities !== "undefined";
  const resolvedFriendActivities =
    lazyFriendActivities ?? friendActivities ?? [];
  const visibleActivities = filterMobileLobbyActivitiesByPrice(
    filterMobileLobbyActivitiesByCategory(
      getVisibleActivities({
        activeTab: displayedActiveTab,
        activities,
        friendActivities: resolvedFriendActivities,
        mineActivities,
      }),
      activeCategory,
    ),
    initialFreeOnly,
  ).slice(0, 30);
  const canShowColdStartSwipe =
    displayedActiveTab !== "friends" && displayedActiveTab !== "mine";
  const shouldShowColdStartSwipe =
    canShowColdStartSwipe &&
    (visibleActivities.length === 0 ||
      (activeCategory !== "all" &&
        visibleActivities.length < mobileLobbySparseResultThreshold));
  const coldStartSwipeActivities = useMemo(
    () =>
      shouldShowColdStartSwipe
        ? getPrioritizedMobileLobbySwipeActivities({
            activities: [...swipeActivities, ...activities],
            category: activeCategory,
            excludedActivities:
              visibleActivities.length > 0 ? visibleActivities : [],
          })
        : [],
    [
      activeCategory,
      activities,
      shouldShowColdStartSwipe,
      swipeActivities,
      visibleActivities,
    ],
  );
  const loadFriendActivities = useCallback(
    async (options: { visual?: boolean } = {}) => {
      if (
        !isSignedIn ||
        hasLoadedFriendActivities ||
        friendActivitiesInFlightRef.current
      ) {
        return;
      }

      friendActivitiesInFlightRef.current = true;

      if (options.visual) {
        setFriendActivitiesLoading(true);
      }

      setFriendActivitiesFailed(false);

      const controller = new AbortController();
      const timeoutId =
        typeof window === "undefined"
          ? null
          : window.setTimeout(() => controller.abort(), 15000);

      try {
        const sections = await Promise.all(
          mobileLobbyFriendSectionIds.map((section) =>
            fetchMobileLobbySection(section, controller.signal),
          ),
        );

        setLazyFriendActivities(dedupeActivities(sections.flat()));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load mobile lobby friend activities", error);
        }

        setFriendActivitiesFailed(true);
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        friendActivitiesInFlightRef.current = false;
        setFriendActivitiesLoading(false);
      }
    },
    [hasLoadedFriendActivities, isSignedIn],
  );
  const handleSelectCategory = useCallback(
    (category: MobileLobbyV23CategoryFilterId) => {
      setActiveCategory(category);
      setCategoryRailOpen(false);
      syncMobileLobbyCategorySearchParam(category);
    },
    [],
  );
  const handleSelectTab = useCallback(
    (tab: MobileLobbyV23TabId) => {
      setSelectedTab(tab);
      syncMobileLobbyTabSearchParam({
        category: activeCategory,
        freeOnly: initialFreeOnly,
        tab,
      });
    },
    [activeCategory, initialFreeOnly],
  );

  useEffect(() => {
    setSelectedTab(activeTab);
  }, [activeTab]);
  useEffect(() => {
    if (displayedActiveTab !== "friends") {
      return;
    }

    void loadFriendActivities({ visual: true });
  }, [displayedActiveTab, loadFriendActivities]);
  useEffect(() => {
    if (
      !isSignedIn ||
      hasLoadedFriendActivities ||
      typeof window === "undefined"
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void loadFriendActivities();
    }, mobileLobbyFriendPrefetchDelayMs);

    return () => window.clearTimeout(timerId);
  }, [hasLoadedFriendActivities, isSignedIn, loadFriendActivities]);
  const emptyTitle =
    displayedActiveTab === "friends"
      ? copy.friendEmptyTitle
      : displayedActiveTab === "mine"
        ? copy.mineEmptyTitle
        : copy.emptyTitle;
  const emptyDescription =
    displayedActiveTab === "friends"
      ? copy.friendEmptyDescription
      : displayedActiveTab === "mine"
        ? copy.mineEmptyDescription
        : copy.emptyDescription;
  const shouldShowFriendLoading =
    displayedActiveTab === "friends" &&
    isSignedIn &&
    (friendActivitiesLoading || !hasLoadedFriendActivities) &&
    !friendActivitiesFailed;
  const shouldShowFriendFailed =
    displayedActiveTab === "friends" &&
    isSignedIn &&
    !hasLoadedFriendActivities &&
    friendActivitiesFailed;

  return (
    <section className="mobile-v23-lobby app-mobile-page-shell [--app-mobile-page-top-gap:2.85rem] [--app-mobile-page-bottom-gap:1.1rem] bg-white text-[#111210] md:hidden">
      <MobileLobbyV23CategoryRail
        activeCategory={activeCategory}
        isOpen={categoryRailOpen}
        locale={locale}
        onClose={() => setCategoryRailOpen(false)}
        onSelectCategory={handleSelectCategory}
        options={categoryFilterOptions}
      />
      <div className="mx-auto flex w-full max-w-[430px] flex-col px-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[39px] font-black leading-none tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label={getMobileLobbyCategoryFilterLabel(locale)}
              className={cn(
                "mt-1 inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-[12px] font-black shadow-[0_12px_24px_rgba(17,18,16,0.08)] transition active:scale-[0.96]",
                activeCategory === "all"
                  ? "border border-[#D6D5B2] bg-white text-[#096B45]"
                  : "bg-[#096B45] text-white",
              )}
              type="button"
              onClick={() => setCategoryRailOpen(true)}
            >
              <Rows3 className="h-4 w-4" strokeWidth={2.4} />
              <span className="max-w-[3.25rem] truncate">
                {activeCategoryLabel}
              </span>
            </button>
          </div>
        </div>

        <nav
          aria-label={copy.title}
          className="-mx-5 mt-9 flex gap-8 overflow-x-auto border-b border-[#EEEDE4] px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleTabs.map((tab) => (
            <button
              aria-current={displayedActiveTab === tab ? "page" : undefined}
              className={cn(
                "relative shrink-0 pb-4 text-left text-[19px] font-black tracking-normal transition active:scale-[0.98]",
                displayedActiveTab === tab
                  ? "text-[#111210]"
                  : "text-[#111210]/28",
              )}
              key={tab}
              type="button"
              onClick={() => handleSelectTab(tab)}
            >
              {copy.tabs[tab]}
              {displayedActiveTab === tab ? (
                <span className="absolute bottom-0 left-0 h-1.5 w-full rounded-full bg-[#369758] shadow-[0_7px_15px_rgba(54,151,88,0.28)]" />
              ) : null}
            </button>
          ))}
        </nav>

        {shouldShowFriendLoading ? (
          <div className="mt-10 rounded-[1.35rem] border border-[#D7D5C8] bg-white px-5 py-6 text-center shadow-[0_16px_38px_rgba(17,18,16,0.05)]">
            <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-[#D6D5B2] border-t-[#096B45]" />
            <p className="mt-3 text-[16px] font-black">{copy.loadingLabel}</p>
          </div>
        ) : shouldShowFriendFailed ? (
          <div className="mt-10 rounded-[1.35rem] border border-[#D7D5C8] bg-white px-5 py-6 text-center shadow-[0_16px_38px_rgba(17,18,16,0.05)]">
            <p className="text-[18px] font-black">{copy.loadFailedTitle}</p>
            <button
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#096B45] px-5 text-sm font-black text-white shadow-[0_10px_20px_rgba(9,107,69,0.18)] active:scale-[0.98]"
              type="button"
              onClick={() => loadFriendActivities({ visual: true })}
            >
              {copy.retryLabel}
            </button>
          </div>
        ) : visibleActivities.length > 0 ? (
          <>
            <div className="mt-5 grid gap-5">
              {visibleActivities.map((activity) => (
                <MobileLobbyV23ActivityRow
                  activity={activity}
                  copy={copy}
                  key={getActivityKey(activity)}
                  locale={locale}
                  showHostedBadge={
                    displayedActiveTab === "mine" &&
                    Boolean(viewerProfileId) &&
                    activity.organizerId === viewerProfileId
                  }
                />
              ))}
            </div>
            {coldStartSwipeActivities.length > 0 ? (
              <div className="mt-7 border-t border-[#EEEDE4] pb-10 pt-5">
                <ActivitySwipeDiscovery
                  activities={coldStartSwipeActivities}
                  favoriteRedirectPath="/lobby"
                  isAuthenticated={isSignedIn}
                  locale={locale}
                  shuffleDeck={false}
                  sourceSurface="activity_list"
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-10 rounded-[1.35rem] border border-[#D7D5C8] bg-white px-5 py-6 text-center shadow-[0_16px_38px_rgba(17,18,16,0.05)]">
              <MapPin className="mx-auto h-7 w-7 text-[#096B45]" />
              <p className="mt-3 text-[18px] font-black">{emptyTitle}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#111210]/58">
                {emptyDescription}
              </p>
            </div>
            {coldStartSwipeActivities.length > 0 ? (
              <div className="mt-7 pb-10">
                <ActivitySwipeDiscovery
                  activities={coldStartSwipeActivities}
                  favoriteRedirectPath="/lobby"
                  isAuthenticated={isSignedIn}
                  locale={locale}
                  shuffleDeck={false}
                  sourceSurface="activity_list"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
