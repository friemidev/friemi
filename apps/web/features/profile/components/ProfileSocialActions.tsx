"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import { CheckCircle2, Loader2, UserMinus, UserPlus } from "lucide-react";
import {
  removeFriendshipAction,
  sendFriendRequestToProfileAction,
  type FriendActionState,
} from "@/features/friends/actions/friendActions";
import { getFriendsCopy } from "@/features/friends/copy";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { withLocale } from "@/lib/routes";
import type { ProfileViewerRelationshipViewModel } from "../queries/getProfileDashboard";

type ProfileSocialActionsProps = {
  isAuthenticated: boolean;
  locale: string;
  profileId: string;
  relationship: ProfileViewerRelationshipViewModel;
};

const friendActionInitialState: FriendActionState = {};

function getProfileSocialActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      addFriend: "Ajouter ami",
      friendRequestSent: "Demande envoyee",
      incomingRequest: "Demande recue",
      signInToAddFriend: "Connexion ami",
      alreadyFriend: "Deja ami",
    };
  }

  if (locale === "en") {
    return {
      addFriend: "Add friend",
      friendRequestSent: "Request sent",
      incomingRequest: "Request received",
      signInToAddFriend: "Sign in to add",
      alreadyFriend: "Friends",
    };
  }

  return {
    addFriend: "添加好友",
    friendRequestSent: "申请已发送",
    incomingRequest: "收到申请",
    signInToAddFriend: "登录后添加",
    alreadyFriend: "已是好友",
  };
}

function AddFriendSubmitButton({
  isSent,
  locale,
}: {
  isSent: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const t = getFriendsCopy(locale);
  const actionCopy = getProfileSocialActionCopy(locale);

  return (
    <Button
      className="h-10 w-full rounded-full px-4 text-sm"
      type="submit"
      variant={isSent ? "secondary" : "primary"}
      disabled={pending || isSent}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.sending}
        </span>
      ) : isSent ? (
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {actionCopy.friendRequestSent}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {actionCopy.addFriend}
        </span>
      )}
    </Button>
  );
}

function RemoveFriendSubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getFriendsCopy(locale);

  return (
    <Button
      className="h-10 w-full rounded-full px-4 text-sm"
      type="submit"
      variant="secondary"
      disabled={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.acting}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <UserMinus className="h-4 w-4" />
          {t.remove}
        </span>
      )}
    </Button>
  );
}

function FriendAction({
  isAuthenticated,
  locale,
  profileId,
  relationship,
}: ProfileSocialActionsProps) {
  const friendsCopy = getFriendsCopy(locale);
  const actionCopy = getProfileSocialActionCopy(locale);
  const redirectPath = `/profile/${profileId}`;
  const signInHref = withLocale(
    locale,
    `/sign-in?redirect_url=${encodeURIComponent(
      withLocale(locale, redirectPath),
    )}`,
  );
  const [addState, addAction] = useActionState(
    sendFriendRequestToProfileAction,
    friendActionInitialState,
  );
  const [removeState, removeAction] = useActionState(
    removeFriendshipAction,
    friendActionInitialState,
  );

  if (!isAuthenticated) {
    return (
      <Link className="block" href={signInHref}>
        <Button
          className="h-10 w-full rounded-full px-4 text-sm"
          variant="secondary"
        >
          <UserPlus className="h-4 w-4" />
          {actionCopy.signInToAddFriend}
        </Button>
      </Link>
    );
  }

  if (relationship.isFriend && relationship.friendshipId) {
    return (
      <form
        action={removeAction}
        className="grid gap-2"
        onSubmit={(event) => {
          if (!window.confirm(friendsCopy.removeConfirm)) {
            event.preventDefault();
          }
        }}
      >
        <div className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-moss/10 px-3 text-sm font-medium text-moss ring-1 ring-moss/20">
          <CheckCircle2 className="h-4 w-4" />
          {actionCopy.alreadyFriend}
        </div>
        <input name="locale" type="hidden" value={locale} />
        <input
          name="friendshipId"
          type="hidden"
          value={relationship.friendshipId}
        />
        <input name="redirectPath" type="hidden" value={redirectPath} />
        <RemoveFriendSubmitButton locale={locale} />
        {removeState.formError ? (
          <p className="text-xs text-red-600">{removeState.formError}</p>
        ) : null}
      </form>
    );
  }

  if (relationship.pendingFriendRequest === "sent" || addState.ok) {
    return (
      <div className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-moss/10 px-4 text-sm font-medium text-moss ring-1 ring-moss/20">
        <CheckCircle2 className="h-4 w-4" />
        {actionCopy.friendRequestSent}
      </div>
    );
  }

  if (relationship.pendingFriendRequest === "received") {
    return (
      <Link className="block" href={withLocale(locale, "/friends")}>
        <Button
          className="h-10 w-full rounded-full px-4 text-sm"
          variant="secondary"
        >
          {actionCopy.incomingRequest}
        </Button>
      </Link>
    );
  }

  return (
    <form action={addAction} className="grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="targetProfileId" type="hidden" value={profileId} />
      <input name="returnTo" type="hidden" value="friends" />
      <AddFriendSubmitButton isSent={Boolean(addState.ok)} locale={locale} />
      {addState.formError ? (
        <p className="text-xs text-red-600">{addState.formError}</p>
      ) : null}
    </form>
  );
}

export function ProfileSocialActions({
  isAuthenticated,
  locale,
  profileId,
  relationship,
}: ProfileSocialActionsProps) {
  const redirectPath = `/profile/${profileId}`;

  return (
    <div className="grid w-full gap-2 sm:w-[280px]">
      <div className="grid grid-cols-2 gap-2">
        <FollowButton
          buttonClassName="h-10 rounded-full px-4 text-sm"
          fullWidth
          isAuthenticated={isAuthenticated}
          isFollowing={relationship.isFollowing}
          locale={locale}
          redirectPath={redirectPath}
          targetUserProfileId={profileId}
        />
        <FriendAction
          isAuthenticated={isAuthenticated}
          locale={locale}
          profileId={profileId}
          relationship={relationship}
        />
      </div>
      <ReportDialog
        className="h-9 w-full bg-transparent text-xs"
        isAuthenticated={isAuthenticated}
        locale={locale}
        redirectPath={redirectPath}
        targetId={profileId}
        targetType="USER_PROFILE"
        variant="link"
      />
    </div>
  );
}
