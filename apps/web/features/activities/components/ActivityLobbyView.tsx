"use client";

import Link from "next/link";
import { Compass, SlidersHorizontal, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import {
  isDetailSourceReturnPage,
  readDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import { ActivityCard } from "./ActivityCard";
import { ActivitySwipeDiscovery } from "./ActivitySwipeDiscovery";
import { isPublicEventCard } from "../utils/activityCardKind";
import { getActivityDisplayStatus } from "../utils/activityDisplay";
import type {
  ActivityLobbyFeedPage,
  ActivityLobbyFeedStatus,
} from "../queries/getActivityLobby";

type ActivityLobbyViewProps = {
  allActivities: ActivityCardViewModel[];
  allActivityFeed: ActivityLobbyFeedPage;
  openActivities: ActivityCardViewModel[];
  createdActivities: ActivityCardViewModel[];
  deferredFilters?: LobbyFilterId[];
  joinedActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
  starterActivities: ActivityCardViewModel[];
  swipeActivities: ActivityCardViewModel[];
  locale: string;
};

type LobbyFilterId =
  | "all"
  | "open"
  | "created"
  | "joined"
  | "favorites"
  | "friendHosted"
  | "friendJoined";

type FilterOption = {
  id: LobbyFilterId;
  count: number | null;
  label: string;
};

type LobbyStatusFilterId = ActivityLobbyFeedStatus;

type StatusFilterOption = {
  id: LobbyStatusFilterId;
  count: number;
  label: string;
};

type LobbySectionResponse = {
  activities?: ActivityCardViewModel[];
  ok: boolean;
};

type LobbyFeedResponse = {
  feed?: ActivityLobbyFeedPage;
  ok: boolean;
};

type LobbySwipeResponse = {
  activities?: ActivityCardViewModel[];
  ok: boolean;
};

type WindowWithIdleCallback = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
  };

const LOBBY_PAGE_SIZE = 10;

function scheduleIdleTask(callback: () => void, timeout = 900) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const idleWindow = window as WindowWithIdleCallback;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(callback, { timeout });

    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, timeout);

  return () => window.clearTimeout(handle);
}

type EmptyLobbyAction = {
  description: string;
  href: string;
  label: string;
  tone: "primary" | "secondary" | "tertiary";
};

type FilterGroupRowProps = {
  children: ReactNode;
  label: string;
};

type MobileLobbyFilterSheetProps = {
  activeFilter: LobbyFilterId;
  activeStatusFilter: LobbyStatusFilterId;
  failedFilters: Partial<Record<LobbyFilterId, boolean>>;
  filterCopy: ReturnType<typeof getLobbyFilterCopy>;
  filterOptions: FilterOption[];
  isOpen: boolean;
  loadingFilter: LobbyFilterId | null;
  locale: string;
  onClose: () => void;
  onFilterChange: (filter: LobbyFilterId) => void;
  onStatusChange: (status: LobbyStatusFilterId) => void;
  statusFilterOptions: StatusFilterOption[];
};

function getAllLabel(locale: string) {
  if (locale === "fr") {
    return "Tout";
  }

  if (locale === "en") {
    return "All";
  }

  return "全部";
}

function getFilterLabel(locale: string, id: LobbyFilterId, fallback: string) {
  if (locale === "fr") {
    switch (id) {
      case "open":
        return "Publics";
      case "created":
        return "Creees";
      case "joined":
        return "Rejointes";
      case "favorites":
        return "Favoris";
      case "friendHosted":
        return "Amis hotes";
      case "friendJoined":
        return "Amis inscrits";
      default:
        return fallback;
    }
  }

  if (locale === "en") {
    switch (id) {
      case "open":
        return "Open";
      case "created":
        return "Hosted by me";
      case "joined":
        return "Joined by me";
      case "favorites":
        return "Favorites";
      case "friendHosted":
        return "Hosted by friends";
      case "friendJoined":
        return "Joined by friends";
      default:
        return fallback;
    }
  }

  switch (id) {
    case "open":
      return "开放局";
    case "created":
      return "我发起的";
    case "joined":
      return "我参加的";
    case "favorites":
      return "我收藏的";
    case "friendHosted":
      return "好友发起";
    case "friendJoined":
      return "好友参加";
    default:
      return fallback;
  }
}

function getEmptyCategoryCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Rien ici pour le moment.",
      description:
        "Essayez une autre categorie, lancez un plan, ou decouvrez de nouvelles activites pour remplir votre hall.",
    };
  }

  if (locale === "en") {
    return {
      title: "Nothing in this section yet.",
      description:
        "Try another section, start a plan, or discover something new to bring this area to life.",
    };
  }

  return {
    title: "这里暂时还没有内容。",
    description: "可以切换看看其他分类，先组个局，或者去发现新的活动。",
  };
}

function getEmptyCategoryResetLabel(locale: string) {
  if (locale === "fr") {
    return "Voir tout";
  }

  if (locale === "en") {
    return "View all";
  }

  return "查看全部";
}

function getMoreActivitiesLabel(locale: string) {
  if (locale === "fr") {
    return "Plus";
  }

  if (locale === "en") {
    return "More";
  }

  return "更多";
}

function getEmptyLobbyActions(locale: string): EmptyLobbyAction[] {
  if (locale === "fr") {
    return [
      {
        href: "/friends",
        label: "Ajouter des amis",
        description:
          "Ajoutez d'abord vos proches. Des qu'ils lancent un plan ou rejoignent une sortie, vous le verrez ici.",
        tone: "primary",
      },
      {
        href: "/activities/new",
        label: "Je lance un plan",
        description:
          "Parc, expo ou cinema... lancez quelque chose maintenant et voyez qui part avec vous.",
        tone: "secondary",
      },
      {
        href: "/activities",
        label: "Decouvrir",
        description:
          "Regardez ce qui se passe deja, puis rejoignez ou gardez de cote ce qui vous attire.",
        tone: "tertiary",
      },
    ];
  }

  if (locale === "en") {
    return [
      {
        href: "/friends",
        label: "Add friends first",
        description:
          "Bring your people in first. As soon as they start a plan or join one, it will show up here.",
        tone: "primary",
      },
      {
        href: "/activities/new",
        label: "Start a plan",
        description:
          "Park, exhibit, or movie night. Start something now and see who wants in.",
        tone: "secondary",
      },
      {
        href: "/activities",
        label: "Discover activities",
        description:
          "Browse what is already happening, then join or favorite whatever feels right.",
        tone: "tertiary",
      },
    ];
  }

  return [
    {
      href: "/friends",
      label: "先去加好友",
      description:
        "把常一起玩的人先加进来。他们一组局、一起报名，你马上就能在这里看到。",
      tone: "primary",
    },
    {
      href: "/activities/new",
      label: "我来组局",
      description:
        "公园、逛展、看电影，想到什么就先组个局，看看谁会跟上你一起出发。",
      tone: "secondary",
    },
    {
      href: "/activities",
      label: "去发现活动",
      description:
        "先逛逛大家都在玩什么，看到心动的活动就参加，或者先收藏起来。",
      tone: "tertiary",
    },
  ];
}

function getLobbyFilterCopy(locale: string) {
  if (locale === "fr") {
    return {
      category: "Categorie",
      status: "Statut",
      title: "Filtrer le hall",
    };
  }

  if (locale === "en") {
    return {
      category: "Category",
      status: "Status",
      title: "Filter the lobby",
    };
  }

  return {
    category: "分类",
    status: "状态",
    title: "筛选组队车",
  };
}

function getMobileLobbyFilterCopy(locale: string) {
  if (locale === "fr") {
    return {
      apply: "Valider",
      close: "Fermer",
      openCategory: "Categorie",
      openStatus: "Statut",
      title: "Filtrer",
    };
  }

  if (locale === "en") {
    return {
      apply: "Done",
      close: "Close",
      openCategory: "Category",
      openStatus: "Status",
      title: "Filters",
    };
  }

  return {
    apply: "完成",
    close: "关闭",
    openCategory: "分类",
    openStatus: "状态",
    title: "筛选",
  };
}

function getStatusFilterLabel(locale: string, id: LobbyStatusFilterId) {
  if (locale === "fr") {
    switch (id) {
      case "ongoing":
        return "En cours";
      case "ended":
        return "Terminees";
      default:
        return "Tout";
    }
  }

  if (locale === "en") {
    switch (id) {
      case "ongoing":
        return "Ongoing";
      case "ended":
        return "Ended";
      default:
        return "All";
    }
  }

  switch (id) {
    case "ongoing":
      return "进行中";
    case "ended":
      return "已结束";
    default:
      return "全部";
  }
}

function isEndedLobbyActivity(activity: ActivityCardViewModel) {
  return getActivityDisplayStatus(activity) === "ENDED";
}

function getLobbyActivityKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity) && activity.publicEventId
    ? `public:${activity.publicEventId}`
    : `activity:${activity.id}`;
}

function getLobbyFeedCacheKey(status: LobbyStatusFilterId, page: number) {
  return `${status}:${page}`;
}

function getLobbyFeedStatusCount(
  feed: ActivityLobbyFeedPage,
  status: LobbyStatusFilterId,
) {
  if (status === "ongoing") {
    return feed.ongoingCount;
  }

  if (status === "ended") {
    return feed.endedCount;
  }

  return feed.totalCount;
}

function getLobbyTotalPages(totalItems: number, pageSize = LOBBY_PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function getPagedLobbyActivities(
  activities: ActivityCardViewModel[],
  page: number,
  pageSize = LOBBY_PAGE_SIZE,
) {
  const startIndex = (page - 1) * pageSize;

  return activities.slice(startIndex, startIndex + pageSize);
}

function dedupeLobbyActivities(activities: ActivityCardViewModel[]) {
  const activityByKey = new Map<string, ActivityCardViewModel>();

  for (const activity of activities) {
    const key = getLobbyActivityKey(activity);

    if (!activityByKey.has(key)) {
      activityByKey.set(key, activity);
    }
  }

  return [...activityByKey.values()];
}

function sortLobbyActivities(activities: ActivityCardViewModel[]) {
  return [...activities].sort((left, right) => {
    const leftEnded = isEndedLobbyActivity(left);
    const rightEnded = isEndedLobbyActivity(right);

    if (leftEnded !== rightEnded) {
      return leftEnded ? 1 : -1;
    }

    const leftTime = new Date(left.startAt).getTime();
    const rightTime = new Date(right.startAt).getTime();

    return leftEnded ? rightTime - leftTime : leftTime - rightTime;
  });
}

function filterLobbyActivitiesByStatus(
  activities: ActivityCardViewModel[],
  statusFilter: LobbyStatusFilterId,
) {
  if (statusFilter === "ongoing") {
    return activities.filter((activity) => !isEndedLobbyActivity(activity));
  }

  if (statusFilter === "ended") {
    return activities.filter(isEndedLobbyActivity);
  }

  return activities;
}

function getStatusFilterOptions(
  activities: ActivityCardViewModel[],
  locale: string,
): StatusFilterOption[] {
  const ongoingCount = activities.filter(
    (activity) => !isEndedLobbyActivity(activity),
  ).length;
  const endedCount = activities.length - ongoingCount;
  const ids: LobbyStatusFilterId[] = ["all", "ongoing", "ended"];

  return ids.map((id) => ({
    id,
    count:
      id === "ongoing"
        ? ongoingCount
        : id === "ended"
          ? endedCount
          : activities.length,
    label: getStatusFilterLabel(locale, id),
  }));
}

function getLobbyFeedStatusFilterOptions(
  feed: ActivityLobbyFeedPage,
  locale: string,
): StatusFilterOption[] {
  const ids: LobbyStatusFilterId[] = ["all", "ongoing", "ended"];

  return ids.map((id) => ({
    id,
    count: getLobbyFeedStatusCount(feed, id),
    label: getStatusFilterLabel(locale, id),
  }));
}

function getActivityLobbyPreviewCopy(locale: string) {
  if (locale === "fr") {
    return {
      eyebrow: "Hall d'equipe",
      title: "Parcourez d'abord",
      description: "Les plans publics sont visibles sans connexion.",
      signIn: "Se connecter",
      browse: "Activites",
      emptyTitle: "Aucun plan pour le moment",
      emptyDescription:
        "Les plans publics apparaitront ici des qu'ils seront disponibles.",
      sectionTitle: "Plans publics",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Team lobby",
      title: "Browse first",
      description: "Public plans are visible before signing in.",
      signIn: "Sign in",
      browse: "Activities",
      emptyTitle: "No plans yet",
      emptyDescription:
        "Public team plans will appear here when they are available.",
      sectionTitle: "Public plans",
    };
  }

  return {
    eyebrow: "组队大厅",
    title: "先逛逛",
    description: "公开组局可以直接看，登录后可以报名、收藏和管理。",
    signIn: "登录",
    browse: "看活动",
    emptyTitle: "暂时还没有公开组局",
    emptyDescription: "有新的公开组局后，会先显示在这里。",
    sectionTitle: "公开组局",
  };
}

function FilterGroupRow({ children, label }: FilterGroupRowProps) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[5.75rem_minmax(0,1fr)] sm:items-center sm:gap-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a7455] sm:whitespace-nowrap sm:px-0 sm:text-left sm:text-[11px] sm:tracking-[0.08em]">
        {label}
      </p>
      <div className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function MobileLobbyFilterSheet({
  activeFilter,
  activeStatusFilter,
  failedFilters,
  filterCopy,
  filterOptions,
  isOpen,
  loadingFilter,
  locale,
  onClose,
  onFilterChange,
  onStatusChange,
  statusFilterOptions,
}: MobileLobbyFilterSheetProps) {
  const copy = getMobileLobbyFilterCopy(locale);

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
      className="fixed inset-0 z-50 sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-mobile-filter-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/36 backdrop-blur-[2px]"
        aria-label={copy.close}
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[1.5rem] border border-[#decfb7] bg-[#fffaf2] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_50px_rgba(70,55,32,0.18)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9c9ad]" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              id="lobby-mobile-filter-title"
              className="text-base font-semibold text-ink"
            >
              {copy.title}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfceb0] bg-white text-[#6b5b4a] shadow-sm"
            aria-label={copy.close}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a7455]">
              {filterCopy.category}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {filterOptions.map((option) => {
                const active = option.id === activeFilter;
                const pending = option.count === null;
                const optionLoading = pending && loadingFilter === option.id;
                const optionFailed = pending && Boolean(failedFilters[option.id]);

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilterChange(option.id)}
                    className={cn(
                      "flex h-11 min-w-0 items-center justify-between gap-2 rounded-2xl border px-3 text-left text-sm font-semibold transition",
                      active
                        ? "border-[#b8cda8] bg-[#e4efd9] text-[#526a39] shadow-[0_6px_16px_rgba(96,124,69,0.11)]"
                        : "border-[#e2d6c2] bg-white/82 text-[#65584b]",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {!pending || optionLoading || optionFailed ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          active
                            ? "bg-white/78 text-[#526a39]"
                            : "bg-[#f3ecdf] text-[#8a7a65]",
                        )}
                      >
                        {optionFailed
                          ? "!"
                          : optionLoading
                            ? "..."
                            : option.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a7455]">
              {filterCopy.status}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {statusFilterOptions.map((option) => {
                const active = option.id === activeStatusFilter;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onStatusChange(option.id)}
                    className={cn(
                      "flex h-11 min-w-0 flex-col items-center justify-center rounded-2xl border px-2 text-sm font-semibold transition",
                      active
                        ? "border-[#d0b58b] bg-[#f1dfb6] text-[#76552a]"
                        : "border-[#e2d6c2] bg-white/82 text-[#65584b]",
                    )}
                  >
                    <span className="min-w-0 max-w-full truncate">
                      {option.label}
                    </span>
                    <span className="text-[11px] opacity-75">{option.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
          onClick={onClose}
        >
          {copy.apply}
        </button>
      </div>
    </div>
  );
}

function LobbyPagination({
  locale,
  onPageChange,
  page,
  scrollTargetId,
  totalItems,
}: {
  locale: string;
  onPageChange: (page: number) => void;
  page: number;
  scrollTargetId: string;
  totalItems: number;
}) {
  const totalPages = getLobbyTotalPages(totalItems);

  return (
    <PaginationControl
      currentPage={page}
      locale={locale}
      mode="callback"
      onPageChange={onPageChange}
      scrollTargetId={scrollTargetId}
      totalPages={totalPages}
    />
  );
}

function LobbySectionLoading({ locale }: { locale: string }) {
  const label =
    locale === "fr"
      ? "Chargement..."
      : locale === "en"
        ? "Loading..."
        : "正在加载...";

  return (
    <div className="rounded-[1.25rem] border border-[#dccfb1] bg-[rgba(255,250,241,0.8)] px-4 py-5">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d7bea0] border-t-[#a66d4c]" />
        <p className="text-sm font-semibold text-[#665747]">{label}</p>
      </div>
      <div className="mt-4 grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-48 animate-pulse rounded-lg border border-black/10 bg-white/72"
            style={{ animationDelay: `${item * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function LobbySectionError({
  locale,
  onRetry,
}: {
  locale: string;
  onRetry: () => void;
}) {
  const copy =
    locale === "fr"
      ? {
          title: "Chargement impossible.",
          retry: "Reessayer",
        }
      : locale === "en"
        ? {
            title: "Could not load this section.",
            retry: "Retry",
          }
        : {
            title: "这个分区加载失败。",
            retry: "重试",
          };

  return (
    <div className="rounded-[1.25rem] border border-dashed border-[#dccfb1] bg-[rgba(255,250,241,0.8)] px-4 py-5">
      <p className="text-base font-semibold text-[#433a30]">{copy.title}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        {copy.retry}
      </button>
    </div>
  );
}

function getLazyLobbySwipeCopy(locale: string) {
  if (locale === "fr") {
    return {
      eyebrow: "Swipe",
      title: "Swipez",
      loading: "Preparation des activites...",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Swipe",
      title: "Swipe",
      loading: "Preparing activities...",
    };
  }

  return {
    eyebrow: "发现活动",
    title: "滑一滑",
    loading: "正在准备活动...",
  };
}

function LobbySwipeLoadingShell({
  className,
  locale,
}: {
  className?: string;
  locale: string;
}) {
  const copy = getLazyLobbySwipeCopy(locale);

  return (
    <section className={cn("overflow-visible px-0 py-1", className)}>
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#fff5e8] text-[#b36f48] shadow-sm ring-1 ring-[#ead7b8]">
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[#a26b42]">
            {copy.eyebrow}
          </p>
          <h2 className="text-[1.35rem] font-semibold leading-[1.05] text-ink">
            {copy.title}
          </h2>
        </div>
      </div>

      <div className="relative mx-auto mt-2 h-[19rem] max-w-[22.5rem] overflow-hidden rounded-[1.2rem] bg-white shadow-[0_14px_32px_rgba(91,69,38,0.1)] ring-1 ring-[#dfceb0]/75">
        <div className="h-32 animate-pulse bg-[linear-gradient(90deg,#e7edf0_0%,#f7f2ea_48%,#e7edf0_100%)]" />
        <div className="space-y-3 p-3.5">
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-[#efe6d7]" />
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-[#efe6d7]" />
          <div className="mt-4 grid gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#f1eadf]" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#f1eadf]" />
          </div>
          <div className="pt-4">
            <div className="h-10 w-full animate-pulse rounded-full bg-[#e7d8c4]" />
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-[#8a7455]">
          {copy.loading}
        </p>
      </div>
    </section>
  );
}

function LazyLobbySwipeDiscovery({
  className,
  initialActivities,
  isAuthenticated,
  locale,
}: {
  className?: string;
  initialActivities: ActivityCardViewModel[];
  isAuthenticated: boolean;
  locale: string;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [requested, setRequested] = useState(initialActivities.length > 0);
  const [loadSettled, setLoadSettled] = useState(initialActivities.length > 0);

  useEffect(() => {
    setActivities(initialActivities);

    if (initialActivities.length > 0) {
      setRequested(true);
      setLoadSettled(true);
    } else {
      setLoadSettled(false);
    }
  }, [initialActivities]);

  useEffect(() => {
    if (requested || typeof window === "undefined") {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let timeoutId: number | null = null;
    const cancelIdleTask = scheduleIdleTask(() => {
      setRequested(true);
      timeoutId = window.setTimeout(() => controller.abort(), 6000);

      void fetch("/api/lobby/swipe", {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Lobby swipe request failed: ${response.status}`);
          }

          return (await response.json()) as LobbySwipeResponse;
        })
        .then((payload) => {
          if (!cancelled && payload.ok) {
            setActivities(payload.activities ?? []);
          }
        })
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error("Failed to load lobby swipe discovery", error);
          }
        })
        .finally(() => {
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }

          if (!cancelled) {
            setLoadSettled(true);
          }
        });
    }, 320);

    return () => {
      cancelled = true;
      controller.abort();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      cancelIdleTask();
    };
  }, [requested]);

  if (activities.length === 0 && !loadSettled) {
    return <LobbySwipeLoadingShell className={className} locale={locale} />;
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <ActivitySwipeDiscovery
      activities={activities}
      className={className}
      isAuthenticated={isAuthenticated}
      locale={locale}
      sourceSurface="activity_list"
      variant="lobby"
    />
  );
}

export function ActivityLobbyPreviewView({
  activities,
  locale,
  swipeActivities,
}: {
  activities: ActivityCardViewModel[];
  locale: string;
  swipeActivities: ActivityCardViewModel[];
}) {
  const previewCopy = getActivityLobbyPreviewCopy(locale);
  const [page, setPage] = useState(1);
  const dedupedActivities = useMemo(
    () => dedupeLobbyActivities(activities),
    [activities],
  );
  const totalPages = getLobbyTotalPages(dedupedActivities.length);
  const visibleActivities = useMemo(
    () => getPagedLobbyActivities(dedupedActivities, page),
    [dedupedActivities, page],
  );

  useEffect(() => {
    setPage(1);
  }, [dedupedActivities.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <DetailSourceRestore sourceKey="lobby" />
      <LazyLobbySwipeDiscovery
        className="sm:hidden"
        isAuthenticated={false}
        initialActivities={swipeActivities}
        locale={locale}
      />

      <section
        id="lobby-preview-results"
        className="space-y-4 sm:rounded-[1.5rem] sm:border sm:border-black/8 sm:bg-white/78 sm:p-5 sm:shadow-sm sm:shadow-black/5"
      >
        <div>
          <h2 className="text-xl font-semibold text-ink">
            {previewCopy.sectionTitle}
          </h2>
        </div>

        {dedupedActivities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-paper/65 px-4 py-7 text-center">
            <p className="text-sm font-semibold text-zinc-700">
              {previewCopy.emptyTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {previewCopy.emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {visibleActivities.map((activity) => (
                <ActivityCard
                  key={getLobbyActivityKey(activity)}
                  actionContext="lobby"
                  activity={activity}
                  favoriteRedirectPath="/lobby"
                  isAuthenticated={false}
                  locale={locale}
                  mobileDense
                  showFavoriteButton
                  showPrimaryAction
                  sourceSurface="activity_list"
                  detailSourceKey="lobby"
                  detailSourceState={{ page }}
                />
              ))}
            </div>
            <LobbyPagination
              locale={locale}
              onPageChange={setPage}
              page={page}
              scrollTargetId="lobby-preview-results"
              totalItems={dedupedActivities.length}
            />
          </>
        )}
      </section>
    </div>
  );
}

export function ActivityLobbyView({
  allActivities,
  allActivityFeed,
  openActivities,
  createdActivities,
  deferredFilters = [],
  joinedActivities,
  favoriteActivities,
  friendHostedActivities,
  friendJoinedActivities,
  starterActivities,
  swipeActivities,
  locale,
}: ActivityLobbyViewProps) {
  const t = getCopy(locale).activityLobby;
  const [activeFilter, setActiveFilter] = useState<LobbyFilterId>("all");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<LobbyStatusFilterId>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [lazySections, setLazySections] = useState<
    Partial<Record<LobbyFilterId, ActivityCardViewModel[]>>
  >({});
  const lazySectionsRef = useRef(lazySections);
  const inFlightSectionRefs = useRef(new Set<LobbyFilterId>());
  const [loadingFilter, setLoadingFilter] = useState<LobbyFilterId | null>(null);
  const [failedFilters, setFailedFilters] = useState<
    Partial<Record<LobbyFilterId, boolean>>
  >({});
  const [feedCache, setFeedCache] = useState<Record<string, ActivityLobbyFeedPage>>(
    () => ({
      [getLobbyFeedCacheKey(allActivityFeed.status, allActivityFeed.page)]:
        allActivityFeed,
    }),
  );
  const feedCacheRef = useRef(feedCache);
  const inFlightFeedRefs = useRef(new Set<string>());
  const [loadingFeedKey, setLoadingFeedKey] = useState<string | null>(null);
  const [failedFeedKeys, setFailedFeedKeys] = useState<Record<string, boolean>>(
    {},
  );
  const deferredFilterSet = useMemo(
    () => new Set<LobbyFilterId>(deferredFilters),
    [deferredFilters],
  );
  const deferredFilterKey = useMemo(
    () => deferredFilters.join("|"),
    [deferredFilters],
  );

  useEffect(() => {
    lazySectionsRef.current = lazySections;
  }, [lazySections]);
  useEffect(() => {
    const key = getLobbyFeedCacheKey(allActivityFeed.status, allActivityFeed.page);

    setFeedCache((current) => {
      const next = {
        ...current,
        [key]: allActivityFeed,
      };

      feedCacheRef.current = next;

      return next;
    });
  }, [allActivityFeed]);
  useEffect(() => {
    feedCacheRef.current = feedCache;
  }, [feedCache]);
  useEffect(() => {
    const context = readDetailSourceContext();

    if (!context || !isDetailSourceReturnPage(context, "lobby")) {
      return;
    }

    const filter = context.sourceState?.filter;
    const status = context.sourceState?.status;
    const restoredPage = Number(context.sourceState?.page);

    if (
      filter === "all" ||
      filter === "open" ||
      filter === "created" ||
      filter === "joined" ||
      filter === "favorites" ||
      filter === "friendHosted" ||
      filter === "friendJoined"
    ) {
      setActiveFilter(filter);
    }

    if (status === "all" || status === "ongoing" || status === "ended") {
      setActiveStatusFilter(status);
    }

    if (Number.isInteger(restoredPage) && restoredPage > 0) {
      setPage(restoredPage);
    }
  }, []);
  const createdActivityKeys = useMemo(
    () => new Set(createdActivities.map((activity) => getLobbyActivityKey(activity))),
    [createdActivities],
  );
  const allFeedSummary =
    feedCache[getLobbyFeedCacheKey("all", 1)] ?? allActivityFeed;
  const favoriteSectionActivities =
    lazySections.favorites ?? favoriteActivities;
  const friendHostedSectionActivities =
    lazySections.friendHosted ?? friendHostedActivities;
  const friendJoinedSectionActivities =
    lazySections.friendJoined ?? friendJoinedActivities;
  const categoryGroups = useMemo(
    () => [
      {
        id: "all" as const,
        activities: allActivities,
        count: allFeedSummary.totalCount,
        isDeferred: false,
        label: getAllLabel(locale),
      },
      {
        id: "created" as const,
        activities: createdActivities,
        count: createdActivities.length,
        isDeferred: false,
        label: getFilterLabel(locale, "created", t.createdTitle),
      },
      {
        id: "joined" as const,
        activities: joinedActivities,
        count: joinedActivities.length,
        isDeferred: false,
        label: getFilterLabel(locale, "joined", t.joinedTitle),
      },
      {
        id: "favorites" as const,
        activities: favoriteSectionActivities,
        count: favoriteSectionActivities.length,
        isDeferred:
          deferredFilterSet.has("favorites") && !lazySections.favorites,
        label: getFilterLabel(locale, "favorites", t.favoriteTitle),
      },
      {
        id: "friendHosted" as const,
        activities: friendHostedSectionActivities,
        count: friendHostedSectionActivities.length,
        isDeferred:
          deferredFilterSet.has("friendHosted") && !lazySections.friendHosted,
        label: getFilterLabel(locale, "friendHosted", t.friendHostedTitle),
      },
      {
        id: "friendJoined" as const,
        activities: friendJoinedSectionActivities,
        count: friendJoinedSectionActivities.length,
        isDeferred:
          deferredFilterSet.has("friendJoined") && !lazySections.friendJoined,
        label: getFilterLabel(locale, "friendJoined", t.friendJoinedTitle),
      },
      {
        id: "open" as const,
        activities:
          openActivities.length > 0
            ? openActivities
            : allActivities.filter((activity) => activity.visibility === "PUBLIC"),
        count:
          openActivities.length > 0
            ? openActivities.length
            : allActivities.filter((activity) => activity.visibility === "PUBLIC")
                .length,
        isDeferred: false,
        label: getFilterLabel(locale, "open", t.openTitle),
      },
    ],
    [
      allActivities,
      allFeedSummary.totalCount,
      createdActivities,
      deferredFilterSet,
      favoriteActivities,
      favoriteSectionActivities,
      friendHostedSectionActivities,
      friendJoinedSectionActivities,
      joinedActivities,
      locale,
      lazySections.favorites,
      lazySections.friendHosted,
      lazySections.friendJoined,
      openActivities,
      t.createdTitle,
      t.favoriteTitle,
      t.friendHostedTitle,
      t.friendJoinedTitle,
      t.joinedTitle,
      t.openTitle,
    ],
  );
  const activeCategoryActivities = useMemo(() => {
    const group = categoryGroups.find((item) => item.id === activeFilter);

    const dedupedActivities = dedupeLobbyActivities(group?.activities ?? []);

    if (activeFilter === "all") {
      return dedupedActivities;
    }

    return sortLobbyActivities(dedupedActivities);
  }, [activeFilter, categoryGroups]);
  const statusFilterOptions = useMemo(
    () =>
      activeFilter === "all"
        ? getLobbyFeedStatusFilterOptions(allFeedSummary, locale)
        : getStatusFilterOptions(activeCategoryActivities, locale),
    [activeCategoryActivities, activeFilter, allFeedSummary, locale],
  );
  const clientVisibleActivities = useMemo(
    () =>
      filterLobbyActivitiesByStatus(
        activeCategoryActivities,
        activeStatusFilter,
      ),
    [activeCategoryActivities, activeStatusFilter],
  );
  const activeFeedPageSize = allFeedSummary.pageSize || LOBBY_PAGE_SIZE;
  const activeFeedTotalItems =
    activeFilter === "all"
      ? getLobbyFeedStatusCount(allFeedSummary, activeStatusFilter)
      : clientVisibleActivities.length;
  const activeFeedTotalPages = getLobbyTotalPages(
    activeFeedTotalItems,
    activeFilter === "all" ? activeFeedPageSize : LOBBY_PAGE_SIZE,
  );
  const activeFeedKey = getLobbyFeedCacheKey(activeStatusFilter, page);
  const activeFeed = activeFilter === "all" ? feedCache[activeFeedKey] : null;
  const activeFeedFailed = Boolean(failedFeedKeys[activeFeedKey]);
  const activeFeedNeedsLoad =
    activeFilter === "all" &&
    activeFeedTotalItems > 0 &&
    !activeFeed &&
    !activeFeedFailed;
  const activeFeedLoading =
    activeFilter === "all" &&
    !activeFeedFailed &&
    (loadingFeedKey === activeFeedKey || activeFeedNeedsLoad);
  const visibleActivities =
    activeFilter === "all" ? (activeFeed?.activities ?? []) : clientVisibleActivities;
  const visibleActivityKeys = useMemo(
    () =>
      new Set(
        visibleActivities.map((activity) => getLobbyActivityKey(activity)),
      ),
    [visibleActivities],
  );
  const starterPanelActivities = useMemo(
    () =>
      starterActivities
        .filter((activity) => !visibleActivityKeys.has(getLobbyActivityKey(activity)))
        .slice(0, 4),
    [starterActivities, visibleActivityKeys],
  );
  const totalPages = activeFeedTotalPages;
  const visiblePageActivities = useMemo(
    () =>
      activeFilter === "all"
        ? visibleActivities
        : getPagedLobbyActivities(visibleActivities, page),
    [activeFilter, page, visibleActivities],
  );
  const filterOptions: FilterOption[] = categoryGroups.map((group) => ({
    id: group.id,
    count: group.isDeferred ? null : group.count,
    label: group.label,
  }));
  const hasActivities = allFeedSummary.totalCount > 0;
  const hasPersonalLobbyData =
    createdActivities.length > 0 ||
    joinedActivities.length > 0 ||
    favoriteActivities.length > 0 ||
    friendHostedActivities.length > 0 ||
    friendJoinedActivities.length > 0;
  const isDefaultLobbyView =
    activeFilter === "all" && activeStatusFilter === "all";
  const shouldShowStarterPanel =
    isDefaultLobbyView &&
    starterPanelActivities.length > 0 &&
    (!hasPersonalLobbyData || allFeedSummary.totalCount < 3);
  const activeCategoryDeferred =
    categoryGroups.find((group) => group.id === activeFilter)?.isDeferred ?? false;
  const activeFilterFailed =
    activeFilter === "all"
      ? activeFeedFailed
      : Boolean(failedFilters[activeFilter]);
  const activeFilterLoading =
    !activeFilterFailed &&
    (activeFeedLoading || loadingFilter === activeFilter || activeCategoryDeferred);
  const emptyCategoryCopy = getEmptyCategoryCopy(locale);
  const emptyCategoryResetLabel = getEmptyCategoryResetLabel(locale);
  const moreActivitiesLabel = getMoreActivitiesLabel(locale);
  const emptyLobbyActions = getEmptyLobbyActions(locale);
  const normalizedEmptyLobbyActions =
    locale === "zh-CN"
      ? emptyLobbyActions.map((action, index) =>
          index === 0
            ? {
                ...action,
                description:
                  "把常一起玩的人先加进来，有新局、新活动时，你马上就能在这里看到。",
              }
            : action,
        )
      : emptyLobbyActions;
  const filterCopy = getLobbyFilterCopy(locale);
  const mobileFilterCopy = getMobileLobbyFilterCopy(locale);
  const activeCategoryLabel =
    filterOptions.find((option) => option.id === activeFilter)?.label ??
    getAllLabel(locale);
  const activeStatusLabel = getStatusFilterLabel(locale, activeStatusFilter);
  const mobileResultCountLabel = activeFilterFailed
    ? "!"
    : activeFilterLoading
      ? "..."
      : activeFeedTotalItems.toString();

  const openMobileFilter = useCallback(() => {
    setMobileFilterOpen(true);
  }, []);

  const closeMobileFilter = useCallback(() => {
    setMobileFilterOpen(false);
  }, []);

  const handleCategoryFilterChange = useCallback((filter: LobbyFilterId) => {
    setActiveFilter(filter);
    setActiveStatusFilter("all");
  }, []);

  const handleStatusFilterChange = useCallback((status: LobbyStatusFilterId) => {
    setActiveStatusFilter(status);
  }, []);

  const loadLobbyFeedPage = useCallback(
    async (
      status: LobbyStatusFilterId,
      targetPage: number,
      options: {
        visual?: boolean;
      } = {},
    ) => {
      const normalizedPage = Math.max(1, Math.floor(targetPage));
      const cacheKey = getLobbyFeedCacheKey(status, normalizedPage);

      if (
        feedCacheRef.current[cacheKey] ||
        inFlightFeedRefs.current.has(cacheKey)
      ) {
        return;
      }

      inFlightFeedRefs.current.add(cacheKey);

      if (options.visual) {
        setLoadingFeedKey(cacheKey);
      }

      setFailedFeedKeys((current) => ({
        ...current,
        [cacheKey]: false,
      }));

      const controller = new AbortController();
      const timeoutId =
        typeof window === "undefined"
          ? null
          : window.setTimeout(() => controller.abort(), 15000);

      try {
        const params = new URLSearchParams({
          page: normalizedPage.toString(),
          status,
        });
        const response = await fetch(`/api/lobby/feed?${params.toString()}`, {
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Lobby feed request failed: ${response.status}`);
        }

        const payload = (await response.json()) as LobbyFeedResponse;

        const feed = payload.feed;

        if (!payload.ok || !feed) {
          throw new Error("Lobby feed payload was not ok.");
        }

        setFeedCache((current) => {
          const responseKey = getLobbyFeedCacheKey(feed.status, feed.page);
          const next = {
            ...current,
            [cacheKey]: feed,
            [responseKey]: feed,
          };

          feedCacheRef.current = next;

          return next;
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load lobby feed page", error);
        }

        setFailedFeedKeys((current) => ({
          ...current,
          [cacheKey]: true,
        }));
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        inFlightFeedRefs.current.delete(cacheKey);
        setLoadingFeedKey((current) => (current === cacheKey ? null : current));
      }
    },
    [],
  );

  const loadDeferredSection = useCallback(
    async (
      filter: LobbyFilterId,
      options: {
        visual?: boolean;
      } = {},
    ) => {
      if (
        !deferredFilterSet.has(filter) ||
        lazySectionsRef.current[filter] ||
        inFlightSectionRefs.current.has(filter)
      ) {
        return;
      }

      inFlightSectionRefs.current.add(filter);

      if (options.visual) {
        setLoadingFilter(filter);
      }

      setFailedFilters((current) => ({
        ...current,
        [filter]: false,
      }));

      const controller = new AbortController();
      const timeoutId =
        typeof window === "undefined"
          ? null
          : window.setTimeout(() => controller.abort(), 15000);

      try {
        const params = new URLSearchParams({
          section: filter,
        });
        const response = await fetch(`/api/lobby/section?${params.toString()}`, {
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Lobby section request failed: ${response.status}`);
        }

        const payload = (await response.json()) as LobbySectionResponse;

        if (!payload.ok) {
          throw new Error("Lobby section payload was not ok.");
        }

        setLazySections((current) => {
          const next = {
            ...current,
            [filter]: payload.activities ?? [],
          };

          lazySectionsRef.current = next;

          return next;
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load lobby section", error);
        }

        setFailedFilters((current) => ({
          ...current,
          [filter]: true,
        }));
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        inFlightSectionRefs.current.delete(filter);
        setLoadingFilter((current) => (current === filter ? null : current));
      }
    },
    [deferredFilterSet],
  );

  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeStatusFilter]);

  useEffect(() => {
    if (
      !deferredFilterSet.has(activeFilter) ||
      lazySections[activeFilter] ||
      activeFilterFailed
    ) {
      return;
    }

    void loadDeferredSection(activeFilter, { visual: true });
  }, [
    activeFilter,
    activeFilterFailed,
    deferredFilterSet,
    lazySections,
    loadDeferredSection,
  ]);

  useEffect(() => {
    if (
      activeFilter !== "all" ||
      activeFeed ||
      activeFeedFailed ||
      activeFeedTotalItems === 0
    ) {
      return;
    }

    void loadLobbyFeedPage(activeStatusFilter, page, { visual: true });
  }, [
    activeFeed,
    activeFeedFailed,
    activeFeedTotalItems,
    activeFilter,
    activeStatusFilter,
    loadLobbyFeedPage,
    page,
  ]);

  useEffect(() => {
    if (
      activeFilter !== "all" ||
      activeFeedLoading ||
      activeFeedFailed ||
      activeFeedTotalItems === 0 ||
      typeof window === "undefined"
    ) {
      return;
    }

    const pagesToPrefetch = [page + 1, page - 1].filter(
      (candidate) =>
        candidate >= 1 &&
        candidate <= totalPages &&
        !feedCacheRef.current[getLobbyFeedCacheKey(activeStatusFilter, candidate)],
    );

    if (pagesToPrefetch.length === 0) {
      return;
    }

    return scheduleIdleTask(() => {
      for (const targetPage of pagesToPrefetch) {
        void loadLobbyFeedPage(activeStatusFilter, targetPage);
      }
    }, 900);
  }, [
    activeFeedFailed,
    activeFeedLoading,
    activeFeedTotalItems,
    activeFilter,
    activeStatusFilter,
    loadLobbyFeedPage,
    page,
    totalPages,
  ]);

  useEffect(() => {
    if (deferredFilters.length === 0 || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;
    const filters = deferredFilters.filter(
      (filter) =>
        filter === "favorites" ||
        filter === "friendHosted" ||
        filter === "friendJoined",
    );

    const loadNext = async (index: number) => {
      if (cancelled || index >= filters.length) {
        return;
      }

      await loadDeferredSection(filters[index]);

      if (!cancelled) {
        timerId = window.setTimeout(() => {
          void loadNext(index + 1);
        }, 450);
      }
    };

    timerId = window.setTimeout(() => {
      void loadNext(0);
    }, 1100);

    return () => {
      cancelled = true;

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [deferredFilterKey, deferredFilters, loadDeferredSection]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-3">
      <DetailSourceRestore sourceKey="lobby" />
      <LazyLobbySwipeDiscovery
        className="sm:hidden"
        isAuthenticated
        initialActivities={swipeActivities}
        locale={locale}
      />
      <MobileLobbyFilterSheet
        activeFilter={activeFilter}
        activeStatusFilter={activeStatusFilter}
        failedFilters={failedFilters}
        filterCopy={filterCopy}
        filterOptions={filterOptions}
        isOpen={mobileFilterOpen}
        loadingFilter={loadingFilter}
        locale={locale}
        onClose={closeMobileFilter}
        onFilterChange={handleCategoryFilterChange}
        onStatusChange={handleStatusFilterChange}
        statusFilterOptions={statusFilterOptions}
      />
      <section>
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="sr-only">{t.title}</h1>
          <div className="hidden flex-col gap-1 px-1 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[13px] font-semibold leading-5 text-ink sm:text-sm">
                {filterCopy.title}
              </p>
              <p className="mt-0.5 hidden text-xs leading-5 text-zinc-500 min-[430px]:block sm:text-sm">
                {t.description}
              </p>
            </div>
            <p className="text-[11px] font-medium leading-4 text-zinc-500 sm:text-xs">
              {activeCategoryLabel} ·{" "}
              {getStatusFilterLabel(locale, activeStatusFilter)} ·{" "}
              {activeFeedTotalItems}
            </p>
          </div>

          <div className="sm:hidden">
            <button
              type="button"
              className="group grid h-11 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-full border border-[#dfceb0] bg-[linear-gradient(135deg,rgba(255,253,247,0.96),rgba(255,246,234,0.92))] px-3 text-left shadow-[0_8px_20px_rgba(91,69,38,0.08)] transition active:scale-[0.99]"
              onClick={openMobileFilter}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1dfb6] text-[#7a552b] shadow-inner shadow-white/50 ring-1 ring-[#dfceb0]">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold leading-3 text-[#9a7448]">
                  {mobileFilterCopy.title}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold leading-4 text-ink">
                  {activeCategoryLabel} · {activeStatusLabel}
                </span>
              </span>
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#e18a6d] px-2.5 py-1 text-xs font-bold text-white shadow-[0_4px_10px_rgba(211,120,91,0.28)]">
                {mobileResultCountLabel}
              </span>
            </button>
          </div>

          <div className="hidden gap-1.5 sm:grid sm:gap-2">
            <FilterGroupRow label={filterCopy.category}>
              {filterOptions.map((option) => {
                const active = option.id === activeFilter;
                const pending = option.count === null;
                const optionLoading = pending && loadingFilter === option.id;
                const optionFailed = pending && Boolean(failedFilters[option.id]);

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleCategoryFilterChange(option.id)}
                    className={cn(
                      "inline-flex h-7 max-w-[8.75rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition sm:h-9 sm:max-w-none sm:gap-1.5 sm:px-3.5 sm:text-sm",
                      active
                        ? "border-[#b8cda8] bg-[#e4efd9] text-[#526a39] shadow-[0_3px_8px_rgba(96,124,69,0.1)]"
                        : "border-sand bg-white/86 text-[#665c51] hover:border-sand-strong hover:bg-white",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {!pending || optionLoading || optionFailed ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs",
                          active
                            ? "bg-white/78 text-[#526a39]"
                            : "bg-[#f3ecdf] text-[#8a7a65]",
                        )}
                      >
                        {optionFailed
                          ? "!"
                          : optionLoading
                            ? "..."
                            : option.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </FilterGroupRow>

            <FilterGroupRow label={filterCopy.status}>
              {statusFilterOptions.map((option) => {
                const active = option.id === activeStatusFilter;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleStatusFilterChange(option.id)}
                    className={cn(
                      "inline-flex h-7 max-w-[8.75rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition sm:h-9 sm:max-w-none sm:gap-1.5 sm:px-3 sm:text-sm",
                      active
                        ? "border-[#d0b58b] bg-[#f1dfb6] text-[#76552a]"
                        : "border-sand bg-team-bg text-[#776b5f] hover:border-sand-strong",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs",
                        active
                          ? "bg-white/70 text-[#76552a]"
                          : "bg-[#f4ecde] text-[#8a7455]",
                      )}
                    >
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </FilterGroupRow>
          </div>
        </div>
      </section>

      {activeFilterLoading ? (
        <LobbySectionLoading locale={locale} />
      ) : activeFilterFailed ? (
        <LobbySectionError
          locale={locale}
          onRetry={() => {
            if (activeFilter === "all") {
              const retryKey = getLobbyFeedCacheKey(activeStatusFilter, page);

              setFailedFeedKeys((current) => ({
                ...current,
                [retryKey]: false,
              }));
              void loadLobbyFeedPage(activeStatusFilter, page, { visual: true });

              return;
            }

            setLazySections((current) => {
              const next = { ...current };
              delete next[activeFilter];

              return next;
            });
            setFailedFilters((current) => ({
              ...current,
              [activeFilter]: false,
            }));
          }}
        />
      ) : !hasActivities && isDefaultLobbyView ? (
        <section className="rounded-[1.5rem] border border-[#dfceb0] bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(246,237,222,0.94))] p-4 shadow-[0_12px_30px_rgba(94,80,52,0.06)] sm:p-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#8a5d3f]">
              {locale === "fr"
                ? "Point de depart"
                : locale === "en"
                  ? "Start here"
                  : "从这里开始"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
              {locale === "fr"
                ? "Trouvez une sortie a partager"
                : locale === "en"
                  ? "Find something to do together"
                  : "今天想找谁一起出门？"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
              {locale === "fr"
                ? "Votre hall se remplira avec vos plans, mais vous pouvez deja partir d'une sortie ouverte ou lancer votre premier groupe."
                : locale === "en"
                  ? "Your own lobby will grow with your plans. For now, start from an open activity or create your first crew."
                  : "你的个人组队动态会慢慢长出来。现在可以先从公开活动找人一起去，或者发起第一个局。"}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {normalizedEmptyLobbyActions.map((action) => (
              <div
                key={action.href}
                className={cn(
                  "rounded-xl border p-3 text-left shadow-sm shadow-black/5",
                  action.tone === "primary"
                    ? "border-[#d8c39f] bg-[linear-gradient(145deg,rgba(242,229,206,0.98),rgba(230,213,185,0.95))]"
                    : action.tone === "secondary"
                      ? "border-[#d7c2b8] bg-[linear-gradient(145deg,rgba(246,233,228,0.96),rgba(239,223,216,0.94))]"
                      : "border-[#dfd6c7] bg-[rgba(255,252,246,0.9)]",
                )}
              >
                <p className="text-base font-semibold text-ink">
                  {action.label}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-600 sm:text-sm sm:leading-6">
                  {action.description}
                </p>
                <Link
                  href={withLocale(locale, action.href)}
                  className={cn(
                    "mt-3 inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition sm:h-9 sm:px-4 sm:text-sm",
                    action.tone === "primary"
                      ? "bg-coral text-white hover:bg-coral-dark"
                      : action.tone === "secondary"
                        ? "bg-white/85 text-[#8c5f4b] hover:bg-white"
                        : "bg-[#f6efe3] text-[#7b6b56] hover:bg-[#efe5d5]",
                  )}
                >
                  {action.label}
                </Link>
              </div>
            ))}
          </div>

          {starterActivities.length > 0 ? (
            <div className="mt-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {locale === "fr"
                      ? "Des occasions pour commencer"
                      : locale === "en"
                        ? "Good first chances"
                        : "适合先组起来的机会"}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500 sm:text-sm">
                    {locale === "fr"
                      ? "Ces sorties ouvertes peuvent devenir votre premier plan."
                      : locale === "en"
                        ? "Open activities that can become your first crew."
                        : "这些公开活动可以直接变成你的第一个组局。"}
                  </p>
                </div>
                <Link
                  href={withLocale(locale, "/activities")}
                  className="inline-flex h-9 w-fit items-center rounded-full border border-sand bg-white/80 px-4 text-sm font-semibold text-[#705f4d] transition hover:bg-white"
                >
                  {moreActivitiesLabel}
                </Link>
              </div>
              <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {starterActivities.slice(0, 4).map((activity) => (
                  <ActivityCard
                    key={`starter:${getLobbyActivityKey(activity)}`}
                    actionContext="lobby"
                    activity={activity}
                    favoriteRedirectPath="/lobby"
                    isAuthenticated
                    locale={locale}
                    mobileDense
                    showFavoriteButton
                    showPrimaryAction
                    sourceSurface="activity_list"
                    detailSourceKey="lobby"
                    detailSourceState={{ starter: true }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : activeFeedTotalItems === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[#dccfb1] bg-[rgba(255,250,241,0.8)] px-4 py-5">
          <p className="text-base font-semibold text-[#433a30]">
            {emptyCategoryCopy.title}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">
            {emptyCategoryCopy.description}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              setActiveStatusFilter("all");
            }}
            className="mt-3 inline-flex h-9 items-center rounded-full border border-sand bg-white/86 px-4 text-sm font-semibold text-[#705f4d] transition hover:border-sand-strong hover:bg-white"
          >
            {emptyCategoryResetLabel}
          </button>
        </div>
      ) : (
        <>
          {shouldShowStarterPanel ? (
            <section className="space-y-3 rounded-[1.25rem] border border-[#dfceb0] bg-white/72 p-4 shadow-sm shadow-black/5 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7455]">
                    {locale === "fr"
                      ? "Pour remplir votre hall"
                      : locale === "en"
                        ? "Build your lobby"
                        : "把大厅热起来"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink sm:text-xl">
                    {locale === "fr"
                      ? "Transformez une sortie ouverte en plan"
                      : locale === "en"
                        ? "Turn an open activity into a crew"
                        : "从一个公开活动开始组队"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {locale === "fr"
                      ? "Votre reseau est encore leger. Ces sorties donnent tout de suite une raison de contacter quelqu'un."
                      : locale === "en"
                        ? "Your network is still light. These activities give you a concrete reason to start."
                    : "好友和记录还少时，先用这些真实活动作为组队种子。"}
                  </p>
                </div>
                <Link
                  href={withLocale(locale, "/activities")}
                  className="inline-flex h-9 w-fit shrink-0 items-center rounded-full border border-sand bg-white/80 px-4 text-sm font-semibold text-[#705f4d] transition hover:bg-white"
                >
                  {moreActivitiesLabel}
                </Link>
              </div>
              <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {starterPanelActivities.map((activity) => (
                  <ActivityCard
                    key={`starter:${getLobbyActivityKey(activity)}`}
                    actionContext="lobby"
                    activity={activity}
                    favoriteRedirectPath="/lobby"
                    isAuthenticated
                    locale={locale}
                    mobileDense
                    showFavoriteButton
                    showPrimaryAction
                    sourceSurface="activity_list"
                    detailSourceKey="lobby"
                    detailSourceState={{ starter: true }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section
            id="lobby-results"
            className="space-y-3 border-t border-sand pt-4 sm:space-y-4"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-ink sm:text-xl">
                    {activeCategoryLabel}
                  </h2>
                  <span className="shrink-0 rounded-full bg-white/78 px-2.5 py-1 text-xs font-semibold text-[#8a7455] ring-1 ring-sand">
                    {activeFeedTotalItems}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getStatusFilterLabel(locale, activeStatusFilter)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePageActivities.map((activity) => (
                <ActivityCard
                  key={getLobbyActivityKey(activity)}
                  actionContext="lobby"
                  activity={activity}
                  favoriteRedirectPath="/lobby"
                  isAuthenticated
                  isOwnActivity={createdActivityKeys.has(
                    getLobbyActivityKey(activity),
                  )}
                  locale={locale}
                  mobileDense
                  showFavoriteButton
                  showPrimaryAction
                  sourceSurface="activity_list"
                  detailSourceKey="lobby"
                  detailSourceState={{
                    filter: activeFilter,
                    page,
                    status: activeStatusFilter,
                  }}
                />
              ))}
            </div>
            <LobbyPagination
              locale={locale}
              onPageChange={setPage}
              page={page}
              scrollTargetId="lobby-results"
              totalItems={activeFeedTotalItems}
            />
          </section>
        </>
      )}
    </div>
  );
}
