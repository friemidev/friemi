"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityCardMasonryGrid } from "@/features/activities/components/ActivityCardMasonryGrid";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { getActivityCardMasonryWeight } from "@/features/activities/utils/activityCardMasonry";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import {
  getDetailSourceTargetSelector,
  isDetailSourceReturnPage,
  readDetailSourceContext,
  type DetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import { getCopy } from "@/lib/copy";
import { SearchHighlightedText } from "./SearchHighlightedText";

type SearchActivityResultsFeedProps = {
  initialActivities: ActivityCardViewModel[];
  initialHasMore: boolean;
  initialNextOffset: number;
  initialRelatedActivities?: ActivityCardViewModel[];
  initialRelatedHasMore?: boolean;
  initialRelatedNextOffset?: number;
  initialRelatedTotalCount?: number;
  includeEnded?: boolean;
  isAuthenticated: boolean;
  locale: string;
  query: string;
  totalCount: number;
  viewerProfileId?: string | null;
};

type SearchActivityResultsResponse = {
  ok: boolean;
  items?: ActivityCardViewModel[];
  hasMore?: boolean;
  mode?: "strict" | "related";
  nextOffset?: number;
  totalCount?: number;
};

function getSearchActivityKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity)
    ? `event-${activity.publicEventId ?? activity.id}`
    : `crew-${activity.id}`;
}

function getSearchActivityPublicEventKey(activity: ActivityCardViewModel) {
  return activity.publicEventId
    ? `event-${activity.publicEventId}`
    : isPublicEventCard(activity)
      ? `event-${activity.id}`
      : null;
}

function filterUniqueSearchActivities(
  current: ActivityCardViewModel[],
  nextItems: ActivityCardViewModel[],
) {
  const currentKeys = new Set(current.map(getSearchActivityKey));
  const currentPublicEventKeys = new Set(
    current.map(getSearchActivityPublicEventKey).filter(Boolean),
  );

  return nextItems.filter((activity) => {
    const key = getSearchActivityKey(activity);
    const publicEventKey = getSearchActivityPublicEventKey(activity);

    if (
      currentKeys.has(key) ||
      (publicEventKey && currentPublicEventKeys.has(publicEventKey))
    ) {
      return false;
    }

    currentKeys.add(key);

    if (publicEventKey) {
      currentPublicEventKeys.add(publicEventKey);
    }

    return true;
  });
}

const searchActivityResultsPageSize = 18;

export function SearchActivityResultsFeed({
  initialActivities,
  initialHasMore,
  initialNextOffset,
  initialRelatedActivities = [],
  initialRelatedHasMore = false,
  initialRelatedNextOffset = initialRelatedActivities.length,
  initialRelatedTotalCount = initialRelatedActivities.length,
  includeEnded = false,
  isAuthenticated,
  locale,
  query,
  totalCount,
  viewerProfileId,
}: SearchActivityResultsFeedProps) {
  const t = getCopy(locale).globalSearch;
  const [activities, setActivities] = useState(initialActivities);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [relatedActivities, setRelatedActivities] = useState(
    initialRelatedActivities,
  );
  const [relatedHasMore, setRelatedHasMore] = useState(initialRelatedHasMore);
  const [relatedNextOffset, setRelatedNextOffset] = useState(
    initialRelatedNextOffset,
  );
  const [relatedTotalCount, setRelatedTotalCount] = useState(
    initialRelatedTotalCount,
  );
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedLoadFailed, setRelatedLoadFailed] = useState(false);
  const [relatedStarted, setRelatedStarted] = useState(
    initialRelatedActivities.length > 0,
  );
  const [restoreContext, setRestoreContext] =
    useState<DetailSourceContext | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActivities(initialActivities);
    setHasMore(initialHasMore);
    setNextOffset(initialNextOffset);
    setLoading(false);
    setLoadFailed(false);
    setRelatedActivities(initialRelatedActivities);
    setRelatedHasMore(initialRelatedHasMore);
    setRelatedNextOffset(initialRelatedNextOffset);
    setRelatedTotalCount(initialRelatedTotalCount);
    setRelatedLoading(false);
    setRelatedLoadFailed(false);
    setRelatedStarted(initialRelatedActivities.length > 0);
  }, [
    initialActivities,
    initialHasMore,
    initialNextOffset,
    initialRelatedActivities,
    initialRelatedHasMore,
    initialRelatedNextOffset,
    initialRelatedTotalCount,
    includeEnded,
    query,
  ]);

  const mobileColumnWeights = useMemo(
    () =>
      activities.map((activity) =>
        getActivityCardMasonryWeight(activity, {
          showPrimaryAction: !isPublicEventCard(activity),
        }),
      ),
    [activities],
  );
  const relatedMobileColumnWeights = useMemo(
    () =>
      relatedActivities.map((activity) =>
        getActivityCardMasonryWeight(activity, {
          showPrimaryAction: !isPublicEventCard(activity),
        }),
      ),
    [relatedActivities],
  );
  const loadMore = useCallback(async (forceRetry = false) => {
    if (loading || !hasMore || (!forceRetry && loadFailed)) {
      return;
    }

    setLoading(true);
    setLoadFailed(false);

    try {
      const params = new URLSearchParams({
        limit: String(searchActivityResultsPageSize),
        mode: "strict",
        offset: String(nextOffset),
        q: query,
      });
      if (includeEnded) {
        params.set("ended", "1");
      }
      const response = await fetch(`/api/search/activity-results?${params}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("LOAD_MORE_SEARCH_RESULTS_FAILED");
      }

      const json = (await response.json()) as SearchActivityResultsResponse;
      const nextItems = json.items ?? [];

      setActivities((current) => {
        const uniqueNextItems = filterUniqueSearchActivities(
          [...current, ...relatedActivities],
          nextItems,
        );

        return [...current, ...uniqueNextItems];
      });
      setHasMore(Boolean(json.hasMore));
      setNextOffset(json.nextOffset ?? nextOffset + nextItems.length);
    } catch (error) {
      console.error("Failed to load more search activity results", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [
    hasMore,
    includeEnded,
    loadFailed,
    loading,
    nextOffset,
    query,
    relatedActivities,
  ]);

  const loadRelatedMore = useCallback(async (forceRetry = false) => {
    if (
      relatedLoading ||
      (!forceRetry && !relatedHasMore && relatedStarted) ||
      (!forceRetry && relatedLoadFailed)
    ) {
      return;
    }

    setRelatedLoading(true);
    setRelatedLoadFailed(false);
    setRelatedStarted(true);

    try {
      const params = new URLSearchParams({
        limit: String(searchActivityResultsPageSize),
        mode: "related",
        offset: String(relatedNextOffset),
        q: query,
      });
      if (includeEnded) {
        params.set("ended", "1");
      }
      const response = await fetch(`/api/search/activity-results?${params}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("LOAD_RELATED_SEARCH_RESULTS_FAILED");
      }

      const json = (await response.json()) as SearchActivityResultsResponse;
      const nextItems = json.items ?? [];

      setRelatedActivities((current) => {
        const uniqueNextItems = filterUniqueSearchActivities(
          [...activities, ...current],
          nextItems,
        );

        return [...current, ...uniqueNextItems];
      });
      setRelatedHasMore(Boolean(json.hasMore));
      setRelatedNextOffset(
        json.nextOffset ?? relatedNextOffset + nextItems.length,
      );
      setRelatedTotalCount(json.totalCount ?? relatedTotalCount);
    } catch (error) {
      console.error("Failed to load related search activity results", error);
      setRelatedLoadFailed(true);
    } finally {
      setRelatedLoading(false);
    }
  }, [
    activities,
    includeEnded,
    query,
    relatedHasMore,
    relatedLoadFailed,
    relatedLoading,
    relatedNextOffset,
    relatedStarted,
    relatedTotalCount,
  ]);

  useEffect(() => {
    const context = readDetailSourceContext();

    if (context && isDetailSourceReturnPage(context, "search")) {
      setRestoreContext(context);
    }
  }, []);

  useEffect(() => {
    if (!restoreContext) {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      getDetailSourceTargetSelector(restoreContext.targetKey),
    );

    if (target) {
      target.scrollIntoView({
        block: "center",
        behavior: "auto",
      });
      target.classList.add("detail-source-restored");
      window.setTimeout(() => {
        target.classList.remove("detail-source-restored");
      }, 1600);
      setRestoreContext(null);
      return;
    }

    if (hasMore && !loading && !loadFailed) {
      void loadMore();
      return;
    }

    if (relatedHasMore && !relatedLoading && !relatedLoadFailed) {
      void loadRelatedMore();
    }
  }, [
    activities,
    hasMore,
    loadFailed,
    loading,
    loadMore,
    loadRelatedMore,
    relatedActivities,
    relatedHasMore,
    relatedLoadFailed,
    relatedLoading,
    restoreContext,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (
      !sentinel ||
      loadFailed ||
      relatedLoadFailed ||
      (!hasMore && relatedStarted && !relatedHasMore)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          if (hasMore) {
            void loadMore();
          } else {
            void loadRelatedMore();
          }
        }
      },
      {
        rootMargin: "360px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    hasMore,
    loadFailed,
    loadMore,
    loadRelatedMore,
    relatedHasMore,
    relatedLoadFailed,
    relatedStarted,
  ]);

  return (
    <div className="space-y-5">
      {activities.length > 0 ? (
        <ActivityCardMasonryGrid
          gridClassName="lg:grid-cols-3 xl:grid-cols-3"
          mobileColumnWeights={mobileColumnWeights}
        >
          {activities.map((activity) => (
            <ActivityCard
              key={getSearchActivityKey(activity)}
              activity={activity}
              isAuthenticated={isAuthenticated}
              isOwnActivity={
                Boolean(viewerProfileId) && activity.organizerId === viewerProfileId
              }
              locale={locale}
              showFavoriteButton
              showPrimaryAction={!isPublicEventCard(activity)}
              sourceSurface="global_search"
              detailSourceKey="search"
              titleContent={
                <SearchHighlightedText text={activity.title} query={query} />
              }
            />
          ))}
        </ActivityCardMasonryGrid>
      ) : null}

      {relatedStarted && relatedActivities.length > 0 ? (
        <section className="space-y-3 border-t border-sand pt-4">
          <div className="rounded-xl border border-dashed border-sand-strong bg-white/55 px-3 py-3">
            <h3 className="text-base font-semibold tracking-normal text-ink">
              {t.relatedMainResultsTitle}
            </h3>
            <p className="text-xs leading-5 text-zinc-500">
              {t.relatedMainResultsDescription}
            </p>
          </div>
          <ActivityCardMasonryGrid
            gridClassName="lg:grid-cols-3 xl:grid-cols-3"
            mobileColumnWeights={relatedMobileColumnWeights}
          >
            {relatedActivities.map((activity) => (
              <ActivityCard
                key={getSearchActivityKey(activity)}
                activity={activity}
                isAuthenticated={isAuthenticated}
                isOwnActivity={
                  Boolean(viewerProfileId) &&
                  activity.organizerId === viewerProfileId
                }
                locale={locale}
                showFavoriteButton
                showPrimaryAction={!isPublicEventCard(activity)}
                sourceSurface="global_search"
                detailSourceKey="search"
                titleContent={
                  <SearchHighlightedText text={activity.title} query={query} />
                }
              />
            ))}
          </ActivityCardMasonryGrid>
        </section>
      ) : null}

      <div
        ref={sentinelRef}
        className="flex min-h-10 items-center justify-center"
        aria-live="polite"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-xs font-medium text-zinc-500 ring-1 ring-sand">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {t.loadingMoreMainResults}
          </span>
        ) : loadFailed ? (
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#bfd6b7] bg-white/88 px-4 text-sm font-semibold text-[#315b48] shadow-sm transition hover:bg-white"
            onClick={() => {
              setLoadFailed(false);
              void loadMore(true);
            }}
          >
            {t.retryLoadMoreMainResults}
          </button>
        ) : relatedLoading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-xs font-medium text-zinc-500 ring-1 ring-sand">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {t.loadingRelatedMainResults}
          </span>
        ) : relatedLoadFailed ? (
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#bfd6b7] bg-white/88 px-4 text-sm font-semibold text-[#315b48] shadow-sm transition hover:bg-white"
            onClick={() => {
              setRelatedLoadFailed(false);
              void loadRelatedMore(true);
            }}
          >
            {t.retryLoadMoreMainResults}
          </button>
        ) : hasMore ? (
          <span className="text-xs text-zinc-400">
            {t.scrollForMoreMainResults(activities.length, totalCount)}
          </span>
        ) : relatedHasMore ? (
          <span className="text-xs text-zinc-400">
            {t.scrollForMoreRelatedMainResults(
              relatedActivities.length,
              relatedTotalCount,
            )}
          </span>
        ) : relatedStarted && relatedActivities.length > 0 ? (
          <span className="text-xs text-zinc-400">
            {t.allRelatedMainResultsLoaded(relatedActivities.length)}
          </span>
        ) : activities.length > 0 ? (
          <span className="text-xs text-zinc-400">
            {t.allMainResultsLoaded(activities.length)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
