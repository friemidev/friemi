import { buildGeocodingQueries } from "@/lib/place-search";
import {
  isValidGeoCoordinates,
  parseCoordinate,
  type GeoCoordinates,
} from "@chill-club/scraper-core";

type NominatimPlace = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

const defaultAcceptLanguage = "fr,en;q=0.8";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchNominatim(
  query: string,
  acceptLanguage: string,
): Promise<GeoCoordinates | null> {
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("dedupe", "1");
  nominatimUrl.searchParams.set("accept-language", acceptLanguage);
  nominatimUrl.searchParams.set("limit", "1");
  nominatimUrl.searchParams.set("countrycodes", "fr");
  nominatimUrl.searchParams.set("q", query);

  const response = await fetch(nominatimUrl, {
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLanguage,
      "User-Agent": "NextFunClub/1.0 scraper-geocode",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as NominatimPlace[];

  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const latitude = parseCoordinate(payload[0].lat);
  const longitude = parseCoordinate(payload[0].lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  if (!isValidGeoCoordinates(latitude, longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export async function geocodeAddressFirstResult(options: {
  address: string;
  city?: string;
  acceptLanguage?: string;
}): Promise<GeoCoordinates | null> {
  const address = options.address.trim();
  const city = options.city?.trim() || "Paris";

  if (!address || address.length < 3) {
    return null;
  }

  const acceptLanguage = options.acceptLanguage ?? defaultAcceptLanguage;
  const queries = buildGeocodingQueries(address, city);

  for (const query of queries) {
    const coordinates = await searchNominatim(query, acceptLanguage);

    if (coordinates) {
      return coordinates;
    }
  }

  return null;
}

/** Nominatim usage policy: at most one request per second. */
export async function geocodeActivitiesMissingCoordinates<
  T extends {
    address: string;
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  },
>(activities: T[], options?: { acceptLanguage?: string }): Promise<T[]> {
  const enriched: T[] = [];

  for (const activity of activities) {
    if (
      isValidGeoCoordinates(
        activity.latitude ?? null,
        activity.longitude ?? null,
      )
    ) {
      enriched.push(activity);
      continue;
    }

    const coordinates = await geocodeAddressFirstResult({
      address: activity.address,
      city: activity.city,
      acceptLanguage: options?.acceptLanguage,
    });

    enriched.push(
      coordinates
        ? {
            ...activity,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }
        : activity,
    );

    await sleep(1_100);
  }

  return enriched;
}
