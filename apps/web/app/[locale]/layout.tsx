import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { DesktopAppNavigation } from "@/components/navigation/DesktopAppNavigation";
import { AndroidAuthReturnRefresh } from "@/features/auth/components/AndroidAuthReturnRefresh";
import { AuthSessionRefresh } from "@/features/auth/components/AuthSessionRefresh";
import { MobileNav } from "@/components/navigation/MobileNav";
import { MobileNavSectionProvider } from "@/components/navigation/MobileNavSectionContext";
import { MobileScrollProgress } from "@/components/navigation/MobileScrollProgress";
import { IdleRoutePrefetcher } from "@/components/navigation/IdleRoutePrefetcher";
import { RouteProgress } from "@/components/navigation/RouteProgress";
import { RouteMotion } from "@/components/navigation/RouteMotion";
import { RouteTransitionMetrics } from "@/components/navigation/RouteTransitionMetrics";
import { FriemiAlertProvider } from "@/components/ui/FriemiAlertProvider";
import { ModalViewportGuard } from "@/components/ui/ModalViewportGuard";
import { NotificationBadgeProvider } from "@/features/notifications/components/NotificationBadgeProvider";
import { resolveUnreadBadgeFreshnessGuardEnabled } from "@/features/notifications/unreadBadgePolling";
import { AndroidAppBridge } from "@/features/mobile/components/AndroidAppBridge";
import { IOSAppBridge } from "@/features/mobile/components/IOSAppBridge";
import { MobileViewportProfile } from "@/features/mobile/components/MobileViewportProfile";
import { ActiveGameToolFloatingWindow } from "@/features/game-tools/components/ActiveGameToolFloatingWindow";
import { ActiveGameToolFloatingWindowLoader } from "@/features/game-tools/components/ActiveGameToolFloatingWindowLoader";
import { NicknameRequiredGate } from "@/features/profile/components/NicknameRequiredGate";
import { PresenceHeartbeat } from "@/features/profile/components/PresenceHeartbeat";
import { ViewerProfileProvider } from "@/features/profile/components/ViewerProfileProvider";
import { getOptionalLayoutViewerState } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { hasClerkKeys } from "@/lib/clerk";
import { isFriemiNativeAppUserAgent } from "@/lib/mobile-root-lobby-entry";
import { createPerformanceTracker } from "@/lib/performance";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalSiteUrl()),
  title: brand.name,
  description: brand.description,
  icons: {
    apple: brand.appleIconPath,
    icon: [
      {
        rel: "icon",
        sizes: "192x192",
        type: "image/png",
        url: brand.faviconPath,
      },
      {
        rel: "icon",
        sizes: "512x512",
        type: "image/png",
        url: brand.manifestIcon512Path,
      },
    ],
  },
  openGraph: {
    description: brand.description,
    images: [
      {
        alt: brand.name,
        height: 630,
        type: "image/png",
        url: brand.shareImagePath,
        width: 1200,
      },
    ],
    siteName: brand.name,
    title: brand.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description: brand.description,
    images: [brand.shareImagePath],
    title: brand.name,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

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

  const requestHeaders = await headers();
  const isNativeAppRequest = isFriemiNativeAppUserAgent(
    requestHeaders.get("user-agent"),
  );
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
  const unreadBadgeFreshnessGuardEnabled =
    resolveUnreadBadgeFreshnessGuardEnabled({
      configuredValue: process.env.UNREAD_BADGE_FRESHNESS_GUARD_ENABLED,
      vercelEnvironment: process.env.VERCEL_ENV,
    });
  const content = (
    <NextIntlClientProvider messages={messages}>
      <ViewerProfileProvider initialNickname={viewerProfile?.nickname ?? null}>
        <NotificationBadgeProvider
          enabled={Boolean(viewerProfile)}
          freshnessGuardEnabled={unreadBadgeFreshnessGuardEnabled}
          initialUnreadNotificationCount={
            viewerState.initialUnreadNotificationCount
          }
          key={viewerProfile?.id ?? "anonymous"}
          viewerProfileId={viewerProfile?.id ?? null}
        >
          <MobileNavSectionProvider>
            <div
              className={`app-layout-shell min-h-screen pb-24 md:pb-0${
                isNativeAppRequest ? " friemi-native-app-shell" : ""
              }`}
            >
              <RouteProgress />
              <RouteMotion />
              <RouteTransitionMetrics locale={locale} />
              <ModalViewportGuard />
              <AndroidAppBridge
                locale={locale}
                viewerProfileId={viewerProfile?.id ?? null}
              />
              {clerkEnabled ? <IOSAppBridge /> : null}
              <DesktopAppNavigation
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
                unreadNotificationCount={
                  viewerState.initialUnreadNotificationCount
                }
              />
              <MobileScrollProgress />
              {clerkEnabled ? (
                <>
                  <AndroidAuthReturnRefresh
                    locale={locale}
                    serverAuthenticated={Boolean(viewerProfile)}
                  />
                  <AuthSessionRefresh
                    serverAuthenticated={Boolean(viewerProfile)}
                  />
                </>
              ) : null}
              {viewerProfile ? <NicknameRequiredGate locale={locale} /> : null}
              {viewerProfile ? <PresenceHeartbeat /> : null}
              {children}
              {viewerProfile ? (
                <Suspense fallback={null} key={viewerProfile.id}>
                  <ActiveGameToolFloatingWindowLoader
                    locale={locale}
                    profileId={viewerProfile.id}
                  />
                </Suspense>
              ) : (
                <ActiveGameToolFloatingWindow
                  activeRoom={null}
                  locale={locale}
                />
              )}
              <IdleRoutePrefetcher locale={locale} />
              <MobileNav
                key={`${locale}:${viewerProfile?.id ?? "anonymous"}`}
                locale={locale}
              />
              <FriemiAlertProvider locale={locale} />
            </div>
          </MobileNavSectionProvider>
        </NotificationBadgeProvider>
      </ViewerProfileProvider>
    </NextIntlClientProvider>
  );

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <MobileViewportProfile />
        {clerkEnabled ? (
          <ClerkProvider touchSession>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
