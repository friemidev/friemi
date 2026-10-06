import { Search, UserRoundPlus } from "lucide-react";
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
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-32 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel="返回店铺列表"
        description="查找 Friemi 用户，开通店家身份和默认店铺。"
        eyebrow="店铺管理"
        icon={UserRoundPlus}
        title="升级 Friemi 账号"
      />

      <form className="flex flex-col gap-3 rounded-2xl border border-[#DFE8DA] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.5)] sm:flex-row sm:p-5" method="get">
        <label className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            aria-label="搜索 Friemi 用户"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-[#D7E2D5] bg-[#FAFCF9] pl-9 pr-3 text-sm text-[#1D3024] outline-none transition placeholder:text-zinc-400 focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15"
            defaultValue={query}
            maxLength={80}
            name="q"
            placeholder="输入昵称、邮箱或 6 位 Friemi 个人号"
            required
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#176B49] px-5 text-sm font-semibold text-white transition hover:bg-[#105838]"
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
