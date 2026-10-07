import Link from "next/link";
import { Plus, UserRoundPlus } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantManagementClient } from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminInventoryPanel } from "@/features/inventory/components/AdminInventoryPanel";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchants } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminMerchantsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    ticket?: string | string[];
    view?: string | string[];
  }>;
};

export default async function AdminMerchantsPage({
  params,
  searchParams,
}: AdminMerchantsPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants");
  const query = await searchParams;
  const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view = rawView === "items" ? "items" : "merchants";
  const rawTicket = Array.isArray(query.ticket) ? query.ticket[0] : query.ticket;
  const merchants = view === "merchants" ? await getAdminMerchants() : [];

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-6xl space-y-6 pb-32 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/account/settings")}
        backLabel="返回账户设置"
        title="店铺与物品"
      />

      <nav aria-label="管理内容" className="flex gap-7 border-b border-[#DCE6DA]">
        <Link
          aria-current={view === "merchants" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 pb-2 text-sm font-semibold transition ${
            view === "merchants"
              ? "border-[#176B49] text-[#176B49]"
              : "border-transparent text-[#617063] hover:text-[#176B49]"
          }`}
          href={withLocale(locale, "/admin/merchants")}
        >
          店铺
        </Link>
        <Link
          aria-current={view === "items" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 pb-2 text-sm font-semibold transition ${
            view === "items"
              ? "border-[#176B49] text-[#176B49]"
              : "border-transparent text-[#617063] hover:text-[#176B49]"
          }`}
          href={withLocale(locale, "/admin/merchants?view=items")}
        >
          物品分发
        </Link>
      </nav>

      {view === "items" ? (
        <AdminInventoryPanel locale={locale} selectedDefinitionId={rawTicket} />
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1D3024]">合作店铺</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#24583E] transition hover:bg-[#EDF5EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
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
            </div>
          </div>
          <MerchantManagementClient initialMerchants={merchants} locale={locale} />
        </>
      )}
    </PageContainer>
  );
}
