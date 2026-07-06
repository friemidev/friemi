"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  sendFriendRequestToProfileAction,
  type FriendActionState,
} from "@/features/friends/actions/friendActions";
import { getSignInHref } from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";

type UserPreviewPayload = {
  avatarUrl: string | null;
  bio: string | null;
  id: string;
  isCoCreator: boolean;
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

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "N";
}

function getPreviewCopy(locale: string) {
  if (locale === "fr") {
    return {
      addFriend: "Ajouter",
      alreadyFriends: "Déjà ami",
      emptyBio: "Pas encore de présentation.",
      failed: "Échec du chargement.",
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
      <Link className="block min-w-0" href={getSignInHref(locale, redirectPath)}>
        <Button
          className="!h-7 !min-h-7 w-full min-w-0 rounded-full border border-[#F09182]/70 bg-[#F09182] !px-2 !text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(240,145,130,0.18)] hover:bg-[#E98272]"
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
      <div className="inline-flex h-7 w-full min-w-0 items-center justify-center gap-1 rounded-full bg-[#F1F2EC] px-2 text-[11px] font-semibold leading-none text-[#156240] ring-1 ring-[#8AB68E]/80">
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
      <div className="inline-flex h-7 w-full min-w-0 items-center justify-center gap-1 rounded-full bg-[#F1F2EC] px-2 text-[11px] font-semibold leading-none text-[#156240] ring-1 ring-[#8AB68E]/80">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {previewCopy.pendingFriendRequest}
      </div>
    );
  }

  if (relationship.pendingFriendRequest === "received") {
    return (
      <Link className="block min-w-0" href={withLocale(locale, "/friends")}>
        <Button
          className="!h-7 !min-h-7 w-full min-w-0 rounded-full border border-[#D6D5B2] bg-[#FFF5E6] !px-2 !text-[11px] font-semibold text-[#156240] hover:bg-white"
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
      className="inline-grid w-full min-w-0 gap-1 justify-items-center"
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
      className="!h-7 !min-h-7 w-full min-w-0 rounded-full border border-[#F09182]/70 bg-[#F09182] !px-2 !text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(240,145,130,0.18)] hover:bg-[#E98272]"
      type="submit"
    >
      {pending ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap leading-none">
          <Loader2 className="h-3 w-3 animate-spin" />
          {previewCopy.sending}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-nowrap leading-none">
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
  const resolvedNickname = data?.nickname ?? nickname;
  const resolvedAvatarUrl = data?.avatarUrl ?? avatarUrl;
  const resolvedBio = data?.bio?.trim() || previewCopy.emptyBio;
  const isCoCreator = Boolean(data?.isCoCreator);
  const isSelf = Boolean(data?.isSelf);
  const relationship = data?.relationship ?? fallbackRelationship;
  const showBio = errorType !== "not_found";
  const showProfileLink =
    !isLoading && Boolean(profileId) && !isGuest && errorType !== "not_found";
  const showActionButtons =
    !isLoading && !isSelf && errorType !== "not_found";

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
    <div className="w-full overflow-hidden rounded-[1.35rem] border border-[#8AB68E]/45 bg-[linear-gradient(155deg,#FEFFF9_0%,#F1F2EC_62%,#FFF5E6_100%)] p-3.5 shadow-[0_18px_42px_rgba(21,98,64,0.16)] ring-1 ring-white/70 backdrop-blur">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F09182] text-sm font-semibold text-white shadow-[0_10px_20px_rgba(21,98,64,0.12)] ring-2 ring-[#FEFFF9]">
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
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-[#1D1D1B]">
                {resolvedNickname}
              </p>
              {isCoCreator ? (
                <CoCreatorIdentityBadge locale={locale} variant="icon" />
              ) : null}
            </div>
            {showBio ? (
              <p className="mt-2 text-[11px] leading-5 text-[#156240]/70">
                {resolvedBio}
              </p>
            ) : null}
          </div>
        </div>

        {showProfileLink || showActionButtons ? (
          <div
            className={
              showProfileLink && showActionButtons
                ? "grid grid-cols-2 gap-2"
                : "grid gap-2"
            }
          >
            {showProfileLink ? (
              <Link
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full border border-[#D6D5B2]/80 bg-white/88 px-2 text-[11px] font-semibold text-[#156240] transition hover:bg-[#FFF5E6]"
                href={withLocale(locale, `/profile/${profileId}`)}
                prefetch={false}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{previewCopy.openProfile}</span>
              </Link>
            ) : null}
            {showActionButtons ? (
              <AddFriendQuickButton
                isAuthenticated={isAuthenticated}
                locale={locale}
                profileId={profileId}
                redirectPath={redirectPath}
                relationship={relationship}
              />
            ) : null}
          </div>
        ) : null}

        {isSelf ? (
          <p className="rounded-xl bg-[#F1F2EC]/82 px-3 py-2 text-center text-[10px] font-medium text-[#156240]/70 ring-1 ring-[#D6D5B2]/70">
            {previewCopy.selfNotice}
          </p>
        ) : null}

        {errorType ? (
          <p className="rounded-xl bg-[#FFF5E6] px-3 py-2 text-center text-[10px] font-semibold text-[#B5301F] ring-1 ring-[#F09182]/40">
            {errorType === "not_found"
              ? previewCopy.guestNotice
              : previewCopy.failed}
          </p>
        ) : null}

      </div>
    </div>
  );
}
