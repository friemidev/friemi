"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { getFriendsCopy } from "@/features/friends/copy";
import {
  isDetailSourceReturnPage,
  readDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  ProfileActivitySections,
  type ProfileSectionKey,
} from "./ProfileActivitySections";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";
import { ProfileIdentityForm } from "./ProfileIdentityForm";
import { ProfileOverviewPanel } from "./ProfileOverviewPanel";
import { ProfileSocialActions } from "./ProfileSocialActions";
import type {
  ProfileDashboardViewModel,
  PublicProfileViewModel,
} from "../queries/getProfileDashboard";

type ProfileDashboardViewProps = {
  dashboard: ProfileDashboardViewModel;
  hasDashboardError?: boolean;
  isAuthenticated?: boolean;
  isSelf?: boolean;
  locale: string;
  profile: PublicProfileViewModel;
};

function getSelfProfileMetricLabels(locale: string) {
  if (locale === "fr") {
    return {
      created: "Créés",
      joined: "Rejoints",
      pastJoined: "Passées",
    };
  }

  if (locale === "en") {
    return {
      created: "Created",
      joined: "Joined",
      pastJoined: "Past",
    };
  }

  return {
    created: "发起",
    joined: "参与",
    pastJoined: "参加过",
  };
}

function getWerewolfStatsCopy(locale: string) {
  if (locale === "fr") {
    return {
      judge: "Maître",
      loss: "Défaites",
      played: "Parties",
      title: "Loups-garous",
      win: "Victoires",
      winRate: "Taux de victoire",
    };
  }

  if (locale === "en") {
    return {
      judge: "Judge",
      loss: "Losses",
      played: "Games",
      title: "Werewolf",
      win: "Wins",
      winRate: "Win rate",
    };
  }

  return {
    judge: "法官",
    loss: "失败",
    played: "局数",
    title: "狼人杀",
    win: "胜利",
    winRate: "胜率",
  };
}

function WerewolfStatsPanel({
  locale,
  stats,
}: {
  locale: string;
  stats: ProfileDashboardViewModel["werewolfStats"];
}) {
  const copy = getWerewolfStatsCopy(locale);

  return (
    <section className="rounded-[1.15rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3 shadow-[0_12px_28px_rgba(30,23,24,0.05)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E1718]">
          <ShieldCheck className="h-4 w-4 text-[#7A1F2B]" />
          {copy.title}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E1718] px-3 py-1 text-xs font-semibold text-white">
          <Trophy className="h-3.5 w-3.5 text-[#F0C36A]" />
          {copy.winRate} {stats.winRate}%
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: copy.played, value: stats.playerGameCount },
          { label: copy.win, value: stats.winCount },
          { label: copy.loss, value: stats.lossCount },
          { label: copy.winRate, value: `${stats.winRate}%` },
          { icon: Crown, label: copy.judge, value: stats.judgeCount },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="min-w-0 rounded-[0.9rem] border border-[#D9C7B4] bg-white px-3 py-2.5"
              key={item.label}
            >
              <p className="flex items-center gap-1.5 text-lg font-semibold leading-none text-[#1E1718]">
                {Icon ? <Icon className="h-4 w-4 text-[#7A1F2B]" /> : null}
                {item.value}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-[#7A1F2B]/72">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileDashboardView({
  dashboard,
  hasDashboardError = false,
  isAuthenticated = false,
  isSelf = false,
  locale,
  profile,
}: ProfileDashboardViewProps) {
  const t = getCopy(locale);
  const friendsCopy = getFriendsCopy(locale);
  const selfMetricLabels = getSelfProfileMetricLabels(locale);
  const profileInitial = profile.nickname.trim().slice(0, 1) || "N";
  const showPrivateParticipation = isSelf;
  const showWerewolfStats =
    dashboard.werewolfStats.playerGameCount > 0 ||
    dashboard.werewolfStats.judgeCount > 0;
  const [activeProfileSection, setActiveProfileSection] =
    useState<ProfileSectionKey>("created");

  useEffect(() => {
    const context = readDetailSourceContext();
    const section = context?.sourceState?.section;

    const canRestoreSection =
      section === "created" ||
      section === "participation" ||
      (isSelf && section === "favorite");

    if (context && isDetailSourceReturnPage(context, "profile") && canRestoreSection) {
      setActiveProfileSection(section);
    }
  }, [isSelf]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8 md:space-y-7">
      <section
        className={
          isSelf
            ? "border-b border-black/10 pb-4 md:pb-6"
            : "rounded-[1.35rem] border border-[#8AB68E]/40 bg-[linear-gradient(145deg,#FEFFF9_0%,#F1F2EC_62%,#FFF5E6_100%)] p-3 shadow-[0_14px_34px_rgba(21,98,64,0.07)] ring-1 ring-white/70 sm:rounded-[1.75rem] sm:p-5"
        }
      >
        {isSelf ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-start">
            <div className="grid min-w-0 gap-3">
              <div className="flex min-w-0 items-center gap-4">
                {profile.avatarUrl ? (
                  // User avatars are stored as remote URLs from Clerk/user data.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.nickname}
                    className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss text-lg font-semibold text-white sm:h-16 sm:w-16 sm:text-xl">
                    {profileInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-moss">
                    {t.profile.title}
                  </p>
                  <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
                    {profile.nickname}
                  </h1>
                  {profile.isCoCreator ? (
                    <CoCreatorIdentityBadge className="mt-2" locale={locale} />
                  ) : null}
                  {profile.bio ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                      {profile.bio}
                    </p>
                  ) : null}
                </div>
              </div>
              {profile.friendCode ? (
                <div className="max-w-xl">
                  <ProfileIdentityForm
                    friendCode={profile.friendCode}
                    locale={locale}
                    nickname={profile.nickname}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <ProfileOverviewPanel
                activeActivitySection={activeProfileSection}
                createdCount={dashboard.createdActivityCount}
                joinedCount={dashboard.participationCount}
                friendCount={dashboard.friendCount}
                friends={dashboard.friends}
                locale={locale}
                createdLabel={selfMetricLabels.created}
                joinedLabel={selfMetricLabels.joined}
                onActivitySectionChange={setActiveProfileSection}
                showFriendCount={isSelf}
                showJoinedCount={showPrivateParticipation}
              />
              <Link
                href={withLocale(locale, "/messages")}
                className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-sand transition hover:bg-white sm:w-fit lg:self-end"
              >
                <UsersRound className="h-4 w-4" />
                {friendsCopy.openFriends}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:items-center">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              {profile.avatarUrl ? (
                // User avatars are stored as remote URLs from Clerk/user data.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss text-base font-semibold text-white ring-2 ring-white sm:h-16 sm:w-16 sm:text-xl">
                  {profileInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss/75 sm:text-xs sm:tracking-[0.16em]">
                  {t.profile.title}
                </p>
                <h1 className="mt-0.5 truncate text-xl font-semibold tracking-normal text-ink sm:mt-1 sm:text-3xl">
                  {profile.nickname}
                </h1>
                {profile.isCoCreator ? (
                  <CoCreatorIdentityBadge className="mt-2" locale={locale} />
                ) : null}
                {profile.bio ? (
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(21,98,64,0.04)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35",
                    activeProfileSection === "created"
                      ? "border-[#369758] bg-white/85"
                      : "border-[#8AB68E]/45 bg-white/65",
                  )}
                  onClick={() => setActiveProfileSection("created")}
                  type="button"
                >
                  <p className="text-xl font-semibold leading-none text-[#156240] sm:text-2xl">
                    {dashboard.createdActivityCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#1D1D1B]/70">
                    {selfMetricLabels.created}
                  </p>
                </button>
                <button
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(21,98,64,0.035)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35",
                    activeProfileSection === "participation"
                      ? "border-[#369758] bg-white/85"
                      : "border-[#8AB68E]/35 bg-white/60",
                  )}
                  onClick={() => setActiveProfileSection("participation")}
                  type="button"
                >
                  <p className="text-xl font-semibold leading-none text-[#156240] sm:text-2xl">
                    {dashboard.participationCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#1D1D1B]/70">
                    {selfMetricLabels.pastJoined}
                  </p>
                </button>
              </div>
              <ProfileSocialActions
                isAuthenticated={isAuthenticated}
                locale={locale}
                profileId={profile.id}
                relationship={dashboard.viewerRelationship}
              />
            </div>
          </div>
        )}
      </section>

      {hasDashboardError ? (
        <EmptyState
          title={t.profile.errorTitle}
          description={t.profile.errorDescription}
        />
      ) : (
        <>
          {showWerewolfStats ? (
            <WerewolfStatsPanel
              locale={locale}
              stats={dashboard.werewolfStats}
            />
          ) : null}
          <ProfileActivitySections
            activeSection={activeProfileSection}
            dashboard={dashboard}
            isAuthenticated={isAuthenticated}
            isSelf={showPrivateParticipation}
            locale={locale}
            onActiveSectionChange={setActiveProfileSection}
          />
        </>
      )}
    </div>
  );
}
