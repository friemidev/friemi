import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  Pencil,
  ShieldAlert,
  Route,
  Store,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityStatusBadge } from "@/features/activities/components/ActivityStatusBadge";
import { CancelActivityForm } from "@/features/activities/components/CancelActivityForm";
import { ActivityCommentsSection } from "@/features/activities/components/ActivityCommentsSection";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { ActivityShareTools } from "@/features/activities/components/ActivityShareTools";
import { JoinActivityForm } from "@/features/activities/components/JoinActivityForm";
import { getActivityById } from "@/features/activities/queries/getActivityById";
import { getActivityComments } from "@/features/activities/queries/getActivityComments";
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
import { FollowButton } from "@/features/follow/components/FollowButton";
import { getFollowCopy } from "@/features/follow/copy";
import { getViewerFollowState } from "@/features/follow/queries/getViewerFollowState";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

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
  const t = getCopy(locale);
  const followLabels = getFollowCopy(locale);
  const [activity, viewerProfile] = await Promise.all([
    getActivityById(activityId),
    getOptionalCurrentUserProfile(),
  ]);

  if (!activity) {
    notFound();
  }

  const [viewerParticipation, isFollowingOrganizer, comments] =
    await Promise.all([
      getActivityViewerParticipation(activity.id, viewerProfile?.id),
      getViewerFollowState(viewerProfile?.id, activity.organizer.id),
      getActivityComments(activity.id),
    ]);
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const itineraryItems = getActivityItineraryItems(activity);
  const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);
  const isEndedByTime = activityEndBoundary <= new Date();
  const isClosed =
    !["RECRUITING", "CONFIRMED"].includes(activity.status) || isEndedByTime;
  const isCancelled = activity.status === "CANCELLED";
  const isFull = activity.participantCount >= activity.capacity;
  const isOrganizer = viewerProfile?.id === activity.organizer.id;
  const canEditActivity = isOrganizer && !isCancelled && !isEndedByTime;
  const activityCategoryLabel = getCategoryLabel(activity.category, locale);
  const activityDateLabel = getActivityDateLabel(activity, locale);
  const activityLocationLabel = getActivityLocationLabel(activity);
  const activityParticipantLabel = `${activity.participantCount}/${activity.capacity} ${t.common.people}`;
  const activityPriceLabel = getActivityPriceLabel(activity, locale);

  return (
    <PageContainer className="space-y-6">
      <div className="relative flex min-h-52 items-end overflow-hidden rounded-lg bg-moss p-4 sm:p-5 md:min-h-72">
        <ActivityCoverImage
          src={activity.coverImageUrl}
          overlayClassName="bg-black/35"
        />
        <div className="relative max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">
              {activityCategoryLabel}
            </span>
            <ActivityStatusBadge status={displayStatus} locale={locale} />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl md:text-5xl">
            {activity.title}
          </h1>
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-6 lg:order-1">
          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t.activityDetail.descriptionTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {activity.description}
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">
                {t.activityDetail.itineraryTitle}
              </h2>
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
                {t.activityDetail.emptyItinerary}
              </p>
            )}
          </div>

          {activity.latitude !== null && activity.longitude !== null ? (
            <ActivityMapPreview
              address={activityLocationLabel}
              latitude={activity.latitude}
              longitude={activity.longitude}
              openLabel={t.activityDetail.openMap}
              title={t.activityDetail.locationMapTitle}
            />
          ) : null}

          {activity.merchant ? (
            <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-semibold text-ink">
                  {t.merchant.detailTitle}
                </h2>
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-md bg-paper/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">
                    {activity.merchant.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {activity.merchant.city}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  href={withLocale(
                    locale,
                    `/merchants/${activity.merchant.slug}`,
                  )}
                >
                  {t.merchant.viewProfile}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">
                {t.activityDetail.organizerTitle}
              </h2>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                {getActivityOrganizerInitial(activity)}
              </div>
              <div>
                <p className="font-medium text-ink">
                  {activity.organizer.nickname}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>
                    {followLabels.followers} {activity.organizer.followerCount}
                  </span>
                  <span>
                    {followLabels.followingCount}{" "}
                    {activity.organizer.followingCount}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.organizer.bio ?? t.activityDetail.emptyOrganizerBio}
                </p>
              </div>
            </div>
            {!isOrganizer ? (
              <div className="mt-4">
                <FollowButton
                  isAuthenticated={Boolean(viewerProfile)}
                  isFollowing={isFollowingOrganizer}
                  locale={locale}
                  redirectPath={`/activities/${activity.id}`}
                  targetUserProfileId={activity.organizer.id}
                />
              </div>
            ) : null}
          </div>

          <ActivityCommentsSection
            activityId={activity.id}
            comments={comments}
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
          />
        </article>

        <aside className="order-first h-fit w-full min-w-0 max-w-full rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:order-2">
          <div className="space-y-4 text-sm text-zinc-700">
            <p className="grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] items-start gap-3">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <ClipboardList className="h-4 w-4 shrink-0" />
                {t.activityDetail.type}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-ink">
                {getTypeLabel(activity.type, locale)}
              </span>
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{activityDateLabel}</span>
              <ActivityCopyButton
                failedLabel={t.activityShare.copyFailed}
                label={t.activityShare.copyTime}
                successLabel={t.activityShare.copied}
                value={activityDateLabel}
              />
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {activityLocationLabel}
              </span>
              <ActivityCopyButton
                failedLabel={t.activityShare.copyFailed}
                label={t.activityShare.copyLocation}
                successLabel={t.activityShare.copied}
                value={activityLocationLabel}
              />
            </p>
            {activity.destination ? (
              <p className="grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] items-start gap-3">
                <span className="min-w-0 text-zinc-500">
                  {t.activityDetail.destination}
                </span>
                <span className="min-w-0 break-words text-right font-medium text-ink">
                  {activity.destination}
                </span>
              </p>
            ) : null}
            <p className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <UsersRound className="h-4 w-4 shrink-0" />
                {t.activityDetail.participants}
              </span>
              <span className="shrink-0 text-right font-medium text-ink">
                {activityParticipantLabel}
              </span>
            </p>
            {activity.minParticipants ? (
              <p className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span className="min-w-0 text-zinc-500">
                  {t.activityDetail.minParticipants}
                </span>
                <span className="shrink-0 text-right font-medium text-ink">
                  {activity.minParticipants} {t.common.people}
                </span>
              </p>
            ) : null}
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span className="min-w-0 text-zinc-500">
                  {t.activityDetail.seatStatus}
                </span>
                <span className="shrink-0 font-medium text-ink">
                  {getActivitySeatLabel(activity, locale)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-moss"
                  style={{ width: `${participantPercent}%` }}
                />
              </div>
            </div>
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <WalletCards className="h-4 w-4 shrink-0" />
                {t.activityDetail.price}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-ink">
                {activityPriceLabel}
              </span>
              <ActivityCopyButton
                failedLabel={t.activityShare.copyFailed}
                label={t.activityShare.copyPrice}
                successLabel={t.activityShare.copied}
                value={activityPriceLabel}
              />
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-zinc-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {activity.requiresApproval
                  ? t.activityDetail.approvalRequired
                  : t.activityDetail.approvalAuto}
              </span>
            </p>
          </div>
          <div className="mt-6">
            {isOrganizer ? (
              <div className="mb-3 grid gap-2 rounded-md border border-zinc-200 bg-white/70 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShieldAlert className="h-4 w-4 text-moss" />
                  {t.activityOwner.title}
                </p>
                {canEditActivity ? (
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                    href={withLocale(locale, `/activities/${activity.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {t.activityDetail.editActivity}
                  </Link>
                ) : null}
                {!isCancelled && !isEndedByTime ? (
                  <p className="text-xs leading-5 text-zinc-500">
                    {t.activityOwner.cancelDescription}
                  </p>
                ) : null}
                <CancelActivityForm
                  activityId={activity.id}
                  disabled={isCancelled || isEndedByTime}
                  locale={locale}
                />
                {isCancelled ? (
                  <p className="text-xs leading-5 text-zinc-500">
                    {t.activityOwner.cancelledHint}
                  </p>
                ) : isEndedByTime ? (
                  <p className="text-xs leading-5 text-zinc-500">
                    {t.activityOwner.endedHint}
                  </p>
                ) : null}
              </div>
            ) : null}
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
          <div className="mt-4">
            <ActivityShareTools
              activityTitle={activity.title}
              categoryLabel={activityCategoryLabel}
              coverImageUrl={activity.coverImageUrl}
              dateLabel={activityDateLabel}
              description={activity.description}
              locationLabel={activityLocationLabel}
              locale={locale}
              priceLabel={activityPriceLabel}
            />
          </div>
        </aside>
      </section>
    </PageContainer>
  );
}
