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
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import { getSignInHref } from "@/lib/auth-redirect";
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
      friendRequestSent: "Demande envoyée",
      incomingRequest: "Demande reçue",
      signInToAddFriend: "Connexion ami",
      alreadyFriend: "Déjà ami",
      message: "Message",
    };
  }

  if (locale === "en") {
    return {
      addFriend: "Add friend",
      friendRequestSent: "Request sent",
      incomingRequest: "Request received",
      signInToAddFriend: "Sign in to add",
      alreadyFriend: "Friends",
      message: "Message",
    };
  }

  return {
    addFriend: "添加好友",
    friendRequestSent: "申请已发送",
    incomingRequest: "收到申请",
    signInToAddFriend: "登录后添加",
    alreadyFriend: "已是好友",
    message: "发消息",
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
  const signInHref = getSignInHref(locale, redirectPath);
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
  const actionCopy = getProfileSocialActionCopy(locale);

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
      <div className="grid gap-2">
        <FriendAction
          isAuthenticated={isAuthenticated}
          locale={locale}
          profileId={profileId}
          relationship={relationship}
        />
      </div>
      <StartDirectConversationButton
        buttonClassName="h-10 w-full bg-white/72 px-4 text-[#156240] shadow-none ring-1 ring-[#8AB68E] hover:bg-white hover:text-[#111210]"
        className="min-w-0"
        errorClassName="px-1"
        label={actionCopy.message}
        locale={locale}
        peerProfileId={profileId}
        redirectPath={redirectPath}
      />
      <ReportDialog
        className="h-10 bg-white/65 px-3 text-xs text-zinc-600 ring-[#D6D5B2] hover:bg-white"
        isAuthenticated={isAuthenticated}
        locale={locale}
        redirectPath={redirectPath}
        targetId={profileId}
        targetType="USER_PROFILE"
        variant="button"
      />
    </div>
  );
}
