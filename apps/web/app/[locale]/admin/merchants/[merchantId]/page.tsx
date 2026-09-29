import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:0.9rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-7 pb-32 max-md:px-5 max-md:py-0 md:pb-10">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <Link
            aria-label="返回店铺列表"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-zinc-900 ring-1 ring-[#D6D5B2] transition active:scale-95"
            href={withLocale(locale, "/admin/merchants")}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#176B49]">
              单店管理
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h1 className="min-w-0 truncate text-2xl font-bold tracking-normal text-ink md:text-3xl">
                {merchant.name}
              </h1>
              <Link
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                href={withLocale(locale, `/merchants/${merchant.slug}`)}
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                公开主页
              </Link>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              {merchant.description}
            </p>
          </div>
        </div>
        <MerchantSummary merchant={merchant} />
      </header>

      <MerchantCouponManagementClient
        initialCoupons={coupons}
        merchant={merchant}
      />
    </PageContainer>
  );
}
