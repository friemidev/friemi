import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Search } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantUpgradeClient } from "@/components/admin/MerchantManagementClient";
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import {
  getAdminMerchant,
  searchAdminMerchantCandidates,
} from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type UpgradeMerchantPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    merchantId?: string | string[];
    q?: string | string[];
  }>;
};

export default async function UpgradeMerchantPage({
  params,
  searchParams,
}: UpgradeMerchantPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/upgrade");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const queryParams = await searchParams;
  const rawQuery = queryParams.q;
  const query =
    (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rawMerchantId = queryParams.merchantId;
  const merchantId = (
    Array.isArray(rawMerchantId) ? rawMerchantId[0] : rawMerchantId
  )?.trim();
  const [merchant, candidates] = await Promise.all([
    merchantId ? getAdminMerchant(merchantId) : Promise.resolve(null),
    query ? searchAdminMerchantCandidates(query) : Promise.resolve([]),
  ]);
  if (merchantId && !merchant) notFound();
  const copy = getMerchantAdminCopy(locale);

  return (
    <PageContainer mobileSafeTop className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(
          locale,
          merchant ? `/admin/merchants/${merchant.id}` : "/admin/merchants",
        )}
        backLabel={merchant ? copy.common.backToDetail : copy.common.backToList}
        title={merchant ? copy.bind.pageTitle : copy.bind.createPageTitle}
      />

      {merchant?.owner ? (
        <section className="space-y-3 rounded-2xl bg-fog p-5 text-sm text-ink">
          <p>{copy.bind.alreadyBound(merchant.owner.nickname)}</p>
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-forest underline-offset-4 hover:underline"
            href={withLocale(locale, `/admin/merchants/${merchant.id}`)}
          >
            {copy.common.backToDetail}
          </Link>
        </section>
      ) : (
        <>
          <p className="max-w-2xl text-sm leading-6 text-ink/70">
            {merchant ? copy.bind.intro(merchant.name) : copy.bind.createIntro}
          </p>

          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            {merchant ? (
              <input name="merchantId" type="hidden" value={merchant.id} />
            ) : null}
            <label className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
              />
              <input
                aria-label={copy.bind.searchAria}
                autoComplete="off"
                className="h-12 w-full rounded-xl border-0 bg-fog pl-11 pr-3 text-base text-ink outline-none transition placeholder:text-ink/60 focus:ring-2 focus:ring-forest"
                defaultValue={query}
                maxLength={80}
                name="q"
                placeholder={copy.bind.searchPlaceholder}
                required
              />
            </label>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-semibold text-paper transition hover:bg-forest/90"
              type="submit"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {copy.bind.searchButton}
            </button>
          </form>

          <MerchantUpgradeClient
            candidates={candidates}
            locale={locale}
            merchant={merchant}
            query={query}
          />
        </>
      )}
    </PageContainer>
  );
}
