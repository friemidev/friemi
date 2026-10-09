import { ViewerBookingsPage } from "@/features/merchants/bookings/components/ViewerBookingsPage";
import { getViewerBookings } from "@/features/merchants/bookings/queries";
import { getViewerBookings as getLegacyBookings } from "@/features/merchants/residency/viewerQueries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/bookings");
  const [bookings, legacy] = await Promise.all([
    getViewerBookings(profile.id),
    getLegacyBookings(profile.id),
  ]);
  return (
    <ViewerBookingsPage
      locale={locale}
      bookings={bookings}
      legacy={[...legacy.upcoming, ...legacy.history]}
    />
  );
}
