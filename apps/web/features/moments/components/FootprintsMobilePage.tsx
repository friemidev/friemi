"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ComponentType,
  KeyboardEvent,
  MouseEvent,
  TouchEvent,
} from "react";
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
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  Gift,
  Globe2,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Orbit,
  Pin,
  RefreshCw,
  Search,
  SendHorizontal,
  Share2,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { ActivityRoomChatRosterItemViewModel } from "@/features/activity-room-chat/services/activityRoomChat";
import { CharmGiftDialog } from "@/features/charm/components/CharmGiftDialog";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { DirectMessageUnreadCountHydrator } from "@/features/direct-messages/components/DirectMessageUnreadCountHydrator";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import { getDirectMessagesCopy } from "@/features/direct-messages/copy";
import type { DirectMessageFriendRosterItemViewModel } from "@/features/direct-messages/queries/getDirectMessages";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { PlanetSquarePage } from "@/features/planets/components/PlanetPages";
import type { getPlanetSquare } from "@/features/planets/queries/planetQueries";
import type { PlanetChatRosterItemViewModel } from "@/features/planets/services/planetChat";
import {
  buildPlanetChatListReturnHref,
  filterUnifiedChatRosterEntries,
  getPlanetChatListScrollStorageKey,
  getPlanetChatListState,
  type PlanetChatListFilter,
} from "@/features/planets/utils/planetChatListState";
import {
  createMomentAction,
  createMomentCommentAction,
  deleteMomentAction,
  deleteMomentCommentAction,
  toggleMomentLikeAction,
  type CreateMomentCommentState,
  type CreateMomentState,
} from "@/features/moments/actions/momentActions";
import type { MomentFeedItemViewModel } from "@/features/moments/queries/getMomentFeed";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { getSignInHref } from "@/lib/auth-redirect";
import { formatChatListTimestamp } from "@/lib/chatDateSeparators";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FootprintsTab = "message" | "moment" | "planet";
type MomentFeedScope = "PUBLIC" | "MUTUAL" | "FOLLOWING" | "MINE";
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
  activityRoomChats: ActivityRoomChatRosterItemViewModel[];
  initialMomentScope?: MomentFeedScope;
  initialTab?: FootprintsTab;
  locale: string;
  messageFriends: DirectMessageFriendRosterItemViewModel[];
  messageRosterError?: boolean;
  momentFeedError?: boolean;
  moments: MomentFeedItemViewModel[];
  canCreatePlanet: boolean;
  planetChatRosterLoaded: boolean;
  planetChats: PlanetChatRosterItemViewModel[];
  planets: PlanetSquare;
  planetSquareError?: boolean;
  profile: FootprintsViewerProfile | null;
};

function getFootprintsTabFromSearch(search: string): FootprintsTab | null {
  const tab = new URLSearchParams(search).get("tab");

  if (tab === "message" || tab === "moment" || tab === "planet") {
    return tab;
  }

  return null;
}

function getMomentScopeFromSearch(search: string): MomentFeedScope {
  const scope = new URLSearchParams(search).get("scope");

  if (scope === "mine") {
    return "MINE";
  }

  if (scope === "mutual") {
    return "MUTUAL";
  }

  if (scope === "following") {
    return "FOLLOWING";
  }

  return "PUBLIC";
}

function getMomentScopeParam(scope: MomentFeedScope) {
  if (scope === "MINE") {
    return "mine";
  }

  if (scope === "MUTUAL") {
    return "mutual";
  }

  if (scope === "FOLLOWING") {
    return "following";
  }

  return null;
}

function getFootprintsTabPath(tab: FootprintsTab, scope: MomentFeedScope) {
  const params = new URLSearchParams({ tab });
  const scopeParam = tab === "moment" ? getMomentScopeParam(scope) : null;

  if (scopeParam) {
    params.set("scope", scopeParam);
  }

  return `/footprints?${params.toString()}`;
}

function updateFootprintsHistoryUrl(
  locale: string,
  tab: FootprintsTab,
  scope: MomentFeedScope,
  mode: "push" | "replace",
) {
  const nextUrl = withLocale(locale, getFootprintsTabPath(tab, scope));

  if (window.location.pathname + window.location.search === nextUrl) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(window.history.state, "", nextUrl);
    return;
  }

  window.history.pushState(window.history.state, "", nextUrl);
}

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
    title: "世界",
    settings: "设置",
    tabs: {
      message: "聊聊",
      moment: "晒晒",
      planet: "星星",
    },
    composer: "分享此刻的心情或精彩瞬间...",
    addPhoto: "添加照片",
    photoInvalidContentError: "图片内容无效，请重新选择原始图片。",
    photoLimitError: "一次晒晒最多可以上传 6 张照片。",
    photoRemove: "移除照片",
    photoRetry: "重新上传",
    photoSizeError: "普通图片不能超过 10MB，GIF 不能超过 20MB。",
    photoStorageError: "照片存储暂时不可用，请稍后再试。",
    photoTypeError: "请选择常见图片格式。",
    photoUploadFailed: "部分照片上传失败，请重试或移除。",
    photoUploading: (count: number) => `正在上传 ${count} 张照片...`,
    composerTitle: "此刻想说什么？",
    composerSubmit: "发布",
    composerSubmitting: "发布中...",
    commentPlaceholder: "写评论...",
    commentSubmit: "发送",
    close: "关闭",
    delete: "删除",
    detail: "详情",
    more: "更多",
    emptyFeedTitle: "还没有动态",
    emptyFeedDescription: "发一条晒晒，或者关注几个人后再回来看看。",
    feedError: "动态暂时加载失败，请稍后再试。",
    feedFollowing: "我关注的",
    feedMine: "我的",
    feedMutual: "互相关注",
    feedPublic: "广场",
    guestProfileDescription: "登录后可以管理头像、简介和个人码。",
    guestProfileTitle: "登录查看主页",
    guestMessageDescription: "登录后可以查看私聊和组局聊天。",
    guestMessageTitle: "登录查看聊聊",
    signIn: "登录",
    signInToInteract: "登录后互动",
    signInToPost: "登录后发布足迹",
    report: "举报",
    shareCopied: "链接已复制",
    shareFailed: "暂时无法分享",
    visibilityFriends: "互关可见",
    visibilityLabel: "发布范围",
    visibilityPublic: "公开",
    like: "点赞",
    comment: "评论",
    gift: "送礼",
    share: "分享链接",
    commentSheetTitle: "评论",
    loadMoreComments: "查看全部评论",
    emptyComments: "还没有评论",
    originalMoment: "原足迹",
    originalUnavailable: "原足迹已不可见",
    viewOriginal: "查看原文",
    messageTitle: "聊聊",
    messageDescription: "私聊和组局聊天都在这里。",
    messageFilters: {
      all: "聊聊",
      following: "我关注的",
      mutual: "互相关注",
      official: "官方",
      rooms: "群聊",
    },
    openMessages: "进入聊聊",
    notificationTitle: "通知",
    notificationDescription: "报名、评论和点赞提醒会汇总到通知中心。",
    openNotifications: "查看通知",
    profileTitle: "我的主页",
    profileDescription: "头像、简介和个人码仍在个人主页管理。",
    openProfile: "编辑主页",
    friendCode: "个人码",
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
    title: "World",
    settings: "Settings",
    tabs: {
      message: "Message",
      moment: "Moments",
      planet: "Planet",
    },
    composer: "Share a mood or a bright little moment...",
    addPhoto: "Add photo",
    photoInvalidContentError:
      "This image is invalid. Choose the original file.",
    photoLimitError: "You can upload up to 6 photos per moment.",
    photoRemove: "Remove photo",
    photoRetry: "Retry upload",
    photoSizeError:
      "Regular images must be 10 MB or smaller; GIF must be 20 MB or smaller.",
    photoStorageError:
      "Photo storage is temporarily unavailable. Try again later.",
    photoTypeError: "Choose a common image format.",
    photoUploadFailed: "Some photos failed to upload. Retry or remove them.",
    photoUploading: (count: number) =>
      `Uploading ${count} photo${count === 1 ? "" : "s"}...`,
    composerTitle: "What's happening?",
    composerSubmit: "Post",
    composerSubmitting: "Posting...",
    commentPlaceholder: "Write a comment...",
    commentSubmit: "Send",
    close: "Close",
    delete: "Delete",
    detail: "Details",
    more: "More",
    emptyFeedTitle: "No moments yet",
    emptyFeedDescription: "Post one, or come back after following people.",
    feedError: "Moments could not load. Try again later.",
    feedFollowing: "Following",
    feedMine: "Mine",
    feedMutual: "Mutual",
    feedPublic: "Public",
    guestProfileDescription:
      "Sign in to manage your avatar, bio, and Friemi ID.",
    guestProfileTitle: "Sign in to view your profile",
    guestMessageDescription: "Sign in to see chats and plan messages.",
    guestMessageTitle: "Sign in to view messages",
    signIn: "Sign in",
    signInToInteract: "Sign in to interact",
    signInToPost: "Sign in to post",
    report: "Report",
    shareCopied: "Link copied",
    shareFailed: "Could not share",
    visibilityFriends: "Mutual",
    visibilityLabel: "Audience",
    visibilityPublic: "Public",
    like: "Like",
    comment: "Comment",
    gift: "Gift",
    share: "Share link",
    commentSheetTitle: "Comments",
    loadMoreComments: "View all comments",
    emptyComments: "No comments yet",
    originalMoment: "Original moment",
    originalUnavailable: "Original moment is unavailable",
    viewOriginal: "View original",
    messageTitle: "Messages",
    messageDescription: "Chats and plan details stay here.",
    messageFilters: {
      all: "All chats",
      following: "Following",
      mutual: "Mutual",
      official: "Official",
      rooms: "Groups",
    },
    openMessages: "Open messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Comments, likes, joins, and approvals are grouped here.",
    openNotifications: "Open notifications",
    profileTitle: "Profile",
    profileDescription:
      "Manage your avatar, bio, and Friemi ID from your profile.",
    openProfile: "Edit profile",
    friendCode: "Friemi ID",
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
    title: "Monde",
    settings: "Réglages",
    tabs: {
      message: "Message",
      moment: "Moments",
      planet: "Planète",
    },
    composer: "Partage une humeur ou un instant à garder...",
    addPhoto: "Ajouter une photo",
    photoInvalidContentError:
      "Cette image est invalide. Choisissez le fichier original.",
    photoLimitError: "Vous pouvez ajouter jusqu'à 6 photos par publication.",
    photoRemove: "Retirer la photo",
    photoRetry: "Réessayer",
    photoSizeError:
      "Les images doivent faire 10 Mo maximum, ou 20 Mo pour un GIF.",
    photoStorageError:
      "Le stockage des photos est indisponible. Réessayez plus tard.",
    photoTypeError: "Choisissez un format d'image courant.",
    photoUploadFailed:
      "Certaines photos n'ont pas été envoyées. Réessayez ou retirez-les.",
    photoUploading: (count: number) =>
      `Envoi de ${count} photo${count > 1 ? "s" : ""}...`,
    composerTitle: "Quoi de neuf ?",
    composerSubmit: "Publier",
    composerSubmitting: "Publication...",
    commentPlaceholder: "Écrire un commentaire...",
    commentSubmit: "Envoyer",
    close: "Fermer",
    delete: "Supprimer",
    detail: "Détails",
    more: "Plus",
    emptyFeedTitle: "Aucun moment pour l'instant",
    emptyFeedDescription:
      "Publiez un moment, ou revenez après avoir suivi quelques personnes.",
    feedError: "Les moments ne se chargent pas pour le moment.",
    feedFollowing: "Suivis",
    feedMine: "Moi",
    feedMutual: "Mutuels",
    feedPublic: "Public",
    guestProfileDescription:
      "Connecte-toi pour gérer ton avatar, ta bio et ton ID Friemi.",
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
    visibilityFriends: "Mutuels",
    visibilityLabel: "Audience",
    visibilityPublic: "Public",
    like: "J'aime",
    comment: "Commenter",
    gift: "Cadeau",
    share: "Partager le lien",
    commentSheetTitle: "Commentaires",
    loadMoreComments: "Voir tous les commentaires",
    emptyComments: "Aucun commentaire pour le moment",
    originalMoment: "Moment original",
    originalUnavailable: "Moment original indisponible",
    viewOriginal: "Voir l'original",
    messageTitle: "Messages",
    messageDescription: "Les échanges et messages de plans restent ici.",
    messageFilters: {
      all: "Tous",
      following: "Suivis",
      mutual: "Mutuels",
      official: "Officiel",
      rooms: "Groupes",
    },
    openMessages: "Ouvrir les messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Commentaires, likes, inscriptions et validations sont regroupés ici.",
    openNotifications: "Voir les notifications",
    profileTitle: "Profil",
    profileDescription:
      "Gérez votre avatar, bio et ID Friemi depuis votre profil.",
    openProfile: "Modifier le profil",
    friendCode: "ID Friemi",
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
        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7457A] text-sm font-bold text-white shadow-[0_6px_16px_rgba(21,98,64,0.14)]",
        className,
      )}
    >
      {initial}
    </span>
  );
}

const momentActionButtonClassName =
  "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[13px] font-bold text-[#51594F] transition hover:bg-[#F7F7F0] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/24";

function MomentActionBar({
  className,
  commentHref,
  copy,
  isAuthenticated,
  isOwnMoment,
  locale,
  moment,
  onCommentClick,
  signInHref,
}: {
  className?: string;
  commentHref?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  isOwnMoment: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  onCommentClick?: () => void;
  signInHref: string;
}) {
  const commentContent = (
    <>
      <MessageCircle className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 friemi-tabular leading-none">
        {moment.commentCount}
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-[#51594F]",
        className,
      )}
    >
      <OptimisticMomentLikeButton
        className={momentActionButtonClassName}
        copy={copy}
        formClassName="min-w-0"
        isAuthenticated={isAuthenticated}
        locale={locale}
        moment={moment}
        signInHref={signInHref}
      />

      {commentHref ? (
        <Link
          href={commentHref}
          className={momentActionButtonClassName}
          aria-label={copy.comment}
        >
          {commentContent}
        </Link>
      ) : (
        <button
          type="button"
          className={momentActionButtonClassName}
          aria-label={copy.comment}
          onClick={onCommentClick}
        >
          {commentContent}
        </button>
      )}

      <MomentGiftAction
        className={momentActionButtonClassName}
        copy={copy}
        isAuthenticated={isAuthenticated}
        isOwnMoment={isOwnMoment}
        locale={locale}
        moment={moment}
      />
    </div>
  );
}

function MomentMoreMenu({
  buttonClassName,
  className,
  copy,
  deleteRedirectPath,
  detailHref,
  isAuthenticated,
  isOwnMoment,
  locale,
  moment,
  showDetailAction,
}: {
  buttonClassName?: string;
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  deleteRedirectPath?: string;
  detailHref: string;
  isAuthenticated: boolean;
  isOwnMoment: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
  showDetailAction: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const directMessageCopy = getDirectMessagesCopy(locale);

  return (
    <div
      className={cn("relative min-w-0", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          setMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1D1D1B]/70 transition hover:bg-[#F7F7F0] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/24",
          buttonClassName,
        )}
        aria-label={copy.more}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal className="h-[18px] w-[18px] shrink-0" />
        <span className="sr-only">{copy.more}</span>
      </button>

      {menuOpen ? (
        <>
          <button
            aria-label={copy.close}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setMenuOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div className="absolute right-0 top-11 z-20 min-w-40 overflow-hidden rounded-2xl border border-[#E3DCC5] bg-white py-1 text-sm font-bold text-[#1D1D1B] shadow-[0_16px_40px_rgba(29,29,27,0.16)]">
            {showDetailAction ? (
              <Link
                className="flex items-center gap-2 px-3 py-2.5 transition hover:bg-[#F7F7F0]"
                href={detailHref}
              >
                <Eye className="h-4 w-4" />
                {copy.detail}
              </Link>
            ) : null}
            <ShareMomentButton
              className="w-full px-3 py-2.5 text-left hover:bg-[#F7F7F0]"
              copy={copy}
              href={detailHref}
            />
            {!isOwnMoment ? (
              <StartDirectConversationButton
                buttonClassName="h-auto w-full justify-start rounded-none bg-transparent px-3 py-2.5 text-left text-[#156240] shadow-none hover:bg-[#F7F7F0] hover:text-[#111210]"
                className="min-w-0"
                errorClassName="px-3 pb-2"
                label={directMessageCopy.startConversation}
                locale={locale}
                peerProfileId={moment.author.id}
                redirectPath={`/footprints/${moment.id}`}
              />
            ) : null}
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
                className="flex h-auto w-full justify-start gap-2 rounded-none bg-transparent px-3 py-2.5 text-sm font-bold text-[#9A2135] ring-0 hover:bg-[#FFF0F0]"
                isAuthenticated={isAuthenticated}
                locale={locale}
                redirectPath={`/footprints/${moment.id}`}
                targetId={moment.id}
                targetType="MOMENT"
                variant="link"
              />
            )}
          </div>
        </>
      ) : null}
    </div>
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const detailHref = withLocale(locale, `/footprints/${moment.id}`);
  const signInHref = getSignInHref(locale, `/footprints/${moment.id}`);
  const isOwnMoment = viewerProfileId === moment.author.id;
  const hasImages = moment.images.length > 0;
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
        className="cursor-pointer overflow-visible bg-transparent pb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30"
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleDetailKeyDown}
      >
        <div>
          <div className="flex items-start gap-3 px-0 pb-2 pt-1">
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
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold leading-5 text-[#111210]">
                    {moment.author.nickname}
                  </p>
                  <p className="text-xs font-semibold text-[#6C746A]">
                    {formatActivityDate(moment.createdAt, locale)}
                  </p>
                </div>
              </div>
              {!hasImages && moment.content ? (
                <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-[#1D1D1B]">
                  {moment.content}
                </p>
              ) : null}
            </div>
            <MomentMoreMenu
              className="ml-auto shrink-0"
              copy={copy}
              deleteRedirectPath={deleteRedirectPath}
              detailHref={detailHref}
              isAuthenticated={isAuthenticated}
              isOwnMoment={isOwnMoment}
              locale={locale}
              moment={moment}
              showDetailAction
            />
          </div>

          {moment.resharedMoment ? (
            <SharedMomentPreview
              copy={copy}
              locale={locale}
              moment={moment.resharedMoment}
            />
          ) : null}

          {moment.images.length > 0 ? (
            <div className="pl-[3.25rem]">
              <MomentImageGrid
                images={moment.images}
                onImageClick={setPreviewIndex}
                variant="feed"
              />
            </div>
          ) : null}

          {hasImages && moment.content ? (
            <p className="mt-3 whitespace-pre-wrap pl-[3.25rem] pr-1 text-[14px] font-semibold leading-6 text-[#1D1D1B]">
              {moment.content}
            </p>
          ) : null}
        </div>

        <MomentActionBar
          className="ml-[3.25rem] mt-2 max-w-[15rem] py-0.5"
          copy={copy}
          isAuthenticated={isAuthenticated}
          isOwnMoment={isOwnMoment}
          locale={locale}
          moment={moment}
          onCommentClick={() => setCommentsOpen(true)}
          signInHref={signInHref}
        />

        {moment.recentComments.length > 0 ? (
          <button
            type="button"
            className="mb-3 ml-[3.25rem] block w-[calc(100%-3.25rem)] rounded-2xl bg-[#F7F7F0] px-3 py-2 text-left transition hover:bg-[#F1F2EC]"
            onClick={() => setCommentsOpen(true)}
          >
            {moment.recentComments.slice(0, 2).map((comment) => (
              <span
                key={comment.id}
                className="block truncate text-[12px] font-semibold leading-5 text-[#1D1D1B]/78"
              >
                <span className="font-bold text-[#156240]">
                  {comment.author.nickname}
                </span>
                <span className="mx-1">:</span>
                {comment.content}
              </span>
            ))}
            {moment.commentCount > 2 ? (
              <span className="mt-1 block text-[12px] font-bold text-[#156240]">
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const detailHref = withLocale(locale, `/footprints/${moment.id}`);
  const signInHref = getSignInHref(locale, `/footprints/${moment.id}`);
  const isOwnMoment = viewerProfileId === moment.author.id;

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
            <p className="truncate text-[15px] font-bold leading-5 text-[#111210]">
              {moment.author.nickname}
            </p>
            <p className="text-xs font-semibold text-[#6C746A]">
              {formatActivityDate(moment.createdAt, locale)}
            </p>
          </div>
          <MomentMoreMenu
            className="ml-auto shrink-0"
            copy={copy}
            deleteRedirectPath={deleteRedirectPath}
            detailHref={detailHref}
            isAuthenticated={isAuthenticated}
            isOwnMoment={isOwnMoment}
            locale={locale}
            moment={moment}
            showDetailAction={false}
          />
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
              variant="detail"
            />
          </div>
        ) : null}

        <MomentActionBar
          className="mt-5 border-y border-[#E8E4D4] py-2"
          commentHref="#moment-comments"
          copy={copy}
          isAuthenticated={isAuthenticated}
          isOwnMoment={isOwnMoment}
          locale={locale}
          moment={moment}
          signInHref={signInHref}
        />
      </article>

      <section id="moment-comments" className="border-t border-[#E8E4D4] pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold leading-none text-[#111210]">
            {copy.commentSheetTitle}
          </h2>
          <span className="rounded-full bg-[#F3F8EB] px-2.5 py-1 text-xs font-bold text-[#156240]">
            {moment.commentCount}
          </span>
        </div>

        <div className="mb-5 overflow-hidden rounded-[1.15rem] border border-[#E3DCC5] bg-white">
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
                className="flex h-11 items-center justify-center rounded-full bg-[#156240] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)]"
              >
                {copy.signInToInteract}
              </Link>
            </div>
          )}
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
                    <p className="truncate text-[13px] font-bold text-[#111210]">
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
            <p className="text-sm font-bold text-[#111210]">
              {copy.emptyComments}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#8E8383]">
              {copy.commentPlaceholder}
            </p>
          </div>
        )}
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
  className,
  copy,
  formClassName,
  isAuthenticated,
  locale,
  moment,
  signInHref,
}: {
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  formClassName?: string;
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
          "h-[18px] w-[18px] shrink-0",
          optimisticLike.isLiked ? "fill-current" : null,
        )}
      />
      <span className="min-w-0 friemi-tabular leading-none">
        {optimisticLike.count}
      </span>
    </>
  );

  if (!isAuthenticated) {
    return (
      <Link
        href={signInHref}
        className={cn(
          "inline-flex items-center gap-2 rounded-full py-2 text-sm font-bold",
          className,
        )}
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
      className={formClassName}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="momentId" type="hidden" value={moment.id} />
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 rounded-full py-2 text-sm font-bold",
          className,
          optimisticLike.isLiked ? "text-[#E7457A]" : null,
        )}
        aria-label={copy.like}
      >
        {content}
      </button>
    </form>
  );
}

function MomentGiftAction({
  className,
  copy,
  isAuthenticated,
  isOwnMoment,
  locale,
  moment,
}: {
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  isAuthenticated: boolean;
  isOwnMoment: boolean;
  locale: string;
  moment: MomentFeedItemViewModel;
}) {
  const triggerClassName = cn(
    className,
    "text-[#9A2135] hover:bg-[#FFF4F4] focus-visible:ring-[#E7457A]/24",
  );
  const triggerContent = (
    <>
      <Gift className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 friemi-tabular leading-none">
        {moment.giftCount}
      </span>
    </>
  );

  if (isOwnMoment) {
    return (
      <button
        aria-label={copy.gift}
        className={cn(triggerClassName, "cursor-default")}
        disabled
        type="button"
      >
        {triggerContent}
      </button>
    );
  }

  return (
    <CharmGiftDialog
      isAuthenticated={isAuthenticated}
      locale={locale}
      recipientName={moment.author.nickname}
      recipientProfileId={moment.author.id}
      redirectPath={`/footprints/${moment.id}`}
      sourceContextId={moment.id}
      sourceSurface="MOMENT"
      triggerAriaLabel={copy.gift}
      triggerClassName={triggerClassName}
      triggerContent={triggerContent}
    />
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
        <span className="block text-[11px] font-bold text-[#156240]">
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
            <h2 className="text-[15px] font-bold text-[#111210]">
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
                      <p className="truncate text-[13px] font-bold text-[#111210]">
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
              className="mx-auto mt-5 flex h-9 w-fit items-center justify-center rounded-full bg-[#F7F7F0] px-4 text-xs font-bold text-[#156240]"
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
              className="flex h-11 items-center justify-center rounded-full bg-[#156240] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)]"
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
  variant = "feed",
}: {
  images: MomentFeedItemViewModel["images"];
  onImageClick: (index: number) => void;
  variant?: "detail" | "feed";
}) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const [image] = images;
    const width = image.width ?? 1;
    const height = image.height ?? 1;
    const isWide = width / height >= 1.18;
    const isTall = height / width >= 1.18;

    return (
      <div
        className={cn(
          variant === "feed"
            ? isWide
              ? "w-[min(14.5rem,72vw)]"
              : isTall
                ? "w-[min(10.8rem,54vw)]"
                : "w-[min(12.5rem,62vw)]"
            : "w-full",
        )}
      >
        <MomentImageFrame
          imageUrl={image.url}
          ratio={
            isWide ? "aspect-[4/3]" : isTall ? "aspect-[3/4]" : "aspect-square"
          }
          onClick={() => onImageClick(0)}
        />
      </div>
    );
  }

  const visibleImages = images.slice(0, 9);
  const useTwoColumns = images.length === 2 || images.length === 4;

  return (
    <div
      className={cn(
        "grid gap-1.5",
        useTwoColumns
          ? "w-[min(11.75rem,58vw)] grid-cols-2"
          : "w-[min(15rem,74vw)] grid-cols-3",
        variant === "detail" && "w-full",
      )}
    >
      {visibleImages.map((image, index) => (
        <MomentImageFrame
          key={image.id}
          imageUrl={image.url}
          moreCount={
            images.length > visibleImages.length &&
            index === visibleImages.length - 1
              ? images.length - visibleImages.length
              : 0
          }
          onClick={() => onImageClick(index)}
          ratio="aspect-square"
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
        <span className="absolute inset-0 flex items-center justify-center bg-[#1D1D1B]/42 text-2xl font-bold text-white">
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
        <span className="text-sm font-bold">
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
          className="text-[11px] font-bold text-[#9A2135]/82"
        >
          {copy.delete}
        </button>
      </form>
    );
  }

  return (
    <ReportDialog
      className="h-auto rounded-none bg-transparent px-0 text-[11px] font-bold text-[#9A2135]/82 ring-0"
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

const maxMomentImageCount = 6;
const momentImageUploadConcurrency = 3;

type MomentImageUploadErrorCode =
  | "BUCKET_NOT_AVAILABLE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "MISSING_FILE"
  | "STORAGE_NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "UNSUPPORTED_FILE_TYPE"
  | "UPLOAD_FAILED";

type MomentImageUploadItem =
  | {
      id: string;
      status: "uploaded";
      url: string;
    }
  | {
      error?: string;
      file: File;
      id: string;
      previewUrl: string;
      status: "failed" | "uploading";
    };

function MomentImageUploadGrid({
  className,
  copy,
  initialUrls,
  onPendingChange,
}: {
  className?: string;
  copy: ReturnType<typeof getFootprintsCopy>;
  initialUrls: string[];
  onPendingChange: (hasPendingUploads: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const [error, setError] = useState("");
  const [items, setItems] = useState<MomentImageUploadItem[]>(() =>
    initialUrls.slice(0, maxMomentImageCount).map((url, index) => ({
      id: `initial-${index}-${url}`,
      status: "uploaded",
      url,
    })),
  );
  const uploadingCount = items.filter(
    (item) => item.status === "uploading",
  ).length;
  const failedUploadItem = items.find((item) => item.status === "failed");
  const failedUploadError =
    failedUploadItem?.status === "failed" ? failedUploadItem.error : undefined;
  const hasPendingUploads = items.some((item) => item.status !== "uploaded");

  useEffect(() => {
    onPendingChange(hasPendingUploads);
  }, [hasPendingUploads, onPendingChange]);

  useEffect(
    () => () => {
      uploadControllersRef.current.forEach((controller) => controller.abort());
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      uploadControllersRef.current.clear();
      previewUrlsRef.current.clear();
    },
    [],
  );

  function getUploadErrorMessage(code?: string) {
    if (code === "UNSUPPORTED_FILE_TYPE") {
      return copy.photoTypeError;
    }

    if (code === "FILE_TOO_LARGE") {
      return copy.photoSizeError;
    }

    if (code === "INVALID_IMAGE_CONTENT") {
      return copy.photoInvalidContentError;
    }

    if (code === "STORAGE_NOT_CONFIGURED" || code === "BUCKET_NOT_AVAILABLE") {
      return copy.photoStorageError;
    }

    return copy.photoUploadFailed;
  }

  function releasePreview(previewUrl: string) {
    if (!previewUrlsRef.current.has(previewUrl)) {
      return;
    }

    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(previewUrl);
  }

  async function uploadItem(
    item: Extract<MomentImageUploadItem, { file: File }>,
  ) {
    const controller = new AbortController();
    uploadControllersRef.current.set(item.id, controller);

    try {
      const formData = new FormData();
      formData.append("file", item.file);

      const response = await fetch("/api/uploads/moment-image", {
        body: formData,
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: MomentImageUploadErrorCode;
        url?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        const message = getUploadErrorMessage(payload?.error);
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id && currentItem.status !== "uploaded"
              ? { ...currentItem, error: message, status: "failed" }
              : currentItem,
          ),
        );
        setError(message);
        return;
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { id: item.id, status: "uploaded", url: payload.url! }
            : currentItem,
        ),
      );
      window.setTimeout(() => releasePreview(item.previewUrl), 0);
    } catch (uploadError) {
      if (
        uploadError instanceof DOMException &&
        uploadError.name === "AbortError"
      ) {
        return;
      }

      const message = copy.photoUploadFailed;
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id && currentItem.status !== "uploaded"
            ? { ...currentItem, error: message, status: "failed" }
            : currentItem,
        ),
      );
      setError(message);
    } finally {
      uploadControllersRef.current.delete(item.id);
    }
  }

  async function uploadBatch(
    batch: Array<Extract<MomentImageUploadItem, { file: File }>>,
  ) {
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < batch.length) {
        const item = batch[nextIndex];
        nextIndex += 1;

        if (item) {
          await uploadItem(item);
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(momentImageUploadConcurrency, batch.length) },
        () => worker(),
      ),
    );
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || uploadingCount > 0) {
      return;
    }

    const remainingCount = maxMomentImageCount - items.length;

    if (remainingCount <= 0) {
      setError(copy.photoLimitError);
      return;
    }

    const selectedFiles = Array.from(fileList);
    const acceptedFiles: File[] = [];
    const selectionErrors = new Set<string>();

    selectedFiles.forEach((file) => {
      const validationError = getImageUploadClientValidationError(file);

      if (validationError === "UNSUPPORTED_FILE_TYPE") {
        selectionErrors.add(copy.photoTypeError);
        return;
      }

      if (validationError === "FILE_TOO_LARGE") {
        selectionErrors.add(copy.photoSizeError);
        return;
      }

      if (acceptedFiles.length < remainingCount) {
        acceptedFiles.push(file);
      } else {
        selectionErrors.add(copy.photoLimitError);
      }
    });

    if (acceptedFiles.length === 0) {
      setError([...selectionErrors][0] ?? copy.photoUploadFailed);
      return;
    }

    const timestamp = Date.now();
    const uploadItems = acceptedFiles.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);

      return {
        file,
        id: `${timestamp}-${index}-${file.name}-${file.lastModified}`,
        previewUrl,
        status: "uploading" as const,
      };
    });

    setError([...selectionErrors].join(" "));
    setItems((current) => [...current, ...uploadItems]);
    void uploadBatch(uploadItems);
  }

  function removeItem(item: MomentImageUploadItem) {
    if (item.status === "uploading") {
      return;
    }

    if (item.status === "failed") {
      releasePreview(item.previewUrl);
    }

    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
    setError("");
  }

  function retryItem(item: Extract<MomentImageUploadItem, { file: File }>) {
    if (item.status !== "failed" || uploadingCount > 0) {
      return;
    }

    const retryingItem = {
      ...item,
      error: undefined,
      status: "uploading" as const,
    };
    setError("");
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? retryingItem : currentItem,
      ),
    );
    void uploadBatch([retryingItem]);
  }

  return (
    <div className={cn("min-w-0", className)}>
      <input
        ref={inputRef}
        accept={acceptedImageInputTypes}
        className="hidden"
        disabled={uploadingCount > 0 || items.length >= maxMomentImageCount}
        multiple
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
        type="file"
      />
      {items
        .filter((item) => item.status === "uploaded")
        .map((item) => (
          <input
            key={item.id}
            name="imageUrls"
            type="hidden"
            value={item.url}
          />
        ))}

      <div className="flex min-w-0 flex-wrap gap-2">
        {items.map((item) => {
          const imageUrl =
            item.status === "uploaded" ? item.url : item.previewUrl;

          return (
            <div
              key={item.id}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F1F2EC] ring-1 ring-[#E3DCC5]"
            >
              {/* Local previews and uploaded photos both need native URL support. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={imageUrl}
              />

              {item.status === "uploading" ? (
                <span className="absolute inset-0 grid place-items-center bg-[#111210]/38 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </span>
              ) : null}

              {item.status === "failed" ? (
                <button
                  aria-label={copy.photoRetry}
                  className="absolute inset-0 grid place-items-center bg-[#9A2135]/58 text-white transition hover:bg-[#9A2135]/68"
                  onClick={() => retryItem(item)}
                  title={copy.photoRetry}
                  type="button"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              ) : null}

              {item.status !== "uploading" ? (
                <button
                  aria-label={copy.photoRemove}
                  className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/92 text-[#9A2135] shadow-sm ring-1 ring-[#E3DCC5] transition active:scale-95"
                  onClick={() => removeItem(item)}
                  title={copy.photoRemove}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}

        {items.length < maxMomentImageCount ? (
          <button
            aria-label={copy.addPhoto}
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full border border-[#E3DCC5] bg-[#F7F7F0] px-3 text-xs font-bold text-[#156240] transition hover:bg-[#F1F2EC] active:scale-[0.98] disabled:cursor-wait disabled:opacity-55"
            disabled={uploadingCount > 0}
            onClick={() => inputRef.current?.click()}
            title={copy.addPhoto}
            type="button"
          >
            {uploadingCount > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>{copy.addPhoto}</span>
          </button>
        ) : null}
      </div>

      {uploadingCount > 0 ? (
        <p className="mt-2 text-xs font-semibold text-[#6C746A]" role="status">
          {copy.photoUploading(uploadingCount)}
        </p>
      ) : error || failedUploadError ? (
        <p className="mt-2 text-xs font-semibold text-[#9A2135]" role="alert">
          {error || failedUploadError}
        </p>
      ) : null}
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
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#E3DCC5] bg-[#F7F7F0] px-2.5 text-[11px] font-bold text-[#156240]/82 transition active:scale-[0.98]"
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
          <p className="px-3 py-1.5 text-[10px] font-bold text-[#8E8383]">
            {copy.visibilityLabel}
          </p>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition",
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
  const [hasPendingImageUploads, setHasPendingImageUploads] = useState(false);
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
        <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
          <Image
            src="/illustrations/ui/take-photo.png"
            alt=""
            width={64}
            height={60}
            className="h-11 w-11 object-contain"
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
        <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
          <Image
            src="/illustrations/ui/take-photo.png"
            alt=""
            width={64}
            height={60}
            className="h-11 w-11 object-contain"
          />
        </span>
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[1.1rem] border border-[#E3DCC5] bg-white px-4 py-3 shadow-none"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="visibility" type="hidden" value={visibility} />
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-wait disabled:opacity-60"
          disabled={hasPendingImageUploads}
          onClick={() => setIsExpanded(false)}
          aria-label={copy.composer}
        >
          <ProfileAvatar
            avatarUrl={profile.avatarUrl}
            name={profile.nickname}
          />
          <div className="min-w-0 flex-1">
            <p className="min-w-0 text-[15px] font-bold leading-5 text-[#111210]">
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
        rows={4}
        placeholder={copy.composer}
        className="mt-3 min-h-[6.4rem] w-full resize-none border-0 border-b border-[#E3DCC5] bg-transparent px-0 py-2 text-sm font-semibold leading-6 outline-none transition placeholder:text-[#8E8383]/72 focus:border-[#369758]"
        defaultValue={state.ok ? "" : state.values?.content}
      />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <MomentImageUploadGrid
          key={state.ok ? "moment-images-empty" : "moment-images-active"}
          className="flex-1"
          copy={copy}
          initialUrls={state.ok ? [] : (state.values?.imageUrls ?? [])}
          onPendingChange={setHasPendingImageUploads}
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="h-10 rounded-full bg-[#F7F7F0] px-4 text-xs font-bold text-[#1D1D1B]/70 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
            disabled={hasPendingImageUploads}
            onClick={() => setIsExpanded(false)}
          >
            {locale === "fr" ? "Annuler" : locale === "en" ? "Cancel" : "取消"}
          </button>
          <button
            type="submit"
            disabled={isPending || hasPendingImageUploads}
            className="h-10 rounded-full bg-[#156240] px-5 text-sm font-bold text-white shadow-none transition active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? copy.composerSubmitting : copy.composerSubmit}
          </button>
        </div>
      </div>

      {state.formError ? (
        <p className="mt-3 text-xs font-semibold text-[#9A2135]">
          {state.formError}
        </p>
      ) : null}
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
      <p className="text-[16px] font-bold leading-6 text-[#111210]">{title}</p>
      <p className="mx-auto mt-2 max-w-[18rem] text-sm font-semibold leading-6 text-[#8E8383]">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)]"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

function FootprintsMessageList({
  activityRoomChats,
  currentUserProfileId,
  friends,
  hasError,
  locale,
  planetChats,
}: {
  currentUserProfileId: string;
  activityRoomChats: ActivityRoomChatRosterItemViewModel[];
  friends: DirectMessageFriendRosterItemViewModel[];
  hasError?: boolean;
  locale: string;
  planetChats: PlanetChatRosterItemViewModel[];
}) {
  const t = getDirectMessagesCopy(locale);
  const pageCopy = getFootprintsCopy(locale);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<PlanetChatListFilter>("all");
  const [hasRestoredListState, setHasRestoredListState] = useState(false);
  const returnHref = useMemo(
    () =>
      buildPlanetChatListReturnHref({
        filter: activeFilter,
        locale,
        query: searchTerm,
      }),
    [activeFilter, locale, searchTerm],
  );

  useEffect(() => {
    const restoredState = getPlanetChatListState(window.location.search);
    const restoredHref = buildPlanetChatListReturnHref({
      ...restoredState,
      locale,
    });
    const savedScrollPosition = window.sessionStorage.getItem(
      getPlanetChatListScrollStorageKey(restoredHref),
    );

    setActiveFilter(restoredState.filter);
    setSearchTerm(restoredState.query);
    setHasRestoredListState(true);

    if (savedScrollPosition) {
      window.sessionStorage.removeItem(
        getPlanetChatListScrollStorageKey(restoredHref),
      );
      window.requestAnimationFrame(() => {
        window.scrollTo({
          behavior: "instant",
          top: Number(savedScrollPosition) || 0,
        });
      });
    }
  }, [locale]);

  useEffect(() => {
    if (!hasRestoredListState) {
      return;
    }

    const currentHref = window.location.pathname + window.location.search;

    if (currentHref !== returnHref) {
      window.history.replaceState(window.history.state, "", returnHref);
    }
  }, [hasRestoredListState, returnHref]);
  const sortedEntries = useMemo(() => {
    const directEntries = friends.map((friend) => ({
      kind: "direct" as const,
      id: friend.rosterId,
      searchText: [
        friend.friend.nickname,
        friend.friend.friendCode,
        friend.friend.bio,
        friend.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" "),
      sortTime: new Date(
        friend.lastMessage?.createdAt ??
          friend.lastMessageAt ??
          friend.createdAt,
      ).getTime(),
      hasContent: Boolean(friend.lastMessage),
      isFollowing: friend.isFollowing,
      isMutual: friend.isMutualFollow,
      isOfficial: friend.friend.isOfficial,
      isPinned: friend.isPinned,
      friend,
    }));
    const roomEntries = activityRoomChats.map((room) => ({
      kind: "room" as const,
      id: `room:${room.id}`,
      searchText: [
        room.title,
        room.city,
        room.lastMessage?.body,
        room.lastMessage?.senderName,
      ]
        .filter(Boolean)
        .join(" "),
      sortTime: new Date(room.lastMessage?.createdAt ?? room.startAt).getTime(),
      hasContent: Boolean(room.lastMessage),
      isFollowing: false,
      isMutual: false,
      isOfficial: false,
      isPinned: room.isPinned,
      room,
    }));
    const planetEntries = planetChats.map((planet) => ({
      kind: "planet" as const,
      id: `planet:${planet.id}`,
      searchText: [
        planet.name,
        ...planet.tags,
        planet.lastMessage?.body,
        planet.lastMessage?.senderName,
      ]
        .filter(Boolean)
        .join(" "),
      sortTime: new Date(
        planet.lastMessage?.createdAt ?? planet.joinedAt,
      ).getTime(),
      hasContent: Boolean(planet.lastMessage),
      isFollowing: false,
      isMutual: false,
      isOfficial: false,
      isPinned: planet.isPinned,
      planet,
    }));

    return [...directEntries, ...roomEntries, ...planetEntries].sort(
      (entryA, entryB) =>
        Number(entryB.isPinned) - Number(entryA.isPinned) ||
        entryB.sortTime - entryA.sortTime ||
        entryA.id.localeCompare(entryB.id),
    );
  }, [activityRoomChats, friends, planetChats]);
  const visibleEntries = useMemo(
    () =>
      filterUnifiedChatRosterEntries(sortedEntries, activeFilter, searchTerm),
    [activeFilter, searchTerm, sortedEntries],
  );
  const directUnreadTotal = friends.reduce(
    (total, friend) => total + (friend.isMuted ? 0 : friend.unreadCount),
    0,
  );
  const roomUnreadTotal = activityRoomChats.reduce(
    (total, room) => total + (room.isMuted ? 0 : room.unreadCount),
    0,
  );
  const planetUnreadTotal = planetChats.reduce(
    (total, planet) => total + (planet.isMuted ? 0 : planet.unreadCount),
    0,
  );
  const mutualUnreadTotal = friends
    .filter((friend) => friend.isMutualFollow && !friend.isMuted)
    .reduce((total, friend) => total + friend.unreadCount, 0);
  const followingUnreadTotal = friends
    .filter((friend) => friend.isFollowing && !friend.isMuted)
    .reduce((total, friend) => total + friend.unreadCount, 0);
  const officialUnreadTotal = friends
    .filter((friend) => friend.friend.isOfficial && !friend.isMuted)
    .reduce((total, friend) => total + friend.unreadCount, 0);
  const filters: Array<{
    count: number;
    icon: ComponentType<{ className?: string }>;
    iconClassName: string;
    iconFrameClassName: string;
    key: PlanetChatListFilter;
    label: string;
  }> = [
    {
      count: directUnreadTotal + roomUnreadTotal + planetUnreadTotal,
      icon: MessageCircle,
      iconClassName: "text-[#156240]",
      iconFrameClassName: "bg-[#ECF5EF]",
      key: "all",
      label: pageCopy.messageFilters.all,
    },
    {
      count: roomUnreadTotal + planetUnreadTotal,
      icon: UsersRound,
      iconClassName: "text-[#156240]",
      iconFrameClassName: "bg-[#ECF5EF]",
      key: "rooms",
      label: pageCopy.messageFilters.rooms,
    },
    {
      count: mutualUnreadTotal,
      icon: UsersRound,
      iconClassName: "text-[#6E46D6]",
      iconFrameClassName: "bg-[#F0ECFF]",
      key: "mutual",
      label: pageCopy.messageFilters.mutual,
    },
    {
      count: followingUnreadTotal,
      icon: Heart,
      iconClassName: "text-[#E7457A]",
      iconFrameClassName: "bg-[#FFF0F5]",
      key: "following",
      label: pageCopy.messageFilters.following,
    },
    {
      count: officialUnreadTotal,
      icon: BadgeCheck,
      iconClassName: "text-[#156240]",
      iconFrameClassName: "bg-[#ECF5EF]",
      key: "official",
      label: pageCopy.messageFilters.official,
    },
  ];
  const toolbar = (
    <div className="mt-4 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
      <div className="flex items-center gap-2.5">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[1rem] border border-[#E7E2D6] bg-white px-3 text-[#6F756E] shadow-[0_1px_0_rgba(29,29,27,0.025)]">
          <Search className="h-4 w-4 shrink-0 text-[#7C827B]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#111210] outline-none placeholder:text-[#9A9A90]"
          />
        </label>
        <Link
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E7E2D6] bg-white text-[#111210] shadow-[0_4px_14px_rgba(29,29,27,0.055)] transition active:scale-[0.97]"
          aria-label={t.findPeople}
          href={withLocale(locale, "/search")}
          title={t.findPeople}
        >
          <Search className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:grid lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          const Icon = filter.icon;

          return (
            <button
              key={filter.key}
              type="button"
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 pr-3 text-[12px] font-bold transition duration-150 active:scale-[0.98] lg:w-full lg:justify-start",
                isActive
                  ? "border-[#156240] bg-[#156240] text-white"
                  : "border border-[#E7E2D6] bg-white text-[#111210]",
              )}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                  isActive ? "bg-white/16" : filter.iconFrameClassName,
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive ? "text-white" : filter.iconClassName,
                  )}
                />
              </span>
              <span>{filter.label}</span>
              {filter.count > 0 ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-none",
                    isActive
                      ? "bg-white text-[#156240]"
                      : "bg-[#FFEAF1] text-[#D6245F]",
                  )}
                >
                  {filter.count > 99 ? "99+" : filter.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
  if (hasError) {
    return (
      <section className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {toolbar}
        <div className="mt-3 border-y border-[#EFE9DE] bg-transparent px-1 py-4 text-sm font-semibold leading-6 text-[#777A74] lg:mt-0">
          {t.emptyListDescription}
        </div>
      </section>
    );
  }

  if (
    friends.length === 0 &&
    activityRoomChats.length === 0 &&
    planetChats.length === 0
  ) {
    return (
      <section className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {toolbar}
        <div className="mt-3 border-y border-[#EFE9DE] bg-transparent px-1 py-6 lg:mt-0">
          <h2 className="text-[16px] font-bold leading-6 text-[#111210]">
            {t.emptyFriendListTitle}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#777A74]">
            {t.emptyFriendListDescription}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      {toolbar}
      {visibleEntries.length > 0 ? (
        <div className="mt-3 divide-y divide-[#EFE9DE] border-y border-[#EFE9DE] bg-transparent lg:mt-0">
          {visibleEntries.map((entry) =>
            entry.kind === "direct" ? (
              <FootprintsMessageRow
                key={entry.id}
                currentUserProfileId={currentUserProfileId}
                friend={entry.friend}
                locale={locale}
                showBackFollowAction={false}
              />
            ) : entry.kind === "room" ? (
              <FootprintsRoomChatRow
                key={entry.id}
                locale={locale}
                room={entry.room}
              />
            ) : (
              <FootprintsPlanetChatRow
                key={entry.id}
                locale={locale}
                planet={entry.planet}
                returnHref={returnHref}
              />
            ),
          )}
        </div>
      ) : (
        <div className="mt-3 border-y border-[#EFE9DE] bg-transparent px-1 py-6 text-sm font-semibold leading-6 text-[#777A74] lg:mt-0">
          {t.emptyListTitle}
        </div>
      )}
    </section>
  );
}

function FootprintsRoomChatRow({
  locale,
  room,
}: {
  locale: string;
  room: ActivityRoomChatRosterItemViewModel;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = room.lastMessage;
  const unreadCount = room.unreadCount;
  const unreadBadgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  const showUnreadBadge = unreadCount > 0 && !room.isMuted;
  const showMutedUnreadDot = unreadCount > 0 && room.isMuted;
  const preview = lastMessage
    ? `${lastMessage.isMine ? t.youPrefix : `${lastMessage.senderName}: `}${
        lastMessage.body.trim() || t.imageMessage
      }`
    : t.roomChatEmptyPreview;
  const time = lastMessage?.createdAt ?? room.startAt;

  return (
    <article
      className={cn(
        "min-w-0 transition-colors",
        room.isPinned
          ? "bg-[#F1F1EF] hover:bg-[#ECEDE9] active:bg-[#E6E7E3]"
          : "hover:bg-[#FAFAF8] active:bg-[#F7F7F0]",
      )}
    >
      <Link
        aria-label={t.openRoomChat(room.title)}
        className="flex min-w-0 items-center gap-3 px-1 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111210]/15"
        href={withLocale(locale, `/lobby/${room.id}/room`)}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ECF5EF] text-[#156240] ring-1 ring-[#D8E8DC]">
          {room.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              src={room.coverImageUrl}
            />
          ) : (
            <UsersRound className="h-5 w-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold leading-5 text-[#111210]">
                {room.title}
              </span>
            </span>
            <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8F9189]">
              <span className="inline-flex items-center gap-1">
                {room.isPinned ? (
                  <Pin
                    aria-label={t.pinConversation}
                    className="h-3 w-3 text-[#8F9189]"
                  />
                ) : null}
                {formatChatListTimestamp(time, locale)}
              </span>
            </span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13px] leading-5",
                showUnreadBadge
                  ? "font-bold text-[#111210]"
                  : "font-semibold text-[#5F635E]",
              )}
            >
              {preview}
            </span>
            {showUnreadBadge ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white shadow-[0_3px_8px_rgba(231,69,122,0.22)]">
                {unreadBadgeText}
              </span>
            ) : showMutedUnreadDot ? (
              <span
                aria-label={t.mutedUnreadLabel}
                className="h-2 w-2 shrink-0 rounded-full bg-[#E7457A] ring-2 ring-white"
                title={t.mutedUnreadLabel}
              />
            ) : null}
          </span>
        </span>
      </Link>
    </article>
  );
}

function FootprintsPlanetChatRow({
  locale,
  planet,
  returnHref,
}: {
  locale: string;
  planet: PlanetChatRosterItemViewModel;
  returnHref: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = planet.lastMessage;
  const unreadCount = planet.unreadCount;
  const unreadBadgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  const showUnreadBadge = unreadCount > 0 && !planet.isMuted;
  const showMutedUnreadDot = unreadCount > 0 && planet.isMuted;
  const planetLabel =
    locale === "fr"
      ? "Discussion de planète"
      : locale === "en"
        ? "Planet chat"
        : "星球群聊";
  const emptyPreview =
    locale === "fr"
      ? "Aucun message"
      : locale === "en"
        ? "No messages yet"
        : "还没有消息";
  const preview = lastMessage
    ? `${lastMessage.isMine ? t.youPrefix : `${lastMessage.senderName}: `}${
        lastMessage.body.trim() || t.imageMessage
      }`
    : emptyPreview;
  const time = lastMessage?.createdAt ?? planet.joinedAt;
  const href = `${withLocale(locale, `/planets/${planet.slug}/chat`)}?returnTo=${encodeURIComponent(returnHref)}`;

  return (
    <article
      className={cn(
        "min-w-0 transition-colors",
        planet.isPinned
          ? "bg-[#F1F1EF] hover:bg-[#ECEDE9] active:bg-[#E6E7E3]"
          : "hover:bg-[#FAFAF8] active:bg-[#F7F7F0]",
      )}
    >
      <Link
        aria-label={`${planetLabel}: ${planet.name}`}
        className="flex min-w-0 items-center gap-3 px-1 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111210]/15"
        href={href}
        onClick={() => {
          window.sessionStorage.setItem(
            getPlanetChatListScrollStorageKey(returnHref),
            String(window.scrollY),
          );
        }}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECF5EF] text-[#156240] ring-1 ring-[#D8E8DC]">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl">
            {planet.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                src={planet.coverImageUrl}
              />
            ) : (
              <Globe2 className="h-5 w-5" />
            )}
          </span>
          <span
            aria-label={planetLabel}
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#156240] text-white"
            title={planetLabel}
          >
            <Orbit className="h-3 w-3" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold leading-5 text-[#111210]">
                {planet.name}
              </span>
            </span>
            <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8F9189]">
              <span className="inline-flex items-center gap-1">
                {planet.isPinned ? (
                  <Pin
                    aria-label={t.pinConversation}
                    className="h-3 w-3 text-[#8F9189]"
                  />
                ) : null}
                {formatChatListTimestamp(time, locale)}
              </span>
            </span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13px] leading-5",
                showUnreadBadge
                  ? "font-bold text-[#111210]"
                  : "font-semibold text-[#5F635E]",
              )}
            >
              {preview}
            </span>
            {showUnreadBadge ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white shadow-[0_3px_8px_rgba(231,69,122,0.22)]">
                {unreadBadgeText}
              </span>
            ) : showMutedUnreadDot ? (
              <span
                aria-label={t.mutedUnreadLabel}
                className="h-2 w-2 shrink-0 rounded-full bg-[#E7457A] ring-2 ring-white"
                title={t.mutedUnreadLabel}
              />
            ) : null}
          </span>
        </span>
      </Link>
    </article>
  );
}

function FootprintsMessageRow({
  currentUserProfileId,
  friend,
  locale,
  showBackFollowAction,
}: {
  currentUserProfileId: string;
  friend: DirectMessageFriendRosterItemViewModel;
  locale: string;
  showBackFollowAction: boolean;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = friend.lastMessage;
  const unreadCount = friend.unreadCount;
  const unreadBadgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  const showUnreadBadge = unreadCount > 0 && !friend.isMuted;
  const showMutedUnreadDot = unreadCount > 0 && friend.isMuted;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body.trim() || t.imageMessage}`
    : t.startChat;
  const time =
    lastMessage?.createdAt ?? friend.lastMessageAt ?? friend.createdAt;
  const shouldShowBackFollow =
    showBackFollowAction && friend.relationshipKind === "followed_by";
  const followBackLabel =
    locale === "en" ? "Follow" : locale === "fr" ? "Suivre" : "回关";
  const mutualLabel =
    locale === "en" ? "Mutual" : locale === "fr" ? "Mutuel" : "互关";
  const content = (
    <>
      <MessageAvatar
        avatarUrl={friend.friend.avatarUrl}
        isOnline={friend.friend.isOnline}
        name={friend.friend.nickname}
        presenceDisplayStatus={friend.friend.presenceDisplayStatus}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-5 text-[#111210]">
            {friend.friend.nickname}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8F9189]">
            <span className="inline-flex items-center gap-1">
              {friend.isPinned ? (
                <Pin
                  aria-label={t.pinConversation}
                  className="h-3 w-3 text-[#8F9189]"
                />
              ) : null}
              {formatChatListTimestamp(time, locale)}
            </span>
          </span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-5",
              showUnreadBadge
                ? "font-bold text-[#111210]"
                : "font-semibold text-[#5F635E]",
            )}
          >
            {preview}
          </span>
          {showUnreadBadge ? (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white shadow-[0_3px_8px_rgba(231,69,122,0.22)]">
              {unreadBadgeText}
            </span>
          ) : showMutedUnreadDot ? (
            <span
              aria-label={t.mutedUnreadLabel}
              className="h-2 w-2 shrink-0 rounded-full bg-[#E7457A] ring-2 ring-white"
              title={t.mutedUnreadLabel}
            />
          ) : null}
        </span>
      </span>
    </>
  );
  const backFollowAction = shouldShowBackFollow ? (
    <div className="shrink-0 self-center">
      <FollowButton
        activeButtonClassName="!h-8 !min-h-8 rounded-full border border-[#D8E8DC] bg-[#ECF5EF] !px-3 text-[11px] font-bold text-[#156240] shadow-none"
        activeLabel={mutualLabel}
        buttonClassName="!h-8 !min-h-8 rounded-full border border-[#8AB68E] bg-white !px-3 text-[11px] font-bold text-[#156240] shadow-none"
        fullWidth={false}
        inactiveLabel={followBackLabel}
        isAuthenticated
        isFollowing={friend.isFollowing}
        locale={locale}
        redirectPath="/footprints?tab=message"
        targetUserProfileId={friend.friend.id}
      />
    </div>
  ) : null;

  return (
    <article
      className={cn(
        "min-w-0 transition-colors",
        friend.isPinned
          ? "bg-[#F1F1EF] hover:bg-[#ECEDE9] active:bg-[#E6E7E3]"
          : "hover:bg-[#FAFAF8] active:bg-[#F7F7F0]",
      )}
    >
      {friend.conversationId ? (
        <div className="flex min-w-0 items-center gap-2">
          <Link
            aria-label={t.openConversation(friend.friend.nickname)}
            className="flex min-w-0 flex-1 items-center gap-3 px-1 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111210]/15"
            href={withLocale(locale, `/messages/${friend.conversationId}`)}
          >
            {content}
          </Link>
          {backFollowAction}
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <form
            action={openDirectConversationAction}
            className="min-w-0 flex-1"
          >
            <input name="locale" type="hidden" value={locale} />
            <input
              name="redirectPath"
              type="hidden"
              value="/footprints?tab=message"
            />
            <input
              name="friendProfileId"
              type="hidden"
              value={friend.friend.id}
            />
            <button
              type="submit"
              className="flex w-full min-w-0 items-center gap-3 px-1 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111210]/15"
              aria-label={t.openConversation(friend.friend.nickname)}
            >
              {content}
            </button>
          </form>
          {backFollowAction}
        </div>
      )}
    </article>
  );
}

export function FootprintsMobilePage({
  activityRoomChats,
  initialMomentScope = "PUBLIC",
  initialTab = "moment",
  locale,
  messageFriends,
  messageRosterError = false,
  momentFeedError = false,
  moments,
  canCreatePlanet,
  planetChatRosterLoaded,
  planetChats,
  planets,
  planetSquareError = false,
  profile,
}: FootprintsMobilePageProps) {
  const copy = useMemo(() => getFootprintsCopy(locale), [locale]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FootprintsTab>(initialTab);
  const isAuthenticated = Boolean(profile);
  const [feedScope, setFeedScope] = useState<MomentFeedScope>(
    isAuthenticated ? initialMomentScope : "PUBLIC",
  );
  const signInHref = getSignInHref(
    locale,
    getFootprintsTabPath(activeTab, feedScope),
  );
  const initialUnreadMessageCount = useMemo(
    () =>
      messageFriends.reduce(
        (total, friend) => total + (friend.isMuted ? 0 : friend.unreadCount),
        0,
      ) +
      activityRoomChats.reduce(
        (total, room) => total + (room.isMuted ? 0 : room.unreadCount),
        0,
      ) +
      planetChats.reduce(
        (total, planet) => total + (planet.isMuted ? 0 : planet.unreadCount),
        0,
      ),
    [activityRoomChats, messageFriends, planetChats],
  );
  const { unreadDirectMessageCount } = useNotificationBadge(
    initialUnreadMessageCount,
  );
  const [hasMountedUnreadCount, setHasMountedUnreadCount] = useState(false);
  const lastRosterRefreshUnreadCountRef = useRef(initialUnreadMessageCount);
  const displayedUnreadMessageCount = hasMountedUnreadCount
    ? unreadDirectMessageCount
    : initialUnreadMessageCount;
  const unreadMessageBadgeText =
    displayedUnreadMessageCount > 99
      ? "99+"
      : String(displayedUnreadMessageCount);

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
  const scopedMoments = useMemo(() => {
    if (feedScope === "MINE") {
      return dedupedMoments.filter((moment) => moment.isOwnMoment);
    }

    if (feedScope === "MUTUAL") {
      return dedupedMoments.filter(
        (moment) => moment.isOwnMoment || moment.isAuthorMutualFollow,
      );
    }

    if (feedScope === "FOLLOWING") {
      return dedupedMoments.filter(
        (moment) => moment.isOwnMoment || moment.isAuthorFollowedByViewer,
      );
    }

    return dedupedMoments.filter((moment) => moment.visibility === "PUBLIC");
  }, [dedupedMoments, feedScope]);
  const feedScopeTabs: Array<{ key: MomentFeedScope; label: string }> = profile
    ? [
        { key: "PUBLIC", label: copy.feedPublic },
        { key: "MINE", label: copy.feedMine },
        { key: "MUTUAL", label: copy.feedMutual },
        { key: "FOLLOWING", label: copy.feedFollowing },
      ]
    : [{ key: "PUBLIC", label: copy.feedPublic }];

  useEffect(() => {
    if (!profile && feedScope !== "PUBLIC") {
      setFeedScope("PUBLIC");
    }
  }, [feedScope, profile]);

  useEffect(() => {
    const readUrlState = () => {
      const nextTab = getFootprintsTabFromSearch(window.location.search);
      const nextScope = getMomentScopeFromSearch(window.location.search);

      setActiveTab(nextTab ?? "moment");
      setFeedScope(profile ? nextScope : "PUBLIC");
    };

    if (!getFootprintsTabFromSearch(window.location.search)) {
      updateFootprintsHistoryUrl(
        locale,
        initialTab,
        profile ? initialMomentScope : "PUBLIC",
        "replace",
      );
    }

    window.addEventListener("popstate", readUrlState);

    return () => {
      window.removeEventListener("popstate", readUrlState);
    };
  }, [initialMomentScope, initialTab, locale, profile]);

  function handleTopTabChange(nextTab: FootprintsTab) {
    setActiveTab(nextTab);

    if (nextTab === "message" && profile && !planetChatRosterLoaded) {
      router.push(
        withLocale(locale, getFootprintsTabPath(nextTab, feedScope)),
        { scroll: false },
      );
      return;
    }

    updateFootprintsHistoryUrl(locale, nextTab, feedScope, "push");
  }

  function handleFeedScopeChange(nextScope: MomentFeedScope) {
    setFeedScope(nextScope);

    if (activeTab === "moment") {
      updateFootprintsHistoryUrl(locale, "moment", nextScope, "replace");
    }
  }

  useEffect(() => {
    lastRosterRefreshUnreadCountRef.current = initialUnreadMessageCount;
  }, [initialUnreadMessageCount]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasMountedUnreadCount(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!profile || activeTab !== "message" || !hasMountedUnreadCount) {
      return;
    }

    if (unreadDirectMessageCount === lastRosterRefreshUnreadCountRef.current) {
      return;
    }

    lastRosterRefreshUnreadCountRef.current = unreadDirectMessageCount;
    router.refresh();
  }, [
    activeTab,
    profile,
    router,
    hasMountedUnreadCount,
    unreadDirectMessageCount,
  ]);

  return (
    <>
      <DirectMessageUnreadCountHydrator
        unreadCount={initialUnreadMessageCount}
      />
      <main className="min-h-screen bg-white pb-28 text-[#111210] md:pb-12">
        <div className="mx-auto min-h-screen max-w-md bg-white px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:min-h-[calc(100vh-4rem)] md:max-w-7xl md:px-8 md:pb-12 md:pt-8 lg:px-10 xl:px-12">
          <header className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 border-b border-[#E3DCC5] pb-5 lg:flex lg:items-end lg:justify-between lg:gap-10 lg:pb-0">
            <h1 className="pb-3 text-[30px] font-bold leading-none tracking-normal text-[#111210] lg:pb-5 lg:text-[36px]">
              {copy.title}
            </h1>
            <nav className="grid min-w-0 translate-y-4 grid-cols-3 text-center lg:flex lg:w-[30rem] lg:self-stretch lg:translate-y-0">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={cn(
                      "relative min-w-0 px-1 pb-3 text-[13px] font-bold tracking-normal transition lg:flex lg:flex-1 lg:items-end lg:justify-center lg:px-5 lg:pb-5 lg:pt-3 lg:text-sm",
                      active ? "text-[#111210]" : "text-[#1D1D1B]/58",
                    )}
                    onClick={() => handleTopTabChange(tab.key)}
                  >
                    <span className="relative mx-auto inline-flex max-w-full items-center justify-center">
                      <span className="block truncate whitespace-nowrap">
                        {tab.label}
                      </span>
                      {tab.key === "message" &&
                      displayedUnreadMessageCount > 0 ? (
                        <span
                          aria-label={unreadMessageBadgeText}
                          className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-[#E7457A] ring-2 ring-[#FEFFF9]"
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "absolute inset-x-0 -bottom-px mx-auto h-[3px] w-9 rounded-full bg-[#156240] transition",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </header>

          {activeTab === "moment" ? (
            <section className="mt-5 space-y-5 md:mt-8 lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
              <div className="space-y-4 lg:sticky lg:top-24">
                <MomentComposer copy={copy} locale={locale} profile={profile} />

                <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 text-[11px] font-bold text-[#156240] ring-1 ring-[#E3DCC5] [scrollbar-width:none] lg:grid lg:w-full lg:grid-cols-2 lg:gap-2 lg:overflow-visible lg:rounded-none lg:p-0 lg:ring-0 [&::-webkit-scrollbar]:hidden">
                  {feedScopeTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={cn(
                        "h-7 shrink-0 rounded-full px-3.5 transition lg:w-full",
                        feedScope === tab.key
                          ? "bg-[#156240] text-white"
                          : "bg-[#F7F8F4] text-[#156240]",
                      )}
                      onClick={() => handleFeedScopeChange(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                {momentFeedError ? (
                  <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-5 text-sm font-semibold leading-6 text-[#8E8383] md:mx-auto md:max-w-2xl lg:max-w-none">
                    {copy.feedError}
                  </div>
                ) : scopedMoments.length > 0 ? (
                  <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
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
                  <div className="rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-6 text-center shadow-[0_12px_34px_rgba(21,98,64,0.06)] md:mx-auto md:max-w-2xl lg:max-w-none">
                    <p className="text-[15px] font-bold text-[#111210]">
                      {copy.emptyFeedTitle}
                    </p>
                    <p className="mx-auto mt-2 max-w-[17rem] text-sm font-semibold leading-6 text-[#8E8383]">
                      {copy.emptyFeedDescription}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "message" ? (
            <section className="md:mx-auto md:max-w-5xl lg:mt-8">
              {profile ? (
                <FootprintsMessageList
                  currentUserProfileId={profile.id}
                  activityRoomChats={activityRoomChats}
                  friends={messageFriends}
                  hasError={messageRosterError}
                  locale={locale}
                  planetChats={planetChats}
                />
              ) : (
                <div className="mt-5 lg:mx-auto lg:max-w-2xl">
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
            <section className="mt-5 md:mx-auto md:max-w-6xl lg:mt-8">
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
    </>
  );
}
