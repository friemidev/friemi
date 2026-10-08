import { notFound } from "next/navigation";
import { OwnerResidencyDetail } from "@/features/merchants/residency/components/OwnerResidencyPages";
import { getOwnerResidencySlot } from "@/features/merchants/residency/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function OwnerResidencyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slotId: string }>;
}) {
  const { locale, slotId } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/bookings/${slotId}`,
  );
  const slot = await getOwnerResidencySlot(slotId, profile.id);
  if (!slot) notFound();
  return <OwnerResidencyDetail locale={locale} slot={slot} />;
}
