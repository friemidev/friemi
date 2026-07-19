"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { togglePlanetMomentLikeAction } from "@/features/planets/actions/planetActions";

type PlanetMomentCarouselComment = {
  id: string;
  content: string;
  author: { nickname: string };
};

type PlanetMomentCarouselProps = {
  authorName: string;
  comments: PlanetMomentCarouselComment[];
  content: string;
  createdAtLabel: string;
  imageUrls: string[];
  isLiked: boolean;
  likeCount: number;
  locale: string;
  momentId: string;
  planetId: string;
  planetSlug: string;
};

export function PlanetMomentCarousel({
  authorName,
  comments,
  content,
  createdAtLabel,
  imageUrls,
  isLiked,
  likeCount,
  locale,
  momentId,
  planetId,
  planetSlug,
}: PlanetMomentCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const visibleComments = comments.slice(0, 6);
  const hasMultipleImages = imageUrls.length > 1;

  useEffect(() => {
    if (!hasMultipleImages || hasUserInteracted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const nextIndex = (activeIndex + 1) % imageUrls.length;
      isAutoScrollingRef.current = true;
      scroller.scrollTo({
        behavior: "smooth",
        left: nextIndex * scroller.clientWidth,
      });
      setActiveIndex(nextIndex);
      window.setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 700);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [activeIndex, hasMultipleImages, hasUserInteracted, imageUrls.length]);

  function stopAutoSlide() {
    setHasUserInteracted(true);
  }

  function updateActiveIndex() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (!isAutoScrollingRef.current && hasMultipleImages) {
      setHasUserInteracted(true);
    }
    setActiveIndex(Math.round(scroller.scrollLeft / scroller.clientWidth));
  }

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#ebe5d9] p-2 shadow-[0_18px_42px_rgba(54,47,35,0.14)]">
      {imageUrls.length ? (
        <div
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-[1.35rem] bg-[#f8f6ef] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={stopAutoSlide}
          onScroll={updateActiveIndex}
          onWheel={stopAutoSlide}
          ref={scrollerRef}
          tabIndex={0}
        >
          {imageUrls.map((imageUrl, index) => (
            <div
              className="relative flex aspect-[4/5] w-full shrink-0 snap-center items-center justify-center bg-[#f8f6ef]"
              key={`${imageUrl}-${index}`}
            >
              <img
                alt="星球精彩瞬间"
                className="max-h-full max-w-full object-contain"
                src={imageUrl}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,#e9d6bb,#b78964)] text-6xl">
          🪐
        </div>
      )}

      <div className="absolute inset-x-2 bottom-2 rounded-b-[1.35rem] bg-gradient-to-t from-black/62 via-black/28 to-transparent p-4 pt-16">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 text-white">
            <p className="truncate text-lg font-black">{content || "精彩瞬间"}</p>
            <p className="mt-1 text-xs font-semibold text-white/78">
              {authorName} · {createdAtLabel}
            </p>
          </div>
          <form action={togglePlanetMomentLikeAction} className="shrink-0">
            <input name="locale" type="hidden" value={locale} />
            <input name="planetId" type="hidden" value={planetId} />
            <input name="planetSlug" type="hidden" value={planetSlug} />
            <input name="momentId" type="hidden" value={momentId} />
            <button
              aria-label="点赞"
              className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-white/92 px-3 text-sm font-black ${isLiked ? "text-[#ba4439]" : "text-[#1f211e]"}`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likeCount || null}
            </button>
          </form>
        </div>
      </div>

      {hasMultipleImages ? (
        <div className="absolute right-5 top-5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
          {activeIndex + 1}/{imageUrls.length}
        </div>
      ) : null}

      {hasMultipleImages ? (
        <div className="absolute inset-x-0 bottom-24 flex justify-center gap-1.5">
          {imageUrls.map((imageUrl, index) => (
            <span
              className={`h-1.5 rounded-full transition-all ${activeIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/55"}`}
              key={`${imageUrl}-dot-${index}`}
            />
          ))}
        </div>
      ) : null}

      {visibleComments.length ? (
        <div className="pointer-events-none absolute inset-x-2 top-5 h-32 overflow-hidden rounded-t-[1.35rem]">
          {visibleComments.map((comment, index) => (
            <div
              className="planet-danmaku absolute left-0 max-w-[86%] whitespace-nowrap rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm"
              key={comment.id}
              style={{
                animationDelay: `${index * 1.6}s`,
                animationDuration: `${10 + (index % 3) * 1.5}s`,
                top: `${(index % 4) * 1.85}rem`,
              }}
            >
              {comment.author.nickname}：{comment.content}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
