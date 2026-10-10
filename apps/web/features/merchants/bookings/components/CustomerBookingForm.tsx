"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { submitBookingAction } from "../actions";
import { getBookingCopy } from "../copy";
import { notifyBookingUpdated } from "../bookingUpdates";
import type { BookingActionState, PublicBookingSpace } from "../types";
import { BookingCalendar } from "./BookingCalendar";
import {
  BookingStatus,
  formatBookingDate,
  inputClass,
  primaryClass,
} from "./BookingPrimitives";

export function CustomerBookingForm({
  data,
  locale,
  isAuthenticated,
  signInHref,
  viewerName = "",
  embedded = false,
}: {
  data: PublicBookingSpace;
  locale: string;
  isAuthenticated: boolean;
  signInHref: string;
  viewerName?: string;
  embedded?: boolean;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const {
    unreadBookingCount,
    setUnreadBookingCount,
    refreshUnreadBookingCount,
  } = useNotificationBadge();
  const announcedBookingId = useRef<string | null>(null);
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [contactName, setContactName] = useState(viewerName);
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState(
    submitBookingAction,
    {} as BookingActionState,
  );
  const bookingRecordHref = state.bookingId
    ? withLocale(
        locale,
        `/profile/bookings/${state.bookingId}${embedded ? "?sheet=1" : ""}`,
      )
    : "";
  const existing = data.viewerBookings.find(
    (booking) =>
      booking.date === date &&
      (booking.status === "PENDING" || booking.status === "ACCEPTED"),
  );
  const people =
    data.acceptedCounts.find((entry) => entry.date === date)?.people ?? 0;
  useEffect(() => {
    if (state.alreadyBooked && state.bookingId)
      router.replace(
        withLocale(
          locale,
          `/profile/bookings/${state.bookingId}${embedded ? "?sheet=1" : ""}`,
        ),
      );
  }, [state, router, locale, embedded]);

  useEffect(() => {
    if (
      state.success &&
      state.bookingId &&
      !state.alreadyBooked &&
      announcedBookingId.current !== state.bookingId
    ) {
      announcedBookingId.current = state.bookingId;
      notifyBookingUpdated(data.settings.activityId);
      setUnreadBookingCount(unreadBookingCount + 1);
      void refreshUnreadBookingCount();
    }
  }, [
    state,
    unreadBookingCount,
    setUnreadBookingCount,
    refreshUnreadBookingCount,
    data.settings.activityId,
  ]);

  if (state.success && state.bookingId && !state.alreadyBooked)
    return (
      <section className="py-10 text-center" role="status">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-meadow/15 text-forest">
          <Check aria-hidden="true" className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-bold">{copy.submitted}</h2>
        <p className="mt-3 text-sm font-semibold text-forest">
          {copy.pendingCard(partySize)}
        </p>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          {copy.waitConfirmation}
        </p>
        <Link className={`${primaryClass} mt-6`} href={bookingRecordHref}>
          {copy.viewBooking}
        </Link>
      </section>
    );

  return (
    <form action={action} className="space-y-8">
      <input name="locale" type="hidden" value={locale} />
      <input name="activityId" type="hidden" value={data.settings.activityId} />
      <input name="date" type="hidden" value={date} />
      <input name="partySize" type="hidden" value={partySize} />
      <section aria-labelledby="booking-people-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold" id="booking-people-heading">
            {copy.choosePeople}
          </h2>
          <div className="flex items-center gap-4">
            <button
              aria-label={`${copy.choosePeople} −1`}
              className="grid h-11 w-11 place-items-center rounded-full bg-fog text-forest disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-forest"
              disabled={partySize <= 1}
              onClick={() => setPartySize(Math.max(1, partySize - 1))}
              type="button"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <input
              aria-label={copy.choosePeople}
              className="h-11 w-16 rounded-lg bg-white text-center text-lg font-bold tabular-nums focus-visible:outline-2 focus-visible:outline-forest"
              inputMode="numeric"
              max={999}
              min={1}
              onChange={(event) =>
                setPartySize(
                  Math.max(1, Math.min(999, Number(event.target.value) || 1)),
                )
              }
              type="number"
              value={partySize}
            />
            <button
              aria-label={`${copy.choosePeople} +1`}
              className="grid h-11 w-11 place-items-center rounded-full bg-fog text-forest disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-forest"
              disabled={partySize >= 999}
              onClick={() => setPartySize(Math.min(999, partySize + 1))}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      <section aria-labelledby="booking-date-heading">
        <h2 className="mb-4 text-base font-bold" id="booking-date-heading">
          {copy.chooseDate}
        </h2>
        <BookingCalendar
          acceptedCounts={data.acceptedCounts}
          locale={locale}
          onSelect={setDate}
          selected={date}
          settings={data.settings}
          today={data.today}
        />
        {date ? (
          <div
            aria-live="polite"
            className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-fog px-4 py-3"
          >
            <p className="text-sm font-semibold text-forest">
              {formatBookingDate(date, locale)}
            </p>
            <p className="text-xs text-ink/70">{copy.publicCount(people)}</p>
          </div>
        ) : null}
      </section>
      {existing ? (
        <section className="space-y-4">
          <BookingStatus locale={locale} status={existing.status} />
          <p className="text-sm text-ink/70">
            {copy.people(existing.partySize)} ·{" "}
            {formatBookingDate(existing.date, locale)}
          </p>
          <Link
            className={primaryClass}
            href={withLocale(
              locale,
              `/profile/bookings/${existing.id}${embedded ? "?sheet=1" : ""}`,
            )}
          >
            {copy.viewBooking}
          </Link>
        </section>
      ) : !isAuthenticated ? (
        <Link className={`${primaryClass} w-full`} href={signInHref}>
          {copy.signIn}
        </Link>
      ) : (
        <>
          <section className="space-y-5">
            <h2 className="text-base font-bold">{copy.contact}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <label
                  className="text-sm font-semibold"
                  htmlFor="booking-contact-name"
                >
                  {copy.contactName}{" "}
                  <span className="font-normal text-ink/65">
                    · {copy.optional}
                  </span>
                </label>
                <input
                  autoComplete="name"
                  className={inputClass}
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  id="booking-contact-name"
                  maxLength={80}
                  name="contactName"
                />
              </div>
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold"
                  htmlFor="booking-contact-phone"
                >
                  {copy.contactPhone}{" "}
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </label>
                <input
                  aria-describedby="booking-phone-hint"
                  autoComplete="tel"
                  className={inputClass}
                  id="booking-contact-phone"
                  maxLength={30}
                  name="contactPhone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  required
                  type="tel"
                />
                <p
                  className="text-xs leading-5 text-ink/70"
                  id="booking-phone-hint"
                >
                  {copy.phoneHint}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold" htmlFor="booking-note">
                {copy.note}{" "}
                <span className="font-normal text-ink/65">
                  · {copy.optional}
                </span>
              </label>
              <textarea
                className={`${inputClass} min-h-24 py-3`}
                id="booking-note"
                maxLength={1000}
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={copy.notePlaceholder}
              />
            </div>
          </section>
          <div className="space-y-3">
            {state.error ? (
              <p className="text-sm font-semibold text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
            <button
              className={`${primaryClass} w-full`}
              disabled={pending || !date}
              type="submit"
            >
              {pending ? copy.submitting : copy.submit}
            </button>
            {!date ? (
              <p className="text-center text-xs text-ink/70">
                {copy.dateRequired}
              </p>
            ) : null}
          </div>
        </>
      )}
    </form>
  );
}
