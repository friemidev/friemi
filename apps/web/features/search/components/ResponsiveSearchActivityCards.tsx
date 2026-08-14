"use client";

import { useMemo } from "react";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityCardMasonryGrid } from "@/features/activities/components/ActivityCardMasonryGrid";
import { MobileActivityListRow } from "@/features/activities/components/MobileActivityListRow";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { getActivityCardMasonryWeight } from "@/features/activities/utils/activityCardMasonry";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { SearchHighlightedText } from "./SearchHighlightedText";

type ResponsiveSearchActivityCardsProps = {
  activities: ActivityCardViewModel[];
  isAuthenticated: boolean;
  locale: string;
  query?: string;
  viewerProfileId?: string | null;
};

function getActivityKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity)
    ? `event-${activity.publicEventId ?? activity.id}`
    : `crew-${activity.id}`;
}

export function ResponsiveSearchActivityCards({
  activities,
  isAuthenticated,
  locale,
  query = "",
  viewerProfileId,
}: ResponsiveSearchActivityCardsProps) {
  const mobileColumnWeights = useMemo(
    () =>
      activities.map((activity) =>
        getActivityCardMasonryWeight(activity, {
          showPrimaryAction: !isPublicEventCard(activity),
        }),
      ),
    [activities],
  );

  return (
    <>
      <div className="grid gap-1 sm:hidden">
        {activities.map((activity) => (
          <MobileActivityListRow
            activity={activity}
            key={getActivityKey(activity)}
            locale={locale}
          />
        ))}
      </div>
      <div className="hidden sm:block">
        <ActivityCardMasonryGrid
          gridClassName="lg:grid-cols-3 xl:grid-cols-3"
          mobileColumnWeights={mobileColumnWeights}
        >
          {activities.map((activity) => (
            <ActivityCard
              key={getActivityKey(activity)}
              activity={activity}
              isAuthenticated={isAuthenticated}
              isOwnActivity={
                Boolean(viewerProfileId) &&
                activity.organizerId === viewerProfileId
              }
              locale={locale}
              searchResultStyle
              showFavoriteButton
              showPrimaryAction={!isPublicEventCard(activity)}
              sourceSurface="global_search"
              detailSourceKey="search"
              titleContent={
                query ? (
                  <SearchHighlightedText text={activity.title} query={query} />
                ) : undefined
              }
            />
          ))}
        </ActivityCardMasonryGrid>
      </div>
    </>
  );
}
