import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/navigation/MobileNav";
import { MobileScrollProgress } from "@/components/navigation/MobileScrollProgress";
import { RouteProgress } from "@/components/navigation/RouteProgress";
import { NotificationBadgeProvider } from "@/features/notifications/components/NotificationBadgeProvider";
import { NicknameRequiredDialog } from "@/features/profile/components/NicknameRequiredDialog";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
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
    () =>
      Promise.all([isCurrentUserAdmin(), getOptionalCurrentUserProfileSnapshot()]),
  );
  perf.finish({
    hasViewer: Boolean(viewerProfile),
    showAdminNav,
  });
  const content = (
    <NextIntlClientProvider messages={messages}>
      <NotificationBadgeProvider
        enabled={Boolean(viewerProfile)}
        initialUnreadNotificationCount={0}
      >
        <div className="min-h-screen pb-24 md:pb-0">
          <RouteProgress />
          <AppHeader
            locale={locale}
            showNotificationNav={Boolean(viewerProfile)}
            showAdminNav={showAdminNav}
            viewerFriendCode={viewerProfile?.friendCode ?? null}
            viewerNickname={viewerProfile?.nickname ?? null}
            incomingFriendRequests={[]}
            unreadNotificationCount={0}
          />
          <MobileScrollProgress />
          {viewerProfile && viewerProfile.nickname.trim().length === 0 ? (
            <NicknameRequiredDialog locale={locale} />
          ) : null}
          {children}
          <MobileNav locale={locale} />
        </div>
      </NotificationBadgeProvider>
    </NextIntlClientProvider>
  );

  return hasClerkKeys() ? <ClerkProvider>{content}</ClerkProvider> : content;
}
