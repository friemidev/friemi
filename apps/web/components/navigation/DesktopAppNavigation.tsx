import { DesktopAppNavigationChrome } from "@/components/navigation/DesktopAppNavigationChrome";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { UserMenu } from "@/components/navigation/UserMenu";
import {
  GlobalSearchForm,
  GlobalSearchIconLink,
} from "@/features/search/components/GlobalSearchForm";
import { NotificationHeaderLink } from "@/features/notifications/components/NotificationHeaderLink";

type DesktopAppNavigationProps = {
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
};

export function DesktopAppNavigation({
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
}: DesktopAppNavigationProps) {
  return (
    <DesktopAppNavigationChrome locale={locale}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <DesktopNav locale={locale} />
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
          <GlobalSearchForm
            locale={locale}
            className="hidden min-[1480px]:flex"
            variant="header"
          />
          <GlobalSearchIconLink locale={locale} />
          {showNotificationNav ? (
            <NotificationHeaderLink
              locale={locale}
              initialUnreadNotificationCount={unreadNotificationCount}
            />
          ) : null}
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
            unreadNotificationCount={unreadNotificationCount}
          />
        </div>
      </div>
    </DesktopAppNavigationChrome>
  );
}
