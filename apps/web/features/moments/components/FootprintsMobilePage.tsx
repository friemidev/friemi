"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useMemo, useOptimistic, useState } from "react";
import { formatActivityDate } from "@chill-club/shared";
import {
  Camera,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Repeat2,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import { getDirectMessagesCopy } from "@/features/direct-messages/copy";
import type { DirectMessageFriendRosterItemViewModel } from "@/features/direct-messages/queries/getDirectMessages";
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
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FootprintsTab = "moment" | "message" | "profile";

type FootprintsMobilePageProps = {
  initialTab?: FootprintsTab;
  locale: string;
  messageFriends: DirectMessageFriendRosterItemViewModel[];
  messageRosterError?: boolean;
  momentFeedError?: boolean;
  moments: MomentFeedItemViewModel[];
  profile: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    bio: string | null;
    friendCode: string | null;
  };
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
      moment: "Moment",
      message: "消息",
      profile: "主页",
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
    emptyFeedTitle: "还没有好友动态",
    emptyFeedDescription: "发一条足迹，或者添加好友后再回来看看。",
    feedError: "动态暂时加载失败，请稍后再试。",
    feedTitle: "好友动态",
    publish: "发布",
    report: "举报",
    shareCopied: "链接已复制",
    shareFailed: "暂时无法分享",
    visibilityFriends: "好友可见",
    visibilityPublic: "公开",
    like: "点赞",
    comment: "评论",
    share: "分享链接",
    repost: "转发",
    commentSheetTitle: "评论",
    loadMoreComments: "查看全部评论",
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
      moment: "Moment",
      message: "Message",
      profile: "Profile",
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
    feedTitle: "Friends",
    publish: "Post",
    report: "Report",
    shareCopied: "Link copied",
    shareFailed: "Could not share",
    visibilityFriends: "Friends",
    visibilityPublic: "Public",
    like: "Like",
    comment: "Comment",
    share: "Share link",
    repost: "Repost",
    commentSheetTitle: "Comments",
    loadMoreComments: "View all comments",
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
      moment: "Moment",
      message: "Message",
      profile: "Profil",
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
    feedTitle: "Amis",
    publish: "Publier",
    report: "Signaler",
    shareCopied: "Lien copié",
    shareFailed: "Partage impossible",
    visibilityFriends: "Amis",
    visibilityPublic: "Public",
    like: "J'aime",
    comment: "Commenter",
    share: "Partager le lien",
    repost: "Republier",
    commentSheetTitle: "Commentaires",
    loadMoreComments: "Voir tous les commentaires",
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
  locale,
  moment,
  copy,
  viewerProfileId,
}: {
  deleteRedirectPath?: string;
  locale: string;
  moment: MomentFeedItemViewModel;
  copy: ReturnType<typeof getFootprintsCopy>;
  viewerProfileId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const detailHref = withLocale(locale, `/footprints/${moment.id}`);
  const isOwnMoment = moment.author.id === viewerProfileId;
  const canRepost =
    isOwnMoment ||
    moment.visibility === "PUBLIC" ||
    Boolean(moment.resharedMoment);

  return (
    <>
      <article className="overflow-hidden rounded-[1.35rem] border border-[#E3DCC5] bg-white shadow-[0_12px_34px_rgba(21,98,64,0.08)]">
        <div className="flex items-start gap-3 px-4 pb-2 pt-4">
          <ProfileAvatar
            avatarUrl={moment.author.avatarUrl}
            name={moment.author.nickname}
          />
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
              <div className="relative">
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
                        isAuthenticated
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
            {moment.content ? (
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
          <MomentImageGrid images={moment.images} />
        ) : null}

        <div className="grid grid-cols-3 px-4 py-3 text-[#1D1D1B]/76">
          <OptimisticMomentLikeButton
            copy={copy}
            locale={locale}
            moment={moment}
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
            locale={locale}
            moment={moment}
          />
        </div>

        {moment.recentComments.length > 0 ? (
          <button
            type="button"
            className="mx-4 mb-3 block w-[calc(100%-2rem)] rounded-2xl bg-[#F7F7F0] px-3 py-2 text-left transition hover:bg-[#F1F2EC]"
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
          locale={locale}
          moment={moment}
          onClose={() => setCommentsOpen(false)}
          viewerProfileId={viewerProfileId}
        />
      ) : null}
    </>
  );
}

function OptimisticMomentLikeButton({
  copy,
  locale,
  moment,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  moment: MomentFeedItemViewModel;
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
        <Heart
          className={cn(
            "h-[18px] w-[18px]",
            optimisticLike.isLiked ? "fill-current" : null,
          )}
        />
        <span>{optimisticLike.count}</span>
      </button>
    </form>
  );
}

function RepostMomentButton({
  canRepost,
  copy,
  locale,
  moment,
}: {
  canRepost: boolean;
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  moment: MomentFeedItemViewModel;
}) {
  const [optimisticCount, addOptimisticRepost] = useOptimistic(
    moment.repostCount,
    (current, _action: null) => current + 1,
  );

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
      <button
        type="submit"
        className={cn(
          "inline-flex items-center justify-end gap-2 rounded-full py-2 text-sm font-bold",
          !canRepost && "cursor-not-allowed opacity-35",
        )}
        disabled={!canRepost}
        aria-label={copy.repost}
      >
        <Repeat2 className="h-[18px] w-[18px]" />
        <span>{optimisticCount}</span>
      </button>
    </form>
  );
}

function SharedMomentPreview({
  copy,
  locale,
  moment,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  moment: NonNullable<MomentFeedItemViewModel["resharedMoment"]>;
}) {
  return (
    <Link
      href={withLocale(locale, `/footprints/${moment.id}`)}
      className="mx-4 mb-3 flex gap-3 rounded-[1rem] bg-[#F7F7F0] p-3 transition hover:bg-[#F1F2EC]"
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
  isOwnMoment,
  locale,
  moment,
  onClose,
  viewerProfileId,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  isOwnMoment: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  onClose: () => void;
  viewerProfileId: string;
}) {
  const hasMore = moment.commentCount > moment.recentComments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#1D1D1B]/28 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-t-[1.6rem] border border-[#E3DCC5] bg-[#FEFFF9] shadow-[0_-18px_48px_rgba(29,29,27,0.18)]">
        <header className="flex items-center justify-between border-b border-[#E8E4D4] px-4 py-3">
          <h2 className="text-[16px] font-black text-[#111210]">
            {copy.commentSheetTitle}
          </h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#E3DCC5]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[46vh] overflow-y-auto px-4 py-3">
          {moment.recentComments.length > 0 ? (
            <div className="space-y-3">
              {moment.recentComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <ProfileAvatar
                    avatarUrl={comment.author.avatarUrl}
                    name={comment.author.nickname}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-[#E8E4D4]">
                      <p className="text-xs font-black text-[#156240]">
                        {comment.author.nickname}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[#1D1D1B]/82">
                        {comment.content}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 px-2">
                      <span className="text-[11px] font-semibold text-[#8E8383]">
                        {formatActivityDate(comment.createdAt, locale)}
                      </span>
                      <MomentCommentInlineAction
                        commentId={comment.id}
                        copy={copy}
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
            <p className="py-5 text-center text-sm font-semibold text-[#8E8383]">
              {copy.commentPlaceholder}
            </p>
          )}
          {hasMore ? (
            <Link
              href={withLocale(locale, `/footprints/${moment.id}`)}
              className="mt-4 flex h-10 items-center justify-center rounded-full bg-[#F7F7F0] text-sm font-black text-[#156240]"
            >
              {copy.loadMoreComments}
            </Link>
          ) : null}
        </div>
        <MomentCommentForm copy={copy} locale={locale} momentId={moment.id} />
      </section>
    </div>
  );
}

function MomentImageGrid({
  images,
}: {
  images: MomentFeedItemViewModel["images"];
}) {
  if (images.length === 1) {
    const image = images[0];

    if (!image) {
      return null;
    }

    return (
      <div className="px-4">
        <MomentImageFrame imageUrl={image.url} ratio="aspect-[16/8.6]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      {images.slice(0, 4).map((image, index) => (
        <MomentImageFrame
          key={image.id}
          imageUrl={image.url}
          ratio={
            images.length === 3 && index === 0
              ? "aspect-[16/8.6] col-span-2"
              : "aspect-square"
          }
        />
      ))}
    </div>
  );
}

function MomentImageFrame({
  imageUrl,
  ratio,
}: {
  imageUrl: string;
  ratio: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.1rem] bg-[#F7EDE6]",
        ratio,
      )}
    >
      {/* Uploaded moment images can come from public storage domains outside next/image config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
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
  isDeletable,
  locale,
  momentId,
}: {
  commentId: string;
  copy: ReturnType<typeof getFootprintsCopy>;
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
          className="rounded-full px-1 text-[11px] font-black text-[#9A2135]"
        >
          {copy.delete}
        </button>
      </form>
    );
  }

  return (
    <ReportDialog
      className="h-auto rounded-none bg-transparent px-1 text-[11px] font-black text-[#9A2135] ring-0"
      isAuthenticated
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
    <form action={formAction} className="border-t border-[#E8E4D4] px-4 py-3">
      <input name="locale" type="hidden" value={locale} />
      <input name="momentId" type="hidden" value={momentId} />
      <div className="flex items-center gap-2">
        <input
          key={state.ok ? `${momentId}-comment-empty` : `${momentId}-comment`}
          name="content"
          type="text"
          maxLength={500}
          placeholder={copy.commentPlaceholder}
          className="min-h-10 min-w-0 flex-1 rounded-full border border-[#E3DCC5] bg-[#FEFFF9] px-4 text-sm font-semibold outline-none transition placeholder:text-[#8E8383]/72 focus:border-[#369758] focus:ring-2 focus:ring-[#369758]/12"
          defaultValue={state.ok ? "" : state.values?.content}
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-[#156240] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)] disabled:opacity-60"
        >
          {copy.commentSubmit}
        </button>
      </div>
      {state.formError ? (
        <p className="mt-2 text-xs font-semibold text-[#9A2135]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[1.25rem] border border-[#E3DCC5] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(21,98,64,0.07)] transition active:scale-[0.99]"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF4E7] text-[#156240]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-5 text-[#111210]">
          {title}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-[#6C746A]">
          {description}
        </span>
      </span>
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#FEFFF9] px-2.5 text-xs font-black text-[#156240] ring-1 ring-[#D6D5B2]">
        {cta}
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

const createMomentInitialState: CreateMomentState = {
  values: {
    content: "",
    imageUrls: [],
    visibility: "FRIENDS",
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

function MomentComposer({
  copy,
  locale,
  profile,
}: {
  copy: ReturnType<typeof getFootprintsCopy>;
  locale: string;
  profile: FootprintsMobilePageProps["profile"];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useState<"FRIENDS" | "PUBLIC">("FRIENDS");
  const [state, formAction, isPending] = useActionState(
    createMomentAction,
    createMomentInitialState,
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-3 text-left shadow-[0_12px_34px_rgba(21,98,64,0.08)] transition active:scale-[0.99]"
        onClick={() => setIsExpanded(true)}
      >
        <ProfileAvatar avatarUrl={profile.avatarUrl} name={profile.nickname} />
        <span className="min-w-0 flex-1 text-sm font-semibold text-[#8E8383]">
          {copy.composer}
        </span>
        <span className="relative inline-flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF2D7]">
          <Image
            src="/brand/v2_1/friemi-empty-state-mark.png"
            alt=""
            width={56}
            height={56}
            className="h-11 w-11 object-contain opacity-90"
          />
          <span className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#156240] text-white shadow-[0_8px_18px_rgba(21,98,64,0.18)]">
            <Plus className="h-4 w-4" />
          </span>
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
      <div className="flex items-center gap-3">
        <ProfileAvatar avatarUrl={profile.avatarUrl} name={profile.nickname} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-5 text-[#111210]">
            {copy.composerTitle}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-black">
            <button
              type="button"
              className={cn(
                "flex h-9 items-center justify-center rounded-full transition",
                visibility === "FRIENDS"
                  ? "bg-[#156240] text-white"
                  : "bg-[#F7F7F0] text-[#156240]",
              )}
              onClick={() => setVisibility("FRIENDS")}
            >
              {copy.visibilityFriends}
            </button>
            <button
              type="button"
              className={cn(
                "flex h-9 items-center justify-center rounded-full transition",
                visibility === "PUBLIC"
                  ? "bg-[#156240] text-white"
                  : "bg-[#F7F7F0] text-[#156240]",
              )}
              onClick={() => setVisibility("PUBLIC")}
            >
              {copy.visibilityPublic}
            </button>
          </div>
        </div>
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
          ×
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

function FootprintsMessageList({
  currentUserProfileId,
  friends,
  hasError,
  locale,
}: {
  currentUserProfileId: string;
  friends: DirectMessageFriendRosterItemViewModel[];
  hasError?: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  if (hasError) {
    return (
      <section className="mt-4 border-y border-[#E8E4D4] bg-white/72 px-1 py-4 text-sm font-semibold leading-6 text-[#8E8383]">
        {t.emptyListDescription}
      </section>
    );
  }

  if (friends.length === 0) {
    return (
      <section className="mt-4 border-y border-[#E8E4D4] bg-white/72 px-1 py-6">
        <h2 className="text-[16px] font-black leading-6 text-[#111210]">
          {t.emptyFriendListTitle}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#8E8383]">
          {t.emptyFriendListDescription}
        </p>
        <Link
          href={withLocale(locale, "/friends")}
          className="mt-4 inline-flex h-9 items-center rounded-full bg-[#156240] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)]"
        >
          {t.addFriend}
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <div className="divide-y divide-[#E8E4D4] border-y border-[#E8E4D4] bg-white/72">
        {friends.map((friend) => (
          <FootprintsMessageRow
            key={friend.friendshipId}
            currentUserProfileId={currentUserProfileId}
            friend={friend}
            locale={locale}
          />
        ))}
      </div>
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
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body}`
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
  initialTab = "moment",
  locale,
  messageFriends,
  messageRosterError = false,
  momentFeedError = false,
  moments,
  profile,
}: FootprintsMobilePageProps) {
  const copy = useMemo(() => getFootprintsCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState<FootprintsTab>(initialTab);

  const tabs: Array<{ key: FootprintsTab; label: string }> = [
    { key: "moment", label: copy.tabs.moment },
    { key: "message", label: copy.tabs.message },
    { key: "profile", label: copy.tabs.profile },
  ];

  return (
    <main className="min-h-screen bg-[#FEFFF9] pb-28 text-[#111210] md:bg-[#EEF4FB]">
      <div className="mx-auto min-h-screen max-w-md bg-[#FEFFF9] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
        <header className="flex items-center justify-between">
          <h1 className="text-[28px] font-black leading-none tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <Link
            href={withLocale(locale, "/profile")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#1D1D1B] shadow-[0_8px_20px_rgba(21,98,64,0.08)]"
            aria-label={copy.settings}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        <nav className="mt-7 grid grid-cols-3 border-b border-[#E3DCC5] text-center">
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
          <section className="mt-5 space-y-5">
            <MomentComposer copy={copy} locale={locale} profile={profile} />

            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-black tracking-normal text-[#156240]">
                {copy.feedTitle}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-full bg-[#EAF4E7] px-3 text-xs font-black text-[#156240]"
              >
                <Camera className="h-4 w-4" />
                {copy.publish}
              </button>
            </div>

            {momentFeedError ? (
              <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-5 text-sm font-semibold leading-6 text-[#8E8383]">
                {copy.feedError}
              </div>
            ) : moments.length > 0 ? (
              <div className="space-y-4">
                {moments.map((moment) => (
                  <FeedCard
                    key={moment.id}
                    locale={locale}
                    moment={moment}
                    copy={copy}
                    viewerProfileId={profile.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-6 text-center shadow-[0_12px_34px_rgba(21,98,64,0.06)]">
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
          <FootprintsMessageList
            currentUserProfileId={profile.id}
            friends={messageFriends}
            hasError={messageRosterError}
            locale={locale}
          />
        ) : null}

        {activeTab === "profile" ? (
          <section className="mt-5 space-y-4">
            <div className="rounded-[1.45rem] border border-[#E3DCC5] bg-white p-4 shadow-[0_12px_34px_rgba(21,98,64,0.08)]">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  avatarUrl={profile.avatarUrl}
                  name={profile.nickname}
                  className="h-14 w-14 text-base"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-black leading-6 text-[#111210]">
                    {profile.nickname}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#6C746A]">
                    {profile.bio || copy.bioFallback}
                  </p>
                </div>
              </div>

              {profile.friendCode ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F1F2EC] px-3 py-2 text-xs font-black text-[#156240]">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.friendCode}
                  <span className="text-[#1D1D1B]">{profile.friendCode}</span>
                </div>
              ) : null}
            </div>

            <ActionCard
              icon={<UserRound className="h-5 w-5" />}
              title={copy.profileTitle}
              description={copy.profileDescription}
              href={withLocale(locale, "/profile")}
              cta={copy.openProfile}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
