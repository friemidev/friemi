"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { setBookingAcceptanceAction } from "../actions";
import { getBookingCopy } from "../copy";
import type { BookingActionState } from "../types";

export function BookingAcceptanceControl({
  locale,
  enabled,
}: {
  locale: string;
  enabled: boolean;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    setBookingAcceptanceAction,
    {},
  );

  useEffect(() => {
    if (!state.success) return;
    setConfirming(false);
    router.refresh();
  }, [state, router]);

  return (
    <div className="mt-5">
      {confirming ? (
        <form action={action} className="rounded-xl bg-fog p-4">
          <input name="locale" type="hidden" value={locale} />
          <input name="enabled" type="hidden" value={String(!enabled)} />
          <p className="text-sm leading-6 text-ink/80">
            {enabled ? copy.closeBookingsConfirm : copy.reopenBookingsHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="min-h-11 rounded-full bg-forest px-5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending
                ? copy.saving
                : enabled
                  ? copy.confirmCloseBookings
                  : copy.confirmReopenBookings}
            </button>
            <button
              className="min-h-11 rounded-full px-4 text-sm font-semibold text-forest"
              disabled={pending}
              onClick={() => setConfirming(false)}
              type="button"
            >
              {copy.dismiss}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="min-h-11 text-sm font-semibold text-forest underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-forest"
          onClick={() => setConfirming(true)}
          type="button"
        >
          {enabled ? copy.closeBookings : copy.reopenBookings}
        </button>
      )}
      {state.error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
