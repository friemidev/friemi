import Link from "next/link";
import { Plus, Store, UserRoundPlus } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
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
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-6xl space-y-6 pb-32 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        actions={
          <>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C9DBCB] bg-white px-4 text-sm font-semibold text-[#24583E] transition hover:bg-[#F3F8F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
              href={withLocale(locale, "/admin/merchants/upgrade")}
            >
              <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
              升级店铺
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176B49] px-4 text-sm font-semibold text-white transition hover:bg-[#105838] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
              href={withLocale(locale, "/admin/merchants/new")}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              添加店铺
            </Link>
          </>
        }
        backHref={withLocale(locale, "/admin")}
        backLabel="返回运营后台"
        description="查看合作店铺，进入单店管理优惠券样式与店家资料。"
        eyebrow="店铺与优惠券"
        icon={Store}
        title="合作店铺"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#DFE8DA] bg-white px-5 py-4 shadow-[0_10px_26px_-24px_rgba(29,65,44,0.55)]">
          <p className="text-xs font-semibold text-[#617063]">全部店铺</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#1D3024]">
            {merchants.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DFE8DA] bg-white px-5 py-4 shadow-[0_10px_26px_-24px_rgba(29,65,44,0.55)]">
          <p className="text-xs font-semibold text-[#617063]">已绑定店家账号</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#176B49]">
            {boundMerchantCount}
          </p>
        </div>
      </div>

      <MerchantManagementClient initialMerchants={merchants} locale={locale} />
    </PageContainer>
  );
}
