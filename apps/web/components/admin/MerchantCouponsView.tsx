import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantCouponManagementClient } from "@/components/admin/MerchantManagementClient";
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import type { AdminCouponTemplate } from "@/features/coupons/adminCoupons";
import type { AdminMerchantListItem } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export function MerchantCouponsView({
  coupons,
  locale,
  merchant,
}: {
  coupons: AdminCouponTemplate[];
  locale: string;
  merchant: AdminMerchantListItem;
}) {
  const copy = getMerchantAdminCopy(locale);

  return (
    <PageContainer mobileSafeTop className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, `/admin/merchants/${merchant.id}`)}
        backLabel={copy.common.backToDetail}
        title={copy.coupons.pageTitle}
      />
      <p className="max-w-2xl text-sm leading-6 text-ink/70">
        {copy.coupons.intro(merchant.name)}
      </p>
      <MerchantCouponManagementClient
        initialCoupons={coupons}
        locale={locale}
        merchant={merchant}
      />
    </PageContainer>
  );
}
