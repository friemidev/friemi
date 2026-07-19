"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode, TouchEvent } from "react";
import {
  useActionState,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { createPortal, useFormStatus } from "react-dom";
import { formatActivityDate } from "@chill-club/shared";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Globe2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Search,
  SendHorizontal,
  Share2,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import { getDirectMessagesCopy } from "@/features/direct-messages/copy";
import type { DirectMessageFriendRosterItemViewModel } from "@/features/direct-messages/queries/getDirectMessages";
import { AddFriendDialog } from "@/features/friends/components/FriendsDashboard";
import { PlanetSquarePage } from "@/features/planets/components/PlanetPages";
import type { getPlanetSquare } from "@/features/planets/queries/planetQueries";
import {
  createMomentAction,
  createMomentCommentAction,
  deleteMomentAction,
  deleteMomentCommentAction,
  repostMomentAction,
  toggleMomentLikeAction,
  type CreateMomentCommentState,
  type CreateMomentState,
} from "@/features/moments/actions/momentActions";
import type { MomentFeedItemViewModel } from "@/features/moments/queries/getMomentFeed";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { getSignInHref } from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FootprintsTab = "message" | "moment" | "planet";
type MomentFeedScope = "PUBLIC" | "FRIENDS";
type PlanetSquare = Awaited<ReturnType<typeof getPlanetSquare>>;

type FootprintsViewerProfile = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  friendCode: string | null;
  isCoCreator: boolean;
};

type FootprintsMobilePageProps = {
  initialTab?: FootprintsTab;
  locale: string;
  messageFriends: DirectMessageFriendRosterItemViewModel[];
  messageRosterError?: boolean;
  momentFeedError?: boolean;
  moments: MomentFeedItemViewModel[];
  canCreatePlanet: boolean;
  planets: PlanetSquare;
  planetSquareError?: boolean;
  profile: FootprintsViewerProfile | null;
};

type MomentCard = {
  author: string;
  time: string;
  text: string;
  image: string;
  imageAlt: string;
  likes: number;
  comments: number;
  accent: string;
};

const copyByLocale = {
  "zh-CN": {
    title: "足迹",
    settings: "设置",
    tabs: {
      message: "消息",
      moment: "朋友圈",
      planet: "星球",
    },
    composer: "分享此刻的心情或精彩瞬间...",
    addPhoto: "添加照片",
    composerTitle: "此刻想说什么？",
    composerSubmit: "发布",
    composerSubmitting: "发布中...",
    commentPlaceholder: "写评论...",
    commentSubmit: "发送",
    delete: "删除",
    detail: "详情",
    emptyFeedTitle: "还没有动态",
    emptyFeedDescription: "发一条足迹，或者添加好友后再回来看看。",
    feedError: "动态暂时加载失败，请稍后再试。",
    feedFriends: "好友",
    feedPublic: "公共",
    guestProfileDescription: "登录后可以管理头像、简介和好友码。",
    guestProfileTitle: "登录查看主页",
    guestMessageDescription: "登录后可以查看好友私聊和组局沟通。",
    guestMessageTitle: "登录查看消息",
    signIn: "登录",
    signInToInteract: "登录后互动",
    signInToPost: "登录后发布足迹",
    report: "举报",
    shareCopied: "链接已复制",
    shareFailed: "暂时无法分享",
    visibilityFriends: "好友可见",
    visibilityLabel: "发布范围",
    visibilityPublic: "公开",
    like: "点赞",
    comment: "评论",
    share: "分享链接",
    repost: "转发",
    commentSheetTitle: "评论",
    loadMoreComments: "查看全部评论",
    emptyComments: "还没有评论",
    originalMoment: "原足迹",
    originalUnavailable: "原足迹已不可见",
    viewOriginal: "查看原文",
    messageTitle: "消息",
    messageDescription: "好友私聊和组局沟通都在这里。",
    openMessages: "进入消息",
    notificationTitle: "通知",
    notificationDescription: "报名、评论和点赞提醒会汇总到通知中心。",
    openNotifications: "查看通知",
    profileTitle: "我的主页",
    profileDescription: "头像、简介和好友码仍在个人主页管理。",
    openProfile: "编辑主页",
    friendCode: "好友码",
    bioFallback: "还没有填写简介。",
    samples: [
      {
        author: "Chloe",
        time: "2小时前",
        text: "超棒的桌游之夜！认识了新朋友～",
        image: "/illustrations/png/board-games.png",
        imageAlt: "朋友围坐桌游",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "5小时前",
        text: "日落骑行，风景绝了 🌄",
        image: "/illustrations/png/travel.png",
        imageAlt: "朋友骑行出游",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
  en: {
    title: "Trace",
    settings: "Settings",
    tabs: {
      message: "Message",
      moment: "Moments",
      planet: "Planet",
    },
    composer: "Share a mood or a bright little moment...",
    addPhoto: "Add photo",
    composerTitle: "What's happening?",
    composerSubmit: "Post",
    composerSubmitting: "Posting...",
    commentPlaceholder: "Write a comment...",
    commentSubmit: "Send",
    delete: "Delete",
    detail: "Details",
    emptyFeedTitle: "No moments yet",
    emptyFeedDescription: "Post one, or come back after adding friends.",
    feedError: "Moments could not load. Try again later.",
    feedFriends: "Friends",
    feedPublic: "Public",
    guestProfileDescription:
      "Sign in to manage your avatar, bio, and friend code.",
    guestProfileTitle: "Sign in to view your profile",
    guestMessageDescription: "Sign in to see friend chats and plan messages.",
    guestMessageTitle: "Sign in to view messages",
    signIn: "Sign in",
    signInToInteract: "Sign in to interact",
    signInToPost: "Sign in to post",
    report: "Report",
    shareCopied: "Link copied",
    shareFailed: "Could not share",
    visibilityFriends: "Friends",
    visibilityLabel: "Audience",
    visibilityPublic: "Public",
    like: "Like",
    comment: "Comment",
    share: "Share link",
    repost: "Repost",
    commentSheetTitle: "Comments",
    loadMoreComments: "View all comments",
    emptyComments: "No comments yet",
    originalMoment: "Original moment",
    originalUnavailable: "Original moment is unavailable",
    viewOriginal: "View original",
    messageTitle: "Messages",
    messageDescription: "Friend chats and plan details stay here.",
    openMessages: "Open messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Comments, likes, joins, and approvals are grouped here.",
    openNotifications: "Open notifications",
    profileTitle: "Profile",
    profileDescription:
      "Manage your avatar, bio, and friend code from your profile.",
    openProfile: "Edit profile",
    friendCode: "Friend code",
    bioFallback: "No bio yet.",
    samples: [
      {
        author: "Chloe",
        time: "2h ago",
        text: "A perfect board game night. Met new friends.",
        image: "/illustrations/png/board-games.png",
        imageAlt: "Friends around a board game table",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "5h ago",
        text: "Sunset ride. Worth the climb.",
        image: "/illustrations/png/travel.png",
        imageAlt: "Friends cycling outdoors",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
  fr: {
    title: "Trace",
    settings: "Réglages",
    tabs: {
      message: "Message",
      moment: "Moments",
      planet: "Planète",
    },
    composer: "Partage une humeur ou un instant à garder...",
    addPhoto: "Ajouter une photo",
    composerTitle: "Quoi de neuf ?",
    composerSubmit: "Publier",
    composerSubmitting: "Publication...",
    commentPlaceholder: "Écrire un commentaire...",
    commentSubmit: "Envoyer",
    delete: "Supprimer",
    detail: "Détails",
    emptyFeedTitle: "Aucun moment pour l'instant",
    emptyFeedDescription:
      "Publiez un moment, ou revenez après avoir ajouté des amis.",
    feedError: "Les moments ne se chargent pas pour le moment.",
    feedFriends: "Amis",
    feedPublic: "Public",
    guestProfileDescription:
      "Connecte-toi pour gérer ton avatar, ta bio et ton code ami.",
    guestProfileTitle: "Connecte-toi pour voir ton profil",
    guestMessageDescription:
      "Connecte-toi pour voir tes discussions et messages de sorties.",
    guestMessageTitle: "Connecte-toi pour voir tes messages",
    signIn: "Connexion",
    signInToInteract: "Connecte-toi pour interagir",
    signInToPost: "Connecte-toi pour publier",
    report: "Signaler",
    shareCopied: "Lien copié",
    shareFailed: "Partage impossible",
    visibilityFriends: "Amis",
    visibilityLabel: "Audience",
    visibilityPublic: "Public",
    like: "J'aime",
    comment: "Commenter",
    share: "Partager le lien",
    repost: "Republier",
    commentSheetTitle: "Commentaires",
    loadMoreComments: "Voir tous les commentaires",
    emptyComments: "Aucun commentaire pour le moment",
    originalMoment: "Moment original",
    originalUnavailable: "Moment original indisponible",
    viewOriginal: "Voir l'original",
    messageTitle: "Messages",
    messageDescription:
      "Les échanges entre amis et autour des plans restent ici.",
    openMessages: "Ouvrir les messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Commentaires, likes, inscriptions et validations sont regroupés ici.",
    openNotifications: "Voir les notifications",
    profileTitle: "Profil",
    profileDescription:
      "Gérez votre avatar, bio et code ami depuis votre profil.",
    openProfile: "Modifier le profil",
    friendCode: "Code ami",
    bioFallback: "Aucune bio pour le moment.",
    samples: [
      {
        author: "Chloe",
        time: "il y a 2 h",
        text: "Super soirée jeux de société. De nouvelles rencontres.",
        image: "/illustrations/png/board-games.png",
        imageAlt: "Amis autour d'une table de jeu",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "il y a 5 h",
        text: "Balade au coucher du soleil, très beau moment.",
        image: "/illustrations/png/travel.png",
        imageAlt: "Amis à vélo",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
} as const;

export function getFootprintsCopy(locale: string) {
  if (locale === "en" || locale === "fr") {
    return copyByLocale[locale];
  }

  return copyByLocale["zh-CN"];
}

function ProfileAvatar({
  avatarUrl,
  name,
  className,
}: {
  avatarUrl: string | null;
  name: string;
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "F";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "h-11 w-11 rounded-full border border-[#FEFFF9] object-cover shadow-[0_6px_16px_rgba(21,98,64,0.14)]",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7457A] text-sm font-black text-white shadow-[0_6px_16px_rgba(21,98,64,0.14)]",
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function FeedCard({
  deleteRedirectPath,
  isAuthenticated,
  locale,
  moment,
  copy,
  viewerProfileId,
}: {
  deleteRedirectPath?: string;
  isAuthenticated: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  copy: ReturnType<typeof getFootprintsCopy>;
  viewerProfileId: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const detailHref = withLocale(locale, `/footprints/${moment.id}`);
  const signInHref = getSignInHref(locale, `/footprints/${moment.id}`);
  const isOwnMoment = viewerProfileId === moment.author.id;
  const hasImages = moment.images.length > 0;
  const canRepost =
    isAuthenticated &&
    (isOwnMoment ||
      moment.visibility === "PUBLIC" ||
      Boolean(moment.resharedMoment));
  const openDetail = () => router.push(detailHref);
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("a,button,input,textarea,select,form")
    ) {
      return;
    }

    openDetail();
  };
  const handleDetailKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };

  return (
    <>
      <article
        className={cn(
          "cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30",
          hasImages
            ? "bg-transparent pb-5"
            : "rounded-[1.35rem] border border-[#E3DCC5] bg-white shadow-[0_12px_34px_rgba(21,98,64,0.08)]",
        )}
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleDetailKeyDown}
      >
        <div>
          <div
            className={cn(
              "flex items-start gap-3",
              hasImages ? "px-0 pb-2 pt-1" : "px-4 pb-2 pt-4",
            )}
          >
            <Link
              href={withLocale(locale, `/profile/${moment.author.id}`)}
              className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              aria-label={moment.author.nickname}
            >
              <ProfileAvatar
                avatarUrl={moment.author.avatarUrl}
                name={moment.author.nickname}
                className={hasImages ? "h-10 w-10" : undefined}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black leading-5 text-[#111210]">
                    {moment.author.nickname}
                  </p>
                  <p className="text-xs font-semibold text-[#6C746A]">
                    {formatActivityDate(moment.createdAt, locale)}
                  </p>
                </div>
                <div
                  className="relative"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1D1D1B]/62 transition hover:bg-[#F1F2EC]"
                    aria-label="More"
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 top-10 z-20 min-w-36 overflow-hidden rounded-2xl border border-[#E3DCC5] bg-white py-1 text-sm font-black text-[#1D1D1B] shadow-[0_16px_40px_rgba(29,29,27,0.16)]">
                      <Link
                        className="flex items-center gap-2 px-3 py-2.5 transition hover:bg-[#F7F7F0]"
                        href={detailHref}
                      >
                        <Eye className="h-4 w-4" />
                        {copy.detail}
                      </Link>
                      <ShareMomentButton
                        className="w-full px-3 py-2.5 text-left hover:bg-[#F7F7F0]"
                        copy={copy}
                        href={detailHref}
                      />
                      {isOwnMoment ? (
                        <form action={deleteMomentAction}>
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="momentId"
                            type="hidden"
                            value={moment.id}
                          />
                          {deleteRedirectPath ? (
                            <input
                              name="redirectPath"
                              type="hidden"
                              value={deleteRedirectPath}
                            />
                          ) : null}
                          <button
                            type="submit"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#9A2135] transition hover:bg-[#FFF0F0]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {copy.delete}
                          </button>
                        </form>
                      ) : (
                        <ReportDialog
                          className="flex h-auto w-full justify-start gap-2 rounded-none bg-transparent px-3 py-2.5 text-sm font-black text-[#9A2135] ring-0 hover:bg-[#FFF0F0]"
                          isAuthenticated={isAuthenticated}
                          locale={locale}
                          redirectPath={`/footprints/${moment.id}`}
                          targetId={moment.id}
                          targetType="MOMENT"
                          variant="link"
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {!hasImages && moment.content ? (
                <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-[#1D1D1B]">
                  {moment.content}
                </p>
              ) : null}
            </div>
          </div>

          {moment.resharedMoment ? (
            <SharedMomentPreview
              copy={copy}
              locale={locale}
              moment={moment.resharedMoment}
            />
          ) : null}

          {moment.images.length > 0 ? (
            <MomentImageGrid
              images={moment.images}
              onImageClick={setPreviewIndex}
            />
          ) : null}

          {hasImages && moment.content ? (
            <p className="mt-3 whitespace-pre-wrap px-1 text-[14px] font-semibold leading-6 text-[#1D1D1B]">
              {moment.content}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "grid grid-cols-3 py-3 text-[#1D1D1B]/76",
            hasImages ? "px-0 pb-1 pt-2" : "px-4",
          )}
        >
          <OptimisticMomentLikeButton
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            moment={moment}
            signInHref={signInHref}
          />
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold"
            aria-label={copy.comment}
            onClick={() => setCommentsOpen(true)}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span>{moment.commentCount}</span>
          </button>
          <RepostMomentButton
            canRepost={canRepost}
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            moment={moment}
            signInHref={signInHref}
          />
        </div>

        {moment.recentComments.length > 0 ? (
          <button
            type="button"
            className={cn(
              "mb-3 block rounded-2xl bg-[#F7F7F0] px-3 py-2 text-left transition hover:bg-[#F1F2EC]",
              hasImages ? "w-full" : "mx-4 w-[calc(100%-2rem)]",
            )}
            onClick={() => setCommentsOpen(true)}
          >
            {moment.recentComments.slice(0, 2).map((comment) => (
              <span
                key={comment.id}
                className="block truncate text-[12px] font-semibold leading-5 text-[#1D1D1B]/78"
              >
                <span className="font-black text-[#156240]">
                  {comment.author.nickname}
                </span>
                <span className="mx-1">:</span>
                {comment.content}
              </span>
            ))}
            {moment.commentCount > 2 ? (
              <span className="mt-1 block text-[12px] font-black text-[#156240]">
                {copy.loadMoreComments}
              </span>
            ) : null}
          </button>
        ) : null}
      </article>

      {commentsOpen ? (
        <MomentCommentSheet
          copy={copy}
          isOwnMoment={isOwnMoment}
          isAuthenticated={isAuthenticated}
          locale={locale}
          moment={moment}
          onClose={() => setCommentsOpen(false)}
          viewerProfileId={viewerProfileId}
        />
      ) : null}

      {previewIndex !== null ? (
        <MomentImagePreview
          images={moment.images}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
    </>
  );
}

export function MomentDetailContent({
  deleteRedirectPath,
  isAuthenticated,
  locale,
  moment,
  copy,
  viewerProfileId,
}: {
  deleteRedirectPath?: string;
  isAuthenticated: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  copy: ReturnType<typeof getFootprintsCopy>;
  viewerProfileId: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const detailHref = withLocale(locale, `/footprints/${moment.id}`);
  const signInHref = getSignInHref(locale, `/footprints/${moment.id}`);
  const isOwnMoment = viewerProfileId === moment.author.id;
  const canRepost =
    isAuthenticated &&
    (isOwnMoment ||
      moment.visibility === "PUBLIC" ||
      Boolean(moment.resharedMoment));

  return (
    <>
      <article className="pb-5">
        <header className="flex items-start gap-3">
          <Link
            href={withLocale(locale, `/profile/${moment.author.id}`)}
            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35"
            aria-label={moment.author.nickname}
          >
            <ProfileAvatar
              avatarUrl={moment.author.avatarUrl}
              name={moment.author.nickname}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-black leading-5 text-[#111210]">
              {moment.author.nickname}
            </p>
            <p className="text-xs font-semibold text-[#6C746A]">
              {formatActivityDate(moment.createdAt, locale)}
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1D1D1B]/70 transition hover:bg-[#F1F2EC]"
              aria-label="More"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-20 min-w-36 overflow-hidden rounded-2xl border border-[#E3DCC5] bg-white py-1 text-sm font-black text-[#1D1D1B] shadow-[0_16px_40px_rgba(29,29,27,0.16)]">
                <ShareMomentButton
                  className="w-full px-3 py-2.5 text-left hover:bg-[#F7F7F0]"
                  copy={copy}
                  href={detailHref}
                />
                {isOwnMoment ? (
                  <form action={deleteMomentAction}>
                    <input name="locale" type="hidden" value={locale} />
                    <input name="momentId" type="hidden" value={moment.id} />
                    {deleteRedirectPath ? (
                      <input
                        name="redirectPath"
                        type="hidden"
                        value={deleteRedirectPath}
                      />
                    ) : null}
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#9A2135] transition hover:bg-[#FFF0F0]"
                    >
                      <Trash2 className="h-4 w-4" />
                      {copy.delete}
                    </button>
                  </form>
                ) : (
                  <ReportDialog
                    className="flex h-auto w-full justify-start gap-2 rounded-none bg-transparent px-3 py-2.5 text-sm font-black text-[#9A2135] ring-0 hover:bg-[#FFF0F0]"
                    isAuthenticated={isAuthenticated}
                    locale={locale}
                    redirectPath={`/footprints/${moment.id}`}
                    targetId={moment.id}
                    targetType="MOMENT"
                    variant="link"
                  />
                )}
              </div>
            ) : null}
          </div>
        </header>

        {moment.content ? (
          <p className="mt-4 whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-[#111210]">
            {moment.content}
          </p>
        ) : null}

        {moment.resharedMoment ? (
          <SharedMomentPreview
            className="mx-0 mb-0 mt-4 rounded-[1.15rem]"
            copy={copy}
            locale={locale}
            moment={moment.resharedMoment}
          />
        ) : null}

        {moment.images.length > 0 ? (
          <div className="mt-4">
            <MomentImageGrid
              images={moment.images}
              onImageClick={setPreviewIndex}
            />
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 border-y border-[#E8E4D4] py-3 text-[#1D1D1B]/76">
          <OptimisticMomentLikeButton
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            moment={moment}
            signInHref={signInHref}
          />
          <a
            href="#moment-comments"
            className="inline-flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold"
            aria-label={copy.comment}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span>{moment.commentCount}</span>
          </a>
          <RepostMomentButton
            canRepost={canRepost}
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            moment={moment}
            signInHref={signInHref}
          />
        </div>
      </article>

      <section id="moment-comments" className="border-t border-[#E8E4D4] pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-black leading-none text-[#111210]">
            {copy.commentSheetTitle}
          </h2>
          <span className="rounded-full bg-[#F3F8EB] px-2.5 py-1 text-xs font-black text-[#156240]">
            {moment.commentCount}
          </span>
        </div>

        {moment.recentComments.length > 0 ? (
          <div className="space-y-4">
            {moment.recentComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <ProfileAvatar
                  avatarUrl={comment.author.avatarUrl}
                  name={comment.author.nickname}
                  className="h-9 w-9 text-[12px]"
                />
                <div className="min-w-0 flex-1 border-b border-[#E8E4D4]/72 pb-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[13px] font-black text-[#111210]">
                      {comment.author.nickname}
                    </p>
                    <span className="shrink-0 text-[11px] font-semibold text-[#A49A8E]">
                      {formatActivityDate(comment.createdAt, locale)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[14px] font-semibold leading-6 text-[#1D1D1B]/84">
                    {comment.content}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <MomentCommentInlineAction
                      commentId={comment.id}
                      copy={copy}
                      isAuthenticated={isAuthenticated}
                      isDeletable={
                        comment.author.id === viewerProfileId || isOwnMoment
                      }
                      locale={locale}
                      momentId={moment.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.15rem] border border-[#E3DCC5] bg-white/72 px-4 py-7 text-center">
            <p className="text-sm font-black text-[#111210]">
              {copy.emptyComments}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#8E8383]">
              {copy.commentPlaceholder}
            </p>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-[#E3DCC5] bg-white">
          {isAuthenticated ? (
            <MomentCommentForm
              copy={copy}
              locale={locale}
              momentId={moment.id}
            />
          ) : (
            <div className="bg-white/88 px-4 py-3">
              <Link
                href={signInHref}
                className="flex h-11 items-center justify-center rounded-full bg-[#156240] px-4 text-sm font-black text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)]"
              >
                {copy.signInToInteract}
              </Link>
            </div>
          )}
        </div>
      </section>

      {previewIndex !== null ? (
        <MomentImagePreview
          images={moment.images}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
    </>
  );
}

function OptimisticMomentLikeButton({
  copy,
  isAuthenticated,
  locale,
  moment,
  signInHref,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  signInHref: string;
}) {
  const [optimisticLike, toggleOptimisticLike] = useOptimistic(
    {
      count: moment.likeCount,
      isLiked: moment.isLikedByViewer,
    },
    (current, _action: null) => ({
      count: Math.max(0, current.count + (current.isLiked ? -1 : 1)),
      isLiked: !current.isLiked,
    }),
  );

  const content = (
    <>
      <Heart
        className={cn(
          "h-[18px] w-[18px]",
          optimisticLike.isLiked ? "fill-current" : null,
        )}
      />
      <span>{optimisticLike.count}</span>
    </>
  );

  if (!isAuthenticated) {
    return (
      <Link
        href={signInHref}
        className="inline-flex items-center gap-2 rounded-full py-2 text-sm font-bold"
        aria-label={copy.signInToInteract}
      >
        {content}
      </Link>
    );
  }

  return (
    <form
      action={async (formData) => {
        toggleOptimisticLike(null);
        await toggleMomentLikeAction(formData);
      }}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="momentId" type="hidden" value={moment.id} />
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 rounded-full py-2 text-sm font-bold",
          optimisticLike.isLiked ? "text-[#E7457A]" : null,
        )}
        aria-label={copy.like}
      >
        {content}
      </button>
    </form>
  );
}

function RepostMomentButton({
  canRepost,
  copy,
  isAuthenticated,
  locale,
  moment,
  signInHref,
}: {
  canRepost: boolean;
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  signInHref: string;
}) {
  const [optimisticCount, addOptimisticRepost] = useOptimistic(
    moment.repostCount,
    (current, _action: null) => current + 1,
  );

  const content = (
    <>
      <Repeat2 className="h-[18px] w-[18px]" />
      <span>{optimisticCount}</span>
    </>
  );

  if (!isAuthenticated) {
    return (
      <Link
        href={signInHref}
        className="ml-auto inline-flex items-center justify-end gap-2 rounded-full py-2 text-sm font-bold"
        aria-label={copy.signInToInteract}
      >
        {content}
      </Link>
    );
  }

  return (
    <form
      action={async (formData) => {
        if (!canRepost) {
          return;
        }

        addOptimisticRepost(null);
        await repostMomentAction(formData);
      }}
      className="flex justify-end"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="momentId" type="hidden" value={moment.id} />
      <RepostMomentSubmitButton
        canRepost={canRepost}
        label={copy.repost}
        content={content}
      />
    </form>
  );
}

function RepostMomentSubmitButton({
  canRepost,
  content,
  label,
}: {
  canRepost: boolean;
  content: ReactNode;
  label: string;
}) {
  const { pending } = useFormStatus();
  const disabled = !canRepost || pending;

  return (
    <button
      type="submit"
      className={cn(
        "inline-flex items-center justify-end gap-2 rounded-full py-2 text-sm font-bold",
        disabled && "cursor-not-allowed opacity-35",
      )}
      disabled={disabled}
      aria-label={label}
    >
      {content}
    </button>
  );
}

function SharedMomentPreview({
  className,
  copy,
  locale,
  moment,
}: {
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  moment: NonNullable<MomentFeedItemViewModel["resharedMoment"]>;
}) {
  return (
    <Link
      href={withLocale(locale, `/footprints/${moment.id}`)}
      className={cn(
        "mx-4 mb-3 flex gap-3 rounded-[1rem] bg-[#F7F7F0] p-3 transition hover:bg-[#F1F2EC]",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {moment.image ? (
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F7EDE6]">
          {/* Public moment images may come from Supabase storage domains. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={moment.image.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black text-[#156240]">
          {copy.originalMoment} · {moment.author.nickname}
        </span>
        <span className="mt-1 line-clamp-2 block text-[13px] font-semibold leading-5 text-[#1D1D1B]/82">
          {moment.content || copy.viewOriginal}
        </span>
      </span>
      <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-[#1D1D1B]/42" />
    </Link>
  );
}

function MomentCommentSheet({
  copy,
  isAuthenticated,
  isOwnMoment,
  locale,
  moment,
  onClose,
  viewerProfileId,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  isOwnMoment: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  onClose: () => void;
  viewerProfileId: string | null;
}) {
  const hasMore = moment.commentCount > moment.recentComments.length;
  const signInHref = getSignInHref(locale, `/footprints/${moment.id}`);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#1D1D1B]/24">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-t-[1.65rem] bg-[#FEFFF9] shadow-[0_-18px_48px_rgba(29,29,27,0.18)]">
        <header className="px-4 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D4BE]" />
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-black text-[#111210]">
              {copy.commentSheetTitle}
              <span className="ml-1 text-xs font-bold text-[#8E8383]">
                {moment.commentCount}
              </span>
            </h2>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F7F0] text-[#1D1D1B]/72"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-3 pt-1">
          {moment.recentComments.length > 0 ? (
            <div className="space-y-4">
              {moment.recentComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <ProfileAvatar
                    avatarUrl={comment.author.avatarUrl}
                    name={comment.author.nickname}
                    className="h-8 w-8 text-[11px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-black text-[#111210]">
                        {comment.author.nickname}
                      </p>
                      <span className="shrink-0 text-[11px] font-semibold text-[#A49A8E]">
                        {formatActivityDate(comment.createdAt, locale)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] font-semibold leading-5 text-[#1D1D1B]/82">
                      {comment.content}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <MomentCommentInlineAction
                        commentId={comment.id}
                        copy={copy}
                        isAuthenticated={isAuthenticated}
                        isDeletable={
                          comment.author.id === viewerProfileId || isOwnMoment
                        }
                        locale={locale}
                        momentId={moment.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-semibold text-[#8E8383]">
              {copy.commentPlaceholder}
            </p>
          )}
          {hasMore ? (
            <Link
              href={withLocale(locale, `/footprints/${moment.id}`)}
              className="mx-auto mt-5 flex h-9 w-fit items-center justify-center rounded-full bg-[#F7F7F0] px-4 text-xs font-black text-[#156240]"
            >
              {copy.loadMoreComments}
            </Link>
          ) : null}
        </div>
        {isAuthenticated ? (
          <MomentCommentForm copy={copy} locale={locale} momentId={moment.id} />
        ) : (
          <div className="border-t border-[#E8E4D4]/70 bg-white/88 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Link
              href={signInHref}
              className="flex h-11 items-center justify-center rounded-full bg-[#156240] px-4 text-sm font-black text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)]"
            >
              {copy.signInToInteract}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function MomentImageGrid({
  images,
  onImageClick,
}: {
  images: MomentFeedItemViewModel["images"];
  onImageClick: (index: number) => void;
}) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const [image] = images;

    return (
      <div>
        <MomentImageFrame
          imageUrl={image.url}
          ratio="aspect-square"
          onClick={() => onImageClick(0)}
        />
      </div>
    );
  }

  const visibleImages = images.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-2">
      {visibleImages.map((image, index) => (
        <MomentImageFrame
          key={image.id}
          imageUrl={image.url}
          moreCount={
            images.length > visibleImages.length && index === 3
              ? images.length - visibleImages.length
              : 0
          }
          onClick={() => onImageClick(index)}
          ratio={
            images.length === 3 && index === 0
              ? "col-span-2 aspect-[4/3]"
              : "aspect-square"
          }
        />
      ))}
    </div>
  );
}

function MomentImageFrame({
  imageUrl,
  moreCount = 0,
  onClick,
  ratio,
}: {
  imageUrl: string;
  moreCount?: number;
  onClick: () => void;
  ratio: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative block w-full overflow-hidden rounded-[1.1rem] bg-[#F7EDE6] text-left transition active:scale-[0.99]",
        ratio,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Preview image"
    >
      {/* Uploaded moment images can come from public storage domains outside next/image config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {moreCount > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-[#1D1D1B]/42 text-2xl font-black text-white">
          +{moreCount}
        </span>
      ) : null}
    </button>
  );
}

function MomentImagePreview({
  images,
  initialIndex,
  onClose,
}: {
  images: MomentFeedItemViewModel["images"];
  initialIndex: number;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const suppressNextImageClickRef = useRef(false);
  const image = images[activeIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!image) {
    return null;
  }

  function goToImage(direction: -1 | 1) {
    setActiveIndex((current) => {
      const next = current + direction;

      if (next < 0) {
        return images.length - 1;
      }

      if (next >= images.length) {
        return 0;
      }

      return next;
    });
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null || !hasMultiple) {
      return;
    }

    const deltaX =
      (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;

    if (Math.abs(deltaX) > 48) {
      suppressNextImageClickRef.current = true;
      goToImage(deltaX < 0 ? 1 : -1);
      window.setTimeout(() => {
        suppressNextImageClickRef.current = false;
      }, 120);
    }

    setTouchStartX(null);
  }

  const preview = (
    <div
      className="flex flex-col text-white"
      style={{
        backgroundColor: "rgba(5, 5, 5, 0.96)",
        bottom: 0,
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 2147483647,
      }}
      onClick={onClose}
    >
      <header className="flex h-[calc(env(safe-area-inset-top)+3.5rem)] shrink-0 items-end justify-between px-4 pb-3">
        <span className="text-sm font-black">
          {activeIndex + 1}/{images.length}
        </span>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 backdrop-blur"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onTouchStart={(event) =>
          setTouchStartX(event.changedTouches[0]?.clientX ?? null)
        }
        onTouchEnd={handleTouchEnd}
      >
        {hasMultiple ? (
          <button
            type="button"
            className="absolute left-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 backdrop-blur"
            onClick={(event) => {
              event.stopPropagation();
              goToImage(-1);
            }}
            aria-label="Previous image"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
        ) : null}

        {/* Uploaded moment images can come from public storage domains outside next/image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={image.id}
          src={image.url}
          alt=""
          className="max-h-full max-w-full select-none object-contain shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
          onClick={(event) => {
            event.stopPropagation();
            if (suppressNextImageClickRef.current) {
              suppressNextImageClickRef.current = false;
              return;
            }
            onClose();
          }}
        />

        {hasMultiple ? (
          <button
            type="button"
            className="absolute right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 backdrop-blur"
            onClick={(event) => {
              event.stopPropagation();
              goToImage(1);
            }}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-0 right-0 flex justify-center gap-1.5">
          {images.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 rounded-full bg-white transition-all",
                activeIndex === index ? "w-5 opacity-90" : "w-1.5 opacity-35",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return mounted ? createPortal(preview, document.body) : null;
}

function ShareMomentButton({
  className,
  copy,
  href,
  iconOnly = false,
}: {
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  href: string;
  iconOnly?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const url = new URL(href, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 1600);
    }
  }

  return (
    <button
      type="button"
      className={cn("flex items-center gap-2 transition", className)}
      onClick={handleShare}
      aria-label={copy.share}
      title={
        status === "copied"
          ? copy.shareCopied
          : status === "failed"
            ? copy.shareFailed
            : copy.share
      }
    >
      {iconOnly ? (
        <Share2 className="h-[18px] w-[18px]" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {iconOnly ? null : (
        <span>
          {status === "copied"
            ? copy.shareCopied
            : status === "failed"
              ? copy.shareFailed
              : copy.share}
        </span>
      )}
    </button>
  );
}

function MomentCommentInlineAction({
  commentId,
  copy,
  isAuthenticated,
  isDeletable,
  locale,
  momentId,
}: {
  commentId: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  isDeletable: boolean;
  locale: string;
  momentId: string;
}) {
  if (isDeletable) {
    return (
      <form action={deleteMomentCommentAction}>
        <input name="commentId" type="hidden" value={commentId} />
        <input name="locale" type="hidden" value={locale} />
        <input name="momentId" type="hidden" value={momentId} />
        <button
          type="submit"
          className="text-[11px] font-black text-[#9A2135]/82"
        >
          {copy.delete}
        </button>
      </form>
    );
  }

  return (
    <ReportDialog
      className="h-auto rounded-none bg-transparent px-0 text-[11px] font-black text-[#9A2135]/82 ring-0"
      isAuthenticated={isAuthenticated}
      locale={locale}
      redirectPath={`/footprints/${momentId}`}
      targetId={commentId}
      targetType="MOMENT_COMMENT"
      variant="link"
    />
  );
}

const createMomentCommentInitialState: CreateMomentCommentState = {
  values: {
    content: "",
  },
};

function MomentCommentForm({
  copy,
  locale,
  momentId,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  momentId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createMomentCommentAction,
    createMomentCommentInitialState,
  );

  return (
    <form
      action={formAction}
      className="border-t border-[#E8E4D4]/70 bg-white/88 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] backdrop-blur"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="momentId" type="hidden" value={momentId} />
      <div className="flex items-end gap-2">
        <input
          key={state.ok ? `${momentId}-comment-empty` : `${momentId}-comment`}
          name="content"
          type="text"
          maxLength={500}
          placeholder={copy.commentPlaceholder}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-[#E3DCC5] bg-[#FEFFF9] px-4 text-sm font-semibold outline-none transition placeholder:text-[#8E8383]/72 focus:border-[#369758] focus:ring-2 focus:ring-[#369758]/12"
          defaultValue={state.ok ? "" : state.values?.content}
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#156240] text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)] transition active:scale-95 disabled:opacity-50"
          aria-label={copy.commentSubmit}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      {state.formError ? (
        <p className="mt-2 px-2 text-xs font-semibold text-[#9A2135]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

const createMomentInitialState: CreateMomentState = {
  values: {
    content: "",
    imageUrls: [],
    visibility: "PUBLIC",
  },
};

function MomentImageUploadGrid({
  copy,
  initialUrls,
  locale,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  initialUrls: string[];
  locale: string;
}) {
  const [urls, setUrls] = useState(initialUrls);
  const slotCount = Math.min(6, Math.max(1, urls.length + 1));

  function updateUrl(index: number, url: string) {
    setUrls((current) => {
      const next = [...current];

      next[index] = url;

      return next.filter(Boolean);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: slotCount }).map((_, index) => (
        <ActivityCoverUpload
          key={index}
          buttonOnlyUntilUploaded
          splitPreviewBelow
          initialUrl={urls[index] ?? ""}
          label={copy.addPhoto}
          locale={locale}
          name="imageUrls"
          onChange={(url) => updateUrl(index, url)}
          splitPreviewClassName="col-span-1"
          uploadEndpoint="/api/uploads/moment-image"
        />
      ))}
    </div>
  );
}

function MomentVisibilitySelector({
  copy,
  onChange,
  value,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  onChange: (visibility: "FRIENDS" | "PUBLIC") => void;
  value: "FRIENDS" | "PUBLIC";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel =
    value === "PUBLIC" ? copy.visibilityPublic : copy.visibilityFriends;
  const options = [
    {
      icon: <Globe2 className="h-3.5 w-3.5" />,
      label: copy.visibilityPublic,
      value: "PUBLIC" as const,
    },
    {
      icon: <UserRound className="h-3.5 w-3.5" />,
      label: copy.visibilityFriends,
      value: "FRIENDS" as const,
    },
  ];

  return (
    <div
      className="relative shrink-0"
      onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
    >
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#E3DCC5] bg-[#F7F7F0] px-2.5 text-[11px] font-black text-[#156240]/82 transition active:scale-[0.98]"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={copy.visibilityLabel}
      >
        {value === "PUBLIC" ? (
          <Globe2 className="h-3.5 w-3.5" />
        ) : (
          <UserRound className="h-3.5 w-3.5" />
        )}
        <span>{activeLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-32 overflow-hidden rounded-2xl border border-[#E3DCC5] bg-white py-1 shadow-[0_16px_34px_rgba(21,98,64,0.14)]">
          <p className="px-3 py-1.5 text-[10px] font-black text-[#8E8383]">
            {copy.visibilityLabel}
          </p>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black transition",
                value === option.value
                  ? "bg-[#F3F8EB] text-[#156240]"
                  : "text-[#1D1D1B]/72",
              )}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MomentComposer({
  copy,
  locale,
  profile,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  profile: FootprintsViewerProfile | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useState<"FRIENDS" | "PUBLIC">("PUBLIC");
  const [state, formAction, isPending] = useActionState(
    createMomentAction,
    createMomentInitialState,
  );
  const signInHref = getSignInHref(locale, "/footprints?tab=moment");

  if (!profile) {
    return (
      <Link
        href={signInHref}
        className="group flex min-h-[4rem] w-full items-center gap-3 rounded-[1.1rem] border border-[#E3DCC5] bg-white px-4 py-2.5 text-left shadow-[0_10px_24px_rgba(21,98,64,0.06)] transition active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-[#8E8383]">
          {copy.composer}
        </span>
        <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF2D7]">
          <Image
            src="/brand/v2_1/friemi-empty-state-mark.png"
            alt=""
            width={56}
            height={56}
            className="h-10 w-10 object-contain opacity-90"
          />
        </span>
      </Link>
    );
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="group flex min-h-[4rem] w-full items-center gap-3 rounded-[1.1rem] border border-[#E3DCC5] bg-white px-4 py-2.5 text-left shadow-[0_10px_24px_rgba(21,98,64,0.06)] transition active:scale-[0.99]"
        onClick={() => setIsExpanded(true)}
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-[#8E8383]">
          {copy.composer}
        </span>
        <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF2D7]">
          <Image
            src="/brand/v2_1/friemi-empty-state-mark.png"
            alt=""
            width={56}
            height={56}
            className="h-10 w-10 object-contain opacity-90"
          />
        </span>
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[1.35rem] border border-[#E3DCC5] bg-white p-4 shadow-[0_12px_34px_rgba(21,98,64,0.08)]"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="visibility" type="hidden" value={visibility} />
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setIsExpanded(false)}
          aria-label={copy.composer}
        >
          <ProfileAvatar
            avatarUrl={profile.avatarUrl}
            name={profile.nickname}
          />
          <div className="min-w-0 flex-1">
            <p className="min-w-0 text-[15px] font-black leading-5 text-[#111210]">
              {copy.composerTitle}
            </p>
          </div>
        </button>
        <MomentVisibilitySelector
          copy={copy}
          value={visibility}
          onChange={setVisibility}
        />
      </div>

      <textarea
        key={state.ok ? "moment-content-empty" : "moment-content"}
        name="content"
        maxLength={500}
        rows={3}
        placeholder={copy.composer}
        className="mt-4 w-full resize-none rounded-2xl border border-[#E3DCC5] bg-[#FEFFF9] px-4 py-3 text-sm font-semibold leading-6 outline-none transition placeholder:text-[#8E8383]/72 focus:border-[#369758] focus:ring-2 focus:ring-[#369758]/12"
        defaultValue={state.ok ? "" : state.values?.content}
      />

      <div className="mt-3">
        <MomentImageUploadGrid
          key={state.ok ? "moment-images-empty" : "moment-images-active"}
          copy={copy}
          initialUrls={state.ok ? [] : (state.values?.imageUrls ?? [])}
          locale={locale}
        />
      </div>

      {state.formError ? (
        <p className="mt-3 text-xs font-semibold text-[#9A2135]">
          {state.formError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-10 rounded-full bg-[#F7F7F0] px-4 text-xs font-black text-[#1D1D1B]/70"
          onClick={() => setIsExpanded(false)}
        >
          {locale === "fr" ? "Annuler" : locale === "en" ? "Cancel" : "取消"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)] disabled:opacity-60"
        >
          {isPending ? copy.composerSubmitting : copy.composerSubmit}
        </button>
      </div>
    </form>
  );
}

function FootprintsAuthPrompt({
  description,
  href,
  title,
  actionLabel,
}: {
  actionLabel: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-5 py-6 text-center shadow-[0_12px_34px_rgba(21,98,64,0.06)]">
      <p className="text-[16px] font-black leading-6 text-[#111210]">{title}</p>
      <p className="mx-auto mt-2 max-w-[18rem] text-sm font-semibold leading-6 text-[#8E8383]">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)]"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

function FootprintsMessageList({
  currentUserFriendCode,
  currentUserProfileId,
  friends,
  hasError,
  locale,
}: {
  currentUserFriendCode?: string | null;
  currentUserProfileId: string;
  friends: DirectMessageFriendRosterItemViewModel[];
  hasError?: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const [searchTerm, setSearchTerm] = useState("");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const sortedFriends = useMemo(
    () =>
      [...friends].sort((friendA, friendB) => {
        const timeA = new Date(
          friendA.lastMessage?.createdAt ??
            friendA.lastMessageAt ??
            friendA.createdAt,
        ).getTime();
        const timeB = new Date(
          friendB.lastMessage?.createdAt ??
            friendB.lastMessageAt ??
            friendB.createdAt,
        ).getTime();

        return (
          timeB - timeA || friendA.friendshipId.localeCompare(friendB.friendshipId)
        );
      }),
    [friends],
  );
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const visibleFriends = useMemo(() => {
    if (!normalizedSearchTerm) {
      return sortedFriends;
    }

    return sortedFriends.filter((friend) => {
      const searchable = [
        friend.friend.nickname,
        friend.friend.friendCode,
        friend.friend.bio,
        friend.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(normalizedSearchTerm);
    });
  }, [normalizedSearchTerm, sortedFriends]);
  const toolbar = (
    <div className="mt-4 flex items-center gap-2">
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#F7F7F0] px-3 text-[#156240] ring-1 ring-[#E3DCC5]">
        <Search className="h-4 w-4 shrink-0 text-[#156240]/72" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#111210] outline-none placeholder:text-[#8E8383]"
        />
      </label>
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#156240] text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)] transition active:scale-[0.97]"
        aria-label={t.addFriend}
        title={t.addFriend}
        onClick={() => setAddFriendOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
      </button>
    </div>
  );
  const addFriendDialog = addFriendOpen ? (
    <AddFriendDialog
      currentUserFriendCode={currentUserFriendCode}
      locale={locale}
      onClose={() => setAddFriendOpen(false)}
      returnTo="footprints"
    />
  ) : null;

  if (hasError) {
    return (
      <section>
        {toolbar}
        <div className="mt-3 border-y border-[#E8E4D4] bg-white/72 px-1 py-4 text-sm font-semibold leading-6 text-[#8E8383]">
          {t.emptyListDescription}
        </div>
        {addFriendDialog}
      </section>
    );
  }

  if (friends.length === 0) {
    return (
      <section>
        {toolbar}
        <div className="mt-3 border-y border-[#E8E4D4] bg-white/72 px-1 py-6">
          <h2 className="text-[16px] font-black leading-6 text-[#111210]">
            {t.emptyFriendListTitle}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#8E8383]">
            {t.emptyFriendListDescription}
          </p>
        </div>
        {addFriendDialog}
      </section>
    );
  }

  return (
    <section>
      {toolbar}
      {visibleFriends.length > 0 ? (
        <div className="mt-3 divide-y divide-[#E8E4D4] border-y border-[#E8E4D4] bg-white/72">
          {visibleFriends.map((friend) => (
            <FootprintsMessageRow
              key={friend.friendshipId}
              currentUserProfileId={currentUserProfileId}
              friend={friend}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 border-y border-[#E8E4D4] bg-white/72 px-1 py-6 text-sm font-semibold leading-6 text-[#8E8383]">
          {t.emptyListTitle}
        </div>
      )}
      {addFriendDialog}
    </section>
  );
}

function FootprintsMessageRow({
  currentUserProfileId,
  friend,
  locale,
}: {
  currentUserProfileId: string;
  friend: DirectMessageFriendRosterItemViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = friend.lastMessage;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body.trim() || t.imageMessage}`
    : t.startChat;
  const time =
    lastMessage?.createdAt ?? friend.lastMessageAt ?? friend.createdAt;
  const content = (
    <>
      <MessageAvatar
        avatarUrl={friend.friend.avatarUrl}
        name={friend.friend.nickname}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-2">
          <span className="truncate text-[14px] font-black leading-5 text-[#111210]">
            {friend.friend.nickname}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8E8383]">
            {formatActivityDate(time, locale)}
          </span>
        </span>
        <span className="mt-1 block truncate text-[13px] font-semibold leading-5 text-[#156240]">
          {preview}
        </span>
      </span>
    </>
  );

  return (
    <article className="min-w-0 transition active:bg-[#F1F2EC]/72">
      {friend.conversationId ? (
        <Link
          aria-label={t.openConversation(friend.friend.nickname)}
          className="flex min-w-0 items-center gap-3 px-1 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30"
          href={withLocale(locale, `/messages/${friend.conversationId}`)}
        >
          {content}
        </Link>
      ) : (
        <form action={openDirectConversationAction}>
          <input name="locale" type="hidden" value={locale} />
          <input
            name="friendProfileId"
            type="hidden"
            value={friend.friend.id}
          />
          <button
            type="submit"
            className="flex w-full min-w-0 items-center gap-3 px-1 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30"
            aria-label={t.openConversation(friend.friend.nickname)}
          >
            {content}
          </button>
        </form>
      )}
    </article>
  );
}

export function FootprintsMobilePage({
  initialTab = "message",
  locale,
  messageFriends,
  messageRosterError = false,
  momentFeedError = false,
  moments,
  canCreatePlanet,
  planets,
  planetSquareError = false,
  profile,
}: FootprintsMobilePageProps) {
  const copy = useMemo(() => getFootprintsCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState<FootprintsTab>(initialTab);
  const [feedScope, setFeedScope] = useState<MomentFeedScope>("PUBLIC");
  const isAuthenticated = Boolean(profile);
  const signInHref = getSignInHref(locale, "/footprints");

  const tabs: Array<{ key: FootprintsTab; label: string }> = [
    { key: "message", label: copy.tabs.message },
    { key: "moment", label: copy.tabs.moment },
    { key: "planet", label: copy.tabs.planet },
  ];
  const dedupedMoments = useMemo(() => {
    const seen = new Set<string>();

    return moments.filter((moment) => {
      const key = moment.resharedMoment
        ? `repost:${moment.author.id}:${moment.resharedMoment.id}`
        : `moment:${moment.id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [moments]);
  const scopedMoments = useMemo(
    () => dedupedMoments.filter((moment) => moment.visibility === feedScope),
    [dedupedMoments, feedScope],
  );
  const feedScopeTabs: Array<{ key: MomentFeedScope; label: string }> = profile
    ? [
        { key: "PUBLIC", label: copy.feedPublic },
        { key: "FRIENDS", label: copy.feedFriends },
      ]
    : [{ key: "PUBLIC", label: copy.feedPublic }];

  useEffect(() => {
    if (!profile && feedScope !== "PUBLIC") {
      setFeedScope("PUBLIC");
    }
  }, [feedScope, profile]);

  return (
    <main className="min-h-screen bg-[#FEFFF9] pb-28 text-[#111210] md:bg-[#EEF4FB] md:px-8 md:py-8">
      <div className="mx-auto min-h-screen max-w-md bg-[#FEFFF9] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:min-h-[calc(100vh-4rem)] md:max-w-6xl md:rounded-[2rem] md:px-8 md:pb-12 md:pt-8 md:shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
        <nav className="mx-auto grid max-w-md grid-cols-3 border-b border-[#E3DCC5] text-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  "relative pb-3 text-sm font-black tracking-normal transition",
                  active ? "text-[#111210]" : "text-[#1D1D1B]/58",
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px mx-auto h-[3px] w-10 rounded-full bg-[#156240] transition",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </nav>

        {activeTab === "moment" ? (
          <section className="mt-5 space-y-5 md:mt-8">
            <div className="md:mx-auto md:max-w-2xl">
              <MomentComposer copy={copy} locale={locale} profile={profile} />
            </div>

            <div className="inline-flex h-7 rounded-full bg-[#F7F7F0] p-0.5 text-[11px] font-black text-[#156240]">
              {feedScopeTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 transition",
                    feedScope === tab.key
                      ? "bg-white shadow-[0_6px_16px_rgba(21,98,64,0.08)]"
                      : "text-[#156240]/62",
                  )}
                  onClick={() => setFeedScope(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {momentFeedError ? (
              <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-5 text-sm font-semibold leading-6 text-[#8E8383] md:mx-auto md:max-w-2xl">
                {copy.feedError}
              </div>
            ) : scopedMoments.length > 0 ? (
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 xl:grid-cols-3">
                {scopedMoments.map((moment) => (
                  <FeedCard
                    key={moment.id}
                    isAuthenticated={isAuthenticated}
                    locale={locale}
                    moment={moment}
                    copy={copy}
                    viewerProfileId={profile?.id ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-6 text-center shadow-[0_12px_34px_rgba(21,98,64,0.06)] md:mx-auto md:max-w-2xl">
                <p className="text-[15px] font-black text-[#111210]">
                  {copy.emptyFeedTitle}
                </p>
                <p className="mx-auto mt-2 max-w-[17rem] text-sm font-semibold leading-6 text-[#8E8383]">
                  {copy.emptyFeedDescription}
                </p>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "message" ? (
          <section className="md:mx-auto md:max-w-2xl">
            {profile ? (
              <FootprintsMessageList
                currentUserFriendCode={profile.friendCode}
                currentUserProfileId={profile.id}
                friends={messageFriends}
                hasError={messageRosterError}
                locale={locale}
              />
            ) : (
              <div className="mt-5">
                <FootprintsAuthPrompt
                  actionLabel={copy.signIn}
                  description={copy.guestMessageDescription}
                  href={signInHref}
                  title={copy.guestMessageTitle}
                />
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "planet" ? (
          <section className="mt-5 md:mx-auto md:max-w-3xl">
            {planetSquareError ? (
              <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-5 text-sm font-semibold leading-6 text-[#8E8383]">
                {locale === "fr"
                  ? "Les planètes ne se chargent pas pour le moment."
                  : locale === "en"
                    ? "Planets could not load right now."
                    : "星球暂时加载失败，请稍后再试。"}
              </div>
            ) : (
              <PlanetSquarePage
                canCreate={canCreatePlanet}
                embedded
                locale={locale}
                planets={planets}
              />
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
