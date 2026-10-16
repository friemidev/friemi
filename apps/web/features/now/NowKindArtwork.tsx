"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getNowKind, isNowKind, type NowKind } from "./now";

const artworkNames: Record<NowKind, string> = {
  COFFEE: "coffee",
  FOOD: "food",
  DRINK: "drink",
  TEA: "tea",
  PARK: "park",
  WALK: "walk",
  SHOP: "shop",
  EXHIBITION: "exhibition",
  MOVIE: "movie",
  SHOW: "show",
  GAME: "game",
  SPORT: "sport",
  CHAT: "chat",
  ADVENTURE: "adventure",
  SOCIAL: "social",
  OTHER: "other",
};

// The backdrop files come from the updated NOW artwork set. Keep the countdown
// ring separate so its progress remains readable over every illustration.
const tonePalette = {
  amber: { ring: "#FFC857", wash: "#FFF9EC", ink: "#156240", backdrop: "yellow" },
  coral: { ring: "#F09182", wash: "#FFF6F7", ink: "#B5301F", backdrop: "pink" },
  rose: { ring: "#FF6B6B", wash: "#FFEEEE", ink: "#B5301F", backdrop: "red" },
  green: { ring: "#369758", wash: "#F2F7F2", ink: "#156240", backdrop: "green" },
  blue: { ring: "#99B7F5", wash: "#FBFDFF", ink: "#156240", backdrop: "blue" },
  purple: { ring: "#A790EA", wash: "#F5F2FD", ink: "#624A8B", backdrop: "purple" },
} as const;

export function getNowTonePalette(tone: string) {
  return tonePalette[tone as keyof typeof tonePalette] ?? tonePalette.green;
}

export function NowKindArtwork({
  category,
  className = "",
  variant = "bubble",
}: {
  category: string;
  className?: string;
  variant?: "bubble" | "icon";
}) {
  const kind = isNowKind(category) ? category : "OTHER";
  const artworkName = artworkNames[kind];
  const backdrop = getNowTonePalette(getNowKind(kind).tone).backdrop;
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!nodeRef.current) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () =>
      setAnimate(inView && !document.hidden && !motionPreference.matches);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { rootMargin: variant === "icon" ? "0px" : "80px" },
    );
    observer.observe(nodeRef.current);
    motionPreference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [variant]);

  return (
    <span
      ref={nodeRef}
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
    >
      {variant === "bubble" ? (
        <Image
          alt=""
          className="object-contain"
          fill
          sizes="96px"
          src={`/now/artwork/ring-${backdrop}.webp`}
          unoptimized
          draggable={false}
        />
      ) : null}
      <Image
        alt=""
        className={variant === "icon" ? "object-contain" : "object-contain p-[5%]"}
        fill
        sizes={variant === "icon" ? "32px" : "96px"}
        src={`/now/artwork/${artworkName}-${animate ? "motion" : "still"}.webp`}
        unoptimized
        draggable={false}
      />
    </span>
  );
}
