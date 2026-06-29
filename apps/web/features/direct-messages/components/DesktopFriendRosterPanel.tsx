"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import {
  formatActivityDate,
  formatActivityDateOnly,
} from "@chill-club/shared";
import {
  AddFriendDialog,
  IncomingFriendRequestsPanel,
  RequestCountBadge,
} from "@/features/friends/components/FriendsDashboard";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { openDirectConversationAction } from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivitySignalViewModel,
  DirectMessageFriendRosterItemViewModel,
} from "../queries/getDirectMessages";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import { MessageAvatar } from "./MessageAvatar";

type DesktopFriendRosterPanelProps = {
  currentUserProfileId: string;
  currentUserFriendCode?: string | null;
  friends: DirectMessageFriendRosterItemViewModel[];
  initialAddFriendOpen?: boolean;
  incomingRequests?: FriendRequestViewModel[];
  locale: string;
  selectedConversationId?: string;
};

export function DesktopFriendRosterPanel({
  currentUserProfileId,
  currentUserFriendCode = null,
  friends,
  initialAddFriendOpen = false,
  incomingRequests = [],
  locale,
  selectedConversationId,
}: DesktopFriendRosterPanelProps) {
  const [addFriendOpen, setAddFriendOpen] = useState(
    initialAddFriendOpen && incomingRequests.length > 0,
  );
  const t = getDirectMessagesCopy(locale);
  const redirectPath = selectedConversationId
    ? `/messages/${selectedConversationId}`
    : "/messages";

  return (
    <aside className="overflow-hidden rounded-[1.45rem] border border-sand bg-white/72 shadow-[0_18px_48px_rgba(21,98,64,0.08)] ring-1 ring-white/70 lg:flex lg:h-[calc(100dvh-6.5rem)] lg:flex-col">
      <div className="flex items-start gap-3 border-b border-sand bg-[linear-gradient(135deg,#FEFFF9_0%,#FFF5E6_58%,#DEAAB3_100%)] p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)]">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink">
            {t.friendListTitle}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#156240]">
            {t.friendListDescription}
          </p>
        </div>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-sand transition hover:-translate-y-0.5 hover:bg-team-bg hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
          aria-label={t.addFriend}
          title={t.addFriend}
          onClick={() => setAddFriendOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          <RequestCountBadge count={incomingRequests.length} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FEFFF9]/72 p-2.5">
        <IncomingFriendRequestsPanel
          className="mb-3"
          incomingRequests={incomingRequests}
          locale={locale}
          redirectPath={redirectPath}
          returnTo="messages"
        />
        {friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand bg-white/70 p-4">
            <h3 className="text-sm font-semibold text-ink">
              {t.emptyFriendListTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#156240]">
              {t.emptyFriendListDescription}
            </p>
          </div>
        ) : (
          friends.map((friend) => (
            <DesktopFriendRosterRow
              key={friend.friendshipId}
              currentUserProfileId={currentUserProfileId}
              friend={friend}
              isActive={friend.conversationId === selectedConversationId}
              locale={locale}
            />
          ))
        )}
      </div>

      {addFriendOpen ? (
        <AddFriendDialog
          currentUserFriendCode={currentUserFriendCode}
          incomingRequests={incomingRequests}
          locale={locale}
          onClose={() => setAddFriendOpen(false)}
          returnTo="messages"
        />
      ) : null}
    </aside>
  );
}

function DesktopFriendRosterRow({
  currentUserProfileId,
  friend,
  isActive,
  locale,
}: {
  currentUserProfileId: string;
  friend: DirectMessageFriendRosterItemViewModel;
  isActive: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = friend.lastMessage;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const sourceLabel = lastMessage?.sourceActivity
    ? t.sourceActivityLabel(lastMessage.sourceActivity.title)
    : null;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body}`
    : t.startChat;
  const time =
    lastMessage?.createdAt ?? friend.lastMessageAt ?? friend.createdAt;
  const content = (
    <>
      <MessageAvatar
        avatarUrl={friend.friend.avatarUrl}
        name={friend.friend.nickname}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 items-start gap-2">
          <span className="truncate text-sm font-semibold">
            {friend.friend.nickname}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 whitespace-nowrap text-xs",
              isActive ? "text-[#8E8383]" : "text-[#8E8383]",
            )}
          >
            {formatActivityDate(time, locale)}
          </span>
        </span>
        <span
            className={cn(
              "mt-1 block truncate text-xs leading-5",
              isActive ? "text-[#156240]" : "text-[#156240]",
            )}
        >
          {sourceLabel ? `${sourceLabel} · ${preview}` : preview}
        </span>
      </span>
    </>
  );

  return (
    <article
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-[1.05rem] p-2.5 transition duration-200",
        isActive
          ? "border border-[#8AB68E] bg-[#FEFFF9] text-[#1D1D1B] shadow-[0_14px_26px_rgba(21,98,64,0.12)]"
          : "text-ink hover:bg-white hover:shadow-[0_10px_24px_rgba(21,98,64,0.08)]",
      )}
    >
      {friend.conversationId ? (
        <Link
          aria-label={t.openConversation(friend.friend.nickname)}
          className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
          href={withLocale(locale, `/messages/${friend.conversationId}`)}
        >
          {content}
        </Link>
      ) : (
        <form action={openDirectConversationAction}>
          <input name="locale" type="hidden" value={locale} />
          <input name="friendProfileId" type="hidden" value={friend.friend.id} />
          <button
            type="submit"
            className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.85rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
            aria-label={t.openConversation(friend.friend.nickname)}
          >
            {content}
          </button>
        </form>
      )}
      <DesktopActivitySignals
        activities={friend.recentActivities}
        isActive={isActive}
        locale={locale}
      />
    </article>
  );
}

function DesktopActivitySignals({
  activities,
  isActive,
  locale,
}: {
  activities: DirectConversationActivitySignalViewModel[];
  isActive: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const [firstActivity, ...remainingActivities] = activities;

  if (!firstActivity) {
    return null;
  }

  return (
    <div className="ml-[3.55rem] mt-2 grid min-w-0 gap-1">
      <DesktopActivitySignalRow
        activity={firstActivity}
        isActive={isActive}
        locale={locale}
      />
      {remainingActivities.length > 0 ? (
        <details className="group min-w-0">
          <summary
            className={cn(
              "inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden",
              isActive
                ? "bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E] hover:bg-white"
                : "bg-team-bg text-moss ring-1 ring-sand hover:bg-white",
            )}
            aria-label={t.showMoreActivitiesLabel(remainingActivities.length)}
          >
            <span className="group-open:hidden">
              {t.moreActivities(remainingActivities.length)}
            </span>
            <span className="hidden group-open:inline">
              {t.collapseActivities}
            </span>
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="mt-1 grid max-h-28 gap-1 overflow-y-auto pr-1">
            {remainingActivities.map((activity) => (
              <DesktopActivitySignalRow
                key={activity.id}
                activity={activity}
                isActive={isActive}
                locale={locale}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function DesktopActivitySignalRow({
  activity,
  isActive,
  locale,
}: {
  activity: DirectConversationActivitySignalViewModel;
  isActive: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const label = t.activitySignal(
    formatActivityDateOnly(activity.startAt, locale),
    activity.title,
    activity.timeState,
  );

  return (
    <Link
      aria-label={t.openActivity(activity.title)}
      className={cn(
        "grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30",
        isActive
          ? "bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E] hover:bg-white hover:text-ink"
          : "bg-team-bg text-[#156240] ring-1 ring-sand hover:bg-white hover:text-ink",
      )}
      href={withLocale(locale, `/activities/${activity.id}`)}
      title={label}
    >
      <CalendarDays
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? "text-moss" : "text-moss",
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
