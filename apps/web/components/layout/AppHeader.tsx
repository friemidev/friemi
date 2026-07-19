import Link from "next/link";
import { AppHeaderChrome } from "@/components/layout/AppHeaderChrome";
import { AppHeaderCitySwitcher } from "@/components/layout/AppHeaderCitySwitcher";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { withLocale } from "@/lib/routes";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { UserMenu } from "@/components/navigation/UserMenu";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import {
  GlobalSearchForm,
  GlobalSearchIconLink,
} from "@/features/search/components/GlobalSearchForm";
import { NotificationHeaderLink } from "@/features/notifications/components/NotificationHeaderLink";

type AppHeaderProps = {
  locale: string;
  isAuthenticated?: boolean;
  showNotificationNav?: boolean;
  showAdminNav?: boolean;
  unreadNotificationCount?: number;
  viewerContactEmail?: string | null;
  viewerEmail?: string | null;
  viewerFriendCode?: string | null;
  viewerPhone?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

export function AppHeader({
  locale,
  isAuthenticated = false,
  showNotificationNav = false,
  showAdminNav = false,
  unreadNotificationCount = 0,
  viewerContactEmail = null,
  viewerEmail = null,
  viewerFriendCode = null,
  viewerPhone = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: AppHeaderProps) {
  return (
    <AppHeaderChrome locale={locale}>
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:h-16 sm:px-4 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:gap-3 lg:px-8">
        <Link
          href={withLocale(locale, "/home")}
          className="group flex shrink-0 items-center gap-2"
          prefetch={false}
        >
          <BrandLockup
            className="transition duration-200 group-hover:scale-[1.02] max-[900px]:h-8 max-[900px]:w-[6.8rem] max-[420px]:!h-7 max-[420px]:!w-[5.95rem]"
            priority
            size="md"
          />
        </Link>

        <AppHeaderCitySwitcher locale={locale} />

        <DesktopNav locale={locale} />

        <div className="flex min-w-0 items-center justify-end gap-1 lg:gap-2">
          <GlobalSearchForm
            locale={locale}
            className="hidden min-[1480px]:flex"
            variant="header"
          />
          <div className="hidden lg:block">
            <GlobalSearchIconLink locale={locale} />
          </div>
          {showNotificationNav ? (
            <NotificationHeaderLink
              locale={locale}
              initialUnreadNotificationCount={unreadNotificationCount}
            />
          ) : null}
          <div className="hidden lg:block">
            <UserMenu
              locale={locale}
              isAuthenticated={isAuthenticated}
              showAdminLink={showAdminNav}
              viewerContactEmail={viewerContactEmail}
              viewerEmail={viewerEmail}
              viewerFriendCode={viewerFriendCode}
              viewerPhone={viewerPhone}
              viewerWechatId={viewerWechatId}
              viewerNickname={viewerNickname}
              incomingFriendRequests={incomingFriendRequests}
              unreadNotificationCount={unreadNotificationCount}
            />
          </div>
        </div>
      </div>
    </AppHeaderChrome>
  );
}
