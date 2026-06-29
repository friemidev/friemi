import { SignedIn, SignedOut } from "@clerk/nextjs";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { AuthRedirectSignInButton } from "@/components/navigation/AuthRedirectSignInButton";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";

type UserMenuProps = {
  locale: string;
  showAdminLink?: boolean;
  unreadNotificationCount?: number;
  viewerContactEmail?: string | null;
  viewerEmail?: string | null;
  viewerFriendCode?: string | null;
  viewerPhone?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

export function UserMenu({
  locale,
  showAdminLink = false,
  unreadNotificationCount = 0,
  viewerContactEmail = null,
  viewerEmail = null,
  viewerFriendCode = null,
  viewerPhone = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: UserMenuProps) {
  const t = getCopy(locale);

  if (!hasClerkKeys()) {
    return <AuthRedirectSignInButton label={t.nav.signIn} locale={locale} />;
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
          incomingFriendRequests={incomingFriendRequests}
          unreadNotificationCount={unreadNotificationCount}
        />
      </SignedIn>
      <SignedOut>
        <AuthRedirectSignInButton label={t.nav.signIn} locale={locale} />
      </SignedOut>
    </>
  );
}
