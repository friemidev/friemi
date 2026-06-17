"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { getFriendsCopy } from "@/features/friends/copy";
import {
  isDetailSourceReturnPage,
  readDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ProfileActivitySections,
  type ProfileSectionKey,
} from "./ProfileActivitySections";
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
      created: "Mes créations",
      joined: "Mes participations",
    };
  }

  if (locale === "en") {
    return {
      created: "My created",
      joined: "My joined",
    };
  }

  return {
    created: "我的发起",
    joined: "我的参与",
  };
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
  const [activeProfileSection, setActiveProfileSection] =
    useState<ProfileSectionKey>("created");

  useEffect(() => {
    const context = readDetailSourceContext();
    const section = context?.sourceState?.section;

    if (
      context &&
      isDetailSourceReturnPage(context, "profile") &&
      (section === "created" ||
        section === "participation" ||
        section === "favorite")
    ) {
      setActiveProfileSection(section);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8 md:space-y-7">
      <section className="border-b border-black/10 pb-4 md:pb-6">
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
                {profile.bio ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>
            {isSelf && profile.friendCode ? (
              <div className="max-w-xl">
                <ProfileIdentityForm
                  friendCode={profile.friendCode}
                  locale={locale}
                  nickname={profile.nickname}
                  wechatId={profile.wechatId}
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
              followers={dashboard.followers}
              followersCount={dashboard.followersCount}
              following={dashboard.following}
              followingCount={dashboard.followingCount}
              locale={locale}
              createdLabel={
                isSelf ? selfMetricLabels.created : t.profile.createdCount
              }
              joinedLabel={
                isSelf ? selfMetricLabels.joined : t.profile.participationCount
              }
              onActivitySectionChange={setActiveProfileSection}
              redirectPath={isSelf ? "/profile" : `/profile/${profile.id}`}
              showJoinedCount={showPrivateParticipation}
            />
            {isSelf ? (
              <Link
                href={withLocale(locale, "/messages")}
                className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-sand transition hover:bg-white sm:w-fit lg:self-end"
              >
                <UsersRound className="h-4 w-4" />
                {friendsCopy.openFriends}
              </Link>
            ) : (
              <ProfileSocialActions
                isAuthenticated={isAuthenticated}
                locale={locale}
                profileId={profile.id}
                relationship={dashboard.viewerRelationship}
              />
            )}
          </div>
        </div>
      </section>

      {hasDashboardError ? (
        <EmptyState
          title={t.profile.errorTitle}
          description={t.profile.errorDescription}
        />
      ) : (
        <ProfileActivitySections
          activeSection={activeProfileSection}
          dashboard={dashboard}
          isAuthenticated={isAuthenticated}
          isSelf={showPrivateParticipation}
          locale={locale}
          onActiveSectionChange={setActiveProfileSection}
        />
      )}
    </div>
  );
}
