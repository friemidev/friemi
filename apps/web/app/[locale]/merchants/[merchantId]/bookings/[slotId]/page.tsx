import { notFound } from "next/navigation";
import { getSignInHref } from "@/lib/auth-redirect";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getMerchantProfile } from "@/features/merchants/queries/getMerchantProfile";
import { PublicResidencyDatePage } from "@/features/merchants/residency/components/PublicResidencyPages";
import { getPublicResidencySlot } from "@/features/merchants/residency/queries";

export const dynamic = "force-dynamic";

export default async function MerchantResidencyDateRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; merchantId: string; slotId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ locale, merchantId, slotId }, { from }] = await Promise.all([
    params,
    searchParams,
  ]);
  const viewer = await getOptionalCurrentUserProfileSnapshot();
  const slot = await getPublicResidencySlot(slotId, viewer?.id);
  if (
    !slot ||
    (slot.merchant.id !== merchantId && slot.merchant.slug !== merchantId)
  ) {
    notFound();
  }
  const merchant = await getMerchantProfile(merchantId);
  const canViewCancelledDate =
    slot.status === "CANCELLED" &&
    (slot.viewerHadSignup || slot.viewerRequested);
  const canViewInactiveBookedDate =
    (slot.status === "CONFIRMED" || slot.status === "PUBLISHED") &&
    slot.viewerHadSignup;
  if (
    (!merchant && !canViewCancelledDate && !canViewInactiveBookedDate) ||
    (merchant && merchant.id !== slot.merchant.id)
  ) {
    notFound();
  }
  const isMerchantOwner = Boolean(
    viewer &&
    (await prisma.merchant.findFirst({
      where: { id: slot.merchant.id, ownerProfileId: viewer.id },
      select: { id: true },
    })),
  );

  const target = withLocale(
    locale,
    `/merchants/${slot.merchant.id}/bookings/${slot.id}`,
  );

  return (
    <PublicResidencyDatePage
      isAuthenticated={Boolean(viewer)}
      isMerchantOwner={isMerchantOwner}
      calendarAvailable={Boolean(merchant)}
      fromProfileBookings={from === "profile-bookings"}
      locale={locale}
      signInHref={getSignInHref(locale, target)}
      slot={slot}
    />
  );
}
