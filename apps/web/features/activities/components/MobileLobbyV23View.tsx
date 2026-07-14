import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  UsersRound,
} from "lucide-react";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { getActivityDateLabel } from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getCategoryLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type MobileLobbyV23TabId = "nearby" | "friends" | "today" | "popular";

type MobileLobbyV23ViewProps = {
  activeTab: MobileLobbyV23TabId;
  activities: ActivityCardViewModel[];
  friendActivities?: ActivityCardViewModel[];
  isSignedIn: boolean;
  locale: string;
};

type MobileLobbyV23Copy = {
  create: string;
  emptyDescription: string;
  emptyTitle: string;
  friendEmptyDescription: string;
  friendGoing: (count: number) => string;
  participants: string;
  signIn: string;
  tabs: Record<MobileLobbyV23TabId, string>;
  title: string;
};

const mobileLobbyV23Tabs: MobileLobbyV23TabId[] = [
  "nearby",
  "friends",
  "today",
  "popular",
];

function getMobileLobbyV23Copy(locale: string): MobileLobbyV23Copy {
  if (locale === "fr") {
    return {
      create: "Créer",
      emptyDescription: "Les nouvelles sorties apparaîtront ici.",
      emptyTitle: "Aucun groupe pour le moment",
      friendEmptyDescription: "Connectez-vous pour voir les sorties de vos amis.",
      friendGoing: (count) => `${count} ami${count > 1 ? "s" : ""} y vont`,
      participants: "pers.",
      signIn: "Se connecter",
      tabs: {
        nearby: "Proche",
        friends: "Amis",
        today: "Aujourd'hui",
        popular: "Populaire",
      },
      title: "Groupes",
    };
  }

  if (locale === "en") {
    return {
      create: "Create",
      emptyDescription: "Fresh hangouts will appear here.",
      emptyTitle: "No hangouts yet",
      friendEmptyDescription: "Sign in to see what friends are joining.",
      friendGoing: (count) => `${count} friend${count > 1 ? "s" : ""} going`,
      participants: "people",
      signIn: "Sign in",
      tabs: {
        nearby: "Nearby",
        friends: "Friends",
        today: "Today",
        popular: "Popular",
      },
      title: "Hangout",
    };
  }

  return {
    create: "发布",
    emptyDescription: "新的组局会显示在这里。",
    emptyTitle: "暂时没有组局",
    friendEmptyDescription: "登录后可以看到好友参加的组局。",
    friendGoing: (count) => `${count} 位好友参加`,
    participants: "人",
    signIn: "登录",
    tabs: {
      nearby: "附近",
      friends: "好友",
      today: "今天",
      popular: "热门",
    },
    title: "组局",
  };
}

function getActivityHref(activity: ActivityCardViewModel, locale: string) {
  if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function getActivityKey(activity: ActivityCardViewModel) {
  return `${activity.type}:${activity.id}`;
}

function dedupeActivities(activities: ActivityCardViewModel[]) {
  const seen = new Set<string>();

  return activities.filter((activity) => {
    const key = getActivityKey(activity);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function getParisDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(new Date(value));
}

function getTodayActivities(activities: ActivityCardViewModel[]) {
  const todayKey = getParisDateKey(new Date());

  return activities.filter((activity) => getParisDateKey(activity.startAt) === todayKey);
}

function getMobileLobbyDateOnly(value: string, locale: string) {
  const date = new Date(value);

  if (locale === "zh-CN") {
    const parts = new Intl.DateTimeFormat("zh-CN", {
      day: "numeric",
      month: "numeric",
      timeZone: "Europe/Paris",
    }).formatToParts(date);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return month && day ? `${month}月${day}日` : "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: locale === "zh-CN" ? "numeric" : "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function getMobileLobbyDateLabel(activity: ActivityCardViewModel, locale: string) {
  if (
    activity.endAt &&
    getParisDateKey(activity.startAt) !== getParisDateKey(activity.endAt)
  ) {
    return `${getMobileLobbyDateOnly(activity.startAt, locale)} - ${getMobileLobbyDateOnly(
      activity.endAt,
      locale,
    )}`;
  }

  return getActivityDateLabel(activity, locale);
}

function getPopularActivities(activities: ActivityCardViewModel[]) {
  return [...activities].sort((left, right) => {
    const leftScore =
      left.participantCount * 2 + left.favoriteCount + (left.friendSignal?.count ?? 0) * 3;
    const rightScore =
      right.participantCount * 2 +
      right.favoriteCount +
      (right.friendSignal?.count ?? 0) * 3;

    return rightScore - leftScore;
  });
}

function getVisibleActivities({
  activeTab,
  activities,
  friendActivities = [],
}: {
  activeTab: MobileLobbyV23TabId;
  activities: ActivityCardViewModel[];
  friendActivities?: ActivityCardViewModel[];
}) {
  const dedupedActivities = dedupeActivities(activities);

  if (activeTab === "friends") {
    return dedupeActivities(friendActivities);
  }

  if (activeTab === "today") {
    return getTodayActivities(dedupedActivities);
  }

  if (activeTab === "popular") {
    return getPopularActivities(dedupedActivities);
  }

  return dedupedActivities;
}

function MobileLobbyV23ActivityRow({
  activity,
  copy,
  locale,
}: {
  activity: ActivityCardViewModel;
  copy: MobileLobbyV23Copy;
  locale: string;
}) {
  const participantText =
    activity.capacity > 0
      ? `${activity.participantCount} / ${activity.capacity}`
      : `${activity.participantCount}`;
  const friendCount = activity.friendSignal?.count ?? 0;
  const categoryLabel = getCategoryLabel(activity.category, locale);

  return (
    <Link
      className="group grid grid-cols-[5.75rem_minmax(0,1fr)_2.45rem] items-stretch gap-2.5 rounded-[1.1rem] bg-white px-2.5 py-2.5 transition active:scale-[0.985]"
      href={getActivityHref(activity, locale)}
    >
      <div className="relative aspect-square overflow-hidden rounded-[0.95rem] bg-[#F1F2EC] shadow-[0_10px_22px_rgba(17,18,16,0.075)]">
        <ActivityCoverImage
          alt={activity.title}
          overlayClassName="bg-gradient-to-t from-black/10 to-transparent"
          src={activity.coverImageUrl}
        />
      </div>

      <div className="flex min-w-0 flex-col justify-center py-0.5 pr-1">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-[1.18] tracking-normal text-[#111210]">
          {activity.title}
        </h2>
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-[#111210]/58">
          <UsersRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {participantText} · {activity.city || copy.participants}
          </span>
        </p>
        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-[#111210]/54">
          {friendCount > 0 ? (
            <>
              <UsersRound className="h-3.5 w-3.5 shrink-0 text-[#18814E]" />
              <span className="truncate">{copy.friendGoing(friendCount)}</span>
            </>
          ) : (
            <>
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {getMobileLobbyDateLabel(activity, locale)}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex h-full flex-col items-end justify-between py-1">
        <ChevronRight className="mt-0.5 h-4 w-4 text-[#111210]/70 transition group-active:translate-x-0.5" />
        <span className="max-w-[3.65rem] truncate rounded-full bg-[#EAF7EA] px-2 py-1 text-[10px] font-extrabold leading-none text-[#138456]">
          {categoryLabel}
        </span>
      </div>
    </Link>
  );
}

export function MobileLobbyV23View({
  activeTab,
  activities,
  friendActivities,
  isSignedIn,
  locale,
}: MobileLobbyV23ViewProps) {
  const copy = getMobileLobbyV23Copy(locale);
  const visibleActivities = getVisibleActivities({
    activeTab,
    activities,
    friendActivities,
  }).slice(0, 30);
  const showFriendSignIn = activeTab === "friends" && !isSignedIn;

  return (
    <section className="mobile-v23-lobby min-h-[100svh] bg-[#FEFFF9] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.85rem)] text-[#111210] md:hidden">
      <div className="mx-auto flex w-full max-w-[430px] flex-col px-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[39px] font-black leading-none tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <Link
            href={withLocale(locale, "/activities/new")}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#096B45] text-white shadow-[0_14px_28px_rgba(9,107,69,0.22)]"
            aria-label={copy.create}
          >
            <Plus className="h-5 w-5" strokeWidth={2.7} />
          </Link>
        </div>

        <nav
          aria-label={copy.title}
          className="-mx-5 mt-9 flex gap-8 overflow-x-auto border-b border-[#EEEDE4] px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {mobileLobbyV23Tabs.map((tab) => (
            <Link
              aria-current={activeTab === tab ? "page" : undefined}
              className={cn(
                "relative shrink-0 pb-4 text-[19px] font-black tracking-normal transition",
                activeTab === tab ? "text-[#111210]" : "text-[#111210]/28",
              )}
              href={withLocale(locale, `/lobby?tab=${tab}`)}
              key={tab}
            >
              {copy.tabs[tab]}
              {activeTab === tab ? (
                <span className="absolute bottom-0 left-0 h-1.5 w-full rounded-full bg-[#369758] shadow-[0_7px_15px_rgba(54,151,88,0.28)]" />
              ) : null}
            </Link>
          ))}
        </nav>

        {showFriendSignIn ? (
          <div className="mt-10 rounded-[1.35rem] border border-[#D7D5C8] bg-white px-5 py-6 text-center shadow-[0_16px_38px_rgba(17,18,16,0.05)]">
            <p className="text-[18px] font-black">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#111210]/58">
              {copy.friendEmptyDescription}
            </p>
            <Link
              href={withLocale(locale, "/sign-in")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#096B45] px-5 text-sm font-black text-white"
            >
              {copy.signIn}
            </Link>
          </div>
        ) : visibleActivities.length > 0 ? (
          <div className="mt-5 grid gap-5">
            {visibleActivities.map((activity) => (
              <MobileLobbyV23ActivityRow
                activity={activity}
                copy={copy}
                key={getActivityKey(activity)}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[1.35rem] border border-[#D7D5C8] bg-white px-5 py-6 text-center shadow-[0_16px_38px_rgba(17,18,16,0.05)]">
            <MapPin className="mx-auto h-7 w-7 text-[#096B45]" />
            <p className="mt-3 text-[18px] font-black">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#111210]/58">
              {copy.emptyDescription}
            </p>
          </div>
        )}
      </div>

    </section>
  );
}
