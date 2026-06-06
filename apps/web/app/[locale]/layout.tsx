import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/navigation/MobileNav";
import { getPendingIncomingFriendRequests } from "@/features/friends/queries/getFriendsDashboard";
import { getUnreadNotificationCount } from "@/features/notifications/queries/getNotifications";
import { NicknameRequiredDialog } from "@/features/profile/components/NicknameRequiredDialog";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { createPerformanceTracker } from "@/lib/performance";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const perf = createPerformanceTracker({
    locale,
    route: "/[locale]/layout",
  });
  const messages = await perf.measure("i18n.messages", getMessages);
  const [showAdminNav, viewerProfile] = await perf.measure(
    "viewer.identity",
    () => Promise.all([isCurrentUserAdmin(), getOptionalCurrentUserProfile()]),
  );
  const [unreadNotificationCount, incomingFriendRequests] = viewerProfile
    ? await perf.measure("nav.badges", () =>
        Promise.all([
          getUnreadNotificationCount(viewerProfile.id),
          getPendingIncomingFriendRequests(viewerProfile.id),
        ]),
      )
    : [0, []];
  perf.finish({
    hasViewer: Boolean(viewerProfile),
    showAdminNav,
  });
  const content = (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen pb-24 md:pb-0">
        <AppHeader
          locale={locale}
          showNotificationNav={Boolean(viewerProfile)}
          showAdminNav={showAdminNav}
          viewerFriendCode={viewerProfile?.friendCode ?? null}
          viewerNickname={viewerProfile?.nickname ?? null}
          incomingFriendRequests={incomingFriendRequests}
          unreadNotificationCount={unreadNotificationCount}
        />
        {viewerProfile && viewerProfile.nickname.trim().length === 0 ? (
          <NicknameRequiredDialog locale={locale} />
        ) : null}
        {children}
        <MobileNav locale={locale} />
      </div>
    </NextIntlClientProvider>
  );

  return hasClerkKeys() ? <ClerkProvider>{content}</ClerkProvider> : content;
}
