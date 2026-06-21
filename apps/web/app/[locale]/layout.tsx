import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/navigation/MobileNav";
import { MobileScrollProgress } from "@/components/navigation/MobileScrollProgress";
import { RouteProgress } from "@/components/navigation/RouteProgress";
import { IdleRoutePrefetcher } from "@/components/navigation/IdleRoutePrefetcher";
import { NotificationBadgeProvider } from "@/features/notifications/components/NotificationBadgeProvider";
import { NicknameRequiredGate } from "@/features/profile/components/NicknameRequiredGate";
import { ViewerProfileProvider } from "@/features/profile/components/ViewerProfileProvider";
import { getOptionalLayoutViewerState } from "@/lib/auth";
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
  const [messages, viewerState] = await Promise.all([
    perf.measure("i18n.messages", getMessages),
    perf.measure("viewer.identity", getOptionalLayoutViewerState),
  ]);
  const viewerProfile = viewerState.profile;
  perf.finish({
    hasViewer: Boolean(viewerProfile),
    showAdminNav: viewerState.showAdminNav,
  });
  const content = (
    <NextIntlClientProvider messages={messages}>
      <ViewerProfileProvider initialNickname={viewerProfile?.nickname ?? null}>
        <NotificationBadgeProvider
          enabled={Boolean(viewerProfile)}
          initialUnreadNotificationCount={0}
        >
          <div className="min-h-screen pb-24 md:pb-0">
            <RouteProgress />
            <AppHeader
              locale={locale}
              showNotificationNav={Boolean(viewerProfile)}
              showAdminNav={viewerState.showAdminNav}
              viewerFriendCode={viewerProfile?.friendCode ?? null}
              viewerWechatId={viewerProfile?.wechatId ?? null}
              viewerNickname={viewerProfile?.nickname ?? null}
              incomingFriendRequests={[]}
              unreadNotificationCount={0}
            />
            <MobileScrollProgress />
            <IdleRoutePrefetcher
              enabled={Boolean(viewerProfile)}
              idleDelayMs={4000}
              locale={locale}
            />
            {viewerProfile ? <NicknameRequiredGate locale={locale} /> : null}
            {children}
            <MobileNav locale={locale} />
          </div>
        </NotificationBadgeProvider>
      </ViewerProfileProvider>
    </NextIntlClientProvider>
  );

  return hasClerkKeys() ? <ClerkProvider>{content}</ClerkProvider> : content;
}
