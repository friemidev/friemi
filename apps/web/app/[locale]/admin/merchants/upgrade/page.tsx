import { Search } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantUpgradeClient } from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { searchAdminMerchantCandidates } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type UpgradeMerchantPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function UpgradeMerchantPage({
  params,
  searchParams,
}: UpgradeMerchantPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/upgrade");
  const rawQuery = (await searchParams).q;
  const query =
    (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const candidates = query ? await searchAdminMerchantCandidates(query) : [];

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel="返回店铺列表"
        title="升级店家账号"
      />

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <label className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
          />
          <input
            aria-label="搜索 Friemi 用户"
            autoComplete="off"
            className="h-12 w-full rounded-xl border-0 bg-fog pl-11 pr-3 text-base text-ink outline-none transition placeholder:text-ink/60 focus:ring-2 focus:ring-forest"
            defaultValue={query}
            maxLength={80}
            name="q"
            placeholder="输入昵称、邮箱或 6 位 Friemi 个人号"
            required
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-semibold text-paper transition hover:bg-forest/90"
          type="submit"
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          查找账号
        </button>
      </form>

      <MerchantUpgradeClient
        candidates={candidates}
        locale={locale}
        query={query}
      />
    </PageContainer>
  );
}
