"use client";

import { Medal } from "lucide-react";
import type { PublicAchievementWallItem } from "@/features/achievements/queries/getUserAchievements";

function getPublicAchievementWallCopy(locale: string) {
  if (locale === "fr") {
    return {
      empty: "Aucun badge public pour le moment.",
      title: "Badges publics",
      achievementTitles: {
        active_guest_20: "Invité actif",
        co_creator: "Co-créateur",
        hello_world: "Première sortie",
        host_20: "Hôte 20",
        open_minded: "Esprit ouvert",
        trusted_profile: "Profil fiable",
      },
    };
  }

  if (locale === "en") {
    return {
      empty: "No public badges yet.",
      title: "Public badges",
      achievementTitles: {
        active_guest_20: "Active Guest",
        co_creator: "Co-creator",
        hello_world: "First Hangout",
        host_20: "Host 20",
        open_minded: "Open Minded",
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
      hello_world: "初次见面",
      host_20: "主理人 20",
      open_minded: "开放主理人",
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
      <h2 className="text-sm font-black text-[#111210]">{copy.title}</h2>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 4).map((item) => (
          <div
            className="flex items-center gap-3 rounded-2xl bg-white/78 px-3 py-2.5 ring-1 ring-[#E3DCC5]"
            key={item.definition.key}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#FFF7DC] text-[#8A641A] ring-1 ring-[#E8D59D]">
              <Medal className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#111210]">
                {copy.achievementTitles[item.definition.key] ??
                  item.definition.title}
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
