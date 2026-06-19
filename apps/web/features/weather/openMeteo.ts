const forecastEndpoint = "https://api.open-meteo.com/v1/forecast";
const geocodingEndpoint = "https://geocoding-api.open-meteo.com/v1/search";
const requestTimeoutMs = 5000;
const weatherRevalidateSeconds = 30 * 60;

type OpenMeteoDailyForecast = {
  precipitation_probability_max?: Array<number | null>;
  precipitation_sum?: Array<number | null>;
  temperature_2m_max?: Array<number | null>;
  temperature_2m_min?: Array<number | null>;
  time?: string[];
  weather_code?: Array<number | null>;
  wind_speed_10m_max?: Array<number | null>;
};

type OpenMeteoForecastResponse = {
  daily?: OpenMeteoDailyForecast;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    country?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  }>;
};

export type WeatherForecast = {
  date: string;
  latitude: number;
  locationLabel: string | null;
  longitude: number;
  precipitationProbabilityMax: number | null;
  precipitationSum: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  windSpeedMax: number | null;
};

async function fetchJson<T>(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      next: {
        revalidate: weatherRevalidateSeconds,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Weather request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getGeocodingQueries(query: string) {
  const normalizedQuery = query.trim();
  const queries = [
    normalizedQuery,
    ...normalizedQuery
      .split(",")
      .map((part) => part.trim())
      .reverse(),
  ].filter(Boolean);

  return [...new Set(queries)];
}

async function geocodeSingleLocation(query: string, locale: string) {
  const url = new URL(geocodingEndpoint);
  url.searchParams.set("count", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("language", locale === "zh-CN" ? "zh" : locale);
  url.searchParams.set("name", query);

  const payload = await fetchJson<OpenMeteoGeocodingResponse>(url);
  const result = payload.results?.find(
    (item) =>
      typeof item.latitude === "number" && typeof item.longitude === "number",
  );

  if (!result || result.latitude === undefined || result.longitude === undefined) {
    return null;
  }

  return {
    latitude: result.latitude,
    locationLabel: [result.name, result.country].filter(Boolean).join(", "),
    longitude: result.longitude,
  };
}

async function geocodeLocation(query: string, locale: string) {
  for (const candidate of getGeocodingQueries(query)) {
    const location = await geocodeSingleLocation(candidate, locale);

    if (location) {
      return location;
    }
  }

  return null;
}

function getDailyValue<T>(
  values: T[] | undefined,
  index: number,
): T | null {
  return values?.[index] ?? null;
}

export async function getOpenMeteoForecast({
  date,
  latitude,
  locale,
  locationQuery,
  longitude,
}: {
  date: string;
  latitude?: number | null;
  locale: string;
  locationQuery?: string | null;
  longitude?: number | null;
}): Promise<WeatherForecast | null> {
  let forecastLatitude = latitude;
  let forecastLongitude = longitude;
  let locationLabel = locationQuery?.trim() || null;

  if (
    (typeof forecastLatitude !== "number" ||
      !Number.isFinite(forecastLatitude) ||
      typeof forecastLongitude !== "number" ||
      !Number.isFinite(forecastLongitude)) &&
    locationQuery
  ) {
    const geocodedLocation = await geocodeLocation(locationQuery, locale);

    if (!geocodedLocation) {
      return null;
    }

    forecastLatitude = geocodedLocation.latitude;
    forecastLongitude = geocodedLocation.longitude;
    locationLabel = geocodedLocation.locationLabel || locationLabel;
  }

  if (
    typeof forecastLatitude !== "number" ||
    !Number.isFinite(forecastLatitude) ||
    typeof forecastLongitude !== "number" ||
    !Number.isFinite(forecastLongitude)
  ) {
    return null;
  }

  const url = new URL(forecastEndpoint);
  url.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
    "precipitation_sum",
    "wind_speed_10m_max",
  ].join(","));
  url.searchParams.set("end_date", date);
  url.searchParams.set("latitude", String(forecastLatitude));
  url.searchParams.set("longitude", String(forecastLongitude));
  url.searchParams.set("start_date", date);
  url.searchParams.set("timezone", "auto");

  const payload = await fetchJson<OpenMeteoForecastResponse>(url);
  const daily = payload.daily;
  const index = daily?.time?.findIndex((value) => value === date) ?? -1;

  if (!daily || index < 0) {
    return null;
  }

  return {
    date,
    latitude: payload.latitude ?? forecastLatitude,
    locationLabel,
    longitude: payload.longitude ?? forecastLongitude,
    precipitationProbabilityMax: getDailyValue(
      daily.precipitation_probability_max,
      index,
    ),
    precipitationSum: getDailyValue(daily.precipitation_sum, index),
    temperatureMax: getDailyValue(daily.temperature_2m_max, index),
    temperatureMin: getDailyValue(daily.temperature_2m_min, index),
    weatherCode: getDailyValue(daily.weather_code, index),
    windSpeedMax: getDailyValue(daily.wind_speed_10m_max, index),
  };
}
