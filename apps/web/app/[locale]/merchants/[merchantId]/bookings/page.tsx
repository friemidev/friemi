import { notFound } from "next/navigation";
import { PublicResidencyCalendarPage } from "@/features/merchants/residency/components/PublicResidencyPages";
import { getPublicResidencySlots } from "@/features/merchants/residency/queries";
import { getMerchantProfile } from "@/features/merchants/queries/getMerchantProfile";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MerchantResidencyCalendarRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; merchantId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ locale, merchantId }, { month }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [merchant, viewer] = await Promise.all([
    getMerchantProfile(merchantId),
    getOptionalCurrentUserProfileSnapshot(),
  ]);
  if (!merchant) notFound();
  const slots = await getPublicResidencySlots(merchant.id, viewer?.id);

  return (
    <PublicResidencyCalendarPage
      locale={locale}
      merchant={merchant}
      month={month}
      slots={slots}
    />
  );
}
