import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
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
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:0.9rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-7 pb-32 max-md:px-5 max-md:py-0 md:pb-10">
      <header className="flex items-start gap-3">
        <Link
          aria-label="返回店铺列表"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-zinc-900 ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={withLocale(locale, "/admin/merchants")}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-[#176B49]">
            店铺管理
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-ink md:text-3xl">
            升级 Friemi 账号
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            找到个人账号后，为该用户开通店家身份和默认店铺。
          </p>
        </div>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <label className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            aria-label="搜索 Friemi 用户"
            autoComplete="off"
            className="h-12 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#176B49]"
            defaultValue={query}
            maxLength={80}
            name="q"
            placeholder="输入昵称、邮箱或 6 位 Friemi 个人号"
            required
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
