"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  UserPlus,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  sendFriendRequestToProfileAction,
  type FriendActionState,
} from "@/features/friends/actions/friendActions";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { getFollowCopy } from "@/features/follow/copy";
import { getSignInHref } from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";

type UserPreviewPayload = {
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  id: string;
  isSelf: boolean;
  nickname: string;
  relationship: {
    friendshipId: string | null;
    isFriend: boolean;
    isFollowing: boolean;
    pendingFriendRequest: "received" | "sent" | null;
  };
};

type UserProfilePreviewPopoverContentProps = {
  avatarUrl: string | null;
  isAuthenticated: boolean;
  isGuest?: boolean;
  locale: string;
  nickname: string;
  profileId: string;
  redirectPath: string;
};

const initialFriendActionState: FriendActionState = {};
const fallbackRelationship: UserPreviewPayload["relationship"] = {
  friendshipId: null,
  isFriend: false,
  isFollowing: false,
  pendingFriendRequest: null,
};
const userPreviewCache = new Map<string, UserPreviewPayload | null>();

function updateCachedPreview(
  profileId: string,
  updater: (current: UserPreviewPayload) => UserPreviewPayload,
) {
  const current = userPreviewCache.get(profileId);

  if (!current) {
    return;
  }

  userPreviewCache.set(profileId, updater(current));
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "N";
}

function getPreviewCopy(locale: string) {
  if (locale === "fr") {
    return {
      addFriend: "Ajouter",
      alreadyFriends: "Deja ami",
      emptyBio: "Pas encore de presentation.",
      failed: "Echec du chargement.",
      followingCount: "Abonnements",
      guestNotice: "Cet utilisateur est encore visiteur.",
      openProfile: "Profil",
      pendingFriendRequest: "En attente",
      requestReceived: "Voir",
      sending: "Envoi...",
      selfNotice: "C'est votre profil.",
    };
  }

  if (locale === "en") {
    return {
      addFriend: "Add friend",
      alreadyFriends: "Friends",
      emptyBio: "No bio yet.",
      failed: "Failed to load.",
      followingCount: "Following",
      guestNotice: "This user is still a guest.",
      openProfile: "Profile",
      pendingFriendRequest: "Pending",
      requestReceived: "Review",
      sending: "Sending...",
      selfNotice: "This is you.",
    };
  }

  return {
    addFriend: "加好友",
    alreadyFriends: "已经是好友",
    emptyBio: "这个人还没有写简介。",
    failed: "加载失败。",
    followingCount: "关注",
    guestNotice: "该用户还是游客哦",
    openProfile: "主页",
    pendingFriendRequest: "已申请",
    requestReceived: "查看申请",
    sending: "发送中...",
    selfNotice: "这是你自己。",
  };
}

function AddFriendQuickButton({
  isAuthenticated,
  locale,
  profileId,
  redirectPath,
  relationship,
}: {
  isAuthenticated: boolean;
  locale: string;
  profileId: string;
  redirectPath: string;
  relationship: UserPreviewPayload["relationship"];
}) {
  const previewCopy = getPreviewCopy(locale);
  const [state, formAction] = useActionState(
    sendFriendRequestToProfileAction,
    initialFriendActionState,
  );
  const [isOptimisticPending, setIsOptimisticPending] = useState(false);

  useEffect(() => {
    if (relationship.isFriend) {
      setIsOptimisticPending(false);
      return;
    }

    if (state.code === "pending_exists") {
      setIsOptimisticPending(true);
      return;
    }

    if (state.formError) {
      setIsOptimisticPending(false);
      return;
    }

    if (state.ok) {
      setIsOptimisticPending(true);
    }
  }, [relationship.isFriend, state.code, state.formError, state.ok]);

  if (!isAuthenticated) {
    return (
      <Link href={getSignInHref(locale, redirectPath)}>
        <Button
          className="!h-5 !min-h-5 !w-[5.5rem] rounded-full border border-[#d69791] bg-[#f2c4bf] !px-2 !text-[9px] font-semibold text-[#6b3634] hover:bg-[#f6cfca]"
          variant="secondary"
        >
          <UserPlus className="h-3 w-3 shrink-0" />
          {previewCopy.addFriend}
        </Button>
      </Link>
    );
  }

  if (relationship.isFriend) {
    return (
      <div className="inline-flex h-5 w-[5.5rem] items-center justify-center gap-1 rounded-full bg-[#e4f2e7] px-2 text-[9px] font-semibold leading-none text-[#3f7a50] ring-1 ring-[#bfdcc7]">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {previewCopy.alreadyFriends}
      </div>
    );
  }

  if (
    relationship.pendingFriendRequest === "sent" ||
    state.ok ||
    state.code === "pending_exists" ||
    isOptimisticPending
  ) {
    return (
      <div className="inline-flex h-5 w-[5.5rem] items-center justify-center gap-1 rounded-full bg-[#e4f2e7] px-2 text-[9px] font-semibold leading-none text-[#3f7a50] ring-1 ring-[#bfdcc7]">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {previewCopy.pendingFriendRequest}
      </div>
    );
  }

  if (relationship.pendingFriendRequest === "received") {
    return (
      <Link href={withLocale(locale, "/friends")}>
        <Button
          className="!h-5 !min-h-5 !w-[5.5rem] rounded-full border border-[#d8cfd4] bg-[#f4eef2] !px-2 !text-[9px] font-semibold text-[#6d5763] hover:bg-[#faf5f8]"
          variant="secondary"
        >
          {previewCopy.requestReceived}
        </Button>
      </Link>
    );
  }

  return (
    <form
      action={formAction}
      className="inline-grid gap-1 justify-items-center"
      onSubmit={() => {
        setIsOptimisticPending(true);
      }}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="targetProfileId" type="hidden" value={profileId} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      <input name="returnTo" type="hidden" value="friends" />
      <FriendSubmitButton locale={locale} />
      {state.formError ? (
        <p className="text-[11px] leading-4 text-red-600">{state.formError}</p>
      ) : null}
    </form>
  );
}

function FriendSubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const previewCopy = getPreviewCopy(locale);

  return (
    <Button
      className="!h-5 !min-h-5 !w-[5.5rem] rounded-full border border-[#d69791] bg-[#f2c4bf] !px-2 !text-[9px] font-semibold text-[#6b3634] hover:bg-[#f6cfca]"
      type="submit"
    >
      {pending ? (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none">
          <Loader2 className="h-3 w-3 animate-spin" />
          {previewCopy.sending}
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none">
          <UserPlus className="h-3 w-3 shrink-0" />
          {previewCopy.addFriend}
        </span>
      )}
    </Button>
  );
}

export function UserProfilePreviewPopoverContent({
  avatarUrl,
  isAuthenticated,
  isGuest = false,
  locale,
  nickname,
  profileId,
  redirectPath,
}: UserProfilePreviewPopoverContentProps) {
  const [data, setData] = useState<UserPreviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"load_failed" | "not_found" | null>(
    null,
  );
  const previewCopy = getPreviewCopy(locale);
  const followCopy = getFollowCopy(locale);
  const resolvedNickname = data?.nickname ?? nickname;
  const resolvedAvatarUrl = data?.avatarUrl ?? avatarUrl;
  const resolvedBio = data?.bio?.trim() || previewCopy.emptyBio;
  const isSelf = Boolean(data?.isSelf);
  const relationship = data?.relationship ?? fallbackRelationship;
  const showStats = !errorType;
  const showBio = errorType !== "not_found";
  const showProfileLink =
    !isLoading && Boolean(profileId) && !isGuest && errorType !== "not_found";
  const showActionButtons =
    !isLoading && !isSelf && errorType !== "not_found";

  function handleFollowStateChange(nextIsFollowing: boolean) {
    setData((current) => {
      if (!current) {
        return current;
      }

      const previousIsFollowing = current.relationship.isFollowing;

      if (previousIsFollowing === nextIsFollowing) {
        return current;
      }

      const nextFollowingCount = Math.max(
        0,
        current.followingCount + (nextIsFollowing ? 1 : -1),
      );
      const nextValue = {
        ...current,
        followingCount: nextFollowingCount,
        relationship: {
          ...current.relationship,
          isFollowing: nextIsFollowing,
        },
      };

      updateCachedPreview(profileId, () => nextValue);
      return nextValue;
    });
  }

  useEffect(() => {
    if (isGuest || !profileId) {
      setData(null);
      setIsLoading(false);
      setErrorType("not_found");
      return;
    }

    const cachedPreview = userPreviewCache.get(profileId);

    if (cachedPreview !== undefined) {
      setData(cachedPreview);
      setIsLoading(false);
      setErrorType(cachedPreview ? null : "not_found");
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorType(null);

    fetch(`/api/user-preview/${encodeURIComponent(profileId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("NOT_FOUND");
          }

          throw new Error("LOAD_FAILED");
        }

        const payload = (await response.json()) as UserPreviewPayload;
        userPreviewCache.set(profileId, payload);
        setData(payload);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }

        if ((fetchError as Error).message === "NOT_FOUND") {
          userPreviewCache.set(profileId, null);
          setErrorType("not_found");
          return;
        }

        setErrorType("load_failed");
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [isGuest, profileId]);

  return (
    <div className="w-full rounded-2xl border border-[#d5dce8] bg-[linear-gradient(160deg,#fefeff_0%,#f5f8fc_52%,#edf2f8_100%)] p-3 shadow-[0_18px_36px_rgba(57,73,96,0.16)] backdrop-blur">
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf2f7] text-sm font-semibold text-[#4a5f79] ring-1 ring-[#d7deea]">
            {resolvedAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedAvatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              getInitial(resolvedNickname)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#213041]">
              {resolvedNickname}
            </p>
            {showStats ? (
              <div className="mt-1 flex min-h-6 flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-2 py-1 text-[10px] font-semibold text-[#536579] ring-1 ring-[#dde4ee]">
                  <Users className="h-3 w-3" />
                  {isLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  ) : data ? (
                    <span>
                      {followCopy.followers} {data.followerCount}
                    </span>
                  ) : (
                    <span>{followCopy.followers} --</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e9eef8] px-2 py-1 text-[10px] font-semibold text-[#586985] ring-1 ring-[#d8e0ee]">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  ) : data ? (
                    <span>
                      {previewCopy.followingCount} {data.followingCount}
                    </span>
                  ) : (
                    <span>{previewCopy.followingCount} --</span>
                  )}
                </span>
              </div>
            ) : null}
            {showBio ? (
              <p className="mt-2 text-[11px] leading-5 text-[#667589]">
                {resolvedBio}
              </p>
            ) : null}
          </div>
        </div>

        {showProfileLink ? (
          <Link
            className="inline-flex h-6 w-full items-center justify-center gap-1 rounded-full border border-[#d7dfeb] bg-white px-2 text-[10px] font-semibold text-[#4f6077] transition hover:bg-[#f8fbff]"
            href={withLocale(locale, `/profile/${profileId}`)}
            prefetch={false}
          >
            <ExternalLink className="h-3 w-3" />
            {previewCopy.openProfile}
          </Link>
        ) : null}

        {isSelf ? (
          <p className="rounded-xl bg-[#eef2f7] px-3 py-2 text-center text-[10px] font-medium text-[#5c6d82] ring-1 ring-[#dde5ef]">
            {previewCopy.selfNotice}
          </p>
        ) : null}

        {errorType ? (
          <p className="rounded-xl bg-[#ffe3df] px-3 py-2 text-center text-[10px] font-semibold text-[#a33f3b] ring-1 ring-[#f2b8b1]">
            {errorType === "not_found"
              ? previewCopy.guestNotice
              : previewCopy.failed}
          </p>
        ) : null}

        {showActionButtons ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FollowButton
              buttonClassName="!h-5 !min-h-5 !w-[5.5rem] rounded-full border border-[#bfd7d1] bg-[#dff3ed] !px-2 !text-[9px] font-semibold text-[#2f6f64] hover:bg-[#eaf9f5]"
              activeButtonClassName="!h-5 !min-h-5 !w-[5.5rem] rounded-full border border-[#e7b5b0] bg-[#f8d8d4] !px-2 !text-[9px] font-semibold text-[#a34b45] hover:bg-[#fbe4e1]"
              activeLabel={followCopy.unfollow}
              fullWidth={false}
              icon={UserRoundPlus}
              isAuthenticated={isAuthenticated}
              isFollowing={relationship.isFollowing}
              locale={locale}
              onStateChange={handleFollowStateChange}
              redirectPath={redirectPath}
              targetUserProfileId={profileId}
            />
            <AddFriendQuickButton
              isAuthenticated={isAuthenticated}
              locale={locale}
              profileId={profileId}
              redirectPath={redirectPath}
              relationship={relationship}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
