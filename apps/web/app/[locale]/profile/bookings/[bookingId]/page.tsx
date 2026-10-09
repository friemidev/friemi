import { notFound } from "next/navigation";
import { BookingRecordPage } from "@/features/merchants/bookings/components/BookingRecordPage";
import { getViewerBooking } from "@/features/merchants/bookings/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ViewerBookingRecordRoute({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/bookings/${bookingId}`,
  );
  const booking = await getViewerBooking(profile.id, bookingId);
  if (!booking) notFound();
  return <BookingRecordPage booking={booking} locale={locale} />;
}
