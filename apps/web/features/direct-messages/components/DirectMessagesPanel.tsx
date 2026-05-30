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
      className="group overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-sm"
    >
      <summary className="cursor-pointer list-none border-b border-black/10 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{t.listTitle}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
              {t.listDescription}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
        </div>
      </summary>

      {conversations.length === 0 ? (
        <div className="grid gap-4 p-4">
          <div className="py-3">
            <h3 className="text-sm font-semibold text-ink">
              {t.emptyListTitle}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {t.emptyListDescription}
            </p>
          </div>
          <Link href={withLocale(locale, "/friends")} className="w-full">
            <Button variant="secondary" className="w-full gap-2">
              <UsersRound className="h-4 w-4" />
              {t.openFriends}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2">
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
        "rounded-lg p-2.5 transition",
        isActive
          ? "bg-ink text-white shadow-sm"
          : "text-ink hover:bg-white hover:shadow-sm",
      )}
    >
      <Link
        aria-label={t.openConversation(conversation.peer.nickname)}
        className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
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
                isActive ? "text-white/65" : "text-zinc-400",
              )}
            >
              {formatActivityDate(time, locale)}
            </span>
          </span>
          <span
            className={cn(
              "mt-1 block truncate text-xs leading-5",
              isActive ? "text-white/75" : "text-zinc-500",
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
              "inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 [&::-webkit-details-marker]:hidden",
              isActive
                ? "bg-white/10 text-white/80 hover:bg-white/15"
                : "bg-moss/10 text-moss hover:bg-moss/15",
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
  );

  return (
    <Link
      aria-label={t.openActivity(activity.title)}
      className={cn(
        "grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1.5 rounded-md px-2 py-1 text-xs leading-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
        isActive
          ? "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
          : "bg-moss/5 text-zinc-600 hover:bg-moss/10 hover:text-ink",
      )}
      href={withLocale(locale, `/activities/${activity.id}`)}
      title={label}
    >
      <CalendarDays
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? "text-white/60" : "text-moss",
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function NoConversationSelected({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="hidden h-[calc(100dvh-6.5rem)] items-center justify-center p-8 lg:flex">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10">
          <MessageCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">
          {t.noSelectedTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
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
    <section className="-mx-4 flex min-h-[calc(100dvh-8.25rem)] flex-col overflow-hidden bg-white/82 sm:mx-0 sm:rounded-lg sm:border sm:border-black/10 sm:shadow-sm lg:h-[calc(100dvh-6.5rem)] lg:min-h-0">
      <MessageThreadAutoRefresh conversationId={conversation.id} />
      <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 border-b border-black/10 bg-white/80 p-4">
        <div className="flex h-9 w-9 items-center justify-start">
          <Link
            href={withLocale(locale, "/messages")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 lg:hidden"
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
            className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 [&::-webkit-details-marker]:hidden"
          >
            <MoreVertical className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-lg border border-black/10 bg-white py-1 shadow-xl">
            <Link
              className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-ink focus:outline-none focus-visible:bg-zinc-50"
              href={withLocale(locale, `/profile/${conversation.peer.id}`)}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.viewProfile}</span>
            </Link>
          </div>
        </details>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/60 px-3 py-4 sm:px-5">
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
              <p className="mt-2 text-sm leading-6 text-zinc-500">
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
    <div className="shrink-0 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:rounded-b-lg">
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3">
        <p className="text-sm font-semibold text-ink">{t.readOnlyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
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
          "max-w-[76%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[64%]",
          isMine
            ? "rounded-tr-md bg-moss/12 text-ink ring-1 ring-moss/20"
            : "rounded-tl-md bg-white text-ink ring-1 ring-black/10",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p
          className={cn(
            "mt-1 text-[11px]",
            isMine ? "text-moss/75" : "text-zinc-400",
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
    <Link
      aria-label={user.nickname}
      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      href={withLocale(locale, `/profile/${user.id}`)}
      title={user.nickname}
    >
      <MessageAvatar avatarUrl={user.avatarUrl} name={user.nickname} size="sm" />
    </Link>
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
