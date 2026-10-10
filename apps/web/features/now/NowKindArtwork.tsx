"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getNowKind, type NowKind } from "./now";

const artwork: Partial<Record<NowKind, { motion: string; still: string }>> = {
  COFFEE: {
    motion: "/now/artwork/coffee-motion.webp",
    still: "/now/artwork/coffee-still.webp",
  },
  DRINK: {
    motion: "/now/artwork/drink-motion.webp",
    still: "/now/artwork/drink-still.webp",
  },
  EXHIBITION: {
    motion: "/now/artwork/exhibition-motion.webp",
    still: "/now/artwork/exhibition-still.webp",
  },
  PARK: {
    motion: "/now/artwork/park-motion.webp",
    still: "/now/artwork/park-still.webp",
  },
  WALK: {
    motion: "/now/artwork/walk-motion.webp",
    still: "/now/artwork/walk-still.webp",
  },
};

// Accent colors come from the two NOW palettes; the primary action keeps Friemi green.
const tonePalette = {
  amber: { ring: "#FFC857", wash: "#FFF5E6", ink: "#156240" },
  coral: { ring: "#F09182", wash: "#FFE5E6", ink: "#B5301F" },
  rose: { ring: "#FF6B6B", wash: "#FFE5E6", ink: "#B5301F" },
  green: { ring: "#369758", wash: "#F1F2E3", ink: "#156240" },
  blue: { ring: "#99B7F5", wash: "#DEEBFF", ink: "#156240" },
} as const;

export function getNowTonePalette(tone: string) {
  return tonePalette[tone as keyof typeof tonePalette] ?? tonePalette.green;
}

export function NowKindArtwork({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const visual = artwork[category as NowKind];
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!visual || !nodeRef.current) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () =>
      setAnimate(inView && !document.hidden && !motionPreference.matches);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { rootMargin: "80px" },
    );
    observer.observe(nodeRef.current);
    motionPreference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [visual]);

  return (
    <span
      ref={nodeRef}
      aria-hidden="true"
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
    >
      {visual ? (
        <Image
          alt=""
          className="object-contain"
          fill
          sizes="96px"
          src={animate ? visual.motion : visual.still}
          unoptimized
          draggable={false}
        />
      ) : (
        <span className="leading-none">{getNowKind(category).emoji}</span>
      )}
    </span>
  );
}
