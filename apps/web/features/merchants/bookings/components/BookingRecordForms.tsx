"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingAction, reviewBookingAction } from "../actions";
import { getBookingCopy } from "../copy";
import type { BookingActionState } from "../types";
import { inputClass, primaryClass, secondaryClass } from "./BookingPrimitives";

export function ReviewBookingForm({
  locale,
  bookingId,
}: {
  locale: string;
  bookingId: string;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState(
    reviewBookingAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  return (
    <div className="mt-8 space-y-4">
      {state.error ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm font-semibold text-forest" role="status">
          {copy.processed}
        </p>
      ) : null}
      <form action={action}>
        <input name="locale" type="hidden" value={locale} />
        <input name="bookingId" type="hidden" value={bookingId} />
        <input name="decision" type="hidden" value="accept" />
        <button
          className={`${primaryClass} w-full`}
          disabled={pending || state.success}
          type="submit"
        >
          {pending ? copy.processing : copy.accept}
        </button>
      </form>
      <details>
        <summary className="flex min-h-12 cursor-pointer items-center justify-center text-sm font-semibold text-ink/70 focus-visible:outline-2 focus-visible:outline-forest">
          {copy.reject}
        </summary>
        <form action={action} className="space-y-3 pt-3">
          <input name="locale" type="hidden" value={locale} />
          <input name="bookingId" type="hidden" value={bookingId} />
          <input name="decision" type="hidden" value="reject" />
          <label
            className="block text-sm font-semibold"
            htmlFor="booking-reject-reason"
          >
            {copy.rejecting}
          </label>
          <textarea
            className={`${inputClass} min-h-24 py-3`}
            id="booking-reject-reason"
            maxLength={500}
            name="reason"
            placeholder={copy.rejectHint}
            required
          />
          <button
            className={`${secondaryClass} w-full`}
            disabled={pending || state.success}
            type="submit"
          >
            {pending ? copy.processing : copy.confirmReject}
          </button>
        </form>
      </details>
    </div>
  );
}

export function CancelBookingForm({
  locale,
  bookingId,
}: {
  locale: string;
  bookingId: string;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState(
    cancelBookingAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  return (
    <details className="mt-9">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold text-ink/70 focus-visible:outline-2 focus-visible:outline-forest">
        {copy.cancel}
      </summary>
      <form action={action} className="space-y-4 py-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="bookingId" type="hidden" value={bookingId} />
        <p className="text-sm leading-6 text-ink/70">{copy.cancelConfirm}</p>
        {state.error ? (
          <p className="text-sm font-semibold text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm font-semibold text-forest" role="status">
            {copy.cancelled}
          </p>
        ) : null}
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          disabled={pending || state.success}
          type="submit"
        >
          {pending ? copy.cancelling : copy.confirmCancel}
        </button>
      </form>
    </details>
  );
}
