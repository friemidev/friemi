"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithHints = Navigator & {
  connection?: NavigatorConnection;
  deviceMemory?: number;
};

type HomeHeroMediaProps = {
  imageSrc: string;
  videoSrc: string;
};

function shouldLoadHeroVideo() {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (mediaQuery.matches) {
    return false;
  }

  const navigatorHints = navigator as NavigatorWithHints;
  const connection = navigatorHints.connection;

  if (connection?.saveData) {
    return false;
  }

  if (
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g"
  ) {
    return false;
  }

  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return false;
  }

  if (navigatorHints.deviceMemory && navigatorHints.deviceMemory < 4) {
    return false;
  }

  return true;
}

export function HomeHeroMedia({ imageSrc, videoSrc }: HomeHeroMediaProps) {
  const [canUseVideo, setCanUseVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setCanUseVideo(shouldLoadHeroVideo());
  }, []);

  return (
    <>
      <Image
        src={imageSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="home-luxury-hero-media absolute inset-0 h-full w-full object-cover"
      />
      {canUseVideo ? (
        <video
          className={`home-luxury-hero-media absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          loop
          muted
          playsInline
          poster={imageSrc}
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          onError={() => {
            setCanUseVideo(false);
            setVideoReady(false);
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}
