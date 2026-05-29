import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { Button } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { openDirectConversationAction } from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationListItemViewModel,
  DirectConversationThreadViewModel,
  DirectMessageUserViewModel,
} from "../queries/getDirectMessages";
import { MessageAvatar } from "./MessageAvatar";
import { MessageComposer } from "./MessageComposer";
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
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
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
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={t.openConversation(conversation.peer.nickname)}
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-lg p-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
        isActive
          ? "bg-ink text-white shadow-sm"
          : "text-ink hover:bg-white hover:shadow-sm",
      )}
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
  );
}

export function NoConversationSelected({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="hidden min-h-[28rem] items-center justify-center rounded-lg border border-dashed border-black/10 bg-white/45 p-8 lg:flex">
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
    <section className="overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-sm">
      <div className="flex min-w-0 items-center gap-3 border-b border-black/10 bg-white/80 p-4">
        <Link
          href={withLocale(locale, "/messages")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 lg:hidden"
          aria-label={t.backToMessages}
          title={t.backToMessages}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <MessageAvatar
          avatarUrl={conversation.peer.avatarUrl}
          name={conversation.peer.nickname}
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink">
            {t.threadTitle(conversation.peer.nickname)}
          </h1>
          {conversation.peer.bio ? (
            <p className="mt-1 truncate text-xs text-zinc-500">
              {conversation.peer.bio}
            </p>
          ) : null}
        </div>
      </div>

      <div className="max-h-[calc(100vh-17rem)] min-h-[22rem] overflow-y-auto bg-zinc-50/60 px-3 py-4 sm:px-5">
        {hasMessages ? (
          <div className="grid gap-3">
            {conversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                body={message.body}
                createdAt={message.createdAt}
                isMine={message.isMine}
                locale={locale}
                peer={conversation.peer}
              />
            ))}
            <MessageThreadScrollAnchor lastMessageId={lastMessageId} />
          </div>
        ) : (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="max-w-sm rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-center">
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
    <div className="sticky bottom-[4.75rem] z-20 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:bottom-0 md:rounded-b-lg">
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
  peer,
}: {
  body: string;
  createdAt: string;
  isMine: boolean;
  locale: string;
  peer: DirectMessageUserViewModel;
}) {
  return (
    <div className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
      {!isMine ? (
        <MessageAvatar
          avatarUrl={peer.avatarUrl}
          name={peer.nickname}
          size="sm"
        />
      ) : null}
      <div
        className={cn(
          "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[68%]",
          isMine
            ? "bg-ink text-white"
            : "bg-white text-ink ring-1 ring-black/10",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p
          className={cn(
            "mt-1 text-[11px]",
            isMine ? "text-white/60" : "text-zinc-400",
          )}
        >
          {formatActivityDate(createdAt, locale)}
        </p>
      </div>
    </div>
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
