import { notFound, redirect } from "next/navigation";
import { getMerchantBookingSpace } from "@/features/merchants/bookings/queries";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";

export const dynamic = "force-dynamic";

export default async function MerchantBookingRoute({
  params,
}: {
  params: Promise<{ locale: string; merchantId: string }>;
}) {
  const { locale, merchantId } = await params;
  const space = await getMerchantBookingSpace(merchantId);
  if (!space) notFound();
  redirect(getLocalizedActivityDetailPath(locale, space.settings.activityId));
}
