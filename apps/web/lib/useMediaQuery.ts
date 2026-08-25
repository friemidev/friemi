"use client";

import { useEffect, useState } from "react";

export const MOBILE_VIEWPORT_MEDIA_QUERY = "(max-width: 767px)";
export const DESKTOP_VIEWPORT_MEDIA_QUERY = "(min-width: 768px)";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);

    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [query]);

  return matches;
}
