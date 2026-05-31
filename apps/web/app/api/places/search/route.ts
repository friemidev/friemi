import { NextResponse } from "next/server";
import { buildGeocodingQueries } from "@/lib/place-search";

export const revalidate = 86_400;

type NominatimPlace = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

type PlaceSearchResult = {
  label: string;
  latitude: number;
  longitude: number;
};

const acceptLanguages: Record<string, string> = {
  "zh-CN": "zh-CN,zh;q=0.9,en;q=0.7,fr;q=0.6",
  en: "en,fr;q=0.8",
  fr: "fr,en;q=0.8",
};

function normalizeLimit(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : 5;

  if (Number.isNaN(parsed)) {
    return 5;
  }

  return Math.min(Math.max(parsed, 1), 8);
}

function normalizeAcceptLanguage(value: string | null) {
  return acceptLanguages[value ?? ""] ?? acceptLanguages["zh-CN"];
}

function buildSearchQueries(query: string, city: string | undefined) {
  const normalizedCity = city?.trim() ?? "";

  return buildGeocodingQueries(query, normalizedCity);
}

async function searchNominatim(query: string, acceptLanguage: string, limit: number) {
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("dedupe", "1");
  nominatimUrl.searchParams.set("accept-language", acceptLanguage);
  nominatimUrl.searchParams.set("limit", String(limit));
  nominatimUrl.searchParams.set("countrycodes", "fr");
  nominatimUrl.searchParams.set("q", query);

  const response = await fetch(nominatimUrl, {
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLanguage,
      "User-Agent": "NextFunClub/1.0 location-search",
    },
    next: {
      revalidate: 86_400,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as NominatimPlace[];

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((place) => {
      const latitude = Number.parseFloat(place.lat ?? "");
      const longitude = Number.parseFloat(place.lon ?? "");

      if (!place.display_name || !isValidCoordinate(latitude, longitude)) {
        return null;
      }

      return {
        label: place.display_name,
        latitude,
        longitude,
      };
    })
    .filter((place): place is PlaceSearchResult => place !== null);
}

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const acceptLanguage = normalizeAcceptLanguage(searchParams.get("locale"));

  if (!query || query.length < 3) {
    return NextResponse.json({ places: [] });
  }

  const limit = normalizeLimit(searchParams.get("limit"));
  const queries = buildSearchQueries(query, city);

  try {
    const places: PlaceSearchResult[] = [];
    const seen = new Set<string>();

    for (const searchQuery of queries) {
      if (places.length >= limit) {
        break;
      }

      const batch = await searchNominatim(
        searchQuery,
        acceptLanguage,
        limit - places.length,
      );

      for (const place of batch) {
        const key = `${place.latitude.toFixed(5)}:${place.longitude.toFixed(5)}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        places.push(place);
      }
    }

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Failed to search places", error);

    return NextResponse.json(
      { places: [], error: "PLACE_SEARCH_FAILED" },
      { status: 502 },
    );
  }
}
