"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { formatActivityDate } from "@chill-club/shared";
import {
  Camera,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Repeat2,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import { getDirectMessagesCopy } from "@/features/direct-messages/copy";
import type { DirectMessageFriendRosterItemViewModel } from "@/features/direct-messages/queries/getDirectMessages";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FootprintsTab = "moment" | "message" | "profile";

type FootprintsMobilePageProps = {
  initialTab?: FootprintsTab;
  locale: string;
  messageFriends: DirectMessageFriendRosterItemViewModel[];
  messageRosterError?: boolean;
  profile: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    bio: string | null;
    friendCode: string | null;
  };
};

type MomentCard = {
  author: string;
  time: string;
  text: string;
  image: string;
  imageAlt: string;
  likes: number;
  comments: number;
  accent: string;
};

const copyByLocale = {
  "zh-CN": {
    title: "足迹",
    settings: "设置",
    tabs: {
      moment: "Moment",
      message: "消息",
      profile: "主页",
    },
    composer: "分享此刻的心情或精彩瞬间...",
    feedTitle: "好友动态",
    publish: "发布",
    like: "点赞",
    comment: "评论",
    share: "转发",
    messageTitle: "消息",
    messageDescription: "好友私聊和组局沟通都在这里。",
    openMessages: "进入消息",
    notificationTitle: "通知",
    notificationDescription: "报名、评论和点赞提醒会汇总到通知中心。",
    openNotifications: "查看通知",
    profileTitle: "我的主页",
    profileDescription: "头像、简介和好友码仍在个人主页管理。",
    openProfile: "编辑主页",
    friendCode: "好友码",
    bioFallback: "还没有填写简介。",
    samples: [
      {
        author: "Chloe",
        time: "2小时前",
        text: "超棒的桌游之夜！认识了新朋友～",
        image: "/illustrations/png/board-games.png",
        imageAlt: "朋友围坐桌游",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "5小时前",
        text: "日落骑行，风景绝了 🌄",
        image: "/illustrations/png/travel.png",
        imageAlt: "朋友骑行出游",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
  en: {
    title: "Trace",
    settings: "Settings",
    tabs: {
      moment: "Moment",
      message: "Message",
      profile: "Profile",
    },
    composer: "Share a mood or a bright little moment...",
    feedTitle: "Friends",
    publish: "Post",
    like: "Like",
    comment: "Comment",
    share: "Repost",
    messageTitle: "Messages",
    messageDescription: "Friend chats and plan details stay here.",
    openMessages: "Open messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Comments, likes, joins, and approvals are grouped here.",
    openNotifications: "Open notifications",
    profileTitle: "Profile",
    profileDescription:
      "Manage your avatar, bio, and friend code from your profile.",
    openProfile: "Edit profile",
    friendCode: "Friend code",
    bioFallback: "No bio yet.",
    samples: [
      {
        author: "Chloe",
        time: "2h ago",
        text: "A perfect board game night. Met new friends.",
        image: "/illustrations/png/board-games.png",
        imageAlt: "Friends around a board game table",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "5h ago",
        text: "Sunset ride. Worth the climb.",
        image: "/illustrations/png/travel.png",
        imageAlt: "Friends cycling outdoors",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
  fr: {
    title: "Trace",
    settings: "Réglages",
    tabs: {
      moment: "Moment",
      message: "Message",
      profile: "Profil",
    },
    composer: "Partage une humeur ou un instant à garder...",
    feedTitle: "Amis",
    publish: "Publier",
    like: "J'aime",
    comment: "Commenter",
    share: "Partager",
    messageTitle: "Messages",
    messageDescription:
      "Les échanges entre amis et autour des plans restent ici.",
    openMessages: "Ouvrir les messages",
    notificationTitle: "Notifications",
    notificationDescription:
      "Commentaires, likes, inscriptions et validations sont regroupés ici.",
    openNotifications: "Voir les notifications",
    profileTitle: "Profil",
    profileDescription:
      "Gérez votre avatar, bio et code ami depuis votre profil.",
    openProfile: "Modifier le profil",
    friendCode: "Code ami",
    bioFallback: "Aucune bio pour le moment.",
    samples: [
      {
        author: "Chloe",
        time: "il y a 2 h",
        text: "Super soirée jeux de société. De nouvelles rencontres.",
        image: "/illustrations/png/board-games.png",
        imageAlt: "Amis autour d'une table de jeu",
        likes: 24,
        comments: 6,
        accent: "#FDE4DF",
      },
      {
        author: "Kevin",
        time: "il y a 5 h",
        text: "Balade au coucher du soleil, très beau moment.",
        image: "/illustrations/png/travel.png",
        imageAlt: "Amis à vélo",
        likes: 18,
        comments: 4,
        accent: "#FFF1C7",
      },
    ] satisfies MomentCard[],
  },
} as const;

function getFootprintsCopy(locale: string) {
  if (locale === "en" || locale === "fr") {
    return copyByLocale[locale];
  }

  return copyByLocale["zh-CN"];
}

function ProfileAvatar({
  avatarUrl,
  name,
  className,
}: {
  avatarUrl: string | null;
  name: string;
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "F";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "h-11 w-11 rounded-full border border-[#FEFFF9] object-cover shadow-[0_6px_16px_rgba(21,98,64,0.14)]",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7457A] text-sm font-black text-white shadow-[0_6px_16px_rgba(21,98,64,0.14)]",
        className,
      )}
    >
      {initial}
    </span>
  );
}

function SampleAvatar({ name, accent }: { name: string; accent: string }) {
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white text-sm font-black text-[#1D1D1B] shadow-[0_6px_16px_rgba(21,98,64,0.1)]"
      style={{ backgroundColor: accent }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function FeedCard({
  moment,
  copy,
}: {
  moment: MomentCard;
  copy: ReturnType<typeof getFootprintsCopy>;
}) {
  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-[#E3DCC5] bg-white shadow-[0_12px_34px_rgba(21,98,64,0.08)]">
      <div className="flex items-start gap-3 px-4 pb-2 pt-4">
        <SampleAvatar name={moment.author} accent={moment.accent} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black leading-5 text-[#111210]">
                {moment.author}
              </p>
              <p className="text-xs font-semibold text-[#6C746A]">
                {moment.time}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1D1D1B]/62 transition hover:bg-[#F1F2EC]"
              aria-label="More"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-[14px] font-semibold leading-6 text-[#1D1D1B]">
            {moment.text}
          </p>
        </div>
      </div>

      <div className="px-4">
        <div className="relative aspect-[16/8.6] overflow-hidden rounded-[1.1rem] bg-[#F7EDE6]">
          <Image
            src={moment.image}
            alt={moment.imageAlt}
            fill
            sizes="(max-width: 768px) 92vw, 420px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 px-4 py-3 text-[#1D1D1B]/76">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full py-2 text-sm font-bold"
          aria-label={copy.like}
        >
          <Heart className="h-[18px] w-[18px]" />
          <span>{moment.likes}</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold"
          aria-label={copy.comment}
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          <span>{moment.comments}</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-end gap-2 rounded-full py-2 text-sm font-bold"
          aria-label={copy.share}
        >
          <Repeat2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </article>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[1.25rem] border border-[#E3DCC5] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(21,98,64,0.07)] transition active:scale-[0.99]"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF4E7] text-[#156240]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-5 text-[#111210]">
          {title}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-[#6C746A]">
          {description}
        </span>
      </span>
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#FEFFF9] px-2.5 text-xs font-black text-[#156240] ring-1 ring-[#D6D5B2]">
        {cta}
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function FootprintsMessageList({
  currentUserProfileId,
  friends,
  hasError,
  locale,
}: {
  currentUserProfileId: string;
  friends: DirectMessageFriendRosterItemViewModel[];
  hasError?: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  if (hasError) {
    return (
      <section className="mt-4 border-y border-[#E8E4D4] bg-white/72 px-1 py-4 text-sm font-semibold leading-6 text-[#8E8383]">
        {t.emptyListDescription}
      </section>
    );
  }

  if (friends.length === 0) {
    return (
      <section className="mt-4 border-y border-[#E8E4D4] bg-white/72 px-1 py-6">
        <h2 className="text-[16px] font-black leading-6 text-[#111210]">
          {t.emptyFriendListTitle}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#8E8383]">
          {t.emptyFriendListDescription}
        </p>
        <Link
          href={withLocale(locale, "/friends")}
          className="mt-4 inline-flex h-9 items-center rounded-full bg-[#156240] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.16)]"
        >
          {t.addFriend}
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <div className="divide-y divide-[#E8E4D4] border-y border-[#E8E4D4] bg-white/72">
        {friends.map((friend) => (
          <FootprintsMessageRow
            key={friend.friendshipId}
            currentUserProfileId={currentUserProfileId}
            friend={friend}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

function FootprintsMessageRow({
  currentUserProfileId,
  friend,
  locale,
}: {
  currentUserProfileId: string;
  friend: DirectMessageFriendRosterItemViewModel;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);
  const lastMessage = friend.lastMessage;
  const isMine = lastMessage?.senderId === currentUserProfileId;
  const preview = lastMessage
    ? `${isMine ? t.youPrefix : ""}${lastMessage.body}`
    : t.startChat;
  const time =
    lastMessage?.createdAt ?? friend.lastMessageAt ?? friend.createdAt;
  const content = (
    <>
      <MessageAvatar
        avatarUrl={friend.friend.avatarUrl}
        name={friend.friend.nickname}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-2">
          <span className="truncate text-[14px] font-black leading-5 text-[#111210]">
            {friend.friend.nickname}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8E8383]">
            {formatActivityDate(time, locale)}
          </span>
        </span>
        <span className="mt-1 block truncate text-[13px] font-semibold leading-5 text-[#156240]">
          {preview}
        </span>
      </span>
    </>
  );

  return (
    <article className="min-w-0 transition active:bg-[#F1F2EC]/72">
      {friend.conversationId ? (
        <Link
          aria-label={t.openConversation(friend.friend.nickname)}
          className="flex min-w-0 items-center gap-3 px-1 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30"
          href={withLocale(locale, `/messages/${friend.conversationId}`)}
        >
          {content}
        </Link>
      ) : (
        <form action={openDirectConversationAction}>
          <input name="locale" type="hidden" value={locale} />
          <input
            name="friendProfileId"
            type="hidden"
            value={friend.friend.id}
          />
          <button
            type="submit"
            className="flex w-full min-w-0 items-center gap-3 px-1 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30"
            aria-label={t.openConversation(friend.friend.nickname)}
          >
            {content}
          </button>
        </form>
      )}
    </article>
  );
}

export function FootprintsMobilePage({
  initialTab = "moment",
  locale,
  messageFriends,
  messageRosterError = false,
  profile,
}: FootprintsMobilePageProps) {
  const copy = useMemo(() => getFootprintsCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState<FootprintsTab>(initialTab);

  const tabs: Array<{ key: FootprintsTab; label: string }> = [
    { key: "moment", label: copy.tabs.moment },
    { key: "message", label: copy.tabs.message },
    { key: "profile", label: copy.tabs.profile },
  ];

  return (
    <main className="min-h-screen bg-[#FEFFF9] pb-28 text-[#111210] md:bg-[#EEF4FB]">
      <div className="mx-auto min-h-screen max-w-md bg-[#FEFFF9] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
        <header className="flex items-center justify-between">
          <h1 className="text-[28px] font-black leading-none tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <Link
            href={withLocale(locale, "/profile")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#1D1D1B] shadow-[0_8px_20px_rgba(21,98,64,0.08)]"
            aria-label={copy.settings}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        <nav className="mt-7 grid grid-cols-3 border-b border-[#E3DCC5] text-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  "relative pb-3 text-sm font-black tracking-normal transition",
                  active ? "text-[#111210]" : "text-[#1D1D1B]/58",
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px mx-auto h-[3px] w-10 rounded-full bg-[#156240] transition",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </nav>

        {activeTab === "moment" ? (
          <section className="mt-5 space-y-5">
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-[#E3DCC5] bg-white px-4 py-3 text-left shadow-[0_12px_34px_rgba(21,98,64,0.08)] transition active:scale-[0.99]"
            >
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                name={profile.nickname}
              />
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#8E8383]">
                {copy.composer}
              </span>
              <span className="relative inline-flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF2D7]">
                <Image
                  src="/brand/v2_1/friemi-empty-state-mark.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-11 w-11 object-contain opacity-90"
                />
                <span className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#156240] text-white shadow-[0_8px_18px_rgba(21,98,64,0.18)]">
                  <Plus className="h-4 w-4" />
                </span>
              </span>
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-black tracking-normal text-[#156240]">
                {copy.feedTitle}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-full bg-[#EAF4E7] px-3 text-xs font-black text-[#156240]"
              >
                <Camera className="h-4 w-4" />
                {copy.publish}
              </button>
            </div>

            <div className="space-y-4">
              {copy.samples.map((moment) => (
                <FeedCard
                  key={`${moment.author}-${moment.time}`}
                  moment={moment}
                  copy={copy}
                />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "message" ? (
          <FootprintsMessageList
            currentUserProfileId={profile.id}
            friends={messageFriends}
            hasError={messageRosterError}
            locale={locale}
          />
        ) : null}

        {activeTab === "profile" ? (
          <section className="mt-5 space-y-4">
            <div className="rounded-[1.45rem] border border-[#E3DCC5] bg-white p-4 shadow-[0_12px_34px_rgba(21,98,64,0.08)]">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  avatarUrl={profile.avatarUrl}
                  name={profile.nickname}
                  className="h-14 w-14 text-base"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-black leading-6 text-[#111210]">
                    {profile.nickname}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#6C746A]">
                    {profile.bio || copy.bioFallback}
                  </p>
                </div>
              </div>

              {profile.friendCode ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F1F2EC] px-3 py-2 text-xs font-black text-[#156240]">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.friendCode}
                  <span className="text-[#1D1D1B]">{profile.friendCode}</span>
                </div>
              ) : null}
            </div>

            <ActionCard
              icon={<UserRound className="h-5 w-5" />}
              title={copy.profileTitle}
              description={copy.profileDescription}
              href={withLocale(locale, "/profile")}
              cta={copy.openProfile}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
