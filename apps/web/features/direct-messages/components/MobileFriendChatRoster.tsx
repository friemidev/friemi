"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { formatActivityDate, formatActivityDateOnly } from "@chill-club/shared";
import { Button } from "@chill-club/ui";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { withLocale } from "@/lib/routes";
import {
  AddFriendDialog,
  IncomingFriendRequestsPanel,
  RequestCountBadge,
} from "@/features/friends/components/FriendsDashboard";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
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
  const redirectPath = "/messages";

  return (
    <section className="space-y-4 pb-24 lg:hidden">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-sand bg-[linear-gradient(135deg,#FEFFF9_0%,#FFF5E6_56%,#DEAAB3_100%)] p-4 shadow-[0_16px_38px_rgba(21,98,64,0.08)]">
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-moss/10"
        />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <button
            type="button"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-sand transition active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
            aria-label={t.addFriend}
            title={t.addFriend}
            onClick={() => setAddFriendOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            <RequestCountBadge count={incomingRequests.length} />
          </button>
        </div>
        <div className="min-w-0">
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-moss">
            {t.friendListTitle}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
            {t.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#156240]">
            {t.friendListDescription}
          </p>
        </div>
      </div>

      <IncomingFriendRequestsPanel
        incomingRequests={incomingRequests}
        locale={locale}
        redirectPath={redirectPath}
        returnTo="messages"
      />

      {friends.length === 0 ? (
        <div className="rounded-[1.2rem] border border-dashed border-sand bg-white/70 p-5 shadow-[0_10px_24px_rgba(21,98,64,0.06)]">
          <h2 className="text-base font-semibold text-ink">
            {t.emptyFriendListTitle}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#156240]">
            {t.emptyFriendListDescription}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="relative mt-5 h-11 gap-2 rounded-full bg-white px-5 text-moss ring-1 ring-sand"
            onClick={() => setAddFriendOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            {t.addFriend}
            <RequestCountBadge count={incomingRequests.length} />
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
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
  const sourceLabel = lastMessage?.sourceActivity
    ? t.sourceActivityLabel(lastMessage.sourceActivity.title)
    : null;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body.trim() || t.imageMessage}`
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
          <span className="truncate text-sm font-semibold text-ink">
            {friend.friend.nickname}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-[#8E8383]">
            {formatActivityDate(time, locale)}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs leading-5 text-[#156240]">
          {sourceLabel ? `${sourceLabel} · ${preview}` : preview}
        </span>
      </span>
    </>
  );

  return (
    <article className="min-w-0 rounded-[1.1rem] border border-sand bg-white/74 p-3 shadow-[0_10px_24px_rgba(21,98,64,0.06)] transition active:translate-y-px">
      {friend.conversationId ? (
        <IntentPrefetchLink
          aria-label={t.openConversation(friend.friend.nickname)}
          className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
          href={withLocale(locale, `/messages/${friend.conversationId}`)}
          prefetchOnVisible
        >
          {content}
        </IntentPrefetchLink>
      ) : (
        <form action={openDirectConversationAction}>
          <input name="locale" type="hidden" value={locale} />
          <input
            name="friendProfileId"
            type="hidden"
            value={friend.friend.id}
          />
          <button
            type="submit"
            className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.9rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
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
            className="inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-full bg-team-bg px-2.5 text-xs font-semibold text-moss ring-1 ring-sand transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden"
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
    activity.timeState,
  );

  return (
    <Link
      aria-label={t.openActivity(activity.title)}
      className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1.5 rounded-full bg-team-bg px-2.5 py-1 text-xs leading-5 text-[#156240] ring-1 ring-sand transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
      href={withLocale(locale, getActivityDetailPath(activity.id))}
      title={label}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-moss" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
