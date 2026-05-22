import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Button } from "@chill-club/ui";
import { activityCategories, formatActivityDate } from "@chill-club/shared";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityStatusBadge } from "@/features/activities/components/ActivityStatusBadge";
import { getMockActivity } from "@/features/activities/queries/mockActivities";

type ActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { locale, activityId } = await params;
  const activity = getMockActivity(activityId);

  return (
    <PageContainer className="space-y-6">
      <div className="h-56 rounded-lg bg-moss md:h-72" />

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-zinc-500">{activityCategories[activity.category]}</span>
              <ActivityStatusBadge status={activity.status} />
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-ink">{activity.title}</h1>
            <p className="text-base leading-7 text-zinc-600">{activity.description}</p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white/70 p-5">
            <h2 className="text-lg font-semibold text-ink">活动说明</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              这里是详情页占位。后续会接入真实活动描述、发起人信息、报名状态和参加者列表。
            </p>
          </div>
        </article>

        <aside className="h-fit rounded-lg border border-black/10 bg-white/80 p-5 shadow-sm">
          <div className="space-y-4 text-sm text-zinc-700">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatActivityDate(activity.startAt, locale)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {activity.address}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              {activity.participantCount}/{activity.capacity} 人
            </p>
            <p className="font-medium text-ink">{activity.priceText}</p>
          </div>
          <Button className="mt-6 w-full">我要参加</Button>
          <p className="mt-3 text-center text-xs text-zinc-500">报名逻辑将在下一阶段接入数据库。</p>
        </aside>
      </section>
    </PageContainer>
  );
}
