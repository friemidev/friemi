import type { Metadata } from "next";
import type { PriceType } from "@prisma/client";
import {
  formatActivityDate,
  formatActivityDateOnly,
  formatActivityTime,
  formatFloatingActivityDate,
  formatFloatingActivityDateOnly,
  formatFloatingActivityTime,
} from "@chill-club/shared";
import { getActivityCoverDisplayUrl } from "./activity-cover-display";
import { brand } from "./brand";
import { getPriceTypeLabel } from "./copy";
import { getCanonicalSiteUrl } from "./site-url";

const defaultSiteName = brand.name;
const defaultShareImagePath = brand.shareImagePath;
const defaultDescription = brand.description;
export const generalPageShareDescription =
  "搭子·活动·组局，找你所需，探你所想，生活与快乐就在下一站等你！";

export function getGeneralPageShareDescription(locale: string) {
  if (locale === "fr") {
    return "Découvrez des sorties, lancez un groupe et retrouvez des amis autour de vous.";
  }

  if (locale === "en") {
    return "Discover activities, start crews, and bring friends together nearby.";
  }

  return generalPageShareDescription;
}

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

type TeamShareMetadataInput = DetailShareMetadataInput & {
  capacity?: number | null;
  locale: string;
  participantCount: number;
  shareImageUrl?: string | null;
  wechatShareImageUrl?: string | null;
};

type TeamShareImageUrlInput = {
  accessToken?: string | null;
  activityId: string;
  baseUrl: string;
  locale: string;
  variant?: "default" | "wechat";
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

  return getCanonicalSiteUrl();
}

export function getCanonicalMetadataBaseUrl() {
  return getCanonicalSiteUrl();
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
  const ellipsis = "…";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= 0) {
    return "";
  }

  return `${normalized.slice(0, maxLength - ellipsis.length).trimEnd()}${ellipsis}`;
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

function getTeamParticipantShareLabel({
  capacity,
  locale,
  participantCount,
}: {
  capacity?: number | null;
  locale: string;
  participantCount: number;
}) {
  const normalizedCount = Math.max(0, participantCount);

  if (locale === "fr") {
    return capacity && capacity > 0
      ? `${normalizedCount}/${capacity} inscrits`
      : `${normalizedCount} inscrits`;
  }

  if (locale === "en") {
    return capacity && capacity > 0
      ? `${normalizedCount}/${capacity} joined`
      : `${normalizedCount} joined`;
  }

  return capacity && capacity > 0
    ? `${normalizedCount}/${capacity} 人已加入`
    : `${normalizedCount} 人已加入`;
}

export function getTeamShareDescription({
  capacity,
  dateLabel,
  locationLabel,
  locale,
  participantCount,
  priceLabel,
}: Pick<
  DetailShareMetadataInput,
  "dateLabel" | "locationLabel" | "priceLabel"
> & {
  capacity?: number | null;
  locale: string;
  participantCount: number;
}) {
  const pieces = [
    getTeamParticipantShareLabel({ capacity, locale, participantCount }),
    dateLabel ? truncateShareText(dateLabel, 48) : null,
    locationLabel ? truncateShareText(locationLabel, 52) : null,
    priceLabel ? truncateShareText(priceLabel, 24) : null,
  ].filter(Boolean);

  return truncateShareText(pieces.join(" · "), 150);
}

export function buildTeamShareImageUrl({
  accessToken,
  activityId,
  baseUrl,
  locale,
  variant = "default",
}: TeamShareImageUrlInput) {
  const url = new URL("/api/share/team-card", baseUrl);
  url.searchParams.set("activityId", activityId);
  url.searchParams.set("locale", locale);

  if (variant !== "default") {
    url.searchParams.set("variant", variant);
  }

  if (accessToken) {
    url.searchParams.set("access", accessToken);
  }

  return url.toString();
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
  floating = false,
  locale,
  startAt,
}: {
  endAt?: string | null;
  floating?: boolean;
  locale: string;
  startAt: string;
}) {
  const formatDate = floating ? formatFloatingActivityDate : formatActivityDate;
  const formatDateOnly = floating
    ? formatFloatingActivityDateOnly
    : formatActivityDateOnly;
  const formatTime = floating ? formatFloatingActivityTime : formatActivityTime;

  if (!endAt) {
    return formatDate(startAt, locale);
  }

  if (formatDateOnly(startAt, locale) === formatDateOnly(endAt, locale)) {
    return `${formatDate(startAt, locale)}-${formatTime(endAt, locale)}`;
  }

  return `${formatDate(startAt, locale)} - ${formatDate(endAt, locale)}`;
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

export function buildTeamShareMetadata({
  canonicalUrl,
  capacity,
  coverImageUrl,
  dateLabel,
  locale,
  locationLabel,
  participantCount,
  priceLabel,
  shareImageUrl,
  siteName = defaultSiteName,
  title,
  wechatShareImageUrl,
}: TeamShareMetadataInput): Metadata {
  const baseUrl = new URL(canonicalUrl).origin;
  const metadataTitle = truncateShareText(title, 72);
  const metadataDescription = getTeamShareDescription({
    capacity,
    dateLabel,
    locationLabel,
    locale,
    participantCount,
    priceLabel,
  });
  const imageUrl =
    resolveAbsoluteUrl(shareImageUrl, baseUrl) ??
    resolveShareImageUrl(coverImageUrl, baseUrl);
  const wechatImageUrl = resolveAbsoluteUrl(wechatShareImageUrl, baseUrl);
  const openGraphImages =
    wechatImageUrl && wechatImageUrl !== imageUrl
      ? [
          {
            alt: metadataTitle,
            height: 630,
            url: wechatImageUrl,
            width: 1200,
          },
          {
            alt: metadataTitle,
            height: 630,
            type: "image/png",
            url: imageUrl,
            width: 1200,
          },
        ]
      : [
          {
            alt: metadataTitle,
            height: 630,
            type: "image/png",
            url: imageUrl,
            width: 1200,
          },
        ];

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description: metadataDescription,
    openGraph: {
      description: metadataDescription,
      images: openGraphImages,
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
  _baseUrl: string,
  path: string,
): Metadata {
  const canonicalUrl = buildCanonicalUrl(getCanonicalMetadataBaseUrl(), path);

  return buildDetailShareMetadata({
    canonicalUrl,
    description: defaultDescription,
    title: defaultSiteName,
  });
}

export function buildPageShareMetadata({
  description,
  path,
  title,
}: PageShareMetadataInput): Metadata {
  return buildDetailShareMetadata({
    canonicalUrl: buildCanonicalUrl(getCanonicalMetadataBaseUrl(), path),
    description,
    title,
  });
}
