import type { BookingScheduleMode } from "./types";

const parisDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getBookingToday(now = new Date()) {
  return parisDateFormatter.format(now);
}

export function parseBookingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

export type BookingSchedule = {
  enabled: boolean;
  scheduleMode: BookingScheduleMode;
  startDate: string;
  endDate: string | null;
  weekdays: number[];
  specificDates: string[];
  closedDates: string[];
};

/** Paris calendar days only; no time slots or daylight-saving arithmetic. */
export function isBookingDateOpen(
  settings: BookingSchedule,
  date: string,
  today = getBookingToday(),
) {
  const parsed = parseBookingDate(date);
  if (
    !parsed ||
    !settings.enabled ||
    date < today ||
    date < settings.startDate ||
    (settings.endDate && date > settings.endDate) ||
    settings.closedDates.includes(date)
  ) {
    return false;
  }
  if (settings.scheduleMode === "DAILY") return true;
  if (settings.scheduleMode === "WEEKLY")
    return settings.weekdays.includes(parsed.getUTCDay());
  return settings.specificDates.includes(date);
}

export function normalizeBookingPhone(value: string) {
  const phone = value.trim();
  // Accept local and international numbers with familiar visual separators.
  if (!/^\+?[\d\s().-]+$/.test(phone)) return null;
  const normalized = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{6,15}$/.test(normalized) ? normalized : null;
}

export type BookingSettingsInput = BookingSchedule & {
  actorProfileId: string;
  title: string;
  description: string;
  coverImageUrl?: string | null;
};

export function validateBookingSettings(input: BookingSettingsInput) {
  const start = parseBookingDate(input.startDate);
  const end = input.endDate ? parseBookingDate(input.endDate) : null;
  if (
    !start ||
    (input.endDate && !end) ||
    (end && end < start) ||
    !["DAILY", "WEEKLY", "DATES"].includes(input.scheduleMode) ||
    input.title.trim().length < 2 ||
    input.title.trim().length > 120 ||
    input.description.trim().length > 2000 ||
    input.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    (input.scheduleMode === "WEEKLY" && !input.weekdays.length) ||
    (input.scheduleMode === "DATES" && !input.specificDates.length)
  )
    return false;

  for (const date of [...input.specificDates, ...input.closedDates]) {
    if (
      !parseBookingDate(date) ||
      date < input.startDate ||
      (input.endDate && date > input.endDate)
    )
      return false;
  }
  if (input.coverImageUrl) {
    try {
      const url = new URL(input.coverImageUrl);
      if (!["https:", "http:"].includes(url.protocol)) return false;
    } catch {
      return false;
    }
  }
  return true;
}
