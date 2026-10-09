import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { ViewerBooking } from "@/features/merchants/residency/viewerQueries";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";
import type { BookingRecord } from "../types";
import { getBookingToday } from "../validation";
import {
  BookingHeader,
  BookingShell,
  formatBookingDate,
  primaryClass,
} from "./BookingPrimitives";
import { BookingList } from "./BookingList";

export function ViewerBookingsPage({
  locale,
  bookings,
  legacy = [],
}: {
  locale: string;
  bookings: BookingRecord[];
  legacy?: ViewerBooking[];
}) {
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile"
        locale={locale}
        title={copy.myBookings}
      />
      {bookings.length ? (
        <div className="pt-8">
          <BookingList
            bookings={bookings}
            locale={locale}
            today={getBookingToday()}
          />
        </div>
      ) : (
        <section className="py-16 text-center">
          <CalendarDays
            aria-hidden="true"
            className="mx-auto h-9 w-9 text-forest"
          />
          <h2 className="mt-5 text-xl font-bold">{copy.empty}</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink/70">
            {copy.emptyHint}
          </p>
          <Link
            className={`${primaryClass} mt-6`}
            href={withLocale(locale, "/lobby")}
          >
            {copy.browse}
          </Link>
        </section>
      )}
      {legacy.length ? (
        <section className="pt-8">
          <h2 className="text-base font-bold">{copy.legacy}</h2>
          <ol className="mt-3 divide-y divide-fog">
            {legacy.map((booking) => (
              <li key={booking.id}>
                <Link
                  className="flex min-h-20 items-center gap-3 rounded-lg py-3 focus-visible:outline-2 focus-visible:outline-forest"
                  href={withLocale(
                    locale,
                    `/merchants/${booking.merchant.id}/bookings/${booking.slotId}?from=profile-bookings`,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {booking.title}
                    </span>
                    <span className="mt-1 block text-xs text-ink/70">
                      {formatBookingDate(booking.date, locale)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-ink/50"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </BookingShell>
  );
}
