import Link from "next/link";
import { ChevronRight, Clock3, Dice5, UsersRound } from "lucide-react";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityFloatingNow,
  getActivityTimeState,
} from "@/features/activities/utils/activityDisplay";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { MobileActivityDetailSheetLink } from "./MobileActivityDetailSheetLink";

type MobileNewActivityEntryViewProps = {
  activities: ActivityCardViewModel[];
  locale: string;
};

function getMobileEntryCopy(locale: string) {
  if (locale === "fr") {
    return {
      activity: "Activités",
      createDescription: "Lance une sortie et invite du monde.",
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
      createDescription: "Start a plan and invite people.",
      createTitle: "Create Plan",
      partyToolsDescription: "Use tools to make your game night better.",
      partyToolsTitle: "Party Tools",
      question: "What do you want to create?",
      seeAll: "See all",
      title: "Create Plan",
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
    createTitle: "创建聚吧",
    partyToolsDescription: "用工具让现场桌游更顺。",
    partyToolsTitle: "桌游工具",
    question: "想创建什么？",
    seeAll: "全部",
    title: "聚聚",
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
  return activity.type === "PUBLIC_EVENT"
    ? new Date()
    : getActivityFloatingNow();
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

    return mode === "starts" ? copy.startsInDays(days) : copy.endsInDays(days);
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

function getPreviewActivityHref(
  activity: ActivityCardViewModel,
  locale: string,
) {
  if (isPublicEventCard(activity)) {
    return withLocale(
      locale,
      activity.publicEventId
        ? `/public-events/${activity.publicEventId}`
        : `/activities/${activity.id}`,
    );
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
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
        <span className="block text-[18px] font-bold leading-tight tracking-normal text-[#111210]">
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
  const isInactive = getActivityTimeState(activity) === "ENDED";
  const activityHref = getPreviewActivityHref(activity, locale);
  const activityLabel =
    locale === "fr"
      ? `Voir ${activity.title}`
      : locale === "en"
        ? `View ${activity.title}`
        : `查看${activity.title}`;

  return (
    <MobileActivityDetailSheetLink
      className={cn(
        "group flex aspect-square min-w-0 flex-col overflow-hidden rounded-[1rem] border transition active:scale-[0.985]",
        isInactive
          ? "border-zinc-200 bg-zinc-50 text-zinc-500 shadow-none"
          : "border-[#D6D5B2]/78 bg-white shadow-[0_10px_22px_rgba(29,29,27,0.07)]",
      )}
      href={activityHref}
      label={activityLabel}
    >
      <div
        className={cn(
          "relative h-[56%] shrink-0 overflow-hidden bg-[#F1F2EC]",
          isInactive ? "bg-zinc-200 grayscale opacity-75" : null,
        )}
      >
        <ActivityCoverImage
          alt={activity.title}
          overlayClassName={cn(
            "bg-gradient-to-t to-transparent",
            isInactive ? "from-zinc-900/38 via-zinc-800/5" : "from-black/34 via-black/4",
          )}
          src={activity.coverImageUrl}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between px-2.5 py-2">
        <h3
          className={cn(
            "line-clamp-2 overflow-hidden text-[12px] font-bold leading-[0.95rem]",
            isInactive ? "text-zinc-600" : "text-[#111210]",
          )}
        >
          {activity.title}
        </h3>
        <p
          className={cn(
            "mt-1 flex min-w-0 items-center gap-1 text-[10.5px] font-semibold",
            isInactive ? "text-zinc-500" : "text-[#111210]/62",
          )}
        >
          <Clock3
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isInactive ? "text-zinc-400" : null,
            )}
          />
          <span className="truncate">{statusLabel}</span>
        </p>
      </div>
    </MobileActivityDetailSheetLink>
  );
}

export function MobileNewActivityEntryView({
  activities,
  locale,
}: MobileNewActivityEntryViewProps) {
  const copy = getMobileEntryCopy(locale);

  return (
    <main className="mobile-v23-create app-mobile-page-shell [--app-mobile-page-top-gap:1.55rem] [--app-mobile-page-bottom-gap:1.05rem] bg-white text-[#111210] md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col px-5">
        <header className="space-y-8">
          <div>
            <h1 className="text-[31px] font-bold leading-none tracking-normal">
              {copy.title}
            </h1>
            <p className="mt-8 text-[25px] font-bold leading-tight tracking-normal text-[#0D5A3C]">
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
          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[24px] font-bold leading-none tracking-normal text-[#111210]">
                {copy.activity}
              </h2>
              <Link
                className="text-[15px] font-semibold text-[#0D5A3C]/72"
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
