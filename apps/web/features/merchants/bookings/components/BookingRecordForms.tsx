"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, XCircle } from "lucide-react";
import { cancelBookingAction, reviewBookingAction } from "../actions";
import { getBookingCopy } from "../copy";
import { notifyBookingUpdated } from "../bookingUpdates";
import type { BookingActionState } from "../types";
import {
  dangerClass,
  dangerPrimaryClass,
  inputClass,
  primaryClass,
} from "./BookingPrimitives";

export function ReviewBookingForm({
  locale,
  bookingId,
}: {
  locale: string;
  bookingId: string;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const announcedResult = useRef<BookingActionState | null>(null);
  const [reason, setReason] = useState("");
  const [state, action, pending] = useActionState(
    reviewBookingAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success && announcedResult.current !== state) {
      announcedResult.current = state;
      if (state.activityId) notifyBookingUpdated(state.activityId);
      router.refresh();
    }
  }, [state, router]);
  return (
    <div className="mt-6 space-y-3">
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
          <Check aria-hidden="true" className="h-4 w-4" />
          {pending ? copy.processing : copy.accept}
        </button>
      </form>
      <details>
        <summary className={`${dangerClass} w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          <XCircle aria-hidden="true" className="h-4 w-4" />
          {copy.reject}
        </summary>
        <form action={action} className="space-y-3 pt-4">
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
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={copy.rejectHint}
            required
          />
          <button
            className={`${dangerPrimaryClass} w-full`}
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
  const announcedResult = useRef<BookingActionState | null>(null);
  const [state, action, pending] = useActionState(
    cancelBookingAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success && announcedResult.current !== state) {
      announcedResult.current = state;
      if (state.activityId) notifyBookingUpdated(state.activityId);
      router.refresh();
    }
  }, [state, router]);
  return (
    <details className="mt-4">
      <summary className={`${dangerClass} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}>
        <XCircle aria-hidden="true" className="h-4 w-4" />
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
          className={dangerPrimaryClass}
          disabled={pending || state.success}
          type="submit"
        >
          {pending ? copy.cancelling : copy.confirmCancel}
        </button>
      </form>
    </details>
  );
}
