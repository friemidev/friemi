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
  const touchStartXRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const visibleComments = comments.slice(0, 6);
  const hasMultipleImages = imageUrls.length > 1;

  useEffect(() => {
    if (!hasMultipleImages || hasUserInteracted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % imageUrls.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [hasMultipleImages, hasUserInteracted, imageUrls.length]);

  function stopAutoSlide() {
    setHasUserInteracted(true);
  }

  function goToImage(nextIndex: number) {
    if (!hasMultipleImages) return;
    stopAutoSlide();
    setActiveIndex((nextIndex + imageUrls.length) % imageUrls.length);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;

    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < 32) return;
    goToImage(activeIndex + (deltaX < 0 ? 1 : -1));
  }

  return (
    <div className="rounded-[1.75rem] bg-[#fffefa] p-2 shadow-[0_18px_42px_rgba(54,47,35,0.12)] ring-1 ring-[#e7e0d5]">
      <div className="relative overflow-hidden rounded-[1.35rem] bg-[#f6f1ea]">
        {imageUrls.length ? (
          <div
            className="flex transition-transform duration-500 ease-out"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") goToImage(activeIndex - 1);
              if (event.key === "ArrowRight") goToImage(activeIndex + 1);
            }}
            onTouchEnd={handleTouchEnd}
            onTouchStart={(event) => {
              touchStartXRef.current = event.touches[0].clientX;
            }}
            tabIndex={0}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {imageUrls.map((imageUrl, index) => (
              <div
                className="relative flex aspect-[4/5] w-full shrink-0 items-center justify-center bg-[#f6f1ea]"
                key={`${imageUrl}-${index}`}
              >
                <img alt="星球精彩瞬间" className="max-h-full max-w-full object-contain" src={imageUrl} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,#e9d6bb,#b78964)] text-6xl">
            🪐
          </div>
        )}

        {hasMultipleImages ? (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-[#245f43] shadow-sm backdrop-blur-sm">
            {activeIndex + 1}/{imageUrls.length}
          </div>
        ) : null}

        {hasMultipleImages ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {imageUrls.map((imageUrl, index) => (
              <span
                className={`h-1.5 rounded-full shadow-sm transition-all ${activeIndex === index ? "w-5 bg-[#1f6a4a]" : "w-1.5 bg-white/80"}`}
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

      <div className="mt-3 flex items-center justify-between gap-3 px-2 pb-1">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-[#1f211e]">{content || "精彩瞬间"}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#768078]">
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
            className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[#eadfd4] bg-white px-3 text-sm font-black shadow-sm ${isLiked ? "text-[#ba4439]" : "text-[#1f211e]"}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likeCount || null}
          </button>
        </form>
      </div>
    </div>
  );
}
