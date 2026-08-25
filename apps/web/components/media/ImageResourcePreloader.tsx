import { preload } from "react-dom";

type ImageResourcePreloaderProps = {
  limit?: number;
  sources: Array<string | null | undefined>;
};

export function ImageResourcePreloader({
  limit = 4,
  sources,
}: ImageResourcePreloaderProps) {
  const uniqueSources = new Set<string>();

  for (const source of sources) {
    const normalizedSource = source?.trim();

    if (!normalizedSource || uniqueSources.has(normalizedSource)) {
      continue;
    }

    uniqueSources.add(normalizedSource);
    preload(normalizedSource, {
      as: "image",
      fetchPriority: uniqueSources.size <= 2 ? "high" : "auto",
      referrerPolicy: "no-referrer",
    });

    if (uniqueSources.size >= limit) {
      break;
    }
  }

  return null;
}
