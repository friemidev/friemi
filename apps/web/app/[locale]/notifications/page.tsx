import { PageContainer } from "@/components/layout/PageContainer";
import { NotificationCountHydrator } from "@/features/notifications/components/NotificationCountHydrator";
import { NotificationsCenterClient } from "@/features/notifications/components/NotificationsCenterClient";
import { getNotificationCenter } from "@/features/notifications/queries/getNotifications";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";

type NotificationsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/notifications",
  });
  const profile = await perf.measure("viewer.profile", () =>
    ensureCurrentUserProfile(locale, "/notifications"),
  );
  const { notifications, unreadCount } = await perf.measure(
    "notifications.center",
    () => getNotificationCenter(profile.id),
  );

  perf.finish(
    {
      notificationCount: notifications.length,
      unreadCount,
    },
    {
      route: `/${locale}/notifications`,
      routeKey: "notifications",
      sourceSurface: "notification",
      userProfileId: profile.id,
    },
  );

  return (
    <PageContainer className="space-y-5" mobileSafeBottom>
      <NotificationCountHydrator unreadCount={unreadCount} />
      <NotificationsCenterClient
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        locale={locale}
      />
    </PageContainer>
  );
}
