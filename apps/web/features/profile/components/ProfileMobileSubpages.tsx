"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  Search,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { getCategoryLabel, getCopy, getStatusLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
} from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { AddFriendDialog } from "@/features/friends/components/FriendsDashboard";
import type {
  ProfileFavoriteActivityViewModel,
  ProfileDashboardViewModel,
  ProfileFollowUserViewModel,
  ProfileParticipationViewModel,
} from "../queries/getProfileDashboard";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";

type HangoutsTab = "created" | "participation" | "favorite";

function getProfileSubpageCopy(locale: string) {
  if (locale === "fr") {
    return {
      addFriend: "Ajouter",
      created: "Créées",
      emptyCreated: "Aucune sortie créée.",
      emptyFavorite: "Aucune sortie sauvegardée.",
      emptyNetwork: "Aucune personne ici.",
      emptySearch: "Aucun ami trouvé.",
      emptyParticipation: "Aucune sortie rejointe.",
      favorite: "Favoris",
      followers: "Fans",
      following: "Suivis",
      friends: "Amis",
      hangoutsTitle: "Mes sorties",
      joined: "Rejointes",
      joinedAt: "Rejoint",
      manage: "Gérer",
      networkTitle: "Mes amis",
      noBio: "Pas encore de bio.",
      savedAt: "Sauvé",
      searchFriends: "Rechercher un ami",
      view: "Voir",
    };
  }

  if (locale === "en") {
    return {
      addFriend: "Add",
      created: "Created",
      emptyCreated: "No created hangouts yet.",
      emptyFavorite: "No saved hangouts yet.",
      emptyNetwork: "No people here yet.",
      emptySearch: "No matching friends.",
      emptyParticipation: "No joined hangouts yet.",
      favorite: "Saved",
      followers: "Fans",
      following: "Following",
      friends: "Friends",
      hangoutsTitle: "My Hangouts",
      joined: "Joined",
      joinedAt: "Joined",
      manage: "Manage",
      networkTitle: "My Friends",
      noBio: "No bio yet.",
      savedAt: "Saved",
      searchFriends: "Search friends",
      view: "View",
    };
  }

  return {
    addFriend: "添加好友",
    created: "我发起的",
    emptyCreated: "还没有发起组局。",
    emptyFavorite: "还没有收藏组局。",
    emptyNetwork: "这里还没有人。",
    emptySearch: "没有找到这个好友。",
    emptyParticipation: "还没有参与组局。",
    favorite: "我收藏的",
    followers: "粉丝",
    following: "关注",
    friends: "好友",
    hangoutsTitle: "我的组局",
    joined: "我参与的",
    joinedAt: "报名",
    manage: "管理",
    networkTitle: "我的好友",
    noBio: "还没有填写简介。",
    savedAt: "收藏",
    searchFriends: "搜索好友",
    view: "查看",
  };
}

function SubpageShell({
  children,
  right,
  title,
  locale,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  title: string;
  locale: string;
}) {
  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] bg-[#FEFFF9] px-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={withLocale(locale, "/profile")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#D6D5B2]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-center text-xl font-black text-[#111210]">
          {title}
        </h1>
        <div className="flex h-10 w-10 items-center justify-center">{right}</div>
      </header>
      {children}
    </main>
  );
}

function SegmentTabs<T extends string>({
  active,
  items,
  onChange,
}: {
  active: T;
  items: Array<{ key: T; label: string; count: number }>;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-3 rounded-full bg-white/72 p-1 ring-1 ring-[#D6D5B2]">
      {items.map((item) => {
        const selected = active === item.key;

        return (
          <button
            key={item.key}
            className={cn(
              "inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-black transition",
              selected
                ? "bg-white text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.1)] ring-1 ring-[#8AB68E]"
                : "text-[#1D1D1B]",
            )}
            onClick={() => onChange(item.key)}
            type="button"
          >
            <span className="truncate">{item.label}</span>
            <span className="rounded-full bg-[#DDE8CA] px-1.5 py-0.5 text-[10px] text-[#156240]">
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white/82 px-4 py-8 text-center text-sm font-bold text-[#6C746A] ring-1 ring-[#E3DCC5]">
      {message}
    </div>
  );
}

function compareIsoDate(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
}

function getCompactActivityHref(locale: string, activity: ActivityCardViewModel) {
  if ((activity.type === "PUBLIC_EVENT" || activity.isActivityInfo) && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function getParticipantText(activity: ActivityCardViewModel) {
  return activity.capacity > 0
    ? `${activity.participantCount}/${activity.capacity}`
    : `${activity.participantCount}`;
}

function getParticipationTone(status: ProfileParticipationViewModel["status"]) {
  if (status === "PENDING") {
    return "bg-[#FFF4DB] text-[#8A641A]";
  }

  if (status === "REJECTED" || status === "CANCELLED") {
    return "bg-[#F1F2EC] text-[#6C746A]";
  }

  return "bg-[#DDF8E7] text-[#156240]";
}

function ActivityThumb({
  activity,
}: {
  activity: ActivityCardViewModel;
}) {
  if (activity.coverImageUrl) {
    return (
      // Activity cover images are user or source provided remote URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={activity.coverImageUrl}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_18%,#EAF4DC,#F6EFE4_48%,#FDFCF5)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#156240] shadow-sm ring-1 ring-[#D6D5B2]">
        F
      </span>
    </div>
  );
}

function CompactHangoutRow({
  actionLabel,
  activity,
  footerLabel,
  isOwn,
  locale,
  statusLabel,
  statusTone,
}: {
  actionLabel: string;
  activity: ActivityCardViewModel;
  footerLabel?: string;
  isOwn?: boolean;
  locale: string;
  statusLabel?: string;
  statusTone?: string;
}) {
  const displayStatus = getActivityDisplayStatus(activity);
  const resolvedStatusLabel = statusLabel ?? getStatusLabel(displayStatus, locale);
  const categoryLabel = getCategoryLabel(activity.category, locale);

  return (
    <Link
      href={getCompactActivityHref(locale, activity)}
      className="group block overflow-hidden rounded-[1.15rem] bg-white/90 p-2.5 shadow-[0_12px_28px_rgba(21,98,64,0.05)] ring-1 ring-[#E4DCC7] transition active:scale-[0.99]"
    >
      <div className="flex gap-3">
        <div className="relative h-[5.6rem] w-[6.25rem] shrink-0 overflow-hidden rounded-[1rem] bg-[#F5F2E7]">
          <ActivityThumb activity={activity} />
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-[#156240] shadow-sm">
            {categoryLabel}
          </span>
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 line-clamp-2 text-[15px] font-black leading-[1.18] text-[#111210]">
              {activity.title}
            </h2>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#9AA18E]" />
          </div>

          {activity.description ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#7A8276]">
              {activity.description}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isOwn ? (
              <span className="rounded-full bg-[#EAF5E8] px-2 py-0.5 text-[10px] font-black text-[#156240]">
                {actionLabel}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                statusTone ?? "bg-[#F1F2EC] text-[#4F574F]",
              )}
            >
              {resolvedStatusLabel}
            </span>
          </div>

          <div className="mt-2 grid gap-1 text-[11px] font-bold text-[#4F574F]">
            <span className="flex min-w-0 items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#E98575]" />
              <span className="truncate">
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6AA179]" />
                <span className="truncate">{activity.city || activity.address}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-black text-[#156240]">
                <UsersRound className="h-3.5 w-3.5" />
                {getParticipantText(activity)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreatedHangoutRow({
  activity,
  locale,
}: {
  activity: ActivityCardViewModel;
  locale: string;
}) {
  const copy = getProfileSubpageCopy(locale);

  return (
    <CompactHangoutRow
      actionLabel={copy.manage}
      activity={activity}
      footerLabel={copy.manage}
      isOwn
      locale={locale}
      statusTone="bg-[#EAF5E8] text-[#156240]"
    />
  );
}

function ParticipationHangoutRow({
  locale,
  participation,
}: {
  locale: string;
  participation: ProfileParticipationViewModel;
}) {
  const copy = getProfileSubpageCopy(locale);
  const t = getCopy(locale);

  return (
    <CompactHangoutRow
      actionLabel={copy.view}
      activity={participation.activity}
      footerLabel={copy.view}
      locale={locale}
      statusLabel={t.activityLabels.participationStatuses[participation.status]}
      statusTone={getParticipationTone(participation.status)}
    />
  );
}

function FavoriteHangoutRow({
  favorite,
  locale,
}: {
  favorite: ProfileFavoriteActivityViewModel;
  locale: string;
}) {
  const copy = getProfileSubpageCopy(locale);

  return (
    <CompactHangoutRow
      actionLabel={copy.view}
      activity={favorite.activity}
      footerLabel={copy.view}
      locale={locale}
      statusTone="bg-[#F5F0FF] text-[#5E4EA2]"
    />
  );
}

export function ProfileHangoutsMobilePage({
  dashboard,
  locale,
}: {
  dashboard: ProfileDashboardViewModel;
  locale: string;
}) {
  const copy = getProfileSubpageCopy(locale);
  const [activeTab, setActiveTab] = useState<HangoutsTab>("created");
  const createdActivities = useMemo(
    () =>
      [...dashboard.createdActivities].sort((left, right) =>
        compareIsoDate(left.startAt, right.startAt),
      ),
    [dashboard.createdActivities],
  );
  const participations = useMemo(
    () =>
      [...dashboard.participations].sort((left, right) =>
        compareIsoDate(left.joinedAt, right.joinedAt),
      ),
    [dashboard.participations],
  );
  const favorites = useMemo(
    () =>
      [...dashboard.favoriteActivities].sort((left, right) =>
        compareIsoDate(left.createdAt, right.createdAt),
      ),
    [dashboard.favoriteActivities],
  );

  return (
    <SubpageShell title={copy.hangoutsTitle} locale={locale}>
      <SegmentTabs<HangoutsTab>
        active={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "created",
            label: copy.created,
            count: dashboard.createdActivityCount,
          },
          {
            key: "participation",
            label: copy.joined,
            count: dashboard.participationCount,
          },
          {
            key: "favorite",
            label: copy.favorite,
            count: dashboard.favoriteActivityCount,
          },
        ]}
      />

      <section className="mt-6 grid gap-4">
        {activeTab === "created" ? (
          createdActivities.length > 0 ? (
            createdActivities.map((activity) => (
              <CreatedHangoutRow
                key={activity.id}
                activity={activity}
                locale={locale}
              />
            ))
          ) : (
            <EmptyPanel message={copy.emptyCreated} />
          )
        ) : null}

        {activeTab === "participation" ? (
          participations.length > 0 ? (
            participations.map((participation) => (
              <ParticipationHangoutRow
                key={participation.id}
                locale={locale}
                participation={participation}
              />
            ))
          ) : (
            <EmptyPanel message={copy.emptyParticipation} />
          )
        ) : null}

        {activeTab === "favorite" ? (
          favorites.length > 0 ? (
            favorites.map((favorite) => (
              <FavoriteHangoutRow
                key={favorite.id}
                favorite={favorite}
                locale={locale}
              />
            ))
          ) : (
            <EmptyPanel message={copy.emptyFavorite} />
          )
        ) : null}
      </section>
    </SubpageShell>
  );
}

function NetworkUserRow({
  locale,
  user,
}: {
  locale: string;
  user: ProfileFollowUserViewModel;
}) {
  const copy = getProfileSubpageCopy(locale);
  const initial = user.nickname.trim().slice(0, 1) || "N";

  return (
    <Link
      href={withLocale(locale, `/profile/${user.id}`)}
      className="group flex items-center gap-3 border-b border-[#E8E1CF] py-4 last:border-b-0 active:bg-[#F7F4E9]"
    >
      {user.avatarUrl ? (
        // User avatars are remote profile images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-full object-cover shadow-sm"
        />
      ) : (
        <span className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-[#DCEBDE] text-base font-black text-[#156240] shadow-sm">
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-black text-[#111210]">
            {user.nickname}
          </p>
          {user.isCoCreator ? (
            <CoCreatorIdentityBadge locale={locale} variant="icon" />
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#7A8276]">
          {user.bio ?? copy.noBio}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#B1B39F] transition group-active:translate-x-0.5" />
    </Link>
  );
}

export function ProfileNetworkMobilePage({
  currentUserFriendCode = null,
  dashboard,
  locale,
}: {
  currentUserFriendCode?: string | null;
  dashboard: ProfileDashboardViewModel;
  locale: string;
}) {
  const copy = getProfileSubpageCopy(locale);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const list = useMemo(() => {
    if (!normalizedSearchTerm) {
      return dashboard.friends;
    }

    return dashboard.friends.filter((friend) => {
      const searchableText = [friend.nickname, friend.bio ?? ""]
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [dashboard.friends, normalizedSearchTerm]);

  return (
    <SubpageShell
      title={copy.networkTitle}
      locale={locale}
      right={
        <button
          type="button"
          aria-label={copy.addFriend}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2]"
          onClick={() => setAddFriendOpen(true)}
        >
          <UserRoundPlus className="h-5 w-5" />
        </button>
      }
    >
      <div className="mt-8 border-b border-[#DED8BE] pb-4">
        <label className="flex h-11 items-center gap-2 rounded-full bg-white/82 px-4 text-[#6C746A] ring-1 ring-[#E2DBC4] focus-within:ring-[#8AB68E]">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.searchFriends}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#111210] outline-none placeholder:text-[#A3A48F]"
          />
          <span className="shrink-0 text-xs font-black text-[#156240]">
            {dashboard.friendCount}
          </span>
        </label>
      </div>

      <section className="mt-3">
        {list.length > 0 ? (
          list.map((user) => (
            <NetworkUserRow key={user.id} user={user} locale={locale} />
          ))
        ) : (
          <div className="py-8">
            <EmptyPanel
              message={normalizedSearchTerm ? copy.emptySearch : copy.emptyNetwork}
            />
          </div>
        )}
      </section>

      {addFriendOpen ? (
        <AddFriendDialog
          currentUserFriendCode={currentUserFriendCode}
          locale={locale}
          onClose={() => setAddFriendOpen(false)}
        />
      ) : null}
    </SubpageShell>
  );
}
