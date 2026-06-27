import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  MessageCircle,
  MoreVertical,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  formatActivityDate,
  formatActivityDateOnly,
} from "@chill-club/shared";
import { Button } from "@chill-club/ui";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { openDirectConversationAction } from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivitySignalViewModel,
  DirectConversationListItemViewModel,
  DirectConversationThreadViewModel,
  DirectMessageUserViewModel,
} from "../queries/getDirectMessages";
import { MessageAvatar } from "./MessageAvatar";
import { MessageComposer } from "./MessageComposer";
import { MessageThreadAutoRefresh } from "./MessageThreadAutoRefresh";
import { MessageThreadScrollAnchor } from "./MessageThreadScrollAnchor";

type ConversationListPanelProps = {
  conversations: DirectConversationListItemViewModel[];
  currentUserProfileId: string;
  locale: string;
  selectedConversationId?: string;
};

export function ConversationListPanel({
  conversations,
  currentUserProfileId,
  locale,
  selectedConversationId,
}: ConversationListPanelProps) {
  const t = getDirectMessagesCopy(locale);

  return (
    <details
      open
      className="group overflow-hidden rounded-[1.35rem] border border-sand bg-white/72 shadow-[0_18px_48px_rgba(10,63,49,0.08)] ring-1 ring-white/70"
    >
      <summary className="cursor-pointer list-none border-b border-sand bg-[linear-gradient(135deg,#f7fff3_0%,#fffaf2_58%,#fff0ed_100%)] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-white shadow-[0_10px_22px_rgba(0,110,77,0.18)]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{t.listTitle}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#41665c]">
              {t.listDescription}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-moss transition group-open:rotate-180" />
        </div>
      </summary>

      {conversations.length === 0 ? (
        <div className="grid gap-4 p-4">
          <div className="py-3">
            <h3 className="text-sm font-semibold text-ink">
              {t.emptyListTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#41665c]">
              {t.emptyListDescription}
            </p>
          </div>
          <Link href={withLocale(locale, "/friends")} className="w-full">
            <Button variant="secondary" className="w-full gap-2 rounded-full">
              <UsersRound className="h-4 w-4" />
              {t.openFriends}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto bg-[#fbfff7]/72 p-2.5">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              currentUserProfileId={currentUserProfileId}
              isActive={conversation.id === selectedConversationId}
              locale={locale}
            />
          ))}
        </div>
      )}
    </details>
  );
}

function ConversationListItem({
  conversation,
  currentUserProfileId,
  isActive,
  locale,
}: {
  conversation: DirectConversationListItemViewModel;
  currentUserProfileId: string;
  isActive: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = conversation.lastMessage;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body}`
    : t.lastMessageEmpty;
  const time = lastMessage?.createdAt ?? conversation.createdAt;

  return (
    <article
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-[1.05rem] p-2.5 transition duration-200",
        isActive
          ? "bg-moss text-white shadow-[0_14px_26px_rgba(0,110,77,0.18)]"
          : "text-ink hover:bg-white hover:shadow-[0_10px_24px_rgba(10,63,49,0.08)]",
      )}
    >
      <Link
        aria-label={t.openConversation(conversation.peer.nickname)}
        className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
        href={withLocale(locale, `/messages/${conversation.id}`)}
      >
        <MessageAvatar
          avatarUrl={conversation.peer.avatarUrl}
          name={conversation.peer.nickname}
        />
        <span className="min-w-0">
          <span className="flex min-w-0 items-start gap-2">
            <span className="truncate text-sm font-semibold">
              {conversation.peer.nickname}
            </span>
            <span
              className={cn(
                "ml-auto shrink-0 whitespace-nowrap text-xs",
                isActive ? "text-white/65" : "text-[#6d857c]",
              )}
            >
              {formatActivityDate(time, locale)}
            </span>
          </span>
          <span
            className={cn(
              "mt-1 block truncate text-xs leading-5",
              isActive ? "text-white/75" : "text-[#41665c]",
            )}
          >
            {preview}
          </span>
        </span>
      </Link>
      <ConversationActivitySignals
        activities={conversation.recentActivities}
        isActive={isActive}
        locale={locale}
      />
    </article>
  );
}

function ConversationActivitySignals({
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
      <ActivitySignalRow
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
                ? "bg-white/10 text-white/80 hover:bg-white/15"
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
              <ActivitySignalRow
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

function ActivitySignalRow({
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
    <ContextualDetailLink
      aria-label={t.openActivity(activity.title)}
      className={cn(
        "grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30",
        isActive
          ? "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
          : "bg-team-bg text-[#41665c] ring-1 ring-sand hover:bg-white hover:text-ink",
      )}
      href={withLocale(locale, `/activities/${activity.id}`)}
      detailSource={{
        sourceKey: "messages",
        targetKey: `activity:${activity.id}`,
        targetKind: "activity",
      }}
      data-detail-source-target={`activity:${activity.id}`}
      title={label}
    >
      <CalendarDays
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? "text-white/60" : "text-moss",
        )}
      />
      <span className="truncate">{label}</span>
    </ContextualDetailLink>
  );
}

export function NoConversationSelected({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="hidden h-[calc(100dvh-6.5rem)] items-center justify-center rounded-[1.45rem] border border-sand bg-white/62 p-8 shadow-[0_18px_48px_rgba(10,63,49,0.07)] ring-1 ring-white/70 lg:flex">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss text-white shadow-[0_12px_24px_rgba(0,110,77,0.18)]">
          <MessageCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">
          {t.noSelectedTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#41665c]">
          {t.noSelectedDescription}
        </p>
      </div>
    </section>
  );
}

export function MessageThread({
  conversation,
  locale,
}: {
  conversation: DirectConversationThreadViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const hasMessages = conversation.messages.length > 0;
  const lastMessageId =
    conversation.messages[conversation.messages.length - 1]?.id;

  return (
    <section className="mx-0 flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white/78 shadow-[0_18px_48px_rgba(10,63,49,0.08)] md:min-h-[calc(100dvh-8.25rem)] md:rounded-[1.45rem] md:border md:border-sand md:ring-1 md:ring-white/70 lg:h-[calc(100dvh-6.5rem)] lg:min-h-0">
      <DetailSourceRestore sourceKey="messages" />
      <MessageThreadAutoRefresh conversationId={conversation.id} />
      <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 border-b border-sand bg-[linear-gradient(135deg,#f7fff3_0%,#fffaf2_62%,#fff0ed_100%)] p-4">
        <div className="flex h-9 w-9 items-center justify-start">
          <Link
            href={withLocale(locale, "/messages")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(10,63,49,0.08)] ring-1 ring-sand transition hover:bg-team-bg lg:hidden"
            aria-label={t.backToMessages}
            title={t.backToMessages}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <h1 className="min-w-0 truncate text-center text-lg font-semibold text-ink">
          {conversation.peer.nickname}
        </h1>
        <details className="group relative justify-self-end">
          <summary
            aria-label={t.viewProfile}
            title={t.viewProfile}
            className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(10,63,49,0.08)] ring-1 ring-sand transition hover:bg-team-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden"
          >
            <MoreVertical className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-[1rem] border border-sand bg-white py-1 shadow-[0_18px_34px_rgba(10,63,49,0.14)]">
            <ContextualDetailLink
              className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm font-medium text-[#41665c] transition hover:bg-team-bg hover:text-ink focus:outline-none focus-visible:bg-team-bg"
              href={withLocale(locale, `/profile/${conversation.peer.id}`)}
              detailSource={{
                sourceKey: "messages",
                targetKey: `profile:${conversation.peer.id}`,
                targetKind: "profile",
              }}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.viewProfile}</span>
            </ContextualDetailLink>
          </div>
        </details>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fbfff7_0%,#fffaf2_100%)] px-3 py-4 sm:px-5">
        {hasMessages ? (
          <div className="grid gap-3">
            {conversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                body={message.body}
                createdAt={message.createdAt}
                isMine={message.isMine}
                locale={locale}
                sender={
                  message.isMine ? conversation.currentUser : conversation.peer
                }
              />
            ))}
            <MessageThreadScrollAnchor lastMessageId={lastMessageId} />
          </div>
        ) : (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="max-w-sm p-5 text-center">
              <h2 className="text-base font-semibold text-ink">
                {t.emptyThreadTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#41665c]">
                {conversation.canSend
                  ? t.emptyThreadDescription
                  : t.readOnlyDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {conversation.canSend ? (
        <MessageComposer conversationId={conversation.id} locale={locale} />
      ) : (
        <ReadOnlyMessageComposer locale={locale} />
      )}
    </section>
  );
}

function ReadOnlyMessageComposer({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <div className="shrink-0 border-t border-sand bg-white/92 p-3 backdrop-blur md:rounded-b-[1.45rem]">
      <div className="rounded-[1rem] border border-dashed border-sand bg-team-bg px-3 py-3">
        <p className="text-sm font-semibold text-ink">{t.readOnlyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-[#41665c]">
          {t.readOnlyDescription}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  body,
  createdAt,
  isMine,
  locale,
  sender,
}: {
  body: string;
  createdAt: string;
  isMine: boolean;
  locale: string;
  sender: DirectMessageUserViewModel;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      {!isMine ? <MessageBubbleAvatar locale={locale} user={sender} /> : null}
      <div
        className={cn(
          "max-w-[76%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-[0_10px_24px_rgba(10,63,49,0.08)] sm:max-w-[64%]",
          isMine
            ? "rounded-tr-md bg-moss text-white"
            : "rounded-tl-md bg-white text-ink ring-1 ring-sand",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p
          className={cn(
            "mt-1 text-[11px]",
            isMine ? "text-white/65" : "text-[#6d857c]",
          )}
        >
          {formatActivityDate(createdAt, locale)}
        </p>
      </div>
      {isMine ? <MessageBubbleAvatar locale={locale} user={sender} /> : null}
    </div>
  );
}

function MessageBubbleAvatar({
  locale,
  user,
}: {
  locale: string;
  user: DirectMessageUserViewModel;
}) {
  return (
    <ContextualDetailLink
      aria-label={user.nickname}
      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
      href={withLocale(locale, `/profile/${user.id}`)}
      detailSource={{
        sourceKey: "messages",
        targetKey: `profile:${user.id}`,
        targetKind: "profile",
      }}
      title={user.nickname}
    >
      <MessageAvatar avatarUrl={user.avatarUrl} name={user.nickname} size="sm" />
    </ContextualDetailLink>
  );
}

export function StartConversationButton({
  friendProfileId,
  locale,
}: {
  friendProfileId: string;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  return (
    <form action={openDirectConversationAction} className="grid">
      <input name="locale" type="hidden" value={locale} />
      <input name="friendProfileId" type="hidden" value={friendProfileId} />
      <Button type="submit" variant="secondary" className="gap-2">
        <MessageCircle className="h-4 w-4" />
        {t.startConversation}
      </Button>
    </form>
  );
}
