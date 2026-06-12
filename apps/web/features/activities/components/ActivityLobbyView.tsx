"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import { ActivityCard } from "./ActivityCard";
import { isPublicEventCard } from "../utils/activityCardKind";
import { getActivityDisplayStatus } from "../utils/activityDisplay";

type ActivityLobbyViewProps = {
  allActivities: ActivityCardViewModel[];
  openActivities: ActivityCardViewModel[];
  createdActivities: ActivityCardViewModel[];
  joinedActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
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

type LobbyStatusFilterId = "all" | "ongoing" | "ended";

type StatusFilterOption = {
  id: LobbyStatusFilterId;
  count: number;
  label: string;
};

const LOBBY_PAGE_SIZE = 10;

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
        return "Ouverts";
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

function getLobbyTotalPages(totalItems: number) {
  return Math.max(1, Math.ceil(totalItems / LOBBY_PAGE_SIZE));
}

function getPagedLobbyActivities(
  activities: ActivityCardViewModel[],
  page: number,
) {
  const startIndex = (page - 1) * LOBBY_PAGE_SIZE;

  return activities.slice(startIndex, startIndex + LOBBY_PAGE_SIZE);
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
        "Les activites et equipes publiques apparaitront ici des qu'elles seront disponibles.",
      sectionTitle: "A voir maintenant",
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
        "Public activities and teams will appear here when they are available.",
      sectionTitle: "Now visible",
    };
  }

  return {
    eyebrow: "组队大厅",
    title: "先逛逛",
    description: "公开活动和组局可以直接看。",
    signIn: "登录",
    browse: "看活动",
    emptyTitle: "暂时还没有公开内容",
    emptyDescription: "有新的活动或组局后，会先显示在这里。",
    sectionTitle: "正在开放",
  };
}

function FilterGroupRow({ children, label }: FilterGroupRowProps) {
  return (
    <div className="grid gap-2 rounded-2xl bg-[#fffaf2]/78 p-2 ring-1 ring-black/5 sm:grid-cols-[4.25rem_minmax(0,1fr)] sm:items-center">
      <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7455] sm:px-0 sm:text-center">
        {label}
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function LobbyPagination({
  locale,
  onPageChange,
  page,
  totalItems,
}: {
  locale: string;
  onPageChange: (page: number) => void;
  page: number;
  totalItems: number;
}) {
  const totalPages = getLobbyTotalPages(totalItems);

  if (totalPages <= 1) {
    return null;
  }

  const t = getCopy(locale).activityPagination;
  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const progressPercent = Math.round((page / totalPages) * 100);
  const buttonClassName =
    "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#dfccb2] bg-white/88 px-2 text-xs font-semibold text-[#5b4b3a] shadow-sm shadow-black/5 transition hover:border-[#d8b895] hover:bg-white disabled:cursor-not-allowed disabled:border-[#eadfce] disabled:bg-[#fbf7ef]/72 disabled:text-zinc-400 disabled:shadow-none sm:px-3 sm:text-sm";

  return (
    <nav
      aria-label="Lobby pagination"
      className="mx-auto flex w-full max-w-[34rem] flex-col gap-2 rounded-[1.5rem] border border-[#e4d5bd] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(249,241,229,0.92))] p-2 shadow-[0_12px_26px_rgba(94,80,52,0.08)] sm:rounded-full sm:p-2.5"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          className={buttonClassName}
          disabled={previousDisabled}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {t.previous}
        </button>
        <div className="min-w-20 text-center">
          <p className="text-xs font-semibold text-[#5b4b3a] sm:text-sm">
            {t.pageSummary(page, totalPages)}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eadfce]">
            <div
              className="h-full rounded-full bg-[#df8d6e]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className={buttonClassName}
          disabled={nextDisabled}
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        >
          {t.next}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </nav>
  );
}

export function ActivityLobbyPreviewView({
  activities,
  locale,
}: {
  activities: ActivityCardViewModel[];
  locale: string;
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
      <section className="rounded-[1.5rem] border border-[#dfceb0] bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(246,237,222,0.94))] px-5 py-5 shadow-[0_12px_30px_rgba(94,80,52,0.06)] sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-moss">
              {previewCopy.eyebrow}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight text-ink sm:text-4xl">
              {previewCopy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">
              {previewCopy.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row md:flex-col lg:flex-row">
            <Link
              href={withLocale(locale, "/sign-in")}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {previewCopy.signIn}
            </Link>
            <Link
              href={withLocale(locale, "/activities")}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-[#d8cbb8] bg-white/75 px-5 text-sm font-semibold text-[#705f4d] transition hover:bg-white"
            >
              {previewCopy.browse}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4 sm:rounded-[1.5rem] sm:border sm:border-black/8 sm:bg-white/78 sm:p-5 sm:shadow-sm sm:shadow-black/5">
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
                />
              ))}
            </div>
            <LobbyPagination
              locale={locale}
              onPageChange={setPage}
              page={page}
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
  openActivities,
  createdActivities,
  joinedActivities,
  favoriteActivities,
  friendHostedActivities,
  friendJoinedActivities,
  locale,
}: ActivityLobbyViewProps) {
  const t = getCopy(locale).activityLobby;
  const [activeFilter, setActiveFilter] = useState<LobbyFilterId>("all");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<LobbyStatusFilterId>("all");
  const [page, setPage] = useState(1);
  const createdActivityKeys = useMemo(
    () => new Set(createdActivities.map((activity) => getLobbyActivityKey(activity))),
    [createdActivities],
  );
  const categoryGroups = useMemo(
    () => [
      {
        id: "all" as const,
        activities: allActivities,
        label: getAllLabel(locale),
      },
      {
        id: "created" as const,
        activities: createdActivities,
        label: getFilterLabel(locale, "created", t.createdTitle),
      },
      {
        id: "joined" as const,
        activities: joinedActivities,
        label: getFilterLabel(locale, "joined", t.joinedTitle),
      },
      {
        id: "favorites" as const,
        activities: favoriteActivities,
        label: getFilterLabel(locale, "favorites", t.favoriteTitle),
      },
      {
        id: "friendHosted" as const,
        activities: friendHostedActivities,
        label: getFilterLabel(locale, "friendHosted", t.friendHostedTitle),
      },
      {
        id: "friendJoined" as const,
        activities: friendJoinedActivities,
        label: getFilterLabel(locale, "friendJoined", t.friendJoinedTitle),
      },
      {
        id: "open" as const,
        activities:
          openActivities.length > 0
            ? openActivities
            : allActivities.filter((activity) => activity.visibility === "PUBLIC"),
        label: getFilterLabel(locale, "open", t.openTitle),
      },
    ],
    [
      allActivities,
      createdActivities,
      favoriteActivities,
      friendHostedActivities,
      friendJoinedActivities,
      joinedActivities,
      locale,
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
    () => getStatusFilterOptions(activeCategoryActivities, locale),
    [activeCategoryActivities, locale],
  );
  const visibleActivities = useMemo(
    () =>
      filterLobbyActivitiesByStatus(
        activeCategoryActivities,
        activeStatusFilter,
      ),
    [activeCategoryActivities, activeStatusFilter],
  );
  const totalPages = getLobbyTotalPages(visibleActivities.length);
  const visiblePageActivities = useMemo(
    () => getPagedLobbyActivities(visibleActivities, page),
    [page, visibleActivities],
  );
  const filterOptions: FilterOption[] = categoryGroups.map((group) => ({
    id: group.id,
    count: group.activities.length,
    label: group.label,
  }));
  const hasActivities = allActivities.length > 0;
  const emptyCategoryCopy = getEmptyCategoryCopy(locale);
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
  const activeCategoryLabel =
    filterOptions.find((option) => option.id === activeFilter)?.label ??
    getAllLabel(locale);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeStatusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      <section className="sm:rounded-[1.5rem] sm:border sm:border-[#e1d5c2] sm:bg-[linear-gradient(180deg,rgba(255,252,246,0.94),rgba(250,244,234,0.9))] sm:p-4 sm:shadow-[0_10px_26px_rgba(94,80,52,0.05)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h1 className="sr-only">{t.title}</h1>
            <div>
              <p className="text-sm font-semibold text-ink">
                {filterCopy.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-zinc-500 sm:text-sm">
                {t.description}
              </p>
            </div>
            <p className="text-xs font-medium text-zinc-500">
              {activeCategoryLabel} ·{" "}
              {getStatusFilterLabel(locale, activeStatusFilter)} ·{" "}
              {visibleActivities.length}
            </p>
          </div>

          <div className="grid gap-2 sm:gap-2">
            <FilterGroupRow label={filterCopy.category}>
              {filterOptions.map((option) => {
                const active = option.id === activeFilter;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setActiveFilter(option.id);
                      setActiveStatusFilter("all");
                    }}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition sm:px-3.5 sm:text-sm",
                      active
                        ? "border-[#b8cda8] bg-[#e4efd9] text-[#526a39] shadow-[0_3px_8px_rgba(96,124,69,0.1)]"
                        : "border-[#e4d9c9] bg-white/86 text-[#665c51] hover:border-[#cfc2af] hover:bg-white",
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs",
                        active
                          ? "bg-white/78 text-[#526a39]"
                          : "bg-[#f3ecdf] text-[#8a7a65]",
                      )}
                    >
                      {option.count ?? 0}
                    </span>
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
                    onClick={() => setActiveStatusFilter(option.id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition sm:text-sm",
                      active
                        ? "border-[#d0b58b] bg-[#f1dfb6] text-[#76552a]"
                        : "border-[#e7dfcf] bg-[#fffaf2] text-[#776b5f] hover:border-[#d7ccb5]",
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs",
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

      {!hasActivities ? (
        <section className="rounded-[1.75rem] border border-[#dfceb0] bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(246,237,222,0.94))] p-5 shadow-[0_12px_30px_rgba(94,80,52,0.06)] sm:p-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
              {t.emptyTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
              {t.emptyDescription}
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {normalizedEmptyLobbyActions.map((action) => (
              <div
                key={action.href}
                className={cn(
                  "rounded-[1.25rem] border p-4 text-left shadow-sm shadow-black/5",
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
                <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                  {action.description}
                </p>
                <Link
                  href={withLocale(locale, action.href)}
                  className={cn(
                    "mt-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition",
                    action.tone === "primary"
                      ? "bg-[#d39a78] text-white hover:bg-[#c88d69]"
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
        </section>
      ) : visibleActivities.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[#dccfb1] bg-[rgba(255,250,241,0.8)] px-4 py-5">
          <p className="text-base font-semibold text-[#433a30]">
            {emptyCategoryCopy.title}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">
            {emptyCategoryCopy.description}
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {activeCategoryLabel}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {getStatusFilterLabel(locale, activeStatusFilter)} ·{" "}
                {visibleActivities.length}
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
              />
            ))}
          </div>
          <LobbyPagination
            locale={locale}
            onPageChange={setPage}
            page={page}
            totalItems={visibleActivities.length}
          />
        </section>
      )}
    </div>
  );
}
