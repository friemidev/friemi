"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
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
import type { ProfileSectionKey } from "./ProfileActivitySections";

type ProfileOverviewPanelProps = {
  activeActivitySection?: ProfileSectionKey;
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
  onActivitySectionChange?: (section: ProfileSectionKey) => void;
  redirectPath: string;
  showJoinedCount?: boolean;
};

type SocialPanelKey = "friends" | "followers" | "following" | null;
const unfollowInitialState: ToggleFollowState = {};

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
        "min-w-0 rounded-lg bg-zinc-50 px-2.5 py-2.5 text-left ring-1 ring-transparent transition hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40 sm:px-3",
        active && "bg-white ring-clay/30 shadow-sm",
      )}
      onClick={onClick}
      type="button"
    >
      <p className="text-xl font-semibold text-ink sm:text-2xl">{value}</p>
      <p className="mt-0.5 truncate text-[11px] leading-4 text-zinc-500 sm:text-xs">
        {label}
      </p>
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
    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/88 px-3 py-3 shadow-sm">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.nickname} avatar`}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss text-sm font-semibold text-white">
          {userInitial}
        </div>
      )}
      <Link className="min-w-0 flex-1" href={profileHref}>
        <p className="truncate text-sm font-semibold text-ink">
          {user.nickname}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
          {user.bio ?? t.noBio}
        </p>
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
      className="h-8 rounded-full px-3 text-xs"
      type="submit"
      variant="ghost"
      disabled={pending}
    >
      {pending ? t.unfollowing : t.unfollow}
    </Button>
  );
}

export function ProfileOverviewPanel({
  activeActivitySection = "created",
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
  onActivitySectionChange,
  redirectPath,
  showJoinedCount = true,
}: ProfileOverviewPanelProps) {
  const [activePanel, setActivePanel] = useState<SocialPanelKey>(null);
  const t = getProfileFollowCopy(locale);
  const statsGridClass = showJoinedCount
    ? "grid w-full grid-cols-5 gap-2"
    : "grid w-full grid-cols-4 gap-2";

  const activeList =
    activePanel === "friends"
      ? friends
      : activePanel === "followers"
        ? followers
        : following;
  const activeCount =
    activePanel === "friends"
      ? friendCount
      : activePanel === "followers"
        ? followersCount
        : followingCount;
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

  return (
    <div className="relative">
      <div className={statsGridClass}>
        <InteractiveStatCard
          active={activeActivitySection === "created"}
          label={createdLabel}
          onClick={() => onActivitySectionChange?.("created")}
          value={createdCount}
        />
        {showJoinedCount ? (
          <InteractiveStatCard
            active={activeActivitySection === "participation"}
            label={joinedLabel}
            onClick={() => onActivitySectionChange?.("participation")}
            value={joinedCount}
          />
        ) : null}
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
          active={activePanel === "friends"}
          label={t.friendCount}
          onClick={() =>
            setActivePanel((current) =>
              current === "friends" ? null : "friends",
            )
          }
          value={friendCount}
        />
      </div>

      {activePanel ? (
        <section
          aria-modal="true"
          className="fixed inset-0 z-50 flex bg-black/32 p-0 backdrop-blur-sm sm:p-6"
          role="dialog"
        >
          <div className="flex min-h-0 w-full flex-col bg-paper shadow-2xl sm:mx-auto sm:max-w-2xl sm:overflow-hidden sm:rounded-[1.5rem] sm:border sm:border-black/10">
            <div className="border-b border-black/10 bg-white/82 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">
                      {activeTitle}
                    </h2>
                    <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs font-semibold text-[#9a5139] ring-1 ring-[#f5c8b7]">
                      {activeCount}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {activeDescription}
                  </p>
                </div>
                <button
                  aria-label={t.closePanel}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink"
                  onClick={() => setActivePanel(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {activeList.length === 0 ? (
                <div className="rounded-2xl bg-white/72 p-4 ring-1 ring-black/5">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeList.map((user) => (
                    <CompactUserRow
                      canUnfollow={activePanel === "following"}
                      key={user.id}
                      locale={locale}
                      redirectPath={redirectPath}
                      user={user}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-black/10 bg-white/82 px-5 py-3">
              <Button
                className="h-10 w-full rounded-full"
                onClick={() => setActivePanel(null)}
                type="button"
                variant="ghost"
              >
                {t.closePanel}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
