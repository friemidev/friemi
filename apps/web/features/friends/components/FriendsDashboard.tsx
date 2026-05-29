"use client";

import Link from "next/link";
import { Children, useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Inbox,
  MessageCircle,
  Send,
  Trash2,
  type LucideIcon,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { formatActivityDateOnly } from "@chill-club/shared";
import { Button, Input, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendshipAction,
  sendFriendRequestAction,
  type FriendActionState,
} from "../actions/friendActions";
import { getFriendsCopy } from "../copy";
import type {
  FriendActivitySummaryViewModel,
  FriendRequestViewModel,
  FriendsDashboardViewModel,
  FriendUserViewModel,
} from "../queries/getFriendsDashboard";

type FriendsDashboardProps = {
  dashboard: FriendsDashboardViewModel;
  locale: string;
};

type FriendAction = (
  previousState: FriendActionState,
  formData: FormData,
) => Promise<FriendActionState>;

const initialState: FriendActionState = {};

export function FriendsDashboard({ dashboard, locale }: FriendsDashboardProps) {
  const t = getFriendsCopy(locale);
  const hasIncomingRequests = dashboard.incomingRequests.length > 0;
  const hasOutgoingRequests = dashboard.outgoingRequests.length > 0;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "grid gap-4",
          hasIncomingRequests &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]",
        )}
      >
        <AddFriendForm
          className={cn(
            hasIncomingRequests ? "order-2 lg:order-1" : "lg:max-w-3xl",
          )}
          locale={locale}
        />
        {hasIncomingRequests ? (
          <RequestPanel
            className="order-1 lg:order-2"
            count={dashboard.incomingRequests.length}
            title={t.incomingTitle}
            icon="inbox"
          >
            {dashboard.incomingRequests.map((request) => (
              <IncomingRequestCard
                key={request.id}
                locale={locale}
                request={request}
              />
            ))}
          </RequestPanel>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-4",
          hasOutgoingRequests &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]",
        )}
      >
        <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss">
              <UsersRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">
                {t.friendsTitle}
              </h2>
              {dashboard.friends.length > 0 ? (
                <span className="mt-2 inline-flex h-6 items-center rounded-full bg-moss/10 px-2.5 text-xs font-semibold text-moss">
                  {dashboard.friends.length}
                </span>
              ) : null}
              <p className="mt-1 text-sm text-zinc-500">
                {dashboard.friends.length > 0
                  ? t.friendsDescription(dashboard.friends.length)
                  : t.friendsEmptyDescription}
              </p>
            </div>
          </div>

          {dashboard.friends.length === 0 ? (
            <CompactEmptyState
              title={t.friendsEmptyTitle}
              description={t.friendsEmptyDescription}
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {dashboard.friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  activities={friend.recentActivities}
                  friendshipId={friend.id}
                  locale={locale}
                  user={friend.user}
                />
              ))}
            </div>
          )}
        </section>

        {hasOutgoingRequests ? (
          <RequestPanel
            count={dashboard.outgoingRequests.length}
            title={t.outgoingTitle}
            icon="send"
          >
            {dashboard.outgoingRequests.map((request) => (
              <OutgoingRequestCard
                key={request.id}
                locale={locale}
                request={request}
              />
            ))}
          </RequestPanel>
        ) : null}
      </div>
    </div>
  );
}

function AddFriendForm({
  className,
  locale,
}: {
  className?: string;
  locale: string;
}) {
  const [state, formAction] = useActionState(
    sendFriendRequestAction,
    initialState,
  );
  const t = getFriendsCopy(locale);

  return (
    <section
      className={cn(
        "rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
          <UserPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{t.addTitle}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t.addDescription}</p>
        </div>
      </div>

      <form action={formAction} className="mt-4 grid gap-4" noValidate>
        <input name="locale" type="hidden" value={locale} />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {t.searchLabel}
          </span>
          <Input
            name="searchTerm"
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            className="bg-white"
          />
          <span className="text-xs leading-5 text-zinc-500">
            {t.searchHint}
          </span>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {t.messageLabel}
          </span>
          <Textarea
            name="message"
            maxLength={240}
            placeholder={t.messagePlaceholder}
            className="min-h-24 resize-none bg-white"
          />
        </label>

        {state.formError ? <FormError message={state.formError} /> : null}

        <SubmitButton
          className="w-full sm:w-fit"
          icon={Send}
          pendingLabel={t.sending}
        >
          {t.send}
        </SubmitButton>
      </form>
    </section>
  );
}

function RequestPanel({
  className,
  count,
  title,
  icon,
  children,
}: {
  className?: string;
  count: number;
  title: string;
  icon: "inbox" | "send";
  children: ReactNode;
}) {
  const Icon = icon === "inbox" ? Inbox : Send;
  const items = Children.toArray(children);
  const hasItems = items.length > 0;

  return (
    <section
      className={cn(
        "rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
          {count > 0 ? (
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-clay/10 px-2 text-xs font-semibold text-clay">
              {count}
            </span>
          ) : null}
        </div>
      </div>

      {hasItems ? <div className="mt-4 grid gap-3">{items}</div> : null}
    </section>
  );
}

function FriendCard({
  activities,
  friendshipId,
  locale,
  user,
}: {
  activities: FriendActivitySummaryViewModel[];
  friendshipId: string;
  locale: string;
  user: FriendUserViewModel;
}) {
  const [state, formAction] = useActionState(
    removeFriendshipAction,
    initialState,
  );
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
      <UserSummary
        compactBio={activities.length > 0}
        locale={locale}
        user={user}
      />
      {activities.length > 0 ? (
        <FriendActivitySummary activities={activities} locale={locale} />
      ) : null}
      <form action={openDirectConversationAction} className="mt-3 grid">
        <input name="locale" type="hidden" value={locale} />
        <input name="friendProfileId" type="hidden" value={user.id} />
        <SubmitButton
          icon={MessageCircle}
          pendingLabel={t.acting}
          variant="secondary"
        >
          {t.message}
        </SubmitButton>
      </form>
      <form
        action={formAction}
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          if (!window.confirm(t.removeConfirm)) {
            event.preventDefault();
          }
        }}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="friendshipId" type="hidden" value={friendshipId} />
        {state.formError ? <FormError message={state.formError} /> : null}
        <SubmitButton icon={Trash2} pendingLabel={t.acting} variant="secondary">
          {t.remove}
        </SubmitButton>
      </form>
    </article>
  );
}

function FriendActivitySummary({
  activities,
  locale,
}: {
  activities: FriendActivitySummaryViewModel[];
  locale: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = getFriendsCopy(locale);
  const [firstActivity, ...remainingActivities] = activities;

  if (!firstActivity) {
    return null;
  }

  const hasMore = remainingActivities.length > 0;

  return (
    <div className="mt-3 rounded-md bg-moss/5 p-2.5 ring-1 ring-moss/10">
      <div className="flex min-w-0 items-start gap-2">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
        <Link
          className="min-w-0 flex-1 text-xs font-medium leading-5 text-ink transition hover:text-moss"
          href={withLocale(locale, `/activities/${firstActivity.id}`)}
          title={firstActivity.title}
        >
          <span className="line-clamp-2">
            {t.friendActivitySummary(
              formatActivityDateOnly(firstActivity.startAt, locale),
              firstActivity.title,
            )}
          </span>
        </Link>
        {hasMore ? (
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-white px-2 text-xs font-semibold text-moss ring-1 ring-moss/15 transition hover:bg-moss/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? t.collapseActivities
                : t.showMoreActivitiesLabel(remainingActivities.length)
            }
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded
              ? t.collapseActivities
              : t.moreActivities(remainingActivities.length)}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition",
                isExpanded && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-2 grid max-h-32 gap-1 overflow-y-auto pr-1">
          {remainingActivities.map((activity) => (
            <Link
              key={activity.id}
              className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs leading-5 text-zinc-600 ring-1 ring-black/5 transition hover:bg-white hover:text-ink"
              href={withLocale(locale, `/activities/${activity.id}`)}
              title={activity.title}
            >
              <span className="shrink-0 whitespace-nowrap text-zinc-500">
                {formatActivityDateOnly(activity.startAt, locale)}
              </span>
              <span className="truncate font-medium">{activity.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IncomingRequestCard({
  locale,
  request,
}: {
  locale: string;
  request: FriendRequestViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
      <UserSummary locale={locale} user={request.user} />
      <RequestMeta locale={locale} request={request} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallActionForm
          action={acceptFriendRequestAction}
          icon={Check}
          locale={locale}
          requestId={request.id}
          variant="success"
        >
          {t.accept}
        </SmallActionForm>
        <SmallActionForm
          action={rejectFriendRequestAction}
          icon={X}
          locale={locale}
          requestId={request.id}
          variant="secondary"
        >
          {t.reject}
        </SmallActionForm>
      </div>
    </article>
  );
}

function OutgoingRequestCard({
  locale,
  request,
}: {
  locale: string;
  request: FriendRequestViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
      <UserSummary locale={locale} user={request.user} />
      <RequestMeta locale={locale} request={request} />
      <div className="mt-3">
        <SmallActionForm
          action={cancelFriendRequestAction}
          icon={X}
          locale={locale}
          requestId={request.id}
          variant="secondary"
        >
          {t.cancel}
        </SmallActionForm>
      </div>
    </article>
  );
}

function SmallActionForm({
  action,
  children,
  icon,
  locale,
  requestId,
  variant = "primary",
}: {
  action: FriendAction;
  children: ReactNode;
  icon: LucideIcon;
  locale: string;
  requestId: string;
  variant?: "primary" | "secondary" | "success";
}) {
  const [state, formAction] = useActionState(action, initialState);
  const t = getFriendsCopy(locale);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="requestId" type="hidden" value={requestId} />
      {state.formError ? <FormError message={state.formError} /> : null}
      <SubmitButton icon={icon} pendingLabel={t.acting} variant={variant}>
        {children}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  className,
  icon: Icon,
  pendingLabel,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "success";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={cn("gap-2 whitespace-nowrap", className)}
    >
      <Icon className="h-4 w-4" />
      {pending ? pendingLabel : children}
    </Button>
  );
}

function UserSummary({
  compactBio = false,
  locale,
  user,
}: {
  compactBio?: boolean;
  locale: string;
  user: FriendUserViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <UserAvatar user={user} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink">
          {user.nickname}
        </h3>
        {user.email ? (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
        ) : null}
        <p
          className={cn(
            "mt-1 break-words text-xs leading-5 text-zinc-500",
            compactBio ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {user.bio || t.noBio}
        </p>
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: FriendUserViewModel }) {
  const initial = user.nickname.trim().slice(0, 1).toUpperCase() || "N";

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss text-sm font-semibold text-white">
      {user.avatarUrl ? (
        // User avatars come from Clerk or existing profile data. Keeping img
        // here avoids adding remote image domains for this small control.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

function RequestMeta({
  locale,
  request,
}: {
  locale: string;
  request: FriendRequestViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <div className="mt-3 space-y-2">
      {request.message ? (
        <p className="break-words rounded-md bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-700">
          {request.message}
        </p>
      ) : null}
      <p className="text-xs text-zinc-400">
        {t.requestedAt(request.createdAt.slice(0, 10))}
      </p>
    </div>
  );
}

function CompactEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-white/60 p-5 text-center">
      <UsersRound className="mx-auto h-6 w-6 text-zinc-400" />
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}
