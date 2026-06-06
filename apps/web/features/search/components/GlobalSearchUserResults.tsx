"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  LoaderCircle,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  sendFriendRequestToProfileAction,
  type FriendActionState,
} from "@/features/friends/actions/friendActions";
import type { GlobalSearchUserViewModel } from "@/features/search/queries/getGlobalSearchResults";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

const initialFriendActionState: FriendActionState = {};

type GlobalSearchUserResultsProps = {
  locale: string;
  users: GlobalSearchUserViewModel[];
};

export function GlobalSearchUserResults({
  locale,
  users,
}: GlobalSearchUserResultsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {users.map((user) => (
        <GlobalSearchUserCard key={user.id} locale={locale} user={user} />
      ))}
    </div>
  );
}

function GlobalSearchUserCard({
  locale,
  user,
}: {
  locale: string;
  user: GlobalSearchUserViewModel;
}) {
  const t = getCopy(locale).globalSearch;
  const [state, formAction] = useActionState(
    sendFriendRequestToProfileAction,
    initialFriendActionState,
  );
  const [requestSent, setRequestSent] = useState(false);
  const profileHref = withLocale(locale, `/profile/${user.id}`);

  useEffect(() => {
    if (state.ok) {
      setRequestSent(true);
    }
  }, [state.ok]);

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center">
      <Link
        href={profileHref}
        className="group flex min-w-0 flex-1 items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        aria-label={t.openUserProfile(user.nickname)}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay/15 text-clay ring-1 ring-black/10">
          {user.avatarUrl ? (
            // Avatar URLs come from Clerk/Google and are already thumbnail-sized.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold text-ink">
              {user.nickname}
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-ink"
              aria-hidden="true"
            />
          </span>
          <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
            <span className="truncate">
              {user.friendCode
                ? `${t.friendCodeLabel} ${user.friendCode}`
                : t.friendCodeMissing}
            </span>
          </span>
        </span>
      </Link>

      <div className="shrink-0 sm:w-32">
        <FriendRequestCta
          locale={locale}
          relationshipStatus={user.relationshipStatus}
          requestSent={requestSent}
          targetProfileId={user.id}
          state={state}
          formAction={formAction}
        />
      </div>
    </article>
  );
}

function FriendRequestCta({
  locale,
  relationshipStatus,
  requestSent,
  targetProfileId,
  state,
  formAction,
}: {
  locale: string;
  relationshipStatus: GlobalSearchUserViewModel["relationshipStatus"];
  requestSent: boolean;
  targetProfileId: string;
  state: FriendActionState;
  formAction: (formData: FormData) => void;
}) {
  const t = getCopy(locale).globalSearch;

  if (requestSent) {
    return (
      <RelationshipStatusPill label={t.requestSent} icon="check" tone="good" />
    );
  }

  if (relationshipStatus === "SELF") {
    return <RelationshipStatusPill label={t.selfUser} icon="check" />;
  }

  if (relationshipStatus === "FRIENDS") {
    return (
      <RelationshipStatusPill
        label={t.alreadyFriends}
        icon="check"
        tone="good"
      />
    );
  }

  if (relationshipStatus === "PENDING") {
    return <RelationshipStatusPill label={t.pendingFriendRequest} />;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="targetProfileId" value={targetProfileId} />
      <input type="hidden" name="returnTo" value="friends" />
      <AddFriendSubmitButton locale={locale} />
      {state.formError ? (
        <p className="text-xs leading-5 text-clay">{state.formError}</p>
      ) : null}
    </form>
  );
}

function RelationshipStatusPill({
  icon = "clock",
  label,
  tone = "neutral",
}: {
  icon?: "check" | "clock";
  label: string;
  tone?: "neutral" | "good";
}) {
  const Icon = icon === "check" ? CheckCircle2 : Clock;

  return (
    <span
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium ring-1",
        tone === "good"
          ? "bg-moss/10 text-moss ring-moss/20"
          : "bg-zinc-100 text-zinc-600 ring-zinc-200",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function AddFriendSubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).globalSearch;

  return (
    <Button
      type="submit"
      className={cn("w-full gap-2", pending ? "cursor-wait" : null)}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <UserPlus className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? t.addingFriend : t.addFriend}
    </Button>
  );
}
