import Link from "next/link";
import Image from "next/image";
import { withLocale } from "@/lib/routes";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { LocaleSwitcher } from "@/components/navigation/LocaleSwitcher";
import { UserMenu } from "@/components/navigation/UserMenu";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import {
  GlobalSearchForm,
  GlobalSearchIconLink,
} from "@/features/search/components/GlobalSearchForm";
import { NotificationHeaderLink } from "@/features/notifications/components/NotificationHeaderLink";

type AppHeaderProps = {
  locale: string;
  showNotificationNav?: boolean;
  showAdminNav?: boolean;
  unreadNotificationCount?: number;
  viewerFriendCode?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

export function AppHeader({
  locale,
  showNotificationNav = false,
  showAdminNav = false,
  unreadNotificationCount = 0,
  viewerFriendCode = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d8cdbb] bg-paper shadow-[0_2px_10px_rgba(36,30,20,0.06)]">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={withLocale(locale, "/home")}
          className="flex shrink-0 items-center gap-2"
          prefetch={false}
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-paper shadow-sm ring-1 ring-black/10">
            <Image
              src="/logo.png"
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

        <DesktopNav locale={locale} />

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
              initialUnreadNotificationCount={unreadNotificationCount}
            />
          ) : null}
          <UserMenu
            locale={locale}
            showAdminLink={showAdminNav}
            viewerFriendCode={viewerFriendCode}
            viewerWechatId={viewerWechatId}
            viewerNickname={viewerNickname}
            incomingFriendRequests={incomingFriendRequests}
            unreadNotificationCount={unreadNotificationCount}
          />
        </div>
      </div>
    </header>
  );
}
