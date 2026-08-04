"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Copy,
  Crown,
  Gift,
  Info,
  Lock,
  Medal,
  MoreHorizontal,
  Package,
  ScanLine,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  UserRoundPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { FollowButton } from "@/features/follow/components/FollowButton";
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
import { ProfileAchievementBadgeStrip } from "./ProfilePublicAchievementWall";
import { ProfileOverviewPanel } from "./ProfileOverviewPanel";
import { ProfileSocialActions } from "./ProfileSocialActions";
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
  publicAchievements?: PublicAchievementWallItem[];
};

const profilePresenceInitialState: UpdateProfilePresenceState = {};

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
      giftWall: "Cadeaux",
      hangoutsTitle: "Mes sorties",
      invite: "Inviter",
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
      giftWall: "Gifts",
      hangoutsTitle: "My Plans",
      invite: "Invite",
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
    charmLevelsIntro: "别人送你的礼物会提升魅力值。它代表受欢迎程度，不代表信用。",
    charmLevelsOpen: "查看魅力等级",
    charmLevelsScore: "魅力值",
    charmLevelsStartingAt: "达到",
    charmLevelsTitle: "魅力等级",
    copyCode: "复制",
    copied: "已复制",
    created: "聚吧",
    editProfile: "编辑资料",
    friends: "关系",
    giftWall: "礼物墙",
    hangoutsTitle: "我的聚吧",
    invite: "邀请",
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
  size?: "sm" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-12 w-12 text-base" : "h-16 w-16 text-3xl";
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
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black transition active:scale-[0.98]",
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
          <h1 className="text-[18px] font-black leading-tight tracking-normal text-[#111210]">
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
              <h2 className="truncate text-[18px] font-black leading-tight text-[#111210]">
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
                <p className="text-[22px] font-black leading-none text-[#111210]">
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
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition active:scale-95"
            >
              {copy.signIn}
            </Link>
            <Link
              href={planetsHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
            >
              {copy.browsePlanets}
            </Link>
            <Link
              href={settingsHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#5F5743] ring-1 ring-[#E8D59D] transition active:scale-95"
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

function MobileStatLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="min-w-0 px-2 py-2 text-center transition active:scale-[0.98]"
    >
      <p className="text-[22px] font-black leading-none text-[#111210]">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold leading-3 text-[#4F574F]">
        {label}
      </p>
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
  tone?: "green" | "pink" | "blue" | "gold";
}) {
  const toneClass =
    locked
      ? "bg-white text-[#8B907F] ring-[#D6D5B2]"
      : tone === "pink"
      ? "bg-[radial-gradient(circle_at_30%_25%,#FFF5F7_0%,#FFE6EE_48%,#F7F2F4_100%)] text-[#E83F83] ring-[#F5C5D7]"
      : tone === "blue"
        ? "bg-[radial-gradient(circle_at_30%_25%,#EEF5FF_0%,#E6F0FF_48%,#F7F4EC_100%)] text-[#143376] ring-[#C8D9F5]"
        : tone === "gold"
          ? "bg-[radial-gradient(circle_at_30%_25%,#FFF9E8_0%,#FFF1C9_48%,#F6F2E7_100%)] text-[#7D641C] ring-[#E8D59D]"
          : "bg-[radial-gradient(circle_at_30%_25%,#F3FAEF_0%,#E4F3DF_48%,#F7F3E9_100%)] text-[#156240] ring-[#BFD8B9]";

  const content = (
    <>
      <span
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] shadow-[0_10px_18px_rgba(21,98,64,0.08)] ring-1",
          toneClass,
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem]" />
        {locked ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6C746A] ring-1 ring-[#D6D5B2]">
            <Lock className="h-3 w-3" strokeWidth={2.4} />
          </span>
        ) : status ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 max-w-[3rem] items-center rounded-full bg-[#FEFFF9] px-1.5 text-[9px] font-black leading-none text-[#156240] shadow-sm ring-1 ring-[#D6D5B2]">
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

  return (
    <div className="flex items-center justify-end gap-2">
      <FollowButton
        activeButtonClassName="!h-8 !min-h-8 min-w-[5rem] rounded-full border border-[#8AB68E] bg-white !px-3 !text-[11px] font-black text-[#156240] shadow-none active:scale-[0.98]"
        activeLabel={activeLabel}
        buttonClassName="!h-8 !min-h-8 min-w-[4.5rem] rounded-full border border-[#8AB68E] bg-white !px-3 !text-[11px] font-black text-[#156240] shadow-none active:scale-[0.98]"
        fullWidth={false}
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
        <form action={openDirectConversationAction}>
          <input name="locale" type="hidden" value={locale} />
          <input name="friendProfileId" type="hidden" value={profileId} />
          <input name="redirectPath" type="hidden" value={redirectPath} />
          <button
            className="inline-flex h-8 items-center justify-center rounded-full bg-[#156240] px-3 text-[11px] font-black text-white shadow-[0_10px_18px_rgba(21,98,64,0.16)] active:scale-[0.98]"
            type="submit"
          >
            {copy.message}
          </button>
        </form>
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
          className="inline-flex h-7 items-center gap-1 rounded-full bg-white/78 px-2 text-[11px] font-black text-[#1D1D1B] ring-1 ring-[#E8E0C8]"
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
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8A61CE]">
              {copy.charmLevelsCurrent}
            </p>
            <h2
              className="mt-1 text-xl font-black leading-tight text-[#111210]"
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
                    <p className="truncate text-sm font-black">
                      {getCharmLevelLabel(level, locale)}
                    </p>
                    {active ? (
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#8A61CE] ring-1 ring-[#DBC8F3]">
                        {copy.charmLevelsCurrent}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#7A8276]">
                    {getCharmLevelDescription(level, locale)}
                  </p>
                </div>
                <p className="whitespace-nowrap text-xs font-black text-[#8A61CE]">
                  {copy.charmLevelsStartingAt}{" "}
                  {formatCharmScore(level.minScore)}
                </p>
              </div>
            );
          })}
        </div>

        <button
          className="mt-4 h-11 w-full rounded-full bg-[#156240] px-5 text-sm font-black text-white transition active:scale-[0.98]"
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
            <p className="text-[26px] font-black leading-none text-[#A57AEB]">
              {formatCharmScore(progress.score)}
            </p>
            <button
              aria-label={copy.charmLevelsOpen}
              className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full text-left text-xs font-black text-[#8B78B9] transition active:scale-[0.98]"
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
                      <p className="text-[25px] font-black leading-none text-[#111210]">
                        {item.dateParts.day}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-4 text-[#7A8276]">
                        {item.dateParts.month}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-[#156240]">
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
          <button
            aria-label={copy.more}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#1D1D1B]"
            onClick={() => window.alert(copy.soon)}
            type="button"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2.3} />
          </button>
        </div>
      </header>

      <section className="mt-6">
        <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-start gap-3">
          <ProfileAvatar
            avatarUrl={profile.avatarUrl}
            initial={profileInitial}
            isOnline={profile.isOnline}
            name={profile.nickname}
            presenceDisplayStatus={profile.presenceDisplayStatus}
          />
          <div className="min-w-0 pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-black leading-tight text-[#111210]">
                {profile.nickname}
              </h1>
              {profile.isCoCreator ? (
                <CoCreatorIdentityBadge locale={locale} variant="icon" />
              ) : null}
              <TrustScoreBadge locale={locale} score={dashboard.trustScore} />
              <ProfileAchievementBadgeStrip
                className="min-w-0 shrink-0"
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
            {profile.bio ? (
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[#4F574F]">
                {profile.bio}
              </p>
            ) : null}
          </div>
          <div className="grid justify-items-end gap-2 pt-1">
            <PublicMobileProfileActions
              isAuthenticated={isAuthenticated}
              locale={locale}
              profileId={profile.id}
              relationship={dashboard.viewerRelationship}
            />
          </div>
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
        "relative inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-white/84 px-2 text-[11px] font-black text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.06)] ring-1 ring-[#E3DCC5] transition active:scale-95",
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
        <span className="absolute left-1/2 top-[calc(100%+0.4rem)] z-30 max-w-[5rem] -translate-x-1/2 truncate rounded-full bg-[#111210] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(17,18,16,0.16)]">
          {copy.tooltip}
        </span>
      ) : null}
    </button>
  );
}

function getProfileBioEditorCopy(locale: string) {
  if (locale === "fr") {
    return {
      bioLabel: "Bio",
      cancel: "Annuler",
      edit: "Modifier",
      empty: "Pas encore de bio.",
      placeholder: "Ajoutez une courte présentation",
      save: "Enregistrer",
      saving: "Enregistrement...",
    };
  }

  if (locale === "en") {
    return {
      bioLabel: "Bio",
      cancel: "Cancel",
      edit: "Edit",
      empty: "No bio yet.",
      placeholder: "Write a short intro",
      save: "Save",
      saving: "Saving...",
    };
  }

  return {
    bioLabel: "简介",
    cancel: "取消",
    edit: "编辑",
    empty: "还没有填写简介。",
    placeholder: "简单介绍一下自己",
    save: "保存",
    saving: "保存中...",
  };
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
      <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-semibold leading-5 text-[#4F574F]">
          {savedBio.trim() || copy.empty}
        </p>
        <button
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
          type="button"
          onClick={() => setOpen(true)}
        >
          {copy.edit}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end bg-[#111210]/32 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
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
              <h3 className="text-lg font-black text-[#111210]">
                {copy.bioLabel}
              </h3>
              <button
                className="h-9 rounded-full bg-white px-4 text-xs font-black text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
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
      className="h-9 rounded-full bg-[#156240] px-5 text-xs font-black text-white shadow-[0_10px_20px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
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
      save: "Enregistrer",
      saving: "Enregistrement...",
      title: "Avatar",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      change: "Change avatar",
      save: "Save",
      saving: "Saving...",
      title: "Avatar",
    };
  }

  return {
    cancel: "取消",
    change: "修改头像",
    save: "保存",
    saving: "保存中...",
    title: "头像",
  };
}

function MobileProfileAvatarEditor({
  avatarUrl,
  bio,
  initial,
  isOnline,
  locale,
  name,
  nickname,
  onSaved,
  presenceDisplayStatus,
}: {
  avatarUrl: string | null;
  bio: string | null;
  initial: string;
  isOnline: boolean;
  locale: string;
  name: string;
  nickname: string;
  onSaved: (avatarUrl: string | null) => void;
  presenceDisplayStatus?: UserPresenceDisplayStatus;
}) {
  const copy = getMobileProfileAvatarEditorCopy(locale);
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    mobileAvatarInitialState,
  );
  const [open, setOpen] = useState(false);
  const [avatarValue, setAvatarValue] = useState<string | null>(avatarUrl);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    setAvatarValue(avatarUrl);
    setAvatarDirty(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!state.success || state.avatarUrl === undefined) {
      return;
    }

    onSaved(state.avatarUrl);
    setAvatarDirty(false);
    setOpen(false);
    router.refresh();
  }, [onSaved, router, state.avatarUrl, state.success]);

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
          size="sm"
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
          <form
            action={formAction}
            className="w-full rounded-[1.6rem] bg-white p-4 ring-1 ring-[#E6E6E0]"
            noValidate
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#111210]">
                {copy.title}
              </h3>
              <button
                className="h-9 rounded-full bg-white px-4 text-xs font-black text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
                type="button"
                onClick={() => setOpen(false)}
              >
                {copy.cancel}
              </button>
            </div>
            <input name="locale" type="hidden" value={locale} />
            <input name="afterSave" type="hidden" value="refresh" />
            <input name="nickname" type="hidden" value={nickname} />
            <input name="bio" type="hidden" value={bio ?? ""} />
            {avatarDirty && avatarValue ? (
              <input name="avatarUrl" type="hidden" value={avatarValue} />
            ) : null}
            <ProfileAvatarPicker
              className="mt-4"
              initial={initial}
              locale={locale}
              name={name}
              onChange={(nextAvatarUrl) => {
                setAvatarValue(nextAvatarUrl);
                setAvatarDirty(true);
              }}
              onUploadingChange={setIsAvatarUploading}
              value={avatarValue}
              variant="sheet"
            />
            {state.formError ? (
              <p className="mt-3 text-xs font-semibold text-[#9A2135]">
                {state.formError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <MobileProfileAvatarSubmitButton
                disabled={!avatarDirty || isAvatarUploading}
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
      className="h-9 rounded-full bg-[#156240] px-5 text-xs font-black text-white shadow-[0_10px_20px_rgba(21,98,64,0.18)] transition active:scale-95 disabled:opacity-60"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function SelfMobileProfileHome({
  dashboard,
  locale,
  onPresenceStatusChange,
  presenceStatus,
  profile,
  profileInitial,
  publicAchievements,
}: {
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
  const [copied, setCopied] = useState(false);
  const nativeQrScanPendingRef = useRef(false);

  useEffect(() => {
    setCurrentAvatarUrl(profile.avatarUrl);
  }, [profile.avatarUrl]);

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
    <div className="min-h-[calc(100dvh-var(--mobile-nav-height,5rem))] bg-white px-5 pb-28 pt-7">
      <section>
        <div>
          <div className="flex items-start gap-3">
            <MobileProfileAvatarEditor
              avatarUrl={currentAvatarUrl}
              bio={profile.bio}
              initial={profileInitial}
              isOnline={presenceStatus === "ONLINE"}
              locale={locale}
              name={profile.nickname}
              nickname={profile.nickname}
              onSaved={setCurrentAvatarUrl}
              presenceDisplayStatus={
                presenceStatus === "INVISIBLE" ? null : presenceStatus
              }
            />

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-[18px] font-black leading-tight text-[#111210]">
                  {profile.nickname}
                </h2>
                <TrustScoreBadge locale={locale} score={dashboard.trustScore} />
                <ProfileAchievementBadgeStrip
                  className="min-w-0 shrink-0"
                  items={publicAchievements}
                  limit={3}
                  locale={locale}
                />
              </div>
              {profile.friendCode ? (
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <button
                    className="inline-flex min-w-0 shrink items-center gap-1.5 text-left text-[11px] font-bold text-[#4F574F]"
                    onClick={copyFriendCode}
                    type="button"
                  >
                    <span>{profile.friendCode}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                    <span className="tracking-normal">
                      {copied ? copy.copied : copy.copyCode}
                    </span>
                  </button>
                </div>
              ) : null}
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

          <div className="mt-3">
            <ProfilePresenceControl
              locale={locale}
              onStatusChange={onPresenceStatusChange}
              status={presenceStatus}
            />
          </div>
          <MobileProfileBioEditor
            bio={profile.bio}
            locale={locale}
            nickname={profile.nickname}
          />

          <CharmProgressPanel
            className="mt-5 py-1"
            dashboard={dashboard}
            locale={locale}
          />
        </div>

        <div className="mt-6 grid grid-cols-3">
          <MobileStatLink
            href={withLocale(locale, "/profile/hangouts")}
            label={copy.created}
            value={dashboard.createdActivityCount}
          />
          <MobileStatLink
            href={withLocale(locale, "/profile/network")}
            label={copy.friends}
            value={dashboard.friendCount}
          />
          <MobileStatLink
            href={withLocale(locale, "/profile/moments")}
            label={copy.moments}
            value={dashboard.momentCount}
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-y-4">
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/invite")}
          icon={UserRoundPlus}
          label={copy.invite}
          tone="pink"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/bag")}
          icon={Package}
          label={copy.bag}
          locked
          lockedLabel={copy.soon}
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/shop")}
          icon={ShoppingBag}
          label={copy.shop}
          tone="gold"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/gift-wall")}
          icon={Gift}
          label={copy.giftWall}
          tone="pink"
        />
        <ProfileFeatureLink
          href={withLocale(locale, "/profile/achievements")}
          icon={Medal}
          label={copy.achievements}
          status={String(achievementCatalog.length)}
          tone="gold"
        />
        <Link
          href={withLocale(locale, "/account/settings")}
          className="grid min-w-0 justify-items-center gap-1.5 rounded-2xl px-1 py-1.5 text-center transition active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[#FFF7DC] text-[#5F5743] shadow-[0_10px_18px_rgba(160,128,40,0.12)] ring-1 ring-[#E8D59D]">
            <Settings className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="text-[11px] font-bold text-[#1D1D1B]">
            {copy.settings}
          </span>
        </Link>
      </section>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss/75 sm:text-xs sm:tracking-[0.16em]">
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
