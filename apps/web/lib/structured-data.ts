import type { ActivityStatus, PriceType, PublicEventStatus } from "@prisma/client";
import { brand } from "@/lib/brand";
import { resolveShareImageUrl, truncateShareText } from "@/lib/share-metadata";
import { buildCanonicalSiteUrl, getCanonicalSiteUrl } from "@/lib/site-url";

type EventStructuredDataInput = {
  address: string;
  city: string;
  coverImageUrl?: string | null;
  description?: string | null;
  endAt?: string | null;
  latitude?: number | null;
  locale: string;
  longitude?: number | null;
  name: string;
  organizerName?: string | null;
  priceType?: PriceType | null;
  sameAs?: string | null;
  startAt: string;
  status?: ActivityStatus | PublicEventStatus | string | null;
  url: string;
};

function getInLanguage(locale: string) {
  if (locale === "en" || locale === "fr" || locale === "zh-CN") {
    return locale;
  }

  return "zh-CN";
}

function stripUrls(value: string) {
  return value.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function getEventStatus(status?: string | null) {
  if (status === "CANCELLED") {
    return "https://schema.org/EventCancelled";
  }

  return "https://schema.org/EventScheduled";
}

function getGeo(latitude?: number | null, longitude?: number | null) {
  if (latitude === null || latitude === undefined) {
    return undefined;
  }

  if (longitude === null || longitude === undefined) {
    return undefined;
  }

  return {
    "@type": "GeoCoordinates",
    latitude,
    longitude,
  };
}

function getLocation({
  address,
  city,
  latitude,
  longitude,
}: Pick<
  EventStructuredDataInput,
  "address" | "city" | "latitude" | "longitude"
>) {
  const placeName = address && address !== city ? `${city} · ${address}` : city;

  return {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
      addressLocality: city,
      streetAddress: address,
    },
    ...(getGeo(latitude, longitude)
      ? { geo: getGeo(latitude, longitude) }
      : {}),
    name: placeName,
  };
}

export function createSiteStructuredData(locale: string) {
  const canonicalSiteUrl = getCanonicalSiteUrl();
  const logoUrl = buildCanonicalSiteUrl(brand.logoPath);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${canonicalSiteUrl}/#organization`,
        "@type": "Organization",
        description: brand.description,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        name: brand.name,
        url: canonicalSiteUrl,
      },
      {
        "@id": `${canonicalSiteUrl}/#website`,
        "@type": "WebSite",
        description: brand.description,
        inLanguage: getInLanguage(locale),
        name: brand.name,
        publisher: {
          "@id": `${canonicalSiteUrl}/#organization`,
        },
        url: canonicalSiteUrl,
      },
    ],
  };
}

export function createEventStructuredData(input: EventStructuredDataInput) {
  const baseUrl = getCanonicalSiteUrl();
  const description = truncateShareText(
    stripUrls(input.description || brand.description) || brand.description,
    500,
  );
  const imageUrl = resolveShareImageUrl(input.coverImageUrl, baseUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    description,
    endDate: input.endAt ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: getEventStatus(input.status),
    image: [imageUrl],
    inLanguage: getInLanguage(input.locale),
    isAccessibleForFree: input.priceType === "FREE",
    location: getLocation(input),
    name: truncateShareText(input.name, 110),
    organizer: input.organizerName
      ? {
          "@type": "Person",
          name: input.organizerName,
        }
      : undefined,
    sameAs: input.sameAs || undefined,
    startDate: input.startAt,
    url: input.url,
  };
}
