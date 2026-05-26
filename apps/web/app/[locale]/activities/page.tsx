import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getActivities } from "@/features/activities/queries/getActivities";

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({ params }: ActivitiesPageProps) {
  const { locale } = await params;
  const activitiesResult = await getActivities()
    .then((activities) => ({ activities, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load activities", error);
      return { activities: [], error };
    });

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">活动发现</h1>
        <p className="mt-2 text-sm text-zinc-600">MVP 阶段先展示手动运营和用户发起的活动。</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">当前展示范围</p>
          <p className="text-sm text-zinc-500">只展示公开、招募中或已成团的活动，并按开始时间从近到远排序。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>招募中</Badge>
          <Badge>已成团</Badge>
        </div>
      </section>

      {activitiesResult.error ? (
        <EmptyState title="活动加载失败" description="请稍后刷新重试，或检查数据库连接是否可用。" />
      ) : activitiesResult.activities.length === 0 ? (
        <EmptyState title="暂无活动" description="当前没有招募中或已成团的活动，创建新活动后会显示在这里。" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activitiesResult.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} locale={locale} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
