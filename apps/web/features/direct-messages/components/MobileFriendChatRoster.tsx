"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import {
  formatActivityDate,
  formatActivityDateOnly,
} from "@chill-club/shared";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import {
  AddFriendDialog,
  RequestCountBadge,
} from "@/features/friends/components/FriendsDashboard";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import { openDirectConversationAction } from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivitySignalViewModel,
  DirectMessageFriendRosterItemViewModel,
} from "../queries/getDirectMessages";
import { MessageAvatar } from "./MessageAvatar";

type MobileFriendChatRosterProps = {
  currentUserProfileId: string;
  currentUserFriendCode?: string | null;
  friends: DirectMessageFriendRosterItemViewModel[];
  initialAddFriendOpen?: boolean;
  incomingRequests?: FriendRequestViewModel[];
  locale: string;
};

export function MobileFriendChatRoster({
  currentUserProfileId,
  currentUserFriendCode = null,
  friends,
  initialAddFriendOpen = false,
  incomingRequests = [],
  locale,
}: MobileFriendChatRosterProps) {
  const [addFriendOpen, setAddFriendOpen] = useState(
    initialAddFriendOpen && incomingRequests.length > 0,
  );
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="space-y-4 lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-moss">{t.friendListTitle}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-ink">
            {t.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {t.friendListDescription}
          </p>
        </div>
        <button
          type="button"
          className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          aria-label={t.addFriend}
          title={t.addFriend}
          onClick={() => setAddFriendOpen(true)}
        >
          <UserPlus className="h-5 w-5" />
          <RequestCountBadge count={incomingRequests.length} />
        </button>
      </div>

      {friends.length === 0 ? (
        <div className="py-10">
          <h2 className="text-base font-semibold text-ink">
            {t.emptyFriendListTitle}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            {t.emptyFriendListDescription}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="relative mt-5 h-11 gap-2 bg-white px-5"
            onClick={() => setAddFriendOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t.addFriend}
            <RequestCountBadge count={incomingRequests.length} />
          </Button>
        </div>
      ) : (
        <div className="-mx-2 divide-y divide-black/10">
          {friends.map((friend) => (
            <MobileFriendChatRow
              key={friend.friendshipId}
              currentUserProfileId={currentUserProfileId}
              friend={friend}
              locale={locale}
            />
          ))}
        </div>
      )}

      {addFriendOpen ? (
        <AddFriendDialog
          currentUserFriendCode={currentUserFriendCode}
          incomingRequests={incomingRequests}
          locale={locale}
          onClose={() => setAddFriendOpen(false)}
          returnTo="messages"
        />
      ) : null}
    </section>
  );
}

function MobileFriendChatRow({
  currentUserProfileId,
  friend,
  locale,
}: {
  currentUserProfileId: string;
  friend: DirectMessageFriendRosterItemViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = friend.lastMessage;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body}`
    : t.startChat;
  const time = lastMessage?.createdAt ?? friend.lastMessageAt ?? friend.createdAt;
  const content = (
    <>
      <MessageAvatar
        avatarUrl={friend.friend.avatarUrl}
        name={friend.friend.nickname}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 items-start gap-2">
          <span className="truncate text-sm font-semibold text-ink">
            {friend.friend.nickname}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-zinc-400">
            {formatActivityDate(time, locale)}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs leading-5 text-zinc-500">
          {preview}
        </span>
      </span>
    </>
  );

  return (
    <article className="min-w-0 px-2 py-3.5 transition hover:bg-white/60">
      {friend.conversationId ? (
        <Link
          aria-label={t.openConversation(friend.friend.nickname)}
          className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
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
            className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-md px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            aria-label={t.openConversation(friend.friend.nickname)}
          >
            {content}
          </button>
        </form>
      )}
      <MobileActivitySignals
        activities={friend.recentActivities}
        locale={locale}
      />
    </article>
  );
}

function MobileActivitySignals({
  activities,
  locale,
}: {
  activities: DirectConversationActivitySignalViewModel[];
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const [firstActivity, ...remainingActivities] = activities;

  if (!firstActivity) {
    return null;
  }

  return (
    <div className="ml-[3.55rem] mt-2 grid min-w-0 gap-1">
      <MobileActivitySignalRow activity={firstActivity} locale={locale} />
      {remainingActivities.length > 0 ? (
        <details className="group min-w-0">
          <summary
            className="inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-md bg-moss/10 px-2 text-xs font-semibold text-moss transition hover:bg-moss/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 [&::-webkit-details-marker]:hidden"
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
              <MobileActivitySignalRow
                key={activity.id}
                activity={activity}
                locale={locale}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function MobileActivitySignalRow({
  activity,
  locale,
}: {
  activity: DirectConversationActivitySignalViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const label = t.activitySignal(
    formatActivityDateOnly(activity.startAt, locale),
    activity.title,
  );

  return (
    <Link
      aria-label={t.openActivity(activity.title)}
      className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1.5 rounded-md bg-moss/5 px-2 py-1 text-xs leading-5 text-zinc-600 transition hover:bg-moss/10 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      href={withLocale(locale, `/activities/${activity.id}`)}
      title={label}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-moss" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
