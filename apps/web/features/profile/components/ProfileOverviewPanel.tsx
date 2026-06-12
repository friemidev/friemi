"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFollowCopy } from "@/features/follow/copy";
import {
  toggleFollowUserAction,
  type ToggleFollowState,
} from "@/features/follow/actions/toggleFollowUser";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getProfileFollowCopy } from "../copy";
import type {
  ProfileFollowUserViewModel,
  ProfileFriendUserViewModel,
} from "../queries/getProfileDashboard";

type ProfileOverviewPanelProps = {
  createdCount: number;
  joinedCount: number;
  friendCount: number;
  followersCount: number;
  followingCount: number;
  friends: ProfileFriendUserViewModel[];
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
  locale: string;
  createdLabel: string;
  joinedLabel: string;
  redirectPath: string;
  showJoinedCount?: boolean;
};

type SocialPanelKey = "friends" | "followers" | "following" | null;
const previewLimit = 5;
const unfollowInitialState: ToggleFollowState = {};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function InteractiveStatCard({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: number;
}) {
  return (
    <button
      aria-expanded={active}
      className={cn(
        "rounded-lg bg-zinc-50 p-3 text-left ring-1 ring-transparent transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40",
        active && "bg-white ring-clay/30 shadow-sm",
      )}
      onClick={onClick}
      type="button"
    >
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </button>
  );
}

function CompactUserRow({
  locale,
  redirectPath,
  user,
  canUnfollow = false,
}: {
  locale: string;
  redirectPath: string;
  user: ProfileFollowUserViewModel;
  canUnfollow?: boolean;
}) {
  const t = getProfileFollowCopy(locale);
  const userInitial = user.nickname.trim().slice(0, 1) || "N";
  const profileHref = withLocale(locale, `/profile/${user.id}`);
  const [state, formAction] = useActionState(
    toggleFollowUserAction,
    unfollowInitialState,
  );

  return (
    <div className="flex items-center gap-3 rounded-md border border-black/10 bg-white/80 px-3 py-2">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.nickname} avatar`}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss text-xs font-semibold text-white">
          {userInitial}
        </div>
      )}
      <Link className="min-w-0 flex-1" href={profileHref}>
        <p className="truncate text-sm font-medium text-ink">{user.nickname}</p>
        <p className="truncate text-xs text-zinc-500">{user.bio ?? t.noBio}</p>
      </Link>
      {canUnfollow ? (
        <form action={formAction} className="ml-auto shrink-0">
          <input name="locale" type="hidden" value={locale} />
          <input name="targetUserProfileId" type="hidden" value={user.id} />
          <input name="redirectPath" type="hidden" value={redirectPath} />
          <UnfollowButton locale={locale} />
          {state.formError ? (
            <p className="mt-1 max-w-40 text-right text-[11px] text-red-600">
              {state.formError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function UnfollowButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getFollowCopy(locale);

  return (
    <Button
      className="h-8 px-3 text-xs"
      type="submit"
      variant="ghost"
      disabled={pending}
    >
      {pending ? t.unfollowing : t.unfollow}
    </Button>
  );
}

export function ProfileOverviewPanel({
  createdCount,
  joinedCount,
  friendCount,
  followersCount,
  followingCount,
  friends,
  followers,
  following,
  locale,
  createdLabel,
  joinedLabel,
  redirectPath,
  showJoinedCount = true,
}: ProfileOverviewPanelProps) {
  const [activePanel, setActivePanel] = useState<SocialPanelKey>(null);
  const t = getProfileFollowCopy(locale);
  const statsGridClass = showJoinedCount
    ? "grid grid-cols-2 gap-3 sm:min-w-[420px] lg:grid-cols-5"
    : "grid grid-cols-2 gap-3 sm:min-w-[340px] sm:grid-cols-4";

  const activeList =
    activePanel === "friends"
      ? friends
      : activePanel === "followers"
        ? followers
        : following;
  const activeTitle =
    activePanel === "friends"
      ? t.friendsTitle
      : activePanel === "followers"
        ? t.followersTitle
        : t.followingTitle;
  const activeDescription =
    activePanel === "friends"
      ? t.friendsDescription
      : activePanel === "followers"
        ? t.followersDescription
        : t.followingDescription;
  const emptyTitle =
    activePanel === "friends"
      ? t.friendsEmptyTitle
      : activePanel === "followers"
        ? t.followersEmptyTitle
        : t.followingEmptyTitle;
  const emptyDescription =
    activePanel === "friends"
      ? t.friendsEmptyDescription
      : activePanel === "followers"
        ? t.followersEmptyDescription
        : t.followingEmptyDescription;
  const previewUsers = activeList.slice(0, previewLimit);
  const hiddenCount = Math.max(activeList.length - previewUsers.length, 0);

  return (
    <div className="relative">
      <div className={statsGridClass}>
        <StatCard label={createdLabel} value={createdCount} />
        {showJoinedCount ? (
          <StatCard label={joinedLabel} value={joinedCount} />
        ) : null}
        <InteractiveStatCard
          active={activePanel === "friends"}
          label={t.friendCount}
          onClick={() =>
            setActivePanel((current) =>
              current === "friends" ? null : "friends",
            )
          }
          value={friendCount}
        />
        <InteractiveStatCard
          active={activePanel === "followers"}
          label={t.followersCount}
          onClick={() =>
            setActivePanel((current) =>
              current === "followers" ? null : "followers",
            )
          }
          value={followersCount}
        />
        <InteractiveStatCard
          active={activePanel === "following"}
          label={t.followingCount}
          onClick={() =>
            setActivePanel((current) =>
              current === "following" ? null : "following",
            )
          }
          value={followingCount}
        />
      </div>

      {activePanel ? (
        <section className="absolute left-0 right-0 top-full z-20 mt-3 rounded-lg border border-black/10 bg-white p-3 shadow-lg sm:left-auto sm:w-[360px] sm:min-w-[320px] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">
                {activeTitle}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">{activeDescription}</p>
            </div>
            <button
              className="text-sm text-zinc-500 transition hover:text-zinc-800"
              onClick={() => setActivePanel(null)}
              type="button"
            >
              {t.closePanel}
            </button>
          </div>

          <div className="mt-3">
            {activeList.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            ) : (
              <div className="space-y-2">
                {previewUsers.map((user) => (
                  <CompactUserRow
                    canUnfollow={activePanel === "following"}
                    key={user.id}
                    locale={locale}
                    redirectPath={redirectPath}
                    user={user}
                  />
                ))}
                {hiddenCount > 0 ? (
                  <p className="pt-1 text-xs text-zinc-500">
                    {t.showMoreUsers(hiddenCount)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
