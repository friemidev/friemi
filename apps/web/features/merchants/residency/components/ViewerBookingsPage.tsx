import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { formatResidencyDate } from "./ResidencyCalendar";
import { getViewerBookingCopy } from "../viewerCopy";
import type { ViewerBooking } from "../viewerQueries";
import { getParisDateString } from "../validation";

function BookingRow({
  booking,
  locale,
}: {
  booking: ViewerBooking;
  locale: string;
}) {
  const copy = getViewerBookingCopy(locale);
  const status =
    booking.state === "CONFIRMED" && booking.date < getParisDateString()
      ? copy.datePassed
      : {
          CONFIRMED: copy.confirmed,
          PUBLISHED: copy.published,
          SIGNUP_CANCELLED: copy.signupCancelled,
          BOOKING_CANCELLED: copy.bookingCancelled,
        }[booking.state];
  const bookingHref = withLocale(
    locale,
    `/merchants/${booking.merchant.id}/bookings/${booking.slotId}?from=profile-bookings`,
  );
  const activityHref = booking.activityId
    ? getLocalizedActivityDetailPath(locale, booking.activityId)
    : null;

  return (
    <article className="rounded-2xl bg-fog/60 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-forest">
          <span className="text-xl font-bold leading-none tabular-nums">
            {booking.date.slice(8, 10)}
          </span>
          <span className="mt-1 text-[11px] font-semibold tabular-nums">
            {booking.date.slice(5, 7)} / {booking.date.slice(0, 4)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-forest">
            {booking.merchant.name}
          </p>
          <h3 className="mt-1 break-words text-base font-bold leading-snug text-ink">
            {booking.title}
          </h3>
          <p className="mt-1 text-xs text-ink/70">
            <time dateTime={booking.date}>
              {formatResidencyDate(booking.date, locale)}
            </time>
            <span className="px-1.5" aria-hidden="true">
              ·
            </span>
            {status}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 pl-[4.5rem] text-sm font-semibold text-forest">
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={bookingHref}
        >
          {copy.viewBooking}
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {activityHref &&
        (booking.state === "PUBLISHED" ||
          booking.state === "SIGNUP_CANCELLED") ? (
          <Link
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={activityHref}
          >
            {copy.viewActivity}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ViewerBookingsPage({
  locale,
  upcoming,
  history,
}: {
  locale: string;
  upcoming: ViewerBooking[];
  history: ViewerBooking[];
}) {
  const copy = getViewerBookingCopy(locale);
  const empty = upcoming.length === 0 && history.length === 0;

  return (
    <PageContainer
      mobileSafeTop
      mobileSafeBottom
      className="max-w-3xl pb-16 pt-4 text-ink sm:pt-8"
    >
      <header className="flex min-h-14 items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/profile")}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">{copy.title}</h1>
      </header>

      {empty ? (
        <section className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-fog text-forest">
            <CalendarDays aria-hidden="true" className="h-8 w-8" />
          </span>
          <p className="mt-5 text-sm font-semibold text-ink/70">{copy.empty}</p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 text-sm font-bold text-paper transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/activities")}
          >
            {copy.browse}
          </Link>
        </section>
      ) : (
        <div className="mt-7 space-y-10">
          {upcoming.length > 0 ? (
            <section aria-label={copy.upcoming}>
              <h2 className="mb-4 text-lg font-bold">
                {copy.upcoming}{" "}
                <span className="text-sm text-ink/55">{upcoming.length}</span>
              </h2>
              <div className="space-y-3">
                {upcoming.map((booking) => (
                  <BookingRow
                    booking={booking}
                    key={booking.id}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {history.length > 0 ? (
            <section aria-label={copy.history}>
              <h2 className="mb-4 text-lg font-bold">
                {copy.history}{" "}
                <span className="text-sm text-ink/55">{history.length}</span>
              </h2>
              <div className="space-y-3">
                {history.map((booking) => (
                  <BookingRow
                    booking={booking}
                    key={booking.id}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
