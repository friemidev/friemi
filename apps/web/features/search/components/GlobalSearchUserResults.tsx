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
import type { GlobalSearchUserViewModel } from "@/features/search/queries/getGlobalSearchResults";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { SearchHighlightedText } from "./SearchHighlightedText";

type GlobalSearchUserResultsProps = {
  locale: string;
  query: string;
  totalCount: number;
  users: GlobalSearchUserViewModel[];
};

export function GlobalSearchUserResults({
  locale,
  query,
  totalCount,
  users,
}: GlobalSearchUserResultsProps) {
  const t = getCopy(locale).globalSearch;
  const previewLimit = 3;
  const [expanded, setExpanded] = useState(false);
  const visibleUsers = expanded ? users : users.slice(0, previewLimit);
  const canExpand = users.length > previewLimit;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleUsers.map((user) => (
          <GlobalSearchUserCard
            key={user.id}
            locale={locale}
            query={query}
            user={user}
          />
        ))}
      </div>
      {canExpand ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-white/85 px-3.5 text-sm font-semibold text-[#156240] ring-1 ring-[#D6D5B2] transition hover:bg-white"
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
        <p className="rounded-xl bg-white/60 px-3 py-2 text-xs text-zinc-500 ring-1 ring-sand">
          {t.userResultsLimited(users.length, totalCount)}
        </p>
      ) : null}
    </div>
  );
}

function GlobalSearchUserCard({
  locale,
  query,
  user,
}: {
  locale: string;
  query: string;
  user: GlobalSearchUserViewModel;
}) {
  const t = getCopy(locale).globalSearch;
  const profileHref = withLocale(locale, `/profile/${user.id}`);
  const showPublicNickname =
    Boolean(user.remarkName) && user.publicNickname !== user.nickname;

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-sand bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center">
      <ContextualDetailLink
        href={profileHref}
        detailSource={{
          sourceKey: "search",
          targetKey: `profile:${user.id}`,
          targetKind: "profile",
        }}
        data-detail-source-target={`profile:${user.id}`}
        className="group flex min-w-0 flex-1 items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
        aria-label={t.openUserProfile(user.nickname)}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay/15 text-clay ring-1 ring-clay/20">
          {user.avatarUrl ? (
            // Avatar URLs come from Clerk/Google and are already thumbnail-sized.
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
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold text-ink">
              <SearchHighlightedText text={user.nickname} query={query} />
            </span>
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
          <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-team-bg px-2.5 py-1 text-xs font-medium text-[#156240] ring-1 ring-[#D6D5B2]">
            <span className="truncate">
              {user.friendCode
                ? `${t.friendCodeLabel} ${user.friendCode}`
                : t.friendCodeMissing}
            </span>
          </span>
        </span>
      </ContextualDetailLink>

      <div className="grid shrink-0 gap-2 sm:w-36">
        <FollowCta
          locale={locale}
          relationshipStatus={user.relationshipStatus}
          targetProfileId={user.id}
        />
        {user.relationshipStatus !== "SELF" ? (
          <StartDirectConversationButton
            buttonClassName="h-10 w-full bg-white px-3 text-sm font-semibold text-[#156240] shadow-none ring-1 ring-[#D6D5B2] hover:bg-[#F1F2EC]"
            errorClassName="text-center"
            locale={locale}
            peerProfileId={user.id}
            redirectPath="/search"
          />
        ) : null}
      </div>
    </article>
  );
}

function FollowCta({
  locale,
  relationshipStatus,
  targetProfileId,
}: {
  locale: string;
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
      activeButtonClassName="h-10 w-full rounded-full bg-moss/10 px-3 text-sm font-medium text-moss shadow-none ring-1 ring-moss/20"
      activeLabel={activeLabel}
      buttonClassName="h-10 w-full rounded-full bg-[#369758] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#156240]"
      inactiveLabel={inactiveLabel}
      isAuthenticated
      isFollowing={isFollowing}
      icon={relationshipStatus === "MUTUAL" ? HeartHandshake : undefined}
      locale={locale}
      redirectPath="/search"
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
        "inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium ring-1",
        tone === "good"
          ? "bg-moss/10 text-moss ring-moss/20"
          : "bg-white/70 text-zinc-600 ring-sand",
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
