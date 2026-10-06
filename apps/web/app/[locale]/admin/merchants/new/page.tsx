import { Store } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
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
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-32 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel="返回店铺列表"
        description="填写店铺的基本资料。创建后可继续分配优惠券样式。"
        eyebrow="店铺管理"
        icon={Store}
        title="添加合作店铺"
      />

      <MerchantCreateClient locale={locale} />
    </PageContainer>
  );
}
