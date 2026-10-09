"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { getBookingCopy } from "../copy";
import type { BookingSettingsView } from "../types";
import { isBookingDateOpen } from "../validation";
import { formatBookingDate } from "./BookingPrimitives";

export function BookingCalendar({
  locale,
  settings,
  today,
  selected,
  onSelect,
  acceptedCounts,
}: {
  locale: string;
  settings: BookingSettingsView;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  acceptedCounts: Array<{ date: string; people: number }>;
}) {
  const copy = getBookingCopy(locale);
  const firstDate =
    settings.scheduleMode === "DATES"
      ? settings.specificDates
          .filter((date) => isBookingDateOpen(settings, date, today))
          .sort()[0]
      : settings.startDate > today
        ? settings.startDate
        : today;
  const [month, setMonth] = useState((firstDate ?? today).slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const offset =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const shift = (amount: number) =>
    setMonth(
      new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
        .toISOString()
        .slice(0, 7),
    );
  const available = Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  ).filter((date) => isBookingDateOpen(settings, date, today));
  return (
    <div aria-label={copy.calendar}>
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label={copy.previousMonth}
          className="grid h-11 w-11 place-items-center rounded-full text-forest hover:bg-fog disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-forest"
          disabled={month <= today.slice(0, 7)}
          onClick={() => shift(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <p aria-live="polite" className="text-base font-bold">
          {new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))}
        </p>
        <button
          aria-label={copy.nextMonth}
          className="grid h-11 w-11 place-items-center rounded-full text-forest hover:bg-fog disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-forest"
          disabled={Boolean(
            settings.endDate && month >= settings.endDate.slice(0, 7),
          )}
          onClick={() => shift(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <span className="py-2 text-xs font-semibold text-ink/70" key={day}>
            {copy.weekdays[day]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: offset }, (_, i) => (
          <span aria-hidden="true" key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const open = isBookingDateOpen(settings, date, today);
          const count =
            acceptedCounts.find((entry) => entry.date === date)?.people ?? 0;
          return (
            <button
              aria-label={`${formatBookingDate(date, locale)}${open ? ` · ${copy.publicCount(count)}` : ""}`}
              aria-pressed={date === selected}
              className={`mx-auto flex min-h-12 w-full max-w-14 flex-col items-center justify-center rounded-xl text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${date === selected ? "bg-forest font-bold text-white" : open ? "font-semibold text-forest hover:bg-fog" : "text-ink/35"}`}
              disabled={!open}
              key={date}
              onClick={() => onSelect(date)}
              type="button"
            >
              <span>{i + 1}</span>
              {count > 0 ? (
                <span
                  aria-hidden="true"
                  className={`mt-1 h-1 w-1 rounded-full ${date === selected ? "bg-white" : "bg-forest"}`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {!available.length ? (
        <p className="mt-4 text-center text-sm text-ink/70">
          {copy.noOpenDates}
        </p>
      ) : null}
    </div>
  );
}
