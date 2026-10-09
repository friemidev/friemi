import { notFound } from "next/navigation";
import { OwnerBookingSettings } from "@/features/merchants/bookings/components/OwnerBookingPages";
import { getOwnerBookingDashboard } from "@/features/merchants/bookings/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function BookingSettingsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/bookings/settings",
  );
  const data = await getOwnerBookingDashboard(profile.id);
  if (!data.merchant) notFound();
  return (
    <OwnerBookingSettings
      locale={locale}
      merchant={data.merchant}
      settings={data.settings}
    />
  );
}
