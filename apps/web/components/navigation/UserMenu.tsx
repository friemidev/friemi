import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";

type UserMenuProps = {
  locale: string;
  showAdminLink?: boolean;
  unreadNotificationCount?: number;
  viewerFriendCode?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

export function UserMenu({
  locale,
  showAdminLink = false,
  unreadNotificationCount = 0,
  viewerFriendCode = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: UserMenuProps) {
  const t = getCopy(locale);

  if (!hasClerkKeys()) {
    return (
      <Link href={withLocale(locale, "/sign-in")}>
        <Button variant="secondary">{t.nav.signIn}</Button>
      </Link>
    );
  }

  return (
    <>
      <SignedIn>
        <AccountMenu
          locale={locale}
          showAdminLink={showAdminLink}
          viewerFriendCode={viewerFriendCode}
          viewerWechatId={viewerWechatId}
          viewerNickname={viewerNickname}
          incomingFriendRequests={incomingFriendRequests}
          unreadNotificationCount={unreadNotificationCount}
        />
      </SignedIn>
      <SignedOut>
        <Link href={withLocale(locale, "/sign-in")}>
          <Button variant="secondary">{t.nav.signIn}</Button>
        </Link>
      </SignedOut>
    </>
  );
}
