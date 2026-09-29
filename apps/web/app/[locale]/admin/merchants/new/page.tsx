import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MerchantCreateClient } from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type NewMerchantPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewMerchantPage({
  params,
}: NewMerchantPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/new");

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
            添加合作店铺
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            建立独立的店铺资料，创建后再进入店铺管理页进行分配。
          </p>
        </div>
      </header>

      <MerchantCreateClient locale={locale} />
    </PageContainer>
  );
}
