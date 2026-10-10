import { notFound } from "next/navigation";
import { OwnerBookingDashboard } from "@/features/merchants/bookings/components/OwnerBookingPages";
import { getOwnerBookingDashboard } from "@/features/merchants/bookings/queries";
import { getOwnerResidencySlots } from "@/features/merchants/residency/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function OwnerResidencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/bookings",
  );
  const [overview, legacy] = await Promise.all([
    getOwnerBookingDashboard(profile.id),
    getOwnerResidencySlots(profile.id),
  ]);
  if (!overview.merchant) notFound();
  return (
    <OwnerBookingDashboard
      locale={locale}
      merchant={overview.merchant}
      settings={overview.settings}
      bookings={overview.bookings}
      hasLegacy={legacy.slots.length > 0}
    />
  );
}
