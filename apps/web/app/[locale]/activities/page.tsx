import { SlidersHorizontal } from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { mockActivities } from "@/features/activities/queries/mockActivities";

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ActivitiesPage({ params }: ActivitiesPageProps) {
  const { locale } = await params;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">活动发现</h1>
        <p className="mt-2 text-sm text-zinc-600">MVP 阶段先展示手动运营和用户发起的活动。</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">筛选区域占位</p>
          <p className="text-sm text-zinc-500">后续接入关键词、分类、日期和人数筛选。</p>
        </div>
        <Button variant="secondary" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          筛选
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {mockActivities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} locale={locale} />
        ))}
      </div>
    </PageContainer>
  );
}
