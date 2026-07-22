"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useClerk } from "@clerk/nextjs";
import {
  ArrowLeft,
  BadgeCheck,
  Copy,
  Crown,
  Eye,
  Gift,
  Medal,
  MoreHorizontal,
  Package,
  ScanLine,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserRoundPlus,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getFriendsCopy } from "@/features/friends/copy";
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
  getCharmLevelLabel,
  getCharmProgress,
} from "@/features/charm/charm";
import { CharmGiftDialog } from "@/features/charm/components/CharmGiftDialog";
import { getTrustLevelLabel } from "@/features/trust/trustScore";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import {
  ProfileActivitySections,
  type ProfileSectionKey,
} from "./ProfileActivitySections";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";
import { ProfileIdentityForm } from "./ProfileIdentityForm";
import { ProfileOverviewPanel } from "./ProfileOverviewPanel";
import { ProfileSocialActions } from "./ProfileSocialActions";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";
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
};

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

function getMobileProfileCopy(locale: string) {
  if (locale === "fr") {
    return {
      accountSecurity: "Compte et sécurité",
      accountSettings: "Paramètres du compte",
      achievements: "Badges",
      addFriend: "Ajouter",
      bag: "Sac",
      charm: "Aura",
      copyCode: "Copier",
      copied: "Copié",
      created: "Sorties",
      editProfile: "Modifier",
      friends: "Amis",
      giftWall: "Cadeaux",
      hangoutsTitle: "Mes sorties",
      invite: "Inviter",
      maxCharm: "Niveau max",
      message: "Message",
      moments: "Moments",
      more: "Plus",
      networkTitle: "Mes amis",
      noTimeline: "Aucune activité publique pour le moment.",
      nextCharm: "Prochain",
      pendingFriend: "Demandé",
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
      wallet: "Recharge",
    };
  }

  if (locale === "en") {
    return {
      accountSecurity: "Account & security",
      accountSettings: "Account settings",
      achievements: "Badges",
      addFriend: "Add friend",
      bag: "Bag",
      charm: "Charm",
      copyCode: "Copy",
      copied: "Copied",
      created: "Hangouts",
      editProfile: "Edit",
      friends: "Friends",
      giftWall: "Gifts",
      hangoutsTitle: "My Hangouts",
      invite: "Invite",
      maxCharm: "Top level",
      message: "Message",
      moments: "Moments",
      more: "More",
      networkTitle: "My Friends",
      noTimeline: "No public activity yet.",
      nextCharm: "Next",
      pendingFriend: "Requested",
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
      wallet: "Top up",
    };
  }

  return {
    accountSecurity: "账号与安全",
    accountSettings: "账号设置",
    achievements: "成就",
    addFriend: "加好友",
    bag: "背包",
    charm: "魅力值",
    copyCode: "复制",
    copied: "已复制",
    created: "组局",
    editProfile: "编辑资料",
    friends: "好友",
    giftWall: "礼物墙",
    hangoutsTitle: "我的组局",
    invite: "邀请好友",
    maxCharm: "最高等级",
    message: "发消息",
    moments: "足迹",
    more: "更多",
    networkTitle: "我的好友",
    noTimeline: "暂时没有公开动态。",
    nextCharm: "下一等级",
    pendingFriend: "已申请",
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
    wallet: "充值",
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
  name,
  size = "lg",
}: {
  avatarUrl: string | null;
  initial: string;
  name: string;
  size?: "sm" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-12 w-12 text-base" : "h-16 w-16 text-3xl";

  if (avatarUrl) {
    return (
      // User avatars are stored as remote URLs from Clerk/user data.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn(sizeClass, "shrink-0 rounded-full object-cover")}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-full bg-[#E83F83] font-medium text-white shadow-[0_14px_28px_rgba(232,63,131,0.18)]",
      )}
    >
      {initial}
    </div>
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
      <div className="min-h-[calc(100dvh-var(--mobile-nav-height,5rem))] bg-[#FEFFF9] px-5 pb-28 pt-5 md:hidden">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-[18px] font-black leading-tight tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <Link
            href={settingsHref}
            aria-label={copy.settings}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF7DC] text-[#5F5743] shadow-[0_8px_18px_rgba(160,128,40,0.15)] ring-1 ring-[#E8D59D] transition active:scale-95"
          >
            <Settings className="h-[1.125rem] w-[1.125rem]" />
          </Link>
        </header>

        <section className="mt-6">
          <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              initial={profileInitial}
              name={profile.nickname}
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
                name={profile.nickname}
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

function ComingSoonFeature({
  icon: Icon,
  label,
  soon,
}: {
  icon: LucideIcon;
  label: string;
  soon: string;
}) {
  return (
    <button
      className="grid min-w-0 justify-items-center gap-1.5 rounded-2xl px-1 py-1.5 text-center transition active:scale-[0.98]"
      onClick={() => window.alert(soon)}
      type="button"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[radial-gradient(circle_at_30%_25%,#FFF3EE_0%,#FFE3DF_44%,#F7F2F4_100%)] text-[#F15F5B] shadow-[0_12px_22px_rgba(241,95,91,0.08)]">
        <Icon className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="text-[11px] font-bold text-[#1D1D1B]">{label}</span>
    </button>
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

  if (!isAuthenticated) {
    return (
      <Link
        href={getSignInHref(locale, `/profile/${profileId}`)}
        className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-[11px] font-black text-[#156240] ring-1 ring-[#8AB68E]"
      >
        {copy.addFriend}
      </Link>
    );
  }

  if (relationship.isFriend) {
    return (
      <form action={openDirectConversationAction}>
        <input name="locale" type="hidden" value={locale} />
        <input name="friendProfileId" type="hidden" value={profileId} />
        <button
          className="inline-flex h-8 items-center justify-center rounded-full bg-[#156240] px-3 text-[11px] font-black text-white shadow-[0_10px_18px_rgba(21,98,64,0.16)]"
          type="submit"
        >
          {copy.message}
        </button>
      </form>
    );
  }

  if (relationship.pendingFriendRequest === "sent") {
    return (
      <span className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-[11px] font-black text-[#156240] ring-1 ring-[#8AB68E]">
        {copy.pendingFriend}
      </span>
    );
  }

  return (
    <div className="min-w-[74px] [&_button]:!h-8 [&_button]:!px-3 [&_button]:!text-[11px] [&_svg]:!hidden">
      <ProfileSocialActions
        isAuthenticated={isAuthenticated}
        locale={locale}
        profileId={profileId}
        relationship={relationship}
      />
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
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        className,
      )}
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

function SelfCharmFeature({
  dashboard,
  locale,
  label,
}: {
  dashboard: ProfileDashboardViewModel;
  label: string;
  locale: string;
}) {
  const progress = getCharmProgress(dashboard.charmScore);
  const levelLabel = getCharmLevelLabel(progress.current, locale);

  return (
    <div className="grid min-w-0 justify-items-center gap-1.5 px-1 py-1.5 text-center">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-[radial-gradient(circle_at_30%_25%,#F6EEFF_0%,#EFE7FF_46%,#FFF4EA_100%)] text-[#8A61CE] shadow-[0_10px_18px_rgba(138,97,206,0.12)] ring-1 ring-[#DBC8F3]">
        <Sparkles className="h-[1.125rem] w-[1.125rem]" />
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FEFFF9] px-1 text-[10px] font-black text-[#8A61CE] ring-1 ring-[#DBC8F3]">
          {progress.current.icon}
        </span>
      </span>
      <span className="max-w-full truncate text-[11px] font-bold text-[#1D1D1B]">
        {label}
      </span>
      <span className="max-w-full truncate whitespace-nowrap text-[10px] font-black text-[#8A61CE]">
        {dashboard.charmScore} / {levelLabel}
      </span>
    </div>
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
}: {
  dashboard: ProfileDashboardViewModel;
  isAuthenticated: boolean;
  locale: string;
  profile: PublicProfileViewModel;
  profileInitial: string;
}) {
  const copy = getMobileProfileCopy(locale);
  const charmProgress = getCharmProgress(dashboard.charmScore);
  const charmLevelLabel = getCharmLevelLabel(charmProgress.current, locale);
  const nextCharmLabel = charmProgress.next
    ? `${charmProgress.score} / ${charmProgress.next.minScore}`
    : charmLevelLabel;
  const charmProgressWidth = `${Math.max(3, Math.round(charmProgress.progressRatio * 100))}%`;

  return (
    <div className="min-h-[calc(100dvh-var(--mobile-nav-height,5rem))] bg-[#FEFFF9] px-5 pb-28 pt-5">
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
            name={profile.nickname}
          />
          <div className="min-w-0 pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-black leading-tight text-[#111210]">
                {profile.nickname}
              </h1>
              {profile.isCoCreator ? (
                <CoCreatorIdentityBadge locale={locale} variant="icon" />
              ) : null}
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
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_10px_22px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <PublicMobileProfileActions
              isAuthenticated={isAuthenticated}
              locale={locale}
              profileId={profile.id}
              relationship={dashboard.viewerRelationship}
            />
          </div>
        </div>

        <div className="mt-7 border-b border-[#E3DCC5] pb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[26px] font-black leading-none text-[#A57AEB]">
                {charmProgress.score}
              </p>
              <p className="mt-1 text-xs font-black text-[#8B78B9]">
                {charmProgress.current.icon} {charmLevelLabel}
              </p>
            </div>
            <p className="text-xs font-bold text-[#7A8276]">
              {nextCharmLabel}
            </p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#EFEAD7]">
            <div
              className="h-full rounded-full bg-[#BFAAF4]"
              style={{ width: charmProgressWidth }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs font-semibold text-[#8B907F]">
              {charmProgress.next
                ? `${copy.nextCharm} ${charmProgress.next.icon} ${getCharmLevelLabel(charmProgress.next, locale)}`
                : copy.maxCharm}
            </p>
            <CharmGiftDialog
              isAuthenticated={isAuthenticated}
              locale={locale}
              recipientName={profile.nickname}
              recipientProfileId={profile.id}
            />
          </div>
          <RecentCharmGifts
            className="mt-3"
            gifts={dashboard.recentCharmGifts}
            label={copy.recentGifts}
          />
        </div>
      </section>

      <PublicMobileTimeline dashboard={dashboard} locale={locale} />
    </div>
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

function SelfMobileProfileHome({
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
  const copy = getMobileProfileCopy(locale);
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [copied, setCopied] = useState(false);
  const nativeQrScanPendingRef = useRef(false);

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
    <div className="min-h-[calc(100dvh-var(--mobile-nav-height,5rem))] bg-[#FEFFF9] px-5 pb-28 pt-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-black leading-tight tracking-normal text-[#111210]">
          {copy.profileTitle}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={copy.scan}
            title={copy.scan}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#ECE6D5] transition active:scale-95"
            onClick={openGlobalQrScanner}
          >
            <ScanLine className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <Link
            href={withLocale(locale, "/account/settings")}
            aria-label={copy.settings}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF7DC] text-[#5F5743] shadow-[0_8px_18px_rgba(160,128,40,0.15)] ring-1 ring-[#E8D59D] transition active:scale-95"
          >
            <Settings className="h-[1.125rem] w-[1.125rem]" />
          </Link>
        </div>
      </header>

      <section className="mt-6">
        <div className="grid grid-cols-[4rem_minmax(0,1fr)_3.25rem] items-start gap-3">
          <button
            aria-label={copy.editProfile}
            className="group relative shrink-0 rounded-full transition active:scale-95"
            onClick={() => openUserProfile()}
            type="button"
          >
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              initial={profileInitial}
              name={profile.nickname}
              size="sm"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[18px] font-black leading-tight text-[#111210]">
              {profile.nickname}
            </h2>
            {profile.friendCode ? (
              <button
                className="mt-0.5 inline-flex items-center gap-1.5 text-left text-[11px] font-bold text-[#4F574F]"
                onClick={copyFriendCode}
                type="button"
              >
                <span>{profile.friendCode}</span>
                <Copy className="h-3.5 w-3.5" />
                <span className="tracking-normal">
                  {copied ? copy.copied : copy.copyCode}
                </span>
              </button>
            ) : null}
            <MobileProfileBioEditor
              bio={profile.bio}
              locale={locale}
              nickname={profile.nickname}
            />
          </div>
          <div className="grid justify-items-center gap-1 text-center">
            <span className="text-[10px] font-bold text-[#4F574F]">
              {copy.trusted}
            </span>
            <span className="inline-flex min-h-8 min-w-12 items-center justify-center gap-1 rounded-full bg-white px-2 text-[11px] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              {dashboard.trustScore}
            </span>
            <span className="max-w-[4.75rem] truncate text-[9px] font-bold leading-none text-[#8B907F]">
              {getTrustLevelLabel(dashboard.trustScore, locale)}
            </span>
          </div>
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
            href={withLocale(locale, "/footprints")}
            label={copy.moments}
            value={dashboard.momentCount}
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-y-4">
        <SelfCharmFeature
          dashboard={dashboard}
          label={copy.charm}
          locale={locale}
        />
        <ComingSoonFeature
          icon={UserRoundPlus}
          label={copy.invite}
          soon={copy.soon}
        />
        <ComingSoonFeature icon={Eye} label={copy.visitors} soon={copy.soon} />
        <ComingSoonFeature icon={Package} label={copy.bag} soon={copy.soon} />
        <ComingSoonFeature
          icon={WalletCards}
          label={copy.wallet}
          soon={copy.soon}
        />
        <ComingSoonFeature
          icon={ShoppingBag}
          label={copy.shop}
          soon={copy.soon}
        />
        <ComingSoonFeature icon={Gift} label={copy.giftWall} soon={copy.soon} />
        <ComingSoonFeature
          icon={Medal}
          label={copy.achievements}
          soon={copy.soon}
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
}: ProfileDashboardViewProps) {
  const t = getCopy(locale);
  const friendsCopy = getFriendsCopy(locale);
  const mobileCopy = getMobileProfileCopy(locale);
  const selfMetricLabels = getSelfProfileMetricLabels(locale);
  const profileInitial = profile.nickname.trim().slice(0, 1) || "N";
  const showPrivateParticipation = isSelf;
  const showWerewolfStats =
    dashboard.werewolfStats.playerGameCount > 0 ||
    dashboard.werewolfStats.judgeCount > 0;
  const profileCharmProgress = getCharmProgress(dashboard.charmScore);
  const profileCharmLevelLabel = getCharmLevelLabel(
    profileCharmProgress.current,
    locale,
  );
  const [activeProfileSection, setActiveProfileSection] =
    useState<ProfileSectionKey>("created");

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
            profile={profile}
            profileInitial={profileInitial}
          />
        ) : (
          <PublicMobileProfileHome
            dashboard={dashboard}
            isAuthenticated={isAuthenticated}
            locale={locale}
            profile={profile}
            profileInitial={profileInitial}
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
                  {profile.avatarUrl ? (
                    // User avatars are stored as remote URLs from Clerk/user data.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.nickname}
                      className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss text-lg font-semibold text-white sm:h-16 sm:w-16 sm:text-xl">
                      {profileInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-moss">
                      {t.profile.title}
                    </p>
                    <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
                      {profile.nickname}
                    </h1>
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
                      bio={profile.bio}
                      friendCode={profile.friendCode}
                      locale={locale}
                      nickname={profile.nickname}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <ProfileOverviewPanel
                  activeActivitySection={activeProfileSection}
                  createdCount={dashboard.createdActivityCount}
                  joinedCount={dashboard.participationCount}
                  friendCount={dashboard.friendCount}
                  friends={dashboard.friends}
                  locale={locale}
                  createdLabel={selfMetricLabels.created}
                  joinedLabel={selfMetricLabels.joined}
                  onActivitySectionChange={setActiveProfileSection}
                  showFriendCount={isSelf}
                  showJoinedCount={showPrivateParticipation}
                />
                <div className="rounded-2xl bg-white/72 px-4 py-3 ring-1 ring-[#E6DEC6]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1D1D1B]">
                        {profileCharmProgress.current.icon}{" "}
                        {profileCharmLevelLabel}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-[#7A8276]">
                        {dashboard.charmScore} {mobileCopy.charm}
                      </p>
                    </div>
                    <Sparkles className="h-5 w-5 shrink-0 text-[#8A61CE]" />
                  </div>
                  <RecentCharmGifts
                    className="mt-2"
                    gifts={dashboard.recentCharmGifts}
                    label={mobileCopy.recentGifts}
                  />
                </div>
                <Link
                  href={withLocale(locale, "/messages")}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-sand transition hover:bg-white sm:w-fit lg:self-end"
                >
                  <UsersRound className="h-4 w-4" />
                  {friendsCopy.openFriends}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] md:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                {profile.avatarUrl ? (
                  // User avatars are stored as remote URLs from Clerk/user data.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.nickname}
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss text-base font-semibold text-white ring-2 ring-white sm:h-16 sm:w-16 sm:text-xl">
                    {profileInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss/75 sm:text-xs sm:tracking-[0.16em]">
                    {t.profile.title}
                  </p>
                  <h1 className="mt-0.5 truncate text-xl font-semibold tracking-normal text-ink sm:mt-1 sm:text-3xl">
                    {profile.nickname}
                  </h1>
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
                <div className="flex items-center justify-between gap-3 border-t border-[#D6D5B2]/55 pt-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1D1D1B]">
                      {profileCharmProgress.current.icon}{" "}
                      {profileCharmLevelLabel}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#7A8276]">
                      {dashboard.charmScore} {mobileCopy.charm}
                    </p>
                  </div>
                  <CharmGiftDialog
                    isAuthenticated={isAuthenticated}
                    locale={locale}
                    recipientName={profile.nickname}
                    recipientProfileId={profile.id}
                    triggerClassName="bg-white/80 ring-1 ring-[#E6DEC6]"
                  />
                </div>
                <RecentCharmGifts
                  className="border-t border-[#D6D5B2]/45 pt-2"
                  gifts={dashboard.recentCharmGifts}
                  label={mobileCopy.recentGifts}
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
