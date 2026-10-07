import Link from "next/link";
import { PackageOpen, Plus, Store, UserRoundPlus } from "lucide-react";
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
  const rawTicket = Array.isArray(query.ticket)
    ? query.ticket[0]
    : query.ticket;
  const merchants = view === "merchants" ? await getAdminMerchants() : [];

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-5 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/account/settings")}
        backLabel="返回账户设置"
        title="店铺与物品"
      />

      <nav
        aria-label="管理内容"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-fog p-1"
      >
        <Link
          aria-current={view === "merchants" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
            view === "merchants"
              ? "bg-paper text-forest"
              : "text-ink/70 hover:bg-paper/70 hover:text-ink"
          }`}
          href={withLocale(locale, "/admin/merchants")}
        >
          <Store aria-hidden="true" className="h-4 w-4" />
          店铺
        </Link>
        <Link
          aria-current={view === "items" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
            view === "items"
              ? "bg-paper text-forest"
              : "text-ink/70 hover:bg-paper/70 hover:text-ink"
          }`}
          href={withLocale(locale, "/admin/merchants?view=items")}
        >
          <PackageOpen aria-hidden="true" className="h-4 w-4" />
          物品分发
        </Link>
      </nav>

      {view === "items" ? (
        <AdminInventoryPanel locale={locale} selectedDefinitionId={rawTicket} />
      ) : (
        <>
          <section
            aria-labelledby="merchant-section-title"
            className="flex flex-col gap-5 rounded-2xl bg-ink px-5 py-5 text-paper sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-paper/65">
                店铺管理
              </p>
              <h2 className="text-xl font-bold" id="merchant-section-title">
                合作店铺{" "}
                <span className="ml-1 text-paper/65 tabular-nums">
                  {merchants.length}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper/10 px-3 text-sm font-semibold text-paper transition hover:bg-paper/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper sm:px-4"
                href={withLocale(locale, "/admin/merchants/upgrade")}
              >
                <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
                升级账号
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper px-3 text-sm font-semibold text-ink transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper sm:px-4"
                href={withLocale(locale, "/admin/merchants/new")}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                添加店铺
              </Link>
            </div>
          </section>
          <MerchantManagementClient
            initialMerchants={merchants}
            locale={locale}
          />
        </>
      )}
    </PageContainer>
  );
}
