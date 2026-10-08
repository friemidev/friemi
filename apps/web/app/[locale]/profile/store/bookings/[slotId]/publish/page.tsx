import { notFound, redirect } from "next/navigation";
import { OwnerResidencyPublish } from "@/features/merchants/residency/components/OwnerResidencyPages";
import { getOwnerResidencySlot } from "@/features/merchants/residency/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function OwnerResidencyPublishPage({
  params,
}: {
  params: Promise<{ locale: string; slotId: string }>;
}) {
  const { locale, slotId } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/bookings/${slotId}/publish`,
  );
  const slot = await getOwnerResidencySlot(slotId, profile.id);
  if (!slot) notFound();
  if (slot.status === "PUBLISHED")
    redirect(withLocale(locale, `/profile/store/bookings/${slotId}`));
  if (slot.status !== "CONFIRMED") notFound();
  return <OwnerResidencyPublish locale={locale} slot={slot} />;
}
