function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateTimeString(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseChineseDate(text: string, referenceYear = new Date().getFullYear()) {
  const normalized = text
    .replace(/\s+/g, "")
    .replace(/\uFF0F/g, "/")
    .replace(/\u2013|\u2014|\u2212/g, "-");

  const rangeMatch = normalized.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:至|到|-|与)(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日/);
  if (rangeMatch) {
    const [, yearA, monthA, dayA, yearB, monthB, dayB] = rangeMatch;
    const startYear = Number(yearA ?? yearB ?? referenceYear);
    const endYear = Number(yearB ?? yearA ?? startYear);
    const endMonth = Number(monthB ?? monthA) - 1;
    const start = new Date(Date.UTC(startYear, Number(monthA) - 1, Number(dayA), 9, 0, 0));
    const end = new Date(Date.UTC(endYear, endMonth, Number(dayB), 18, 0, 0));
    return { start, end };
  }

  const singleMatch = normalized.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (singleMatch) {
    const [, year, month, day] = singleMatch;
    const start = new Date(Date.UTC(Number(year ?? referenceYear), Number(month) - 1, Number(day), 9, 0, 0));
    return { start, end: null };
  }

  return null;
}

export function formatDateISO(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}