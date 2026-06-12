"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProfileDashboardViewModel } from "../queries/getProfileDashboard";
import { ProfileParticipationCard } from "./ProfileParticipationCard";

type ProfileActivitySectionsProps = {
  dashboard: ProfileDashboardViewModel;
  isAuthenticated: boolean;
  isSelf: boolean;
  locale: string;
};

type ProfileSectionKey = "created" | "participation" | "favorite";
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
  title,
}: {
  count: number;
  locale: string;
  title: string;
}) {
  const t = getProfileSpaceCopy(locale);

  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-ink sm:text-xl">{title}</h2>
      <span className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
        {t.sectionCount(count)}
      </span>
    </div>
  );
}

export function ProfileActivitySections({
  dashboard,
  isAuthenticated,
  isSelf,
  locale,
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
  const [activeSection, setActiveSection] = useState<ProfileSectionKey>(
    tabs[0]?.key ?? "created",
  );
  const createdHref = withLocale(locale, "/activities/new");
  const discoverHref = withLocale(locale, "/activities");

  return (
    <section className="space-y-5">
      {isSelf && tabs.length > 1 ? (
        <div className="sticky top-[calc(var(--app-header-height,0px)+0.5rem)] z-10 grid grid-cols-3 gap-2 bg-paper/90 py-2 backdrop-blur md:hidden">
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
                onClick={() => setActiveSection(tab.key)}
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
            activeSection !== "created" && "hidden md:block",
          )}
        >
          <SectionHeader
            count={dashboard.createdActivityCount}
            locale={locale}
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
                {dashboard.createdActivities.map((activity) => (
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
                activeSection !== "participation" && "hidden md:block",
              )}
            >
              <SectionHeader
                count={dashboard.participationCount}
                locale={locale}
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
                    {dashboard.participations.map((participation) => (
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
                activeSection !== "favorite" && "hidden md:block",
              )}
            >
              <SectionHeader
                count={dashboard.favoriteActivityCount}
                locale={locale}
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
                    {dashboard.favoriteActivities.map((favorite) => (
                      <ActivityCard
                        key={favorite.id}
                        activity={favorite.activity}
                        isAuthenticated={isAuthenticated}
                        locale={locale}
                        showFavoriteButton
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
