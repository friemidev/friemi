import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Route,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { activityCategories, activityTypes } from "@chill-club/shared";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityStatusBadge } from "@/features/activities/components/ActivityStatusBadge";
import { JoinActivityForm } from "@/features/activities/components/JoinActivityForm";
import { getActivityById } from "@/features/activities/queries/getActivityById";
import { getActivityViewerParticipation } from "@/features/activities/queries/getActivityViewerParticipation";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityItineraryItems,
  getActivityLocationLabel,
  getActivityOrganizerInitial,
  getActivityParticipantPercent,
  getActivityPriceLabel,
  getActivitySeatLabel,
} from "@/features/activities/utils/activityDisplay";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type ActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: ActivityDetailPageProps) {
  const { locale, activityId } = await params;
  const [activity, viewerProfile] = await Promise.all([
    getActivityById(activityId),
    getOptionalCurrentUserProfile(),
  ]);

  if (!activity) {
    notFound();
  }

  const viewerParticipation = await getActivityViewerParticipation(
    activity.id,
    viewerProfile?.id,
  );
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const itineraryItems = getActivityItineraryItems(activity);
  const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);
  const isClosed =
    !["RECRUITING", "CONFIRMED"].includes(activity.status) ||
    activityEndBoundary <= new Date();
  const isFull = activity.participantCount >= activity.capacity;
  const isOrganizer = viewerProfile?.id === activity.organizer.id;

  return (
    <PageContainer className="space-y-6">
      <div className="flex min-h-52 items-end rounded-lg bg-moss p-4 sm:p-5 md:min-h-72">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">
              {activityCategories[activity.category]}
            </span>
            <ActivityStatusBadge status={displayStatus} />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl md:text-5xl">
            {activity.title}
          </h1>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="space-y-6 lg:order-1">
          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">活动说明</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {activity.description}
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">活动行程</h2>
            </div>
            {itineraryItems.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {itineraryItems.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex gap-3 text-sm leading-6 text-zinc-600"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                发起人暂未填写详细行程。
              </p>
            )}
          </div>

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">发起人</h2>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                {getActivityOrganizerInitial(activity)}
              </div>
              <div>
                <p className="font-medium text-ink">
                  {activity.organizer.nickname}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.organizer.bio ?? "这个发起人还没有填写简介。"}
                </p>
              </div>
            </div>
          </div>
        </article>

        <aside className="order-first h-fit rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:order-2">
          <div className="space-y-4 text-sm text-zinc-700">
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-zinc-500">
                <ClipboardList className="h-4 w-4 shrink-0" />
                活动类型
              </span>
              <span className="text-right font-medium text-ink">
                {activityTypes[activity.type]}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {getActivityDateLabel(activity, locale)}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {getActivityLocationLabel(activity)}
              </span>
            </p>
            {activity.destination ? (
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">目的地</span>
                <span className="min-w-0 text-right font-medium text-ink">
                  {activity.destination}
                </span>
              </p>
            ) : null}
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-zinc-500">
                <UsersRound className="h-4 w-4 shrink-0" />
                已报名
              </span>
              <span className="text-right font-medium text-ink">
                {activity.participantCount}/{activity.capacity} 人
              </span>
            </p>
            {activity.minParticipants ? (
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">最少成团</span>
                <span className="text-right font-medium text-ink">
                  {activity.minParticipants} 人
                </span>
              </p>
            ) : null}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">名额状态</span>
                <span className="font-medium text-ink">
                  {getActivitySeatLabel(activity)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-moss"
                  style={{ width: `${participantPercent}%` }}
                />
              </div>
            </div>
            <p className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-zinc-500">
                <WalletCards className="h-4 w-4 shrink-0" />
                费用
              </span>
              <span className="min-w-0 text-right font-medium text-ink">
                {getActivityPriceLabel(activity)}
              </span>
            </p>
            <p className="flex items-start gap-2 text-zinc-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {activity.requiresApproval
                  ? "报名后需发起人确认"
                  : "报名后自动确认"}
              </span>
            </p>
          </div>
          <div className="mt-6">
            <JoinActivityForm
              activityId={activity.id}
              locale={locale}
              requiresApproval={activity.requiresApproval}
              isFull={isFull}
              isClosed={isClosed}
              isOrganizer={isOrganizer}
              isAuthenticated={Boolean(viewerProfile)}
              viewerParticipationStatus={viewerParticipation?.status ?? null}
            />
          </div>
        </aside>
      </section>
    </PageContainer>
  );
}
