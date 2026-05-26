const fallbackLocale = "zh-CN";
const activityTimeZone = "Europe/Paris";

function normalizeLocale(locale: unknown) {
  if (typeof locale !== "string" || locale.trim().length === 0) {
    return fallbackLocale;
  }

  try {
    return Intl.getCanonicalLocales(locale)[0] ?? fallbackLocale;
  } catch {
    return fallbackLocale;
  }
}

export function formatActivityDate(value: string | Date, locale: unknown = fallbackLocale) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    timeZone: activityTimeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatActivityDateOnly(value: string | Date, locale: unknown = fallbackLocale) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    timeZone: activityTimeZone,
    month: "short",
    day: "numeric"
  }).format(date);
}

export function formatActivityTime(value: string | Date, locale: unknown = fallbackLocale) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    timeZone: activityTimeZone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
