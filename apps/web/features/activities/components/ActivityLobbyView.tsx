"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import { ActivityCard } from "./ActivityCard";

type ActivityLobbyViewProps = {
  createdActivities: ActivityCardViewModel[];
  joinedActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
  locale: string;
};

type LobbyFilterId =
  | "all"
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

const lobbyFilterStyles: Record<
  LobbyFilterId,
  {
    active: string;
    badge: string;
    idle: string;
    idleBadge: string;
  }
> = {
  all: {
    active:
      "border-[#d1c6b4] bg-[linear-gradient(135deg,rgba(243,239,230,0.98),rgba(233,228,217,0.95))] text-[#6d675c] shadow-[0_3px_8px_rgba(121,108,86,0.08)]",
    badge: "bg-[rgba(255,255,255,0.72)] text-[#7d7467]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#766b5d] hover:border-[#d7ccb5] hover:text-[#6d675c]",
    idleBadge: "bg-[#f4ecde] text-[#957d56]",
  },
  created: {
    active:
      "border-[#d2bd81] bg-[linear-gradient(135deg,rgba(246,235,202,0.98),rgba(234,218,170,0.95))] text-[#7b5c1f] shadow-[0_3px_8px_rgba(177,141,58,0.12)]",
    badge: "bg-[rgba(255,249,236,0.78)] text-[#8f6a24]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#7b6850] hover:border-[#d7c189] hover:text-[#8a6729]",
    idleBadge: "bg-[#f6ecd6] text-[#a27b33]",
  },
  joined: {
    active:
      "border-[#c3ceda] bg-[linear-gradient(135deg,rgba(226,234,242,0.98),rgba(207,219,231,0.95))] text-[#4d6783] shadow-[0_3px_8px_rgba(102,126,153,0.12)]",
    badge: "bg-[rgba(246,250,253,0.8)] text-[#56708b]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#766b5d] hover:border-[#c6d2dd] hover:text-[#59728d]",
    idleBadge: "bg-[#eaf0f5] text-[#69829b]",
  },
  favorites: {
    active:
      "border-[#dbc4bc] bg-[linear-gradient(135deg,rgba(245,229,224,0.98),rgba(236,214,207,0.95))] text-[#86545f] shadow-[0_3px_8px_rgba(165,112,123,0.1)]",
    badge: "bg-[rgba(255,247,246,0.8)] text-[#95626d]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#766b5d] hover:border-[#dbc0bb] hover:text-[#8d5c67]",
    idleBadge: "bg-[#f5e5e2] text-[#a36e79]",
  },
  friendHosted: {
    active:
      "border-[#d2b18e] bg-[linear-gradient(135deg,rgba(244,227,205,0.98),rgba(233,206,178,0.95))] text-[#8a5b35] shadow-[0_3px_8px_rgba(171,121,79,0.1)]",
    badge: "bg-[rgba(255,248,241,0.78)] text-[#996742]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#766b5d] hover:border-[#d4b08f] hover:text-[#946540]",
    idleBadge: "bg-[#f5e7d8] text-[#a5754d]",
  },
  friendJoined: {
    active:
      "border-[#c5cda8] bg-[linear-gradient(135deg,rgba(233,238,217,0.98),rgba(219,226,191,0.95))] text-[#66743d] shadow-[0_3px_8px_rgba(125,138,77,0.1)]",
    badge: "bg-[rgba(248,251,239,0.8)] text-[#738149]",
    idle:
      "border-[#e7dfcf] bg-[rgba(255,252,246,0.94)] text-[#766b5d] hover:border-[#c6cea7] hover:text-[#718048]",
    idleBadge: "bg-[#eef2dc] text-[#7e8d53]",
  },
};

type ActivityLobbySectionProps = {
  activities: ActivityCardViewModel[];
  description: string;
  locale: string;
  title: string;
};

function ActivityLobbySection({
  activities,
  description,
  locale,
  title,
}: ActivityLobbySectionProps) {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-black/8 bg-white/78 p-4 shadow-sm shadow-black/5 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            activities.length > 0
              ? "bg-moss/12 text-moss"
              : "bg-zinc-100 text-zinc-500",
          )}
        >
          {activities.length}
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-paper/65 px-4 py-6">
          <p className="text-sm font-semibold text-zinc-700">
            {getCopy(locale).activityLobby.emptySectionTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isAuthenticated
              locale={locale}
              showFavoriteButton
            />
          ))}
        </div>
      )}
    </section>
  );
}

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
      case "created":
        return "Créées";
      case "joined":
        return "Rejointes";
      case "favorites":
        return "Favoris";
      case "friendHosted":
        return "Amis hôtes";
      case "friendJoined":
        return "Amis inscrits";
      default:
        return fallback;
    }
  }

  if (locale === "en") {
    switch (id) {
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
    case "created":
      return "我发起的";
    case "joined":
      return "我参加的";
    case "favorites":
      return "我收藏的";
    case "friendHosted":
      return "朋友发起";
    case "friendJoined":
      return "朋友参加";
    default:
      return fallback;
  }
}

function getEmptyCategoryCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Aucune activite dans cette categorie pour le moment.",
      description:
        "Essayez une autre categorie pour retrouver vos activites et celles de vos amis.",
    };
  }

  if (locale === "en") {
    return {
      title: "Nothing in this section yet.",
      description:
        "Try another section to see your activities, favorites, or friend-related plans.",
    };
  }

  return {
    title: "这个分类里暂时还没有活动。",
    description: "可以切换其他分类，查看我发起、我参加、我收藏或和朋友相关的活动。",
  };
}

export function ActivityLobbyView({
  createdActivities,
  joinedActivities,
  favoriteActivities,
  friendHostedActivities,
  friendJoinedActivities,
  locale,
}: ActivityLobbyViewProps) {
  const t = getCopy(locale).activityLobby;
  const [activeFilter, setActiveFilter] = useState<LobbyFilterId>("all");
  const sections = [
    {
      id: "created" as const,
      activities: createdActivities,
      description: t.createdDescription,
      title: t.createdTitle,
    },
    {
      id: "joined" as const,
      activities: joinedActivities,
      description: t.joinedDescription,
      title: t.joinedTitle,
    },
    {
      id: "favorites" as const,
      activities: favoriteActivities,
      description: t.favoriteDescription,
      title: t.favoriteTitle,
    },
    {
      id: "friendHosted" as const,
      activities: friendHostedActivities,
      description: t.friendHostedDescription,
      title: t.friendHostedTitle,
    },
    {
      id: "friendJoined" as const,
      activities: friendJoinedActivities,
      description: t.friendJoinedDescription,
      title: t.friendJoinedTitle,
    },
  ];
  const filterOptions: FilterOption[] = [
    { id: "all", count: null, label: getAllLabel(locale) },
    ...sections.map((section) => ({
      id: section.id,
      count: section.activities.length,
      label: getFilterLabel(locale, section.id, section.title),
    })),
  ];
  const visibleSections = useMemo(
    () =>
      activeFilter === "all"
        ? sections
        : sections.filter((section) => section.id === activeFilter),
    [activeFilter, sections],
  );
  const hasActivities = sections.some(
    (section) => section.activities.length > 0,
  );
  const hasVisibleActivities = visibleSections.some(
    (section) => section.activities.length > 0,
  );
  const emptyCategoryCopy = getEmptyCategoryCopy(locale);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-[#e0d4bf] bg-[radial-gradient(circle_at_top_left,_rgba(210,181,122,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(136,157,151,0.1),_transparent_30%),linear-gradient(135deg,rgba(255,250,244,0.98),rgba(244,236,223,0.95))] px-5 py-6 shadow-[0_10px_26px_rgba(94,80,52,0.05)] sm:px-7 sm:py-8">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 sm:text-lg">
            {t.description}
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-4xl">
          <div className="rounded-[1.5rem] border border-[#e3d9c7] bg-[rgba(255,251,245,0.78)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              {filterOptions.map((option) => {
                const active = option.id === activeFilter;
                const palette = lobbyFilterStyles[option.id];

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveFilter(option.id)}
                    className={cn(
                      "inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm",
                      active ? palette.active : palette.idle,
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {typeof option.count === "number" ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs",
                          active ? palette.badge : palette.idleBadge,
                        )}
                      >
                        {option.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              </div>
            </div>
        </div>
      </section>

      {!hasActivities ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : !hasVisibleActivities ? (
        <div className="rounded-[1.75rem] border border-dashed border-[#dccfb1] bg-[rgba(255,250,241,0.8)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[#433a30]">
            {emptyCategoryCopy.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {emptyCategoryCopy.description}
          </p>
        </div>
      ) : null}

      {visibleSections.map((section) => (
        <ActivityLobbySection
          key={section.title}
          activities={section.activities}
          description={section.description}
          locale={locale}
          title={section.title}
        />
      ))}
    </div>
  );
}
