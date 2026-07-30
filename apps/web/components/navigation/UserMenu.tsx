import { SignedIn, SignedOut } from "@clerk/nextjs";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { AuthRedirectSignInButton } from "@/components/navigation/AuthRedirectSignInButton";

type UserMenuProps = {
  locale: string;
  isAuthenticated?: boolean;
  showAdminLink?: boolean;
  unreadNotificationCount?: number;
  viewerContactEmail?: string | null;
  viewerEmail?: string | null;
  viewerFriendCode?: string | null;
  viewerPhone?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
};

export function UserMenu({
  locale,
  isAuthenticated = false,
  showAdminLink = false,
  unreadNotificationCount = 0,
  viewerContactEmail = null,
  viewerEmail = null,
  viewerFriendCode = null,
  viewerPhone = null,
  viewerWechatId = null,
  viewerNickname = null,
}: UserMenuProps) {
  const t = getCopy(locale);

  if (!hasClerkKeys()) {
    return <AuthRedirectSignInButton label={t.nav.signIn} locale={locale} />;
  }

  if (isAuthenticated) {
    return (
      <AccountMenu
        locale={locale}
        showAdminLink={showAdminLink}
        viewerContactEmail={viewerContactEmail}
        viewerEmail={viewerEmail}
        viewerFriendCode={viewerFriendCode}
        viewerPhone={viewerPhone}
        viewerWechatId={viewerWechatId}
        viewerNickname={viewerNickname}
        unreadNotificationCount={unreadNotificationCount}
      />
    );
  }

  return (
    <>
      <SignedIn>
        <AccountMenu
          locale={locale}
          showAdminLink={showAdminLink}
          viewerContactEmail={viewerContactEmail}
          viewerEmail={viewerEmail}
          viewerFriendCode={viewerFriendCode}
          viewerPhone={viewerPhone}
          viewerWechatId={viewerWechatId}
          viewerNickname={viewerNickname}
          unreadNotificationCount={unreadNotificationCount}
        />
      </SignedIn>
      <SignedOut>
        <AuthRedirectSignInButton label={t.nav.signIn} locale={locale} />
      </SignedOut>
    </>
  );
}
