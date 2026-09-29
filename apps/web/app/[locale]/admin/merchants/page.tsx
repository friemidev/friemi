import Link from "next/link";
import { Plus, Store, UserRoundPlus } from "lucide-react";
import { MerchantManagementClient } from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchants } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminMerchantsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminMerchantsPage({
  params,
}: AdminMerchantsPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants");
  const merchants = await getAdminMerchants();
  const boundMerchantCount = merchants.filter(
    (merchant) => merchant.owner,
  ).length;

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:0.9rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-6xl space-y-6 pb-32 max-md:px-5 max-md:py-0 md:pb-10">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[#176B49]">
              运营工具 · 店铺管理
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-ink md:text-4xl">
              合作店铺
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              先查看店铺列表，再进入单店页面处理优惠券和其他分配。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              href={withLocale(locale, "/admin/merchants/upgrade")}
            >
              <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
              升级店铺
            </Link>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              href={withLocale(locale, "/admin/merchants/new")}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              添加店铺
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 border-y border-black/10 py-4 sm:w-fit sm:min-w-96">
          <div className="border-r border-black/10 pr-6">
            <p className="text-2xl font-bold text-ink">{merchants.length}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">全部店铺</p>
          </div>
          <div className="pl-6">
            <p className="flex items-center gap-2 text-2xl font-bold text-ink">
              <Store aria-hidden="true" className="h-5 w-5 text-[#176B49]" />
              {boundMerchantCount}
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">
              已绑定账号
            </p>
          </div>
        </div>
      </header>

      <MerchantManagementClient initialMerchants={merchants} locale={locale} />
    </PageContainer>
  );
}
