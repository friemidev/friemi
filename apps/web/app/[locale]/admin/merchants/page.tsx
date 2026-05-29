import { MerchantManagementClient } from "@/components/admin/MerchantManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchants } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

type AdminMerchantsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminMerchantsPage({
  params,
}: AdminMerchantsPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale);
  const merchants = await getAdminMerchants();

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:max-w-7xl">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          运营工具 · 合作商家 · {locale}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          合作商家
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-zinc-600">
          维护可关联到活动的商家、场地或机构资料。创建后，活动运营页只负责选择已有资料进行关联。
        </p>
      </div>
      <MerchantManagementClient locale={locale} initialMerchants={merchants} />
    </PageContainer>
  );
}
