"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFollowCopy } from "@/features/follow/copy";
import {
  toggleFollowUserAction,
  type ToggleFollowState,
} from "@/features/follow/actions/toggleFollowUser";
import { getProfileFollowCopy } from "../copy";
import type { ProfileFollowUserViewModel } from "../queries/getProfileDashboard";

type ProfileOverviewPanelProps = {
  createdCount: number;
  joinedCount: number;
  followersCount: number;
  followingCount: number;
  followers: ProfileFollowUserViewModel[];
  following: ProfileFollowUserViewModel[];
  locale: string;
  createdLabel: string;
  joinedLabel: string;
  showJoinedCount?: boolean;
};

type SocialPanelKey = "followers" | "following" | null;
const previewLimit = 5;
const unfollowInitialState: ToggleFollowState = {};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function CompactUserRow({
  locale,
  user,
  canUnfollow = false,
}: {
  locale: string;
  user: ProfileFollowUserViewModel;
  canUnfollow?: boolean;
}) {
  const t = getProfileFollowCopy(locale);
  const userInitial = user.nickname.trim().slice(0, 1) || "N";
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
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{user.nickname}</p>
        <p className="truncate text-xs text-zinc-500">{user.bio ?? t.noBio}</p>
      </div>
      {canUnfollow ? (
        <form action={formAction} className="ml-auto shrink-0">
          <input name="locale" type="hidden" value={locale} />
          <input name="targetUserProfileId" type="hidden" value={user.id} />
          <input name="redirectPath" type="hidden" value="/profile" />
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
  followersCount,
  followingCount,
  followers,
  following,
  locale,
  createdLabel,
  joinedLabel,
  showJoinedCount = true,
}: ProfileOverviewPanelProps) {
  const [activePanel, setActivePanel] = useState<SocialPanelKey>(null);
  const t = getProfileFollowCopy(locale);
  const statsGridClass = showJoinedCount
    ? "grid grid-cols-2 gap-3 sm:min-w-80 lg:grid-cols-4"
    : "grid grid-cols-2 gap-3 sm:min-w-80 sm:grid-cols-3";

  const activeList = activePanel === "followers" ? followers : following;
  const activeTitle =
    activePanel === "followers" ? t.followersTitle : t.followingTitle;
  const activeDescription =
    activePanel === "followers"
      ? t.followersDescription
      : t.followingDescription;
  const emptyTitle =
    activePanel === "followers"
      ? t.followersEmptyTitle
      : t.followingEmptyTitle;
  const emptyDescription =
    activePanel === "followers"
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
        <button
          className="rounded-lg bg-zinc-50 p-3 text-left transition hover:bg-zinc-100"
          onClick={() =>
            setActivePanel((current) =>
              current === "followers" ? null : "followers",
            )
          }
          type="button"
        >
          <p className="text-2xl font-semibold text-ink">{followersCount}</p>
          <p className="mt-1 text-xs text-zinc-500">{t.followersCount}</p>
        </button>
        <button
          className="rounded-lg bg-zinc-50 p-3 text-left transition hover:bg-zinc-100"
          onClick={() =>
            setActivePanel((current) =>
              current === "following" ? null : "following",
            )
          }
          type="button"
        >
          <p className="text-2xl font-semibold text-ink">{followingCount}</p>
          <p className="mt-1 text-xs text-zinc-500">{t.followingCount}</p>
        </button>
      </div>

      {activePanel ? (
        <section className="absolute left-0 right-0 top-full z-20 mt-3 rounded-lg border border-black/10 bg-white p-3 shadow-lg sm:left-auto sm:w-[360px] sm:min-w-[320px] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">{activeTitle}</h2>
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
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
              />
            ) : (
              <div className="space-y-2">
                {previewUsers.map((user) => (
                  <CompactUserRow
                    canUnfollow={activePanel === "following"}
                    key={user.id}
                    locale={locale}
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
