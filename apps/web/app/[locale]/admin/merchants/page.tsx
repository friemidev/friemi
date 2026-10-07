import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageOpen, Plus, Store, UserRoundPlus } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantManagementClient } from "@/components/admin/MerchantManagementClient";
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminInventoryPanel } from "@/features/inventory/components/AdminInventoryPanel";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchants } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminMerchantsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
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
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const query = await searchParams;
  const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view = rawView === "items" ? "items" : "merchants";
  const rawTicket = Array.isArray(query.ticket)
    ? query.ticket[0]
    : query.ticket;
  if (view === "items" && rawTicket) {
    redirect(
      withLocale(locale, `/admin/items/${encodeURIComponent(rawTicket)}`),
    );
  }
  const rawSearch = Array.isArray(query.q) ? query.q[0] : query.q;
  const itemSearch = rawSearch?.trim().slice(0, 120) ?? "";
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const itemPage = Math.max(
    1,
    Math.min(100_000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const merchants = view === "merchants" ? await getAdminMerchants() : [];
  const merchantCopy = getMerchantAdminCopy(locale);

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-5 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/account/settings")}
        backLabel={merchantCopy.common.backToSettings}
        title={merchantCopy.list.pageTitle}
      />

      <nav
        aria-label={merchantCopy.common.managementAria}
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
          {merchantCopy.list.merchantsTab}
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
          {getAdminItemCopy(locale).merchant.itemsLabel}
        </Link>
      </nav>

      {view === "items" ? (
        <AdminInventoryPanel
          locale={locale}
          page={itemPage}
          query={itemSearch}
        />
      ) : (
        <>
          <section
            aria-labelledby="merchant-section-title"
            className="flex flex-col gap-5 rounded-2xl bg-ink px-5 py-5 text-paper sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-bold" id="merchant-section-title">
                {merchantCopy.list.count(merchants.length)}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-paper/75">
                {merchantCopy.list.intro}
              </p>
            </div>
            <div className="grid gap-2 sm:flex">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper/10 px-3 text-sm font-semibold text-paper transition hover:bg-paper/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper sm:px-4"
                href={withLocale(locale, "/admin/merchants/upgrade")}
              >
                <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
                {merchantCopy.list.createWithAccount}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper px-3 text-sm font-semibold text-ink transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper sm:px-4"
                href={withLocale(locale, "/admin/merchants/new")}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {merchantCopy.list.createWithoutAccount}
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
