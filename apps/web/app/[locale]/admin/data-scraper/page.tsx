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

export default async function AdminDataScraperPage({
  params,
}: AdminDataScraperPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale);
  const state = await getAdminState();

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:!max-w-[110rem]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          运营工具 · {locale}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          活动运营
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-zinc-600">
          维护活动库，手动管理活动，并导入公共活动数据。
        </p>
      </div>
      <AdminDashboardClient
        locale={locale}
        initialActivities={state.activities}
        initialMerchants={state.merchants}
        initialOrganizers={state.organizers}
      />
    </PageContainer>
  );
}
