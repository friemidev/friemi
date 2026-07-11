import Link from "next/link";
import { ChevronRight, Clock3, Dice5, UsersRound } from "lucide-react";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityFloatingNow,
  getActivityTimeState,
} from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type MobileNewActivityEntryViewProps = {
  activities: ActivityCardViewModel[];
  locale: string;
};

function getMobileEntryCopy(locale: string) {
  if (locale === "fr") {
    return {
      activity: "Activités",
      createDescription: "Lance une sortie et invite tes amis.",
      createTitle: "Créer une sortie",
      partyToolsDescription: "Des outils pour animer vos soirées jeux.",
      partyToolsTitle: "Outils de jeu",
      question: "Qu'est-ce que tu veux créer ?",
      seeAll: "Tout",
      title: "Créer",
      ended: "Terminé",
      live: "En cours",
      startsInHours: (hours: number) => `Dans ${hours} h`,
      startsInDays: (days: number) => `Dans ${days} j`,
      startsSoon: "Dans <1 h",
      startsToday: "Aujourd'hui",
      endsInHours: (hours: number) => `Encore ${hours} h`,
      endsInDays: (days: number) => `Encore ${days} j`,
      endsSoon: "Encore <1 h",
      endsToday: "Finit aujourd'hui",
    };
  }

  if (locale === "en") {
    return {
      activity: "Activity",
      createDescription: "Start a hangout and invite your friends.",
      createTitle: "Create Hangout",
      partyToolsDescription: "Use tools to make your game night better.",
      partyToolsTitle: "Party Tools",
      question: "What do you want to create?",
      seeAll: "See all",
      title: "Create Hangout",
      ended: "Ended",
      live: "Live",
      startsInHours: (hours: number) => `In ${hours}h`,
      startsInDays: (days: number) => `In ${days}d`,
      startsSoon: "In <1h",
      startsToday: "Today",
      endsInHours: (hours: number) => `${hours}h left`,
      endsInDays: (days: number) => `${days}d left`,
      endsSoon: "<1h left",
      endsToday: "Ends today",
    };
  }

  return {
    activity: "活动",
    createDescription: "发起一个线下约局，邀请朋友加入。",
    createTitle: "创建组局",
    partyToolsDescription: "用工具让现场桌游更顺。",
    partyToolsTitle: "桌游工具",
    question: "想创建什么？",
    seeAll: "全部",
    title: "我要组局",
    ended: "已结束",
    live: "进行中",
    startsInHours: (hours: number) => `${hours} 小时后开始`,
    startsInDays: (days: number) => `${days} 天后开始`,
    startsSoon: "不到 1 小时开始",
    startsToday: "今天开始",
    endsInHours: (hours: number) => `${hours} 小时后结束`,
    endsInDays: (days: number) => `${days} 天后结束`,
    endsSoon: "不到 1 小时结束",
    endsToday: "今天结束",
  };
}

type MobileEntryCopy = ReturnType<typeof getMobileEntryCopy>;

function getActivityReferenceNow(activity: ActivityCardViewModel) {
  return activity.type === "PUBLIC_EVENT" ? new Date() : getActivityFloatingNow();
}

function getRelativeTimingLabel(
  activity: ActivityCardViewModel,
  copy: MobileEntryCopy,
) {
  const timeState = getActivityTimeState(activity);
  const now = getActivityReferenceNow(activity);
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;

  function getRelativeLabel(
    targetAt: string,
    mode: "starts" | "ends",
    fallback: string,
  ) {
    const diffMs = new Date(targetAt).getTime() - now.getTime();

    if (diffMs <= 0) {
      return fallback;
    }

    if (diffMs < hourMs) {
      return mode === "starts" ? copy.startsSoon : copy.endsSoon;
    }

    const hours = Math.ceil(diffMs / hourMs);

    if (hours < 24) {
      return mode === "starts"
        ? copy.startsInHours(hours)
        : copy.endsInHours(hours);
    }

    const days = Math.ceil(diffMs / dayMs);

    if (days === 1) {
      return mode === "starts" ? copy.startsToday : copy.endsToday;
    }

    return mode === "starts"
      ? copy.startsInDays(days)
      : copy.endsInDays(days);
  }

  if (timeState === "UPCOMING") {
    return getRelativeLabel(activity.startAt, "starts", copy.startsToday);
  }

  if (timeState === "ONGOING") {
    return activity.endAt
      ? getRelativeLabel(activity.endAt, "ends", copy.live)
      : copy.live;
  }

  return copy.ended;
}

function MobileCreateOption({
  description,
  href,
  icon,
  tone,
  title,
}: {
  description: string;
  href: string;
  icon: "party" | "team";
  tone: "cream" | "rose";
  title: string;
}) {
  const Icon = icon === "team" ? UsersRound : Dice5;

  return (
    <Link
      className={cn(
        "group grid min-h-[8.1rem] grid-cols-[4.8rem_minmax(0,1fr)_1.6rem] items-center gap-3 rounded-[1.6rem] px-5 py-4 shadow-[0_16px_36px_rgba(29,29,27,0.06)] transition active:scale-[0.985]",
        tone === "rose"
          ? "bg-[#FFE5E4] text-[#7D1D27]"
          : "bg-[#FFF8D8] text-[#6A5F12]",
      )}
      href={href}
    >
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-[1.35rem]",
          tone === "rose" ? "bg-[#F09182]/18" : "bg-[#D6D5B2]/22",
        )}
      >
        <Icon className="h-9 w-9" strokeWidth={2.35} />
      </span>
      <span className="min-w-0">
        <span className="block text-[18px] font-extrabold leading-tight tracking-normal text-[#111210]">
          {title}
        </span>
        <span className="mt-1.5 block text-[13px] font-semibold leading-5 text-[#111210]/58">
          {description}
        </span>
      </span>
      <ChevronRight
        className="h-[18px] w-[18px] justify-self-end text-[#111210]/45 transition group-active:translate-x-0.5"
        strokeWidth={2.35}
      />
    </Link>
  );
}

function MobileActivityPreviewCard({
  activity,
  locale,
  statusLabel,
}: {
  activity: ActivityCardViewModel;
  locale: string;
  statusLabel: string;
}) {
  return (
    <Link
      className="group overflow-hidden rounded-[1.15rem] border border-[#D6D5B2]/78 bg-white shadow-[0_12px_26px_rgba(29,29,27,0.07)] transition active:scale-[0.985]"
      href={withLocale(locale, getActivityDetailPath(activity.id))}
    >
      <div className="relative aspect-[1.18/0.78] overflow-hidden bg-[#F1F2EC]">
        <ActivityCoverImage
          alt={activity.title}
          overlayClassName="bg-gradient-to-t from-black/34 via-black/4 to-transparent"
          src={activity.coverImageUrl}
        />
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <h3 className="line-clamp-3 h-[2.7rem] overflow-hidden text-[12px] font-extrabold leading-[0.9rem] text-[#123D31]">
          {activity.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-[#123D31]/88">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{statusLabel}</span>
        </p>
      </div>
    </Link>
  );
}

export function MobileNewActivityEntryView({
  activities,
  locale,
}: MobileNewActivityEntryViewProps) {
  const copy = getMobileEntryCopy(locale);

  return (
    <main className="mobile-v23-create min-h-[100svh] bg-[#FEFFF9] pb-[calc(6.2rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.55rem)] text-[#111210] md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col px-5">
        <header className="space-y-8">
          <div>
            <h1 className="text-[31px] font-black leading-none tracking-normal">
              {copy.title}
            </h1>
            <p className="mt-8 text-[25px] font-black leading-tight tracking-normal text-[#0D5A3C]">
              {copy.question}
            </p>
          </div>

          <div className="space-y-5">
            <MobileCreateOption
              description={copy.createDescription}
              href={withLocale(locale, "/activities/new?mode=form")}
              icon="team"
              title={copy.createTitle}
              tone="rose"
            />
            <MobileCreateOption
              description={copy.partyToolsDescription}
              href={withLocale(locale, "/game-tools")}
              icon="party"
              title={copy.partyToolsTitle}
              tone="cream"
            />
          </div>
        </header>

        {activities.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[28px] font-black leading-none tracking-normal text-[#0D5A3C]">
                {copy.activity}
              </h2>
              <Link
                className="text-[15px] font-extrabold text-[#0D5A3C]/72"
                href={withLocale(locale, "/activities")}
              >
                {copy.seeAll}
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {activities.slice(0, 6).map((activity) => {
                return (
                  <MobileActivityPreviewCard
                    activity={activity}
                    key={activity.id}
                    locale={locale}
                    statusLabel={getRelativeTimingLabel(activity, copy)}
                  />
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
