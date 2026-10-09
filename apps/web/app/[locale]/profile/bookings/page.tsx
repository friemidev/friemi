import { ViewerBookingsPage } from "@/features/merchants/residency/components/ViewerBookingsPage";
import { getViewerBookings } from "@/features/merchants/residency/viewerQueries";
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
  const bookings = await getViewerBookings(profile.id);
  return <ViewerBookingsPage locale={locale} {...bookings} />;
}
