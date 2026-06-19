const defaultWeatherTimeZone = "Europe/Paris";
const dayInMs = 24 * 60 * 60 * 1000;
const forecastWindowDays = 7;

export type WeatherWidgetSource = {
  address?: string | null;
  city?: string | null;
  endAt?: string | Date | null;
  latitude?: number | null;
  longitude?: number | null;
  startAt: string | Date;
};

export type ActivityWeatherWidgetInput = {
  date: string;
  latitude: number | null;
  locationQuery: string | null;
  longitude: number | null;
};

export function getWeatherDateKey(
  value: Date,
  timeZone = defaultWeatherTimeZone,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getLocationQuery(source: WeatherWidgetSource) {
  const parts = [source.address, source.city]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? [...new Set(parts)].join(", ") : null;
}

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getActivityWeatherWidgetInput(
  source: WeatherWidgetSource,
  now = new Date(),
): ActivityWeatherWidgetInput | null {
  const startAt = new Date(source.startAt);

  if (Number.isNaN(startAt.getTime())) {
    return null;
  }

  const endAt = source.endAt ? new Date(source.endAt) : null;

  if (endAt && Number.isNaN(endAt.getTime())) {
    return null;
  }

  if ((endAt ?? startAt) < now) {
    return null;
  }

  const startDateKey = getWeatherDateKey(startAt);
  const todayDateKey = getWeatherDateKey(now);
  const maxDateKey = getWeatherDateKey(
    new Date(now.getTime() + forecastWindowDays * dayInMs),
  );

  if (!startDateKey || !todayDateKey || !maxDateKey) {
    return null;
  }

  if (endAt && getWeatherDateKey(endAt) !== startDateKey) {
    return null;
  }

  if (startDateKey < todayDateKey || startDateKey > maxDateKey) {
    return null;
  }

  const latitude = isFiniteCoordinate(source.latitude) ? source.latitude : null;
  const longitude = isFiniteCoordinate(source.longitude) ? source.longitude : null;
  const locationQuery = getLocationQuery(source);

  if ((latitude === null || longitude === null) && !locationQuery) {
    return null;
  }

  return {
    date: startDateKey,
    latitude,
    locationQuery,
    longitude,
  };
}

export function isWeatherDateInForecastWindow(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const todayDateKey = getWeatherDateKey(now);
  const maxDateKey = getWeatherDateKey(
    new Date(now.getTime() + forecastWindowDays * dayInMs),
  );

  return Boolean(todayDateKey && maxDateKey && date >= todayDateKey && date <= maxDateKey);
}
