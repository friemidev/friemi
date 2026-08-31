"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  UserRound,
} from "lucide-react";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { UserProfilePreviewPopover } from "@/features/profile/components/UserProfilePreviewPopover";
import type { GlobalSearchUserViewModel } from "@/features/search/queries/getGlobalSearchResults";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { SearchHighlightedText } from "./SearchHighlightedText";

type GlobalSearchUserResultsProps = {
  isAuthenticated: boolean;
  locale: string;
  query: string;
  redirectPath: string;
  totalCount: number;
  users: GlobalSearchUserViewModel[];
};

export function GlobalSearchUserResults({
  isAuthenticated,
  locale,
  query,
  redirectPath,
  totalCount,
  users,
}: GlobalSearchUserResultsProps) {
  const t = getCopy(locale).globalSearch;
  const previewLimit = 3;
  const [expanded, setExpanded] = useState(false);
  const visibleUsers = expanded ? users : users.slice(0, previewLimit);
  const canExpand = users.length > previewLimit;

  return (
    <div className="space-y-2">
      <div className="divide-y divide-[#EFEFEA]">
        {visibleUsers.map((user) => (
          <GlobalSearchUserCard
            key={user.id}
            isAuthenticated={isAuthenticated}
            locale={locale}
            query={query}
            redirectPath={redirectPath}
            user={user}
          />
        ))}
      </div>
      {canExpand ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-full px-0 text-sm font-semibold text-[#156240] transition hover:text-[#0F5134]"
            onClick={() =>
              setExpanded((current) => {
                const nextExpanded = !current;

                trackClientAnalyticsEvent({
                  name: "filter_applied",
                  sourceSurface: "global_search",
                  properties: {
                    filter_count: nextExpanded ? 1 : 0,
                    filter_names: ["friend_results_expanded"],
                    next_expanded: nextExpanded,
                    shown_count: users.length,
                    total_count: totalCount,
                  },
                });

                return nextExpanded;
              })
            }
          >
            {expanded
              ? t.collapseUserResults
              : t.expandUserResults(users.length, totalCount)}
          </button>
          {totalCount > users.length ? (
            <span className="text-xs leading-5 text-zinc-500">
              {t.userResultsLimited(users.length, totalCount)}
            </span>
          ) : null}
        </div>
      ) : totalCount > users.length ? (
        <p className="text-xs leading-5 text-zinc-500">
          {t.userResultsLimited(users.length, totalCount)}
        </p>
      ) : null}
    </div>
  );
}

function GlobalSearchUserCard({
  isAuthenticated,
  locale,
  query,
  redirectPath,
  user,
}: {
  isAuthenticated: boolean;
  locale: string;
  query: string;
  redirectPath: string;
  user: GlobalSearchUserViewModel;
}) {
  const t = getCopy(locale).globalSearch;
  const profileHref = withLocale(locale, `/profile/${user.id}`);
  const showPublicNickname =
    Boolean(user.remarkName) && user.publicNickname !== user.nickname;

  return (
    <article className="flex min-w-0 flex-col gap-2 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserProfilePreviewPopover
          avatarUrl={user.avatarUrl}
          isAuthenticated={isAuthenticated}
          locale={locale}
          nickname={user.nickname}
          profileId={user.id}
          triggerClassName="shrink-0 rounded-full"
        >
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#ECF5EF] text-[#156240]">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
        </UserProfilePreviewPopover>
        <ContextualDetailLink
          href={profileHref}
          detailSource={{
            sourceKey: "search",
            targetKey: `profile:${user.id}`,
            targetKind: "profile",
          }}
          data-detail-source-target={`profile:${user.id}`}
          className="group flex min-w-0 flex-1 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
          aria-label={t.openUserProfile(user.nickname)}
        >
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-base font-semibold text-ink">
                <SearchHighlightedText text={user.nickname} query={query} />
              </span>
              {user.friendCode ? (
                <span className="shrink-0 text-xs font-semibold text-zinc-400">
                  ID: {user.friendCode}
                </span>
              ) : null}
              <ArrowRight
                className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-ink"
                aria-hidden="true"
              />
            </span>
            {showPublicNickname ? (
              <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">
                <SearchHighlightedText
                  text={user.publicNickname}
                  query={query}
                />
              </span>
            ) : null}
          </span>
        </ContextualDetailLink>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[3.75rem] sm:w-auto sm:pl-0">
        <FollowCta
          locale={locale}
          redirectPath={redirectPath}
          relationshipStatus={user.relationshipStatus}
          targetProfileId={user.id}
        />
        {user.relationshipStatus !== "SELF" ? (
          <StartDirectConversationButton
            buttonClassName="h-8 bg-transparent px-2 text-xs font-semibold text-[#156240] shadow-none hover:bg-[#F7F7F0]"
            className="w-auto"
            errorClassName="text-center"
            locale={locale}
            peerProfileId={user.id}
            redirectPath={redirectPath}
          />
        ) : null}
      </div>
    </article>
  );
}

function FollowCta({
  locale,
  redirectPath,
  relationshipStatus,
  targetProfileId,
}: {
  locale: string;
  redirectPath: string;
  relationshipStatus: GlobalSearchUserViewModel["relationshipStatus"];
  targetProfileId: string;
}) {
  const t = getCopy(locale).globalSearch;

  if (relationshipStatus === "SELF") {
    return <RelationshipStatusPill label={t.selfUser} icon="check" />;
  }

  const relationshipCopy = getSearchRelationshipCopy(locale);
  const isFollowing =
    relationshipStatus === "FOLLOWING" || relationshipStatus === "MUTUAL";
  const activeLabel =
    relationshipStatus === "MUTUAL" || relationshipStatus === "FOLLOWED_BY"
      ? relationshipCopy.mutual
      : relationshipCopy.following;
  const inactiveLabel =
    relationshipStatus === "FOLLOWED_BY"
      ? relationshipCopy.followBack
      : relationshipCopy.follow;

  return (
    <FollowButton
      activeButtonClassName="h-8 rounded-full bg-transparent px-2 text-xs font-semibold text-[#156240] shadow-none ring-0 hover:bg-[#F7F7F0]"
      activeLabel={activeLabel}
      buttonClassName="h-8 rounded-full bg-transparent px-2 text-xs font-semibold text-[#156240] shadow-none ring-0 hover:bg-[#F7F7F0]"
      fullWidth={false}
      inactiveLabel={inactiveLabel}
      isAuthenticated
      isFollowing={isFollowing}
      icon={relationshipStatus === "MUTUAL" ? HeartHandshake : undefined}
      locale={locale}
      redirectPath={redirectPath}
      targetUserProfileId={targetProfileId}
    />
  );
}

function RelationshipStatusPill({
  icon = "check",
  label,
  tone = "neutral",
}: {
  icon?: "check";
  label: string;
  tone?: "neutral" | "good";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-transparent px-2 text-xs font-semibold",
        tone === "good" ? "text-moss" : "text-zinc-500",
      )}
    >
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function getSearchRelationshipCopy(locale: string) {
  if (locale === "fr") {
    return {
      follow: "Suivre",
      following: "Suivi",
      followBack: "Suivre aussi",
      mutual: "Mutuel",
    };
  }

  if (locale === "en") {
    return {
      follow: "Follow",
      following: "Following",
      followBack: "Follow back",
      mutual: "Mutual",
    };
  }

  return {
    follow: "关注",
    following: "已关注",
    followBack: "回关",
    mutual: "互关",
  };
}
