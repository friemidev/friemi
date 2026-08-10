"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Eye,
  Gift,
  Heart,
  MessageCircle,
  Search,
  Ticket,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { getCopy, getStatusLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
} from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { FollowButton } from "@/features/follow/components/FollowButton";
import type { ProfileVisitorViewModel } from "@/features/profile-visits/queries/getProfileVisitors";
import type {
  ProfileFavoriteActivityViewModel,
  ProfileDashboardViewModel,
  ProfileFollowUserViewModel,
  ProfileMomentViewModel,
  ProfileParticipationViewModel,
} from "../queries/getProfileDashboard";
import { CoCreatorIdentityBadge } from "./CoCreatorIdentityBadge";

type HangoutsTab = "created" | "participation" | "favorite";
type MomentsTab = "published" | "saved";
type NetworkTab = "following" | "followers" | "mutual";
type ProfileVisitSummaryViewModel = {
  todayViewCount: number;
  totalViewCount: number;
  uniqueVisitorCount: number;
};

function getProfileSubpageCopy(locale: string) {
  if (locale === "fr") {
    return {
      findPeople: "Ajouter",
      created: "Créées",
      emptyCreated: "Aucune sortie créée.",
      emptyFavorite: "Aucune sortie sauvegardée.",
      emptyNetwork: "Aucune personne ici.",
      emptySearch: "Aucun résultat.",
      emptyParticipation: "Aucune sortie rejointe.",
      favorite: "Favoris",
      followers: "Me suivent",
      following: "Suivis",
      friends: "Réseau",
      hangoutsTitle: "Mes sorties",
      invite: "Code",
      joined: "Rejointes",
      joinedAt: "Rejoint",
      manage: "Gérer",
      momentFallback: "Moment",
      momentsTitle: "Mes moments",
      momentsPublished: "Publiés",
      momentsSaved: "Enregistrés",
      networkTitle: "Réseau",
      noBio: "Pas encore de bio.",
      emptyMoments: "Aucun moment publié.",
      emptySavedMoments: "Aucun moment enregistré.",
      savedAt: "Sauvé",
      searchPeople: "Rechercher",
      todayVisitors: "Aujourd'hui",
      follow: "Suivre",
      followBack: "Suivre aussi",
      totalVisitors: "Vues",
      unfollow: "Ne plus suivre",
      unfollowCancel: "Annuler",
      unfollowConfirm: "Confirmer",
      unfollowDescription: "Vous ne serez plus en suivi mutuel.",
      unfollowTitle: "Ne plus suivre ?",
      view: "Voir",
      visitors: "Visites",
      visibilityFriends: "Mutuels",
      visibilityPublic: "Public",
    };
  }

  if (locale === "en") {
    return {
      findPeople: "Add follow",
      created: "Created",
      emptyCreated: "No created plans yet.",
      emptyFavorite: "No saved plans yet.",
      emptyNetwork: "No people here yet.",
      emptySearch: "No matching people.",
      emptyParticipation: "No joined plans yet.",
      favorite: "Saved",
      followers: "Followers",
      following: "Following",
      friends: "Network",
      hangoutsTitle: "My Plans",
      invite: "Invite code",
      joined: "Joined",
      joinedAt: "Joined",
      manage: "Manage",
      momentFallback: "Moment",
      momentsTitle: "My Moments",
      momentsPublished: "Posts",
      momentsSaved: "Saved",
      networkTitle: "Network",
      noBio: "No bio yet.",
      emptyMoments: "No moments posted yet.",
      emptySavedMoments: "No saved moments yet.",
      savedAt: "Saved",
      searchPeople: "Search people",
      todayVisitors: "Today",
      follow: "Follow",
      followBack: "Follow back",
      totalVisitors: "Views",
      unfollow: "Unfollow",
      unfollowCancel: "Cancel",
      unfollowConfirm: "Unfollow",
      unfollowDescription: "You will no longer follow each other.",
      unfollowTitle: "Unfollow this user?",
      view: "View",
      visitors: "Visitors",
      visibilityFriends: "Mutuals",
      visibilityPublic: "Public",
    };
  }

  return {
    findPeople: "新关注",
    created: "我发起的",
    emptyCreated: "还没有发起聚吧。",
    emptyFavorite: "还没有收藏聚吧。",
    emptyNetwork: "这里还没有人。",
    emptySearch: "没有找到相关用户。",
    emptyParticipation: "还没有参与聚吧。",
    favorite: "我收藏的",
    followers: "关注我的",
    following: "我的关注",
    friends: "互相关注",
    hangoutsTitle: "我的聚吧",
    invite: "邀请码",
    joined: "我参与的",
    joinedAt: "报名",
    manage: "管理",
    momentFallback: "晒晒",
    momentsTitle: "我的晒晒",
    momentsPublished: "我的发布",
    momentsSaved: "收藏",
    networkTitle: "关系网",
    noBio: "还没有填写简介。",
    emptyMoments: "还没有发布晒晒。",
    emptySavedMoments: "还没有收藏晒晒。",
    savedAt: "收藏",
    searchPeople: "搜索用户",
    todayVisitors: "今日",
    follow: "关注",
    followBack: "回关",
    totalVisitors: "总访问",
    unfollow: "取消关注",
    unfollowCancel: "暂不取消",
    unfollowConfirm: "确认取消",
    unfollowDescription: "取消后，你们将不再是互相关注。",
    unfollowTitle: "确认取消关注？",
    view: "查看",
    visitors: "访客记录",
    visibilityFriends: "互相关注",
    visibilityPublic: "广场",
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
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] bg-white px-5">
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
        <div className="flex h-10 min-w-10 items-center justify-end">
          {right}
        </div>
      </header>
      {children}
    </main>
  );
}

function SegmentTabs<T extends string>({
  active,
  items,
  onChange,
  variant = "pill",
}: {
  active: T;
  items: Array<{ key: T; label: string; count: number }>;
  onChange: (key: T) => void;
  variant?: "pill" | "underline";
}) {
  if (variant === "underline") {
    return (
      <div className="mt-5 grid grid-cols-3 border-b border-[#E6DFC9]">
        {items.map((item) => {
          const selected = active === item.key;

          return (
            <button
              key={item.key}
              className={cn(
                "relative inline-flex h-10 min-w-0 items-center justify-center gap-1 px-1 text-[13px] font-black transition active:scale-[0.98]",
                selected ? "text-[#111210]" : "text-[#4F574F]",
              )}
              onClick={() => onChange(item.key)}
              type="button"
            >
              <span className="truncate">{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] leading-5",
                  selected
                    ? "bg-[#EAF5E8] text-[#156240]"
                    : "bg-[#F4F2EB] text-[#7A8276]",
                )}
              >
                {item.count}
              </span>
              {selected ? (
                <span className="absolute bottom-[-1px] left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[#156240]" />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

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

function getMomentTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function MomentProfileTabs({
  active,
  copy,
  onChange,
}: {
  active: MomentsTab;
  copy: ReturnType<typeof getProfileSubpageCopy>;
  onChange: (tab: MomentsTab) => void;
}) {
  const items: Array<{ key: MomentsTab; label: string }> = [
    { key: "published", label: copy.momentsPublished },
    { key: "saved", label: copy.momentsSaved },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 border-b border-[#E6DFC9] px-8">
      {items.map((item) => {
        const selected = active === item.key;

        return (
          <button
            key={item.key}
            className={cn(
              "relative h-10 min-w-0 px-2 text-center text-[12px] font-black transition active:scale-[0.98]",
              selected ? "text-[#111210]" : "text-[#6C746A]",
            )}
            onClick={() => onChange(item.key)}
            type="button"
          >
            <span className="truncate">{item.label}</span>
            {selected ? (
              <span className="absolute bottom-[-1px] left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-[#156240]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function MinimalEmptyPanel({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm font-bold text-[#7A8276]">
      {message}
    </div>
  );
}

function ProfileMomentRow({
  locale,
  moment,
}: {
  locale: string;
  moment: ProfileMomentViewModel;
}) {
  const copy = getProfileSubpageCopy(locale);
  const content = moment.content?.trim() || copy.momentFallback;

  return (
    <Link
      href={withLocale(locale, `/footprints/${moment.id}?from=profile-moments`)}
      className="group block py-4 transition active:scale-[0.99]"
    >
      <article className="min-w-0 border-b border-[#EEE7D5] pb-4">
        {moment.image ? (
          // Moment images are user uploaded assets.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.image.url}
            alt=""
            className="aspect-[1.92/1] w-full rounded-xl object-cover"
          />
        ) : null}

        <div
          className={cn(
            "flex min-w-0 items-start justify-between gap-3",
            moment.image ? "mt-2.5" : "",
          )}
        >
          <p className="min-w-0 flex-1 line-clamp-2 text-[13px] font-black leading-5 text-[#111210]">
            {content}
          </p>
          <span className="shrink-0 pt-0.5 text-[11px] font-bold leading-none text-[#8B907F]">
            {getMomentTime(moment.createdAt, locale)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-5 text-[12px] font-black text-[#6C746A]">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-[#E7457A]" />
            <span>{moment.likeCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span>{moment.commentCount}</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-[#C81E42]" />
            <span>{moment.giftCount}</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

export function ProfileMomentsMobilePage({
  likedMoments,
  locale,
  moments,
}: {
  likedMoments: ProfileMomentViewModel[];
  locale: string;
  moments: ProfileMomentViewModel[];
}) {
  const copy = getProfileSubpageCopy(locale);
  const [activeTab, setActiveTab] = useState<MomentsTab>("published");
  const sortedMoments = useMemo(
    () =>
      [...moments].sort((left, right) =>
        compareIsoDate(left.createdAt, right.createdAt),
      ),
    [moments],
  );
  const sortedLikedMoments = useMemo(
    () =>
      [...likedMoments].sort((left, right) =>
        compareIsoDate(left.createdAt, right.createdAt),
      ),
    [likedMoments],
  );
  const visibleMoments =
    activeTab === "published" ? sortedMoments : sortedLikedMoments;
  const emptyMessage =
    activeTab === "published" ? copy.emptyMoments : copy.emptySavedMoments;

  return (
    <SubpageShell title={copy.momentsTitle} locale={locale}>
      <MomentProfileTabs
        active={activeTab}
        copy={copy}
        onChange={setActiveTab}
      />

      <section className="mt-3">
        {visibleMoments.length > 0 ? (
          visibleMoments.map((moment) => (
            <ProfileMomentRow key={moment.id} locale={locale} moment={moment} />
          ))
        ) : (
          <MinimalEmptyPanel message={emptyMessage} />
        )}
      </section>
    </SubpageShell>
  );
}

function getCompactActivityHref(
  locale: string,
  activity: ActivityCardViewModel,
) {
  if (
    (activity.type === "PUBLIC_EVENT" || activity.isActivityInfo) &&
    activity.publicEventId
  ) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function getParticipantText(activity: ActivityCardViewModel) {
  return activity.capacity > 0
    ? `${activity.participantCount}/${activity.capacity}`
    : `${activity.participantCount}`;
}

function ActivityThumb({ activity }: { activity: ActivityCardViewModel }) {
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
  activity,
  locale,
  statusLabel,
}: {
  activity: ActivityCardViewModel;
  locale: string;
  statusLabel?: string;
}) {
  const displayStatus = getActivityDisplayStatus(activity);
  const resolvedStatusLabel =
    statusLabel ?? getStatusLabel(displayStatus, locale);
  const locationLabel = activity.city || activity.address;

  return (
    <Link
      href={getCompactActivityHref(locale, activity)}
      className="group grid grid-cols-[4.75rem_minmax(0,1fr)_1rem] items-center gap-3 border-b border-[#EEE7D5] py-3.5 transition active:scale-[0.99]"
    >
      <div className="h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-[1rem] bg-[#F5F2E7]">
        <ActivityThumb activity={activity} />
      </div>

      <div className="min-w-0">
        <h2 className="line-clamp-2 text-[14.5px] font-black leading-[1.18] text-[#111210]">
          {activity.title}
        </h2>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[#4F574F]">
          <UsersRound className="h-3.5 w-3.5 shrink-0 text-[#156240]" />
          <span className="shrink-0">{getParticipantText(activity)}</span>
          {locationLabel ? (
            <>
              <span className="text-[#A6A999]">·</span>
              <span className="truncate">{locationLabel}</span>
            </>
          ) : null}
        </div>

        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] font-bold text-[#4F574F]">
          <span className="flex min-w-0 items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#6AA179]" />
            <span className="truncate">
              {getActivityDateLabel(activity, locale)}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black text-[#156240]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {resolvedStatusLabel}
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[#A6A999] transition group-active:translate-x-0.5" />
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
  return <CompactHangoutRow activity={activity} locale={locale} />;
}

function ParticipationHangoutRow({
  locale,
  participation,
}: {
  locale: string;
  participation: ProfileParticipationViewModel;
}) {
  const t = getCopy(locale);

  return (
    <CompactHangoutRow
      activity={participation.activity}
      locale={locale}
      statusLabel={t.activityLabels.participationStatuses[participation.status]}
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
  return <CompactHangoutRow activity={favorite.activity} locale={locale} />;
}

export function ProfileHangoutsMobilePage({
  dashboard,
  initialTab = "created",
  locale,
}: {
  dashboard: ProfileDashboardViewModel;
  initialTab?: HangoutsTab;
  locale: string;
}) {
  const copy = getProfileSubpageCopy(locale);
  const [activeTab, setActiveTab] = useState<HangoutsTab>(initialTab);
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
        variant="underline"
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

      <section className="mt-4">
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
  activeTab,
  locale,
  onFollowStateChange,
  user,
}: {
  activeTab: NetworkTab;
  locale: string;
  onFollowStateChange: (
    user: ProfileFollowUserViewModel,
    isFollowing: boolean,
  ) => void;
  user: ProfileFollowUserViewModel;
}) {
  const copy = getProfileSubpageCopy(locale);
  const initial = user.nickname.trim().slice(0, 1) || "N";
  const isFollowing = activeTab !== "followers";
  const inactiveLabel =
    activeTab === "followers" ? copy.followBack : copy.follow;
  const showPublicNickname =
    Boolean(user.remarkName) && user.publicNickname !== user.nickname;

  return (
    <div className="flex items-center gap-3 border-b border-[#E8E1CF] py-4 last:border-b-0">
      <Link
        href={withLocale(locale, `/profile/${user.id}`)}
        className="group flex min-w-0 flex-1 items-center gap-3 active:bg-[#F7F4E9]"
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
          {showPublicNickname ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8B907F]">
              {user.publicNickname}
            </p>
          ) : null}
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#7A8276]">
            {user.bio ?? copy.noBio}
          </p>
        </div>
      </Link>
      <FollowButton
        activeButtonClassName="!h-8 !min-h-8 min-w-[4.75rem] rounded-full border border-[#D6D5B2] bg-white !px-3 !text-xs font-black text-[#156240] shadow-none active:scale-[0.98]"
        activeLabel={copy.unfollow}
        buttonClassName="!h-8 !min-h-8 min-w-[4.75rem] rounded-full border border-[#D6D5B2] bg-white !px-3 !text-xs font-black text-[#156240] shadow-none active:scale-[0.98]"
        fullWidth={false}
        inactiveLabel={inactiveLabel}
        isAuthenticated
        isFollowing={isFollowing}
        locale={locale}
        onStateChange={(nextIsFollowing) => {
          onFollowStateChange(user, nextIsFollowing);
        }}
        redirectPath="/profile/network"
        targetUserProfileId={user.id}
        unfollowConfirm={{
          cancelLabel: copy.unfollowCancel,
          confirmLabel: copy.unfollowConfirm,
          description: copy.unfollowDescription,
          title: copy.unfollowTitle,
        }}
      />
    </div>
  );
}

export function ProfileNetworkMobilePage({
  dashboard,
  locale,
  recentVisitors = [],
  visitSummary = {
    todayViewCount: 0,
    totalViewCount: 0,
    uniqueVisitorCount: 0,
  },
}: {
  dashboard: ProfileDashboardViewModel;
  locale: string;
  recentVisitors?: ProfileVisitorViewModel[];
  visitSummary?: ProfileVisitSummaryViewModel;
}) {
  const copy = getProfileSubpageCopy(locale);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<NetworkTab>("mutual");
  const [localNetwork, setLocalNetwork] = useState({
    followers: dashboard.followers,
    following: dashboard.following,
    mutual: dashboard.friends,
  });
  const [countAdjustments, setCountAdjustments] = useState({
    followers: 0,
    following: 0,
    mutual: 0,
  });

  useEffect(() => {
    setLocalNetwork({
      followers: dashboard.followers,
      following: dashboard.following,
      mutual: dashboard.friends,
    });
    setCountAdjustments({
      followers: 0,
      following: 0,
      mutual: 0,
    });
  }, [dashboard.followers, dashboard.following, dashboard.friends]);

  const activeUsers =
    activeTab === "following"
      ? localNetwork.following
      : activeTab === "followers"
        ? localNetwork.followers
        : localNetwork.mutual;
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const list = useMemo(() => {
    if (!normalizedSearchTerm) {
      return activeUsers;
    }

    return activeUsers.filter((friend) => {
      const searchableText = [
        friend.nickname,
        friend.publicNickname,
        friend.remarkName ?? "",
        friend.bio ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [activeUsers, normalizedSearchTerm]);
  const networkTabs = [
    {
      key: "mutual" as const,
      label: copy.friends,
      count: Math.max(0, dashboard.friendCount + countAdjustments.mutual),
    },
    {
      key: "following" as const,
      label: copy.following,
      count: Math.max(
        0,
        dashboard.followingCount + countAdjustments.following,
      ),
    },
    {
      key: "followers" as const,
      label: copy.followers,
      count: Math.max(
        0,
        dashboard.followersCount + countAdjustments.followers,
      ),
    },
  ];
  const visitorPreview = recentVisitors.slice(0, 3);

  function handleNetworkFollowChange(
    user: ProfileFollowUserViewModel,
    isFollowing: boolean,
  ) {
    if (activeTab === "mutual" && !isFollowing) {
      setLocalNetwork((current) => ({
        followers: current.followers.some((item) => item.id === user.id)
          ? current.followers
          : [user, ...current.followers],
        following: current.following,
        mutual: current.mutual.filter((item) => item.id !== user.id),
      }));
      setCountAdjustments((current) => ({
        ...current,
        followers: current.followers + 1,
        mutual: current.mutual - 1,
      }));
      return;
    }

    if (activeTab === "following" && !isFollowing) {
      setLocalNetwork((current) => ({
        ...current,
        following: current.following.filter((item) => item.id !== user.id),
      }));
      setCountAdjustments((current) => ({
        ...current,
        following: current.following - 1,
      }));
      return;
    }

    if (activeTab === "followers" && isFollowing) {
      setLocalNetwork((current) => ({
        followers: current.followers.filter((item) => item.id !== user.id),
        following: current.following,
        mutual: current.mutual.some((item) => item.id === user.id)
          ? current.mutual
          : [user, ...current.mutual],
      }));
      setCountAdjustments((current) => ({
        ...current,
        followers: current.followers - 1,
        mutual: current.mutual + 1,
      }));
    }
  }

  return (
    <SubpageShell
      title={copy.networkTitle}
      locale={locale}
      right={
        <div className="flex items-center gap-1.5">
          <Link
            aria-label={copy.findPeople}
            className="inline-flex h-9 max-w-[6rem] items-center justify-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-black text-[#E83F83] ring-1 ring-[#E9DCC9] transition active:scale-[0.98]"
            href={withLocale(locale, "/search")}
            title={copy.findPeople}
          >
            <UserRoundPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">{copy.findPeople}</span>
          </Link>
          <Link
            aria-label={copy.invite}
            className="inline-flex h-9 max-w-[5.4rem] items-center justify-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-black text-[#156240] ring-1 ring-[#E9DCC9] transition active:scale-[0.98]"
            href={withLocale(locale, "/profile/invite")}
            title={copy.invite}
          >
            <Ticket className="h-4 w-4 shrink-0" />
            <span className="truncate">{copy.invite}</span>
          </Link>
        </div>
      }
    >
      <div className="mt-8 border-b border-[#DED8BE] pb-4">
        <label className="flex h-11 items-center gap-2 rounded-full bg-white/82 px-4 text-[#6C746A] ring-1 ring-[#E2DBC4] focus-within:ring-[#8AB68E]">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.searchPeople}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#111210] outline-none placeholder:text-[#A3A48F]"
          />
          <span className="shrink-0 text-xs font-black text-[#156240]">
            {networkTabs.find((tab) => tab.key === activeTab)?.count ?? 0}
          </span>
        </label>
        <Link
          href={withLocale(locale, "/profile/visitors")}
          className="mt-3 flex h-14 items-center gap-3 rounded-[1.1rem] bg-white px-3 text-[#111210] ring-1 ring-[#E3DCC5] transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-[#143376] ring-1 ring-[#C8D9F5]">
            <Eye className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">
              {copy.visitors}
            </span>
            <span className="block truncate text-xs font-semibold text-[#6C746A]">
              {copy.todayVisitors} {visitSummary.todayViewCount} ·{" "}
              {copy.totalVisitors} {visitSummary.totalViewCount}
            </span>
          </span>
          {visitorPreview.length > 0 ? (
            <span className="flex shrink-0 -space-x-2">
              {visitorPreview.map((visit) => {
                const initial =
                  visit.visitor.nickname.trim().slice(0, 1) || "N";

                return visit.visitor.avatarUrl ? (
                  // User avatars are remote profile images.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={visit.visitor.avatarUrl}
                    alt={visit.visitor.nickname}
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                    key={visit.id}
                  />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#DCEBDE] text-[10px] font-black text-[#156240]"
                    key={visit.id}
                  >
                    {initial}
                  </span>
                );
              })}
            </span>
          ) : null}
          <ChevronRight className="h-4 w-4 shrink-0 text-[#A3A48F]" />
        </Link>
        <SegmentTabs
          active={activeTab}
          items={networkTabs}
          onChange={setActiveTab}
        />
      </div>

      <section className="mt-3">
        {list.length > 0 ? (
          list.map((user) => (
            <NetworkUserRow
              key={user.id}
              activeTab={activeTab}
              locale={locale}
              onFollowStateChange={handleNetworkFollowChange}
              user={user}
            />
          ))
        ) : (
          <div className="py-8">
            <EmptyPanel
              message={
                normalizedSearchTerm ? copy.emptySearch : copy.emptyNetwork
              }
            />
          </div>
        )}
      </section>
    </SubpageShell>
  );
}
