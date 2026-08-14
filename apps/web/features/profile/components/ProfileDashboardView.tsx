"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Copy,
  Crown,
  Gift,
  Heart,
  HeartHandshake,
  Info,
  Lock,
  LoaderCircle,
  MapPin,
  Medal,
  MessageCircle,
  MoreHorizontal,
  Package,
  PencilLine,
  ScanLine,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Trophy,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import { FollowButton } from "@/features/follow/components/FollowButton";
import {
  updateProfileRemarkAction,
  type UpdateProfileRemarkState,
} from "@/features/profile/actions/updateProfileRemark";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import {
  isDetailSourceReturnPage,
  readDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import {
  canUseNativeAndroidQrScanner,
  parseAndroidQrScanPayload,
  resolveGlobalQrScanDestination,
} from "@/features/scan/globalQrScanner";
import {
  charmLevels,
  getCharmLevelDescription,
  getCharmLevelLabel,
  getCharmProgress,
} from "@/features/charm/charm";
import { CharmGiftDialog } from "@/features/charm/components/CharmGiftDialog";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import { achievementCatalog } from "@/features/achievements/achievementCatalog";
import type { PublicAchievementWallItem } from "@/features/achievements/queries/getUserAchievements";
import {
  ProfileActivitySections,
  type ProfileSectionKey,
} from "./ProfileActivitySections";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";
import { ProfileIdentityForm } from "./ProfileIdentityForm";
import { ProfileAvatarPicker } from "./ProfileAvatarPicker";
import {
  ProfileAchievementBadgeStrip,
  ProfileAchievementIcon,
} from "./ProfilePublicAchievementWall";
import { ProfileOverviewPanel } from "./ProfileOverviewPanel";
import { ProfileSocialActions } from "./ProfileSocialActions";
import { useViewerProfile } from "./ViewerProfileProvider";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";
import {
  updateProfilePresenceAction,
  type UpdateProfilePresenceState,
} from "../actions/updateProfilePresence";
import {
  getPresenceCopy,
  userPresenceStatuses,
  type UserPresenceDisplayStatus,
  type UserPresenceStatusValue,
} from "../presence";
import { getNicknameChangeAvailableAt } from "../nicknameChangePolicy";
import type {
  ProfileDashboardViewModel,
  PublicProfileViewModel,
} from "../queries/getProfileDashboard";

type ProfileDashboardViewProps = {
  dashboard: ProfileDashboardViewModel;
  hasDashboardError?: boolean;
  isAuthenticated?: boolean;
  isGuestPlaceholder?: boolean;
  isSelf?: boolean;
  locale: string;
  profile: PublicProfileViewModel;
  achievementPreviewItems?: PublicAchievementWallItem[];
  publicAchievements?: PublicAchievementWallItem[];
};

const profilePresenceInitialState: UpdateProfilePresenceState = {};
const profileRemarkInitialState: UpdateProfileRemarkState = {};

function getSelfProfileMetricLabels(locale: string) {
  if (locale === "fr") {
    return {
      created: "Créés",
      joined: "Rejoints",
      pastJoined: "Passées",
    };
  }

  if (locale === "en") {
    return {
      created: "Created",
      joined: "Joined",
      pastJoined: "Past",
    };
  }

  return {
    created: "发起",
    joined: "参与",
    pastJoined: "参加过",
  };
}

function getWerewolfStatsCopy(locale: string) {
  if (locale === "fr") {
    return {
      judge: "Maître",
      loss: "Défaites",
      played: "Parties",
      title: "Loups-garous",
      win: "Victoires",
      winRate: "Taux de victoire",
    };
  }

  if (locale === "en") {
    return {
      judge: "Judge",
      loss: "Losses",
      played: "Games",
      title: "Werewolf",
      win: "Wins",
      winRate: "Win rate",
    };
  }

  return {
    judge: "法官",
    loss: "失败",
    played: "局数",
    title: "狼人杀",
    win: "胜利",
    winRate: "胜率",
  };
}

function getTrustBadgeCopy(locale: string, score: number) {
  if (locale === "fr") {
    return {
      label: `Fiabilité ${score}`,
      tooltip: "Fiabilité",
    };
  }

  if (locale === "en") {
    return {
      label: `Trust ${score}`,
      tooltip: "Trust",
    };
  }

  return {
    label: `信用值 ${score}`,
    tooltip: "信用值",
  };
}

const defaultProfileHomeCity = "Paris";
const profileCityCountries = [
  {
    cities: [
      "Paris",
      "Lyon",
      "Marseille",
      "Toulouse",
      "Nice",
      "Nantes",
      "Strasbourg",
      "Montpellier",
      "Bordeaux",
      "Lille",
      "Rennes",
      "Grenoble",
      "Dijon",
      "Reims",
      "Tours",
      "Angers",
      "Avignon",
      "Rouen",
    ],
    key: "FR",
    labels: {
      "zh-CN": "法国",
      en: "France",
      fr: "France",
    },
  },
  {
    cities: [
      "北京",
      "上海",
      "广州",
      "深圳",
      "杭州",
      "成都",
      "南京",
      "武汉",
      "西安",
      "重庆",
      "苏州",
      "天津",
    ],
    key: "CN",
    labels: {
      "zh-CN": "中国",
      en: "China",
      fr: "Chine",
    },
  },
  {
    cities: [
      "Berlin",
      "Munich",
      "Hamburg",
      "Frankfurt",
      "Cologne",
      "Düsseldorf",
      "Stuttgart",
    ],
    key: "DE",
    labels: {
      "zh-CN": "德国",
      en: "Germany",
      fr: "Allemagne",
    },
  },
  {
    cities: ["Rome", "Milan", "Florence", "Turin", "Bologna", "Venice"],
    key: "IT",
    labels: {
      "zh-CN": "意大利",
      en: "Italy",
      fr: "Italie",
    },
  },
  {
    cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao", "Granada"],
    key: "ES",
    labels: {
      "zh-CN": "西班牙",
      en: "Spain",
      fr: "Espagne",
    },
  },
  {
    cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
    key: "NL",
    labels: {
      "zh-CN": "荷兰",
      en: "Netherlands",
      fr: "Pays-Bas",
    },
  },
  {
    cities: ["Brussels", "Antwerp", "Ghent", "Leuven"],
    key: "BE",
    labels: {
      "zh-CN": "比利时",
      en: "Belgium",
      fr: "Belgique",
    },
  },
  {
    cities: ["Geneva", "Zurich", "Lausanne", "Basel", "Bern"],
    key: "CH",
    labels: {
      "zh-CN": "瑞士",
      en: "Switzerland",
      fr: "Suisse",
    },
  },
  {
    cities: [
      "London",
      "Manchester",
      "Birmingham",
      "Edinburgh",
      "Oxford",
      "Cambridge",
    ],
    key: "UK",
    labels: {
      "zh-CN": "英国",
      en: "United Kingdom",
      fr: "Royaume-Uni",
    },
  },
] as const;

function normalizeProfileHomeCity(value: string | null | undefined) {
  const normalizedCity = value?.trim();

  return normalizedCity || defaultProfileHomeCity;
}

function getProfileHomeCityLabel(
  city: string | null | undefined,
  _locale: string,
) {
  return normalizeProfileHomeCity(city);
}

function getMobileProfileCopy(locale: string) {
  if (locale === "fr") {
    return {
      accountSecurity: "Compte et sécurité",
      accountSettings: "Paramètres du compte",
      achievements: "Badges",
      addFriend: "Suivre",
      available: "Ouvert",
      bag: "Sac",
      charm: "Aura",
      charmLevelsClose: "Compris",
      charmLevelsCurrent: "Niveau actuel",
      charmLevelsIntro:
        "Les cadeaux recus augmentent votre aura. Elle montre la popularite, pas la fiabilite.",
      charmLevelsOpen: "Voir les niveaux d'aura",
      charmLevelsScore: "Aura",
      charmLevelsStartingAt: "a partir de",
      charmLevelsTitle: "Niveaux d'aura",
      copyCode: "Copier",
      copied: "Copié",
      created: "Sorties",
      editProfile: "Modifier",
      friends: "Réseau",
      friendsFeature: "Amis",
      giftWall: "Cadeaux",
      hangoutsTitle: "Mes sorties",
      invite: "Inviter",
      inviteCode: "Code",
      maxCharm: "Niveau max",
      message: "Message",
      moments: "Moments",
      myHangouts: "Mes sorties",
      myHangoutsCreated: "Créées",
      myHangoutsJoined: "Rejointes",
      myHangoutsSaved: "Favoris",
      myMoments: "Mes moments",
      more: "Plus",
      networkTitle: "Réseau",
      noMyHangouts: "Aucune sortie créée.",
      noMyMoments: "Aucun moment publié.",
      noTimeline: "Aucune activité publique pour le moment.",
      nextCharm: "Prochain",
      unfollowCancel: "Annuler",
      unfollowConfirm: "Confirmer",
      unfollowDescription: "Vous ne serez plus en suivi mutuel.",
      unfollowTitle: "Ne plus suivre ?",
      followBack: "Suivre aussi",
      mutualFollow: "Mutuel",
      pendingFriend: "Suivi",
      profileTitle: "Profile",
      publicTimeline: "Activité",
      recentGifts: "Reçus",
      scan: "Scanner",
      scanUnavailable: "Le scan est disponible dans l'app Friemi.",
      scanUnknown: "Ce QR code n'est pas reconnu.",
      settings: "Réglages",
      share: "Partager",
      shop: "Boutique",
      signOut: "Déconnexion",
      soon: "Bientôt disponible",
      trusted: "Fiable",
      visitors: "Visites",
    };
  }

  if (locale === "en") {
    return {
      accountSecurity: "Account & security",
      accountSettings: "Account settings",
      achievements: "Badges",
      addFriend: "Follow",
      available: "Open",
      bag: "Bag",
      charm: "Charm",
      charmLevelsClose: "Got it",
      charmLevelsCurrent: "Current level",
      charmLevelsIntro:
        "Gifts you receive raise your Charm. It shows popularity, not trust.",
      charmLevelsOpen: "View Charm levels",
      charmLevelsScore: "Charm",
      charmLevelsStartingAt: "from",
      charmLevelsTitle: "Charm levels",
      copyCode: "Copy",
      copied: "Copied",
      created: "Plans",
      editProfile: "Edit",
      friends: "Network",
      friendsFeature: "Friends",
      giftWall: "Gifts",
      hangoutsTitle: "My Plans",
      invite: "Invite",
      inviteCode: "Invite code",
      maxCharm: "Top level",
      message: "Message",
      moments: "Moments",
      myHangouts: "My Hangouts",
      myHangoutsCreated: "Created",
      myHangoutsJoined: "Joined",
      myHangoutsSaved: "Saved",
      myMoments: "My Moments",
      more: "More",
      networkTitle: "Network",
      noMyHangouts: "No hangouts yet.",
      noMyMoments: "No moments yet.",
      noTimeline: "No public activity yet.",
      nextCharm: "Next",
      unfollowCancel: "Cancel",
      unfollowConfirm: "Unfollow",
      unfollowDescription: "You will no longer follow each other.",
      unfollowTitle: "Unfollow this user?",
      followBack: "Follow back",
      mutualFollow: "Mutual",
      pendingFriend: "Following",
      profileTitle: "Profile",
      publicTimeline: "Activity",
      recentGifts: "Received",
      scan: "Scan",
      scanUnavailable: "Scanning is available in the Friemi app.",
      scanUnknown: "This QR code is not recognized.",
      settings: "Settings",
      share: "Share",
      shop: "Shop",
      signOut: "Sign out",
      soon: "Coming soon",
      trusted: "Trusted",
      visitors: "Visits",
    };
  }

  return {
    accountSecurity: "账号与安全",
    accountSettings: "账号设置",
    achievements: "成就",
    addFriend: "关注",
    available: "可进入",
    bag: "背包",
    charm: "魅力值",
    charmLevelsClose: "知道了",
    charmLevelsCurrent: "当前等级",
    charmLevelsIntro:
      "别人送你的礼物会提升魅力值。它代表受欢迎程度，不代表信用。",
    charmLevelsOpen: "查看魅力等级",
    charmLevelsScore: "魅力值",
    charmLevelsStartingAt: "达到",
    charmLevelsTitle: "魅力等级",
    copyCode: "复制",
    copied: "已复制",
    created: "聚吧",
    editProfile: "编辑资料",
    friends: "关系",
    friendsFeature: "朋友",
    giftWall: "礼物墙",
    hangoutsTitle: "我的聚吧",
    invite: "邀请",
    inviteCode: "邀请码",
    maxCharm: "最高等级",
    message: "发消息",
    moments: "足迹",
    myHangouts: "我的聚吧",
    myHangoutsCreated: "我发起的",
    myHangoutsJoined: "我参与的",
    myHangoutsSaved: "我收藏的",
    myMoments: "我的足迹",
    more: "更多",
    networkTitle: "关系",
    noMyHangouts: "还没有发起聚吧。",
    noMyMoments: "还没有发布足迹。",
    noTimeline: "暂时没有公开动态。",
    nextCharm: "下一等级",
    unfollowCancel: "暂不取消",
    unfollowConfirm: "确认取消",
    unfollowDescription: "取消后，你们将不再是互相关注。",
    unfollowTitle: "确认取消关注？",
    followBack: "回关",
    mutualFollow: "互相关注",
    pendingFriend: "已关注",
    profileTitle: "Profile",
    publicTimeline: "动态",
    recentGifts: "最近收到",
    scan: "扫码",
    scanUnavailable: "请在 Friemi App 中使用扫码。",
    scanUnknown: "没有识别出可用的 Friemi 二维码。",
    settings: "设置",
    share: "分享",
    shop: "商城",
    signOut: "退出登录",
    soon: "敬请期待",
    trusted: "信用值",
    visitors: "访客记录",
  };
}

function getGuestProfileCopy(locale: string) {
  if (locale === "fr") {
    return {
      browsePlanets: "Explorer les planètes",
      settings: "Langue",
      signIn: "Se connecter",
      title: "Profil visiteur",
    };
  }

  if (locale === "en") {
    return {
      browsePlanets: "Explore planets",
      settings: "Language",
      signIn: "Sign in",
      title: "Guest profile",
    };
  }

  return {
    browsePlanets: "去星球看看",
    settings: "语言设置",
    signIn: "登录",
    title: "游客主页",
  };
}

function ProfileAvatar({
  avatarUrl,
  initial,
  isOnline = false,
  name,
  presenceDisplayStatus,
  size = "lg",
}: {
  avatarUrl: string | null;
  initial: string;
  isOnline?: boolean;
  name: string;
  presenceDisplayStatus?: UserPresenceDisplayStatus;
  size?: "sm" | "lg" | "xl";
}) {
  const sizeClass =
    size === "sm"
      ? "h-12 w-12 text-base"
      : size === "xl"
        ? "h-20 w-20 text-4xl"
        : "h-16 w-16 text-3xl";
  const dotClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const visiblePresenceStatus =
    presenceDisplayStatus ?? (isOnline ? "ONLINE" : null);
  const dotColorClass =
    visiblePresenceStatus === "AWAY" ? "bg-[#F0B84D]" : "bg-[#2FBF62]";

  return (
    <span className="relative shrink-0">
      {avatarUrl ? (
        // User avatars are stored as remote URLs from Clerk/user data.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className={cn(
            sizeClass,
            "rounded-full bg-white object-cover ring-1 ring-[#DAD9C8]",
          )}
        />
      ) : (
        <span
          className={cn(
            sizeClass,
            "relative flex items-center justify-center overflow-hidden rounded-full bg-[#E83F83] font-medium text-white ring-1 ring-[#DAD9C8]",
          )}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[5px] rounded-full border border-white/25"
          />
          <span className="relative">{initial}</span>
        </span>
      )}
      {visiblePresenceStatus ? (
        <span
          aria-hidden="true"
          className={cn(
            dotClass,
            dotColorClass,
            "absolute bottom-0 right-0 rounded-full ring-2 ring-white",
          )}
        />
      ) : null}
    </span>
  );
}

function ProfilePresenceControl({
  locale,
  onStatusChange,
  status,
}: {
  locale: string;
  onStatusChange?: (status: UserPresenceStatusValue) => void;
  status: UserPresenceStatusValue;
}) {
  const copy = getPresenceCopy(locale);
  const [state, formAction] = useActionState(
    updateProfilePresenceAction,
    profilePresenceInitialState,
  );
  const currentStatus = state.status ?? status;
  const statusDotClass: Record<UserPresenceStatusValue, string> = {
    ONLINE: "bg-[#2FBF62]",
    AWAY: "bg-[#F0B84D]",
    INVISIBLE: "bg-[#B8B8B0]",
  };

  useEffect(() => {
    if (state.status) {
      onStatusChange?.(state.status);
    }
  }, [onStatusChange, state.status]);

  return (
    <form action={formAction} className="flex min-w-0 flex-wrap gap-1.5">
      <input name="locale" type="hidden" value={locale} />
      {userPresenceStatuses.map((presenceStatus) => {
        const active = currentStatus === presenceStatus;

        return (
          <button
            key={presenceStatus}
            type="submit"
            name="status"
            value={presenceStatus}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition active:scale-[0.98]",
              active
                ? "bg-[#156240] text-white"
                : "border border-[#E7E2D6] bg-white text-[#4F574F]",
            )}
            aria-label={`${copy.label}: ${copy.statuses[presenceStatus]}`}
            title={copy.statuses[presenceStatus]}
            onClick={() => onStatusChange?.(presenceStatus)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-2 w-2 rounded-full",
                active ? "ring-1 ring-white/40" : "",
                statusDotClass[presenceStatus],
              )}
            />
            <span>{copy.statuses[presenceStatus]}</span>
          </button>
        );
      })}
    </form>
  );
}

function GuestProfilePlaceholder({
  dashboard,
  locale,
  profile,
  profileInitial,
}: {
  dashboard: ProfileDashboardViewModel;
  locale: string;
  profile: PublicProfileViewModel;
  profileInitial: string;
}) {
  const copy = getGuestProfileCopy(locale);
  const mobileCopy = getMobileProfileCopy(locale);
  const signInHref = getSignInHref(locale, "/profile");
  const settingsHref = withLocale(locale, "/account/settings");
  const planetsHref = withLocale(locale, "/footprints?tab=planet");
  const stats = [
    { label: mobileCopy.created, value: dashboard.createdActivityCount },
    { label: mobileCopy.friends, value: dashboard.friendCount },
    { label: mobileCopy.moments, value: dashboard.momentCount },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl pb-8">
      <div className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] bg-white px-5 md:hidden">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-[18px] font-bold leading-tight tracking-normal text-[#111210]">
            {copy.title}
          </h1>
        </header>

        <section className="mt-6">
          <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              initial={profileInitial}
              isOnline={profile.isOnline}
              name={profile.nickname}
              presenceDisplayStatus={profile.presenceDisplayStatus}
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-bold leading-tight text-[#111210]">
                {profile.nickname}
              </h2>
              {profile.bio ? (
                <p className="mt-3 text-sm font-semibold leading-5 text-[#4F574F]">
                  {profile.bio}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3">
            {stats.map((item) => (
              <div className="min-w-0 px-2 py-2 text-center" key={item.label}>
                <p className="text-[22px] font-bold leading-none text-[#111210] friemi-tabular">
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] font-bold leading-3 text-[#4F574F]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3">
            <Link
              href={signInHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition active:scale-95"
            >
              {copy.signIn}
            </Link>
            <Link
              href={planetsHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
            >
              {copy.browsePlanets}
            </Link>
            <Link
              href={settingsHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#5F5743] ring-1 ring-[#E8D59D] transition active:scale-95"
            >
              <Settings className="h-4 w-4" />
              {copy.settings}
            </Link>
          </div>
        </section>
      </div>

      <div className="hidden space-y-5 md:block md:space-y-7">
        <section className="rounded-[1.35rem] border border-[#8AB68E]/40 bg-[linear-gradient(145deg,#FEFFF9_0%,#F1F2EC_62%,#FFF5E6_100%)] p-5 shadow-[0_14px_34px_rgba(21,98,64,0.07)] ring-1 ring-white/70">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                initial={profileInitial}
                isOnline={profile.isOnline}
                name={profile.nickname}
                presenceDisplayStatus={profile.presenceDisplayStatus}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-moss">{copy.title}</p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-normal text-ink">
                  {profile.nickname}
                </h1>
                {profile.bio ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              <Link
                href={settingsHref}
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#156240] ring-1 ring-[#D6D5B2] transition hover:bg-[#FEFFF9]"
              >
                {copy.settings}
              </Link>
              <Link
                href={signInHref}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0D5A3C]"
              >
                {copy.signIn}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function getProfileSummaryCopy(locale: string) {
  if (locale === "fr") {
    return {
      charm: "Aura",
      friends: "Amis",
      hangouts: "Sorties",
      moments: "Moments",
      trust: "Fiabilité",
    };
  }

  if (locale === "en") {
    return {
      charm: "Charm",
      friends: "Friends",
      hangouts: "Hangouts",
      moments: "Moments",
      trust: "Trust",
    };
  }

  return {
    charm: "魅力值",
    friends: "朋友",
    hangouts: "聚吧",
    moments: "足迹",
    trust: "信用值",
  };
}

function MobileProfileSummaryStrip({
  dashboard,
  locale,
}: {
  dashboard: ProfileDashboardViewModel;
  locale: string;
}) {
  const copy = getProfileSummaryCopy(locale);
  const stats = [
    {
      href: withLocale(locale, "/profile/hangouts"),
      label: copy.hangouts,
      value: dashboard.createdActivityCount,
    },
    {
      href: withLocale(locale, "/profile/network"),
      label: copy.friends,
      value: dashboard.friendCount,
    },
    {
      href: withLocale(locale, "/profile/moments"),
      label: copy.moments,
      value: dashboard.momentCount,
    },
  ];

  return (
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_5.65rem] items-center gap-3">
      <div className="grid min-w-0 grid-cols-3">
        {stats.map((item) => (
          <Link
            aria-label={`${item.label}: ${item.value}`}
            className="min-w-0 rounded-2xl px-1.5 py-1.5 text-center transition active:scale-[0.98]"
            href={item.href}
            key={item.label}
          >
            <p className="text-[21px] font-bold leading-[1.08] text-[#111210] friemi-tabular">
              {item.value}
            </p>
            <p className="mt-1 truncate text-[10px] font-bold leading-4 text-[#4F574F]">
              {item.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid min-w-0 gap-2 border-l border-[#E3DCC5] pl-3">
        <div className="grid grid-cols-[1.7rem_minmax(0,1fr)] items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF7EF] text-[#156240]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="min-w-0">
            <span className="block truncate pt-px text-[10px] font-bold leading-[1.15] text-[#5F665F]">
              {copy.trust}
            </span>
            <span className="mt-1 block text-[16px] font-bold leading-none text-[#156240] friemi-tabular">
              {dashboard.trustScore}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-[1.7rem_minmax(0,1fr)] items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0F3] text-[#E7457A]">
            <Heart className="h-3.5 w-3.5 fill-current" strokeWidth={2.35} />
          </span>
          <span className="min-w-0">
            <span className="block truncate pt-px text-[10px] font-bold leading-[1.15] text-[#5F665F]">
              {copy.charm}
            </span>
            <span className="mt-1 block text-[16px] font-bold leading-none text-[#111210] friemi-tabular">
              {formatCharmScore(dashboard.charmScore)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

type ProfilePreviewTabKey = "moments" | "hangouts" | "badges";

function getProfilePreviewTabsCopy(locale: string) {
  if (locale === "fr") {
    return {
      badges: "Badges",
      emptyBadges: "Voir les badges",
      emptyHangouts: "Aucune sortie pour le moment.",
      emptyMoments: "Aucun moment pour le moment.",
      hangouts: "Sorties",
      moments: "Moments",
      viewAll: "Tout voir",
      achievementTitles: {
        active_guest_20: "Joueur actif",
        co_creator: "Co-créateur",
        content_contributor: "Contributeur de contenu",
        first_gift: "Premier cadeau",
        gift_ambassador: "Ambassadeur des cadeaux",
        hello_world: "Nouveau joueur",
        host_20: "Hôte 20",
        invitation_expert: "Expert des invitations",
        open_minded: "Organisateur ouvert",
        popularity_star: "Étoile populaire",
        punctuality_star: "Étoile de ponctualité",
        trusted_profile: "Profil fiable",
      },
    };
  }

  if (locale === "en") {
    return {
      badges: "Badges",
      emptyBadges: "View badges",
      emptyHangouts: "No hangouts yet.",
      emptyMoments: "No moments yet.",
      hangouts: "Hangouts",
      moments: "Moments",
      viewAll: "View all",
      achievementTitles: {
        active_guest_20: "Active Player",
        co_creator: "Co-creator",
        content_contributor: "Content Contributor",
        first_gift: "First Gift",
        gift_ambassador: "Gift Ambassador",
        hello_world: "First-time Player",
        host_20: "Host 20",
        invitation_expert: "Invitation Expert",
        open_minded: "Open Host",
        popularity_star: "Popularity Star",
        punctuality_star: "Punctuality Star",
        trusted_profile: "Trusted Profile",
      },
    };
  }

  return {
    badges: "勋章",
    emptyBadges: "查看勋章",
    emptyHangouts: "还没有聚吧。",
    emptyMoments: "还没有足迹。",
    hangouts: "聚吧",
    moments: "足迹",
    viewAll: "查看全部",
    achievementTitles: {
      active_guest_20: "活跃玩家",
      co_creator: "共创者",
      content_contributor: "内容贡献者",
      first_gift: "初次心意",
      gift_ambassador: "礼物使者",
      hello_world: "初见玩家",
      host_20: "主理人 20",
      invitation_expert: "邀请达人",
      open_minded: "开放主理人",
      popularity_star: "人气之星",
      punctuality_star: "守约之星",
      trusted_profile: "可信资料",
    },
  };
}

function getProfilePreviewTabHref(locale: string, tab: ProfilePreviewTabKey) {
  if (tab === "moments") {
    return withLocale(locale, "/profile/moments");
  }

  if (tab === "hangouts") {
    return withLocale(locale, "/profile/hangouts");
  }

  return withLocale(locale, "/profile/achievements");
}

function ProfilePreviewTabs({
  achievementPreviewItems,
  dashboard,
  locale,
}: {
  achievementPreviewItems: PublicAchievementWallItem[];
  dashboard: ProfileDashboardViewModel;
  locale: string;
}) {
  const copy = getProfilePreviewTabsCopy(locale);
  const [activeTab, setActiveTab] = useState<ProfilePreviewTabKey>("moments");
  const tabs: Array<{ key: ProfilePreviewTabKey; label: string }> = [
    { key: "moments", label: copy.moments },
    { key: "hangouts", label: copy.hangouts },
    { key: "badges", label: copy.badges },
  ];
  const momentItems = dashboard.moments
    .filter((moment) => moment.content?.trim() || moment.image)
    .slice(0, 3);
  const seenActivityIds = new Set<string>();
  const hangoutItems = [
    ...dashboard.createdActivities,
    ...dashboard.participations.map((participation) => participation.activity),
    ...dashboard.favoriteActivities.map((favorite) => favorite.activity),
  ]
    .filter((activity) => {
      if (seenActivityIds.has(activity.id)) {
        return false;
      }

      seenActivityIds.add(activity.id);
      return true;
    })
    .slice(0, 3);
  const badgeItems = achievementPreviewItems;
  const activeHref = getProfilePreviewTabHref(locale, activeTab);

  return (
    <section className="mt-5 bg-white">
      <div
        aria-label="Profile preview"
        className="grid grid-cols-3 border-b border-[#E7E1CA]"
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              aria-selected={active}
              className="relative h-8 min-w-0 px-1 text-center text-[11px] font-semibold text-[#4F574F] transition active:scale-[0.98]"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              type="button"
            >
              <span className={cn("truncate", active && "text-[#111210]")}>
                {tab.label}
              </span>
              {active ? (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#156240]" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid min-h-[7.9rem] grid-cols-3 gap-2.5">
        {activeTab === "moments" ? (
          momentItems.length > 0 ? (
            momentItems.map((moment) => (
              <Link
                className="group min-w-0"
                href={withLocale(locale, `/footprints/${moment.id}`)}
                key={moment.id}
              >
                <PreviewImage
                  alt=""
                  fallbackSrc="/illustrations/ui/take-photo.png"
                  src={moment.image?.url ?? null}
                />
                <p className="mt-2 line-clamp-2 min-h-8 text-[10.5px] font-semibold leading-4 text-[#111210]">
                  {moment.content?.trim() || copy.moments}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-[#7A8276]">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-current text-[#E7457A]" />
                    {moment.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {moment.commentCount}
                  </span>
                </p>
              </Link>
            ))
          ) : (
            <ProfilePreviewEmpty href={activeHref} label={copy.emptyMoments} />
          )
        ) : null}

        {activeTab === "hangouts" ? (
          hangoutItems.length > 0 ? (
            hangoutItems.map((activity) => (
              <Link
                className="group min-w-0"
                href={withLocale(locale, getActivityDetailPath(activity.id))}
                key={activity.id}
              >
                <PreviewImage
                  alt=""
                  fallbackSrc="/illustrations/ui/take-photo.png"
                  src={activity.coverImageUrl}
                />
                <p className="mt-2 line-clamp-2 min-h-8 text-[10.5px] font-semibold leading-4 text-[#111210]">
                  {activity.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#7A8276]">
                  <UsersRound className="h-3 w-3 text-[#156240]" />
                  {activity.participantCount}
                </p>
              </Link>
            ))
          ) : (
            <ProfilePreviewEmpty href={activeHref} label={copy.emptyHangouts} />
          )
        ) : null}

        {activeTab === "badges" ? (
          badgeItems.length > 0 ? (
            badgeItems.map((item) => (
              <Link
                className="group min-w-0"
                href={activeHref}
                key={item.definition.key}
              >
                <div className="flex aspect-[1.22/1] items-center justify-center rounded-xl bg-transparent transition group-active:scale-[0.98]">
                  <ProfileAchievementIcon
                    achievementKey={item.definition.key}
                    className="h-12 w-12 rounded-full"
                    iconClassName="h-6 w-6"
                    transparent
                  />
                </div>
                <p className="mt-2 line-clamp-2 min-h-8 text-center text-[10.5px] font-semibold leading-4 text-[#111210]">
                  {copy.achievementTitles[item.definition.key] ??
                    item.definition.title}
                </p>
              </Link>
            ))
          ) : (
            <ProfilePreviewEmpty href={activeHref} label={copy.emptyBadges} />
          )
        ) : null}
      </div>

      <Link
        className="mx-auto mt-2 flex h-7 w-fit items-center justify-center gap-1 text-[10.5px] font-semibold text-[#156240] transition active:scale-[0.98]"
        href={activeHref}
      >
        {copy.viewAll} {tabs.find((tab) => tab.key === activeTab)?.label}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function PreviewImage({
  alt,
  fallbackSrc,
  src,
}: {
  alt: string;
  fallbackSrc: string;
  src: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#F8F7F2]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="aspect-[1.22/1] w-full object-cover transition group-active:scale-[0.98]"
        src={src || fallbackSrc}
      />
    </div>
  );
}

function ProfilePreviewEmpty({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="col-span-3 flex min-h-[7.5rem] items-center justify-center rounded-xl bg-[#F8F7F2] px-4 text-center text-[12px] font-semibold text-[#6C746A] transition active:scale-[0.98]"
      href={href}
    >
      {label}
    </Link>
  );
}

function ProfileFeatureLink({
  href,
  icon: Icon,
  label,
  locked = false,
  lockedLabel,
  status,
  tone = "green",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  locked?: boolean;
  lockedLabel?: string;
  status?: string;
  tone?: "green" | "pink" | "blue" | "gold" | "gray";
}) {
  const toneClass = locked
    ? "bg-[#F5F4EF] text-[#9A9A90]"
    : tone === "pink"
      ? "bg-[#FFF1F6] text-[#F05B91]"
      : tone === "blue"
        ? "bg-[#F1F6FF] text-[#4D83E9]"
        : tone === "gold"
          ? "bg-[#FFF6DE] text-[#D79A13]"
          : tone === "gray"
            ? "bg-[#F3F4F1] text-[#737870]"
            : "bg-[#EEF8F2] text-[#189560]";

  const content = (
    <>
      <span
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full",
          toneClass,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
        {locked ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#8B907F] ring-1 ring-[#D6D5B2]">
            <Lock className="h-3 w-3" strokeWidth={2.4} />
          </span>
        ) : status ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 max-w-[3rem] items-center rounded-full bg-white px-1.5 text-[9px] font-semibold leading-none text-[#156240] ring-1 ring-[#D6D5B2]">
            <span className="truncate">{status}</span>
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[11px] font-bold",
          locked ? "text-[#6C746A]" : "text-[#1D1D1B]",
        )}
      >
        {label}
      </span>
    </>
  );

  if (locked) {
    return (
      <button
        type="button"
        aria-disabled="true"
        className="grid min-w-0 cursor-default justify-items-center gap-1.5 rounded-2xl px-1 py-1.5 text-center opacity-80"
        title={lockedLabel ?? label}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="grid min-w-0 justify-items-center gap-1.5 rounded-2xl px-1 py-1.5 text-center transition active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}

function getTimelineDateParts(value: string, locale: string) {
  const date = new Date(value);

  if (locale === "zh-CN") {
    return {
      day: String(date.getDate()),
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      month: `${date.getMonth() + 1}月`,
    };
  }

  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return {
    day,
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    month,
  };
}

function PublicMobileProfileActions({
  isAuthenticated,
  locale,
  profileId,
  relationship,
}: {
  isAuthenticated: boolean;
  locale: string;
  profileId: string;
  relationship: ProfileDashboardViewModel["viewerRelationship"];
}) {
  const copy = getMobileProfileCopy(locale);
  const redirectPath = `/profile/${profileId}`;
  const activeLabel = relationship.targetFollowsViewer
    ? copy.mutualFollow
    : copy.pendingFriend;
  const inactiveLabel = relationship.targetFollowsViewer
    ? copy.followBack
    : copy.addFriend;
  const FollowIcon =
    relationship.isFollowing && relationship.targetFollowsViewer
      ? HeartHandshake
      : undefined;

  return (
    <div className="grid grid-cols-2 items-start gap-2">
      <FollowButton
        activeButtonClassName="!h-9 !min-h-9 w-full rounded-full border border-[#8AB68E] bg-white !px-3 !text-[11px] font-semibold text-[#156240] shadow-none active:scale-[0.98]"
        activeLabel={activeLabel}
        buttonClassName="!h-9 !min-h-9 w-full rounded-full border border-[#8AB68E] bg-white !px-3 !text-[11px] font-semibold text-[#156240] shadow-none active:scale-[0.98]"
        icon={FollowIcon}
        inactiveLabel={inactiveLabel}
        isAuthenticated={isAuthenticated}
        isFollowing={relationship.isFollowing}
        locale={locale}
        redirectPath={redirectPath}
        targetUserProfileId={profileId}
        unfollowConfirm={{
          cancelLabel: copy.unfollowCancel,
          confirmLabel: copy.unfollowConfirm,
          description: copy.unfollowDescription,
          title: copy.unfollowTitle,
        }}
      />
      {isAuthenticated ? (
        <StartDirectConversationButton
          buttonClassName="h-9 w-full px-3 text-[11px]"
          errorClassName="col-span-2 text-center"
          label={copy.message}
          locale={locale}
          peerProfileId={profileId}
          redirectPath={redirectPath}
        />
      ) : null}
    </div>
  );
}

function RecentCharmGifts({
  className,
  gifts,
  label,
}: {
  className?: string;
  gifts: ProfileDashboardViewModel["recentCharmGifts"];
  label: string;
}) {
  const visibleGifts = gifts.slice(0, 4);

  if (visibleGifts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
    >
      <span className="mr-0.5 text-[11px] font-bold text-[#8B907F]">
        {label}
      </span>
      {visibleGifts.map((gift) => (
        <span
          className="inline-flex h-7 items-center gap-1 rounded-full bg-white/78 px-2 text-[11px] font-semibold text-[#1D1D1B] ring-1 ring-[#E8E0C8]"
          key={gift.id}
          title={`${gift.giftLabel} +${gift.totalCharmDelta}`}
        >
          <span aria-hidden="true">{gift.giftEmoji}</span>
          <span>+{gift.totalCharmDelta}</span>
        </span>
      ))}
    </div>
  );
}

function formatCharmScore(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function CharmLevelsDialog({
  locale,
  onClose,
  open,
  progress,
}: {
  locale: string;
  onClose: () => void;
  open: boolean;
  progress: ReturnType<typeof getCharmProgress>;
}) {
  const copy = getMobileProfileCopy(locale);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="charm-levels-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-end bg-[#111210]/34 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:justify-center sm:p-6"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-[1.4rem] bg-[#FEFFF9] p-4 shadow-[0_18px_54px_rgba(17,18,16,0.22)] ring-1 ring-[#D6D5B2]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8A61CE]">
              {copy.charmLevelsCurrent}
            </p>
            <h2
              className="mt-1 text-xl font-bold leading-tight text-[#111210]"
              id="charm-levels-dialog-title"
            >
              {copy.charmLevelsTitle}
            </h2>
          </div>
          <button
            aria-label={copy.charmLevelsClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#E7E2D6] transition active:scale-95"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm font-semibold leading-6 text-[#4F574F]">
          {copy.charmLevelsIntro}
        </p>

        <div className="mt-4 grid gap-1">
          {charmLevels.map((level) => {
            const active = level.id === progress.current.id;

            return (
              <div
                className={cn(
                  "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2.5 py-2",
                  active ? "bg-[#F4F0FF] text-[#111210]" : "text-[#4F574F]",
                )}
                key={level.id}
              >
                <span className="text-lg" aria-hidden="true">
                  {level.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold">
                      {getCharmLevelLabel(level, locale)}
                    </p>
                    {active ? (
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#8A61CE] ring-1 ring-[#DBC8F3]">
                        {copy.charmLevelsCurrent}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#7A8276]">
                    {getCharmLevelDescription(level, locale)}
                  </p>
                </div>
                <p className="whitespace-nowrap text-xs font-semibold text-[#8A61CE] friemi-tabular">
                  {copy.charmLevelsStartingAt}{" "}
                  {formatCharmScore(level.minScore)}
                </p>
              </div>
            );
          })}
        </div>

        <button
          className="mt-4 h-11 w-full rounded-full bg-[#156240] px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
          onClick={onClose}
          type="button"
        >
          {copy.charmLevelsClose}
        </button>
      </div>
    </div>
  );
}

function CharmProgressPanel({
  className,
  dashboard,
  isAuthenticated,
  locale,
  recipientName,
  recipientProfileId,
  showGiftAction = false,
  showRecentGifts = false,
}: {
  className?: string;
  dashboard: ProfileDashboardViewModel;
  isAuthenticated?: boolean;
  locale: string;
  recipientName?: string;
  recipientProfileId?: string;
  showGiftAction?: boolean;
  showRecentGifts?: boolean;
}) {
  const copy = getMobileProfileCopy(locale);
  const progress = getCharmProgress(dashboard.charmScore);
  const levelLabel = getCharmLevelLabel(progress.current, locale);
  const nextCharmLabel = progress.next
    ? `${formatCharmScore(progress.score)} / ${formatCharmScore(progress.next.minScore)}`
    : copy.maxCharm;
  const progressWidth = `${Math.max(3, Math.round(progress.progressRatio * 100))}%`;
  const [levelsOpen, setLevelsOpen] = useState(false);

  return (
    <>
      <div className={cn("min-w-0", className)}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[26px] font-bold leading-none text-[#A57AEB] friemi-tabular">
              {formatCharmScore(progress.score)}
            </p>
            <button
              aria-label={copy.charmLevelsOpen}
              className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full text-left text-xs font-semibold text-[#8B78B9] transition active:scale-[0.98]"
              onClick={() => setLevelsOpen(true)}
              type="button"
            >
              <span className="truncate">
                {progress.current.icon} {levelLabel}
              </span>
              <Info className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
          <p className="shrink-0 text-xs font-bold text-[#7A8276]">
            {nextCharmLabel}
          </p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#EFEAD7]">
          <div
            className="h-full rounded-full bg-[#BFAAF4]"
            style={{ width: progressWidth }}
          />
        </div>
        {showGiftAction && recipientProfileId && recipientName ? (
          <div className="mt-2 flex justify-end">
            <CharmGiftDialog
              isAuthenticated={Boolean(isAuthenticated)}
              locale={locale}
              recipientName={recipientName}
              recipientProfileId={recipientProfileId}
            />
          </div>
        ) : null}
        {showRecentGifts ? (
          <RecentCharmGifts
            className="mt-3"
            gifts={dashboard.recentCharmGifts}
            label={copy.recentGifts}
          />
        ) : null}
      </div>

      <CharmLevelsDialog
        locale={locale}
        onClose={() => setLevelsOpen(false)}
        open={levelsOpen}
        progress={progress}
      />
    </>
  );
}

function PublicMobileTimeline({
  dashboard,
  locale,
}: {
  dashboard: ProfileDashboardViewModel;
  locale: string;
}) {
  const copy = getMobileProfileCopy(locale);
  const seenMomentKeys = new Set<string>();
  const momentItems = dashboard.moments
    .filter((moment) => {
      const key = moment.resharedMomentId
        ? `repost:${moment.resharedMomentId}`
        : `moment:${moment.id}`;

      if (seenMomentKeys.has(key)) {
        return false;
      }

      seenMomentKeys.add(key);
      return Boolean(moment.content?.trim() || moment.image);
    })
    .map((moment) => ({
      date: moment.createdAt,
      href: withLocale(locale, `/footprints/${moment.id}`),
      id: `moment-${moment.id}`,
      imageUrl: moment.image?.url ?? null,
      text: moment.content?.trim() || copy.moments,
      type: copy.moments,
    }));
  const activityItems = dashboard.createdActivities
    .slice(0, 6)
    .map((activity) => ({
      date: activity.startAt,
      href: withLocale(locale, getActivityDetailPath(activity.id)),
      id: `activity-${activity.id}`,
      imageUrl: activity.coverImageUrl,
      text: activity.title,
      type: copy.created,
    }));
  const timelineItems = [...momentItems, ...activityItems]
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime() ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 8)
    .map((item) => ({
      ...item,
      dateParts: getTimelineDateParts(item.date, locale),
    }));

  return (
    <section className="mt-6 border-t border-[#E3DCC5]">
      {timelineItems.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white/78 px-4 py-6 text-center text-sm font-bold text-[#6C746A] ring-1 ring-[#E3DCC5]">
          {copy.noTimeline}
        </p>
      ) : (
        <div>
          {timelineItems.map((item, index) => {
            const showDate =
              index === 0 ||
              item.dateParts.key !== timelineItems[index - 1]?.dateParts.key;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="grid grid-cols-[3.9rem_minmax(0,1fr)] gap-3 border-b border-[#E3DCC5]/70 py-4 last:border-b-0"
              >
                <div className="pt-0.5 text-center">
                  {showDate ? (
                    <>
                      <p className="text-[25px] font-bold leading-none text-[#111210] friemi-tabular">
                        {item.dateParts.day}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-4 text-[#7A8276]">
                        {item.dateParts.month}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#156240]">
                    {item.type}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[15px] font-bold leading-5 text-[#1D1D1B]">
                    {item.text}
                  </p>
                  {item.imageUrl ? (
                    // Timeline thumbnails can be remote user uploaded images.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="mt-2 h-[92px] w-[92px] rounded-xl object-cover"
                    />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getProfileRemarkCopy(locale: string) {
  if (locale === "fr") {
    return {
      clear: "Effacer",
      cleared: "Note effacee.",
      close: "Fermer",
      edit: "Modifier la note",
      label: "Note privee",
      originalName: "Nom public",
      placeholder: "Ex. partenaire jeux",
      privateHint: "Visible uniquement par vous",
      save: "Enregistrer",
      saved: "Note enregistree.",
      saving: "Enregistrement...",
    };
  }

  if (locale === "en") {
    return {
      clear: "Clear",
      cleared: "Remark cleared.",
      close: "Close",
      edit: "Edit remark",
      label: "Private remark",
      originalName: "Public name",
      placeholder: "E.g. board game friend",
      privateHint: "Only visible to you",
      save: "Save",
      saved: "Remark saved.",
      saving: "Saving...",
    };
  }

  return {
    clear: "清除",
    cleared: "备注已清除。",
    close: "关闭",
    edit: "修改备注名",
    label: "备注名",
    originalName: "公开昵称",
    placeholder: "例如：桌游搭子",
    privateHint: "仅自己可见",
    save: "保存",
    saved: "备注已保存。",
    saving: "保存中...",
  };
}

function ProfileRemarkSubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getProfileRemarkCopy(locale);

  return (
    <button
      aria-busy={pending}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#156240] px-3 text-xs font-semibold text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <PencilLine className="h-3.5 w-3.5" />
      )}
      {pending ? copy.saving : copy.save}
    </button>
  );
}

function ProfileRemarkEditor({
  className,
  locale,
  profile,
}: {
  className?: string;
  locale: string;
  profile: PublicProfileViewModel;
}) {
  const copy = getProfileRemarkCopy(locale);
  const [state, formAction] = useActionState(
    updateProfileRemarkAction,
    profileRemarkInitialState,
  );
  const router = useRouter();
  const [value, setValue] = useState(profile.remarkName ?? "");
  const savedRemark = state.ok
    ? (state.remarkName ?? "")
    : (profile.remarkName ?? "");
  const hasSavedRemark = savedRemark.trim().length > 0;

  useEffect(() => {
    setValue(profile.remarkName ?? "");
  }, [profile.id, profile.remarkName]);

  useEffect(() => {
    if (state.ok) {
      setValue(state.remarkName ?? "");
      router.refresh();
    }
  }, [router, state.ok, state.remarkName]);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <label
          className="text-xs font-semibold text-[#156240]"
          htmlFor={`profile-remark-${profile.id}`}
        >
          {copy.label}
        </label>
        {profile.publicNickname !== profile.nickname || hasSavedRemark ? (
          <span className="min-w-0 truncate text-[11px] font-semibold text-[#6C746A]">
            {copy.originalName}: {profile.publicNickname}
          </span>
        ) : null}
      </div>
      <form action={formAction} className="flex min-w-0 items-center gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input
          name="redirectPath"
          type="hidden"
          value={`/profile/${profile.id}`}
        />
        <input name="targetProfileId" type="hidden" value={profile.id} />
        <input
          className="h-10 min-w-0 flex-1 rounded-full border border-[#D6D5B2] bg-white px-3 text-sm font-semibold text-[#111210] outline-none placeholder:text-[#9BA08E] focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/20"
          id={`profile-remark-${profile.id}`}
          maxLength={32}
          name="remarkName"
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.placeholder}
          value={value}
        />
        <ProfileRemarkSubmitButton locale={locale} />
      </form>
      {hasSavedRemark ? (
        <form
          action={formAction}
          className="flex justify-end"
          onSubmit={() => setValue("")}
        >
          <input name="locale" type="hidden" value={locale} />
          <input
            name="redirectPath"
            type="hidden"
            value={`/profile/${profile.id}`}
          />
          <input name="targetProfileId" type="hidden" value={profile.id} />
          <input name="remarkName" type="hidden" value="" />
          <button
            className="inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold text-[#6C746A] transition active:bg-white"
            type="submit"
          >
            {copy.clear}
          </button>
        </form>
      ) : null}
      {state.formError ? (
        <p className="text-xs font-bold leading-5 text-[#B5301F]">
          {state.formError}
        </p>
      ) : state.ok ? (
        <p className="text-xs font-bold leading-5 text-[#156240]">
          {state.remarkName ? copy.saved : copy.cleared}
        </p>
      ) : null}
    </div>
  );
}

function PublicProfileMoreMenu({
  buttonClassName,
  isAuthenticated,
  locale,
  profile,
}: {
  buttonClassName?: string;
  isAuthenticated: boolean;
  locale: string;
  profile: PublicProfileViewModel;
}) {
  const copy = getMobileProfileCopy(locale);
  const remarkCopy = getProfileRemarkCopy(locale);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const menuId = `public-profile-more-menu-${profile.id}`;
  const dialogTitleId = `profile-remark-dialog-title-${profile.id}`;

  useEffect(() => {
    if (!menuOpen && !remarkOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (remarkOpen) {
        setRemarkOpen(false);
      } else {
        setMenuOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen, remarkOpen]);

  const openRemarkEditor = () => {
    setMenuOpen(false);

    if (!isAuthenticated) {
      router.push(getSignInHref(locale, `/profile/${profile.id}`));
      return;
    }

    setRemarkOpen(true);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          aria-controls={menuOpen ? menuId : undefined}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={copy.more}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#1D1D1B] transition active:scale-95",
            buttonClassName,
          )}
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2.3} />
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 top-11 z-[80] w-44 overflow-hidden rounded-lg bg-white py-1 shadow-[0_16px_42px_rgba(17,18,16,0.18)] ring-1 ring-[#E7E2D6]"
            id={menuId}
            role="menu"
          >
            <button
              className="flex h-11 w-full items-center gap-2.5 px-3 text-left text-sm font-semibold text-[#1D1D1B] transition hover:bg-[#F5F7F1] active:bg-[#EEF3EA]"
              onClick={openRemarkEditor}
              role="menuitem"
              type="button"
            >
              <PencilLine className="h-4 w-4 text-[#156240]" />
              <span>{remarkCopy.edit}</span>
            </button>
          </div>
        ) : null}
      </div>

      {remarkOpen ? (
        <div
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="fixed inset-0 z-[10001] flex items-end bg-[#111210]/30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:justify-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRemarkOpen(false);
            }
          }}
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[1.35rem] bg-white p-4 shadow-[0_24px_70px_rgba(17,18,16,0.24)] ring-1 ring-[#D6D5B2] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  className="text-lg font-bold leading-6 text-[#111210]"
                  id={dialogTitleId}
                >
                  {remarkCopy.edit}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#7A8276]">
                  {remarkCopy.privateHint}
                </p>
              </div>
              <button
                aria-label={remarkCopy.close}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4F574F] transition hover:bg-[#F5F7F1] active:scale-95"
                onClick={() => setRemarkOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ProfileRemarkEditor
              className="mt-5"
              locale={locale}
              profile={profile}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function PublicMobileProfileHome({
  dashboard,
  isAuthenticated,
  locale,
  profile,
  profileInitial,
  publicAchievements,
}: {
  dashboard: ProfileDashboardViewModel;
  isAuthenticated: boolean;
  locale: string;
  profile: PublicProfileViewModel;
  profileInitial: string;
  publicAchievements: PublicAchievementWallItem[];
}) {
  const copy = getMobileProfileCopy(locale);

  return (
    <div className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] bg-white px-5">
      <header className="flex items-center justify-between gap-3">
        <button
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#1D1D1B]"
          onClick={() => window.history.back()}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.3} />
        </button>
        <div className="flex items-center gap-2">
          <button
            aria-label={copy.share}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#1D1D1B]"
            onClick={() => {
              void navigator.share?.({
                title: profile.nickname,
                url: window.location.href,
              });
            }}
            type="button"
          >
            <Share2 className="h-4 w-4" strokeWidth={2.3} />
          </button>
          <PublicProfileMoreMenu
            isAuthenticated={isAuthenticated}
            locale={locale}
            profile={profile}
          />
        </div>
      </header>

      <section className="mt-6">
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2.5">
          <ProfileAvatar
            avatarUrl={profile.avatarUrl}
            initial={profileInitial}
            isOnline={profile.isOnline}
            name={profile.nickname}
            presenceDisplayStatus={profile.presenceDisplayStatus}
            size="sm"
          />
          <div className="min-w-0 pt-0.5">
            <h1
              className="min-w-0 max-w-full truncate text-lg font-bold leading-tight text-[#111210]"
              title={profile.nickname}
            >
              {profile.nickname}
            </h1>
            {profile.remarkName &&
            profile.publicNickname !== profile.nickname ? (
              <p className="mt-0.5 truncate text-xs font-bold text-[#6C746A]">
                {profile.publicNickname}
              </p>
            ) : null}
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              {profile.isCoCreator ? (
                <CoCreatorIdentityBadge locale={locale} variant="icon" />
              ) : null}
              <TrustScoreBadge locale={locale} score={dashboard.trustScore} />
              <ProfileAchievementBadgeStrip
                className="min-w-0"
                items={publicAchievements}
                limit={3}
                locale={locale}
              />
            </div>
            {profile.friendCode ? (
              <p className="mt-1 text-xs font-bold text-[#6C746A]">
                @{profile.friendCode}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <PublicMobileProfileActions
            isAuthenticated={isAuthenticated}
            locale={locale}
            profileId={profile.id}
            relationship={dashboard.viewerRelationship}
          />
        </div>

        <CharmProgressPanel
          className="mt-5 border-b border-[#E3DCC5] pb-5"
          dashboard={dashboard}
          isAuthenticated={isAuthenticated}
          locale={locale}
          recipientName={profile.nickname}
          recipientProfileId={profile.id}
          showGiftAction
          showRecentGifts
        />
      </section>

      <PublicMobileTimeline dashboard={dashboard} locale={locale} />
      <MobileProfileAboutCard
        bio={profile.bio ?? ""}
        locale={locale}
        nickname={profile.nickname}
      />
    </div>
  );
}

function TrustScoreBadge({
  className,
  locale,
  score,
}: {
  className?: string;
  locale: string;
  score: number;
}) {
  const copy = getTrustBadgeCopy(locale, score);
  const [active, setActive] = useState(false);

  return (
    <button
      aria-expanded={active}
      aria-label={copy.label}
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-white/84 px-2 text-[11px] font-semibold text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.06)] ring-1 ring-[#E3DCC5] transition active:scale-95",
        active ? "z-20" : "",
        className,
      )}
      onClick={() => setActive((value) => !value)}
      title={copy.label}
      type="button"
    >
      <BadgeCheck className="h-4 w-4 shrink-0" strokeWidth={2.35} />
      <span className="leading-none">{score}</span>
      {active ? (
        <span className="absolute left-1/2 top-[calc(100%+0.4rem)] z-30 max-w-[5rem] -translate-x-1/2 truncate rounded-full bg-[#111210] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(17,18,16,0.16)]">
          {copy.tooltip}
        </span>
      ) : null}
    </button>
  );
}

function getProfileBioEditorCopy(locale: string) {
  if (locale === "fr") {
    return {
      about: "À propos de",
      bioLabel: "Bio",
      cancel: "Annuler",
      edit: "Modifier",
      empty:
        "Explore les sorties, les moments et de nouvelles rencontres sur Friemi.",
      placeholder: "Ajoutez une courte présentation",
      save: "Enregistrer",
      saving: "Enregistrement...",
    };
  }

  if (locale === "en") {
    return {
      about: "About",
      bioLabel: "Bio",
      cancel: "Cancel",
      edit: "Edit",
      empty: "Exploring hangouts, moments, and new people on Friemi.",
      placeholder: "Write a short intro",
      save: "Save",
      saving: "Saving...",
    };
  }

  return {
    about: "关于",
    bioLabel: "简介",
    cancel: "取消",
    edit: "编辑",
    empty: "正在 Friemi 探索城市里的聚会、活动和新朋友。",
    placeholder: "简单介绍一下自己",
    save: "保存",
    saving: "保存中...",
  };
}

function getProfileAboutTitle(locale: string, nickname: string) {
  const copy = getProfileBioEditorCopy(locale);
  const name = nickname.trim() || "Friemi";

  return locale === "zh-CN" ? `${copy.about} ${name}` : `${copy.about} ${name}`;
}

function MobileProfileAboutCard({
  bio,
  editButton,
  locale,
  nickname,
}: {
  bio: string;
  editButton?: React.ReactNode;
  locale: string;
  nickname: string;
}) {
  const copy = getProfileBioEditorCopy(locale);
  const displayBio = bio.trim() || copy.empty;

  return (
    <section className="mt-6 border-t border-[#EEE7D5] bg-white pt-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-[16px] font-bold leading-6 text-[#111210]">
          {getProfileAboutTitle(locale, nickname)}
        </h3>
        {editButton}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[14px] font-semibold leading-6 text-[#4F574F]">
        {displayBio}
      </p>
    </section>
  );
}

const mobileBioInitialState: UpdateProfileIdentityState = {};

function MobileProfileBioEditor({
  bio,
  locale,
  nickname,
}: {
  bio: string | null;
  locale: string;
  nickname: string;
}) {
  const copy = getProfileBioEditorCopy(locale);
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    mobileBioInitialState,
  );
  const [open, setOpen] = useState(false);
  const [savedBio, setSavedBio] = useState(bio ?? "");
  const [bioValue, setBioValue] = useState(bio ?? "");

  useEffect(() => {
    setSavedBio(bio ?? "");
    setBioValue(bio ?? "");
  }, [bio]);

  useEffect(() => {
    if (!state.success || state.bio === undefined) {
      return;
    }

    setSavedBio(state.bio ?? "");
    setBioValue(state.bio ?? "");
    setOpen(false);
  }, [state.bio, state.success]);

  return (
    <>
      <MobileProfileAboutCard
        bio={savedBio}
        editButton={
          <button
            className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
            type="button"
            onClick={() => setOpen(true)}
          >
            {copy.edit}
          </button>
        }
        locale={locale}
        nickname={nickname}
      />

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end bg-[#111210]/28 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setBioValue(savedBio);
              setOpen(false);
            }
          }}
        >
          <form
            action={formAction}
            className="w-full rounded-[1.6rem] bg-[#FEFFF9] p-4 shadow-[0_24px_70px_rgba(17,18,16,0.24)] ring-1 ring-[#D6D5B2]"
            noValidate
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#111210]">
                {copy.bioLabel}
              </h3>
              <button
                className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
                type="button"
                onClick={() => {
                  setBioValue(savedBio);
                  setOpen(false);
                }}
              >
                {copy.cancel}
              </button>
            </div>
            <input name="locale" type="hidden" value={locale} />
            <input name="afterSave" type="hidden" value="refresh" />
            <input name="nickname" type="hidden" value={nickname} />
            <textarea
              name="bio"
              value={bioValue}
              maxLength={160}
              placeholder={copy.placeholder}
              className="mt-4 min-h-32 w-full resize-none rounded-2xl bg-white/88 px-3 py-2 text-sm font-semibold leading-5 text-[#111210] outline-none ring-1 ring-[#D6D5B2] placeholder:text-[#A3A48F] focus:ring-[#8AB68E]"
              autoFocus
              onChange={(event) => setBioValue(event.target.value)}
            />
            <div className="mt-1 text-right text-[11px] font-bold text-[#8B907F]">
              {bioValue.length}/160
            </div>
            {state.formError ? (
              <p className="mt-2 text-xs font-semibold text-[#9A2135]">
                {state.formError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <MobileProfileBioSubmitButton
                label={copy.save}
                pendingLabel={copy.saving}
              />
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function MobileProfileBioSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-9 rounded-full bg-[#156240] px-5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

const mobileAvatarInitialState: UpdateProfileIdentityState = {};

function getMobileProfileAvatarEditorCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      change: "Changer l'avatar",
      city: "Ville",
      cityPickerSearch: "Rechercher ou saisir une ville",
      cityPickerTitle: "Choisir une ville",
      nickname: "Pseudo",
      nicknameHint: "Modifiable une fois toutes les 24 heures",
      nicknameLocked: "À nouveau modifiable le",
      save: "Enregistrer",
      saving: "Enregistrement...",
      status: "Statut",
      title: "Profil",
      useCity: "Utiliser",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      change: "Change avatar",
      city: "City",
      cityPickerSearch: "Search or enter a city",
      cityPickerTitle: "Choose city",
      nickname: "Nickname",
      nicknameHint: "Can be changed once every 24 hours",
      nicknameLocked: "Available again",
      save: "Save",
      saving: "Saving...",
      status: "Status",
      title: "Profile",
      useCity: "Use",
    };
  }

  return {
    cancel: "取消",
    change: "修改头像",
    city: "城市",
    cityPickerSearch: "搜索或输入城市",
    cityPickerTitle: "选择城市",
    nickname: "昵称",
    nicknameHint: "每24小时可修改一次",
    nicknameLocked: "可再次修改：",
    save: "保存",
    saving: "保存中...",
    status: "状态",
    title: "个人主页",
    useCity: "使用",
  };
}

function getProfileCityCountryLabel(
  country: (typeof profileCityCountries)[number],
  locale: string,
) {
  const localeKey = locale === "fr" || locale === "en" ? locale : "zh-CN";

  return country.labels[localeKey];
}

function ProfileCityPickerField({
  label,
  locale,
  onChange,
  value,
}: {
  label: string;
  locale: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const copy = getMobileProfileAvatarEditorCopy(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedValue = normalizeProfileHomeCity(value);
  const normalizedQuery = query.trim();
  const normalizedQueryKey = normalizedQuery.toLocaleLowerCase();
  const cityExists = profileCityCountries.some((country) =>
    country.cities.some(
      (city) => city.toLocaleLowerCase() === normalizedQueryKey,
    ),
  );
  const canUseCustomCity = normalizedQuery.length > 0 && !cityExists;

  const handleSelect = (nextCity: string) => {
    onChange(normalizeProfileHomeCity(nextCity));
    setQuery("");
    setOpen(false);
  };

  return (
    <>
      <button
        className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-full bg-white px-3 text-left text-sm font-semibold text-[#111210] outline-none ring-1 ring-[#D6D5B2] transition active:scale-[0.98]"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="shrink-0 text-[11px] text-[#4F574F]">{label}</span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="truncate">
            {getProfileHomeCityLabel(normalizedValue, locale)}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#0B7A4B]" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[10001] flex items-end bg-[#111210]/30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="max-h-[82dvh] w-full overflow-hidden rounded-[1.6rem] bg-white p-4 shadow-[0_20px_54px_rgba(17,18,16,0.18)] ring-1 ring-[#E6E6E0]">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-bold text-[#111210]">
                {copy.cityPickerTitle}
              </h4>
              <button
                aria-label={copy.cancel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              className="mt-4 h-11 w-full rounded-full bg-white px-4 text-sm font-bold text-[#111210] outline-none ring-1 ring-[#D6D5B2] placeholder:text-[#A7A99D] focus:ring-[#8AB68E]"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                if (canUseCustomCity) {
                  handleSelect(normalizedQuery);
                }
              }}
              placeholder={copy.cityPickerSearch}
            />

            <div className="mt-4 max-h-[58dvh] overflow-y-auto pr-1">
              {canUseCustomCity ? (
                <button
                  className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#F4F8F1] px-3 py-3 text-left text-sm font-semibold text-[#0B7A4B] ring-1 ring-[#C8DFC7] transition active:scale-[0.98]"
                  type="button"
                  onClick={() => handleSelect(normalizedQuery)}
                >
                  <span className="min-w-0 truncate">
                    {copy.useCity} {normalizedQuery}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ) : null}

              <div className="grid gap-4">
                {profileCityCountries.map((country) => {
                  const countryLabel = getProfileCityCountryLabel(
                    country,
                    locale,
                  );
                  const cities = normalizedQueryKey
                    ? country.cities.filter(
                        (city) =>
                          city
                            .toLocaleLowerCase()
                            .includes(normalizedQueryKey) ||
                          countryLabel
                            .toLocaleLowerCase()
                            .includes(normalizedQueryKey),
                      )
                    : country.cities;

                  if (cities.length === 0) {
                    return null;
                  }

                  return (
                    <section key={country.key} className="grid gap-2">
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-normal text-[#7B8178]">
                        {countryLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cities.map((city) => {
                          const active = normalizedValue === city;

                          return (
                            <button
                              key={`${country.key}-${city}`}
                              className={cn(
                                "rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]",
                                active
                                  ? "bg-[#0B7A4B] text-white"
                                  : "bg-white text-[#111210] ring-1 ring-[#E1DEC9]",
                              )}
                              type="button"
                              onClick={() => handleSelect(city)}
                            >
                              {city}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MobileProfileAvatarEditor({
  avatarUrl,
  bio,
  homeCity,
  initial,
  isOnline,
  locale,
  name,
  nickname,
  nicknameChangedAt,
  onPresenceStatusChange,
  onSaved,
  presenceDisplayStatus,
  presenceStatus,
}: {
  avatarUrl: string | null;
  bio: string | null;
  homeCity: string | null;
  initial: string;
  isOnline: boolean;
  locale: string;
  name: string;
  nickname: string;
  nicknameChangedAt: string | null;
  onPresenceStatusChange: (status: UserPresenceStatusValue) => void;
  onSaved: (nextValue: {
    avatarUrl: string | null;
    homeCity: string | null;
    nickname: string;
    nicknameChangedAt: string | null;
  }) => void;
  presenceDisplayStatus?: UserPresenceDisplayStatus;
  presenceStatus: UserPresenceStatusValue;
}) {
  const copy = getMobileProfileAvatarEditorCopy(locale);
  const router = useRouter();
  const { setNickname } = useViewerProfile();
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    mobileAvatarInitialState,
  );
  const [open, setOpen] = useState(false);
  const [avatarValue, setAvatarValue] = useState<string | null>(avatarUrl);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [cityValue, setCityValue] = useState(
    normalizeProfileHomeCity(homeCity),
  );
  const [nicknameValue, setNicknameValue] = useState(nickname);
  const [currentNicknameChangedAt, setCurrentNicknameChangedAt] =
    useState(nicknameChangedAt);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    setAvatarValue(avatarUrl);
    setAvatarDirty(false);
  }, [avatarUrl]);

  useEffect(() => {
    setCityValue(normalizeProfileHomeCity(homeCity));
  }, [homeCity]);

  useEffect(() => {
    setNicknameValue(nickname);
  }, [nickname]);

  useEffect(() => {
    setCurrentNicknameChangedAt(nicknameChangedAt);
  }, [nicknameChangedAt]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const savedNickname = state.nickname ?? nicknameValue;
    const savedNicknameChangedAt =
      state.nicknameChangedAt === undefined
        ? currentNicknameChangedAt
        : state.nicknameChangedAt;

    setNickname(savedNickname);
    setNicknameValue(savedNickname);
    setCurrentNicknameChangedAt(savedNicknameChangedAt);
    onSaved({
      avatarUrl: state.avatarUrl === undefined ? avatarValue : state.avatarUrl,
      homeCity: state.homeCity === undefined ? cityValue : state.homeCity,
      nickname: savedNickname,
      nicknameChangedAt: savedNicknameChangedAt,
    });
    setAvatarDirty(false);
    setOpen(false);
    router.refresh();
  }, [
    avatarValue,
    cityValue,
    currentNicknameChangedAt,
    nicknameValue,
    onSaved,
    router,
    setNickname,
    state.avatarUrl,
    state.homeCity,
    state.nickname,
    state.nicknameChangedAt,
    state.success,
  ]);

  const cityDirty = cityValue !== normalizeProfileHomeCity(homeCity);
  const nicknameDirty = nicknameValue.trim() !== nickname;
  const nicknameAvailableAt = getNicknameChangeAvailableAt(
    currentNicknameChangedAt,
  );
  const nicknameLocked = Boolean(
    nicknameAvailableAt && nicknameAvailableAt.getTime() > Date.now(),
  );
  const nicknameHint = nicknameLocked
    ? `${copy.nicknameLocked} ${nicknameAvailableAt!.toLocaleString(locale, {
        dateStyle: "short",
        timeStyle: "short",
      })}`
    : copy.nicknameHint;

  return (
    <>
      <button
        aria-label={copy.change}
        className="group relative shrink-0 rounded-full transition active:scale-95"
        onClick={() => setOpen(true)}
        type="button"
      >
        <ProfileAvatar
          avatarUrl={avatarUrl}
          initial={initial}
          isOnline={isOnline}
          name={name}
          presenceDisplayStatus={presenceDisplayStatus}
          size="lg"
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end bg-[#111210]/32 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full rounded-[1.6rem] bg-white p-4 shadow-[0_20px_54px_rgba(17,18,16,0.18)] ring-1 ring-[#E6E6E0]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#111210]">{copy.title}</h3>
              <button
                className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
                type="button"
                onClick={() => setOpen(false)}
              >
                {copy.cancel}
              </button>
            </div>

            <div className="mt-4">
              <ProfileAvatarPicker
                hideUploadAction
                initial={
                  nicknameValue.trim().charAt(0).toUpperCase() || initial
                }
                locale={locale}
                name={nicknameValue || name}
                onChange={(nextAvatarUrl) => {
                  setAvatarValue(nextAvatarUrl);
                  setAvatarDirty(true);
                }}
                onUploadingChange={setIsAvatarUploading}
                value={avatarValue}
                variant="sheet"
                sideContent={
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <p className="text-[11px] font-semibold text-[#4F574F]">
                        {copy.status}
                      </p>
                      <ProfilePresenceControl
                        locale={locale}
                        onStatusChange={onPresenceStatusChange}
                        status={presenceStatus}
                      />
                    </div>

                    <form action={formAction} className="grid gap-2" noValidate>
                      <input name="locale" type="hidden" value={locale} />
                      <input name="afterSave" type="hidden" value="refresh" />
                      <input name="bio" type="hidden" value={bio ?? ""} />
                      <input name="homeCity" type="hidden" value={cityValue} />
                      {avatarDirty && avatarValue ? (
                        <input
                          name="avatarUrl"
                          type="hidden"
                          value={avatarValue}
                        />
                      ) : null}

                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-semibold text-[#4F574F]">
                          {copy.nickname}
                        </span>
                        <input
                          className="h-10 w-full rounded-full bg-white px-3 text-sm font-semibold text-[#111210] outline-none ring-1 ring-[#D6D5B2] placeholder:text-[#A7A99D] focus:ring-[#8AB68E] read-only:bg-[#F4F5F1] read-only:text-[#7B8178]"
                          maxLength={24}
                          name="nickname"
                          onChange={(event) =>
                            setNicknameValue(event.currentTarget.value)
                          }
                          readOnly={nicknameLocked}
                          value={nicknameValue}
                        />
                        <span className="text-[10px] font-medium text-[#7B8178]">
                          {nicknameHint}
                        </span>
                      </label>

                      <ProfileCityPickerField
                        label={copy.city}
                        locale={locale}
                        onChange={setCityValue}
                        value={cityValue}
                      />

                      {state.formError ? (
                        <p className="text-xs font-semibold text-[#9A2135]">
                          {state.formError}
                        </p>
                      ) : null}
                      <div className="flex justify-end">
                        <MobileProfileAvatarSubmitButton
                          disabled={
                            (!avatarDirty && !cityDirty && !nicknameDirty) ||
                            !nicknameValue.trim() ||
                            isAvatarUploading
                          }
                          label={copy.save}
                          pendingLabel={copy.saving}
                        />
                      </div>
                    </form>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MobileProfileAvatarSubmitButton({
  disabled = false,
  label,
  pendingLabel,
}: {
  disabled?: boolean;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-9 rounded-full bg-[#156240] px-5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function SelfMobileProfileHome({
  achievementPreviewItems,
  dashboard,
  locale,
  onPresenceStatusChange,
  presenceStatus,
  profile,
  profileInitial,
  publicAchievements,
}: {
  achievementPreviewItems: PublicAchievementWallItem[];
  dashboard: ProfileDashboardViewModel;
  locale: string;
  onPresenceStatusChange: (status: UserPresenceStatusValue) => void;
  presenceStatus: UserPresenceStatusValue;
  profile: PublicProfileViewModel;
  profileInitial: string;
  publicAchievements: PublicAchievementWallItem[];
}) {
  const copy = getMobileProfileCopy(locale);
  const router = useRouter();
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile.avatarUrl);
  const [currentNickname, setCurrentNickname] = useState(profile.nickname);
  const [currentNicknameChangedAt, setCurrentNicknameChangedAt] = useState(
    profile.nicknameChangedAt,
  );
  const [currentHomeCity, setCurrentHomeCity] = useState(
    normalizeProfileHomeCity(profile.homeCity),
  );
  const [copied, setCopied] = useState(false);
  const nativeQrScanPendingRef = useRef(false);

  useEffect(() => {
    setCurrentAvatarUrl(profile.avatarUrl);
  }, [profile.avatarUrl]);

  useEffect(() => {
    setCurrentNickname(profile.nickname);
    setCurrentNicknameChangedAt(profile.nicknameChangedAt);
  }, [profile.nickname, profile.nicknameChangedAt]);

  useEffect(() => {
    setCurrentHomeCity(normalizeProfileHomeCity(profile.homeCity));
  }, [profile.homeCity]);

  const copyFriendCode = async () => {
    if (!profile.friendCode) {
      return;
    }

    await navigator.clipboard.writeText(profile.friendCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleGlobalQrValue = (rawValue: string) => {
    const destination = resolveGlobalQrScanDestination({ locale, rawValue });

    if (!destination) {
      window.alert(copy.scanUnknown);
      return;
    }

    if (destination.kind === "internal") {
      router.push(destination.href);
      return;
    }

    if (typeof window.FriemiAndroid?.openExternal === "function") {
      window.FriemiAndroid.openExternal(destination.href);
      return;
    }

    window.location.assign(destination.href);
  };

  useEffect(() => {
    function handleAndroidQrScan(event: Event) {
      if (!nativeQrScanPendingRef.current) {
        return;
      }

      nativeQrScanPendingRef.current = false;
      const payload = parseAndroidQrScanPayload(
        (event as CustomEvent<unknown>).detail,
      );

      if (!payload?.ok || !payload.rawValue) {
        if (payload?.reason !== "CANCELLED") {
          window.alert(copy.scanUnknown);
        }

        return;
      }

      handleGlobalQrValue(payload.rawValue);
    }

    window.addEventListener("friemi:android-qr-scan", handleAndroidQrScan);

    return () => {
      window.removeEventListener("friemi:android-qr-scan", handleAndroidQrScan);
    };
  }, [copy.scanUnknown, locale, router]);

  const openGlobalQrScanner = () => {
    if (!canUseNativeAndroidQrScanner()) {
      window.alert(copy.scanUnavailable);
      return;
    }

    nativeQrScanPendingRef.current = true;

    try {
      const payload = parseAndroidQrScanPayload(
        window.FriemiAndroid?.scanQrCode?.(),
      );

      if (payload?.supported === false || payload?.ok === false) {
        nativeQrScanPendingRef.current = false;
        window.alert(copy.scanUnavailable);
      }
    } catch {
      nativeQrScanPendingRef.current = false;
      window.alert(copy.scanUnavailable);
    }
  };

  return (
    <div className="app-mobile-page-shell [--app-mobile-page-top-gap:2.35rem] [--app-mobile-page-bottom-gap:1.75rem] bg-white px-5">
      <section>
        <div>
          <div className="flex items-start gap-4">
            <MobileProfileAvatarEditor
              avatarUrl={currentAvatarUrl}
              bio={profile.bio}
              homeCity={currentHomeCity}
              initial={
                currentNickname.trim().slice(0, 1).toUpperCase() ||
                profileInitial
              }
              isOnline={presenceStatus === "ONLINE"}
              locale={locale}
              name={currentNickname}
              nickname={currentNickname}
              nicknameChangedAt={currentNicknameChangedAt}
              onPresenceStatusChange={onPresenceStatusChange}
              onSaved={(nextValue) => {
                setCurrentAvatarUrl(nextValue.avatarUrl);
                setCurrentHomeCity(
                  normalizeProfileHomeCity(nextValue.homeCity),
                );
                setCurrentNickname(nextValue.nickname);
                setCurrentNicknameChangedAt(nextValue.nicknameChangedAt);
              }}
              presenceDisplayStatus={
                presenceStatus === "INVISIBLE" ? null : presenceStatus
              }
              presenceStatus={presenceStatus}
            />

            <div className="min-w-0 flex-1 pt-2">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-[22px] font-bold leading-tight text-[#111210]">
                  {currentNickname}
                </h2>
                <ProfileAchievementBadgeStrip
                  className="min-w-0 shrink-0"
                  items={publicAchievements}
                  limit={3}
                  locale={locale}
                />
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {profile.friendCode ? (
                  <button
                    aria-label={copied ? copy.copied : copy.copyCode}
                    className="inline-flex min-w-0 shrink items-center gap-1.5 text-left text-[11px] font-bold text-[#4F574F] transition active:scale-[0.98]"
                    onClick={copyFriendCode}
                    title={copied ? copy.copied : copy.copyCode}
                    type="button"
                  >
                    <span className="friemi-tabular">{profile.friendCode}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ) : null}
                <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-bold text-[#6C746A]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F56D62]" />
                  <span className="truncate">
                    {getProfileHomeCityLabel(currentHomeCity, locale)}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <button
                type="button"
                aria-label={copy.scan}
                title={copy.scan}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#ECE6D5] transition active:scale-95"
                onClick={openGlobalQrScanner}
              >
                <ScanLine className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>
          </div>
        </div>

        <MobileProfileSummaryStrip dashboard={dashboard} locale={locale} />
      </section>

      <section className="mt-6 grid grid-cols-4 gap-x-1 gap-y-5">
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/gift-wall")}
          icon={Gift}
          label={copy.giftWall}
          tone="pink"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/network")}
          icon={UsersRound}
          label={copy.friendsFeature}
          tone="blue"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/invite")}
          icon={Ticket}
          label={copy.inviteCode}
          tone="pink"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/shop")}
          icon={ShoppingBag}
          label={copy.shop}
          tone="gold"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/achievements")}
          icon={Medal}
          label={copy.achievements}
          status={String(achievementCatalog.length)}
          tone="gold"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/bag")}
          icon={Package}
          label={copy.bag}
          locked
          lockedLabel={copy.soon}
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/account/settings")}
          icon={Settings}
          label={copy.settings}
          tone="gray"
        />
      </section>

      <ProfilePreviewTabs
        achievementPreviewItems={achievementPreviewItems}
        dashboard={dashboard}
        locale={locale}
      />

      <MobileProfileBioEditor
        bio={profile.bio}
        locale={locale}
        nickname={currentNickname}
      />
    </div>
  );
}

function WerewolfStatsPanel({
  locale,
  stats,
}: {
  locale: string;
  stats: ProfileDashboardViewModel["werewolfStats"];
}) {
  const copy = getWerewolfStatsCopy(locale);

  return (
    <section className="rounded-[1.15rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3 shadow-[0_12px_28px_rgba(30,23,24,0.05)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E1718]">
          <ShieldCheck className="h-4 w-4 text-[#7A1F2B]" />
          {copy.title}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E1718] px-3 py-1 text-xs font-semibold text-white">
          <Trophy className="h-3.5 w-3.5 text-[#F0C36A]" />
          {copy.winRate} {stats.winRate}%
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: copy.played, value: stats.playerGameCount },
          { label: copy.win, value: stats.winCount },
          { label: copy.loss, value: stats.lossCount },
          { label: copy.winRate, value: `${stats.winRate}%` },
          { icon: Crown, label: copy.judge, value: stats.judgeCount },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="min-w-0 rounded-[0.9rem] border border-[#D9C7B4] bg-white px-3 py-2.5"
              key={item.label}
            >
              <p className="flex items-center gap-1.5 text-lg font-semibold leading-none text-[#1E1718]">
                {Icon ? <Icon className="h-4 w-4 text-[#7A1F2B]" /> : null}
                {item.value}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-[#7A1F2B]/72">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileDashboardView({
  achievementPreviewItems = [],
  dashboard,
  hasDashboardError = false,
  isAuthenticated = false,
  isGuestPlaceholder = false,
  isSelf = false,
  locale,
  profile,
  publicAchievements = [],
}: ProfileDashboardViewProps) {
  const t = getCopy(locale);
  const mobileCopy = getMobileProfileCopy(locale);
  const selfMetricLabels = getSelfProfileMetricLabels(locale);
  const profileInitial = profile.nickname.trim().slice(0, 1) || "N";
  const showPrivateParticipation = isSelf;
  const showWerewolfStats =
    dashboard.werewolfStats.playerGameCount > 0 ||
    dashboard.werewolfStats.judgeCount > 0;
  const [activeProfileSection, setActiveProfileSection] =
    useState<ProfileSectionKey>("created");
  const [currentPresenceStatus, setCurrentPresenceStatus] =
    useState<UserPresenceStatusValue>(profile.presenceStatus);

  useEffect(() => {
    const context = readDetailSourceContext();
    const section = context?.sourceState?.section;

    const canRestoreSection =
      section === "created" ||
      section === "participation" ||
      (isSelf && section === "favorite");

    if (
      context &&
      isDetailSourceReturnPage(context, "profile") &&
      canRestoreSection
    ) {
      setActiveProfileSection(section);
    }
  }, [isSelf]);

  useEffect(() => {
    setCurrentPresenceStatus(profile.presenceStatus);
  }, [profile.id, profile.presenceStatus]);

  if (isGuestPlaceholder) {
    return (
      <GuestProfilePlaceholder
        dashboard={dashboard}
        locale={locale}
        profile={profile}
        profileInitial={profileInitial}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl pb-8">
      <div className="md:hidden">
        {isSelf ? (
          <SelfMobileProfileHome
            achievementPreviewItems={achievementPreviewItems}
            dashboard={dashboard}
            locale={locale}
            onPresenceStatusChange={setCurrentPresenceStatus}
            presenceStatus={currentPresenceStatus}
            profile={profile}
            profileInitial={profileInitial}
            publicAchievements={publicAchievements}
          />
        ) : (
          <PublicMobileProfileHome
            dashboard={dashboard}
            isAuthenticated={isAuthenticated}
            locale={locale}
            profile={profile}
            profileInitial={profileInitial}
            publicAchievements={publicAchievements}
          />
        )}
      </div>

      <div className="hidden space-y-5 md:block md:space-y-7">
        <section
          className={
            isSelf
              ? "border-b border-black/10 pb-4 md:pb-6"
              : "rounded-[1.35rem] border border-[#8AB68E]/40 bg-[linear-gradient(145deg,#FEFFF9_0%,#F1F2EC_62%,#FFF5E6_100%)] p-3 shadow-[0_14px_34px_rgba(21,98,64,0.07)] ring-1 ring-white/70 sm:rounded-[1.75rem] sm:p-5"
          }
        >
          {isSelf ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-start">
              <div className="grid min-w-0 gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <ProfileAvatar
                    avatarUrl={profile.avatarUrl}
                    initial={profileInitial}
                    isOnline={currentPresenceStatus === "ONLINE"}
                    name={profile.nickname}
                    presenceDisplayStatus={
                      currentPresenceStatus === "INVISIBLE"
                        ? null
                        : currentPresenceStatus
                    }
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-moss">
                      {t.profile.title}
                    </p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
                        {profile.nickname}
                      </h1>
                      <ProfileAchievementBadgeStrip
                        className="min-w-0 shrink-0"
                        items={publicAchievements}
                        limit={3}
                        locale={locale}
                      />
                    </div>
                    {profile.isCoCreator ? (
                      <CoCreatorIdentityBadge
                        className="mt-2"
                        locale={locale}
                      />
                    ) : null}
                    {profile.bio ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {profile.bio}
                      </p>
                    ) : null}
                  </div>
                </div>
                {profile.friendCode ? (
                  <div className="max-w-xl">
                    <ProfileIdentityForm
                      avatarUrl={profile.avatarUrl}
                      bio={profile.bio}
                      friendCode={profile.friendCode}
                      locale={locale}
                      nickname={profile.nickname}
                      nicknameChangedAt={profile.nicknameChangedAt}
                    />
                  </div>
                ) : null}
                <ProfilePresenceControl
                  locale={locale}
                  onStatusChange={setCurrentPresenceStatus}
                  status={currentPresenceStatus}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <ProfileOverviewPanel
                  activeActivitySection={activeProfileSection}
                  createdCount={dashboard.createdActivityCount}
                  joinedCount={dashboard.participationCount}
                  friendCount={dashboard.friendCount}
                  followers={dashboard.followers}
                  followersCount={dashboard.followersCount}
                  following={dashboard.following}
                  followingCount={dashboard.followingCount}
                  friends={dashboard.friends}
                  locale={locale}
                  createdLabel={selfMetricLabels.created}
                  joinedLabel={selfMetricLabels.joined}
                  onActivitySectionChange={setActiveProfileSection}
                  showFriendCount={isSelf}
                  showJoinedCount={showPrivateParticipation}
                />
                <CharmProgressPanel
                  className="rounded-2xl bg-white/72 px-4 py-3 ring-1 ring-[#E6DEC6]"
                  dashboard={dashboard}
                  locale={locale}
                  showRecentGifts
                />
                <Link
                  href={withLocale(locale, "/messages")}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-sand transition hover:bg-white sm:w-fit lg:self-end"
                >
                  <UsersRound className="h-4 w-4" />
                  {mobileCopy.networkTitle}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <ProfileAvatar
                  avatarUrl={profile.avatarUrl}
                  initial={profileInitial}
                  isOnline={profile.isOnline}
                  name={profile.nickname}
                  presenceDisplayStatus={profile.presenceDisplayStatus}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-normal text-moss/75 sm:text-xs sm:tracking-normal">
                    {t.profile.title}
                  </p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2 sm:mt-1">
                    <h1 className="truncate text-xl font-semibold tracking-normal text-ink sm:text-3xl">
                      {profile.nickname}
                    </h1>
                    <ProfileAchievementBadgeStrip
                      className="min-w-0 shrink-0"
                      items={publicAchievements}
                      limit={3}
                      locale={locale}
                    />
                  </div>
                  {profile.remarkName &&
                  profile.publicNickname !== profile.nickname ? (
                    <p className="mt-1 truncate text-xs font-semibold text-[#6C746A]">
                      {profile.publicNickname}
                    </p>
                  ) : null}
                  {profile.isCoCreator ? (
                    <CoCreatorIdentityBadge className="mt-2" locale={locale} />
                  ) : null}
                  {profile.bio ? (
                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-zinc-500">
                      {profile.bio}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-end">
                  <PublicProfileMoreMenu
                    buttonClassName="bg-white/85 ring-1 ring-[#D6D5B2] hover:bg-white"
                    isAuthenticated={isAuthenticated}
                    locale={locale}
                    profile={profile}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(21,98,64,0.04)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35",
                      activeProfileSection === "created"
                        ? "border-[#369758] bg-white/85"
                        : "border-[#8AB68E]/45 bg-white/65",
                    )}
                    onClick={() => setActiveProfileSection("created")}
                    type="button"
                  >
                    <p className="text-xl font-semibold leading-none text-[#156240] sm:text-2xl">
                      {dashboard.createdActivityCount}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#1D1D1B]/70">
                      {selfMetricLabels.created}
                    </p>
                  </button>
                  <button
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(21,98,64,0.035)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35",
                      activeProfileSection === "participation"
                        ? "border-[#369758] bg-white/85"
                        : "border-[#8AB68E]/35 bg-white/60",
                    )}
                    onClick={() => setActiveProfileSection("participation")}
                    type="button"
                  >
                    <p className="text-xl font-semibold leading-none text-[#156240] sm:text-2xl">
                      {dashboard.participationCount}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#1D1D1B]/70">
                      {selfMetricLabels.pastJoined}
                    </p>
                  </button>
                </div>
                <ProfileSocialActions
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  profileId={profile.id}
                  relationship={dashboard.viewerRelationship}
                />
                <CharmProgressPanel
                  className="border-t border-[#D6D5B2]/55 pt-2"
                  dashboard={dashboard}
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  recipientName={profile.nickname}
                  recipientProfileId={profile.id}
                  showGiftAction
                  showRecentGifts
                />
              </div>
            </div>
          )}
        </section>

        {hasDashboardError ? (
          <EmptyState
            title={t.profile.errorTitle}
            description={t.profile.errorDescription}
          />
        ) : (
          <>
            {showWerewolfStats ? (
              <WerewolfStatsPanel
                locale={locale}
                stats={dashboard.werewolfStats}
              />
            ) : null}
            <ProfileActivitySections
              activeSection={activeProfileSection}
              dashboard={dashboard}
              isAuthenticated={isAuthenticated}
              isSelf={showPrivateParticipation}
              locale={locale}
              onActiveSectionChange={setActiveProfileSection}
            />
          </>
        )}
      </div>
    </div>
  );
}
