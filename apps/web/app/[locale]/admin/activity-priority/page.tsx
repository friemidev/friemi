import { ActivityPriorityManagementClient } from "@/components/admin/ActivityPriorityManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminActivityPriorityItems } from "@/features/activities/priority/adminActivityPriority";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminActivityPriorityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminActivityPriorityPage({
  params,
}: AdminActivityPriorityPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/activity-priority");
  const items = await getAdminActivityPriorityItems();

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:max-w-7xl">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          运营工具 · 活动权重 · {locale}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          活动权重总控台
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-zinc-600">
          管理活动列表里的手动提升。整数代表持续天数，每天自动衰减
          1，过期后保留记录但不影响排序。
        </p>
      </div>
      <ActivityPriorityManagementClient initialItems={items} locale={locale} />
    </PageContainer>
  );
}
