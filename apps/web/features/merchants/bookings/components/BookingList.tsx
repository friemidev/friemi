"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";
import type { BookingRecord } from "../types";
import { BookingStatus, formatBookingDate } from "./BookingPrimitives";

export function BookingList({
  bookings,
  locale,
  today,
  owner = false,
}: {
  bookings: BookingRecord[];
  locale: string;
  today: string;
  owner?: boolean;
}) {
  const copy = getBookingCopy(locale);
  const [tab, setTab] = useState<"pending" | "upcoming" | "history">(() =>
    bookings.some((entry) => entry.status === "PENDING" && entry.date >= today)
      ? "pending"
      : bookings.some(
            (entry) => entry.status === "ACCEPTED" && entry.date >= today,
          )
        ? "upcoming"
        : bookings.length
          ? "history"
          : "pending",
  );
  const [date, setDate] = useState("");
  const groups = {
    pending: bookings.filter(
      (entry) => entry.status === "PENDING" && entry.date >= today,
    ),
    upcoming: bookings.filter(
      (entry) => entry.status === "ACCEPTED" && entry.date >= today,
    ),
    history: bookings.filter(
      (entry) =>
        entry.status === "CANCELLED" ||
        entry.status === "REJECTED" ||
        entry.date < today,
    ),
  };
  const visible = groups[tab]
    .filter((booking) => !date || booking.date === date)
    .sort((a, b) =>
      tab === "history"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date),
    );
  const dates = [...new Set(visible.map((booking) => booking.date))];
  return (
    <div>
      <div
        aria-label={copy.records}
        className="grid grid-cols-3 gap-1 rounded-xl bg-fog p-1"
        role="tablist"
      >
        {(["pending", "upcoming", "history"] as const).map((value) => (
          <button
            aria-controls={`booking-panel-${value}`}
            aria-selected={tab === value}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-lg px-2 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-forest ${value === tab ? "bg-white text-forest" : "text-ink/70"}`}
            id={`booking-tab-${value}`}
            key={value}
            onClick={() => {
              setTab(value);
              setDate("");
            }}
            onKeyDown={(event) => {
              const tabs = ["pending", "upcoming", "history"] as const;
              const index = tabs.indexOf(value);
              const next =
                event.key === "ArrowRight"
                  ? tabs[(index + 1) % 3]
                  : event.key === "ArrowLeft"
                    ? tabs[(index + 2) % 3]
                    : event.key === "Home"
                      ? tabs[0]
                      : event.key === "End"
                        ? tabs[2]
                        : null;
              if (!next) return;
              event.preventDefault();
              setTab(next);
              setDate("");
              document.getElementById(`booking-tab-${next}`)?.focus();
            }}
            role="tab"
            tabIndex={tab === value ? 0 : -1}
            type="button"
          >
            {!owner && value === "pending" ? copy.awaiting : copy[value]}
            {groups[value].length > 0 ? (
              <span className="text-xs tabular-nums">
                {groups[value].length}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {owner && groups[tab].length > 0 ? (
        <div className="mt-5 flex items-center justify-end gap-3">
          <label
            className="text-xs font-semibold text-ink/70"
            htmlFor="booking-date-filter"
          >
            {copy.selectedDate}
          </label>
          <input
            className="min-h-11 min-w-0 rounded-xl bg-fog px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-forest"
            id="booking-date-filter"
            lang={locale}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </div>
      ) : null}
      <section
        aria-labelledby={`booking-tab-${tab}`}
        className="pt-7"
        id={`booking-panel-${tab}`}
        role="tabpanel"
      >
        {visible.length ? (
          <div className="space-y-8">
            {dates.map((day) => (
              <div key={day}>
                <h2 className="text-sm font-bold text-forest">
                  {formatBookingDate(day, locale)}
                </h2>
                {owner ? (
                  <p className="mt-1 text-xs text-ink/70">
                    {copy.count(
                      visible.filter((booking) => booking.date === day).length,
                    )}{" "}
                    ·{" "}
                    {copy.people(
                      visible
                        .filter((booking) => booking.date === day)
                        .reduce(
                          (total, booking) => total + booking.partySize,
                          0,
                        ),
                    )}
                  </p>
                ) : null}
                <ol className="mt-2 divide-y divide-fog">
                  {visible
                    .filter((booking) => booking.date === day)
                    .map((booking) => (
                      <li key={booking.id}>
                        <Link
                          className="flex min-h-24 items-center gap-3 rounded-lg py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                          href={withLocale(
                            locale,
                            owner
                              ? `/profile/store/bookings/reservations/${booking.id}`
                              : `/profile/bookings/${booking.id}`,
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-semibold">
                              {owner
                                ? booking.contactName
                                : booking.merchant.name}
                            </span>
                            <span className="mt-1 block text-sm text-ink/70">
                              {copy.people(booking.partySize)}
                            </span>
                            {tab === "history" ? (
                              <span className="mt-2 block">
                                <BookingStatus
                                  locale={locale}
                                  status={booking.status}
                                />
                              </span>
                            ) : null}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="h-5 w-5 shrink-0 text-ink/50"
                          />
                        </Link>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-12 text-center text-sm text-ink/70">
            {tab === "pending"
              ? copy.noPending
              : tab === "upcoming"
                ? copy.noUpcoming
                : copy.noHistory}
          </p>
        )}
      </section>
    </div>
  );
}
