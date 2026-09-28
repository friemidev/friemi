"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { togglePlanetMomentLikeAction } from "@/features/planets/actions/planetActions";
import { getPlanetPhotoScatterLayout } from "@/features/planets/utils/planetPhotoScatter";

type PlanetMomentCarouselComment = {
  id: string;
  content: string;
  author: { nickname: string };
};

type PlanetMomentCarouselProps = {
  authorName: string;
  canLike: boolean;
  comments: PlanetMomentCarouselComment[];
  content: string;
  createdAtLabel: string;
  imageUrls: string[];
  videoUrls: string[];
  isLiked: boolean;
  likeCount: number;
  locale: string;
  momentId: string;
  planetId: string;
  planetSlug: string;
};

export function PlanetMomentCarousel({
  authorName,
  canLike,
  comments,
  content,
  createdAtLabel,
  imageUrls,
  videoUrls,
  isLiked,
  likeCount,
  locale,
  momentId,
  planetId,
  planetSlug,
}: PlanetMomentCarouselProps) {
  const copy =
    locale === "fr"
      ? {
          fallback: "Moment marquant",
          imageAlt: "Moment marquant de la planète",
          video: "Vidéo de la planète",
          like: "J'aime",
          closePhoto: "Fermer la photo",
          openPhoto: "Agrandir la photo",
          photos: "photos",
        }
      : locale === "en"
        ? {
            fallback: "Planet moment",
            imageAlt: "Planet moment",
            video: "Planet video",
            like: "Like",
            closePhoto: "Close photo",
            openPhoto: "Expand photo",
            photos: "photos",
          }
        : {
            fallback: "精彩瞬间",
            imageAlt: "星球精彩瞬间",
            video: "星球视频",
            like: "点赞",
            closePhoto: "关闭照片",
            openPhoto: "放大照片",
            photos: "张照片",
          };
  const touchStartXRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState<number | null>(
    null,
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const visibleComments = comments.slice(0, 6);
  const mediaItems = [
    ...imageUrls.map((url) => ({ kind: "image" as const, url })),
    ...videoUrls.map((url) => ({ kind: "video" as const, url })),
  ];
  const hasMultipleMedia = mediaItems.length > 1;
  const usesPhotoStack = imageUrls.length > 1 && videoUrls.length === 0;
  const scatteredPhotos = getPlanetPhotoScatterLayout(imageUrls.length);

  useEffect(() => {
    setActiveIndex(0);
    setExpandedPhotoIndex(null);
    setHasUserInteracted(false);
  }, [momentId]);

  useEffect(() => {
    if (expandedPhotoIndex === null) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedPhotoIndex(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [expandedPhotoIndex]);

  useEffect(() => {
    if (usesPhotoStack || !hasMultipleMedia || hasUserInteracted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % mediaItems.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [hasMultipleMedia, hasUserInteracted, mediaItems.length, usesPhotoStack]);

  function stopAutoSlide() {
    setHasUserInteracted(true);
  }

  function goToMedia(nextIndex: number) {
    if (!hasMultipleMedia) return;
    stopAutoSlide();
    setActiveIndex((nextIndex + mediaItems.length) % mediaItems.length);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;

    const deltaX = event.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) < 32) return;
    goToMedia(activeIndex + (deltaX < 0 ? 1 : -1));
  }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-[1.35rem] bg-[#f6f1ea]">
        {usesPhotoStack ? (
          <div className="relative aspect-[2/3] overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#fffdf9_0%,#f6f1ea_68%,#ede5da_100%)]">
            {imageUrls.map((url, index) => {
              const layout = scatteredPhotos[index];
              const isExpanded = expandedPhotoIndex === index;
              const isHidden =
                expandedPhotoIndex !== null && expandedPhotoIndex !== index;

              return (
                <button
                  aria-label={`${isExpanded ? copy.closePhoto : copy.openPhoto} ${index + 1}`}
                  aria-pressed={isExpanded}
                  className="absolute overflow-hidden rounded-[1rem] border border-white/90 bg-white shadow-[0_16px_38px_rgba(28,53,42,0.2)] transition-[left,top,width,height,transform,opacity,filter,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156240] focus-visible:ring-offset-2 motion-reduce:transition-none"
                  key={`${url}-${index}`}
                  onClick={() =>
                    setExpandedPhotoIndex(isExpanded ? null : index)
                  }
                  style={
                    isExpanded
                      ? {
                          aspectRatio: "auto",
                          height: "100%",
                          left: "0%",
                          opacity: 1,
                          top: "0%",
                          transform: "translateY(0) rotate(0deg)",
                          transformOrigin: "50% 92%",
                          width: "100%",
                          zIndex: 30,
                        }
                      : {
                          aspectRatio: "4 / 5",
                          left: `${layout.leftPercent}%`,
                          opacity: isHidden ? 0 : 1,
                          pointerEvents: isHidden ? "none" : "auto",
                          top: `${layout.topPercent}%`,
                          transform: `rotate(${layout.rotationDegrees}deg)`,
                          transformOrigin: "50% 50%",
                          width: `${layout.widthPercent}%`,
                          zIndex: index + 1,
                        }
                  }
                  type="button"
                >
                  <img
                    alt={`${copy.imageAlt} ${index + 1}`}
                    className="h-full w-full bg-[#f6f1ea] object-contain"
                    src={url}
                  />
                </button>
              );
            })}

            <div className="absolute right-3 top-3 z-40 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#245f43] shadow-sm backdrop-blur-sm">
              {expandedPhotoIndex === null
                ? `${imageUrls.length}${locale === "zh-CN" ? "" : " "}${copy.photos}`
                : `${expandedPhotoIndex + 1}/${imageUrls.length}`}
            </div>

            {expandedPhotoIndex !== null ? (
              <button
                aria-label={copy.closePhoto}
                className="absolute left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition active:scale-95"
                onClick={() => setExpandedPhotoIndex(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : mediaItems.length ? (
          <div
            className="flex transition-transform duration-500 ease-out"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") goToMedia(activeIndex - 1);
              if (event.key === "ArrowRight") goToMedia(activeIndex + 1);
            }}
            onTouchEnd={handleTouchEnd}
            onTouchStart={(event) => {
              touchStartXRef.current = event.touches[0].clientX;
            }}
            tabIndex={0}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {mediaItems.map((media, index) => (
              <div
                className="relative flex aspect-[4/5] w-full shrink-0 items-center justify-center bg-[#f6f1ea]"
                key={`${media.url}-${index}`}
              >
                {media.kind === "image" ? (
                  <img
                    alt={copy.imageAlt}
                    className="max-h-full max-w-full object-contain"
                    src={media.url}
                  />
                ) : (
                  <video
                    aria-label={copy.video}
                    className="h-full w-full object-contain"
                    controls
                    playsInline
                    preload="metadata"
                    src={media.url}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,#e9d6bb,#b78964)] text-6xl">
            🪐
          </div>
        )}

        {hasMultipleMedia && !usesPhotoStack ? (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#245f43] shadow-sm backdrop-blur-sm">
            {activeIndex + 1}/{mediaItems.length}
          </div>
        ) : null}

        {hasMultipleMedia && !usesPhotoStack ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {mediaItems.map((media, index) => (
              <span
                className={`h-1.5 rounded-full shadow-sm transition-all ${activeIndex === index ? "w-5 bg-[#1f6a4a]" : "w-1.5 bg-white/80"}`}
                key={`${media.url}-dot-${index}`}
              />
            ))}
          </div>
        ) : null}

        {visibleComments.length ? (
          <div className="pointer-events-none absolute inset-x-2 top-5 z-40 h-32 overflow-hidden rounded-t-[1.35rem]">
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

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#1f211e]">
            {content || copy.fallback}
          </p>
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
            aria-label={copy.like}
            className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[#eadfd4] bg-white px-3 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-45 ${isLiked ? "text-[#ba4439]" : "text-[#1f211e]"}`}
            disabled={!canLike}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likeCount || null}
          </button>
        </form>
      </div>
    </div>
  );
}
