import { PageContainer } from "@/components/layout/PageContainer";
import { TopNewsManagementClient } from "@/components/admin/TopNewsManagementClient";
import { getAdminTopNewsItems } from "@/features/home/adminTopNews";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminTopNewsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminTopNewsPage({
  params,
}: AdminTopNewsPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/top-news");
  const items = await getAdminTopNewsItems();

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:max-w-7xl">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          运营工具 · Top News · {locale}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          Top News 管理
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-zinc-600">
          控制移动首页 Top News
          的展示内容、排序和启用状态。这里保存后，首页会优先使用后台配置。
        </p>
      </div>
      <TopNewsManagementClient initialItems={items} />
    </PageContainer>
  );
}
