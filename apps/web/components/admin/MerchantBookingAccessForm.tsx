"use client";

import { useActionState } from "react";
import { setBookingAccessAction } from "@/features/merchants/bookings/actions";
import type { BookingActionState } from "@/features/merchants/bookings/types";
import { getMerchantBookingAdminCopy } from "./merchantBookingCopy";

export function MerchantBookingAccessForm({
  locale,
  merchantId,
  granted,
  hasOwner,
}: {
  locale: string;
  merchantId: string;
  granted: boolean;
  hasOwner: boolean;
}) {
  const copy = getMerchantBookingAdminCopy(locale);
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    setBookingAccessAction,
    {},
  );
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="merchantId" value={merchantId} />
      <input type="hidden" name="enabled" value={granted ? "false" : "true"} />
      <p className="max-w-lg text-sm leading-6 text-ink/70">
        {granted ? copy.revokeHint : copy.description}
      </p>
      <button
        type="submit"
        disabled={pending || (!granted && !hasOwner)}
        className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50 ${granted ? "bg-fog text-ink" : "bg-forest text-white"}`}
      >
        {pending ? copy.saving : granted ? copy.revoke : copy.grant}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-forest">
          {copy.saved}
        </p>
      ) : null}
    </form>
  );
}
