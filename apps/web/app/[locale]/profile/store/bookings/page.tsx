import { notFound } from "next/navigation";
import { OwnerResidencyOverview } from "@/features/merchants/residency/components/OwnerResidencyPages";
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
  const overview = await getOwnerResidencySlots(profile.id);
  if (!overview.merchant) notFound();
  return (
    <OwnerResidencyOverview
      locale={locale}
      merchantName={overview.merchant.name}
      slots={overview.slots}
    />
  );
}
