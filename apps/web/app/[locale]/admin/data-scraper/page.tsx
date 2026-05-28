import { PageContainer } from "@/components/layout/PageContainer";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminState } from "@/lib/admin-scraper";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminDataScraperPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminDataScraperPage({ params }: AdminDataScraperPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale);
  const state = await getAdminState();

  return (
    <PageContainer className="space-y-6 pb-24 !max-w-[110rem]">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Admin / Data Scraper / {locale}</p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">活动后台管理</h1>
        <p className="max-w-4xl text-sm leading-6 text-zinc-600">
          在这里可以直接查看、创建、编辑、删除活动，也可以触发爬虫抓取新数据并在导入前预览重复情况。
        </p>
      </div>
      <AdminDashboardClient locale={locale} initialActivities={state.activities} initialOrganizers={state.organizers} />
    </PageContainer>
  );
}

