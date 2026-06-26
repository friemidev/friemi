"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { getActivityDateLabel } from "@/features/activities/utils/activityDisplay";
import { getCategoryLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type HomeActivityCarouselProps = {
  activities: ActivityCardViewModel[];
  locale: string;
  labels: {
    ariaLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    next: string;
    previous: string;
    viewActivity: string;
  };
};

const autoplayIntervalMs = 5600;
const manualPauseMs = 10000;

function getActivityHref(activity: ActivityCardViewModel, locale: string) {
  if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, `/activities/${activity.id}`);
}

function getLocationLabel(activity: ActivityCardViewModel) {
  if (activity.address.includes(activity.city)) {
    return activity.address;
  }

  return `${activity.city} · ${activity.address}`;
}

export function HomeActivityCarousel({
  activities,
  labels,
  locale,
}: HomeActivityCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasMultipleActivities = activities.length > 1;

  const updateActiveIndex = useCallback((nextIndex: number) => {
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + manualPauseMs;
  }, []);

  const scrollToIndex = useCallback(
    (index: number, shouldPause = true) => {
      const viewport = viewportRef.current;

      if (!viewport || activities.length === 0) {
        return;
      }

      const nextIndex = (index + activities.length) % activities.length;
      const nextCard = viewport.querySelector<HTMLElement>(
        `[data-carousel-index="${nextIndex}"]`,
      );

      if (!nextCard) {
        return;
      }

      if (shouldPause) {
        pauseAutoplay();
      }

      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }

      viewport.scrollTo({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        left: nextCard.offsetLeft - viewport.offsetLeft,
      });
      updateActiveIndex(nextIndex);
      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        programmaticScrollTimeoutRef.current = null;
      }, prefersReducedMotion ? 0 : 720);
    },
    [activities.length, pauseAutoplay, prefersReducedMotion, updateActiveIndex],
  );

  useEffect(() => {
    if (!hasMultipleActivities || prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) {
        return;
      }

      scrollToIndex(activeIndex + 1, false);
    }, autoplayIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeIndex,
    hasMultipleActivities,
    prefersReducedMotion,
    scrollToIndex,
  ]);

  const markManualInteraction = () => {
    pauseAutoplay();

    if (programmaticScrollTimeoutRef.current) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = null;
    }
  };

  const updateActiveCard = () => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const cards = Array.from(
      viewport.querySelectorAll<HTMLElement>("[data-carousel-index]"),
    );
    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const closestCard = cards.reduce<HTMLElement | null>((closest, card) => {
      if (!closest) {
        return card;
      }

      const cardCenter =
        card.offsetLeft - viewport.offsetLeft + card.offsetWidth / 2;
      const closestCenter =
        closest.offsetLeft - viewport.offsetLeft + closest.offsetWidth / 2;

      return Math.abs(cardCenter - viewportCenter) <
        Math.abs(closestCenter - viewportCenter)
        ? card
        : closest;
    }, null);
    const closestIndex = Number(closestCard?.dataset.carouselIndex ?? 0);

    if (
      Number.isFinite(closestIndex) &&
      closestIndex !== activeIndexRef.current
    ) {
      updateActiveIndex(closestIndex);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/35 bg-white/70 px-6 py-10 text-center shadow-[0_22px_70px_rgba(64,46,31,0.08)]">
        <p className="font-serif text-2xl text-[#241911]">{labels.emptyTitle}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6258]">
          {labels.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="relative" aria-label={labels.ariaLabel}>
      <div
        ref={viewportRef}
        className="home-activity-carousel -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-10 lg:px-10"
        onMouseEnter={markManualInteraction}
        onPointerDown={markManualInteraction}
        onTouchStart={markManualInteraction}
        onWheel={markManualInteraction}
        onScroll={updateActiveCard}
      >
        {activities.map((activity, index) => (
          <Link
            key={`${activity.type}:${activity.id}`}
            data-carousel-index={index}
            data-active-card={index === activeIndex ? "true" : undefined}
            href={getActivityHref(activity, locale)}
            className={cn(
              "home-carousel-card group relative flex min-h-[19.5rem] shrink-0 basis-[72%] snap-start flex-col overflow-hidden rounded-[1.35rem] border border-white/35 bg-[#fffaf2] shadow-[0_18px_48px_rgba(64,46,31,0.1)] transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c28a62]/40 sm:min-h-[24rem] sm:basis-[46%] sm:rounded-[1.75rem] sm:shadow-[0_22px_70px_rgba(64,46,31,0.11)] lg:basis-[31%]",
              index === activeIndex
                ? "ring-1 ring-[#d8b68d]/70"
                : "ring-1 ring-black/5",
            )}
          >
            <div className="home-carousel-card__media relative aspect-[16/10] overflow-hidden bg-[#e8ddcf] sm:aspect-[5/4]">
              <ActivityCoverImage
                alt={activity.title}
                src={activity.coverImageUrl}
                overlayClassName="bg-gradient-to-t from-black/52 via-black/10 to-transparent"
              />
              <div className="absolute left-3 top-3 rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-semibold text-[#6c513a] shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:text-[11px]">
                {getCategoryLabel(activity.category, locale)}
              </div>
              <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-black/42 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur sm:bottom-4 sm:left-4 sm:px-3 sm:text-[11px]">
                {activity.type === "PUBLIC_EVENT" ? "Activity" : "Team"}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4 sm:p-6">
              <h3 className="line-clamp-2 font-serif text-xl leading-tight text-[#241911] transition group-hover:text-[#7c432f] sm:text-2xl">
                {activity.title}
              </h3>
              <div className="mt-4 grid gap-2.5 text-xs leading-5 text-[#66594f] sm:mt-5 sm:gap-3 sm:text-sm">
                <p className="flex gap-2">
                  <CalendarDays
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a97450] sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  <span>{getActivityDateLabel(activity, locale)}</span>
                </p>
                <p className="flex gap-2">
                  <MapPin
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a97450] sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-2">
                    {getLocationLabel(activity)}
                  </span>
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-xs font-semibold text-[#7c432f] sm:pt-7 sm:text-sm">
                {labels.viewActivity}
                <ArrowRight
                  className="h-3.5 w-3.5 transition group-hover:translate-x-1 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {hasMultipleActivities ? (
        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {activities.map((activity, index) => (
              <span
                key={`${activity.id}:dot`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-7 bg-[#271c13]"
                    : "w-1.5 bg-[#d8c3aa]",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddc5a8] bg-[#fffaf2] text-[#4f3b2b] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c28a62]/40"
              onClick={() => scrollToIndex(activeIndex - 1)}
              aria-label={labels.previous}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddc5a8] bg-[#fffaf2] text-[#4f3b2b] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c28a62]/40"
              onClick={() => scrollToIndex(activeIndex + 1)}
              aria-label={labels.next}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
