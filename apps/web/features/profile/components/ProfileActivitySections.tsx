"use client";

import Link from "next/link";
import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProfileDashboardViewModel } from "../queries/getProfileDashboard";
import { ProfileParticipationCard } from "./ProfileParticipationCard";

type ProfileActivitySectionsProps = {
  activeSection: ProfileSectionKey;
  dashboard: ProfileDashboardViewModel;
  isAuthenticated: boolean;
  isSelf: boolean;
  locale: string;
  onActiveSectionChange: (section: ProfileSectionKey) => void;
};

export type ProfileSectionKey = "created" | "participation" | "favorite";
type SortDirection = "latest" | "oldest";
const profileActivityListLimit = 12;

function getProfileSpaceCopy(locale: string) {
  if (locale === "en") {
    return {
      createdTitle: "My created",
      sectionCount: (count: number) => `${count}`,
      createdAction: "Start a crew",
      participationTitle: "My joined",
      participationAction: "Discover activities",
      favoriteTitle: "My saved",
      favoriteAction: "Discover activities",
      sortLatest: "Latest first",
      sortOldest: "Oldest first",
    };
  }

  if (locale === "fr") {
    return {
      createdTitle: "Mes créations",
      sectionCount: (count: number) => `${count}`,
      createdAction: "Créer une sortie",
      participationTitle: "Mes participations",
      participationAction: "Découvrir",
      favoriteTitle: "Mes favoris",
      favoriteAction: "Découvrir",
      sortLatest: "Plus récent",
      sortOldest: "Plus ancien",
    };
  }

  return {
    createdTitle: "我的发起",
    sectionCount: (count: number) => `${count}`,
    createdAction: "发起组局",
    participationTitle: "我的参与",
    participationAction: "发现活动",
    favoriteTitle: "我的收藏",
    favoriteAction: "发现活动",
    sortLatest: "最近",
    sortOldest: "最早",
  };
}

function CompactEmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#d8c9b5] bg-white/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
      <Link
        href={actionHref}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function SectionHeader({
  count,
  locale,
  onToggleSort,
  sortDirection,
  title,
}: {
  count: number;
  locale: string;
  onToggleSort?: () => void;
  sortDirection?: SortDirection;
  title: string;
}) {
  const t = getProfileSpaceCopy(locale);
  const sortLabel = sortDirection === "oldest" ? t.sortOldest : t.sortLatest;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-lg font-semibold text-ink sm:text-xl">
          {title}
        </h2>
        <span className="shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
          {t.sectionCount(count)}
        </span>
      </div>
      {onToggleSort ? (
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-zinc-700 ring-1 ring-black/10 transition hover:bg-zinc-50"
          onClick={onToggleSort}
          type="button"
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {sortLabel}
        </button>
      ) : null}
    </div>
  );
}

function compareIsoDate(left: string, right: string, direction: SortDirection) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  return direction === "latest" ? rightTime - leftTime : leftTime - rightTime;
}

export function ProfileActivitySections({
  activeSection,
  dashboard,
  isAuthenticated,
  isSelf,
  locale,
  onActiveSectionChange,
}: ProfileActivitySectionsProps) {
  const t = getCopy(locale);
  const profileSpaceCopy = getProfileSpaceCopy(locale);
  const hiddenCreatedActivityCount = Math.max(
    dashboard.createdActivityCount - dashboard.createdActivities.length,
    0,
  );
  const hiddenParticipationCount = Math.max(
    dashboard.participationCount - dashboard.participations.length,
    0,
  );
  const hiddenFavoriteActivityCount = Math.max(
    dashboard.favoriteActivityCount - dashboard.favoriteActivities.length,
    0,
  );
  const createdTitle = isSelf
    ? profileSpaceCopy.createdTitle
    : t.profile.createdTitle;
  const participationTitle = isSelf
    ? profileSpaceCopy.participationTitle
    : t.profile.participationTitle;
  const favoriteTitle = isSelf
    ? profileSpaceCopy.favoriteTitle
    : t.profile.favoriteTitle;
  const tabs = useMemo(
    () => [
      {
        key: "created" as const,
        title: createdTitle,
        count: dashboard.createdActivityCount,
      },
      ...(isSelf
        ? [
            {
              key: "participation" as const,
              title: participationTitle,
              count: dashboard.participationCount,
            },
            {
              key: "favorite" as const,
              title: favoriteTitle,
              count: dashboard.favoriteActivityCount,
            },
          ]
        : []),
    ],
    [
      dashboard.createdActivityCount,
      dashboard.favoriteActivityCount,
      dashboard.participationCount,
      createdTitle,
      favoriteTitle,
      isSelf,
      participationTitle,
    ],
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("latest");
  const sortedCreatedActivities = useMemo(
    () =>
      [...dashboard.createdActivities].sort((left, right) =>
        compareIsoDate(left.startAt, right.startAt, sortDirection),
      ),
    [dashboard.createdActivities, sortDirection],
  );
  const sortedParticipations = useMemo(
    () =>
      [...dashboard.participations].sort((left, right) =>
        compareIsoDate(left.joinedAt, right.joinedAt, sortDirection),
      ),
    [dashboard.participations, sortDirection],
  );
  const sortedFavoriteActivities = useMemo(
    () =>
      [...dashboard.favoriteActivities].sort((left, right) =>
        compareIsoDate(left.createdAt, right.createdAt, sortDirection),
      ),
    [dashboard.favoriteActivities, sortDirection],
  );
  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "latest" ? "oldest" : "latest"));
  };
  const createdHref = withLocale(locale, "/activities/new");
  const discoverHref = withLocale(locale, "/activities");

  return (
    <section className="space-y-5">
      {isSelf && tabs.length > 1 ? (
        <div className="sticky top-[calc(var(--app-header-height,0px)+0.5rem)] z-10 grid grid-cols-3 gap-2 bg-paper/90 py-2 backdrop-blur md:static md:rounded-2xl md:bg-white/55 md:p-2 md:backdrop-blur-0 md:ring-1 md:ring-black/10">
          {tabs.map((tab) => {
            const active = activeSection === tab.key;

            return (
              <button
                key={tab.key}
                className={cn(
                  "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium ring-1 transition",
                  active
                    ? "bg-clay text-white ring-clay"
                    : "bg-white text-zinc-700 ring-black/10",
                )}
                onClick={() => onActiveSectionChange(tab.key)}
                type="button"
              >
                <span className="min-w-0 truncate">{tab.title}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-xs",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-6">
        <section
          className={cn(
            "space-y-3 border-t border-black/10 pt-4",
            activeSection !== "created" && "hidden",
          )}
        >
          <SectionHeader
            count={dashboard.createdActivityCount}
            locale={locale}
            onToggleSort={
              dashboard.createdActivities.length > 1
                ? toggleSortDirection
                : undefined
            }
            sortDirection={sortDirection}
            title={createdTitle}
          />
          {dashboard.createdActivities.length === 0 ? (
            <CompactEmptyState
              actionHref={createdHref}
              actionLabel={profileSpaceCopy.createdAction}
              title={t.profile.createdEmptyTitle}
              description={t.profile.createdEmptyDescription}
            />
          ) : (
            <>
              <div className="grid gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
                {sortedCreatedActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isOwnActivity={isSelf}
                    locale={locale}
                    sourceSurface="profile"
                  />
                ))}
              </div>
              {hiddenCreatedActivityCount > 0 ? (
                <p className="text-sm text-zinc-500">
                  {t.profile.hiddenCreated(
                    profileActivityListLimit,
                    hiddenCreatedActivityCount,
                  )}
                </p>
              ) : null}
            </>
          )}
        </section>

        {isSelf ? (
          <>
            <section
              className={cn(
                "space-y-3 border-t border-black/10 pt-4",
                activeSection !== "participation" && "hidden",
              )}
            >
              <SectionHeader
                count={dashboard.participationCount}
                locale={locale}
                onToggleSort={
                  dashboard.participations.length > 1
                    ? toggleSortDirection
                    : undefined
                }
                sortDirection={sortDirection}
                title={participationTitle}
              />
              {dashboard.participations.length === 0 ? (
                <CompactEmptyState
                  actionHref={discoverHref}
                  actionLabel={profileSpaceCopy.participationAction}
                  title={t.profile.participationEmptyTitle}
                  description={t.profile.participationEmptyDescription}
                />
              ) : (
                <>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {sortedParticipations.map((participation) => (
                      <ProfileParticipationCard
                        key={participation.id}
                        participation={participation}
                        locale={locale}
                      />
                    ))}
                  </div>
                  {hiddenParticipationCount > 0 ? (
                    <p className="text-sm text-zinc-500">
                      {t.profile.hiddenParticipation(
                        profileActivityListLimit,
                        hiddenParticipationCount,
                      )}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section
              className={cn(
                "space-y-3 border-t border-black/10 pt-4",
                activeSection !== "favorite" && "hidden",
              )}
            >
              <SectionHeader
                count={dashboard.favoriteActivityCount}
                locale={locale}
                onToggleSort={
                  dashboard.favoriteActivities.length > 1
                    ? toggleSortDirection
                    : undefined
                }
                sortDirection={sortDirection}
                title={favoriteTitle}
              />
              {dashboard.favoriteActivities.length === 0 ? (
                <CompactEmptyState
                  actionHref={discoverHref}
                  actionLabel={profileSpaceCopy.favoriteAction}
                  title={t.profile.favoriteEmptyTitle}
                  description={t.profile.favoriteEmptyDescription}
                />
              ) : (
                <>
                  <div className="grid gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
                    {sortedFavoriteActivities.map((favorite) => (
                      <ActivityCard
                        key={favorite.id}
                        activity={favorite.activity}
                        isAuthenticated={isAuthenticated}
                        locale={locale}
                        showFavoriteButton
                        showPrimaryAction={
                          !isPublicEventCard(favorite.activity)
                        }
                        sourceSurface="profile"
                      />
                    ))}
                  </div>
                  {hiddenFavoriteActivityCount > 0 ? (
                    <p className="text-sm text-zinc-500">
                      {t.profile.hiddenFavorite(
                        profileActivityListLimit,
                        hiddenFavoriteActivityCount,
                      )}
                    </p>
                  ) : null}
                </>
              )}
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
