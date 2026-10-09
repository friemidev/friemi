import { notFound } from "next/navigation";
import { BookingRecordPage } from "@/features/merchants/bookings/components/BookingRecordPage";
import { getOwnerBookingRecord } from "@/features/merchants/bookings/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function OwnerBookingRecordRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ sheet?: string }>;
}) {
  const { locale, bookingId } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/bookings/reservations/${bookingId}`,
  );
  const booking = await getOwnerBookingRecord(profile.id, bookingId);
  if (!booking) notFound();
  const embedded = (await searchParams).sheet === "1";
  return (
    <BookingRecordPage
      booking={booking}
      embedded={embedded}
      locale={locale}
      owner
    />
  );
}
