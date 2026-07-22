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
  Plus,
  Rows3,
  Sprout,
  Utensils,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
};

type MobileLobbyV23CategoryFilterId = ActivityCategory | "all";

type MobileLobbyV23CategoryFilterOption = {
  Icon: LucideIcon;
  id: MobileLobbyV23CategoryFilterId;
  image?: string;
  label: string;
};

type MobileLobbyV23Copy = {
  create: string;
  emptyDescription: string;
  emptyTitle: string;
  friendEmptyTitle: string;
  friendEmptyDescription: string;
  friendGoing: (count: number) => string;
  mineEmptyTitle: string;
  mineEmptyDescription: string;
  participants: string;
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

function getMobileLobbyTabHref({
  category,
  freeOnly,
  locale,
  tab,
}: {
  category: MobileLobbyV23CategoryFilterId;
  freeOnly?: boolean;
  locale: string;
  tab: MobileLobbyV23TabId;
}) {
  const params = new URLSearchParams({ tab });

  if (freeOnly) {
    params.set("price", "free");
  }

  if (category !== "all") {
    params.set("category", category);
  }

  return withLocale(locale, `/lobby?${params.toString()}`);
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
      create: "Créer",
      emptyDescription: "Les nouvelles sorties apparaîtront ici.",
      emptyTitle: "Aucun groupe pour le moment",
      friendEmptyTitle: "Aucune sortie d'amis",
      friendEmptyDescription:
        "Connectez-vous pour voir les sorties de vos amis.",
      friendGoing: (count) => `${count} ami${count > 1 ? "s" : ""} y vont`,
      mineEmptyTitle: "Aucune de vos sorties",
      mineEmptyDescription:
        "Connectez-vous pour voir les sorties que vous organisez ou rejoignez.",
      participants: "pers.",
      tabs: {
        nearby: "Proche",
        friends: "Amis",
        today: "Aujourd'hui",
        popular: "Populaire",
        mine: "Les miens",
      },
      title: "Groupes",
    };
  }

  if (locale === "en") {
    return {
      create: "Create",
      emptyDescription: "Fresh hangouts will appear here.",
      emptyTitle: "No hangouts yet",
      friendEmptyTitle: "No friend hangouts yet",
      friendEmptyDescription: "Sign in to see what friends are joining.",
      friendGoing: (count) => `${count} friend${count > 1 ? "s" : ""} going`,
      mineEmptyTitle: "No personal hangouts yet",
      mineEmptyDescription:
        "Sign in to see hangouts you're hosting or joining.",
      participants: "people",
      tabs: {
        nearby: "Nearby",
        friends: "Friends",
        today: "Today",
        popular: "Popular",
        mine: "Mine",
      },
      title: "Hangout",
    };
  }

  return {
    create: "发布",
    emptyDescription: "新的组局会显示在这里。",
    emptyTitle: "暂时没有组局",
    friendEmptyTitle: "暂无好友组局",
    friendEmptyDescription: "登录后可以看到好友参加的组局。",
    friendGoing: (count) => `${count} 位好友参加`,
    mineEmptyTitle: "暂无我的组局",
    mineEmptyDescription: "登录后可以看到你发起和参加的组局。",
    participants: "人",
    tabs: {
      nearby: "附近",
      friends: "好友",
      today: "今天",
      popular: "热门",
      mine: "我的",
    },
    title: "组局",
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
      <aside className="mobile-lobby-category-drawer__panel absolute inset-y-0 right-0 flex w-[min(84vw,22rem)] flex-col overflow-hidden border-l border-[#D6D5B2] bg-[#FEFFF9] pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-[-26px_0_48px_rgba(17,18,16,0.16)]">
        <div className="flex items-center justify-between gap-3 px-4">
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

        <div className="mt-5 flex-1 overflow-y-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-3">
            {options.map(({ Icon, id, image, label }, index) => {
              const active = id === activeCategory;
              const isAll = id === "all";

              return (
                <button
                  key={id}
                  aria-pressed={active}
                  className={cn(
                    "mobile-lobby-category-drawer__item group relative flex min-h-[5.75rem] items-center gap-3 overflow-hidden rounded-[1.35rem] border p-2.5 text-left transition active:scale-[0.97]",
                    active
                      ? "border-[#096B45] bg-[#096B45] text-white shadow-[0_18px_36px_rgba(9,107,69,0.22)]"
                      : "border-[#E4DFC9] bg-white text-[#111210] shadow-[0_14px_28px_rgba(17,18,16,0.055)]",
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
                        ? "bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.22),transparent_38%)] opacity-100"
                        : "group-active:opacity-100 group-active:bg-[#F8F2E4]",
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem]",
                      isAll ? "h-14 w-14" : "h-[4.35rem] w-[5.5rem]",
                      active ? "bg-white/16" : "bg-[#F7F4EA]",
                    )}
                  >
                    {image ? (
                      <Image
                        alt=""
                        className="h-full w-full object-contain p-1.5 transition duration-300 group-active:scale-95"
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
                  <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span
                      className={cn(
                        "min-w-0 truncate text-[16px] font-black leading-tight",
                        isAll && "text-[18px]",
                      )}
                    >
                      {label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-white/82" : "text-[#096B45]/70",
                      )}
                    />
                  </span>
                  {active ? (
                    <span className="absolute bottom-3 right-11 h-1 w-8 rounded-full bg-white/86" />
                  ) : null}
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
}: {
  activity: ActivityCardViewModel;
  copy: MobileLobbyV23Copy;
  locale: string;
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
          <span className="truncate">
            {participantText} · {activity.city || copy.participants}
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
}: MobileLobbyV23ViewProps) {
  const copy = getMobileLobbyV23Copy(locale);
  const [activeCategory, setActiveCategory] =
    useState<MobileLobbyV23CategoryFilterId>(initialCategoryFilter ?? "all");
  const [categoryRailOpen, setCategoryRailOpen] = useState(false);
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
  const displayedActiveTab = visibleTabs.includes(activeTab)
    ? activeTab
    : "nearby";
  const visibleActivities = filterMobileLobbyActivitiesByPrice(
    filterMobileLobbyActivitiesByCategory(
      getVisibleActivities({
        activeTab: displayedActiveTab,
        activities,
        friendActivities,
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
  const handleSelectCategory = useCallback(
    (category: MobileLobbyV23CategoryFilterId) => {
      setActiveCategory(category);
      setCategoryRailOpen(false);
      syncMobileLobbyCategorySearchParam(category);
    },
    [],
  );
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

  return (
    <section className="mobile-v23-lobby min-h-[100svh] bg-[#FEFFF9] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.85rem)] text-[#111210] md:hidden">
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
            <Link
              href={withLocale(locale, "/activities/new")}
              className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#096B45] text-white shadow-[0_14px_28px_rgba(9,107,69,0.22)]"
              aria-label={copy.create}
            >
              <Plus className="h-5 w-5" strokeWidth={2.7} />
            </Link>
          </div>
        </div>

        <nav
          aria-label={copy.title}
          className="-mx-5 mt-9 flex gap-8 overflow-x-auto border-b border-[#EEEDE4] px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleTabs.map((tab) => (
            <Link
              aria-current={displayedActiveTab === tab ? "page" : undefined}
              className={cn(
                "relative shrink-0 pb-4 text-[19px] font-black tracking-normal transition",
                displayedActiveTab === tab
                  ? "text-[#111210]"
                  : "text-[#111210]/28",
              )}
              href={getMobileLobbyTabHref({
                category: activeCategory,
                freeOnly: initialFreeOnly,
                locale,
                tab,
              })}
              key={tab}
            >
              {copy.tabs[tab]}
              {displayedActiveTab === tab ? (
                <span className="absolute bottom-0 left-0 h-1.5 w-full rounded-full bg-[#369758] shadow-[0_7px_15px_rgba(54,151,88,0.28)]" />
              ) : null}
            </Link>
          ))}
        </nav>

        {visibleActivities.length > 0 ? (
          <>
            <div className="mt-5 grid gap-5">
              {visibleActivities.map((activity) => (
                <MobileLobbyV23ActivityRow
                  activity={activity}
                  copy={copy}
                  key={getActivityKey(activity)}
                  locale={locale}
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
