"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Eye,
  Gift,
  Gem,
  Hourglass,
  LoaderCircle,
  Lock,
  Medal,
  MessageCircle,
  Package,
  RefreshCw,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  UserRoundPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import {
  sendCharmGiftAction,
  type SendCharmGiftState,
} from "@/features/charm/actions/sendCharmGift";
import {
  toggleEquippedAchievementAction,
  type ToggleEquippedAchievementState,
} from "@/features/achievements/actions/equippedAchievementActions";
import { maxEquippedAchievementCount } from "@/features/achievements/achievementCatalog";
import {
  redeemBlindBoxCheckAction,
  type RedeemBlindBoxCheckState,
} from "@/features/charm/actions/redeemBlindBoxCheck";
import {
  bindReferralCodeAction,
  type ReferralActionState,
} from "@/features/referrals/actions/referralActions";
import type { UserAchievementProgressItem } from "@/features/achievements/queries/getUserAchievements";
import type {
  ProfileBagCheckItem,
  ProfileBagViewModel,
} from "@/features/charm/queries/getProfileBag";
import type { ProfileShopGiftItem } from "@/features/charm/queries/getProfileShop";
import type { ProfileShopGiftRecipient } from "@/features/charm/queries/getProfileShopGiftRecipients";
import type { ProfileVisitorViewModel } from "@/features/profile-visits/queries/getProfileVisitors";
import { ProfileAchievementIcon } from "./ProfilePublicAchievementWall";

type ReferralStatsViewModel = {
  boundReferral: {
    id: string;
    createdAt: string;
    inviter: {
      id: string;
      avatarUrl: string | null;
      friendCode: string | null;
      nickname: string;
    };
  } | null;
  firstParticipationCount: number;
  friendshipAcceptedCount: number;
  invitedCount: number;
  recentReferrals: Array<{
    id: string;
    createdAt: string;
    firstParticipationAt: string | null;
    friendshipAcceptedAt: string | null;
    invitee: {
      id: string;
      avatarUrl: string | null;
      friendCode: string | null;
      nickname: string;
    };
  }>;
};

type ProfileVisitSummaryViewModel = {
  todayViewCount: number;
  totalViewCount: number;
  uniqueVisitorCount: number;
};

type SubpageTone = "green" | "pink" | "blue" | "gold";

function getProfilePrivateSubpageCopy(locale: string) {
  if (locale === "fr") {
    return {
      achievements: {
        emptyDescription:
          "Participez à des sorties, organisez-en et complétez votre profil pour débloquer des badges.",
        emptyTitle: "Aucun badge débloqué",
        equip: "Porter",
        equipped: "Porté",
        equipLimit: "3 max",
        locked: "Verrouillé",
        progress: "Progression",
        recent: "Récents",
        saving: "Envoi...",
        subtitle: "Badges visibles sur votre profil public.",
        title: "Badges",
        unlocked: "Débloqués",
        worn: "Portés",
      },
      achievementGroups: {
        identity: "Identité",
        organization: "Organisation",
        participation: "Participation",
        special: "Spécial",
        start: "Départ",
      },
      achievementTitles: {
        active_guest_20: "Invité actif",
        co_creator: "Co-créateur",
        hello_world: "Première sortie",
        host_20: "Hôte 20",
        open_minded: "Esprit ouvert",
        trusted_profile: "Profil fiable",
      },
      achievementDescriptions: {
        active_guest_20: "Rejoindre 20 sorties.",
        co_creator: "Devenir co-créateur Friemi.",
        hello_world: "Rejoindre votre première sortie.",
        host_20: "Organiser 20 sorties.",
        open_minded: "Organiser votre première sortie.",
        trusted_profile: "Atteindre un score fiable.",
      },
      bag: {
        available: "Disponibles",
        blindBox: "Mystère",
        checkList: "Chèques",
        emptyChecks: "Aucun chèque pour le moment",
        emptyDescription:
          "Les chèques Friemi, fragments de boîte mystère et cadeaux reçus apparaîtront ici.",
        emptyTitle: "Sac vide pour le moment",
        exchange: "Échanger",
        exchangeReady: "Prêt",
        expired: "Expiré",
        expires: "Expire",
        fragment: "Fragments",
        redeemed: "Utilisé",
        redeemedBoxes: "Échangés",
        statusAvailable: "Disponible",
        subtitle: "Vos objets Friemi seront regroupés ici.",
        title: "Sac",
        usedAt: "Utilisé",
      },
      back: "Retour",
      copied: "Copié",
      copy: "Copier",
      copyFailed: "Copie indisponible",
      errorDescription: "Réessayez dans un instant.",
      errorTitle: "Chargement incomplet",
      invite: {
        accepted: "Devenus amis",
        alreadyBound: "Déjà lié",
        bindDescription:
          "Entrez le code ami de la personne qui vous a invité.",
        bindErrorAlready: "Une invitation est déjà liée.",
        bindErrorInvalid: "Code invalide.",
        bindErrorMissing: "Aucun profil trouvé.",
        bindErrorSelf: "Utilisez le code d'un ami.",
        bindPlaceholder: "Code à 6 chiffres",
        bindSubmit: "Valider",
        bindSuccess: "Invitation liée",
        bindTitle: "Code reçu",
        binding: "Envoi...",
        emptyDescription: "Vos invitations acceptées apparaîtront ici.",
        emptyTitle: "Aucune invitation pour le moment",
        firstJoined: "Première sortie",
        invited: "Invités",
        inviterLabel: "Invité par",
        linkUnavailable: "Code d'invitation indisponible",
        share: "Partager",
        shareText: "Rejoins-moi sur Friemi.",
        subtitle: "Partagez votre code avec de nouveaux amis.",
        title: "Inviter",
      },
      loading: "Chargement",
      shop: {
        available: "Ouvert",
        chooseFriend: "Choisir un ami",
        charm: "Charm",
        close: "Fermer",
        emptyDescription:
          "La boutique affichera les cadeaux, chèques et objets échangeables après ouverture.",
        emptyTitle: "Boutique en préparation",
        giftCatalog: "Cadeaux",
        noFriends: "Ajoutez un ami pour offrir un cadeau.",
        seasonalLocked: "Événement",
        send: "Envoyer",
        sendEntry: "Offrir",
        sending: "Envoi...",
        sent: "Cadeau envoyé",
        subtitle: "Cadeaux Friemi.",
        title: "Boutique",
      },
      visitors: {
        emptyDescription:
          "Les personnes connectées qui visitent votre profil apparaîtront ici.",
        emptyTitle: "Aucune visite récente",
        subtitle: "Vue privée, visible uniquement par vous.",
        title: "Visites",
        friend: "Ami",
        message: "Message",
        today: "Aujourd'hui",
        total: "Vues",
        unique: "Visiteurs",
        visitor: "Visiteur",
      },
    };
  }

  if (locale === "en") {
    return {
      achievements: {
        emptyDescription:
          "Join plans, host events, and complete your profile to unlock badges.",
        emptyTitle: "No badges unlocked",
        equip: "Wear",
        equipped: "Worn",
        equipLimit: "3 max",
        locked: "Locked",
        progress: "Progress",
        recent: "Recent",
        saving: "Saving...",
        subtitle: "Badges shown on your public profile.",
        title: "Badges",
        unlocked: "Unlocked",
        worn: "Worn",
      },
      achievementGroups: {
        identity: "Identity",
        organization: "Hosting",
        participation: "Joining",
        special: "Special",
        start: "Start",
      },
      achievementTitles: {
        active_guest_20: "Active Guest",
        co_creator: "Co-creator",
        hello_world: "First Plan",
        host_20: "Host 20",
        open_minded: "Open Minded",
        trusted_profile: "Trusted Profile",
      },
      achievementDescriptions: {
        active_guest_20: "Join 20 plans.",
        co_creator: "Become a Friemi co-creator.",
        hello_world: "Join your first plan.",
        host_20: "Host 20 plans.",
        open_minded: "Host your first plan.",
        trusted_profile: "Reach a trusted profile score.",
      },
      bag: {
        available: "Available",
        blindBox: "Blind box",
        checkList: "Checks",
        emptyChecks: "No checks yet",
        emptyDescription:
          "Friemi checks, blind-box fragments, and received gifts will appear here.",
        emptyTitle: "Your bag is empty",
        exchange: "Redeem",
        exchangeReady: "Ready",
        expired: "Expired",
        expires: "Expires",
        fragment: "Fragments",
        redeemed: "Used",
        redeemedBoxes: "Redeemed",
        statusAvailable: "Available",
        subtitle: "Your Friemi items will live here.",
        title: "Bag",
        usedAt: "Used",
      },
      back: "Back",
      copied: "Copied",
      copy: "Copy",
      copyFailed: "Copy unavailable",
      errorDescription: "Try again in a moment.",
      errorTitle: "Could not load everything",
      invite: {
        accepted: "Became friends",
        alreadyBound: "Linked",
        bindDescription: "Enter the friend code from the person who invited you.",
        bindErrorAlready: "An invitation is already linked.",
        bindErrorInvalid: "Invalid code.",
        bindErrorMissing: "No profile found.",
        bindErrorSelf: "Use a friend's code.",
        bindPlaceholder: "6-digit code",
        bindSubmit: "Link",
        bindSuccess: "Invitation linked",
        bindTitle: "Got a code",
        binding: "Linking...",
        emptyDescription: "Accepted invitations will appear here.",
        emptyTitle: "No invitations yet",
        firstJoined: "First joined",
        invited: "Invited",
        inviterLabel: "Invited by",
        linkUnavailable: "Invite code unavailable",
        share: "Share",
        shareText: "Join me on Friemi.",
        subtitle: "Share your code with new friends.",
        title: "Invite",
      },
      loading: "Loading",
      shop: {
        available: "Open",
        chooseFriend: "Choose a friend",
        charm: "Charm",
        close: "Close",
        emptyDescription:
          "The shop will show gifts, checks, and exchangeable items once opened.",
        emptyTitle: "Shop is preparing",
        giftCatalog: "Gifts",
        noFriends: "Add a friend to send a gift.",
        seasonalLocked: "Event",
        send: "Send",
        sendEntry: "Send gift",
        sending: "Sending...",
        sent: "Gift sent",
        subtitle: "Friemi gifts.",
        title: "Shop",
      },
      visitors: {
        emptyDescription:
          "Signed-in visitors to your profile will appear here.",
        emptyTitle: "No recent visitors",
        subtitle: "Private view, visible only to you.",
        title: "Visitors",
        friend: "Friend",
        message: "Message",
        today: "Today",
        total: "Views",
        unique: "Visitors",
        visitor: "Visitor",
      },
    };
  }

  return {
    achievements: {
      emptyDescription: "参与聚吧、发起活动、完善资料后会逐步解锁。",
      emptyTitle: "暂未解锁成就",
      equip: "佩戴",
      equipped: "已佩戴",
      equipLimit: "最多 3 个",
      locked: "未解锁",
      progress: "进度",
      recent: "最近解锁",
      saving: "保存中...",
      subtitle: "公开展示在个人主页的轻量荣誉墙。",
      title: "成就",
      unlocked: "已解锁",
      worn: "佩戴",
    },
    achievementGroups: {
      identity: "身份",
      organization: "组织",
      participation: "参与",
      special: "特殊",
      start: "开始",
    },
    achievementTitles: {
      active_guest_20: "活跃玩家",
      co_creator: "共创者",
      hello_world: "初次见面",
      host_20: "主理人 20",
      open_minded: "开放主理人",
      trusted_profile: "可信资料",
    },
    achievementDescriptions: {
      active_guest_20: "参与 20 次聚吧。",
      co_creator: "成为 Friemi 共创者。",
      hello_world: "首次参加聚吧。",
      host_20: "发起 20 次聚吧。",
      open_minded: "首次发起聚吧。",
      trusted_profile: "信用值达到可信等级。",
    },
    bag: {
      available: "可用",
      blindBox: "盲盒",
      checkList: "支票",
      emptyChecks: "暂时没有支票",
      emptyDescription: "Friemi 支票、盲盒碎片和收到的礼物会统一放在这里。",
      emptyTitle: "背包暂时为空",
      exchange: "兑换",
      exchangeReady: "可兑换",
      expired: "已过期",
      expires: "过期",
      fragment: "碎片",
      redeemed: "已使用",
      redeemedBoxes: "已兑换",
      statusAvailable: "可用",
      subtitle: "未来承接支票、盲盒和礼物。",
      title: "背包",
      usedAt: "使用",
    },
    back: "返回",
    copied: "已复制",
    copy: "复制",
    copyFailed: "复制不可用",
    errorDescription: "稍后再试一次即可。",
    errorTitle: "部分内容加载失败",
    invite: {
      accepted: "成为好友",
      alreadyBound: "已绑定",
      bindDescription: "输入邀请你的人的好友号。",
      bindErrorAlready: "已经绑定过邀请人。",
      bindErrorInvalid: "好友号无效。",
      bindErrorMissing: "没有找到这个好友号。",
      bindErrorSelf: "不能填写自己的好友号。",
      bindPlaceholder: "6 位好友号",
      bindSubmit: "确认绑定",
      bindSuccess: "已绑定邀请人",
      bindTitle: "填写邀请人",
      binding: "绑定中...",
      emptyDescription: "通过你的邀请码加入的新朋友会显示在这里。",
      emptyTitle: "暂时没有邀请记录",
      firstJoined: "首次参与",
      invited: "已邀请",
      inviterLabel: "邀请人",
      linkUnavailable: "邀请码暂不可用",
      share: "分享",
      shareText: "来 Friemi 和我一起聚聚。",
      subtitle: "把邀请码分享给新朋友。",
      title: "邀请好友",
    },
    loading: "加载中",
    shop: {
      available: "可送",
      chooseFriend: "选择好友",
      charm: "魅力",
      close: "关闭",
      emptyDescription: "礼物、支票和可兑换物品上线后会显示在这里。",
      emptyTitle: "商城准备中",
      giftCatalog: "礼物",
      noFriends: "添加好友后可以送礼。",
      seasonalLocked: "节日开放",
      send: "送出",
      sendEntry: "去送礼",
      sending: "送出中...",
      sent: "礼物已送出",
      subtitle: "Friemi 礼物。",
      title: "商城",
    },
    visitors: {
      emptyDescription: "登录用户访问你的主页后，会在这里留下记录。",
      emptyTitle: "暂时没有访客",
      subtitle: "仅自己可见的访问记录。",
      title: "访客记录",
      friend: "好友",
      message: "私聊",
      today: "今日访问",
      total: "总访问",
      unique: "访客",
      visitor: "访客",
    },
  };
}

function getToneClasses(tone: SubpageTone) {
  if (tone === "pink") {
    return {
      icon: "bg-[#FFF0F3] text-[#E83F83] ring-[#F5C5D7]",
      panel: "from-[#FEFFF9] via-[#FFF7FA] to-[#FFF1E7]",
      pill: "bg-[#FFF0F3] text-[#B8326E] ring-[#F5C5D7]",
    };
  }

  if (tone === "blue") {
    return {
      icon: "bg-[#EEF5FF] text-[#143376] ring-[#C8D9F5]",
      panel: "from-[#FEFFF9] via-[#F2F7FF] to-[#F8F5EA]",
      pill: "bg-[#EEF5FF] text-[#143376] ring-[#C8D9F5]",
    };
  }

  if (tone === "gold") {
    return {
      icon: "bg-[#FFF7DC] text-[#7D641C] ring-[#E8D59D]",
      panel: "from-[#FEFFF9] via-[#FFF8E8] to-[#F5F3E8]",
      pill: "bg-[#FFF7DC] text-[#6C5515] ring-[#E8D59D]",
    };
  }

  return {
    icon: "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]",
    panel: "from-[#FEFFF9] via-[#F4FAEF] to-[#FFF6E9]",
    pill: "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]",
  };
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${formatDate(value)} ${hours}:${minutes}`;
}

async function writeTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Copy command failed");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

function createShopGiftAttemptId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const initial = name.trim().slice(0, 1) || "F";

  if (avatarUrl) {
    return (
      // User avatars are stored as remote URLs from Clerk/user data.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF5E8] text-sm font-black text-[#156240] ring-1 ring-[#D6D5B2]">
      {initial}
    </span>
  );
}

export function ProfilePrivatePageShell({
  children,
  icon: Icon,
  locale,
  right,
  showIntro = true,
  subtitle,
  title,
  tone = "green",
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  locale: string;
  right?: React.ReactNode;
  showIntro?: boolean;
  subtitle: string;
  title: string;
  tone?: SubpageTone;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const toneClasses = getToneClasses(tone);

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] mx-auto min-h-dvh w-full max-w-xl bg-[#FEFFF9] px-5 text-[#111210] md:min-h-[70vh] md:rounded-[1.5rem] md:border md:border-[#E4DCC7] md:shadow-[0_18px_60px_rgba(21,98,64,0.08)]">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={withLocale(locale, "/profile")}
          aria-label={copy.back}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#D6D5B2] transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-black text-[#111210]">
          {title}
        </h1>
        <div className="flex h-10 min-w-10 shrink-0 items-center justify-end">
          {right}
        </div>
      </header>

      {showIntro ? (
        <section
          className={cn(
            "mt-6 overflow-hidden rounded-[1.35rem] bg-gradient-to-br p-4 ring-1 ring-[#E3DCC5]",
            toneClasses.panel,
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] ring-1",
                toneClasses.icon,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight text-[#111210]">
                {title}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-[#5F685F]">
                {subtitle}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {children}
    </main>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-[1.1rem] bg-white/82 px-3 py-3 ring-1 ring-[#E3DCC5]">
      <div className="flex items-center gap-1.5 text-[11px] font-black text-[#6C746A]">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-black leading-none text-[#111210]">
        {value}
      </p>
    </div>
  );
}

function StatusPanel({
  description,
  icon: Icon,
  title,
  tone = "green",
}: {
  description?: string;
  icon: LucideIcon;
  title: string;
  tone?: SubpageTone;
}) {
  const toneClasses = getToneClasses(tone);

  return (
    <section className="mt-6 rounded-[1.35rem] bg-white/82 px-4 py-8 text-center ring-1 ring-[#E3DCC5]">
      <span
        className={cn(
          "mx-auto flex h-12 w-12 items-center justify-center rounded-[1.1rem] ring-1",
          toneClasses.icon,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-black text-[#111210]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[#6C746A]">
          {description}
        </p>
      ) : null}
    </section>
  );
}

function getAchievementText(item: UserAchievementProgressItem, locale: string) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const key = item.definition.key;

  return {
    description:
      copy.achievementDescriptions[key] ?? item.definition.description,
    title: copy.achievementTitles[key] ?? item.definition.title,
  };
}

function AchievementIcon({
  item,
  unlocked,
}: {
  item: UserAchievementProgressItem;
  unlocked: boolean;
}) {
  if (unlocked) {
    return (
      <ProfileAchievementIcon
        achievementKey={item.definition.key}
        className="h-11 w-11"
      />
    );
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#F1F2EC] text-[#8B907F] ring-1 ring-[#DFDAC5]">
      <Lock className="h-5 w-5" />
    </span>
  );
}

const toggleEquippedInitialState: ToggleEquippedAchievementState = {};

function AchievementEquipSubmitButton({
  canEquipMore,
  copy,
  isEquipped,
}: {
  canEquipMore: boolean;
  copy: ReturnType<typeof getProfilePrivateSubpageCopy>["achievements"];
  isEquipped: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || (!isEquipped && !canEquipMore);

  return (
    <button
      className={cn(
        "inline-flex h-7 min-w-[4rem] items-center justify-center rounded-full px-2.5 text-[10px] font-black transition active:scale-95 disabled:active:scale-100",
        isEquipped
          ? "bg-[#156240] text-white shadow-[0_8px_18px_rgba(21,98,64,0.14)]"
          : "bg-white text-[#156240] ring-1 ring-[#BFD8B9]",
        disabled && !isEquipped ? "text-[#8B907F] ring-[#DFDAC5]" : "",
      )}
      disabled={disabled}
      type="submit"
    >
      {pending
        ? copy.saving
        : !isEquipped && !canEquipMore
          ? copy.equipLimit
          : isEquipped
            ? copy.equipped
            : copy.equip}
    </button>
  );
}

function AchievementEquipControl({
  canEquipMore,
  item,
  locale,
}: {
  canEquipMore: boolean;
  item: UserAchievementProgressItem;
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [state, formAction] = useActionState(
    toggleEquippedAchievementAction,
    toggleEquippedInitialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.achievementKey === item.definition.key) {
      router.refresh();
    }
  }, [item.definition.key, router, state.achievementKey, state.ok]);

  if (!item.isUnlocked) {
    return null;
  }

  return (
    <form action={formAction} className="grid justify-items-end gap-1">
      <input
        name="achievementKey"
        type="hidden"
        value={item.definition.key}
      />
      <input
        name="intent"
        type="hidden"
        value={item.isEquipped ? "unequip" : "equip"}
      />
      <input name="locale" type="hidden" value={locale} />
      <AchievementEquipSubmitButton
        canEquipMore={canEquipMore}
        copy={copy.achievements}
        isEquipped={item.isEquipped}
      />
      {state.formError ? (
        <p className="max-w-[5rem] text-right text-[10px] font-black leading-4 text-[#9A2135]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

type AchievementGroupKey =
  | "identity"
  | "organization"
  | "participation"
  | "special"
  | "start";

const achievementGroupOrder: AchievementGroupKey[] = [
  "start",
  "participation",
  "organization",
  "identity",
  "special",
];

function getAchievementGroupKey(
  item: UserAchievementProgressItem,
): AchievementGroupKey {
  if (item.definition.key === "active_guest_20") {
    return "participation";
  }

  if (
    item.definition.key === "open_minded" ||
    item.definition.key === "host_20"
  ) {
    return "organization";
  }

  if (item.definition.key === "co_creator") {
    return "special";
  }

  if (item.definition.key === "trusted_profile") {
    return "identity";
  }

  return "start";
}

function getSortedAchievementItems(items: UserAchievementProgressItem[]) {
  return [...items].sort((a, b) => {
    if (a.isEquipped !== b.isEquipped) {
      return a.isEquipped ? -1 : 1;
    }

    if (a.isUnlocked !== b.isUnlocked) {
      return a.isUnlocked ? -1 : 1;
    }

    if (a.unlockedAt || b.unlockedAt) {
      return (
        new Date(b.unlockedAt ?? 0).getTime() -
        new Date(a.unlockedAt ?? 0).getTime()
      );
    }

    return (
      b.progress / Math.max(1, b.target) - a.progress / Math.max(1, a.target)
    );
  });
}

function getGroupedAchievementItems(items: UserAchievementProgressItem[]) {
  return achievementGroupOrder.flatMap((groupKey) => {
    const groupItems = getSortedAchievementItems(
      items.filter((item) => getAchievementGroupKey(item) === groupKey),
    );

    return groupItems.length > 0
      ? [
          {
            groupKey,
            items: groupItems,
          },
        ]
      : [];
  });
}

function getCheckStatusCopy(
  status: ProfileBagCheckItem["status"],
  locale: string,
) {
  const copy = getProfilePrivateSubpageCopy(locale);

  if (status === "REDEEMED") {
    return copy.bag.redeemed;
  }

  if (status === "EXPIRED") {
    return copy.bag.expired;
  }

  return copy.bag.statusAvailable;
}

function getCheckTypeCopy(type: ProfileBagCheckItem["type"], locale: string) {
  if (locale === "fr") {
    return type === "BLIND_BOX" ? "Chèque mystère" : "Chèque Friemi";
  }

  if (locale === "en") {
    return type === "BLIND_BOX" ? "Blind-box check" : "Friemi check";
  }

  return type === "BLIND_BOX" ? "盲盒支票" : "Friemi 支票";
}

function getCheckDateCopy(check: ProfileBagCheckItem, locale: string) {
  const copy = getProfilePrivateSubpageCopy(locale);

  if (check.status === "REDEEMED" && check.redeemedAt) {
    return `${copy.bag.usedAt} ${formatDate(check.redeemedAt)}`;
  }

  if (check.expiresAt) {
    return `${copy.bag.expires} ${formatDate(check.expiresAt)}`;
  }

  return formatDate(check.createdAt);
}

function CheckStatusIcon({
  status,
}: {
  status: ProfileBagCheckItem["status"];
}) {
  if (status === "REDEEMED") {
    return <Check className="h-4 w-4" />;
  }

  if (status === "EXPIRED") {
    return <Hourglass className="h-4 w-4" />;
  }

  return <Ticket className="h-4 w-4" />;
}

function RedeemBlindBoxSubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-busy={pending}
      disabled={disabled || pending}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#156240] px-4 text-xs font-black text-white shadow-[0_12px_22px_rgba(21,98,64,0.16)] transition active:scale-95 disabled:bg-[#C8CBB7] disabled:shadow-none"
    >
      {pending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}

const initialRedeemState: RedeemBlindBoxCheckState = {};

function RedeemBlindBoxForm({
  canRedeem,
  locale,
}: {
  canRedeem: boolean;
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [state, formAction] = useActionState(
    redeemBlindBoxCheckAction,
    initialRedeemState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.checkId) {
      router.refresh();
    }
  }, [router, state.checkId, state.ok]);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <RedeemBlindBoxSubmitButton
        disabled={!canRedeem}
        label={copy.bag.exchange}
      />
      {state.formError ? (
        <p className="text-xs font-bold text-[#9A2135]">{state.formError}</p>
      ) : null}
    </form>
  );
}

function GiftAvailabilityBadge({
  gift,
  locale,
}: {
  gift: ProfileShopGiftItem;
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const locked = gift.availability === "seasonal_locked";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2 text-[10px] font-black ring-1",
        locked
          ? "bg-[#F1F2EC] text-[#6C746A] ring-[#DFDAC5]"
          : "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]",
      )}
    >
      {locked ? copy.shop.seasonalLocked : copy.shop.available}
    </span>
  );
}

const shopGiftInitialState: SendCharmGiftState = {};

function ShopGiftSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[#156240] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(21,98,64,0.14)] transition active:scale-95 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ShopGiftRecipientDialog({
  attemptId,
  gift,
  locale,
  onClose,
  onSent,
  open,
  recipients,
}: {
  attemptId: string;
  gift: ProfileShopGiftItem | null;
  locale: string;
  onClose: () => void;
  onSent: () => void;
  open: boolean;
  recipients: ProfileShopGiftRecipient[];
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [state, formAction] = useActionState(
    sendCharmGiftAction,
    shopGiftInitialState,
  );
  const router = useRouter();
  const formError = state.attemptId === attemptId ? state.formError : null;

  useEffect(() => {
    if (!state.ok || !state.eventId || state.attemptId !== attemptId) {
      return;
    }

    onClose();
    onSent();
    router.refresh();
  }, [
    attemptId,
    onClose,
    onSent,
    router,
    state.attemptId,
    state.eventId,
    state.ok,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open || !gift) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111210]/30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-[2px] md:items-center md:p-6">
      <button
        aria-label={copy.shop.close}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className="relative w-full max-w-[390px] overflow-hidden rounded-[1.45rem] bg-[#FEFFF9] shadow-[0_28px_70px_rgba(17,18,16,0.24)] ring-1 ring-[#E4DDBE]"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#ECE5CD] px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#FFF7DC] text-[25px] leading-none ring-1 ring-[#E8D59D]">
              {gift.emoji}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-[#111210]">
                {gift.label}
              </p>
              <p className="mt-0.5 text-xs font-black text-[#7A8276]">
                {copy.shop.chooseFriend}
              </p>
            </div>
          </div>
          <button
            aria-label={copy.shop.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#ECE6D5] transition active:scale-95"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[min(70dvh,30rem)] overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recipients.length > 0 ? (
            <div className="grid gap-2">
              {recipients.map((recipient) => (
                <form
                  action={formAction}
                  className="flex items-center gap-3 rounded-[1.05rem] bg-white/82 px-3 py-2.5 ring-1 ring-[#E3DCC5]"
                  key={recipient.id}
                >
                  <input name="attemptId" type="hidden" value={attemptId} />
                  <input name="giftId" type="hidden" value={gift.id} />
                  <input name="locale" type="hidden" value={locale} />
                  <input
                    name="recipientProfileId"
                    type="hidden"
                    value={recipient.id}
                  />
                  <input
                    name="redirectPath"
                    type="hidden"
                    value="/profile/shop"
                  />
                  <input name="sourceSurface" type="hidden" value="PROFILE" />
                  <Avatar
                    avatarUrl={recipient.avatarUrl}
                    name={recipient.nickname}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#111210]">
                      {recipient.nickname}
                    </p>
                    {recipient.friendCode ? (
                      <p className="mt-0.5 truncate text-[11px] font-bold text-[#7A8276]">
                        {recipient.friendCode}
                      </p>
                    ) : null}
                  </div>
                  <ShopGiftSubmitButton
                    label={copy.shop.send}
                    pendingLabel={copy.shop.sending}
                  />
                </form>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.1rem] bg-[#F8F4EA] px-4 py-7 text-center ring-1 ring-[#E3DCC5]">
              <p className="text-sm font-black text-[#111210]">
                {copy.shop.noFriends}
              </p>
            </div>
          )}
          {formError ? (
            <p className="mt-3 rounded-full bg-[#FFF0F3] px-3 py-2 text-xs font-black text-[#9A2135] ring-1 ring-[#F5C5D7]">
              {formError}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProfileAchievementsPageView({
  hasError,
  items,
  locale,
}: {
  hasError?: boolean;
  items: UserAchievementProgressItem[];
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const equippedCount = items.filter((item) => item.isEquipped).length;
  const unlockedCount = items.filter((item) => item.isUnlocked).length;
  const recentUnlocked = [...items]
    .filter((item) => item.unlockedAt)
    .sort(
      (a, b) =>
        new Date(b.unlockedAt ?? 0).getTime() -
        new Date(a.unlockedAt ?? 0).getTime(),
    )
    .slice(0, 3);
  const groupedItems = getGroupedAchievementItems(items);

  return (
    <ProfilePrivatePageShell
      icon={Medal}
      locale={locale}
      showIntro={false}
      subtitle={copy.achievements.subtitle}
      title={copy.achievements.title}
      tone="gold"
    >
      {hasError ? (
        <StatusPanel
          icon={BadgeCheck}
          title={copy.errorTitle}
          description={copy.errorDescription}
          tone="gold"
        />
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-2">
        <MetricPill
          icon={Medal}
          label={copy.achievements.unlocked}
          value={unlockedCount}
        />
        <MetricPill
          icon={Sparkles}
          label={copy.achievements.worn}
          value={`${equippedCount}/${maxEquippedAchievementCount}`}
        />
      </section>

      {recentUnlocked.length > 0 ? (
        <section className="mt-6 rounded-[1.35rem] bg-[#FFF9E8] p-3 ring-1 ring-[#E8D59D]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8A641A]">
              {copy.achievements.recent}
            </p>
            <Star className="h-4 w-4 text-[#D69D26]" />
          </div>
          <div className="mt-3 grid gap-2">
            {recentUnlocked.map((item) => {
              const text = getAchievementText(item, locale);

              return (
                <div
                  className="flex items-center gap-3 rounded-[1rem] bg-white/78 px-3 py-2 ring-1 ring-[#EFE0AF]"
                  key={item.definition.key}
                >
                  <AchievementIcon item={item} unlocked />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#111210]">
                      {text.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[#7D641C]">
                      {formatDate(item.unlockedAt ?? "")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-5">
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <section className="grid gap-2" key={group.groupKey}>
              <h2 className="px-1 text-xs font-black uppercase tracking-[0.14em] text-[#6C746A]">
                {copy.achievementGroups[group.groupKey]}
              </h2>
              <div className="grid gap-3">
                {group.items.map((item) => {
                  const text = getAchievementText(item, locale);
                  const progressWidth = `${Math.round(
                    (item.progress / Math.max(1, item.target)) * 100,
                  )}%`;
                  const unlocked = item.isUnlocked;

                  return (
                    <article
                      className={cn(
                        "rounded-[1.2rem] p-3 ring-1",
                        unlocked
                          ? "bg-white/90 ring-[#E3DCC5]"
                          : "bg-[#F7F5EA]/82 ring-[#E8E1CF]",
                      )}
                      key={item.definition.key}
                    >
                      <div className="flex gap-3">
                        <AchievementIcon item={item} unlocked={unlocked} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-[#111210]">
                                {text.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6C746A]">
                                {text.description}
                              </p>
                            </div>
                            <div className="grid shrink-0 justify-items-end gap-1">
                              <span
                                className={cn(
                                  "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-black ring-1",
                                  unlocked
                                    ? "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]"
                                    : "bg-white text-[#8B907F] ring-[#DFDAC5]",
                                )}
                              >
                                {unlocked ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    {formatDate(item.unlockedAt ?? "")}
                                  </>
                                ) : (
                                  copy.achievements.locked
                                )}
                              </span>
                              <AchievementEquipControl
                                canEquipMore={
                                  item.isEquipped ||
                                  equippedCount < maxEquippedAchievementCount
                                }
                                item={item}
                                locale={locale}
                              />
                            </div>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EFEAD7]">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                unlocked ? "bg-[#E8BD4D]" : "bg-[#8AB68E]",
                              )}
                              style={{ width: progressWidth }}
                            />
                          </div>
                          <p className="mt-1.5 text-right text-[10px] font-black text-[#8B907F]">
                            {item.progress}/{item.target}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <StatusPanel
            icon={Medal}
            title={copy.achievements.emptyTitle}
            description={copy.achievements.emptyDescription}
            tone="gold"
          />
        )}
      </section>
    </ProfilePrivatePageShell>
  );
}

function CopyButton({
  locale,
  onCopied,
  onFailed,
  value,
}: {
  locale: string;
  onCopied?: () => void;
  onFailed?: () => void;
  value: string | null;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const showCopied = () => {
    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }

    setCopied(true);
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimerRef.current = null;
    }, 1500);
  };

  useEffect(
    () => () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    },
    [],
  );

  const copyValue = async () => {
    if (!value) {
      return;
    }

    try {
      await writeTextToClipboard(value);
      showCopied();
      onCopied?.();
    } catch {
      setCopied(false);
      onFailed?.();
    }
  };

  return (
    <button
      type="button"
      disabled={!value}
      onClick={copyValue}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#156240] px-3 text-xs font-black text-white shadow-[0_10px_20px_rgba(21,98,64,0.14)] transition active:scale-95 disabled:bg-[#C8CBB7] disabled:text-white"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? copy.copied : copy.copy}
    </button>
  );
}

function ShareInviteButton({
  locale,
  onCopied,
  onFailed,
  referralLink,
}: {
  locale: string;
  onCopied: () => void;
  onFailed: () => void;
  referralLink: string | null;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);

  const shareInvite = async () => {
    if (!referralLink) {
      onFailed();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text: copy.invite.shareText,
          title: "Friemi",
          url: referralLink,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await writeTextToClipboard(referralLink);
      onCopied();
    } catch {
      onFailed();
    }
  };

  return (
    <button
      type="button"
      disabled={!referralLink}
      onClick={shareInvite}
      aria-label={copy.invite.share}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#E83F83] ring-1 ring-[#F5C5D7] transition active:scale-95 disabled:text-[#B5B5A6] disabled:ring-[#E3DCC5]"
    >
      <Share2 className="h-[1.125rem] w-[1.125rem]" />
    </button>
  );
}

const referralBindInitialState: ReferralActionState = {};

function getReferralBindMessage(
  inviteCopy: ReturnType<typeof getProfilePrivateSubpageCopy>["invite"],
  formError: string | undefined,
) {
  if (!formError) {
    return null;
  }

  if (formError === "ALREADY_ATTRIBUTED") {
    return inviteCopy.bindErrorAlready;
  }

  if (formError === "INVITER_NOT_FOUND") {
    return inviteCopy.bindErrorMissing;
  }

  if (formError === "SELF_REFERRAL") {
    return inviteCopy.bindErrorSelf;
  }

  return inviteCopy.bindErrorInvalid;
}

function ReferralBindSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#156240] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(21,98,64,0.14)] transition active:scale-95 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ReferralInviteBinder({
  boundReferral,
  locale,
}: {
  boundReferral: ReferralStatsViewModel["boundReferral"];
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [state, formAction] = useActionState(
    bindReferralCodeAction,
    referralBindInitialState,
  );
  const message = state.ok
    ? copy.invite.bindSuccess
    : getReferralBindMessage(copy.invite, state.formError);

  if (boundReferral) {
    return (
      <section className="mt-4 rounded-[1.25rem] bg-white/82 p-3 ring-1 ring-[#E3DCC5]">
        <div className="flex items-center gap-3">
          <Avatar
            avatarUrl={boundReferral.inviter.avatarUrl}
            name={boundReferral.inviter.nickname}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black text-[#8B907F]">
              {copy.invite.alreadyBound}
            </p>
            <p className="mt-0.5 truncate text-sm font-black text-[#111210]">
              {copy.invite.inviterLabel} · {boundReferral.inviter.nickname}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-4 rounded-[1.25rem] bg-white/82 p-3 ring-1 ring-[#E3DCC5]"
      noValidate
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black text-[#111210]">
            {copy.invite.bindTitle}
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#6C746A]">
            {copy.invite.bindDescription}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F3] text-[#E83F83] ring-1 ring-[#F5C5D7]">
          <UserRoundPlus className="h-4 w-4" />
        </span>
      </div>
      <input name="locale" type="hidden" value={locale} />
      <div className="mt-3 flex gap-2">
        <input
          name="ref"
          inputMode="numeric"
          maxLength={240}
          placeholder={copy.invite.bindPlaceholder}
          className="h-10 min-w-0 flex-1 rounded-full bg-[#FEFFF9] px-3 text-sm font-black text-[#111210] outline-none ring-1 ring-[#D6D5B2] placeholder:text-[#A3A48F] focus:ring-[#E83F83]"
        />
        <ReferralBindSubmitButton
          label={copy.invite.bindSubmit}
          pendingLabel={copy.invite.binding}
        />
      </div>
      {message ? (
        <p
          className={cn(
            "mt-2 text-xs font-bold",
            state.ok ? "text-[#156240]" : "text-[#9A2135]",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

function FriemiToast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-mobile-nav-height)+var(--app-bottom-safe-area)+0.75rem)] z-[80] flex justify-center px-5 md:bottom-8">
      <div className="flex max-w-[19rem] items-center gap-2 rounded-full bg-[#FEFFF9] px-3 py-2 text-xs font-black text-[#156240] shadow-[0_16px_38px_rgba(21,98,64,0.16)] ring-1 ring-[#BFD8B9]">
        <Image
          src={brand.logoIconPath}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-lg"
        />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}

export function ProfileInvitePageView({
  friendCode,
  hasError,
  locale,
  referralLink,
  stats,
}: {
  friendCode: string | null;
  hasError?: boolean;
  locale: string;
  referralLink: string | null;
  stats: ReferralStatsViewModel;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 1700);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  return (
    <>
      <ProfilePrivatePageShell
        icon={UserRoundPlus}
        locale={locale}
        showIntro={false}
        subtitle={copy.invite.subtitle}
        title={copy.invite.title}
        tone="pink"
        right={
          <ShareInviteButton
            locale={locale}
            onCopied={() => showToast(copy.copied)}
            onFailed={() => showToast(copy.copyFailed)}
            referralLink={referralLink}
          />
        }
      >
        {hasError ? (
          <StatusPanel
            icon={UserRoundPlus}
            title={copy.errorTitle}
            description={copy.errorDescription}
            tone="pink"
          />
        ) : null}

        <section className="mt-5 grid grid-cols-3 gap-2">
          <MetricPill
            icon={UserRoundPlus}
            label={copy.invite.invited}
            value={stats.invitedCount}
          />
          <MetricPill
            icon={UsersRound}
            label={copy.invite.accepted}
            value={stats.friendshipAcceptedCount}
          />
          <MetricPill
            icon={CalendarDays}
            label={copy.invite.firstJoined}
            value={stats.firstParticipationCount}
          />
        </section>

        <section className="mt-6 rounded-[1.25rem] bg-white/88 p-3 ring-1 ring-[#E3DCC5]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#FFF0F3] text-[#E83F83] ring-1 ring-[#F5C5D7]">
              <Ticket className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black text-[#8B907F]">
                Friemi Code
              </p>
              <p className="mt-1 truncate text-lg font-black text-[#111210]">
                {friendCode ? `@${friendCode}` : copy.invite.linkUnavailable}
              </p>
            </div>
            <CopyButton
              locale={locale}
              onCopied={() => showToast(copy.copied)}
              onFailed={() => showToast(copy.copyFailed)}
              value={referralLink ?? friendCode}
            />
          </div>
          {referralLink ? (
            <p className="mt-3 truncate rounded-full bg-[#F8F4EA] px-3 py-2 text-xs font-bold text-[#5F685F]">
              {referralLink}
            </p>
          ) : null}
        </section>

        <ReferralInviteBinder
          boundReferral={stats.boundReferral}
          locale={locale}
        />

        <section className="mt-6">
          {stats.recentReferrals.length > 0 ? (
            <div className="divide-y divide-[#E8E1CF] rounded-[1.25rem] bg-white/88 px-3 ring-1 ring-[#E3DCC5]">
              {stats.recentReferrals.map((referral) => (
                <Link
                  href={withLocale(locale, `/profile/${referral.invitee.id}`)}
                  className="flex items-center gap-3 py-3 transition active:bg-[#F7F4E9]"
                  key={referral.id}
                >
                  <Avatar
                    avatarUrl={referral.invitee.avatarUrl}
                    name={referral.invitee.nickname}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#111210]">
                      {referral.invitee.nickname}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[#6C746A]">
                      {formatDate(referral.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#B1B39F]" />
                </Link>
              ))}
            </div>
          ) : (
            <StatusPanel
              icon={UserRoundPlus}
              title={copy.invite.emptyTitle}
              description={copy.invite.emptyDescription}
              tone="pink"
            />
          )}
        </section>
      </ProfilePrivatePageShell>
      <FriemiToast message={toastMessage} />
    </>
  );
}

export function ProfileVisitorsPageView({
  hasError,
  locale,
  summary,
  visitors,
}: {
  hasError?: boolean;
  locale: string;
  summary: ProfileVisitSummaryViewModel;
  visitors: ProfileVisitorViewModel[];
}) {
  const copy = getProfilePrivateSubpageCopy(locale);

  return (
    <ProfilePrivatePageShell
      icon={Eye}
      locale={locale}
      showIntro={false}
      subtitle={copy.visitors.subtitle}
      title={copy.visitors.title}
      tone="blue"
    >
      {hasError ? (
        <StatusPanel
          icon={Eye}
          title={copy.errorTitle}
          description={copy.errorDescription}
          tone="blue"
        />
      ) : null}

      <section className="mt-5 grid grid-cols-3 gap-2">
        <MetricPill
          icon={CalendarDays}
          label={copy.visitors.today}
          value={summary.todayViewCount}
        />
        <MetricPill
          icon={Eye}
          label={copy.visitors.total}
          value={summary.totalViewCount}
        />
        <MetricPill
          icon={UsersRound}
          label={copy.visitors.unique}
          value={summary.uniqueVisitorCount}
        />
      </section>

      <section className="mt-6">
        {visitors.length > 0 ? (
          <div className="divide-y divide-[#E8E1CF] rounded-[1.25rem] bg-white/88 px-3 ring-1 ring-[#E3DCC5]">
            {visitors.map((visit) => (
              <div className="flex items-center gap-2 py-3" key={visit.id}>
                <Link
                  href={withLocale(locale, `/profile/${visit.visitor.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 transition active:opacity-80"
                >
                  <Avatar
                    avatarUrl={visit.visitor.avatarUrl}
                    name={visit.visitor.nickname}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-black text-[#111210]">
                        {visit.visitor.nickname}
                      </p>
                      <span
                        className={cn(
                          "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[9px] font-black ring-1",
                          visit.isFriend
                            ? "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]"
                            : "bg-[#EEF5FF] text-[#143376] ring-[#C8D9F5]",
                        )}
                      >
                        {visit.isFriend
                          ? copy.visitors.friend
                          : copy.visitors.visitor}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[#6C746A]">
                      {formatDateTime(visit.lastVisitedAt)}
                    </p>
                  </div>
                </Link>
                <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] px-2 text-[11px] font-black text-[#143376] ring-1 ring-[#C8D9F5]">
                  {visit.viewCount}
                </span>
                <StartDirectConversationButton
                  buttonClassName="h-8 w-8 px-0 shadow-[0_10px_18px_rgba(21,98,64,0.14)] [&_span]:sr-only"
                  className="relative shrink-0"
                  errorClassName="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl bg-white px-2 py-1 text-right shadow-[0_12px_24px_rgba(29,29,27,0.12)] ring-1 ring-[#E3DCC5]"
                  label={copy.visitors.message}
                  locale={locale}
                  peerProfileId={visit.visitor.id}
                  redirectPath="/profile/visitors"
                />
              </div>
            ))}
          </div>
        ) : (
          <StatusPanel
            icon={Eye}
            title={copy.visitors.emptyTitle}
            description={copy.visitors.emptyDescription}
            tone="blue"
          />
        )}
      </section>
    </ProfilePrivatePageShell>
  );
}

export function ProfileBagPageView({
  bag,
  hasError,
  locale,
}: {
  bag: ProfileBagViewModel;
  hasError?: boolean;
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const fragmentRatio = Math.min(
    1,
    bag.fragmentBalance.current / Math.max(1, bag.fragmentBalance.required),
  );

  return (
    <ProfilePrivatePageShell
      icon={Package}
      locale={locale}
      showIntro={false}
      subtitle={copy.bag.subtitle}
      title={copy.bag.title}
      tone="green"
    >
      {hasError ? (
        <StatusPanel
          icon={Box}
          title={copy.errorTitle}
          description={copy.errorDescription}
        />
      ) : null}

      <section className="mt-5 grid grid-cols-3 gap-2">
        <MetricPill
          icon={Ticket}
          label={copy.bag.available}
          value={bag.availableCheckCount}
        />
        <MetricPill
          icon={Gem}
          label={copy.bag.blindBox}
          value={bag.blindBoxCheckCount}
        />
        <MetricPill
          icon={Archive}
          label={copy.bag.fragment}
          value={bag.fragmentBalance.current}
        />
      </section>

      <section className="mt-6 rounded-[1.35rem] bg-white/88 p-4 ring-1 ring-[#D6D5B2]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-[#156240]">
              {copy.bag.fragment}
            </p>
            <p className="mt-2 text-2xl font-black text-[#111210]">
              {bag.fragmentBalance.current}/{bag.fragmentBalance.required}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-full px-2 text-[10px] font-black ring-1",
              bag.fragmentBalance.canRedeem
                ? "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]"
                : "bg-[#F1F2EC] text-[#6C746A] ring-[#DFDAC5]",
            )}
          >
            {bag.fragmentBalance.canRedeem
              ? copy.bag.exchangeReady
              : `${bag.fragmentBalance.current}/${bag.fragmentBalance.required}`}
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EFEAD7]">
          <div
            className="h-full rounded-full bg-[#156240]"
            style={{ width: `${Math.round(fragmentRatio * 100)}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-bold text-[#6C746A]">
            {copy.bag.redeemedBoxes}:{" "}
            {bag.fragmentBalance.redeemedBlindBoxCount}
          </p>
          <RedeemBlindBoxForm
            canRedeem={bag.fragmentBalance.canRedeem}
            locale={locale}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="px-1 text-xs font-black uppercase tracking-[0.14em] text-[#6C746A]">
          {copy.bag.checkList}
        </h2>
        {bag.checks.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {bag.checks.map((check) => {
              const available = check.status === "AVAILABLE";

              return (
                <article
                  className={cn(
                    "rounded-[1.2rem] p-3 ring-1",
                    available
                      ? "bg-white/90 ring-[#D6D5B2]"
                      : "bg-[#F7F5EA]/82 ring-[#E8E1CF]",
                  )}
                  key={check.id}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] ring-1",
                        available
                          ? "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]"
                          : "bg-[#F1F2EC] text-[#6C746A] ring-[#DFDAC5]",
                      )}
                    >
                      <CheckStatusIcon status={check.status} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#111210]">
                        {getCheckTypeCopy(check.type, locale)}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#6C746A]">
                        {getCheckDateCopy(check, locale)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[10px] font-black ring-1",
                        available
                          ? "bg-[#EAF5E8] text-[#156240] ring-[#BFD8B9]"
                          : "bg-white text-[#6C746A] ring-[#DFDAC5]",
                      )}
                    >
                      {getCheckStatusCopy(check.status, locale)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <StatusPanel
            icon={Box}
            title={copy.bag.emptyChecks}
            description={copy.bag.emptyDescription}
          />
        )}
      </section>
    </ProfilePrivatePageShell>
  );
}

export function ProfileShopPageView({
  giftRecipients,
  gifts,
  locale,
}: {
  giftRecipients: ProfileShopGiftRecipient[];
  gifts: ProfileShopGiftItem[];
  locale: string;
}) {
  const copy = getProfilePrivateSubpageCopy(locale);
  const [dialogGiftId, setDialogGiftId] = useState<string | null>(null);
  const [dialogAttemptId, setDialogAttemptId] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const dialogGift =
    gifts.find((gift) => gift.id === dialogGiftId) ?? null;
  const openGiftDialog = (giftId: string) => {
    setDialogGiftId(giftId);
    setDialogAttemptId(createShopGiftAttemptId());
  };
  const closeGiftDialog = () => {
    setDialogGiftId(null);
    setDialogAttemptId("");
  };
  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 1700);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  return (
    <ProfilePrivatePageShell
      icon={ShoppingBag}
      locale={locale}
      showIntro={false}
      subtitle={copy.shop.subtitle}
      title={copy.shop.title}
      tone="gold"
    >
      <section className="mt-7">
        <h2 className="px-1 text-xs font-black uppercase tracking-[0.14em] text-[#6C746A]">
          {copy.shop.giftCatalog}
        </h2>
        {gifts.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {gifts.map((gift) => {
              const locked = gift.availability === "seasonal_locked";

              return (
                <article
                  className={cn(
                    "grid min-h-[9.7rem] content-between rounded-[1.2rem] bg-white/86 p-3 ring-1 ring-[#E3DCC5] transition",
                    locked ? "opacity-78" : "",
                  )}
                  key={gift.id}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#FFF9E8] text-[30px] leading-none ring-1 ring-[#EFE0AF]">
                      {gift.emoji}
                    </span>
                    <GiftAvailabilityBadge gift={gift} locale={locale} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#111210]">
                      {gift.label}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#6C746A]">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#A57AEB]" />
                      +{gift.charmValue}
                    </span>
                  </span>
                  {locked ? null : (
                    <button
                      className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#156240] px-3 text-xs font-black text-white shadow-[0_10px_18px_rgba(21,98,64,0.14)] transition active:scale-95"
                      onClick={() => openGiftDialog(gift.id)}
                      type="button"
                    >
                      <Gift className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{copy.shop.sendEntry}</span>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <StatusPanel
            icon={Gift}
            title={copy.shop.emptyTitle}
            description={copy.shop.emptyDescription}
            tone="gold"
          />
        )}
      </section>
      <ShopGiftRecipientDialog
        attemptId={dialogAttemptId}
        gift={dialogGift}
        locale={locale}
        onClose={closeGiftDialog}
        onSent={() => showToast(copy.shop.sent)}
        open={Boolean(dialogGift)}
        recipients={giftRecipients}
      />
      <FriemiToast message={toastMessage} />
    </ProfilePrivatePageShell>
  );
}

export function ProfileSubpageLoadingView() {
  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] mx-auto min-h-dvh w-full max-w-xl bg-[#FEFFF9] px-5 text-[#111210] md:min-h-[70vh] md:rounded-[1.5rem] md:border md:border-[#E4DCC7]">
      <header className="flex items-center justify-between gap-3">
        <div className="h-10 w-10 rounded-full bg-white ring-1 ring-[#E3DCC5]" />
        <div className="h-6 w-24 rounded-full bg-[#F1F2EC]" />
        <div className="h-10 w-10 rounded-full bg-white ring-1 ring-[#E3DCC5]" />
      </header>
      <section className="mt-6 rounded-[1.35rem] bg-[#F6F4EA] p-4 ring-1 ring-[#E3DCC5]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-[1.1rem] bg-white" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-28 rounded-full bg-white" />
            <div className="mt-3 h-4 w-44 rounded-full bg-white/82" />
          </div>
        </div>
      </section>
      <section className="mt-5 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div
            className="h-20 rounded-[1.1rem] bg-white/82 ring-1 ring-[#E3DCC5]"
            key={item}
          />
        ))}
      </section>
      <div className="mt-6 flex justify-center">
        <Image
          src={brand.loadingImagePath}
          alt=""
          width={64}
          height={64}
          className="h-14 w-14"
          unoptimized
        />
      </div>
    </main>
  );
}
