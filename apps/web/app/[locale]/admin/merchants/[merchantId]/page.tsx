import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import {
  MerchantCouponManagementClient,
  MerchantSummary,
} from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminCouponTemplatesForMerchant } from "@/features/coupons/adminCoupons";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchant } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type MerchantDetailPageProps = {
  params: Promise<{ locale: string; merchantId: string }>;
};

export default async function MerchantDetailPage({
  params,
}: MerchantDetailPageProps) {
  const { locale, merchantId } = await params;
  await requireAdminPageAccess(locale, `/admin/merchants/${merchantId}`);
  const [merchant, coupons] = await Promise.all([
    getAdminMerchant(merchantId),
    getAdminCouponTemplatesForMerchant(merchantId),
  ]);

  if (!merchant) notFound();

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-6 pb-32 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C9DBCB] bg-white px-4 text-sm font-semibold text-[#24583E] transition hover:bg-[#F3F8F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
            href={withLocale(locale, `/merchants/${merchant.slug}`)}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            公开主页
          </Link>
        }
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel="返回店铺列表"
        description={merchant.description}
        title={merchant.name}
      />

      <MerchantSummary merchant={merchant} />

      <MerchantCouponManagementClient
        initialCoupons={coupons}
        merchant={merchant}
      />
    </PageContainer>
  );
}
