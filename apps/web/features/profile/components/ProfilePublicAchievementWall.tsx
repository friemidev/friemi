"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarCheck2,
  Crown,
  FilePenLine,
  Gift,
  Handshake,
  PartyPopper,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  getAchievementDefinition,
  type AchievementKey,
} from "@/features/achievements/achievementCatalog";
import type { PublicAchievementWallItem } from "@/features/achievements/queries/getUserAchievements";
import { cn } from "@/lib/utils";

type AchievementVisual = {
  icon: LucideIcon;
  ring: string;
  surface: string;
  text: string;
};

const achievementVisuals: Record<AchievementKey, AchievementVisual> = {
  active_guest_20: {
    icon: Sparkles,
    ring: "ring-[#BFD8B9]",
    surface: "bg-[#EAF5E8]",
    text: "text-[#156240]",
  },
  co_creator: {
    icon: Handshake,
    ring: "ring-[#B9D6D0]",
    surface: "bg-[#E9F7F3]",
    text: "text-[#007C70]",
  },
  content_contributor: {
    icon: FilePenLine,
    ring: "ring-[#D7C8F5]",
    surface: "bg-[#F4EEFF]",
    text: "text-[#7853B2]",
  },
  first_gift: {
    icon: Gift,
    ring: "ring-[#F5C5D7]",
    surface: "bg-[#FFF0F3]",
    text: "text-[#E83F83]",
  },
  gift_ambassador: {
    icon: Send,
    ring: "ring-[#F5C5D7]",
    surface: "bg-[#FFF0F3]",
    text: "text-[#D43D73]",
  },
  hello_world: {
    icon: PartyPopper,
    ring: "ring-[#F5C5D7]",
    surface: "bg-[#FFF0F3]",
    text: "text-[#E83F83]",
  },
  host_20: {
    icon: Crown,
    ring: "ring-[#E8D59D]",
    surface: "bg-[#FFF7DC]",
    text: "text-[#7D641C]",
  },
  invitation_expert: {
    icon: UserPlus,
    ring: "ring-[#F1D59B]",
    surface: "bg-[#FFF7DC]",
    text: "text-[#9A6C0F]",
  },
  open_minded: {
    icon: BadgeCheck,
    ring: "ring-[#C8D9F5]",
    surface: "bg-[#EEF5FF]",
    text: "text-[#143376]",
  },
  popularity_star: {
    icon: Star,
    ring: "ring-[#F5C5D7]",
    surface: "bg-[#FFF0F3]",
    text: "text-[#E83F83]",
  },
  punctuality_star: {
    icon: CalendarCheck2,
    ring: "ring-[#D7C8F5]",
    surface: "bg-[#F4EEFF]",
    text: "text-[#7853B2]",
  },
  trusted_profile: {
    icon: ShieldCheck,
    ring: "ring-[#D7C8F5]",
    surface: "bg-[#F4EEFF]",
    text: "text-[#8A61CE]",
  },
};

function getPublicAchievementWallCopy(locale: string) {
  if (locale === "fr") {
    return {
      empty: "Aucun badge public pour le moment.",
      title: "Badges publics",
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
      empty: "No public badges yet.",
      title: "Public badges",
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
    empty: "暂未公开成就。",
    title: "公开成就",
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

function getAchievementTitle(
  copy: ReturnType<typeof getPublicAchievementWallCopy>,
  item: PublicAchievementWallItem,
) {
  return copy.achievementTitles[item.definition.key] ?? item.definition.title;
}

export function ProfileAchievementIcon({
  achievementKey,
  className,
  iconClassName,
  transparent = false,
}: {
  achievementKey: AchievementKey;
  className?: string;
  iconClassName?: string;
  transparent?: boolean;
}) {
  const visual = achievementVisuals[achievementKey];
  const imageSrc = getAchievementDefinition(achievementKey)?.imageSrc;
  const Icon = visual.icon;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] ring-1",
        transparent ? "bg-transparent" : visual.surface,
        visual.text,
        visual.ring,
        className,
      )}
    >
      {imageSrc ? (
        <Image
          alt=""
          className="h-full w-full object-contain p-[3px]"
          height={80}
          sizes="80px"
          src={imageSrc}
          width={80}
        />
      ) : (
        <Icon className={cn("h-5 w-5", iconClassName)} strokeWidth={2.3} />
      )}
    </span>
  );
}

export function ProfileAchievementBadgeStrip({
  className,
  items,
  limit = 5,
  locale,
}: {
  className?: string;
  items: PublicAchievementWallItem[];
  limit?: number;
  locale: string;
}) {
  const copy = getPublicAchievementWallCopy(locale);
  const visibleItems = items.slice(0, limit);
  const moreCount = Math.max(0, items.length - visibleItems.length);
  const [activeKey, setActiveKey] = useState<AchievementKey | null>(null);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex max-w-full flex-wrap gap-1.5", className)}>
      {visibleItems.map((item) => {
        const title = getAchievementTitle(copy, item);
        const active = activeKey === item.definition.key;

        return (
          <button
            type="button"
            aria-expanded={active}
            aria-label={title}
            className={cn(
              "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/84 text-[11px] font-bold text-[#111210] shadow-[0_8px_18px_rgba(21,98,64,0.06)] ring-1 ring-[#E3DCC5] transition active:scale-95",
              active ? "z-20" : "",
            )}
            key={item.definition.key}
            onClick={() => setActiveKey(active ? null : item.definition.key)}
            title={title}
          >
            <ProfileAchievementIcon
              achievementKey={item.definition.key}
              className="h-6 w-6 rounded-full"
              iconClassName="h-3.5 w-3.5"
            />
            {active ? (
              <span className="absolute left-1/2 top-[calc(100%+0.4rem)] z-30 max-w-[9rem] -translate-x-1/2 truncate rounded-full bg-[#111210] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(17,18,16,0.16)]">
                {title}
              </span>
            ) : null}
          </button>
        );
      })}
      {moreCount > 0 ? (
        <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#F8F4EA] px-3 text-[11px] font-bold text-[#6C746A] ring-1 ring-[#E3DCC5]">
          +{moreCount}
        </span>
      ) : null}
    </div>
  );
}

export function ProfilePublicAchievementWall({
  items,
  locale,
}: {
  items: PublicAchievementWallItem[];
  locale: string;
}) {
  const copy = getPublicAchievementWallCopy(locale);

  if (items.length === 0) {
    return (
      <section className="mt-5 rounded-2xl bg-white/76 px-4 py-4 text-sm font-bold text-[#6C746A] ring-1 ring-[#E3DCC5]">
        {copy.empty}
      </section>
    );
  }

  return (
    <section className="mt-5">
      <h2 className="text-sm font-bold text-[#111210]">{copy.title}</h2>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 4).map((item) => (
          <div
            className="flex items-center gap-3 rounded-2xl bg-white/78 px-3 py-2.5 ring-1 ring-[#E3DCC5]"
            key={item.definition.key}
          >
            <ProfileAchievementIcon
              achievementKey={item.definition.key}
              className="h-11 w-11"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#111210]">
                {getAchievementTitle(copy, item)}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#6C746A]">
                {formatDate(item.unlockedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
