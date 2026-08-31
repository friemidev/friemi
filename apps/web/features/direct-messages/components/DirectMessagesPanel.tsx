import Link from "next/link";
import {
  ArrowLeft,
  BellOff,
  CalendarDays,
  ChevronDown,
  Gift,
  MessageCircle,
  MoreVertical,
  Pin,
  UserRound,
  UsersRound,
} from "lucide-react";
import { formatActivityDateOnly } from "@chill-club/shared";
import { Button } from "@chill-club/ui";
import { CharmGiftDialog } from "@/features/charm/components/CharmGiftDialog";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getGlobalSearchHref } from "@/features/search/utils/searchQuery";
import { formatChatListTimestamp } from "@/lib/chatDateSeparators";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  toggleDirectConversationMuteAction,
  toggleDirectConversationPinAction,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";
import type {
  DirectConversationActivitySignalViewModel,
  DirectConversationActivityContextViewModel,
  DirectConversationListItemViewModel,
  DirectConversationThreadViewModel,
} from "../queries/getDirectMessages";
import { MessageAvatar } from "./MessageAvatar";
import { ChatRosterDismissButton } from "@/features/chat/components/ChatRosterDismissButton";
import { MessageThreadBackButton } from "./MessageThreadBackButton";
import { MessageThreadAutoRefresh } from "./MessageThreadAutoRefresh";
import { MessageThreadClient } from "./MessageThreadClient";
import { StartDirectConversationButton } from "./StartDirectConversationButton";

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
      className="group overflow-hidden rounded-[1.35rem] border border-sand bg-white/72 shadow-[0_18px_48px_rgba(21,98,64,0.08)] ring-1 ring-white/70"
    >
      <summary className="cursor-pointer list-none border-b border-sand bg-[linear-gradient(135deg,#FEFFF9_0%,#FFF5E6_58%,#DEAAB3_100%)] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{t.listTitle}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#156240]">
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
            <p className="mt-2 text-sm leading-6 text-[#156240]">
              {t.emptyListDescription}
            </p>
          </div>
          <Link
            href={getGlobalSearchHref(locale, "", { source: "messages" })}
            className="w-full"
          >
            <Button variant="secondary" className="w-full gap-2 rounded-full">
              <UsersRound className="h-4 w-4" />
              {t.openFriends}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto bg-[#FEFFF9]/72 p-2.5">
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
  const unreadCount = conversation.unreadCount;
  const unreadBadgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  const showUnreadBadge = unreadCount > 0 && !conversation.isMuted;
  const showMutedUnreadDot = unreadCount > 0 && conversation.isMuted;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const sourceLabel = lastMessage?.sourceActivity
    ? t.sourceActivityLabel(lastMessage.sourceActivity.title)
    : null;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body.trim() || t.imageMessage}`
    : t.lastMessageEmpty;
  const time = lastMessage?.createdAt ?? conversation.createdAt;
  const showPublicNickname =
    Boolean(conversation.peer.remarkName) &&
    conversation.peer.publicNickname !== conversation.peer.nickname;

  return (
    <article
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group rounded-[1.05rem] p-2.5 transition duration-200",
        isActive
          ? "border border-[#8AB68E] bg-[#FEFFF9] text-[#1D1D1B] shadow-[0_14px_26px_rgba(21,98,64,0.12)]"
          : "text-ink hover:bg-white hover:shadow-[0_10px_24px_rgba(21,98,64,0.08)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Link
          aria-label={t.openConversation(conversation.peer.nickname)}
          className="grid min-w-0 flex-1 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
          href={withLocale(locale, `/messages/${conversation.id}`)}
        >
          <MessageAvatar
            avatarUrl={conversation.peer.avatarUrl}
            isOnline={conversation.peer.isOnline}
            name={conversation.peer.nickname}
            presenceDisplayStatus={conversation.peer.presenceDisplayStatus}
          />
          <span className="min-w-0">
            <span className="flex min-w-0 items-start gap-2">
              <span
                className={cn(
                  "truncate text-sm",
                  showUnreadBadge ? "font-bold" : "font-semibold",
                )}
              >
                {conversation.peer.nickname}
              </span>
              <span
                className={cn(
                  "ml-auto shrink-0 whitespace-nowrap text-xs",
                  isActive ? "text-[#8E8383]" : "text-[#8E8383]",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {conversation.isPinned ? (
                    <Pin aria-label={t.pinConversation} className="h-3 w-3" />
                  ) : null}
                  {conversation.isMuted ? (
                    <BellOff
                      aria-label={t.muteConversation}
                      className="h-3 w-3"
                    />
                  ) : null}
                  {formatChatListTimestamp(time, locale)}
                </span>
              </span>
              {showUnreadBadge ? (
                <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white shadow-[0_3px_8px_rgba(231,69,122,0.22)]">
                  {unreadBadgeText}
                </span>
              ) : showMutedUnreadDot ? (
                <span
                  aria-label={t.mutedUnreadLabel}
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E7457A] ring-2 ring-white"
                  title={t.mutedUnreadLabel}
                />
              ) : null}
            </span>
            {showPublicNickname ? (
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8E8383]">
                {conversation.peer.publicNickname}
              </span>
            ) : null}
            <span
              className={cn(
                "mt-1 block truncate text-xs leading-5",
                showUnreadBadge
                  ? "font-bold text-ink"
                  : isActive
                    ? "text-[#156240]"
                    : "text-[#156240]",
              )}
            >
              {sourceLabel ? `${sourceLabel} · ${preview}` : preview}
            </span>
          </span>
        </Link>
        <ChatRosterDismissButton
          className="md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          conversationId={conversation.id}
          kind="direct"
          locale={locale}
        />
      </div>
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
          ? "bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E] hover:bg-white hover:text-ink"
          : "bg-team-bg text-[#156240] ring-1 ring-sand hover:bg-white hover:text-ink",
      )}
      href={withLocale(locale, getActivityDetailPath(activity.id))}
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
          isActive ? "text-moss" : "text-moss",
        )}
      />
      <span className="truncate">{label}</span>
    </ContextualDetailLink>
  );
}

export function NoConversationSelected({ locale }: { locale: string }) {
  const t = getDirectMessagesCopy(locale);

  return (
    <section className="hidden h-[calc(100dvh-6.5rem)] items-center justify-center rounded-[1.45rem] border border-sand bg-white/62 p-8 shadow-[0_18px_48px_rgba(21,98,64,0.07)] ring-1 ring-white/70 lg:flex">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)]">
          <MessageCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">
          {t.noSelectedTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#156240]">
          {t.noSelectedDescription}
        </p>
      </div>
    </section>
  );
}

function ConversationPreferenceToggle({
  action,
  checked,
  conversationId,
  fieldName,
  label,
  locale,
}: {
  action: (formData: FormData) => Promise<void>;
  checked: boolean;
  conversationId: string;
  fieldName: "muted" | "pinned";
  label: string;
  locale: string;
}) {
  return (
    <form action={action}>
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      <input name={fieldName} type="hidden" value={checked ? "0" : "1"} />
      <button
        aria-checked={checked}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-[#111210] transition hover:bg-[#F7F7F0] focus:outline-none focus-visible:bg-[#F7F7F0]"
        role="switch"
        type="submit"
      >
        <span className="truncate">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors",
            checked ? "bg-[#1DB96A]" : "bg-[#D8DAD5]",
          )}
        >
          <span
            className={cn(
              "block h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(17,18,16,0.24)] transition-transform",
              checked && "translate-x-4",
            )}
          />
        </span>
      </button>
    </form>
  );
}

export function MessageThread({
  activityContext,
  backHref = "/messages",
  conversation,
  locale,
  showMutualFollowNotice = false,
}: {
  activityContext?: DirectConversationActivityContextViewModel | null;
  backHref?: string;
  conversation: DirectConversationThreadViewModel;
  locale: string;
  showMutualFollowNotice?: boolean;
}) {
  const t = getDirectMessagesCopy(locale);
  const hasMessages = conversation.messages.length > 0;

  return (
    <section className="mx-0 flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white/78 shadow-[0_18px_48px_rgba(21,98,64,0.08)] max-md:max-h-full md:min-h-[calc(100dvh-8.25rem)] md:rounded-[1.45rem] md:border md:border-sand md:ring-1 md:ring-white/70 lg:h-[calc(100dvh-6.5rem)] lg:min-h-0">
      <DetailSourceRestore sourceKey="messages" />
      <MessageThreadAutoRefresh conversationId={conversation.id} />
      <div className="grid min-w-0 shrink-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 border-b border-sand bg-[linear-gradient(135deg,#FEFFF9_0%,#FFF5E6_62%,#DEAAB3_100%)] p-4 max-md:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex h-9 w-9 items-center justify-start">
          <MessageThreadBackButton
            fallbackHref={withLocale(locale, backHref)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-sand transition hover:bg-team-bg lg:hidden"
            ariaLabel={t.backToMessages}
            title={t.backToMessages}
          >
            <ArrowLeft className="h-5 w-5" />
          </MessageThreadBackButton>
        </div>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-lg font-semibold leading-tight text-ink">
            {conversation.peer.nickname}
          </h1>
          {conversation.peer.remarkName &&
          conversation.peer.publicNickname !== conversation.peer.nickname ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold leading-none text-[#6C746A]">
              {conversation.peer.publicNickname}
            </p>
          ) : null}
        </div>
        <details className="group relative justify-self-end">
          <summary
            aria-label={t.viewProfile}
            title={t.viewProfile}
            className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-white text-moss shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-sand transition hover:bg-team-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 [&::-webkit-details-marker]:hidden"
          >
            <MoreVertical className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-[1rem] border border-sand bg-white py-1 shadow-[0_18px_34px_rgba(21,98,64,0.14)]">
            <ConversationPreferenceToggle
              action={toggleDirectConversationMuteAction}
              checked={conversation.isMuted}
              conversationId={conversation.id}
              fieldName="muted"
              label={t.muteConversation}
              locale={locale}
            />
            <ConversationPreferenceToggle
              action={toggleDirectConversationPinAction}
              checked={conversation.isPinned}
              conversationId={conversation.id}
              fieldName="pinned"
              label={t.pinConversation}
              locale={locale}
            />
            <ContextualDetailLink
              className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm font-medium text-[#156240] transition hover:bg-team-bg hover:text-ink focus:outline-none focus-visible:bg-team-bg"
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
            <CharmGiftDialog
              isAuthenticated
              locale={locale}
              recipientName={conversation.peer.nickname}
              recipientProfileId={conversation.peer.id}
              redirectPath={`/messages/${conversation.id}`}
              sourceContextId={conversation.id}
              sourceSurface="DIRECT_MESSAGE"
              triggerAriaLabel={t.sendGift}
              triggerClassName="flex h-auto w-full min-w-0 justify-start rounded-none bg-transparent px-3 py-2 text-sm font-medium text-[#9A2135] shadow-none hover:bg-[#FFF5E6] focus-visible:ring-[#E7457A]/24"
              triggerContent={
                <>
                  <Gift className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.sendGift}</span>
                </>
              }
            />
          </div>
        </details>
      </div>

      <MessageThreadClient
        activityContext={activityContext}
        canSend={conversation.canSend}
        conversationId={conversation.id}
        currentUser={conversation.currentUser}
        initialBody={
          activityContext && !hasMessages
            ? t.activityMessageSuggestion(activityContext.title)
            : undefined
        }
        initialMessages={conversation.messages}
        locale={locale}
        peer={conversation.peer}
        sendPolicy={conversation.sendPolicy}
        showMutualFollowNotice={showMutualFollowNotice}
      />
    </section>
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
    <StartDirectConversationButton
      buttonClassName="w-full bg-white/72 text-[#156240] shadow-none ring-1 ring-[#8AB68E] hover:bg-white hover:text-[#111210]"
      label={t.startConversation}
      locale={locale}
      peerProfileId={friendProfileId}
      redirectPath="/messages"
    />
  );
}
