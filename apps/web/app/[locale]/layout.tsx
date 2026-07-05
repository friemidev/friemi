import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { AppHeader } from "@/components/layout/AppHeader";
import { AndroidAuthReturnRefresh } from "@/features/auth/components/AndroidAuthReturnRefresh";
import { OrientationLockOverlay } from "@/components/layout/OrientationLockOverlay";
import { MobileNav } from "@/components/navigation/MobileNav";
import { MobileNavSectionProvider } from "@/components/navigation/MobileNavSectionContext";
import { MobileScrollProgress } from "@/components/navigation/MobileScrollProgress";
import { RouteProgress } from "@/components/navigation/RouteProgress";
import { IdleRoutePrefetcher } from "@/components/navigation/IdleRoutePrefetcher";
import { NotificationBadgeProvider } from "@/features/notifications/components/NotificationBadgeProvider";
import { AndroidAppBridge } from "@/features/mobile/components/AndroidAppBridge";
import { IOSAppBridge } from "@/features/mobile/components/IOSAppBridge";
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
  const clerkEnabled = hasClerkKeys();
  const content = (
    <NextIntlClientProvider messages={messages}>
      <ViewerProfileProvider initialNickname={viewerProfile?.nickname ?? null}>
        <NotificationBadgeProvider
          enabled={Boolean(viewerProfile)}
          initialUnreadNotificationCount={
            viewerState.initialUnreadNotificationCount
          }
        >
          <MobileNavSectionProvider>
            <div className="app-layout-shell min-h-screen pb-24 md:pb-0">
              <RouteProgress />
              <AndroidAppBridge locale={locale} />
              <IOSAppBridge />
              <AppHeader
                locale={locale}
                isAuthenticated={Boolean(viewerProfile)}
                showNotificationNav={Boolean(viewerProfile)}
                showAdminNav={viewerState.showAdminNav}
                viewerContactEmail={viewerProfile?.contactEmail ?? null}
                viewerEmail={viewerProfile?.email ?? null}
                viewerFriendCode={viewerProfile?.friendCode ?? null}
                viewerPhone={viewerProfile?.phone ?? null}
                viewerWechatId={viewerProfile?.wechatId ?? null}
                viewerNickname={viewerProfile?.nickname ?? null}
                incomingFriendRequests={[]}
                unreadNotificationCount={
                  viewerState.initialUnreadNotificationCount
                }
              />
              <MobileScrollProgress />
              <IdleRoutePrefetcher
                enabled={Boolean(viewerProfile)}
                idleDelayMs={4000}
                locale={locale}
              />
              {clerkEnabled ? (
                <AndroidAuthReturnRefresh
                  locale={locale}
                  serverAuthenticated={Boolean(viewerProfile)}
                />
              ) : null}
              {viewerProfile ? <NicknameRequiredGate locale={locale} /> : null}
              {children}
              <MobileNav locale={locale} />
            </div>
            <OrientationLockOverlay locale={locale} />
          </MobileNavSectionProvider>
        </NotificationBadgeProvider>
      </ViewerProfileProvider>
    </NextIntlClientProvider>
  );

  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
