import { PageContainer } from "@/components/layout/PageContainer";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminState } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const state = await getAdminState();

  return (
    <PageContainer className="space-y-6 pb-24">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Admin / {locale}</p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">活动后台管理</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          在这里可以直接查看、创建、编辑、删除活动，也可以触发爬虫抓取新数据并在导入前预览重复情况。
        </p>
      </div>
      <AdminDashboardClient locale={locale} initialActivities={state.activities} initialOrganizers={state.organizers} />
    </PageContainer>
  );
}

