const parisTimeZone = "Europe/Paris";

const parisDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: parisTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: parisTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function getParisDateString(now = new Date()) {
  return parisDateFormatter.format(now);
}

export function formatResidencyDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseResidencyDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ||
    formatResidencyDate(date) !== value.trim()
    ? null
    : date;
}

export function isFutureResidencyDate(date: Date, now = new Date()) {
  return formatResidencyDate(date) > getParisDateString(now);
}

export function isCurrentOrFutureResidencyDate(date: Date, now = new Date()) {
  return formatResidencyDate(date) >= getParisDateString(now);
}

function formatParisDateTime(date: Date) {
  const parts = parisDateTimeFormatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Validates Paris wall time, then stores the LOCAL activity's floating UTC time. */
export function parseResidencyActivityTime(
  date: Date,
  time: string,
  now = new Date(),
) {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;

  const dateString = formatResidencyDate(date);
  const target = `${dateString}T${time.trim()}`;
  const localAsUtc = Date.parse(`${target}:00Z`);
  if (Number.isNaN(localAsUtc)) return null;

  // Paris is UTC+1 or UTC+2. Validating the round trip also rejects the
  // nonexistent hour at the spring daylight-saving transition.
  const candidates = [1, 2]
    .map((offsetHours) => new Date(localAsUtc - offsetHours * 60 * 60 * 1000))
    .filter((candidate) => formatParisDateTime(candidate) === target)
    .sort((a, b) => a.getTime() - b.getTime());
  const futureParisInstant = candidates.find((candidate) => candidate > now);
  return futureParisInstant ? new Date(localAsUtc) : null;
}
