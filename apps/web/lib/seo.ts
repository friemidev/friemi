import type { Metadata } from "next";
import { buildCanonicalSiteUrl } from "./site-url";

type NoIndexMetadataOptions = {
  canonicalPath?: string;
  follow?: boolean;
};

export function buildNoIndexMetadata({
  canonicalPath,
  follow = false,
}: NoIndexMetadataOptions = {}): Metadata {
  return {
    ...(canonicalPath
      ? {
          alternates: {
            canonical: buildCanonicalSiteUrl(canonicalPath),
          },
        }
      : {}),
    robots: {
      follow,
      googleBot: {
        follow,
        index: false,
      },
      index: false,
    },
  };
}

export const noIndexMetadata = buildNoIndexMetadata();
