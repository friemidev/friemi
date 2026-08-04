"use client";

import Link from "next/link";
import { Button } from "@chill-club/ui";
import { Heart, UserPlus } from "lucide-react";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import { getSignInHref } from "@/lib/auth-redirect";
import type { ProfileViewerRelationshipViewModel } from "../queries/getProfileDashboard";

type ProfileSocialActionsProps = {
  isAuthenticated: boolean;
  locale: string;
  profileId: string;
  relationship: ProfileViewerRelationshipViewModel;
};

function getProfileSocialActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      follow: "Suivre",
      followed: "Suivi",
      mutual: "Mutuel",
      followBack: "Suivre aussi",
      signInToFollow: "Connexion",
      message: "Message",
      unfollowCancel: "Annuler",
      unfollowConfirm: "Confirmer",
      unfollowDescription: "Vous ne serez plus en suivi mutuel.",
      unfollowTitle: "Ne plus suivre ?",
    };
  }

  if (locale === "en") {
    return {
      follow: "Follow",
      followed: "Following",
      mutual: "Mutual",
      followBack: "Follow back",
      signInToFollow: "Sign in",
      message: "Message",
      unfollowCancel: "Cancel",
      unfollowConfirm: "Unfollow",
      unfollowDescription: "You will no longer follow each other.",
      unfollowTitle: "Unfollow this user?",
    };
  }

  return {
    follow: "关注",
    followed: "已关注",
    mutual: "互相关注",
    followBack: "回关",
    signInToFollow: "登录后关注",
    message: "发消息",
    unfollowCancel: "暂不取消",
    unfollowConfirm: "确认取消",
    unfollowDescription: "取消后，你们将不再是互相关注。",
    unfollowTitle: "确认取消关注？",
  };
}

function FriendAction({
  isAuthenticated,
  locale,
  profileId,
  relationship,
}: ProfileSocialActionsProps) {
  const actionCopy = getProfileSocialActionCopy(locale);
  const redirectPath = `/profile/${profileId}`;
  const signInHref = getSignInHref(locale, redirectPath);

  if (!isAuthenticated) {
    return (
      <Link className="block" href={signInHref}>
        <Button
          className="h-10 w-full rounded-full px-4 text-sm"
          variant="secondary"
        >
          <UserPlus className="h-4 w-4" />
          {actionCopy.signInToFollow}
        </Button>
      </Link>
    );
  }

  const activeLabel = relationship.targetFollowsViewer
    ? actionCopy.mutual
    : actionCopy.followed;
  const inactiveLabel = relationship.targetFollowsViewer
    ? actionCopy.followBack
    : actionCopy.follow;

  return (
    <FollowButton
      activeButtonClassName="h-10 w-full rounded-full bg-white px-4 text-sm text-[#156240] shadow-none ring-1 ring-[#8AB68E]"
      activeLabel={activeLabel}
      buttonClassName="h-10 w-full rounded-full px-4 text-sm"
      icon={relationship.targetFollowsViewer ? Heart : UserPlus}
      inactiveLabel={inactiveLabel}
      isAuthenticated={isAuthenticated}
      isFollowing={relationship.isFollowing}
      locale={locale}
      redirectPath={redirectPath}
      targetUserProfileId={profileId}
      unfollowConfirm={{
        cancelLabel: actionCopy.unfollowCancel,
        confirmLabel: actionCopy.unfollowConfirm,
        description: actionCopy.unfollowDescription,
        title: actionCopy.unfollowTitle,
      }}
    />
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
