const parisTimeZone = "Europe/Paris";
const otherCategoryPrefix = "其他主题：";

export type ActivityFormValues = {
  title: string;
  description: string;
  itinerary: string;
  coverImageUrl: string;
  type: string;
  category: string;
  visibility: string;
  otherCategoryText: string;
  city: string;
  destination: string;
  address: string;
  latitude: string;
  longitude: string;
  startAt: string;
  endAt: string;
  capacity: string;
  capacityLimitEnabled: boolean;
  minParticipants: string;
  requiresApproval: boolean;
  priceType: string;
  priceText: string;
  publicEventId?: string;
  importSourceUrl?: string;
};

export type ActivityFormState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: ActivityFormValues;
  version?: number;
};

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = offsetName?.match(
    /^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/,
  );

  if (!match?.groups?.sign) {
    return 0;
  }

  const sign = match.groups.sign === "+" ? 1 : -1;
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);

  return sign * (hours * 60 + minutes);
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function parseParisDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const utcGuess = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, parisTimeZone);
  const date = new Date(utcGuess.getTime() - offsetMinutes * 60_000);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatParisDateTimeInput(value: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: parisTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return `${getDatePart(parts, "year")}-${getDatePart(
    parts,
    "month",
  )}-${getDatePart(parts, "day")}T${getDatePart(parts, "hour")}:${getDatePart(
    parts,
    "minute",
  )}`;
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function getActivityFormValues(formData: FormData): ActivityFormValues {
  return {
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    itinerary: getString(formData, "itinerary"),
    coverImageUrl: getString(formData, "coverImageUrl"),
    type: getString(formData, "type"),
    category: getString(formData, "category"),
    visibility: getString(formData, "visibility") || "PUBLIC",
    otherCategoryText: getString(formData, "otherCategoryText"),
    city: getString(formData, "city"),
    destination: getString(formData, "destination"),
    address: getString(formData, "address"),
    latitude: getString(formData, "latitude"),
    longitude: getString(formData, "longitude"),
    startAt: getString(formData, "startAt"),
    endAt: getString(formData, "endAt"),
    capacity: getString(formData, "capacity"),
    capacityLimitEnabled: formData.get("capacityLimitEnabled") === "on",
    minParticipants: getString(formData, "minParticipants"),
    requiresApproval: formData.get("requiresApproval") === "on",
    priceType: getString(formData, "priceType"),
    priceText: getString(formData, "priceText"),
    publicEventId: getString(formData, "publicEventId"),
    importSourceUrl: getString(formData, "importSourceUrl"),
  };
}

export function buildActivityErrorState(
  previousState: ActivityFormState,
  values: ActivityFormValues,
  formError: string,
  fieldErrors?: Record<string, string[]>,
): ActivityFormState {
  return {
    formError,
    fieldErrors,
    values,
    version: (previousState.version ?? 0) + 1,
  };
}

export function formatStoredDescription(values: {
  category: string;
  description: string;
  otherCategoryText?: string | null;
}) {
  return values.category === "OTHER" && values.otherCategoryText
    ? `${otherCategoryPrefix}${values.otherCategoryText}\n\n${values.description}`
    : values.description;
}

export function splitStoredDescription(category: string, description: string) {
  if (category !== "OTHER" || !description.startsWith(otherCategoryPrefix)) {
    return {
      description,
      otherCategoryText: "",
    };
  }

  const [firstLine = "", ...rest] = description.split("\n");

  return {
    description: rest.join("\n").trimStart(),
    otherCategoryText: firstLine.replace(otherCategoryPrefix, "").trim(),
  };
}
