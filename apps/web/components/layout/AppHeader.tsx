import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  CalendarPlus,
  CircleUserRound,
  Compass,
  MessageCircle,
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
};

export function AppHeader({
  locale,
  showNotificationNav = false,
  showAdminNav = false,
  unreadNotificationCount = 0,
}: AppHeaderProps) {
  const t = getCopy(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={withLocale(locale, "/")}
          className="flex items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-paper shadow-sm ring-1 ring-black/10">
            <Image
              src="/logo-icon.png"
              alt="Next Fun Club"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="hidden text-sm font-semibold tracking-normal sm:inline">
            Next Fun Club
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70"
            href={withLocale(locale, "/activities")}
          >
            <Compass className="h-4 w-4" />
            {t.nav.activities}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70 lg:hidden"
            href={withLocale(locale, "/activities/new")}
          >
            <CalendarPlus className="h-4 w-4" />
            {t.nav.newActivityShort}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70"
            href={withLocale(locale, "/messages")}
          >
            <MessageCircle className="h-4 w-4" />
            {t.nav.messages}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70"
            href={withLocale(locale, "/profile")}
          >
            <CircleUserRound className="h-4 w-4" />
            {t.nav.profile}
          </Link>
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <GlobalSearchForm
            locale={locale}
            className="hidden xl:flex"
            variant="header"
          />
          <GlobalSearchIconLink locale={locale} />
          <LocaleSwitcher locale={locale} />
          <Link
            href={withLocale(locale, "/activities/new")}
            className="hidden lg:block"
          >
            <Button className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              {t.nav.newActivity}
            </Button>
          </Link>
          {showNotificationNav ? (
            <NotificationHeaderLink
              locale={locale}
              unreadNotificationCount={unreadNotificationCount}
            />
          ) : null}
          <UserMenu
            locale={locale}
            showAdminLink={showAdminNav}
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
