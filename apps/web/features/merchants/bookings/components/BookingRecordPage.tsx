import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getBookingCopy } from "../copy";
import type { BookingRecord } from "../types";
import { getBookingToday } from "../validation";
import {
  BookingHeader,
  BookingShell,
  BookingStatus,
  formatBookingDate,
  secondaryClass,
} from "./BookingPrimitives";
import { CancelBookingForm, ReviewBookingForm } from "./BookingRecordForms";

export function BookingRecordPage({
  locale,
  booking,
  owner = false,
}: {
  locale: string;
  booking: BookingRecord;
  owner?: boolean;
}) {
  const copy = getBookingCopy(locale);
  const statusHint = {
    PENDING: copy.waitConfirmation,
    ACCEPTED: copy.acceptedNotice,
    REJECTED: copy.rejectedNotice,
    CANCELLED: copy.cancelledNotice,
  }[booking.status];
  const timestamp = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(value));
  const canCancel =
    !owner &&
    booking.date >= getBookingToday() &&
    (booking.status === "PENDING" || booking.status === "ACCEPTED");
  return (
    <BookingShell>
      <BookingHeader
        backHref={owner ? "/profile/store/bookings" : "/profile/bookings"}
        backLabel={copy.backBookings}
        locale={locale}
        title={copy.details}
      />
      <section className="pt-8">
        <BookingStatus locale={locale} status={booking.status} />
        <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-forest">
          {formatBookingDate(booking.date, locale)}
        </h2>
        <p className="mt-3 text-lg font-semibold">
          {copy.people(booking.partySize)}
        </p>
        <p className="mt-2 text-sm text-ink/70">{booking.merchant.name}</p>
        {!owner ? (
          <p className="mt-5 text-sm leading-6 text-ink/70">{statusHint}</p>
        ) : null}
      </section>
      <section className="pt-9">
        <h3 className="text-base font-bold">{copy.contact}</h3>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-sm">
          <dt className="text-ink/70">{copy.contactName}</dt>
          <dd className="min-w-0 break-words font-semibold">
            {booking.contactName}
          </dd>
          <dt className="text-ink/70">{copy.telephone}</dt>
          <dd className="min-w-0 break-all font-semibold tabular-nums">
            {booking.contactPhone}
          </dd>
          {booking.note ? (
            <>
              <dt className="text-ink/70">{copy.note}</dt>
              <dd className="whitespace-pre-wrap break-words leading-6">
                {booking.note}
              </dd>
            </>
          ) : null}
        </dl>
        {owner ? (
          <a
            className={`${secondaryClass} mt-5 w-full sm:w-auto`}
            href={`tel:${booking.contactPhone}`}
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            {copy.call}
          </a>
        ) : null}
      </section>
      {booking.rejectionReason ? (
        <section className="mt-8 rounded-xl bg-fog px-4 py-4">
          <h3 className="text-sm font-bold">{copy.rejectionReason}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">
            {booking.rejectionReason}
          </p>
        </section>
      ) : null}
      {owner &&
      booking.status === "PENDING" &&
      booking.date >= getBookingToday() ? (
        <ReviewBookingForm bookingId={booking.id} locale={locale} />
      ) : null}
      <dl className="mt-9 space-y-3 text-xs text-ink/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt>{copy.submittedAt}</dt>
          <dd>
            <time dateTime={booking.createdAt}>
              {timestamp(booking.createdAt)}
            </time>
          </dd>
        </div>
        {booking.reviewedAt ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt>{copy.reviewedAt}</dt>
            <dd>
              <time dateTime={booking.reviewedAt}>
                {timestamp(booking.reviewedAt)}
              </time>
            </dd>
          </div>
        ) : null}
        {booking.cancelledAt ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt>{copy.cancelledAt}</dt>
            <dd>
              <time dateTime={booking.cancelledAt}>
                {timestamp(booking.cancelledAt)}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
      <Link
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={getLocalizedActivityDetailPath(locale, booking.activityId)}
      >
        {copy.viewSpace}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </Link>
      {canCancel ? (
        <>
          <p className="mt-5 text-xs leading-5 text-ink/70">
            {copy.changeBooking}
          </p>
          <CancelBookingForm bookingId={booking.id} locale={locale} />
        </>
      ) : null}
    </BookingShell>
  );
}
