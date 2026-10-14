"use client";

import { useRouter } from "next/navigation";
import { Power, PowerOff } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { setBookingAcceptanceAction } from "../actions";
import { getBookingCopy } from "../copy";
import type { BookingActionState } from "../types";
import {
  dangerClass,
  dangerPrimaryClass,
  primaryClass,
  secondaryClass,
} from "./BookingPrimitives";

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
    <div className="mt-3">
      {confirming ? (
        <form action={action} className="rounded-xl bg-fog p-4">
          <input name="locale" type="hidden" value={locale} />
          <input name="enabled" type="hidden" value={String(!enabled)} />
          <p className="text-sm leading-6 text-ink/80">
            {enabled ? copy.closeBookingsConfirm : copy.reopenBookingsHint}
          </p>
          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <button
              className={enabled ? dangerPrimaryClass : primaryClass}
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
              className={`${secondaryClass} bg-white hover:bg-white/80`}
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
          className={`${enabled ? dangerClass : primaryClass} w-full sm:w-auto`}
          onClick={() => setConfirming(true)}
          type="button"
        >
          {enabled ? (
            <PowerOff aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Power aria-hidden="true" className="h-4 w-4" />
          )}
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
