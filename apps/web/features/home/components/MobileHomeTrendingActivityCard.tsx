import { Clock3, MapPin, UsersRound } from "lucide-react";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { MobileActivityDetailSheetLink } from "@/features/activities/components/MobileActivityDetailSheetLink";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityCategoryPreviewSrc,
  getActivityListCoverSrc,
} from "@/features/activities/utils/activityCategoryVisuals";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { getActivityDateLabel } from "@/features/activities/utils/activityDisplay";
import { ActivityFavoriteButton } from "@/features/favorites/components/ActivityFavoriteButton";
import { getBookingCopy } from "@/features/merchants/bookings/copy";
import { getActivityCoverThumbnailUrl } from "@/lib/activity-cover-display";

export function MobileHomeTrendingActivityCard({
  activity,
  href,
  locale,
  participantsLabel,
  viewerProfileId,
}: {
  activity: ActivityCardViewModel;
  href: string;
  locale: string;
  participantsLabel: string;
  viewerProfileId: string | null;
}) {
  const isPublicEvent = isPublicEventCard(activity);
  const participantLabel =
    activity.capacity > 0
      ? `${activity.participantCount}/${activity.capacity}`
      : `${activity.participantCount}`;
  const bookingCopy = getBookingCopy(locale);
  return (
    <article
      className="friemi-interactive-card group relative w-[9.35rem] shrink-0 snap-start overflow-hidden rounded-[0.72rem] bg-white shadow-[0_12px_24px_rgba(23,36,28,0.06)] ring-1 ring-inset ring-[#D7D5C8]"
      data-home-trending-activity={activity.id}
    >
      <MobileActivityDetailSheetLink
        href={href}
        label={activity.title}
        locale={locale}
        retainOnClose={!activity.isPersistent}
        className="block w-full"
      >
        <div className="relative h-[5.15rem] overflow-hidden bg-[#F1F2EC]">
          <ActivityCoverImage
            alt={activity.title}
            fallbackSrc={getActivityCategoryPreviewSrc(activity.category)}
            src={getActivityCoverThumbnailUrl(
              getActivityListCoverSrc(
                activity.coverImageUrl,
                activity.category,
              ),
              320,
            )}
            overlayClassName="bg-gradient-to-t from-black/28 to-transparent"
          />
        </div>
        <div className="min-h-[5.1rem] px-2.5 pb-2.5 pt-2">
          <h3 className="line-clamp-2 text-[12px] font-bold leading-4 text-[#111210]">
            {activity.title}
          </h3>
          <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#096B45]">
            {isPublicEvent ? (
              <MapPin className="h-3 w-3 shrink-0" />
            ) : (
              <UsersRound className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">
              {isPublicEvent
                ? activity.city || activity.address
                : activity.isPersistent
                  ? bookingCopy.publicCount(activity.participantCount)
                  : `${participantLabel} ${participantsLabel}`}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#111210]/62">
            <Clock3 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {getActivityDateLabel(activity, locale)}
            </span>
          </p>
          {activity.isPersistent && activity.viewerPendingBookingPartySize ? (
            <p className="mt-1.5 rounded-md bg-sand/40 px-1.5 py-1 text-[10px] font-bold leading-tight text-forest">
              {bookingCopy.pendingCard(activity.viewerPendingBookingPartySize)}
            </p>
          ) : null}
        </div>
      </MobileActivityDetailSheetLink>
      {!isPublicEvent ? (
        <div className="absolute right-1 top-1 z-20">
          <ActivityFavoriteButton
            activityId={activity.id}
            compact
            favoriteCount={activity.favoriteCount}
            isAuthenticated={Boolean(viewerProfileId)}
            isFavorited={Boolean(activity.isFavorited)}
            viewerProfileId={viewerProfileId}
            locale={locale}
            redirectPath="/mobile-home"
            sourceSurface="home_recent"
          />
        </div>
      ) : null}
    </article>
  );
}
