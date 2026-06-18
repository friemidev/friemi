"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import type { AnalyticsSourceSurface } from "@/features/analytics/events";
import { getAnalyticsEntityForActivity } from "@/features/analytics/utils";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";
import { getCategoryLabel, getStatusLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import { isPublicEventCard } from "../utils/activityCardKind";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
  getActivityTimeState,
} from "../utils/activityDisplay";
import { ActivityCoverImage } from "./ActivityCoverImage";

type ActivitySwipeDiscoveryProps = {
  activities: ActivityCardViewModel[];
  className?: string;
  favoriteRedirectPath?: string;
  isAuthenticated?: boolean;
  locale: string;
  sourceSurface?: AnalyticsSourceSurface;
  variant?: "lobby" | "home";
};

type SwipeDirection = "previous" | "next";

type StoredSwipeProgress = {
  deckSignature: string;
  index: number;
  seed: number;
};

const swipeThreshold = 76;
const useSafeLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function getSwipeCopy(locale: string) {
  if (locale === "fr") {
    return {
      eyebrow: "Swipe",
      title: "Swipez",
      previous: "Precedent",
      next: "Suivant",
      detail: "Voir",
      keyboardHint: "Fleches gauche et droite disponibles.",
      swipeHint: "Glissez a gauche pour le suivant, a droite pour revenir.",
      favoriteHint: "Favori",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Swipe",
      title: "Swipe",
      previous: "Previous",
      next: "Next",
      detail: "View",
      keyboardHint: "Left and right arrow keys work too.",
      swipeHint: "Swipe left for next, right for previous.",
      favoriteHint: "Save",
    };
  }

  return {
    eyebrow: "滑动发现",
    title: "滑一滑",
    previous: "上一张",
    next: "下一张",
    detail: "查看",
    keyboardHint: "也可以用键盘左右键切换。",
    swipeHint: "左滑下一张，右滑上一张。",
    favoriteHint: "收藏",
  };
}

function getSwipeActivityKey(activity: ActivityCardViewModel) {
  return `public:${activity.publicEventId ?? activity.id}`;
}

function getSwipeDeckSignature(activities: ActivityCardViewModel[]) {
  return activities.map(getSwipeActivityKey).join("|");
}

function getSwipeStorageKey({
  locale,
  sourceSurface,
  variant,
}: {
  locale: string;
  sourceSurface: AnalyticsSourceSurface;
  variant: NonNullable<ActivitySwipeDiscoveryProps["variant"]>;
}) {
  return `nextfun:activity-swipe:${locale}:${sourceSurface}:${variant}`;
}

function clampStoredIndex(value: unknown, deckLength: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || deckLength <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(value), 0), deckLength - 1);
}

function createRandomSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] || Date.now();
  }

  return Date.now();
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleActivities(
  activities: ActivityCardViewModel[],
  seed: number | null,
) {
  if (seed === null || activities.length <= 1) {
    return activities;
  }

  const random = mulberry32(seed);
  const shuffled = [...activities];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function readStoredSwipeProgress({
  deckLength,
  deckSignature,
  storageKey,
}: {
  deckLength: number;
  deckSignature: string;
  storageKey: string;
}): StoredSwipeProgress | null {
  if (typeof window === "undefined" || deckLength === 0) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredSwipeProgress>;

    if (parsed.deckSignature !== deckSignature) {
      return null;
    }

    return {
      deckSignature,
      index: clampStoredIndex(parsed.index, deckLength),
      seed: typeof parsed.seed === "number" && Number.isFinite(parsed.seed)
        ? parsed.seed
        : createRandomSeed(),
    };
  } catch {
    return null;
  }
}

function writeStoredSwipeProgress({
  deckLength,
  deckSignature,
  index,
  seed,
  storageKey,
}: StoredSwipeProgress & {
  deckLength: number;
  storageKey: string;
}) {
  if (typeof window === "undefined" || deckLength === 0) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        deckSignature,
        index: clampStoredIndex(index, deckLength),
        seed,
      }),
    );
  } catch {
    // Session storage is best-effort; card browsing must keep working.
  }
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);

    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getSwipeActivityHref(activity: ActivityCardViewModel, locale: string) {
  return withLocale(locale, `/public-events/${activity.publicEventId ?? activity.id}`);
}

function prepareSwipeActivities(activities: ActivityCardViewModel[]) {
  const seen = new Set<string>();
  const now = Date.now();

  return activities
    .filter((activity) => {
      const status = getActivityDisplayStatus(activity);
      const startsInFuture = new Date(activity.startAt).getTime() > now;

      return (
        isPublicEventCard(activity) &&
        Boolean(activity.publicEventId) &&
        startsInFuture &&
        status !== "ENDED" &&
        status !== "CANCELLED"
      );
    })
    .filter((activity) => {
      const key = getSwipeActivityKey(activity);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function getVisibleCards(deck: ActivityCardViewModel[], index: number) {
  return deck.slice(index, index + 3);
}

function getNextIndex(
  currentIndex: number,
  direction: SwipeDirection,
  deckLength: number,
) {
  if (deckLength <= 1) {
    return currentIndex;
  }

  if (direction === "next") {
    return Math.min(currentIndex + 1, deckLength - 1);
  }

  return Math.max(currentIndex - 1, 0);
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("a,button,input,textarea,select"));
}

export function ActivitySwipeDiscovery({
  activities,
  className,
  favoriteRedirectPath = "/lobby",
  isAuthenticated = false,
  locale,
  sourceSurface = "activity_list",
  variant = "lobby",
}: ActivitySwipeDiscoveryProps) {
  const copy = getSwipeCopy(locale);
  const baseDeck = useMemo(() => prepareSwipeActivities(activities), [activities]);
  const deckSignature = useMemo(() => getSwipeDeckSignature(baseDeck), [baseDeck]);
  const storageKey = useMemo(
    () => getSwipeStorageKey({ locale, sourceSurface, variant }),
    [locale, sourceSurface, variant],
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const deck = useMemo(
    () => shuffleActivities(baseDeck, shuffleSeed),
    [baseDeck, shuffleSeed],
  );
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef(0);
  const pendingDragX = useRef(0);
  const dragFrame = useRef<number | null>(null);
  const currentActivity = deck[index] ?? null;
  const currentKey = currentActivity ? getSwipeActivityKey(currentActivity) : null;

  useSafeLayoutEffect(() => {
    const storedProgress = readStoredSwipeProgress({
      deckLength: deck.length,
      deckSignature,
      storageKey,
    });

    setIndex(storedProgress?.index ?? 0);
    setShuffleSeed(storedProgress?.seed ?? createRandomSeed());
    setDragX(0);
    setIsDragging(false);
  }, [deck.length, deckSignature, storageKey]);

  useEffect(() => {
    if (shuffleSeed === null) {
      return;
    }

    writeStoredSwipeProgress({
      deckLength: deck.length,
      deckSignature,
      index,
      seed: shuffleSeed,
      storageKey,
    });
  }, [deck.length, deckSignature, index, shuffleSeed, storageKey]);

  useEffect(
    () => () => {
      cancelDragFrame();
    },
    [],
  );

  useEffect(() => {
    if (!currentActivity) {
      return;
    }

    const analyticsEntity = getAnalyticsEntityForActivity(currentActivity);

    trackClientAnalyticsEvent({
      entityId: analyticsEntity.entityId,
      entityType: analyticsEntity.entityType,
      name: "activity_swipe_viewed",
      properties: {
        city: currentActivity.city,
        item_kind: analyticsEntity.itemKind,
        pool_size: deck.length,
        variant,
      },
      sourceSurface,
    });
  }, [currentActivity, currentKey, deck.length, index, sourceSurface, variant]);

  function cancelDragFrame() {
    if (typeof window === "undefined" || dragFrame.current === null) {
      return;
    }

    window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
  }

  function resetDragState() {
    pendingDragX.current = 0;
    cancelDragFrame();
    setDragX(0);
    setIsDragging(false);
  }

  function scheduleDragX(nextDragX: number) {
    pendingDragX.current = nextDragX;

    if (typeof window === "undefined" || dragFrame.current !== null) {
      return;
    }

    dragFrame.current = window.requestAnimationFrame(() => {
      dragFrame.current = null;
      setDragX(pendingDragX.current);
    });
  }

  function navigateCard(direction: SwipeDirection) {
    resetDragState();
    setIndex((current) => getNextIndex(current, direction, deck.length));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    pointerStartX.current = event.clientX;
    pendingDragX.current = 0;
    setDragX(0);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    scheduleDragX(event.clientX - pointerStartX.current);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    const nextDragX = event.clientX - pointerStartX.current;

    if (nextDragX > swipeThreshold) {
      navigateCard("previous");
      return;
    }

    if (nextDragX < -swipeThreshold) {
      navigateCard("next");
      return;
    }

    resetDragState();
  }

  const visibleCards = getVisibleCards(deck, index);
  const canGoPrevious = index > 0;
  const canGoNext = index < deck.length - 1;

  if (deck.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "overflow-visible px-0 py-1",
        variant === "home"
          ? "overflow-hidden rounded-[1.5rem] border border-[#d7c7a9] bg-white/82 p-5 shadow-[0_12px_30px_rgba(94,80,52,0.07)]"
          : null,
        className,
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#fff5e8] text-[#b36f48] shadow-sm ring-1 ring-[#ead7b8]">
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[#a26b42]">
            {copy.eyebrow}
          </p>
          <h2 className="text-[1.35rem] font-semibold leading-[1.05] text-ink">
            {copy.title}
          </h2>
        </div>
      </div>

      <div
        className={cn(
          "relative mx-auto mt-2 h-[19rem] max-w-[22.5rem] touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-coral/55",
          variant === "home" ? "md:mx-0" : null,
        )}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            navigateCard("previous");
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            navigateCard("next");
          }
        }}
        tabIndex={0}
        aria-label={copy.keyboardHint}
        style={{ contain: "layout paint" }}
      >
        <p className="sr-only" aria-live="polite">
          {currentActivity
            ? currentActivity.title
            : copy.title}
        </p>
        {visibleCards
          .map((activity, stackIndex) => {
            const isTopCard = stackIndex === 0;
            const displayStatus = getActivityDisplayStatus(activity);
            const timeState = getActivityTimeState(activity);
            const dateLabel = getActivityDateLabel(activity, locale);
            const locationLabel = getActivityLocationLabel(activity);
            const categoryLabel = getCategoryLabel(activity.category, locale);
            const statusLabel = getStatusLabel(displayStatus, locale);
            const href = getSwipeActivityHref(activity, locale);
            const analyticsEntity = isTopCard
              ? getAnalyticsEntityForActivity(activity)
              : null;
            const dragRotation = prefersReducedMotion ? 0 : dragX / 28;
            const dragOpacity = Math.min(Math.abs(dragX) / swipeThreshold, 1);
            const publicEventId = activity.publicEventId ?? activity.id;
            const style: CSSProperties = isTopCard
              ? {
                  transform: `translate3d(${dragX}px, 0, 0) rotate(${dragRotation}deg)`,
                  transition:
                    isDragging || prefersReducedMotion
                      ? "none"
                      : "transform 180ms ease",
                  willChange: "transform",
                  zIndex: 30,
                }
              : {
                  opacity: 0,
                  transform: "translate3d(0, 0, 0)",
                  zIndex: 30 - stackIndex,
                };

            return (
              <article
                aria-hidden={!isTopCard}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-[1.2rem] bg-white shadow-[0_14px_32px_rgba(91,69,38,0.13)] ring-1 ring-[#dfceb0]/75",
                  isTopCard ? "cursor-grab active:cursor-grabbing" : null,
                  !isTopCard ? "pointer-events-none" : null,
                )}
                key={getSwipeActivityKey(activity)}
                onPointerCancel={() => {
                  setDragX(0);
                  setIsDragging(false);
                }}
                onPointerDown={isTopCard ? handlePointerDown : undefined}
                onPointerMove={isTopCard ? handlePointerMove : undefined}
                onPointerUp={isTopCard ? handlePointerUp : undefined}
                style={style}
              >
                <div className="relative h-32 overflow-hidden bg-[#dcecf1]">
                  <ActivityCoverImage
                    src={isTopCard ? activity.coverImageUrl : null}
                    overlayClassName="bg-gradient-to-t from-black/58 via-black/12 to-transparent"
                  />
                  <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#17120f] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.36)] ring-1 ring-white/70">
                      {categoryLabel}
                    </span>
                    <span className="rounded-full bg-[#fff8ec] px-2.5 py-1 text-[10px] font-semibold text-[#2a211a] shadow-[0_6px_18px_rgba(0,0,0,0.28)] ring-1 ring-black/45">
                      {statusLabel}
                    </span>
                  </div>
                  {isTopCard ? (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-center bg-[#111]/22 text-white"
                        style={{
                          opacity: dragX < 0 && canGoNext ? dragOpacity : 0,
                        }}
                      >
                        <span className="rotate-[-8deg] rounded-full border-2 border-white px-4 py-2 text-base font-bold">
                          {copy.next}
                        </span>
                      </div>
                      <div
                        className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-center bg-[#d88d72]/28 text-white"
                        style={{
                          opacity:
                            dragX > 0 && canGoPrevious ? dragOpacity : 0,
                        }}
                      >
                        <span className="rotate-[8deg] rounded-full border-2 border-white px-4 py-2 text-base font-bold">
                          {copy.previous}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="grid h-[calc(100%-8rem)] grid-rows-[1fr_auto] gap-2 p-3.5">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-[1.12] text-ink">
                      {activity.title}
                    </h3>
                    <div className="mt-2 grid gap-1 text-[13px] leading-5 text-zinc-600">
                      <span className="flex min-w-0 items-start gap-2">
                        <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a7448]" />
                        <span className="line-clamp-1">{dateLabel}</span>
                      </span>
                      <span className="flex min-w-0 items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a7448]" />
                        <span className="line-clamp-1">{locationLabel}</span>
                      </span>
                    </div>
                  </div>

                  {isTopCard && analyticsEntity ? (
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        href={href}
                        onClick={() =>
                          trackClientAnalyticsEvent({
                            entityId: analyticsEntity.entityId,
                            entityType: analyticsEntity.entityType,
                            name: "activity_card_clicked",
                            properties: {
                              city: activity.city,
                              display_status: displayStatus,
                              item_kind: analyticsEntity.itemKind,
                              time_state: timeState,
                              variant,
                            },
                            sourceSurface,
                          })
                        }
                      >
                        {copy.detail}
                      </Link>
                      <PublicEventFavoriteButton
                        className="h-10 w-10 bg-white text-coral ring-[#dfceb0] hover:bg-[#fffaf4]"
                        favoriteCount={activity.favoriteCount}
                        isAuthenticated={isAuthenticated}
                        isFavorited={Boolean(activity.isFavorited)}
                        labelOverrides={{ favorite: copy.favoriteHint }}
                        locale={locale}
                        publicEventId={publicEventId}
                        redirectPath={favoriteRedirectPath}
                        sourceSurface={sourceSurface}
                      />
                    </div>
                  ) : (
                    <div className="h-10" aria-hidden />
                  )}
                </div>
              </article>
            );
          })
          .reverse()}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 px-1 text-[11px] text-zinc-500">
        <ArrowLeft className="h-3 w-3" />
        <span>{copy.swipeHint}</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </section>
  );
}
