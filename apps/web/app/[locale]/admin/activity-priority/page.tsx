import { ArrowLeft } from "lucide-react";
import { ActivityPriorityManagementClient } from "@/components/admin/ActivityPriorityManagementClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityHistoryBackButton } from "@/features/activities/components/ActivityHistoryBackButton";
import { getAdminActivityPriorityItems } from "@/features/activities/priority/adminActivityPriority";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

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
    <PageContainer className="mobile-v23-admin-priority app-mobile-page-shell [--app-mobile-page-top-gap:0.9rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-3 pb-32 max-md:px-5 max-md:py-0 md:space-y-6 md:pb-10">
      <header className="flex items-center gap-3 md:block md:space-y-3">
        <ActivityHistoryBackButton
          ariaLabel="返回"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#111210] ring-1 ring-[#D6D5B2] transition active:scale-95 md:h-10 md:w-10"
          fallbackHref={withLocale(locale, "/account/settings")}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </ActivityHistoryBackButton>
        <div className="min-w-0 flex-1 space-y-1 md:space-y-1.5">
          <h1 className="truncate text-2xl font-black leading-none tracking-normal text-ink md:text-4xl">
            <span className="md:hidden">活动权重</span>
            <span className="hidden md:inline">活动权重总控台</span>
          </h1>
          <p className="max-w-2xl text-xs font-semibold leading-5 text-zinc-600 md:text-sm md:leading-6">
            手动提升排序，过期自动失效。
          </p>
        </div>
      </header>
      <ActivityPriorityManagementClient initialItems={items} locale={locale} />
    </PageContainer>
  );
}
