import { notFound } from "next/navigation";
import { RequesterResidencyDetail } from "@/features/merchants/residency/components/RequesterResidencyDetail";
import {
  getOwnerResidencySlot,
  getRequesterResidencySlot,
} from "@/features/merchants/residency/queries";
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
  const ownerSlot = await getOwnerResidencySlot(slotId, profile.id);
  if (ownerSlot)
    return <RequesterResidencyDetail locale={locale} slot={ownerSlot} />;

  const applicantSlot = await getRequesterResidencySlot(slotId, profile.id);
  if (!applicantSlot) notFound();
  return <RequesterResidencyDetail locale={locale} slot={applicantSlot} />;
}
