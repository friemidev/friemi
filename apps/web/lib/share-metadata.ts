import type { Metadata } from "next";
import type { PriceType } from "@prisma/client";
import {
  formatActivityDate,
  formatActivityDateOnly,
  formatActivityTime,
} from "@chill-club/shared";
import { getActivityCoverDisplayUrl } from "./activity-cover-display";
import { brand } from "./brand";
import { getPriceTypeLabel } from "./copy";

const defaultSiteName = brand.name;
const defaultShareImagePath = brand.shareImagePath;
const defaultDescription = brand.description;
export const generalPageShareDescription =
  "搭子·活动·组局，找你所需，探你所想，生活与快乐就在下一站等你！";

type HeaderGetter = {
  get(name: string): string | null;
};

type DetailShareMetadataInput = {
  canonicalUrl: string;
  coverImageUrl?: string | null;
  dateLabel?: string | null;
  description?: string | null;
  locationLabel?: string | null;
  priceLabel?: string | null;
  siteName?: string;
  title: string;
};

type PageShareMetadataInput = {
  baseUrl: string;
  description: string;
  path: string;
  title: string;
};

function getFirstHeaderValue(value: string | null | undefined) {
  return value?.split(",")[0]?.trim() || null;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getRequestBaseUrl(headersList?: HeaderGetter | null) {
  const host = getFirstHeaderValue(
    headersList?.get("x-forwarded-host") ?? headersList?.get("host"),
  );
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (host) {
    const forwardedProtocol = getFirstHeaderValue(
      headersList?.get("x-forwarded-proto"),
    );
    const protocol =
      forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  if (configuredAppUrl) {
    try {
      return stripTrailingSlash(new URL(configuredAppUrl).toString());
    } catch {
      // Fall through to the stable production fallback.
    }
  }

  return "https://friemi.vercel.app";
}

export function resolveAbsoluteUrl(
  value: string | null | undefined,
  baseUrl: string,
) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim(), baseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function canUseShareImageUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export function resolveShareImageUrl(
  coverImageUrl: string | null | undefined,
  baseUrl: string,
) {
  const originalCoverUrl = resolveAbsoluteUrl(coverImageUrl, baseUrl);

  if (!originalCoverUrl || !canUseShareImageUrl(originalCoverUrl)) {
    return new URL(defaultShareImagePath, baseUrl).toString();
  }

  const coverUrl = resolveAbsoluteUrl(
    getActivityCoverDisplayUrl(originalCoverUrl),
    baseUrl,
  );

  if (coverUrl && canUseShareImageUrl(coverUrl)) {
    return coverUrl;
  }

  return new URL(defaultShareImagePath, baseUrl).toString();
}

export function truncateShareText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getShareDescription({
  dateLabel,
  description,
  locationLabel,
  priceLabel,
}: Pick<
  DetailShareMetadataInput,
  "dateLabel" | "description" | "locationLabel" | "priceLabel"
>) {
  const summary =
    description
      ?.replace(/https?:\/\/\S+/g, "")
      .replace(/官方链接\s*[:：]?/gi, "")
      .replace(/official link\s*[:：]?/gi, "")
      .replace(/lien officiel\s*[:：]?/gi, "")
      .split(/\n|。|！|!|？|\?/)[0]
      ?.trim() ?? "";
  const pieces = [
    summary ? truncateShareText(summary, 72) : null,
    dateLabel ? truncateShareText(dateLabel, 48) : null,
    locationLabel ? truncateShareText(locationLabel, 52) : null,
    priceLabel ? truncateShareText(priceLabel, 24) : null,
  ].filter(Boolean);

  return truncateShareText(pieces.join(" · ") || defaultDescription, 160);
}

export function getSharePriceLabel(
  priceType: PriceType,
  priceText: string | null | undefined,
  locale: string,
) {
  const priceTypeLabel = getPriceTypeLabel(priceType, locale);
  const normalizedPriceText = priceText?.trim() ?? "";

  if (!normalizedPriceText || normalizedPriceText === "0") {
    return priceTypeLabel;
  }

  if (
    normalizedPriceText === priceTypeLabel ||
    normalizedPriceText.startsWith(`${priceTypeLabel} `)
  ) {
    return normalizedPriceText;
  }

  return `${priceTypeLabel} · ${normalizedPriceText}`;
}

export function getShareDateLabel({
  endAt,
  locale,
  startAt,
}: {
  endAt?: string | null;
  locale: string;
  startAt: string;
}) {
  if (!endAt) {
    return formatActivityDate(startAt, locale);
  }

  if (
    formatActivityDateOnly(startAt, locale) ===
    formatActivityDateOnly(endAt, locale)
  ) {
    return `${formatActivityDate(startAt, locale)}-${formatActivityTime(
      endAt,
      locale,
    )}`;
  }

  return `${formatActivityDate(startAt, locale)} - ${formatActivityDate(
    endAt,
    locale,
  )}`;
}

export function getShareLocationLabel({
  address,
  city,
}: {
  address?: string | null;
  city?: string | null;
}) {
  const normalizedAddress = address?.trim() ?? "";
  const normalizedCity = city?.trim() ?? "";

  if (!normalizedAddress) {
    return normalizedCity;
  }

  if (!normalizedCity || normalizedAddress.includes(normalizedCity)) {
    return normalizedAddress;
  }

  return `${normalizedCity} · ${normalizedAddress}`;
}

export function buildCanonicalUrl(
  baseUrl: string,
  path: string,
  searchParams?: Record<string, string | null | undefined>,
) {
  const url = new URL(path, baseUrl);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export function buildDetailShareMetadata({
  canonicalUrl,
  coverImageUrl,
  dateLabel,
  description,
  locationLabel,
  priceLabel,
  siteName = defaultSiteName,
  title,
}: DetailShareMetadataInput): Metadata {
  const baseUrl = new URL(canonicalUrl).origin;
  const metadataTitle = truncateShareText(title, 72);
  const metadataDescription = getShareDescription({
    dateLabel,
    description,
    locationLabel,
    priceLabel,
  });
  const imageUrl = resolveShareImageUrl(coverImageUrl, baseUrl);

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description: metadataDescription,
    openGraph: {
      description: metadataDescription,
      images: [
        {
          alt: metadataTitle,
          url: imageUrl,
        },
      ],
      siteName,
      title: metadataTitle,
      type: "website",
      url: canonicalUrl,
    },
    title: metadataTitle,
    twitter: {
      card: "summary_large_image",
      description: metadataDescription,
      images: [imageUrl],
      title: metadataTitle,
    },
  };
}

export function buildFallbackShareMetadata(
  baseUrl: string,
  path: string,
): Metadata {
  const canonicalUrl = buildCanonicalUrl(baseUrl, path);

  return buildDetailShareMetadata({
    canonicalUrl,
    description: defaultDescription,
    title: defaultSiteName,
  });
}

export function buildPageShareMetadata({
  baseUrl,
  description,
  path,
  title,
}: PageShareMetadataInput): Metadata {
  return buildDetailShareMetadata({
    canonicalUrl: buildCanonicalUrl(baseUrl, path),
    description,
    title,
  });
}
