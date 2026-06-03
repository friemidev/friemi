import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  CalendarPlus,
  Compass,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { LocaleSwitcher } from "@/components/navigation/LocaleSwitcher";
import { UserMenu } from "@/components/navigation/UserMenu";
import {
  GlobalSearchForm,
  GlobalSearchIconLink,
} from "@/features/search/components/GlobalSearchForm";
import { getCopy } from "@/lib/copy";

type AppHeaderProps = {
  locale: string;
  showNotificationNav?: boolean;
  showAdminNav?: boolean;
  unreadNotificationCount?: number;
  viewerFriendCode?: string | null;
  viewerNickname?: string | null;
};

export function AppHeader({
  locale,
  showNotificationNav = false,
  showAdminNav = false,
  unreadNotificationCount = 0,
  viewerFriendCode = null,
  viewerNickname = null,
}: AppHeaderProps) {
  const t = getCopy(locale);
  const messagesLabel = (
    <>
      <span className="2xl:hidden">{t.nav.messagesShort}</span>
      <span className="hidden 2xl:inline">{t.nav.messages}</span>
    </>
  );
  const lobbyLabel = (
    <>
      <span className="2xl:hidden">{t.nav.lobbyShort}</span>
      <span className="hidden 2xl:inline">{t.nav.lobby}</span>
    </>
  );
  const newActivityLabel = (
    <>
      <span className="2xl:hidden">{t.nav.newActivityShort}</span>
      <span className="hidden 2xl:inline">{t.nav.newActivity}</span>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={withLocale(locale, "/")}
          className="flex shrink-0 items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-paper shadow-sm ring-1 ring-black/10">
            <Image
              src="/logo-icon.png"
              alt="Next Fun"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="hidden whitespace-nowrap text-sm font-semibold tracking-normal xl:inline">
            Next Fun
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-1 lg:gap-1.5 md:flex">
          <Link
            className="flex whitespace-nowrap items-center gap-1.5 rounded-md px-2 py-2 text-xs text-zinc-700 hover:bg-white/70 lg:px-2.5 lg:text-sm"
            href={withLocale(locale, "/lobby")}
          >
            <UsersRound className="h-4 w-4" />
            {lobbyLabel}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-1.5 rounded-md px-2 py-2 text-xs text-zinc-700 hover:bg-white/70 lg:px-2.5 lg:text-sm"
            href={withLocale(locale, "/activities")}
          >
            <Compass className="h-4 w-4" />
            {t.nav.activities}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-1.5 rounded-md px-2 py-2 text-xs text-zinc-700 hover:bg-white/70 lg:px-2.5 lg:text-sm"
            href={withLocale(locale, "/messages")}
          >
            <MessageCircle className="h-4 w-4" />
            {messagesLabel}
          </Link>
          <Link
            href={withLocale(locale, "/activities/new")}
            className="ml-2"
          >
            <Button className="gap-1.5 rounded-full border-0 bg-[#d88d72] px-4 text-white shadow-[0_8px_20px_rgba(216,141,114,0.28)] hover:bg-[#c87b61] xl:gap-2 xl:px-5">
              <CalendarPlus className="h-4 w-4" />
              {newActivityLabel}
            </Button>
          </Link>
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <GlobalSearchForm
            locale={locale}
            className="hidden min-[1480px]:flex"
            variant="header"
          />
          <GlobalSearchIconLink locale={locale} />
          <LocaleSwitcher locale={locale} />
          {showNotificationNav ? (
            <NotificationHeaderLink
              locale={locale}
              unreadNotificationCount={unreadNotificationCount}
            />
          ) : null}
          <UserMenu
            locale={locale}
            showAdminLink={showAdminNav}
            viewerFriendCode={viewerFriendCode}
            viewerNickname={viewerNickname}
            unreadNotificationCount={unreadNotificationCount}
          />
        </div>
      </div>
    </header>
  );
}

function NotificationHeaderLink({
  locale,
  unreadNotificationCount,
}: {
  locale: string;
  unreadNotificationCount: number;
}) {
  const t = getCopy(locale).notifications;
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const unreadBadgeText =
    unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const label = hasUnreadNotifications
    ? `${t.title} (${t.unreadCount(unreadNotificationCount)})`
    : t.title;

  return (
    <Link
      aria-label={label}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/75 text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      href={withLocale(locale, "/notifications")}
      title={label}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {hasUnreadNotifications ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper"
        >
          {unreadBadgeText}
        </span>
      ) : null}
    </Link>
  );
}
