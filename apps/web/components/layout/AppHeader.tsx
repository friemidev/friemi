import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandLockup";
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
    <header className="sticky top-0 z-40 border-b border-[#D6D5B2] bg-[#FFF5E6] shadow-[0_2px_10px_rgba(21,98,64,0.06)]">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={withLocale(locale, "/home")}
          className="group flex shrink-0 items-center gap-2"
          prefetch={false}
        >
          <BrandLockup
            className="transition duration-200 group-hover:scale-[1.02]"
            priority
            size="md"
          />
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
