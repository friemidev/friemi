"use client";

import { useState } from "react";
import { ChevronDown, UsersRound } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type {
  ActivityFriendSignalUserViewModel,
  ActivityFriendSignalViewModel,
} from "@/features/activities/types";

type ActivityFriendSignalPanelProps = {
  signal: ActivityFriendSignalViewModel | null;
  locale: string;
};

export function ActivityFriendSignalPanel({
  signal,
  locale,
}: ActivityFriendSignalPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = getCopy(locale).activityFriendSignal;

  if (!signal || signal.count === 0) {
    return null;
  }

  const visibleFriends = isExpanded ? signal.allFriends : signal.previewFriends;
  const previewNames = signal.previewFriends.map((friend) => friend.nickname);
  const canExpand = signal.extraCount > 0;

  return (
    <section className="rounded-lg border border-moss/15 bg-moss/5 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss ring-1 ring-moss/15">
          <UsersRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-moss">{t.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-5 text-ink">
            {t.detailSummary(previewNames, signal.count)}
          </p>
        </div>
        {canExpand ? (
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-white px-2.5 text-xs font-medium text-zinc-700 ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            aria-label={isExpanded ? t.showLess : t.showAllLabel(signal.count)}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? t.showLess : t.showMore}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition",
                isExpanded && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-3 flex min-w-0 flex-wrap gap-2",
          isExpanded && "max-h-36 overflow-y-auto pr-1",
        )}
      >
        {visibleFriends.map((friend) => (
          <FriendSignalChip key={friend.id} friend={friend} />
        ))}
      </div>
    </section>
  );
}

function FriendSignalChip({
  friend,
}: {
  friend: ActivityFriendSignalUserViewModel;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-[10rem] items-center gap-2 rounded-full bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-black/10 sm:max-w-[12rem]">
      <FriendSignalAvatar friend={friend} />
      <span className="truncate">{friend.nickname}</span>
    </span>
  );
}

function FriendSignalAvatar({
  friend,
}: {
  friend: ActivityFriendSignalUserViewModel;
}) {
  const initial = friend.nickname.trim().slice(0, 1).toUpperCase() || "N";

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss text-[10px] font-semibold text-white">
      {friend.avatarUrl ? (
        // Profile avatars come from Clerk or existing profile data.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={friend.avatarUrl}
          alt={friend.nickname}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
