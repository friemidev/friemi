import { notFound, redirect } from "next/navigation";
import { MerchantCouponsView } from "@/components/admin/MerchantCouponsView";
import { getAdminCouponTemplatesForMerchant } from "@/features/coupons/adminCoupons";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchant } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function MerchantCouponsPage({
  params,
}: {
  params: Promise<{ locale: string; merchantId: string }>;
}) {
  const { locale, merchantId } = await params;
  await requireAdminPageAccess(
    locale,
    `/admin/merchants/${merchantId}/coupons`,
  );
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const merchant = await getAdminMerchant(merchantId);
  if (!merchant) notFound();
  const coupons = await getAdminCouponTemplatesForMerchant(merchantId);
  return (
    <MerchantCouponsView
      coupons={coupons}
      locale={locale}
      merchant={merchant}
    />
  );
}
